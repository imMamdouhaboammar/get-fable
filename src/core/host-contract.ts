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
  { id: 'claude', level: 'FULL', packages: true, nestedResources: true, rules: true, hooksRegistered: true, durableStateAware: true, mutationDetection: true, completionGuard: true, sparkViaCli: true, cliFallback: true },
  { id: 'antigravity', level: 'FULL', packages: true, nestedResources: true, rules: true, hooksRegistered: true, durableStateAware: true, mutationDetection: true, completionGuard: true, sparkViaCli: true, cliFallback: true },
  { id: 'codex', level: 'PARTIAL', packages: true, nestedResources: true, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'opencode', level: 'PARTIAL', packages: true, nestedResources: true, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'kiro', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'cursor', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'kimi', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'deepseek', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
  { id: 'pi', level: 'ADVISORY', packages: false, nestedResources: false, rules: true, hooksRegistered: false, durableStateAware: false, mutationDetection: false, completionGuard: false, sparkViaCli: true, cliFallback: true },
] as const;

export function hostContract(id: string): HostContract | null {
  return HOST_CONTRACTS.find((host) => host.id === id) ?? null;
}
