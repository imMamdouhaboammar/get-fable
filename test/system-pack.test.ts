import { describe, expect, test } from 'bun:test';
import { routeTask } from '../src/core/task-router.ts';
import { loadSkillFeed } from '../src/core/feed.ts';
import { autoInstallSkills, resolveSkillsToInstall } from '../src/core/skill-installer.ts';
import { compileFableDirective } from '../src/core/prompt-compiler.ts';

describe('System Pack and Harness Integration', () => {
  test('routes dataviz tasks to fable-dataviz', () => {
    const decision = routeTask('Create a line chart dashboard for daily active users');
    expect(decision.selectedSkill).toBe('fable-dataviz');
    expect(decision.selectedPack).toBe('system');
  });

  test('routes artifact and diagramming tasks to fable-artifact', () => {
    const decision = routeTask('Design a Mermaid architecture diagram for the authentication flow');
    expect(decision.selectedSkill).toBe('fable-artifact');
    expect(decision.selectedPack).toBe('system');
  });

  test('routes code simplification to fable-simplify', () => {
    const decision = routeTask('Simplify the parser functions and remove dead code');
    expect(decision.selectedSkill).toBe('fable-simplify');
    expect(decision.selectedPack).toBe('system');
  });

  test('routes recurring loops to fable-loop', () => {
    const decision = routeTask('Run a recurring loop to babysit the deployment status');
    expect(decision.selectedSkill).toBe('fable-loop');
    expect(decision.selectedPack).toBe('system');
  });

  test('routes live app execution to fable-run', () => {
    const decision = routeTask('Run app and start server to perform a live smoke test');
    expect(decision.selectedSkill).toBe('fable-run');
    expect(decision.selectedPack).toBe('system');
  });

  test('routes persistent memory requests to fable-memory', () => {
    const decision = routeTask('Remember this user preference in MEMORY.md');
    expect(decision.selectedSkill).toBe('fable-memory');
    expect(decision.selectedPack).toBe('system');
  });

  test('routes harness configuration requests to fable-config', () => {
    const decision = routeTask('Configure settings.json and add read-only allowlist permissions');
    expect(decision.selectedSkill).toBe('fable-config');
    expect(decision.selectedPack).toBe('system');
  });

  test('routes simulator verification to fable-simulator', () => {
    const decision = routeTask('Verify with an independent oracle and derive contract from codebase');
    expect(decision.selectedSkill).toBe('fable-simulator');
    expect(decision.selectedPack).toBe('system');
  });

  test('routes cowork mode tasks to fable-cowork', () => {
    const decision = routeTask('Run this in cowork mode with autonomous execution');
    expect(decision.selectedSkill).toBe('fable-cowork');
    expect(decision.selectedPack).toBe('system');
  });

  test('routes situational awareness spark to fable-spark', () => {
    const decision = routeTask('Predict the next move using situational awareness spark');
    expect(decision.selectedSkill).toBe('fable-spark');
    expect(decision.selectedPack).toBe('system');
  });

  test('resolves all 12 system pack skills correctly', () => {
    const systemSkills = resolveSkillsToInstall('system');
    expect(systemSkills).toEqual([
      'fable-dataviz',
      'fable-artifact',
      'fable-simplify',
      'fable-loop',
      'fable-run',
      'fable-memory',
      'fable-config',
      'fable-simulator',
      'fable-cowork',
      'fable-spark',
      'fable-architecture',
      'fable-eco',
    ]);
  });

  test('compiles directive with enriched communication and harness invariants', () => {
    const compiled = compileFableDirective('Create a bar chart for user engagement');
    expect(compiled.systemPrompt).toContain('Lead with the outcome');
    expect(compiled.systemPrompt).toContain('Readable over compressed');
    expect(compiled.systemPrompt).toContain('fable-dataviz');
  });

  test('routes convo-learn and learning extraction tasks to fable-learning in evolution pack', () => {
    const d1 = routeTask('Run convo-learn on the session transcript to extract what we learned');
    expect(d1.selectedSkill).toBe('fable-learning');
    expect(d1.selectedPack).toBe('evolution');
    expect(d1.taskShape).toBe('eval');

    const d2 = routeTask('Analyze this session realities and extract learnings from issues and fixes');
    expect(d2.selectedSkill).toBe('fable-learning');
    expect(d2.selectedPack).toBe('evolution');

    const d3 = routeTask('What did we learn from this conversation? Generate playbook and rules');
    expect(d3.selectedSkill).toBe('fable-learning');
    expect(d3.selectedPack).toBe('evolution');
  });
});
