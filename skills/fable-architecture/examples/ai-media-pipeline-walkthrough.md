# Walkthrough: AI Video Transcoding & Semantic Search Pipeline

This walkthrough demonstrates how `fable-architecture` separates media processing from AI inference pipelines.

---

## 1. Input Specification
> "Develop a multimodal video analysis pipeline where users upload raw MP4 videos. The system must perform H.265 chunked video transcoding, extract audio tracks for Whisper transcription, generate CLIP embeddings for visual search, and provide a web dashboard for video management."

---

## 2. Inception Vector Scoring
- **Vector 1: Scale & Load**:
  - Detected: Chunked stream transcoding, large binary uploads, search queries.
  - Score: **6.0 / 10.0**.
- **Vector 2: Domain Decoupling**:
  - Detected Domains:
    1. `compute`: Video transcoding & audio track extraction.
    2. `ai`: Whisper speech-to-text and CLIP vision embeddings.
    3. `crud`: Video metadata, user dashboard, asset management.
    4. `gateway`: Public upload ingress and dashboard API.
  - Score: **9.0 / 10.0** (4 distinct domains).
- **Vector 3: Resource Intensity**:
  - Mixed Workload: Heavy CPU/GPU video encoding (Rust) and GPU neural network inference (Python) alongside standard web I/O (TypeScript).
  - Score: **8.5 / 10.0**.
- **Verdict**: `microservices` (`allowMonolith: false`).

---

## 3. Polyglot Service Allocation
```text
[ Browser / Mobile Client ]
             |
             | (REST HTTP/JSON)
             v
+-----------------------------+
| services/api-gateway/ (TS)  | <--- Node.js / NestJS (Scenario 1)
+-----------------------------+
             |
             | (East-West gRPC)
             +------------------------------+
             |                              |
             v                              v
+-------------------------------+  +-------------------------------+
| services/transcoding-service/ |  | services/ai-inference/ (Py)   |
| Rust / Axum (Scenario 3)      |  | Python / FastAPI (Scenario 4) |
+-------------------------------+  +-------------------------------+
```

- **Transcoder**: Rust handles memory-efficient chunked video decoding without garbage collection pauses.
- **AI Inference**: Python leverages PyTorch and HuggingFace bindings for Whisper and CLIP inference.
- **API Gateway**: TypeScript serves the frontend dashboard and coordinates long-running async jobs via RabbitMQ event topics.
