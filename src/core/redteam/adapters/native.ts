import { runSecurityProbes } from '../probe.js';
import type { AdapterContext, RedTeamFinding, ToolAdapterId } from '../types.js';
import { BaseToolAdapter } from './base.js';

export class NativeProbeAdapter extends BaseToolAdapter {
  readonly id: ToolAdapterId = 'native';
  readonly name = 'Native TypeScript Probe';
  readonly description =
    'Zero-dependency built-in HTTP security probes (headers, CORS, sensitive files, auth bypass)';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async run(context: AdapterContext): Promise<RedTeamFinding[]> {
    const findings = await runSecurityProbes({
      target: context.target,
      profile: context.profile,
      scopeConfig: context.scopeConfig,
      authToken: context.authToken,
      secondAuthToken: context.secondAuthToken,
      safeMode: context.safeMode,
      timeoutMs: context.timeoutMs,
      envelope: context.envelope,
    });

    return findings.map((finding) => ({
      ...finding,
      sourceTool: this.id,
    }));
  }
}
