# The 4-Step Attribution Ladder

When a test or build fails repeatedly, step down the ladder in order:

## Step 1: Harness
- Is the test command targeting the right file?
- Are test fixtures, mock data, or environment variables malformed?
- Are ports or temp directories locked by dangling processes?

## Step 2: Execution Path
- Is the compiled code running, or an old `dist/` or `node_modules` artifact?
- Is the active branch or git worktree clean?
- Are symlinks or module resolutions pointing to a stale build?

## Step 3: Product Logic
- Inspect actual implementation logic only after steps 1 & 2 are ruled out.

## Step 4: Invariant
- Identify the underlying principle that was violated and fix the root class of failure.
