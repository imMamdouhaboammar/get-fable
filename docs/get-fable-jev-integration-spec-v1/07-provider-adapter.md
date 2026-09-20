# Provider adapter specification

## Provider-neutral contract

```ts
export type ReflexProviderId = 'typesafe-jev';

export interface ReflexAdvice {
  provider: ReflexProviderId;
  model: string;
  requestId?: string;
  selectedSkill: FableSkillId | null;
  probabilities: Partial<Record<FableSkillId, number>>;
  confidence: number | null;
  taskShape?: FableTaskShape;
  signals: Record<string, number>;
  usage?: { inputTokens?: number; outputTokens?: number };
  latencyMs: number;
  stage: 1 | 2;
}

export interface ReflexProviderError {
  kind:
    | 'disabled'
    | 'missing-credential'
    | 'timeout'
    | 'rate-limit'
    | 'authentication'
    | 'network'
    | 'bad-response'
    | 'unsupported-runtime'
    | 'aborted'
    | 'unknown';
  retryable: boolean;
  message: string;
}
```

External SDK response objects must be treated as external data until normalized.

## SDK versus direct HTTP decision gate

The official JavaScript SDK documents Node.js 20+ but does not explicitly promise Bun compatibility.

Before adding a dependency, run a spike on the declared Bun floor and current pinned Bun CI runtime:

- ESM import
- client construction
- `systemOne` live request
- AbortSignal behavior
- timeout behavior
- 429/retry behavior using a local fake server where possible
- package build compatibility
- npm package inspection

If the SDK passes, use the official SDK and pin an exact dependency version in the lockfile.

If it fails, implement the same adapter using Bun/native `fetch` against `POST /v1/systemone`. Keep request/response schemas local and strict.

The choice must be captured in an ADR after the spike.

## Timeouts

Provider timeout must be shorter than the overall route budget.

Bootstrap values:

```text
shadow live timeout: 1500 ms
recommend timeout:   1000 ms
guarded timeout:      800 ms
```

These are initial budgets, not promises. If they are exceeded, deterministic routing wins immediately.

## Retries

Do not perform long retry chains on an interactive routing path.

Suggested:

- 0 retries for timeout/abort
- at most 1 bounded retry for transient 429/5xx if retry-after fits remaining budget
- no retry for auth/permission/bad request

## Credentials

`TYPESAFE_API_KEY` is read only in provider construction. It is never persisted to `.fable`, route logs, config files, or diagnostics.
