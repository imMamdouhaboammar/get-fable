import { describe, expect, test } from 'bun:test';
import {
  encodeToon,
  decodeToon,
  validateToon,
  compareTokens,
  compactFableStateToon,
  extractToonFences,
  encodeDelegationContract,
  decodeDelegationContract,
  encodeReturnPacket,
  decodeReturnPacket,
  type ToonDelegationContract,
  type ToonReturnPacket,
} from '../src/core/toon.js';
import type { FableState } from '../src/core/types.js';

describe('TOON Core Engine', () => {
  test('lossless roundtrip of primitive and structured objects', () => {
    const original = {
      project: 'get-fable',
      version: '1.6.1',
      active: true,
      count: 42,
      tags: ['ai', 'agent', 'lifecycle'],
      nested: {
        engine: 'bun',
        speed: 100,
      },
    };

    const encoded = encodeToon(original);
    expect(encoded).toContain('project: get-fable');
    expect(encoded).toContain('tags[3]: ai,agent,lifecycle');

    const decoded = decodeToon<typeof original>(encoded);
    expect(decoded).toEqual(original);
  });

  test('lossless roundtrip of uniform object arrays (tabular format)', () => {
    const original = {
      workers: [
        { id: 'w1', role: 'tester', priority: 1 },
        { id: 'w2', role: 'linter', priority: 2 },
        { id: 'w3', role: 'builder', priority: 3 },
      ],
    };

    const encoded = encodeToon(original);
    expect(encoded).toContain('workers[3]{id,role,priority}:');
    expect(encoded).toContain('w1,tester,1');
    expect(encoded).toContain('w2,linter,2');
    expect(encoded).toContain('w3,builder,3');

    const decoded = decodeToon<typeof original>(encoded);
    expect(decoded).toEqual(original);
  });

  test('strict validation catches truncated rows or [N] mismatch', () => {
    // Declared [3] but only provided 2 rows
    const malformedToon = `
workers[3]{id,role}:
  w1,tester
  w2,builder
`.trim();

    const result = validateToon(malformedToon);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();

    expect(() => decodeToon(malformedToon, { strict: true })).toThrow();
  });

  test('token comparison reports significant savings on tabular data', () => {
    const data = {
      records: Array.from({ length: 15 }, (_, i) => ({
        id: `rec-${i + 1}`,
        kind: 'test-evidence',
        result: 'pass',
        exitCode: 0,
        summary: `Verification test ${i + 1} passed successfully without regressions`,
      })),
    };

    const stats = compareTokens(data);
    expect(stats.toonChars).toBeLessThan(stats.jsonChars);
    expect(stats.estimatedToonTokens).toBeLessThan(stats.estimatedJsonTokens);
    expect(stats.savingsPercent).toBeGreaterThan(25);
  });

  test('extractToonFences correctly parses ```toon codeblocks', () => {
    const markdown = `
Here is the proposed delegation contract:

\`\`\`toon
contract{workerId,targetCard,objective}:
  worker-1,CARD-101,"Run penetration tests"
ownedPaths[1]: src/auth/
acceptanceChecks[1]: "bun test"
\`\`\`

And some trailing explanation.
`;

    const fences = extractToonFences(markdown);
    expect(fences.length).toBe(1);
    expect(fences[0]).toContain('worker-1,CARD-101');
  });
});

describe('TOON FableState Compaction', () => {
  test('compactFableStateToon produces high-density tabular representation of state and evidence', () => {
    const mockState: FableState = {
      schemaVersion: 3,
      stateRevision: 1,
      workspaceId: 'ws-abc-123',
      phase: 'verifying',
      currentSkill: 'fable-verify',
      failureStreak: 0,
      substantial: true,
      mutationGeneration: 3,
      verifiedGeneration: 2,
      activeCard: 'CARD-TOON-001',
      lastDecision: {
        selectedSkill: 'fable-verify',
        selectedPack: 'core',
        taskShape: 'feature',
        confidence: 0.95,
        reasons: ['Testing completion'],
        requiresPlan: false,
        requiredGates: ['passing_tests'],
        fallbackSkill: null,
        parallelCandidates: [],
        nextSkills: ['fable-release'],
        scores: {} as any,
      },
      evidence: [
        {
          kind: 'test',
          source: 'bun test',
          result: 'pass',
          detail: 'All 50 unit tests pass',
          generation: 3,
          timestamp: '2026-09-14T00:00:00Z',
        },
        {
          kind: 'build',
          source: 'bun run build',
          result: 'pass',
          detail: 'Compiled host and client',
          generation: 3,
          timestamp: '2026-09-14T00:01:00Z',
        },
      ],
      updatedAt: '2026-09-14T00:02:00Z',
    };

    const toon = compactFableStateToon(mockState);
    expect(toon).toContain('workspaceId: ws-abc-123');
    expect(toon).toContain('phase: verifying');
    expect(toon).toContain('evidence[2]{kind,source,result,gen,detail}:');
    expect(toon).toContain('test,bun test,pass,3,All 50 unit tests pass');

    const validation = validateToon(toon);
    expect(validation.valid).toBe(true);
  });
});

describe('TOON Subagent Delegation Protocol', () => {
  test('encodes and decodes delegation contracts losslessly', () => {
    const contract: ToonDelegationContract = {
      workerId: 'worker-auth-01',
      targetCard: 'CARD-AUTH-99',
      objective: 'Implement PKCE challenge verification',
      timeoutSec: 180,
      ownedPaths: ['src/auth/pkce.ts', 'test/auth/pkce.test.ts'],
      forbiddenPaths: ['src/core/types.ts', '.env'],
      acceptanceChecks: ['bun test test/auth/pkce.test.ts', 'bun run typecheck'],
      rules: ['Do not mutate files outside ownedPaths', 'Return TOON packet'],
    };

    const encoded = encodeDelegationContract(contract);
    expect(encoded).toContain('contract:');
    expect(encoded).toContain('workerId: worker-auth-01');
    expect(encoded).toContain('targetCard: CARD-AUTH-99');
    expect(encoded).toContain('ownedPaths[2]:');

    const decoded = decodeDelegationContract(encoded);
    expect(decoded.workerId).toBe(contract.workerId);
    expect(decoded.targetCard).toBe(contract.targetCard);
    expect(decoded.objective).toBe(contract.objective);
    expect(decoded.timeoutSec).toBe(contract.timeoutSec);
    expect(decoded.ownedPaths).toEqual(contract.ownedPaths);
    expect(decoded.forbiddenPaths).toEqual(contract.forbiddenPaths);
    expect(decoded.acceptanceChecks).toEqual(contract.acceptanceChecks);
    expect(decoded.rules).toEqual(contract.rules);
  });

  test('encodes and decodes worker return packets losslessly with strict validation', () => {
    const packet: ToonReturnPacket = {
      workerId: 'worker-auth-01',
      targetCard: 'CARD-AUTH-99',
      status: 'complete',
      allChecksPassed: true,
      mutations: [
        { path: 'src/auth/pkce.ts', action: 'created', byteSize: 1450 },
        { path: 'test/auth/pkce.test.ts', action: 'created', byteSize: 2200 },
      ],
      verifications: [
        { command: 'bun test test/auth/pkce.test.ts', result: 'pass', durationMs: 140 },
        { command: 'bun run typecheck', result: 'pass', durationMs: 310 },
      ],
      findings: ['PKCE SHA256 verified against RFC 7636 test vectors'],
      notes: ['Ready for merge into main authentication branch'],
    };

    const encoded = encodeReturnPacket(packet);
    expect(encoded).toContain('result:');
    expect(encoded).toContain('workerId: worker-auth-01');
    expect(encoded).toContain('mutations[2]{path,action,byteSize}:');
    expect(encoded).toContain('verifications[2]{command,result,durationMs}:');

    const decoded = decodeReturnPacket(encoded);
    expect(decoded.workerId).toBe(packet.workerId);
    expect(decoded.targetCard).toBe(packet.targetCard);
    expect(decoded.status).toBe('complete');
    expect(decoded.allChecksPassed).toBe(true);
    expect(decoded.mutations.length).toBe(2);
    expect(decoded.verifications.length).toBe(2);
    expect(decoded.findings).toEqual(packet.findings);
    expect(decoded.notes).toEqual(packet.notes);
  });

  test('decodeDelegationContract works when wrapped in markdown code fence', () => {
    const fencedMarkdown = `
Agent response:
\`\`\`toon
contract:
  workerId: worker-audit
  targetCard: CARD-501
  objective: Audit dependencies
ownedPaths[1]: package.json
acceptanceChecks[1]: bun pm audit
\`\`\`
`;

    const decoded = decodeDelegationContract(fencedMarkdown);
    expect(decoded.workerId).toBe('worker-audit');
    expect(decoded.targetCard).toBe('CARD-501');
    expect(decoded.objective).toBe('Audit dependencies');
    expect(decoded.ownedPaths).toEqual(['package.json']);
    expect(decoded.acceptanceChecks).toEqual(['bun pm audit']);
  });
});
