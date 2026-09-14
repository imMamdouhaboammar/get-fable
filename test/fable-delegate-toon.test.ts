import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  decodeDelegationContract,
  decodeReturnPacket,
  validateToon,
} from '../src/core/toon.js';
import { compileFableDirective } from '../src/core/prompt-compiler.js';

describe('TOON Delegation Templates', () => {
  const templatesDir = path.join(process.cwd(), 'skills', 'fable-delegate', 'templates');

  test('delegation-contract.toon template exists and is valid TOON', () => {
    const contractPath = path.join(templatesDir, 'delegation-contract.toon');
    expect(fs.existsSync(contractPath)).toBe(true);

    const content = fs.readFileSync(contractPath, 'utf-8');
    const validation = validateToon(content);
    expect(validation.valid).toBe(true);

    const parsed = decodeDelegationContract(content);
    expect(parsed.workerId).toBe('<worker-name>');
    expect(parsed.targetCard).toBe('<CARD-ID>');
    expect(parsed.ownedPaths.length).toBe(2);
    expect(parsed.acceptanceChecks.length).toBe(1);
  });

  test('return-packet.toon template exists and is valid TOON', () => {
    const packetPath = path.join(templatesDir, 'return-packet.toon');
    expect(fs.existsSync(packetPath)).toBe(true);

    const content = fs.readFileSync(packetPath, 'utf-8');
    const validation = validateToon(content);
    expect(validation.valid).toBe(true);

    const parsed = decodeReturnPacket(content);
    expect(parsed.workerId).toBe('<worker-name>');
    expect(parsed.status).toBe('complete');
    expect(parsed.allChecksPassed).toBe(true);
    expect(parsed.mutations.length).toBe(1);
    expect(parsed.verifications.length).toBe(1);
  });
});

describe('Prompt Compiler TOON Integration', () => {
  test('compileFableDirective injects TOON communication protocol into system prompt', () => {
    const directive = compileFableDirective('Implement user authentication service');
    expect(directive.systemPrompt).toContain('Structured communication protocol');
    expect(directive.systemPrompt).toContain('TOON (Token-Oriented Object Notation)');
    expect(directive.systemPrompt).toContain('```toon');
  });
});
