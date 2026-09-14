# ADR 0007: Transport Boundaries — REST for North-South and gRPC for East-West

**Status:** Accepted  
**Date:** 2026-09-14  
**Related:** ADR 0001 (Portable Process Controls), ADR 0003 (Provider Boundary), Capability & Worker Model

---

## 1. Context

`get-fable` operates in multiple communication contexts:
1. **Developer Ecosystem & Host Tools**: Developers interact via IDE extensions (Cursor, Claude Code, Codex, Antigravity, OpenCode), and local proxies forwarding LLM requests.
2. **Web Dashboard & Host Plugins**: DeepSeek Harness (DSH) and Cordis web UI render real-time discipline dashboards in browser environments.
3. **Agency Mesh & Worker Execution**: The orchestrator delegates bounded tasks to distributed subagents, specialized workers, redteam engines, and remote verification runners.
4. **Local Lifecycle**: Process controls, locks, ledger tracking, and state transitions.

Using a single transport protocol across all contexts leads to significant architectural friction:
- Forcing gRPC onto the Request Proxy breaks OpenAI API compatibility and requires proxy intermediaries (Envoy, grpc-web) for IDEs and browser dashboards.
- Using REST for internal worker and agent orchestration introduces JSON parsing overhead, loose typing, lack of native bi-directional streaming for live tool execution deltas, and inefficient connection polling.

---

## 2. Decision

`get-fable` adopts a **Hybrid Dual-Transport Architecture** with normative boundaries:

```text
[ IDE / Agent Host / External Clients ]
              |
              | (REST / HTTP JSON + SSE)  <-- North-South
              v
     +-------------------+
     |   Request Proxy   | (src/router/)
     |    DSH Plugin     | (src/dsh/)
     +-------------------+
              |
              | Local In-Process / Provider ABI
              v
     +-------------------+
     |   get-fable Core  | (src/core/state.ts)
     | Agency Orchestrator
     +-------------------+
              |
              | (gRPC / HTTP/2 + Protobuf)  <-- East-West
              v
     +-------------------+
     |   Worker Daemon   | (src/rpc/)
     |  Remote Providers | (ExecuteTask, ExecuteSkill, stream TaskEvents)
     +-------------------+
```

### Boundary Specifications:

1. **North-South (External Facing) — REST / HTTP:**
   - **Request Proxy** (`src/router/`): Implements OpenAI-compatible `POST /v1/chat/completions`, with optional SSE streaming and JSON payload parsing.
   - **DSH Web UI** (`src/dsh/`): Implements REST endpoints (`/api/fable/status`, `/api/fable/plan`, `/api/fable/skills`, `/api/fable/doctor`) served via Cordis webServer for browser clients.

2. **East-West (Internal Mesh) — gRPC / HTTP/2 + Protobuf:**
   - **Worker Service** (`proto/fable_worker.proto` & `src/rpc/`): Strongly-typed Protobuf contracts for:
     - `ExecuteTask`: Server-streaming execution logs, real-time tool calls, and state progress.
     - `ExecuteSkill`: Remote execution of `SkillBehaviorProvider`.
     - `GetWorkerHealth`: Liveness and readiness probes.
     - `CancelTask`: Deterministic task cancellation.
   - Used between the orchestrator and background worker daemons, containerized subagents, and remote provider nodes.

3. **Local Lifecycle — In-Process Filesystem IPC:**
   - Core lifecycle (`.fable/state.json`, `.fable/LEDGER.md`) remains local-first, zero-network, utilizing atomic filesystem transactions and file locking.

---

## 3. Decision Drivers

- **Maximum Tool Compatibility**: The global AI agent ecosystem (Claude Code, Codex, OpenAI clients) expects REST HTTP endpoints.
- **Bi-Directional Event Streaming**: Worker execution requires streaming log lines, tool-call deltas, and state transitions without polling.
- **Strict IDL Contracts**: Protobuf prevents runtime contract mismatches across polyglot worker environments (TypeScript/Bun, Python, Go, Rust).
- **Transport Efficiency**: HTTP/2 multiplexing and binary Protobuf encoding reduce CPU and network overhead for worker execution pools.

---

## 4. Consequences

### Positive:
- Clean separation of concerns: external simplicity vs internal performance.
- Zero breakage for existing workflows, CLI commands, and host hooks.
- Extensible foundation for distributed multi-agent swarms.
- Standardized gRPC worker daemon (`get-fable worker-serve`).

### Negative:
- Adds `@grpc/grpc-js` and `@grpc/proto-loader` dependencies.
- Requires maintaining `.proto` schema definitions alongside TypeScript interfaces.

---

## 5. Verification

- `test/router.test.ts` validates that the REST Request Proxy remains fully functional.
- `test/worker-rpc.test.ts` validates the gRPC Worker Server and Client streaming lifecycle.
- `bun run typecheck && bun test && bun run build` pass without error.
