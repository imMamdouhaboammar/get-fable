# Behavioral Diff Review Checklist & Standards

## Purpose
A rigorous, evidence-grounded review checklist to evaluate git diffs independently from implementation, catching regressions, architectural violations, security risks, and code smells.

## Diff Review Checklist

### 1. Correctness & Behavioral Fidelity
- [ ] Diff directly satisfies the user's requested behavior without introducing unintended side effects.
- [ ] Edge cases, empty states, error conditions, and null/undefined values are handled gracefully.
- [ ] Asynchronous code correctly handles promise rejections and timeouts without swallowing errors.

### 2. Architectural Integrity & Boundaries
- [ ] No violation of package or module encapsulation boundaries.
- [ ] Code follows existing project patterns and naming conventions.
- [ ] No cyclical dependencies or leaky abstractions introduced.

### 3. Security & Data Protection
- [ ] No hardcoded secrets, API keys, passwords, or personal credentials.
- [ ] User input is sanitized and validated before execution or persistence (preventing injection/XSS).
- [ ] Authorization checks are enforced at service and API boundaries.

### 4. Test Coverage & Verifiability
- [ ] Every behavior change is backed by an automated regression test.
- [ ] Tests verify actual behavioral outcomes rather than mocking out the entire system.
- [ ] All existing tests continue to pass.

### 5. Performance & Resource Discipline
- [ ] No unindexed database queries or N+1 query patterns.
- [ ] Memory-intensive buffers, file handles, and child processes are properly closed.
- [ ] Clean algorithmic time and space complexity.
