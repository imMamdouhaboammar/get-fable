import path from 'node:path';
import type {
  InstallationDetectionContext,
  InstallationInfo,
  InstallationMethod,
} from './types.js';

type PackageManagerMethod = Exclude<InstallationMethod, 'git-checkout' | 'unknown'>;

type OwnershipSignal = {
  method: PackageManagerMethod;
  evidence: string[];
};

function isPathWithin(candidate: string, root: string): boolean {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedRoot = path.resolve(root);
  const relative = path.relative(resolvedRoot, resolvedCandidate);

  return (
    relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

export function detectInstallation(context: InstallationDetectionContext): InstallationInfo {
  const gitDir = path.join(context.repoRoot, '.git');
  if (context.fileExists(gitDir)) {
    return {
      method: 'git-checkout',
      executablePath: context.executablePath,
      repoRoot: context.repoRoot,
      evidence: [`Git checkout detected at ${gitDir}`],
    };
  }

  const signals: OwnershipSignal[] = [];

  if (context.bunGlobalDir && isPathWithin(context.executablePath, context.bunGlobalDir)) {
    signals.push({
      method: 'bun-global',
      evidence: [`Executable is inside Bun global directory ${context.bunGlobalDir}`],
    });
  }

  if (context.npmGlobalDir && isPathWithin(context.executablePath, context.npmGlobalDir)) {
    signals.push({
      method: 'npm-global',
      evidence: [`Executable is inside npm global directory ${context.npmGlobalDir}`],
    });
  }

  if (context.homebrewPrefix && isPathWithin(context.executablePath, context.homebrewPrefix)) {
    const cellarPath = path.join(context.homebrewPrefix, 'Cellar', 'get-fable');
    if (context.fileExists(cellarPath)) {
      signals.push({
        method: 'homebrew',
        evidence: [
          `Executable is inside Homebrew prefix ${context.homebrewPrefix}`,
          `Homebrew Cellar entry exists at ${cellarPath}`,
        ],
      });
    }
  }

  if (signals.length === 1) {
    const [owner] = signals;
    return {
      method: owner.method,
      executablePath: context.executablePath,
      evidence: owner.evidence,
    };
  }

  if (signals.length > 1) {
    return {
      method: 'unknown',
      executablePath: context.executablePath,
      evidence: signals.flatMap((signal) => signal.evidence),
    };
  }

  return {
    method: 'unknown',
    executablePath: context.executablePath,
    evidence: [],
  };
}
