# DeepSeek Harness (DSH) Plugin Guide for get-fable

`get-fable` is fully compatible with **DeepSeek Harness (DSH)** as an official Cordis plugin bundle and Web UI extension.

## 1. Quick Installation

### Via DSH Plugin CLI
```bash
# Add to current / active profile
dsh plugin add imMamdouhaboammar/get-fable

# Or add to a specific profile (e.g. web or coding)
dsh plugin --profile web add imMamdouhaboammar/get-fable
```

### Local Development / Linking
```bash
cd /path/to/get-fable
bun run build

# Link into DSH profile
dsh plugin --profile web add .
```

## 2. Architecture & Components

### Cordis Backend Bundle
- **Bundle Manifest**: `cordis.patch.yml` inserts the `get-fable` plugin into the active Cordis registry.
- **Service Hooks**: Listens on DSH web server routes under `/api/fable/*` and registers session projection unit `fableDiscipline`.

### REST Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/api/fable/status` | GET | Returns current Fable phase, fail streak, doctor status, and `task_plan.md` progress. |
| `/api/fable/plan` | GET | Returns structured phases from `task_plan.md`, `progress.md`, and attestation SHA. |
| `/api/fable/skills` | GET | Returns registry of 25 canonical Fable skills with categories and metadata. |
| `/api/fable/route` | POST | Executes Fable task router on `{ task: "string" }` and returns selected skill + reasons. |
| `/api/fable/doctor` | POST | Runs diagnostic health checks with optional `{ fix: true }` auto-repair. |

### Consumed Web UI (`dist/client.js`)
- **Sidebar Status Pill**: Live indicator showing active phase and pulsing red warning badge on failure streak $\ge 2$.
- **Fable Hub Dashboard**:
  - 4 Live Metric Tiles: Active Work Card, Planning Phase Progress, Failure Streak, Available Skills.
  - **Manus-Style Plan Tab**: Real-time phase tracking and SHA-256 tamper-proof attestation state.
  - **25 Skills Grid**: Interactive catalog of Fable specialist skills.
  - **Task Router Sandbox**: Interactive prompt testing interface.
  - **One-Click Doctor Diagnostics**: System health and configuration integrity checks.

## 3. Submitting to awesome-dsh-plugin

The submission entry file is located at `data/plugins/imMamdouhaboammar__get-fable.yml`. To publish:
1. Ensure the repository has $\ge 10$ commits and has the `dsh-plugin` GitHub topic.
2. Fork [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin).
3. Submit a PR adding `data/plugins/imMamdouhaboammar__get-fable.yml`.
