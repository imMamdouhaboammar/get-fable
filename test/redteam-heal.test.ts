import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { synthesizePatch, runHealing } from '../src/core/redteam/heal.js';
import type { RedTeamFinding } from '../src/core/redteam/types.js';

describe('Fable Security Healing & Fixing Engine', () => {
  test('synthesizePatch: sql-injection parameterization', () => {
    const code = "const result = await db.query(`SELECT * FROM users WHERE id = ${userId}`);";
    const res = synthesizePatch('sql-injection', code);
    expect(res).not.toBeNull();
    expect(res!.strategy).toBe('sql-parameterization');
    expect(res!.patched).toContain('queryParameterized($1, [userId])');
  });

  test('synthesizePatch: sql-injection string concat', () => {
    const code = 'const result = await db.query("SELECT * FROM users WHERE id = " + userId);';
    const res = synthesizePatch('sql-injection', code);
    expect(res).not.toBeNull();
    expect(res!.strategy).toBe('sql-parameterization');
    expect(res!.patched).toContain('queryParameterized($1, [userId])');
  });

  test('synthesizePatch: cors-misconfiguration wildcard replacement', () => {
    const code = "res.setHeader('Access-Control-Allow-Origin', '*');";
    const res = synthesizePatch('cors-misconfiguration', code);
    expect(res).not.toBeNull();
    expect(res!.strategy).toBe('strict-cors-whitelist');
    expect(res!.patched).toContain('ALLOWED_ORIGIN');
  });

  test('synthesizePatch: security-headers injection', () => {
    const code = "const app = express();\n\napp.listen(3000);";
    const res = synthesizePatch('security-headers', code);
    expect(res).not.toBeNull();
    expect(res!.strategy).toBe('security-headers-guard');
    expect(res!.patched).toContain('Content-Security-Policy');
    expect(res!.patched).toContain('X-Frame-Options');
  });

  test('synthesizePatch: sensitive-exposure deny-sensitive route guard', () => {
    const code = "const app = express();\n\napp.listen(3000);";
    const res = synthesizePatch('sensitive-exposure', code);
    expect(res).not.toBeNull();
    expect(res!.strategy).toBe('block-sensitive-routes');
    expect(res!.patched).toContain('.env');
  });

  test('synthesizePatch: ssrf outbound url validation', () => {
    const code = "const response = await fetch(targetUrl);";
    const res = synthesizePatch('ssrf', code);
    expect(res).not.toBeNull();
    expect(res!.strategy).toBe('ssrf-outbound-url-guard');
    expect(res!.patched).toContain('validateOutboundUrl(targetUrl)');
  });

  test('synthesizePatch: idor-bola tenant verification guard', () => {
    const code = "app.get('/api/documents/:id', async (req, res) => {\n  const doc = await getDoc(req.params.id);\n});";
    const res = synthesizePatch('idor-bola', code);
    expect(res).not.toBeNull();
    expect(res!.strategy).toBe('auth-tenant-guard');
    expect(res!.patched).toContain('if (!req.user || !req.user.id)');
  });

  test('runHealing: dry-run mode generates patches and attestation without modifying files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-heal-test-'));
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    const serverFile = path.join(srcDir, 'server.ts');
    const originalContent = "const app = express();\nres.setHeader('Access-Control-Allow-Origin', '*');\napp.listen(3000);";
    fs.writeFileSync(serverFile, originalContent, 'utf-8');

    const findings: RedTeamFinding[] = [
      {
        id: 'FIND-CORS-1',
        fingerprint: 'fp-cors-1',
        category: 'cors-misconfiguration',
        severity: 'high',
        title: 'CORS Wildcard with Credentials',
        description: 'Reflected arbitrary origin with credentials',
        target: 'http://localhost:3000/api',
        cwe: 'CWE-942',
        evidence: { reproCurl: 'curl http://localhost:3000/api' },
        remediation: 'Restrict origins to whitelist',
      }
    ];

    const findingsPath = path.join(tmpDir, 'findings.json');
    fs.writeFileSync(findingsPath, JSON.stringify(findings), 'utf-8');

    const report = await runHealing({
      findingsFile: findingsPath,
      dryRun: true,
      generateTests: true,
    }, tmpDir);

    expect(report.ok).toBe(true);
    expect(report.totalFindings).toBe(1);
    expect(report.patchesGenerated).toBe(1);
    expect(report.patchesApplied).toBe(0); // dry-run!
    expect(report.dryRun).toBe(true);
    expect(report.attestationSha256).toBeTruthy();

    // Verify original file was not mutated during dry run
    expect(fs.readFileSync(serverFile, 'utf-8')).toBe(originalContent);

    // Verify attestation was written
    const attestationPath = path.join(tmpDir, '.fable/heal-attestation.json');
    expect(fs.existsSync(attestationPath)).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('runHealing: autoApply mode modifies file and generates regression test suite', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-heal-apply-'));
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    const serverFile = path.join(srcDir, 'server.ts');
    const originalContent = "const app = express();\nres.setHeader('Access-Control-Allow-Origin', '*');\napp.listen(3000);";
    fs.writeFileSync(serverFile, originalContent, 'utf-8');

    const findings: RedTeamFinding[] = [
      {
        id: 'FIND-CORS-2',
        fingerprint: 'fp-cors-2',
        category: 'cors-misconfiguration',
        severity: 'high',
        title: 'CORS Wildcard',
        description: 'Wildcard origin',
        target: 'http://localhost:3000/api',
        cwe: 'CWE-942',
        evidence: {},
        remediation: 'Restrict origin',
      }
    ];

    const findingsPath = path.join(tmpDir, 'findings.json');
    fs.writeFileSync(findingsPath, JSON.stringify(findings), 'utf-8');

    const report = await runHealing({
      findingsFile: findingsPath,
      dryRun: false,
      generateTests: true,
    }, tmpDir);

    expect(report.ok).toBe(true);
    expect(report.patchesApplied).toBe(1);

    // Verify file was patched
    const patchedContent = fs.readFileSync(serverFile, 'utf-8');
    expect(patchedContent).not.toContain("'*'");
    expect(patchedContent).toContain('ALLOWED_ORIGIN');

    // Verify regression test suite was generated
    expect(report.testFilePath).toBeTruthy();
    expect(fs.existsSync(report.testFilePath!)).toBe(true);
    const testContent = fs.readFileSync(report.testFilePath!, 'utf-8');
    expect(testContent).toContain('CORS rejects unauthorized arbitrary origins');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
