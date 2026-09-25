import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFableApiHandler } from './api.js';

declare const Bun: any;

export interface StandaloneServerOptions {
  port?: number;
  hostname?: string;
  projectRoot?: string;
  openBrowser?: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function buildHtmlShell(apiBase: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fable DSH - Autonomous Agent Dashboard</title>
  <link rel="icon" type="image/svg+xml" href="/assets/mascot.svg">
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-card: #1e293b;
      --text-main: #f8fafc;
      --text-dim: #94a3b8;
      --accent: #38bdf8;
      --border: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-primary);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      font-size: 1.1rem;
    }
    .badge {
      background: #0284c7;
      color: #fff;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    main {
      flex: 1;
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }
    .status-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .metric {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
    }
    .metric-label {
      font-size: 0.8rem;
      color: var(--text-dim);
      text-transform: uppercase;
    }
    .metric-value {
      font-size: 1.4rem;
      font-weight: 700;
      margin-top: 4px;
      color: var(--accent);
    }
    #fable-root {
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <img src="/assets/mascot.svg" width="32" height="32" alt="Fable">
      <span>Fable DSH Standalone</span>
      <span class="badge">Cordis Core Active</span>
    </div>
    <div id="live-indicator" style="font-size: 0.85rem; color: #4ade80; display: flex; align-items: center; gap: 6px;">
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#4ade80;"></span>
      Connected to Local Daemon
    </div>
  </header>
  <main>
    <div class="status-card">
      <h2 style="font-size: 1.2rem; margin-bottom: 8px;">Runtime Governance & Evidence Health</h2>
      <p style="color: var(--text-dim); font-size: 0.9rem;">
        Integrated DeepSeek Harness (DSH) running Fable canonical lifecycle with 42 specialist skills.
      </p>
      <div class="grid">
        <div class="metric">
          <div class="metric-label">Phase</div>
          <div class="metric-value" id="val-phase">loading...</div>
        </div>
        <div class="metric">
          <div class="metric-label">Active Work Card</div>
          <div class="metric-value" id="val-card" style="font-size: 1rem; font-family: monospace;">-</div>
        </div>
        <div class="metric">
          <div class="metric-label">Mutation vs Verified</div>
          <div class="metric-value" id="val-generations">-</div>
        </div>
        <div class="metric">
          <div class="metric-label">Circuit Breaker (Fail Streak)</div>
          <div class="metric-value" id="val-streak">0 / 2</div>
        </div>
      </div>
    </div>

    <!-- DSH React Client Injection Container -->
    <div id="fable-root"></div>
  </main>

  <script>
    async function refreshStatus() {
      try {
        const res = await fetch('${apiBase}/api/status');
        const data = await res.json();
        document.getElementById('val-phase').innerText = data.phase || 'idle';
        document.getElementById('val-card').innerText = data.activeCard || 'none (ready)';
        document.getElementById('val-generations').innerText = 'Unverified Debt: ' + (data.unverifiedMutations || 0);
        
        const streakEl = document.getElementById('val-streak');
        streakEl.innerText = data.failureStreak + ' / ' + (data.recoveryThreshold || 2);
        if (data.failureStreak >= (data.recoveryThreshold || 2)) {
          streakEl.style.color = '#f87171';
        } else {
          streakEl.style.color = '#38bdf8';
        }
      } catch (err) {
        console.error('Failed to poll status', err);
      }
    }
    refreshStatus();
    setInterval(refreshStatus, 2500);
  </script>
  <script src="/dist/client.js"></script>
</body>
</html>`;
}

export function startFableDshServer(options: StandaloneServerOptions = {}) {
  const port = options.port || Number(process.env.PORT) || 4318;
  const hostname = options.hostname || '127.0.0.1';
  const projectRoot = options.projectRoot || process.cwd();
  const handler = createFableApiHandler(projectRoot);

  const server = Bun.serve({
    port,
    hostname,
    async fetch(req: any) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // Handle CORS for local dev
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      // JSON Helper
      const json = (data: any, status = 200) =>
        new Response(JSON.stringify(data, null, 2), {
          status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });

      // API Routes
      if (pathname === '/fable/api/status' || pathname === '/api/status') {
        return json(handler.getStatus());
      }

      if (pathname === '/fable/api/plan' || pathname === '/api/plan') {
        return json(handler.getPlan());
      }

      if (pathname === '/fable/api/skills' || pathname === '/api/skills') {
        return json(handler.getSkills(repoRoot));
      }

      if (pathname === '/fable/api/doctor' || pathname === '/api/doctor') {
        const fix = url.searchParams.get('fix') === 'true';
        return json(handler.postDoctor(fix));
      }

      if (pathname === '/fable/api/route' || pathname === '/api/route') {
        if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
        try {
          const body: any = await req.json();
          const task = body.task || '';
          if (!task) return json({ error: 'Task text required' }, 400);
          if (body.apply) {
            return json(handler.postRouteAndApply(task));
          }
          return json(handler.postRoute(task));
        } catch (err: any) {
          return json({ error: err.message }, 500);
        }
      }

      // Serve Static Client Asset
      if (pathname === '/dist/client.js') {
        const clientPath = path.join(repoRoot, 'dist/client.js');
        if (fs.existsSync(clientPath)) {
          return new Response(Bun.file(clientPath), {
            headers: { 'Content-Type': 'application/javascript' },
          });
        }
        return new Response('/* dist/client.js not found - run bun run build:client */', {
          headers: { 'Content-Type': 'application/javascript' },
        });
      }

      // Serve Mascot Icon
      if (pathname === '/assets/mascot.svg') {
        const mascotPath = path.join(repoRoot, 'assets/mascot.svg');
        if (fs.existsSync(mascotPath)) {
          return new Response(Bun.file(mascotPath), {
            headers: { 'Content-Type': 'image/svg+xml' },
          });
        }
      }

      // Root GUI Dashboard
      if (pathname === '/' || pathname === '/fable' || pathname === '/index.html') {
        return new Response(buildHtmlShell(''), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  return server;
}
