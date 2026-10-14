# Loop Control, Exponential Backoff & Circuit Breakers

## Purpose
Guidelines for implementing robust, bounded polling loops, CI monitoring, and asynchronous status tracking with exponential backoff, jitter, and hard circuit breakers.

## Core Loop Control Rules

### 1. Mandatory Bounded Timeouts
Every polling loop must declare a hard maximum duration and maximum iteration count. Infinite or unbounded loops (`while (true)` without timeouts) are strictly prohibited.

### 2. Exponential Backoff with Jitter
To prevent thundering herd problems and API rate limits:
- Base interval: 2 seconds.
- Backoff multiplier: 1.5x to 2.0x per iteration.
- Max interval cap: 30 seconds.
- Add +/- 10% randomized jitter to each sleep interval.

```typescript
function calculateBackoff(iteration: number, baseMs: number = 2000, maxMs: number = 30000): number {
  const raw = Math.min(baseMs * Math.pow(1.5, iteration), maxMs);
  const jitter = raw * (0.9 + Math.random() * 0.2);
  return Math.round(jitter);
}
```

### 3. Circuit Breaker Conditions
Terminate the loop immediately and alert the user if:
- **Terminal Failure State**: The remote job reports a fatal status (e.g. `FAILED`, `CANCELLED`, `ERROR`).
- **HTTP 4xx Client Error**: Authentication or resource not found error.
- **Max Consecutive Transient Errors**: 3 consecutive network timeouts or 5xx server errors.
- **Timeout Exceeded**: Elapsed wall-clock time exceeds the declared budget.
