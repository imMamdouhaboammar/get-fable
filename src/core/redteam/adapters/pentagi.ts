import { execSync } from 'node:child_process';
import { checkEnvironmentPolicy } from '../setup.js';
import type { AdapterContext, RedTeamFinding, ToolAdapterId } from '../types.js';
import { BaseToolAdapter } from './base.js';

export class PentAGIAdapter extends BaseToolAdapter {
  readonly id: ToolAdapterId = 'pentagi';
  readonly name = 'PentAGI Autonomous Agent Swarm';
  readonly description =
    'Sandboxed multi-agent autonomous swarm for deep exploratory exploit validation';

  async isAvailable(context?: AdapterContext): Promise<boolean> {
    const policyCheck = checkEnvironmentPolicy(context?.policy);
    if (!policyCheck.allowed) {
      return false;
    }

    try {
      const output = execSync(
        'docker ps --filter "name=fable-redteam-pentagi" --format "{{.Names}}" 2>/dev/null',
        { encoding: 'utf-8', timeout: 1500 }
      ).trim();
      return output.includes('fable-redteam-pentagi');
    } catch {
      return false;
    }
  }

  async run(context: AdapterContext): Promise<RedTeamFinding[]> {
    const policyCheck = checkEnvironmentPolicy(context.policy);
    if (!policyCheck.allowed) {
      return [];
    }

    const available = await this.isAvailable(context);
    if (!available) {
      return [];
    }

    // In a live environment with running container, stream tasks with timeoutMs envelope
    return [];
  }
}

