import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { LAB_TOKENS, startLabServer, type LabServerInstance } from '../src/core/redteam/lab/vulnerable-server.ts';
import { runAllPlaybooks, runPlaybook } from '../src/core/redteam/playbooks/runner.ts';

describe('RedTeam Tactical Playbooks Runner', () => {
  let lab: LabServerInstance;

  beforeAll(async () => {
    lab = await startLabServer(0);
  });

  afterAll(async () => {
    await lab.stop();
  });

  test('throws descriptive error on unknown playbook', async () => {
    expect(runPlaybook('non-existent-playbook', lab.url)).rejects.toThrow('Unknown tactical playbook');
  });

  test('executes injection playbook against vulnerable search endpoint', async () => {
    const findings = await runPlaybook('injection', `${lab.url}/api/search`, {
      envelope: { allowedPorts: [lab.port] },
    });

    expect(findings.length).toBeGreaterThanOrEqual(1);
    const finding = findings[0];
    expect(finding.category).toBe('injection');
    expect(finding.severity).toBe('critical');
    expect(finding.cwe).toBe('CWE-89');
    expect(finding.evidence.reproCurl).toContain('curl');
  });

  test('executes llm-security playbook against agent endpoint', async () => {
    const findings = await runPlaybook('llm-security', `${lab.url}/api/chat`, {
      envelope: { allowedPorts: [lab.port] },
    });

    expect(findings.length).toBeGreaterThanOrEqual(1);
    const finding = findings[0];
    expect(finding.category).toBe('llm-prompt-injection');
    expect(finding.title).toContain('System Prompt');
  });

  test('executes auth-session playbook against cors endpoint', async () => {
    const findings = await runPlaybook('auth-session', `${lab.url}/api/cors-test`, {
      envelope: { allowedPorts: [lab.port] },
    });

    expect(findings.length).toBeGreaterThanOrEqual(1);
    const finding = findings[0];
    expect(finding.category).toBe('cors-misconfiguration');
    expect(finding.title).toContain('Arbitrary Origin');
  });

  test('executes api-logic playbook with dual tokens against BOLA endpoint', async () => {
    const findings = await runPlaybook('api-logic', `${lab.url}/api/documents/101`, {
      authToken: LAB_TOKENS.USER_A,
      secondAuthToken: LAB_TOKENS.USER_B,
      envelope: { allowedPorts: [lab.port] },
    });

    expect(findings.length).toBeGreaterThanOrEqual(1);
    const finding = findings[0];
    expect(finding.category).toBe('idor-bola');
    expect(finding.title).toContain('Broken Object Level Authorization');
  });

  test('runAllPlaybooks executes all tactical playbooks fail-soft', async () => {
    const findings = await runAllPlaybooks(lab.url, {
      authToken: LAB_TOKENS.USER_A,
      secondAuthToken: LAB_TOKENS.USER_B,
      envelope: { allowedPorts: [lab.port] },
    });

    expect(Array.isArray(findings)).toBe(true);
  });
});
