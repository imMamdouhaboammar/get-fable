export type UpdateChannel = 'stable';

export interface ReleaseMetadata {
  version: string;
  channel: UpdateChannel;
  source: 'npm';
  checkedAt: string;
  publishedAt?: string;
  releaseUrl?: string;
  notesUrl?: string;
  integrity?: string;
}

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (
  input: string,
  init?: {
    signal?: AbortSignal;
    redirect?: RequestRedirect;
    headers?: Record<string, string>;
  }
) => Promise<FetchResponseLike>;

export type InstallationMethod =
  | 'bun-global'
  | 'npm-global'
  | 'homebrew'
  | 'git-checkout'
  | 'unknown';

export interface InstallationInfo {
  method: InstallationMethod;
  executablePath: string;
  repoRoot?: string;
  packageRoot?: string;
  evidence: string[];
}

export interface InstallationDetectionContext {
  executablePath: string;
  repoRoot: string;
  bunGlobalDir?: string;
  npmGlobalDir?: string;
  homebrewPrefix?: string;
  fileExists: (path: string) => boolean;
}
