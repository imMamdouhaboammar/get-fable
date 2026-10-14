# Architecture Vector Scoring Specification

This document details the mathematical models, heuristic indicators, and threshold boundaries used by `fable-architecture` to evaluate incoming project specifications at inception (Step One).

---

## 1. Vector 1: Scale & Load ($V_{\text{scale}}$)

The Scale & Load vector measures the operational stress, expected concurrent user load, request volume, and latency sensitivity of the project.

### Scoring Model
$$V_{\text{scale}} = \min(10.0, \max(0.0, S_{\text{concurrency}} + S_{\text{throughput}} + S_{\text{latency}} + S_{\text{keyword}}))$$

### Quantitative Thresholds
- **High Concurrency Threshold**: $\ge 5,000$ concurrent connections, users, or active WebSocket sessions $\implies S_{\text{concurrency}} = 8.5$.
- **Extreme Concurrency Threshold**: $\ge 50,000$ concurrent connections $\implies S_{\text{concurrency}} = 10.0$.
- **High Throughput**: $\ge 10,000$ requests/sec or $\ge 1,000,000$ daily events $\implies S_{\text{throughput}} = 3.0$.
- **Low-Latency SLA**: Strict p99 latency target $< 20\text{ms}$ or $< 50\text{ms} \implies S_{\text{latency}} = 2.5$.
- **Horizontal Scaling Keywords**: Mentions of "stateless cluster", "horizontal scaling", "traffic spikes" $\implies S_{\text{keyword}} = 2.5$.

### Threshold Trigger
Any specification yielding $V_{\text{scale}} \ge 7.0$ immediately trips the microservices requirement, regardless of other vectors.

---

## 2. Vector 2: Domain Decoupling ($V_{\text{domain}}$)

The Domain Decoupling vector measures the semantic separation and bounded contexts present in the specification.

### Bounded Context Directory
The evaluation engine recognizes the following standard operational domains:
1. `gateway`: Public ingress, reverse proxy, BFF, auth translation.
2. `auth`: Identity provider, OAuth2/OIDC, session management, RBAC/ABAC.
3. `billing`: Stripe/PayPal integration, invoicing, credit card handling, subscriptions.
4. `compute`: Heavy numerical processing, transcoding, binary streams, cryptography.
5. `ai`: Neural networks, LLM routing, embeddings generation, vector search.
6. `messaging`: Kafka, RabbitMQ, event pub/sub, websocket streaming.
7. `analytics`: Event aggregation, telemetry, business intelligence, OLAP.
8. `notifications`: Email, SMS, push notifications, webhooks dispatch.
9. `crud`: Core domain entities, catalogs, orders, inventory.

### Scoring Table
| Distinct Domains Detected | $V_{\text{domain}}$ Score | Implication |
|---|---|---|
| $\ge 4$ domains | **9.0** | Complex enterprise distributed system mandatory |
| 3 domains | **8.0** | Clear microservices decomposition required |
| 2 domains | **7.0** | Threshold tripped: independent service separation required |
| 1 domain | **3.5** | Moderate domain; modular monolith or microservice candidate |
| 0 domains (utility/script) | **1.0** | Monolith candidate |

---

## 3. Vector 3: Resource Intensity ($V_{\text{resource}}$)

The Resource Intensity vector detects workload heterogeneity — specifically the friction between CPU-bound compute tasks and I/O-bound network/database pipelines.

### Workload Classes
- **CPU-Bound**: Video encoding/transcoding, image manipulation, raw binary parsing, cryptographic operations, matrix multiplication, deep learning inference, data compression.
- **I/O-Bound**: REST API routing, GraphQL queries, database CRUD, cache lookups, webhook triggers, session lookups.

### Scoring Logic
- **Mixed Workload (CPU + I/O)**: When both CPU-bound and I/O-bound patterns are detected in the same project specification:
  $$V_{\text{resource}} = 8.5$$
  *Rationale*: Running CPU-heavy workloads inside an I/O event-loop (e.g. Node.js or single Python process) blocks network requests, causes catastrophic head-of-line blocking, and violates response SLAs.
- **Pure CPU-Bound**: $V_{\text{resource}} = 5.5$
- **Pure I/O-Bound**: $V_{\text{resource}} = 3.0$
- **Uniform/Light**: $V_{\text{resource}} = 1.0$

---

## 4. Composite Scoring & Hard-Lockout Decision

The composite architecture index is calculated as a weighted average:
$$C_{\text{arch}} = (V_{\text{scale}} \times 0.35) + (V_{\text{domain}} \times 0.40) + (V_{\text{resource}} \times 0.25)$$

### Enforcement Decision Rules
```
IF (V_scale >= 7.0 OR V_domain >= 7.0 OR V_resource >= 7.0 OR C_arch >= 6.0):
    verdict = 'microservices'
    allowMonolith = false   <-- LOCKOUT ACTIVATED
ELSE:
    verdict = 'monolith'
    allowMonolith = true
```
