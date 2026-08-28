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
