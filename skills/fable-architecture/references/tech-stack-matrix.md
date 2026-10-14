# Tech Stack Discovery Matrix Specification

This document defines the language and framework pairs curated by core competency and provided to agents and subagents by `fable-architecture`.

---

## Matrix Overview

```text
+---------------------------------------------------------------------------------------+
| Category A: Go (Golang)       | Category B: TypeScript (TS)                          |
| Frameworks: Fiber, Gin, Go-Kit| Frameworks: NestJS, Fastify, Elysia                  |
| Competency: High-Concurrency  | Competency: Rapid API Gateway, I/O-Intensive, CRUD   |
+-------------------------------+------------------------------------------------------+
| Category C: Rust              | Category D: Python                                   |
| Frameworks: Axum, Actix-web   | Frameworks: FastAPI, PyTorch, TensorFlow             |
| Competency: Systems, Kernels, | Competency: AI / LLM Routing, Data Science,          |
| Heavy Math, Media Processing  | Deep Learning Models                                 |
+---------------------------------------------------------------------------------------+
```

---

## Category A: High-Concurrency APIs & Distributed Networking

- **Language**: `Go (Golang 1.23+)`
- **Framework Options**:
  1. `Fiber`: Ultra-fast, Express-inspired HTTP framework built on Fasthttp.
  2. `Gin`: High-performance HTTP web framework with Martini-like API.
  3. `Go-Kit`: Enterprise microservices toolkit with RPC, service discovery, and circuit breakers.
- **Core Competencies**:
  - Goroutine concurrency model with low memory footprint (~2KB per goroutine).
  - High-throughput network packet ingestion and stateless message routing.
  - Sub-millisecond garbage collection pauses under high allocation pressure.
  - Native gRPC implementation with generated Go Protocol Buffers.
- **Best Suited For**:
  - Internal RPC routing meshes.
  - Event ingest daemons streaming millions of events/sec.
  - High-throughput identity validation and token issuance.

---

## Category B: I/O Intensive, Rapid API Gateway & Orchestration

- **Language**: `TypeScript (Node.js 22+ or Bun 1.2+)`
- **Framework Options**:
  1. `NestJS`: Modular, enterprise TypeScript framework with built-in dependency injection, microservice transports (gRPC, Redis, Kafka), and OpenAPI swagger generation.
  2. `Fastify`: Low-overhead, highly performant HTTP framework with schema-based JSON serialization.
  3. `Elysia`: Extremely fast framework specifically optimized for the Bun runtime.
- **Core Competencies**:
  - Asynchronous event-loop architecture optimal for non-blocking I/O and network fan-out.
  - Rich ecosystem for schema validation (Zod, TypeBox, class-validator) and OpenAPI 3.1 generation.
  - Rapid iteration on complex business logic and CRUD entity relationships.
  - Native TypeScript types shared across Frontend, BFF, and Gateway.
- **Best Suited For**:
  - Public-facing API Gateways.
  - Backend-For-Frontend (BFF) layers.
  - Rapid business logic iteration and administrative control panels.

---

## Category C: High-Performance Computational Kernels & Systems

- **Language**: `Rust (1.80+)`
- **Framework Options**:
  1. `Axum`: Ergonomic, modular web framework built with Tokio, Tower, and Hyper.
  2. `Actix-web`: Industrial-strength, ultra-high-throughput actor-inspired web framework.
- **Core Competencies**:
  - Zero-cost abstractions and fearless concurrency with compile-time borrow checking.
  - Predictable zero-latency execution with no garbage collector.
  - Zero-copy binary buffer manipulation and direct hardware SIMD / GPU access.
  - Memory-safe cryptographic primitives and low-level networking.
- **Best Suited For**:
  - Video and audio transcoding pipelines.
  - Heavy numerical mathematics, algorithmic trading, and cryptography.
  - Sub-millisecond encryption and decryption pipelines.
  - Raw binary protocol parsing.

---

## Category D: Artificial Intelligence, Data Engineering & ML

- **Language**: `Python (3.12+)`
- **Framework Options**:
  1. `FastAPI`: Modern, fast (high-performance) web framework based on Starlette and Pydantic.
  2. `PyTorch / TensorFlow / vLLM`: Direct deep learning model execution and inference integration.
- **Core Competencies**:
  - Standard ecosystem for Machine Learning, Data Science, and Large Language Models.
  - Seamless integration with HuggingFace, PyTorch tensors, LangChain, and vector stores.
  - Native support for asynchronous streaming endpoints (SSE / WebSockets).
- **Best Suited For**:
  - LLM routing, prompt chaining, and RAG agent pipelines.
  - Real-time deep learning model inference (computer vision, NLP, embeddings).
  - Offline data science workflows, batch feature engineering, and statistical analytics.

---

## Category E: Ultra-High Concurrency, Fault-Tolerant Real-Time Systems

- **Language**: `Elixir (1.17+ on Erlang/OTP 26+)`
- **Framework Options**:
  1. `Phoenix`: High-productivity web framework featuring Phoenix Channels with distributed PubSub.
  2. `LiveView`: Server-rendered real-time interactive UI and live telemetry streaming without client-side JS overhead.
  3. `Bandit / Cowboy`: High-efficiency HTTP/1.1, HTTP/2, and WebSocket servers built natively on BEAM.
- **Core Competencies**:
  - BEAM lightweight actor model (processes cost ~2KB of heap, millions run concurrently with per-process garbage collection).
  - Preemptive scheduling guarantees real-time latency without tail latency spikes.
  - OTP Supervision Trees ("Let It Crash" philosophy) provide world-class fault tolerance and zero-downtime hot code reloading.
  - Native distributed clustering (`Node.connect`, distributed ETS, and Phoenix PubSub) without mandatory external broker dependencies for internal broadcast.
- **Best Suited For**:
  - Managing hundreds of thousands of concurrent persistent WebSocket connections.
  - Real-time chat, collaborative workspaces, live bidding/auctions, and presence tracking.
  - Zero-downtime streaming telemetry and real-time dashboarding.
  - Telecommunication switching and IoT device connection multiplexing.

