# Polling State Machines and Backoff

A polling loop should model a changing condition, not merely rerun a command.

## Define states explicitly
For a CI job:

```text
pending: queued | in_progress
success: completed/success
terminal failure: completed/failure | cancelled | timed_out
unknown: malformed/missing state
```

For a deployment, the names differ but the principle is the same. This prevents `not green yet` from being treated as one generic retry state.

## Budget dimensions
Use whichever can bind the real cost:
- wall-clock deadline;
- max iterations;
- API request quota;
- monetary/token cost;
- provider rate limits.

A one-hour loop with 10 requests/second may be technically time-bounded but operationally absurd.

## Backoff choice
### Fixed interval
Good when job publishes state on a predictable cadence and requests are cheap.

### Exponential backoff
Good for transient network/service errors or unknown completion time. Cap it so later checks do not become uselessly sparse.

### Jitter
Useful when many workers could synchronize and hammer a service.

### Provider guidance
Honor `Retry-After` or documented recommended poll intervals instead of overriding them with a faster local cadence.

## Retryability
Usually retryable:
- connection reset/temporary 5xx;
- explicit queued/running state;
- eventual-consistency old value within deadline.

Usually terminal until something changes:
- invalid credentials/403;
- malformed request/schema error;
- job reports failed/cancelled;
- resource not found when the contract says creation already failed.

Classify from the target API/command contract rather than HTTP code alone when semantics differ.

## Idempotency
Separate:
1. start/trigger action;
2. obtain job/resource ID;
3. poll status via read-only/idempotent operation.

If status checking re-submits work, a transient timeout can create duplicate jobs. Use idempotency keys or redesign before looping.

## Progress detection
If state exposes revision, completed steps, percentage, timestamp, or log cursor, record it. Repeated identical `running` may still be healthy for a long job, but lack of progress past the expected SLA should route to diagnosis rather than endless timeout extension.

## Final receipt
A stopped loop should say one of:
- condition satisfied;
- terminal target failure;
- cancelled;
- deadline/iteration/request budget exhausted;
- non-retryable observation error;
- handed off to scheduler/monitoring mechanism.

Never infer success from the fact that your loop process itself exited normally.