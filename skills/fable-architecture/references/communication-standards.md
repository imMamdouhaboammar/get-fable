# Inter-Service Communication Standards

This document specifies the dual-transport networking standards enforced by `fable-architecture` across all distributed microservices.

---

## 1. Architectural Transport Boundary Overview

Aligned with **ADR 0007**, `get-fable` microservices enforce strict protocol segregation:

```text
[ External Clients / Web Browsers / Mobile Apps ]
                      |
                      | (North-South Traffic: REST HTTP/JSON)
                      v
             +------------------+
             |   API Gateway    |
             +------------------+
               |              |
     (Synchronous RPC)   (Asynchronous Events)
               |              |
               v              v
     [ gRPC (HTTP/2 + PB) ]  [ Message Broker (Kafka/RabbitMQ) ]
               |              |
        +------+-------+------+
        |              |
        v              v
+---------------+  +---------------+
| Service A     |  | Service B     |
+---------------+  +---------------+
```

---

## 2. North-South Standards (Inbound Public Traffic)

All external traffic originating from clients, third-party webhooks, or frontends must terminate at the **API Gateway**:

- **Transport**: `HTTP/1.1` and `HTTP/2` over `TLS 1.3`.
- **Data Serialization**: `JSON` adhering to strict **OpenAPI 3.1** schemas.
- **Security Boundary**:
  - Ingress rate-limiting per client IP / API key.
  - JWT / OAuth2 validation at Gateway boundary.
  - CORS header enforcement.
  - Request body size limits (default 1MB, 100MB for media upload endpoints).
- **Prohibition**: External clients are forbidden from directly addressing internal service ports.

---

## 3. East-West Standards (Internal Mesh Traffic)

Communication between internal services behind the API Gateway is divided into two authorized channels:

### A. Synchronous East-West: gRPC over HTTP/2 + Protocol Buffers

Whenever one service requires a direct, synchronous request/response or streaming from another service:
- **Transport**: `HTTP/2` multiplexed connections with persistent keepalive.
- **Data Serialization**: Binary Protocol Buffers (`proto3`).
- **Hard-Constraint**: **Raw HTTP/JSON between internal microservices is prohibited.**
- **Benefits**:
  - Up to $7\times$ lower serialization/deserialization CPU overhead compared to JSON.
  - Compile-time generated type bindings across polyglot languages (Go, TypeScript, Rust, Python).
  - Native bi-directional streaming for live progress, logs, and delta transfers.
  - Strong semantic schema definitions versioned in `proto/`.

#### Standard gRPC Error Codes
- `INVALID_ARGUMENT (3)`: Malformed client parameters.
- `NOT_FOUND (5)`: Requested entity missing.
- `ALREADY_EXISTS (6)`: Conflict on resource creation.
- `UNAUTHENTICATED (16)`: Missing or expired inter-service mTLS certificate or JWT token.
- `DEADLINE_EXCEEDED (4)`: Timeout on internal call (default 3000ms SLA).

### B. Asynchronous East-West: Event-Driven Message Brokers

Whenever a service emits an event that multiple downstream services need to consume without coupling:
- **Brokers**: `Apache Kafka` (for high-volume event logs) or `RabbitMQ` (for routing exchanges and dead-letter queues).
- **Pattern**: Publish/Subscribe with transactional outbox pattern to guarantee at-least-once delivery.
- **Message Payload**: CloudEvents v1.0 JSON or Protobuf.

---

## 4. Directory & Schema Discipline

Microservices repositories must maintain schemas in a centralized top-level directory:
```text
proto/
  ├── auth/v1/auth.proto
  ├── billing/v1/billing.proto
  ├── compute/v1/compute.proto
  └── ai/v1/inference.proto
```
Each service imports and compiles these schemas into native language code during the build step.
