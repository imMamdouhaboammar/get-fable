import { describe, expect, it } from 'bun:test';
import path from 'node:path';
import { runNativeEco, findNativeBinary } from '../src/eco/native-bridge.js';

const repoRoot = path.resolve(__dirname, '..');
const hasNativeBin = Boolean(findNativeBinary(repoRoot));

describe.skipIf(!hasNativeBin)('Fable Eco Native Bridge', () => {
  it('finds native binary', () => {
    const bin = findNativeBinary(repoRoot);
    expect(bin).toBeTruthy();
  });

  it('executes eco discover through native bridge', () => {
    const envelope = runNativeEco(repoRoot, ['discover']);
    expect(envelope.schema_version).toBe(1);
    expect(envelope.command).toBe('eco.discover');
    expect(envelope.ok).toBe(true);
    expect(envelope.result).toBeDefined();
    expect(envelope.result.os).toBeDefined();
  });

  it('executes eco catalog through native bridge', () => {
    const envelope = runNativeEco(repoRoot, ['catalog']);
    expect(envelope.schema_version).toBe(1);
    expect(envelope.command).toBe('eco.catalog');
    expect(envelope.ok).toBe(true);
    expect(Array.isArray(envelope.result)).toBe(true);
  });

  it('executes eco doctor through native bridge', () => {
    const envelope = runNativeEco(repoRoot, ['doctor']);
    expect(envelope.schema_version).toBe(1);
    expect(envelope.command).toBe('eco.doctor');
    expect(envelope.ok).toBe(true);
    expect(envelope.result.overall_status).toBeDefined();
  });

  it('executes eco hosts through native bridge', () => {
    const envelope = runNativeEco(repoRoot, ['hosts']);
    expect(envelope.schema_version).toBe(1);
    expect(envelope.command).toBe('eco.hosts');
    expect(envelope.ok).toBe(true);
    expect(Array.isArray(envelope.result)).toBe(true);
  });
});
