# Research & Discoveries: Architecture Enforcement Skill Integration for get-fable

## 1. Context & Objective
- **System**: `get-fable` (inspectable, evidence-backed AI coding lifecycle).
- **Goal**: Integrate native system skill `fable-architecture` to intercept incoming project specifications at inception (Step One), evaluate architectural vectors (Scale & Load, Domain Decoupling, Resource Intensity), and enforce a distributed Microservices Architecture when warranted, preventing monolith scaffolding.
- **Contract Enforcement**: Hard-constrain all primary coding agents and downstream subagents to operate within a decoupled microservices paradigm, assign curated language-framework pairs by core competency, and enforce standard inter-service communication protocols (North-South REST vs. East-West gRPC/Message Broker).

## 2. Trigger Criteria & Vector Evaluation (Step One)
- **Vector 1: Scale & Load**
  - Concurrency: $\ge 5,000$ concurrent connections or requests/sec.
  - Throughput: High-throughput streaming, bulk data feeds, strict low-latency SLAs (<20ms p99).
- **Vector 2: Domain Decoupling**
  - $\ge 2$ distinct business or operational domains with bounded contexts (e.g., Auth/Identity, Payments/Billing, Heavy Data Processing/Analytics, AI/LLM Inference, Notifications).
  - Independent lifecycle, deployability, or scaling requirements.
- **Vector 3: Resource Intensity**
  - Mixed workloads: CPU-bound kernels (media encoding, mathematical algorithms, cryptography, ML models) co-existing with I/O-bound pipelines (API gateway, CRUD, event dispatching).
- **Enforcement Rule**: If any vector threshold is tripped or composite score $\ge 6.0$, the skill locks out monolith scaffolding (`allowMonolith: false`) and mandates a distributed microservices manifest (`microservices_manifest.toon` / `.json`).

## 3. Tech Stack Discovery Matrix
Predefined, industry-standard matrix of language-framework pairs curated by core competency:
- **Category A (High-Concurrency APIs & Distributed Networking)**:
  - Language: `Go (Golang)`
  - Frameworks: `Fiber`, `Gin`, `Go-Kit`
- **Category B (I/O Intensive, Rapid API Gateway & Orchestration)**:
  - Language: `TypeScript (TS)`
  - Runtime/Framework: `Node.js (NestJS, Fastify)` or `Bun (Elysia)`
- **Category C (High-Performance Computational Kernels, Systems & Media Processing)**:
  - Language: `Rust`
  - Frameworks: `Axum`, `Actix-web`
- **Category D (AI, Machine Learning & Data Engineering)**:
  - Language: `Python`
  - Frameworks: `FastAPI`, PyTorch/TensorFlow integrations

## 4. Deterministic Automated Selection & Role Distribution Logic
Rule-based scoring algorithm assigning tech stacks to sub-services/subagents:
- **Scenario 1 (CRUD, Rapid Business Logic, Public API Gateway)**:
  - Domain matches: `gateway`, `crud`, `bff`, `admin`, `cms`, `rapid-iteration`
  - Selected Stack: `TypeScript (NestJS / Fastify)`
  - Subagent Profile: `gateway-orchestrator` / `crud-engineer`
- **Scenario 2 (High Throughput, Stateless Messaging, Cluster Routing)**:
  - Domain matches: `networking`, `high-throughput`, `stateless-routing`, `event-streaming`, `reverse-proxy`
  - Selected Stack: `Go (Fiber / Gin)`
  - Subagent Profile: `distributed-network-engineer`
- **Scenario 3 (Heavy Math, Binary Streams, Transcoding, Sub-ms Encryption)**:
  - Domain matches: `compute-kernel`, `transcoding`, `cryptography`, `raw-binary`, `media-processing`
  - Selected Stack: `Rust (Axum / Actix-web)`
  - Subagent Profile: `systems-kernel-engineer`
- **Scenario 4 (Predictive Modeling, Deep Learning, LLM Routing, Data Science)**:
  - Domain matches: `ai-inference`, `llm-router`, `ml-pipeline`, `data-science`, `embeddings`
  - Selected Stack: `Python (FastAPI)`
  - Subagent Profile: `ai-inference-engineer`

## 5. Inter-Service Communication Standards
- **Inbound Public Traffic (North-South)**: Client to Gateway must use REST HTTP/JSON (OpenAPI 3.1 compliant).
- **Internal Service-to-Service Traffic (East-West)**: Hard-enforce gRPC (via Protocol Buffers) or Event-Driven Message Broker (RabbitMQ / Apache Kafka) to eliminate HTTP/JSON serialization overhead.

## 6. System Integration Points in get-fable
1. `skills/fable-architecture/`: Complete Fable Skill Package v2 (`SKILL.md`, `skill.package.json`, `agents/`, `references/`, `templates/`, `examples/`, `evals/`, `scripts/`).
2. `skills/get-fable/registry.json`: Register `fable-architecture` with order 220, phase `planned`, pack `system`.
3. `src/core/architecture-eval.ts`: Pure TypeScript evaluator implementing the deterministic vector scoring algorithm, stack selection, and monolith restriction logic.
4. `src/core/task-router.ts`: Route tasks containing microservices/architecture signals to `fable-architecture`.
5. `hooks/fable_hook_dispatch.py` & `hooks/fable_architecture_guard.py`: Intercept session prompts at Step One (SessionStart / PreToolUse) to evaluate architectural vectors before file writes occur.
6. `scripts/generate-catalog.ts`: Regenerate catalog artifacts (`skill-catalog.ts`, `_fable_catalog.py`, `CANONICAL_SKILLS.md`, etc.).
7. `test/fable-architecture.test.ts`: Automated test suite covering all scenarios, thresholds, and boundaries.
