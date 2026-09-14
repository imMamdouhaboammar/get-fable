import { describe, expect, test } from 'bun:test';
import { parseOutreachContract, renderDiscussionBody } from '../src/outreach/contract.ts';

function issueBody(overrides: Record<string, unknown> = {}) {
  const contract = {
    schema: 1,
    candidate: 'obra',
    topicKey: 'lifecycle-gates-vs-advisory-skills',
    discussionTitle: 'RFC: Should coding-agent skills enforce lifecycle gates?',
    discussionCategory: 'Ideas',
    discussionBodyTemplate: 'I am exploring lifecycle gates. {{candidate}} what trade-offs would you watch?',
    sourceIssuePurpose: 'contribution-opportunity',
    createdBy: 'chatgpt-scheduled-outreach',
    ...overrides,
  };

  return `## Why this matters\n\nUseful contribution context without mentions.\n\n## Outreach publication contract\n\n\`\`\`get-fable-outreach-v1\n${JSON.stringify(contract, null, 2)}\n\`\`\``;
}

describe('outreach contract', () => {
  test('parses exactly one valid v1 contract block', () => {
    const parsed = parseOutreachContract(issueBody());
    expect(parsed.candidate).toBe('obra');
    expect(parsed.topicKey).toBe('lifecycle-gates-vs-advisory-skills');
    expect(parsed.discussionCategory).toBe('Ideas');
  });

  test('rejects malformed or duplicate contract blocks', () => {
    expect(() => parseOutreachContract('```get-fable-outreach-v1\n{nope}\n```')).toThrow('valid JSON');
    const duplicate = `${issueBody()}\n\n${issueBody({ topicKey: 'another-topic' })}`;
    expect(() => parseOutreachContract(duplicate)).toThrow('exactly one');
  });

  test('rejects unsupported schema and unexpected keys', () => {
    expect(() => parseOutreachContract(issueBody({ schema: 2 }))).toThrow('schema');
    expect(() => parseOutreachContract(issueBody({ extra: true }))).toThrow('unexpected');
  });

  test('requires trusted metadata constants and Ideas category', () => {
    expect(() => parseOutreachContract(issueBody({ createdBy: 'someone-else' }))).toThrow('createdBy');
    expect(() => parseOutreachContract(issueBody({ sourceIssuePurpose: 'marketing' }))).toThrow('sourceIssuePurpose');
    expect(() => parseOutreachContract(issueBody({ discussionCategory: 'General' }))).toThrow('Ideas');
  });

  test('validates candidate grammar and rejects bot accounts', () => {
    expect(() => parseOutreachContract(issueBody({ candidate: '-bad-login' }))).toThrow('candidate');
    expect(() => parseOutreachContract(issueBody({ candidate: 'x'.repeat(40) }))).toThrow('candidate');
    expect(() => parseOutreachContract(issueBody({ candidate: 'dependabot[bot]' }))).toThrow('bot');
    expect(() => parseOutreachContract(issueBody({ candidate: 'renovate-bot' }))).toThrow('bot');
  });

  test('validates stable topicKey grammar', () => {
    expect(() => parseOutreachContract(issueBody({ topicKey: 'Upper Case Topic' }))).toThrow('topicKey');
    expect(() => parseOutreachContract(issueBody({ topicKey: '-leading-dash' }))).toThrow('topicKey');
    expect(() => parseOutreachContract(issueBody({ topicKey: 'x'.repeat(121) }))).toThrow('topicKey');
  });

  test('rejects external mentions in the source Issue or stored template', () => {
    expect(() => parseOutreachContract(`${issueBody()}\nThanks @someone`)).toThrow('mention');
    expect(() => parseOutreachContract(issueBody({ discussionBodyTemplate: 'Hi @someone {{candidate}}' }))).toThrow('mention');
  });

  test('requires exactly one neutral candidate placeholder', () => {
    expect(() => parseOutreachContract(issueBody({ discussionBodyTemplate: 'No placeholder here' }))).toThrow('placeholder');
    expect(() => parseOutreachContract(issueBody({ discussionBodyTemplate: '{{candidate}} and {{candidate}}' }))).toThrow('placeholder');
  });

  test('enforces title and body length limits', () => {
    expect(() => parseOutreachContract(issueBody({ discussionTitle: 'x'.repeat(201) }))).toThrow('discussionTitle');
    expect(() => parseOutreachContract(issueBody({ discussionBodyTemplate: `${'x'.repeat(8001)}{{candidate}}` }))).toThrow('discussionBodyTemplate');
  });

  test('renders exactly one intended mention and deterministic Issue marker', () => {
    const rendered = renderDiscussionBody(parseOutreachContract(issueBody()), 42);
    expect(rendered).toContain('@obra');
    expect(rendered.match(/@obra/g)?.length).toBe(1);
    expect(rendered).toContain('<!-- get-fable-outreach:issue-42 -->');
    expect(rendered).not.toContain('{{candidate}}');
  });
});
