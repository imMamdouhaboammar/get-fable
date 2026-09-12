import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apply, createFableApiHandler, type CordisContext } from '../src/dsh/index.js';
import {
  createInitialState,
  readFableState,
  withFableStateTransaction,
  workspaceIdForTarget,
  writeFableState,
} from '../src/core/state.js';

function readDirSafe(dirPath: string): string[] {
  return fs.readdirSync(path.resolve(dirPath));
}

function existsSafe(base: string, ...parts: string[]): boolean {
  return fs.existsSync(path.resolve(base, ...parts));
}

describe('DSH mutation correctness (Issues #45, #54)', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-dsh-correctness-'));
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  describe('Issue #45: Doctor fix vs diagnostic mode', () => {
    test('postDoctor(false) and postDoctor() remain strictly diagnostic and non-mutating', () => {
      const api = createFableApiHandler(projectRoot);

      // Default (no argument)
      const reportDefault = api.postDoctor();
      expect(reportDefault).toBeDefined();
      expect(reportDefault.fixed).toBe(false);
      expect(reportDefault.repaired).toEqual([]);
      expect(reportDefault.repairErrors).toEqual([]);
      expect(readDirSafe(projectRoot)).toEqual([]);

      // Explicit false
      const reportFalse = api.postDoctor(false);
      expect(reportFalse).toBeDefined();
      expect(reportFalse.fixed).toBe(false);
      expect(reportFalse.repaired).toEqual([]);
      expect(reportFalse.repairErrors).toEqual([]);
      expect(readDirSafe(projectRoot)).toEqual([]);
    }, 60_000);

    test('postDoctor(true) performs canonical bounded repair and reports repaired items', () => {
      const api = createFableApiHandler(projectRoot);

      expect(existsSafe(projectRoot, '.fable')).toBe(false);

      const reportFix = api.postDoctor(true);
      expect(reportFix).toBeDefined();
      expect(reportFix.fixed).toBe(true);
      expect(reportFix.repaired.length).toBeGreaterThanOrEqual(3);
      expect(reportFix.repairErrors).toEqual([]);

      // Verifies canonical repairs in projectRoot
      expect(existsSafe(projectRoot, '.fable', 'state.json')).toBe(true);
      expect(existsSafe(projectRoot, '.fable', 'LEDGER.md')).toBe(true);
      expect(existsSafe(projectRoot, '.fable', 'PROGRESS.md')).toBe(true);

      // Verifies state was bound to configured projectRoot
      const state = readFableState(projectRoot);
      expect(state?.workspaceId).toBe(workspaceIdForTarget(projectRoot));
    }, 60_000);

    test('HTTP route POST /api/fable/doctor distinguishes fix mode from diagnostic mode', async () => {
      type Handler = (req: any, res: any) => void | Promise<void>;
      const routes = new Map<string, Handler>();
      const ctx: CordisContext = {
        webServer: {
          get: (route, handler) => { routes.set(`GET ${route}`, handler); },
          post: (route, handler) => { routes.set(`POST ${route}`, handler); },
        },
      };
      apply(ctx, { projectRoot });
      const doctorRoute = routes.get('POST /api/fable/doctor')!;
      expect(doctorRoute).toBeDefined();

      // Diagnostic via HTTP (fix: false)
      let diagStatus: number | undefined;
      let diagBody: any;
      await doctorRoute({ body: { fix: false } }, {
        status: (code: number) => { diagStatus = code; },
        json: (data: any) => { diagBody = data; },
      });
      expect(diagStatus).toBe(200);
      expect(diagBody.fixed).toBe(false);
      expect(diagBody.repaired).toEqual([]);
      expect(readDirSafe(projectRoot)).toEqual([]);

      // Repair via HTTP (fix: true)
      let fixStatus: number | undefined;
      let fixBody: any;
      await doctorRoute({ body: { fix: true } }, {
        status: (code: number) => { fixStatus = code; },
        json: (data: any) => { fixBody = data; },
      });
      expect(fixStatus).toBe(200);
      expect(fixBody.fixed).toBe(true);
      expect(fixBody.repaired.length).toBeGreaterThanOrEqual(3);
      expect(existsSafe(projectRoot, '.fable', 'state.json')).toBe(true);
    }, 60_000);
  });

  describe('Issue #54: Transactional route/apply and concurrency', () => {
    test('postRoute preview remains non-mutating and does not acquire state lock', () => {
      const api = createFableApiHandler(projectRoot);
      const preview = api.postRoute('Investigate memory leak in parser');

      expect(preview.applied).toBe(false);
      expect(preview.decision.selectedSkill).toBeDefined();
      expect(readDirSafe(projectRoot)).toEqual([]);
    });

    test('postRouteAndApply increments stateRevision monotonically within transaction', () => {
      const api = createFableApiHandler(projectRoot);

      const first = api.postRouteAndApply('Plan auth redesign');
      expect(first.applied).toBe(true);
      expect(first.state.stateRevision).toBe(1);
      expect(readFableState(projectRoot)?.stateRevision).toBe(1);

      const second = api.postRouteAndApply('Plan database migration');
      expect(second.applied).toBe(true);
      expect(second.state.stateRevision).toBe(2);
      expect(readFableState(projectRoot)?.stateRevision).toBe(2);
    });

    test('concurrent DSH route/apply mutations serialize without lost updates', async () => {
      const api = createFableApiHandler(projectRoot);

      // Initialize workspace with base state
      const initial = createInitialState(undefined, projectRoot);
      writeFableState(projectRoot, initial);

      const tasks = [
        'Plan auth redesign',
        'Plan database migration',
        'Plan recovery playbook',
        'Plan microservice decoupling',
      ];

      // Run multiple concurrent mutations
      const results = await Promise.all(
        tasks.map((task) => Promise.resolve().then(() => api.postRouteAndApply(task)))
      );

      expect(results.length).toBe(tasks.length);
      for (const res of results) {
        expect(res.applied).toBe(true);
        expect(res.state.stateRevision).toBeGreaterThanOrEqual(1);
      }

      // Check final state in state.json
      const finalState = readFableState(projectRoot)!;
      expect(finalState).toBeDefined();
      expect(finalState.stateRevision).toBe(tasks.length);
    });

    test('concurrent DSH route/apply and core withFableStateTransaction interleave safely', async () => {
      const api = createFableApiHandler(projectRoot);
      const initial = createInitialState(undefined, projectRoot);
      writeFableState(projectRoot, initial);

      const operations = [
        () => Promise.resolve().then(() => api.postRouteAndApply('Plan payment gateway integration')),
        () => Promise.resolve().then(() => withFableStateTransaction(projectRoot, (s) => ({ ...s, activeCard: 'core-card-1' }))),
        () => Promise.resolve().then(() => api.postRouteAndApply('Plan crypto module hardening')),
        () => Promise.resolve().then(() => withFableStateTransaction(projectRoot, (s) => ({ ...s, activeCard: 'core-card-2' }))),
      ];

      const results = await Promise.all(operations.map((op) => op()));
      expect(results.length).toBe(4);

      const finalState = readFableState(projectRoot)!;
      expect(finalState.stateRevision).toBe(4);
    });

    test('concurrent initialization via postDoctor(fix: true) and postRouteAndApply serializes safely without lost updates', async () => {
      const api = createFableApiHandler(projectRoot);
      expect(existsSafe(projectRoot, '.fable')).toBe(false);

      const [doctorRes, routeRes] = await Promise.all([
        Promise.resolve().then(() => api.postDoctor(true)),
        Promise.resolve().then(() => api.postRouteAndApply('Plan auth redesign')),
      ]);

      expect(doctorRes.fixed).toBe(true);
      expect(routeRes.applied).toBe(true);

      const finalState = readFableState(projectRoot)!;
      expect(finalState).toBeDefined();
      expect(finalState.lastDecision).toBeDefined();
      expect(finalState.currentSkill).toBe(routeRes.decision.selectedSkill);
      expect(finalState.stateRevision).toBeGreaterThanOrEqual(1);
    }, 60_000);
  });
});
