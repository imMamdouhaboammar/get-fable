# Fable Learning Walkthrough Example

## Scenario
During a development session, the agent repeatedly failed when executing a database migration script due to missing environment variables in Supabase client initialization. The user corrected the agent, and the agent resolved the issue with strict environment loading.

---

## 1. Transcript Input Step
```json
{"type": "USER_INPUT", "content": "The migration failed with error: SUPABASE_URL is undefined. You need to load .env first with dotenv or pass env vars explicitly."}
{"type": "PLANNER_RESPONSE", "content": "Understood. The root cause was that the migration script executed outside the Next.js runtime without loading environment variables from .env.local. Root cause: dotenv was not preloaded in standalone script execution. Fix: run with bun --env-file=.env.local run db:migrate."}
```

---

## 2. Phase 1 — Extraction
- **Problem**: Migration failed due to missing `SUPABASE_URL` in standalone execution.
- **Failure Type**: `config`
- **Solution**: Preload `.env.local` using `bun --env-file=.env.local run db:migrate`.
- **Root Cause**: Standalone scripts running via Bun do not automatically load `.env.local` unless explicitly specified.

---

## 3. Phase 2 — Knowledge Synthesis

### Rule for agent-kernel:
```bash
agent-kernel remember "When executing standalone database scripts in Bun, always pass --env-file=.env.local to ensure environment variables are present." --type rule --level critical
```

### Chunk for GBrain:
```bash
gbrain remember "Bun standalone scripts do not auto-load .env.local without --env-file flag" \
  --provenance "session:walkthrough-001 date:2026-09-14 topic:database" \
  --entity "learnings/database"
```

### Result:
Future agents encountering migration scripts automatically apply `--env-file=.env.local`, preventing the error entirely.
