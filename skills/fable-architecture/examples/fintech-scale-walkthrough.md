# Walkthrough: High-Concurrency Fintech Platform Architecture

This walkthrough demonstrates how `fable-architecture` intercepts and evaluates a high-concurrency payment and trading specification.

---

## 1. Input Specification
> "Build a real-time crypto and fiat payment platform supporting 25,000 concurrent traders, sub-10ms matching latency, Stripe and banking rail integrations, JWT/OAuth identity management, and real-time ledger balance updates."

---

## 2. Inception Vector Scoring
- **Vector 1: Scale & Load**:
  - Detected: `25,000 concurrent traders` ($S_{\text{concurrency}} = 8.5$), `sub-10ms matching latency` ($S_{\text{latency}} = 2.5$).
  - Score: **9.5 / 10.0** (Tripped $\ge 7.0$ threshold).
- **Vector 2: Domain Decoupling**:
  - Detected Domains:
    1. `auth`: JWT/OAuth identity management.
    2. `billing`: Stripe and banking rail integrations.
    3. `compute`: Sub-10ms order matching engine.
    4. `gateway`: Public REST ingress for web and mobile clients.
  - Score: **9.0 / 10.0** (4 distinct domains detected).
- **Vector 3: Resource Intensity**:
  - Mixed Workload: CPU-bound order matching & crypto signing alongside I/O-bound banking API webhooks.
  - Score: **8.5 / 10.0**.
- **Composite Score**:
  $$C_{\text{arch}} = (9.5 \times 0.35) + (9.0 \times 0.40) + (8.5 \times 0.25) = 3.325 + 3.6 + 2.125 = \mathbf{9.05}$$

---

## 3. Verdict & Lockout Action
- **Verdict**: `microservices`
- **allowMonolith**: `false`
- **Enforcement Action**: Single-repo monolithic structure is blocked.

---

## 4. Decomposed Services & Stack Assignments
1. **API Gateway** (`services/api-gateway/`):
   - **Stack**: TypeScript (`NestJS` on Bun)
   - **Role**: `gateway-orchestrator`
   - **Protocol**: Exposes North-South REST HTTP/JSON (Port 8080); translates to gRPC for backend services.
2. **Order Matching Engine** (`services/matching-kernel/`):
   - **Stack**: Rust (`Axum` + `Tonic`)
   - **Role**: `systems-kernel-engineer`
   - **Protocol**: Internal East-West gRPC (Port 50053), sub-millisecond memory execution.
3. **Identity & Auth Service** (`services/auth-service/`):
   - **Stack**: Go (`Fiber` + `gRPC-Go`)
   - **Role**: `distributed-network-engineer`
   - **Protocol**: East-West gRPC (Port 50052), token validation.
4. **Banking Rails & Billing Service** (`services/billing-service/`):
   - **Stack**: TypeScript (`NestJS` + `TypeORM`)
   - **Role**: `crud-engineer`
   - **Protocol**: Webhook ingress via gateway, Kafka event emission on ledger settlement.
