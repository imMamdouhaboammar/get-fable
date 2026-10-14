# Generated Context Freshness Lesson

## Problem

`public/llms.txt` is generated from repository documentation and is shipped as part of the package, but the pull-request CI quality job checked only the main generated catalog. A documentation change could therefore leave `public/llms.txt` stale while the merge gate stayed green.

## Incorrect assumption

Running the repository-wide `bun run check` locally or during packaging is not enough to protect the merge boundary when pull-request CI executes a different subset of checks.

## Engineering concept

Generated artifacts need freshness checks at the earliest authoritative integration boundary. If an artifact is committed and distributed, CI should deterministically regenerate or compare it before accepting the change that can make it stale.

## What get-fable now does

The quality matrix runs `bun run check:llms` immediately after the existing generated-catalog drift check. The command rebuilds the expected `public/llms.txt` content in memory and fails when the committed file differs.

## Failure case

A contributor changes README or top-level documentation without regenerating `public/llms.txt`. Before this change, the pull-request quality workflow could proceed to typecheck, tests, and build without noticing the stale packaged context.

## Verification

The pull-request CI quality matrix is the executable acceptance gate for this workflow-only change. It must execute the new `Generated llms.txt drift` step successfully on every supported Bun/OS matrix entry.
