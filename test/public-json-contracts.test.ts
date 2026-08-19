import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const schema = (name: string) => JSON.parse(fs.readFileSync(path.join(root, 'schemas', name), 'utf-8'));

describe('public machine-readable contracts', () => {
  test('defines an additive schema-v1 CLI envelope', () => {
    const value = schema('cli-json-envelope.schema.json');
    expect(value.additionalProperties).toBe(false);
    expect(value.required).toEqual(['schemaVersion', 'command', 'data']);
    expect(value.properties.schemaVersion.const).toBe(1);
  });

  test('defines oracle-free agent behavior request and response bundles', () => {
    const request = schema('agent-behavior-request-bundle.schema.json');
    const response = schema('agent-behavior-response-bundle.schema.json');
    expect(request.properties.metric.const).toBe('agent-behavior-requests');
    expect(request.definitions.request.properties.expected).toBeUndefined();
    expect(request.definitions.request.properties.forbidden).toBeUndefined();
    expect(response.properties.metric.const).toBe('agent-behavior-responses');
    expect(response.required).toContain('providerId');
  });

  test('binds scored behavior evidence to hashes, categories, and capture time', () => {
    const result = schema('agent-behavior-eval-result.schema.json');
    expect(result.required).toContain('corpusSha256');
    expect(result.required).toContain('oracleSha256');
    expect(result.required).toContain('capturedAt');
    expect(result.properties.cases.items.required).toContain('category');
  });
});
