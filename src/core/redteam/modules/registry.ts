import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

export class ProbeRegistry {
  private modules = new Map<string, SecurityProbeModule>();

  public register(module: SecurityProbeModule): this {
    this.modules.set(module.id, module);
    return this;
  }

  public get(id: string): SecurityProbeModule | undefined {
    return this.modules.get(id);
  }

  public getAll(): SecurityProbeModule[] {
    return Array.from(this.modules.values());
  }

  public async runAll(context: ProbeContext): Promise<RedTeamFinding[]> {
    const profile = context.options.profile || 'passive';
    const activeModules = this.getAll().filter((mod) => {
      // Must match profile
      if (!mod.profiles.includes(profile)) {
        return false;
      }
      // Must match context surface
      try {
        return mod.match(context);
      } catch {
        return false;
      }
    });

    const allFindings: RedTeamFinding[] = [];

    for (const mod of activeModules) {
      try {
        const findings = await mod.run(context);
        if (Array.isArray(findings) && findings.length > 0) {
          allFindings.push(...findings);
        }
      } catch {
        // Individual probe failure is isolated and fail-soft
      }
    }

    return allFindings;
  }
}
