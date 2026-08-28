export type HostSupportLevel = 'FULL' | 'PARTIAL' | 'ADVISORY' | 'UNSUPPORTED';
export interface HostContract {
  id: string;
  level: HostSupportLevel;
  packages: boolean;
  nestedResources: boolean;
  rules: boolean;
  hooksRegistered: boolean;
  durableStateAware: boolean;
  mutationDetection: boolean;
  completionGuard: boolean;
  sparkViaCli: boolean;
  cliFallback: boolean;
}

export const HOST_CONTRACTS: readonly HostContract[] = [
  // Full Lifecycle
  { id: 'claude', level: 'FULL', packages: true, nestedResources: true, rules: true, hooksRegistered: true, durableStateAware: true, mutationDetection: true, completionGuard: true, sparkViaCli: true, cliFallback: true },
  { id: 'antigravity', level: 'FULL', packages: true, nestedResources: true, rules: true, hooksRegistered: true, durableStateAware: true, mutationDetection: true, completionGuard: true, sparkViaCli: true, cliFallback: true },

  // Skill + Rule / Partial
  { id: 'codex', level: 'PARTIAL', packages: true, nestedResources: true, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'opencode', level: 'PARTIAL', packages: true, nestedResources: true, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'devin', level: 'PARTIAL', packages: true, nestedResources: true, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'grok', level: 'PARTIAL', packages: true, nestedResources: true, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'roocode', level: 'PARTIAL', packages: true, nestedResources: true, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'cline', level: 'PARTIAL', packages: true, nestedResources: true, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'openhands', level: 'PARTIAL', packages: true, nestedResources: true, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'kilo', level: 'PARTIAL', packages: true, nestedResources: true, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'hermes', level: 'PARTIAL', packages: true, nestedResources: true, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },

  // Advisory Rules
  { id: 'cursor', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'copilot', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'windsurf', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'replit', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'amazonq', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'trae', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'warp', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'kimi', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'atlarix', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'vellum', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'codegen', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'muse', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'junie', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'qodo', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'aider', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'continue', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'plandex', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'autogpt', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'kiro', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'deepseek', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'pi', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
] as const;

export function hostContract(id: string): HostContract | null {
  return HOST_CONTRACTS.find((host) => host.id === id) ?? null;
}

