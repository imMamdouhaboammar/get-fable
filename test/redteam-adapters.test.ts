import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AktoAdapter,
  CyberStrikeAdapter,
  HexStrikeAdapter,
  NativeProbeAdapter,
  getAdapterStatusMatrix,
  getAllAdapters,
} from '../src/core/redteam/adapters/index.ts';
import type { RedTeamFinding } from '../src/core/redteam/types.ts';

describe('Modular RedTeam Tool Adapters', () => {
  test('getAllAdapters returns all integrated adapters', () => {
    const adapters = getAllAdapters();
    const ids = adapters.map((a) => a.id);

    expect(ids).toContain('native');
    expect(ids).toContain('hexstrike');
    expect(ids).toContain('akto');
    expect(ids).toContain('cyberstrike');
    expect(ids).toContain('pentagi');
    expect(ids).toContain('pentestagent');
  });

  test('getAdapterStatusMatrix returns status for all adapters', async () => {
    const matrix = await getAdapterStatusMatrix();
    expect(matrix.length).toBe(6);

    const nativeStatus = matrix.find((s) => s.id === 'native');
    expect(nativeStatus?.available).toBe(true);
    expect(nativeStatus?.runtime).toBe('ready');
  });

  test('NativeProbeAdapter is always available and implements BaseToolAdapter', async () => {
    const native = new NativeProbeAdapter();
    expect(await native.isAvailable()).toBe(true);
    expect(native.id).toBe('native');
  });

  test('HexStrikeAdapter parses tool results into normalized findings', () => {
    const hexstrike = new HexStrikeAdapter();
    const toolResults = [
      {
        tool: 'nuclei',
        target: 'http://localhost:3000/api/graphql',
        vulnerability: 'GraphQL Introspection Enabled',
        severity: 'medium' as const,
        details: 'Schema query returned full AST schema',
        curlCommand: 'curl -i -s -X POST "http://localhost:3000/api/graphql" -d "{\\"query\\":\\"{__schema{types{name}}}\\"}"',
        cwe: 'CWE-200',
      },
      {
        tool: 'ffuf',
        target: 'http://localhost:3000/.env',
        vulnerability: 'Sensitive Environment Configuration Exposed',
        severity: 'critical' as const,
        details: 'HTTP 200 returned containing DB credentials',
        cwe: 'CWE-538',
      },
    ];

    const findings = hexstrike.parseToolOutput(toolResults);
    expect(findings.length).toBe(2);

    expect(findings[0].category).toBe('security-headers');
    expect(findings[0].severity).toBe('medium');
    expect(findings[0].sourceTool).toBe('hexstrike');
    expect(findings[0].evidence.reproCurl).toContain('graphql');

    expect(findings[1].category).toBe('sensitive-exposure');
    expect(findings[1].severity).toBe('critical');
    expect(findings[1].sourceTool).toBe('hexstrike');
  });

  test('AktoAdapter parses OpenAPI specifications and identifies business logic flaws', async () => {
    const akto = new AktoAdapter();
    const sampleSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/api/users/{userId}': {
          get: {
            summary: 'Get user profile',
            parameters: [{ name: 'userId', in: 'path', required: true }],
            security: [{ bearerAuth: [] }],
          },
        },
        '/api/transfer': {
          post: {
            summary: 'Transfer funds',
            parameters: [],
            // Intentionally missing security field
          },
        },
      },
    });

    const endpoints = akto.parseOpenApiEndpoints(sampleSpec);
    expect(endpoints.length).toBe(2);
    expect(endpoints[0].hasAuth).toBe(true);
    expect(endpoints[0].parameters).toContain('userId');
    expect(endpoints[1].hasAuth).toBe(false);

    // Test live file discovery in temporary workspace
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-akto-test-'));
    try {
      fs.writeFileSync(path.join(tmpDir, 'openapi.json'), sampleSpec, 'utf-8');

      const isAvailable = await akto.isAvailable({
        target: 'http://localhost:3000',
        profile: 'api-logic',
        scopeConfig: { allowedHosts: ['localhost'] },
        safeMode: true,
        cwd: tmpDir,
      });
      expect(isAvailable).toBe(true);

      const findings = await akto.run({
        target: 'http://localhost:3000',
        profile: 'api-logic',
        scopeConfig: { allowedHosts: ['localhost'] },
        safeMode: true,
        cwd: tmpDir,
      });

      expect(findings.length).toBe(2);
      expect(findings.some((f) => f.category === 'idor-bola' && f.evidenceLevel === 'hypothetical')).toBe(true);
      expect(findings.some((f) => f.category === 'auth-bypass' && f.evidenceLevel === 'inferred')).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('CyberStrikeAdapter formulates multi-stage kill chains from findings', () => {
    const cyberstrike = new CyberStrikeAdapter();
    const findings: RedTeamFinding[] = [
      {
        id: 'f-1',
        title: 'Sensitive Exposure',
        category: 'sensitive-exposure',
        severity: 'critical',
        description: 'Exposed credentials',
        target: 'http://localhost:3000/.env',
        evidence: { reproCurl: 'curl http://localhost:3000/.env' },
        remediation: 'Remove .env',
      },
      {
        id: 'f-2',
        title: 'Auth Bypass',
        category: 'auth-bypass',
        severity: 'high',
        description: 'Missing auth on admin endpoint',
        target: 'http://localhost:3000/api/admin',
        evidence: {},
        remediation: 'Require JWT',
      },
      {
        id: 'f-3',
        title: 'IDOR in tenant profile',
        category: 'idor-bola',
        severity: 'high',
        description: 'BOLA flaw',
        target: 'http://localhost:3000/api/users/99',
        evidence: {},
        remediation: 'Check tenant',
      },
    ];

    const graph = cyberstrike.buildAttackGraph('http://localhost:3000', findings);
    expect(graph.nodes.length).toBeGreaterThan(2);
    expect(graph.edges.length).toBeGreaterThan(1);
    expect(graph.attackPaths.length).toBeGreaterThan(0);

    // Verify chained path (auth bypass -> IDOR tenant compromise)
    const complexChain = graph.attackPaths.find((p) => p.path.length >= 3);
    expect(complexChain).toBeDefined();
    expect(complexChain?.riskScore).toBeGreaterThanOrEqual(9.0);
    expect(complexChain?.evidenceLevel).toBeDefined();
    expect(complexChain?.confidence).toBeGreaterThan(0);
  });
});
