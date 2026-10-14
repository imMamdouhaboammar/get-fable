# Falsification Heuristics & Boundary Testing

## Purpose
Techniques for actively attempting to falsify code implementations, probing edge cases, stress conditions, and boundary values before declaring completion.

## The Falsification Mindset
Verification is not a rubber-stamp pass; it is an active effort to break the implementation. If you cannot find a way to falsify it, you have earned confidence that it works.

## Core Falsification Heuristics
1. **Empty / Null / Undefined Inputs**: Test with empty arrays, null objects, zero numbers, and empty strings.
2. **Boundary Values**: Test at exact boundary limits ($0$, $1$, $N-1$, $N$, $N+1$, `MAX_SAFE_INTEGER`).
3. **Concurrency & Race Conditions**: Test with parallel rapid calls, out-of-order responses, and simulated network delays.
4. **Error & Disconnection Handling**: Test with dropped database connections, invalid JSON payloads, and filesystem permissions errors.
5. **Mutation Freshness Check**: Confirm that tests were executed **after** the latest code edit, not before.
