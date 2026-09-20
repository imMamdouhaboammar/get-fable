import { describe, expect, test } from 'bun:test';
import { canonicalSkillIds } from '../../../src/core/skill-registry.js';
import {
  buildFirstPassQuestions,
  buildSkillSelectionCriteria,
  buildTaskShapeCriteria,
  SKILL_BOUNDARY_CONTRASTS,
} from '../../../src/core/reflex/question-builder.js';

describe('Jev Question Builder Contracts', () => {
  test('buildSkillSelectionCriteria contains all canonical skills except get-fable', () => {
    const criteria = buildSkillSelectionCriteria();
    const allSkills = canonicalSkillIds();

    expect(criteria['get-fable']).toBeUndefined();

    for (const skill of allSkills) {
      if (skill === 'get-fable') continue;
      expect(criteria[skill]).toBeDefined();
      expect(typeof criteria[skill]).toBe('string');
      expect(criteria[skill].length).toBeGreaterThan(15);
    }
  });

  test('boundary contrasts enrich lookalike skills', () => {
    const criteria = buildSkillSelectionCriteria();
    expect(criteria['fable-discover']).toContain('Use when:');
    expect(criteria['fable-research']).toContain('Use when:');
    expect(criteria['fable-redteam']).toContain('Use when:');
    expect(criteria['fable-heal']).toContain('Use when:');
  });

  test('buildTaskShapeCriteria defines all canonical task shapes', () => {
    const shapes = buildTaskShapeCriteria();
    expect(shapes['bug-fix']).toBeDefined();
    expect(shapes['feature']).toBeDefined();
    expect(shapes['security']).toBeDefined();
    expect(shapes['research']).toBeDefined();
  });

  test('buildFirstPassQuestions constructs complete valid questions map', () => {
    const questions = buildFirstPassQuestions();

    expect(questions.selected_skill).toBeDefined();
    expect(questions.selected_skill.type).toBe('choice');

    expect(questions.task_shape).toBeDefined();
    expect(questions.task_shape.type).toBe('choice');

    expect(questions.needs_recovery).toBeDefined();
    expect(questions.needs_recovery.type).toBe('noul');

    expect(questions.security_relevant).toBeDefined();
    expect(questions.security_relevant.type).toBe('noul');

    expect(questions.needs_current_external_research).toBeDefined();
    expect(questions.needs_current_external_research.type).toBe('noul');

    expect(questions.needs_planning).toBeDefined();
    expect(questions.needs_planning.type).toBe('noul');

    expect(questions.needs_behavior_verification).toBeDefined();
    expect(questions.needs_behavior_verification.type).toBe('noul');

    expect(questions.is_behavior_change).toBeDefined();
    expect(questions.is_behavior_change.type).toBe('noul');

    expect(questions.benefits_from_delegation).toBeDefined();
    expect(questions.benefits_from_delegation.type).toBe('noul');

    // Context budget: ensure serialized question map is comfortably within context ceiling
    const serializedLength = JSON.stringify(questions).length;
    expect(serializedLength).toBeLessThan(40000); // well under 12k token hard ceiling
  });
});
