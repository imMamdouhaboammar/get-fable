# Subagent Role Distribution & Ownership Model

This document outlines the delegation model used by `fable-architecture` to partition microservice implementations across specialized subagents.

---

## 1. Role Assignment Matrix

Based on Scenarios 1–4, subagent roles are assigned disjoint file tree ownership:

| Subagent Role | Primary Tech Stack | Scenario | Owned Directory | Primary Invariants |
|---|---|---|---|---|
| `gateway-orchestrator` | TypeScript (`NestJS` / `Fastify`) | 1 | `services/api-gateway/` | Expose REST endpoints, enforce rate-limiting, route via gRPC |
| `crud-engineer` | TypeScript (`NestJS` / `TypeORM`) | 1 | `services/<domain>-service/` | Manage business entities, migrations, transactions |
| `distributed-network-engineer` | Go (`Fiber` / `gRPC-Go`) | 2 | `services/network-mesh/` | Stateless routing, $<5\text{ms}$ latency, goroutine pool |
| `systems-kernel-engineer` | Rust (`Axum` / `Tonic`) | 3 | `services/compute-kernel/` | Zero-copy binary manipulation, memory safety, SIMD |
| `ai-inference-engineer` | Python (`FastAPI` / `PyTorch`) | 4 | `services/ai-service/` | Asynchronous model inference, tensor streaming, vector search |
| `realtime-systems-engineer` | Elixir (`Phoenix` / `Cowboy`) | 5 | `services/realtime-service/` | Hundreds of thousands of persistent WebSockets, BEAM supervision |

---

## 2. Disjoint Ownership Rules

To prevent merge conflicts and coordination overhead during multi-agent development:
1. **Zero Shared Files**: Each subagent owns strictly its service directory and service-specific config (`services/<service-name>/*`).
2. **Read-Only Schemas**: Shared `.proto` definitions in `proto/` are authored by `fable-architecture` and treated as immutable contracts by worker subagents.
3. **Dedicated Dockerfile**: Every service maintains an isolated multi-stage `Dockerfile` in its root.
4. **Environment Isolation**: Service environment variables are declared in a local `.env.example` file and orchestrated via the top-level `docker-compose.yml`.

---

## 3. Subagent Delegation Contract Template

When delegating a service implementation, the parent agent issues an explicit delegation contract specifying:
- **Service Name**: e.g., `services/transcoding-service`
- **Tech Stack**: e.g., `Rust (Axum + Tonic)`
- **Port Bindings**: HTTP Ingress (internal) or gRPC port (e.g. `50053`)
- **Proto Schema**: Link to `proto/transcoding/v1/transcoding.proto`
- **Acceptance Gate**: Unit tests pass (`cargo test`) and service boots healthy on container start.
