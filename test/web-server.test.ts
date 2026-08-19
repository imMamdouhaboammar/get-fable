import { describe, expect, test } from 'bun:test';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');

describe('static public web server', () => {
  test('serves the public site on loopback and fails closed for missing files', async () => {
    const port = 32000 + Math.floor(Math.random() * 10000);
    const proc = Bun.spawn(['bun', './bin/serve-web.js'], {
      cwd: root,
      env: { ...process.env, PORT: String(port) },
      stdout: 'ignore',
      stderr: 'ignore',
    });
    try {
      let response: Response | undefined;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        try { response = await fetch(`http://127.0.0.1:${port}/`); break; }
        catch { await Bun.sleep(50); }
      }
      expect(response?.status).toBe(200);
      expect(await response!.text()).toContain('get-fable');
      expect((await fetch(`http://127.0.0.1:${port}/docs.html`)).status).toBe(200);
      expect((await fetch(`http://127.0.0.1:${port}/llms.txt`)).status).toBe(200);
      expect((await fetch(`http://127.0.0.1:${port}/missing-file`)).status).toBe(404);
    } finally {
      proc.kill();
      await proc.exited;
    }
  });
});
