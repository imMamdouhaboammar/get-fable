# Discovery Evidence Packet: [Subsystem Name]

## Load-Bearing Questions
1. [Question 1: e.g. Where is dynamic dispatch registered?] -> [Status: Answered / Unresolved]
2. [Question 2: e.g. Which process commits database transactions?] -> [Status: Answered / Unresolved]

## Measured Topology & Entry Points
- **Package Manifest**: `package.json` (version: X, engine: Y)
- **Primary Binary / Entry**: `src/index.ts` -> `src/cli.ts`
- **Build / Runtime Mode**: Direct execution via Bun (no transpilation required)

## Execution Path Trace
```
1. [CLI Request] -> src/cli.ts:runCommand() [measured]
2. [Middleware] -> src/core/auth.ts:validateSession() [measured]
3. [Service Dispatch] -> src/services/worker.ts:dispatch() [measured]
```

## Unresolved Questions & Next Action
- Unresolved: None. All load-bearing facts are established.
- Recommended Next Skill: `fable-plan`
