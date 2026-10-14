# Compatibility contract

## Runtime

The published package is deliberately Bun-first. `package.json` declares `bun >=1.3.0`, the public entry point is TypeScript, and the build target is Bun. Node.js compatibility is not part of the public runtime contract.

Reference CI covers Linux and macOS. Windows runtime support is **NOT CHECKED** and is not claimed. Path handling includes Windows-form adversarial tests because package security must reject unsafe cross-platform paths even when the reference runtime is not Windows.

## Versioned data contracts

- Durable state: schema v3. Readers migrate v1 and v2 explicitly and reject foreign workspace IDs.
- Skill Package manifest: schema v2. Runtime validation is strict; v1 has an explicit migration helper but is not silently accepted.
- Evaluation result: schema v1.
- Agent behavior request, response, and scored evidence bundles: schema v1.
- CLI machine envelope: additive `--json-v1` schema v1; legacy `--json` output remains unchanged.
- Doctor report: schema v1 with `PASS`, `WARN`, `ERROR`, `NOT_APPLICABLE`, and `NOT_CHECKED` statuses.

## Hosts

Host support levels are defined in `src/core/host-contract.ts` and documented in `hosts/README.md`. `FULL` is not synonymous with identical host APIs. It means the current installer registers the package and lifecycle enforcement capabilities listed in the matrix.
