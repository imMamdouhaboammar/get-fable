# Stack Discovery & Test Runner Taxonomy

Before authoring, executing, or recommending tests, the agent must inspect the repository topology rather than assuming test commands.

---

## 1. Runtime & Test Framework Detection

| Stack | File Signals | Primary Test Command | Test Path Conventions |
|---|---|---|---|
| **TypeScript / Node / Bun** | `bun.lockb`, `package.json` | `bun test` or `bunx vitest run` or `bun run test` | `**/*.test.ts`, `**/*.spec.ts`, `tests/` |
| **Python** | `pyproject.toml`, `requirements.txt`, `pytest.ini` | `pytest -v` or `uv run pytest` | `tests/test_*.py`, `*_test.py` |
| **Go** | `go.mod`, `go.sum` | `go test -v ./...` | `*_test.go` |
| **Rust** | `Cargo.toml`, `Cargo.lock` | `cargo test` | `tests/*.rs`, `src/**/tests.rs` |
| **PHP / Laravel** | `composer.json`, `phpunit.xml` | `./vendor/bin/pest` or `./vendor/bin/phpunit` | `tests/Feature/`, `tests/Unit/` |
| **.NET / C#** | `*.csproj`, `*.sln` | `dotnet test` | `*Tests/*.cs` |

---

## 2. Boundary Mapping Protocol

Identify external interfaces before writing tests:
1. **Network / HTTP**: Look for `fetch`, `axios`, `httpx`, `requests`, `reqwest`.
2. **Databases**: Look for Prisma, Drizzle, SQLAlchemy, GORM, Diesel, Entity Framework.
3. **Async / Queues**: Look for Celery, BullMQ, Kafka, RabbitMQ, SQS.
4. **Third-Party Services**: Stripe, Resend, SendGrid, OpenAI, S3.

Ensure mocks are established strictly at these boundaries (Rule 2).
