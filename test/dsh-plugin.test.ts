import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { apply, createFableApiHandler, readPlanStatus, getAllSkills } from '../src/dsh/index.js';

describe('DeepSeek Harness (DSH) Plugin Integration', () => {
  const repoRoot = path.resolve(import.meta.dir, '..');

  test('declares a valid cordis.patch.yml manifest', () => {
    const patchPath = path.join(repoRoot, 'cordis.patch.yml');
    expect(fs.existsSync(patchPath)).toBe(true);

    const content = fs.readFileSync(patchPath, 'utf-8');
    expect(content).toContain('insert:');
    expect(content).toContain('id: get-fable');
    expect(content).toContain('name: get-fable');
  });

  test('package.json declares dsh.bundle, dsh.client, and web client export', () => {
    const pkgPath = path.join(repoRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    expect(pkg.dsh).toBeDefined();
    expect(pkg.dsh.bundle).toBeDefined();
    expect(pkg.dsh.bundle.patch).toBe('./cordis.patch.yml');
    expect(pkg.dsh.client).toBeDefined();
    expect(pkg.dsh.client.platform).toBe('web');

    expect(pkg.exports['.']).toBeDefined();
    expect(pkg.exports['./client']).toBe('./dist/client.js');
  });

  test('getAllSkills returns all registered Fable skills with valid metadata', () => {
    const skills = getAllSkills(repoRoot);
    expect(skills.length).toBeGreaterThanOrEqual(6);

    const canonicalIds = ['get-fable', 'fable-discover', 'fable-plan', 'fable-execute', 'fable-verify', 'fable-recover'];
    for (const id of canonicalIds) {
      const found = skills.find((s) => s.id === id);
      expect(found).toBeDefined();
      expect(found?.name).toBeDefined();
    }
  });

  test('readPlanStatus parses task_plan.md phases and attestation', () => {
    const plan = readPlanStatus(repoRoot);
    expect(plan.hasPlan).toBe(true);
    expect(plan.phases.length).toBeGreaterThan(0);
    expect(plan.phases.some((p) => p.name.includes('Phase 1'))).toBe(true);
  });

  test('createFableApiHandler provides status, routing, and doctor capabilities', () => {
    const api = createFableApiHandler(repoRoot);

    const status = api.getStatus();
    expect(status.version).toBe('1.5.1');
    expect(typeof status.failureStreak).toBe('number');
    expect(status.planning.hasPlan).toBe(true);

    const routeRes = api.postRoute('Fix broken authentication bug and verify tokens');
    expect(routeRes.decision).toBeDefined();
    expect(routeRes.decision.selectedSkill).toBeDefined();

    const doctorReport = api.postDoctor(false);
    expect(doctorReport).toBeDefined();
    expect(typeof doctorReport.ok).toBe('boolean');
  }, 30000);

  test('apply mounts routes on mock Cordis webServer', async () => {
    const routes: Record<string, Function> = {};
    const mockWebServer = {
      get: (p: string, h: Function) => {
        routes[`GET ${p}`] = h;
      },
      post: (p: string, h: Function) => {
        routes[`POST ${p}`] = h;
      },
    };

    let projectionRegistered = false;
    const mockSessionProjections = {
      register: (name: string, def: any) => {
        if (name === 'fableDiscipline') projectionRegistered = true;
      },
    };

    const mockCtx = {
      webServer: mockWebServer,
      sessionProjections: mockSessionProjections,
    };

    apply(mockCtx, { projectRoot: repoRoot });

    expect(routes['GET /api/fable/status']).toBeDefined();
    expect(routes['GET /api/fable/plan']).toBeDefined();
    expect(routes['GET /api/fable/skills']).toBeDefined();
    expect(routes['POST /api/fable/route']).toBeDefined();
    expect(routes['POST /api/fable/doctor']).toBeDefined();
    expect(projectionRegistered).toBe(true);

    // Test GET /api/fable/status route response
    let jsonResult: any = null;
    const mockRes = {
      json: (data: any) => {
        jsonResult = data;
      },
    };
    await routes['GET /api/fable/status']({}, mockRes);
    expect(jsonResult).toBeDefined();
    expect(jsonResult.version).toBe('1.5.1');
    expect(jsonResult.planning.hasPlan).toBe(true);
  });
});
