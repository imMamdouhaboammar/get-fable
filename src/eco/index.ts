export * from './types.js';
export * from './native-bridge.js';

import { runNativeEco } from './native-bridge.js';

export function runEcoCli(repoRoot: string, args: string[]): void {
  try {
    const envelope = runNativeEco(repoRoot, args);
    console.log(JSON.stringify(envelope, null, 2));
  } catch (err: any) {
    console.error(`Error executing eco command: ${err?.message || err}`);
    process.exit(1);
  }
}
