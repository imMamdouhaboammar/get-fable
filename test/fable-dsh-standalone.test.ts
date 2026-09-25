import { describe, it, expect, afterAll } from 'bun:test';
import { startFableDshServer } from '../src/dsh/standalone.js';

describe('fable-dsh standalone distribution server', () => {
  const testPort = 4455;
  const server = startFableDshServer({
    port: testPort,
    hostname: '127.0.0.1',
    projectRoot: process.cwd(),
  });

  afterAll(() => {
    server.stop(true);
  });

  it('serves the HTML dashboard shell at /', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Fable DSH Standalone');
    expect(html).toContain('Cordis Core Active');
    expect(html).toContain('dist/client.js');
  });

  it('serves the JSON status API at /api/status', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/status`);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data).toHaveProperty('phase');
    expect(data).toHaveProperty('failureStreak');
    expect(data).toHaveProperty('doctorHealthy');
    expect(data.doctorHealthy).toBe(true);
  });

  it('serves the skills catalog API at /api/skills', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/skills`);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(30);
  });

  it('serves the bundled client asset at /dist/client.js', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/dist/client.js`);
    expect(res.status).toBe(200);
    const js = await res.text();
    expect(js.length).toBeGreaterThan(1000);
  });

  it('serves the route API via POST at /api/route', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'tdd test-first behavior change' }),
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.decision).toBeDefined();
    expect(data.decision.selectedSkill).toBe('fable-tdd');
  });
});
