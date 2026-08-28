import { describe, expect, test } from 'bun:test';
import { isNewerVersion, fetchLatestVersion } from '../src/core/updater.ts';

describe('Auto-Updater Module', () => {
  test('correctly compares semantic versions', () => {
    expect(isNewerVersion('1.2.0', '1.2.1')).toBe(true);
    expect(isNewerVersion('1.2.0', '1.3.0')).toBe(true);
    expect(isNewerVersion('1.2.0', '2.0.0')).toBe(true);
    expect(isNewerVersion('1.2.0', '1.2.0')).toBe(false);
    expect(isNewerVersion('1.2.1', '1.2.0')).toBe(false);
  });

  test('fetches latest version metadata safely without throwing', async () => {
    const result = await fetchLatestVersion('1.4.0', 2000);
    expect(result).toBeDefined();
    expect(result.currentVersion).toBe('1.4.0');
    expect(typeof result.latestVersion).toBe('string');
    expect(typeof result.updateAvailable).toBe('boolean');
  });
});
