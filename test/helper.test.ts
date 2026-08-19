import { describe, expect, test } from 'bun:test';
import { getHelpTopic, listHelpTopics, renderInteractiveHelp, HELP_TOPICS } from '../src/core/helper.ts';

describe('Interactive Helper System', () => {
  test('lists all canonical help topics', () => {
    const topics = listHelpTopics();
    expect(topics.length).toBeGreaterThanOrEqual(7);

    const ids = topics.map((t) => t.id);
    expect(ids).toContain('lifecycle');
    expect(ids).toContain('skills');
    expect(ids).toContain('spark');
    expect(ids).toContain('evidence');
    expect(ids).toContain('platforms');
    expect(ids).toContain('hooks');
    expect(ids).toContain('commands');
  });

  test('retrieves specific topic content cleanly', () => {
    const topic = getHelpTopic('lifecycle');
    expect(topic).not.toBeNull();
    expect(topic?.title).toContain('Lifecycle');
    expect(topic?.content).toContain('discovering');
    expect(topic?.content).toContain('verifying');
  });

  test('renders interactive help for valid and invalid topics', () => {
    const generalHelp = renderInteractiveHelp();
    expect(generalHelp).toContain('AVAILABLE HELP TOPICS');

    const topicHelp = renderInteractiveHelp('skills');
    expect(topicHelp).toContain('14 CANONICAL SPECIALIST SKILLS');

    const invalidHelp = renderInteractiveHelp('nonexistent-topic');
    expect(invalidHelp).toContain('Unknown help topic');
  });
});
