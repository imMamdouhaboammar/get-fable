import type { UpdatePlan, UpdatePlanInput } from './types.js';

function notifyOnly(input: UpdatePlanInput, reason: string): UpdatePlan {
  return {
    currentVersion: input.currentVersion,
    targetVersion: input.targetVersion,
    installation: input.installation,
    strategy: 'notify-only',
    requiresConfirmation: false,
    reason,
  };
}

export function planUpdate(input: UpdatePlanInput): UpdatePlan {
  const base = {
    currentVersion: input.currentVersion,
    targetVersion: input.targetVersion,
    installation: input.installation,
  };

  switch (input.installation.method) {
    case 'bun-global':
      return {
        ...base,
        strategy: 'bun-global',
        executable: 'bun',
        argv: ['add', '-g', `get-fable@${input.targetVersion}`],
        requiresConfirmation: true,
        reason: `Update Bun-owned global installation to ${input.targetVersion}`,
      };

    case 'npm-global':
      return {
        ...base,
        strategy: 'npm-global',
        executable: 'npm',
        argv: ['install', '-g', `get-fable@${input.targetVersion}`],
        requiresConfirmation: true,
        reason: `Update npm-owned global installation to ${input.targetVersion}`,
      };

    case 'homebrew':
      if (input.targetKind !== 'latest-stable') {
        return notifyOnly(input, 'Homebrew arbitrary version targets are not represented safely');
      }
      return {
        ...base,
        strategy: 'homebrew',
        executable: 'brew',
        argv: ['upgrade', 'get-fable'],
        requiresConfirmation: true,
        reason: `Update Homebrew-owned installation to latest stable ${input.targetVersion}`,
      };

    case 'git-checkout':
      if (input.targetKind !== 'latest-stable') {
        return notifyOnly(input, 'Git checkout arbitrary version targets require an explicit source workflow');
      }
      return {
        ...base,
        strategy: 'git-checkout',
        requiresConfirmation: true,
        reason: `Update the guarded Git checkout to stable release ${input.targetVersion}`,
      };

    case 'unknown':
      return notifyOnly(input, 'Installation ownership is unknown; refusing to choose a mutation strategy');
  }
}
