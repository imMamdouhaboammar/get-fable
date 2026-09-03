import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apply, createFableApiHandler, type CordisContext } from '../src/dsh/index.js';
import {
  addEvidence,
  createInitialState,
  readFableState,
  recordMutation,
  statePath,
  workspaceIdForTarget,
  writeFableState,
} from '../src/core/state.js';

describe('DSH configured workspace ownership', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-dsh-workspace-'));
    expect(workspaceIdForTarget(projectRoot)).not.toBe(workspaceIdForTarget(process.cwd()));
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  for (const rootForm of ['absolute', 'relative'] as const) {
    const configuredRoot = () => rootForm === 'absolute'
      ? projectRoot
      : path.relative(process.cwd(), projectRoot);

    test(`${rootForm} root: dry-run owns the configured workspace without creating files`, () => {
      const result = createFableApiHandler(configuredRoot()).postRoute('Fix broken login bug');

      expect(result.applied).toBe(false);
      expect(result.state.workspaceId).toBe(workspaceIdForTarget(projectRoot));
      expect(result.state.lastDecision).toBeNull();
      expect(result.decision.selectedSkill).toBeDefined();
      expect(fs.readdirSync(projectRoot)).toEqual([]);
    });

    test(`${rootForm} root: first apply persists owned state and supports repeated apply and readback`, () => {
      const api = createFableApiHandler(configuredRoot());
      const first = api.postRouteAndApply('Fix broken login bug');

      expect(first.applied).toBe(true);
      expect(first.state.workspaceId).toBe(workspaceIdForTarget(projectRoot));
      expect(first.state.lastDecision).toEqual(first.decision);
      expect(readFableState(projectRoot)).toEqual(first.state);
      expect(api.getStatus().active).toBe(true);

      const second = api.postRouteAndApply('Fix broken login bug');
      expect(second.state.workspaceId).toBe(first.state.workspaceId);
      expect(readFableState(projectRoot)).toEqual(second.state);
      expect(api.postRoute('Fix broken login bug').state).toEqual(second.state);
    });

    test(`${rootForm} root: existing mutation and evidence fields survive dry-run and repeated apply`, () => {
      const verified = addEvidence(recordMutation(createInitialState(undefined, projectRoot)), {
        kind: 'test',
        source: 'workspace-regression',
        result: 'pass',
        detail: 'Existing evidence must survive routing',
      });
      const existing = { ...recordMutation(verified), activeCard: 'existing-card', stateRevision: 7 };
      writeFableState(projectRoot, existing);
      const before = fs.readFileSync(statePath(projectRoot), 'utf-8');
      const api = createFableApiHandler(configuredRoot());

      expect(api.postRoute('Fix broken login bug').state).toEqual(existing);
      expect(fs.readFileSync(statePath(projectRoot), 'utf-8')).toBe(before);

      for (let attempt = 0; attempt < 2; attempt++) {
        const result = api.postRouteAndApply('Fix broken login bug');
        expect(result.state.workspaceId).toBe(existing.workspaceId);
        expect(result.state.mutationGeneration).toBe(2);
        expect(result.state.verifiedGeneration).toBe(1);
        expect(result.state.activeCard).toBe('existing-card');
        expect(result.state.evidence).toEqual(existing.evidence);
        expect(readFableState(projectRoot)).toEqual(result.state);
      }
    });

    test(`${rootForm} root: registered route returns owned dry-run and successful apply responses`, async () => {
      type Handler = (req: any, res: any) => void | Promise<void>;
      const routes = new Map<string, Handler>();
      const ctx: CordisContext = {
        webServer: {
          get: (route, handler) => { routes.set(`GET ${route}`, handler); },
          post: (route, handler) => { routes.set(`POST ${route}`, handler); },
        },
      };
      apply(ctx, { projectRoot: configuredRoot() });
      const route = routes.get('POST /api/fable/route')!;
      expect(route).toBeDefined();

      for (const shouldApply of [false, true]) {
        let statusCode: number | undefined;
        let body: any;
        await route({ body: { task: 'Fix broken login bug', apply: shouldApply } }, {
          status: (code: number) => { statusCode = code; },
          json: (data: any) => { body = data; },
        });
        expect(statusCode).toBe(200);
        expect(body.applied).toBe(shouldApply);
        expect(body.state.workspaceId).toBe(workspaceIdForTarget(projectRoot));
        if (shouldApply) {
          expect(readFableState(projectRoot)).toEqual(body.state);
        } else {
          expect(fs.readdirSync(projectRoot)).toEqual([]);
        }
      }
    });
  }
});
