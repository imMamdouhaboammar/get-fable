import { describe, expect, test } from 'bun:test';
import { isNewerVersion } from '../src/core/updater.ts';

describe('Auto-Updater Module', () => {
  test('correctly compares semantic versions', () => {
    expect(isNewerVersion('1.2.0', '1.2.1')).toBe(true);
    expect(isNewerVersion('1.2.0', '1.3.0')).toBe(true);
    expect(isNewerVersion('1.2.0', '2.0.0')).toBe(true);
    expect(isNewerVersion('1.2.0', '1.2.0')).toBe(false);
    expect(isNewerVersion('1.2.1', '1.2.0')).toBe(false);
  });

  test('orders prereleases before the corresponding stable release', () => {
    expect(isNewerVersion('1.6.0-rc.1', '1.6.0')).toBe(true);
    expect(isNewerVersion('1.6.0', '1.6.0-rc.1')).toBe(false);
  });

  test('rejects invalid semantic versions instead of coercing them', () => {
    expect(() => isNewerVersion('not-a-version', '1.6.0')).toThrow();
    expect(() => isNewerVersion('1.6.0', 'still-not-a-version')).toThrow();
  });
});
