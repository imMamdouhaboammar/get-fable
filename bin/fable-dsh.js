#!/usr/bin/env bun
import { exec } from 'node:child_process';
import { startFableDshServer } from '../src/dsh/standalone.js';
import { createFableApiHandler } from '../src/dsh/api.js';

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
fable-dsh — Standalone DeepSeek Harness & Fable Distribution Runner

USAGE:
  fable-dsh [options]
  fable-dsh <command> [args...]

COMMANDS:
  serve              Start the standalone Fable-DSH server and GUI (default)
  status             Print current lifecycle & governance status
  doctor             Run Fable self-healing doctor checks
  route <task>       Evaluate and route a coding task across 42 skills

OPTIONS:
  -p, --port <num>   Port to listen on (default: 4318, or env PORT)
  --host <host>      Hostname to bind (default: 127.0.0.1)
  --open             Automatically open the Web GUI in the default browser
  --no-open          Do not open the browser (default)
  -h, --help         Show this help message

EXAMPLES:
  fable-dsh --open
  fable-dsh route "implement auth token validation with unit tests"
  fable-dsh --port 5000
`);
}

if (args.includes('-h') || args.includes('--help')) {
  printHelp();
  process.exit(0);
}

const command = args[0] && !args[0].startsWith('-') ? args[0] : 'serve';

if (command === 'status') {
  const handler = createFableApiHandler(process.cwd());
  const status = handler.getStatus();
  console.log('\n--- Fable-DSH Runtime Status ---');
  console.log(`Phase:                 ${status.phase}`);
  console.log(`Active Card:           ${status.activeCard || 'none'}`);
  console.log(`Failure Streak:        ${status.failureStreak} / ${status.recoveryThreshold}`);
  console.log(`Unverified Mutations:  ${status.unverifiedMutations}`);
  console.log(`Doctor Healthy:        ${status.doctorHealthy ? 'YES' : 'NO'}`);
  console.log(`Plan Exists:           ${status.planning.hasPlan ? 'YES' : 'NO'}\n`);
  process.exit(0);
}

if (command === 'doctor') {
  const handler = createFableApiHandler(process.cwd());
  const fix = args.includes('--fix');
  const report = handler.postDoctor(fix);
  console.log(`\n--- Fable-DSH Doctor (Status: ${report.ok ? 'OK' : 'ISSUES DETECTED'}) ---`);
  for (const c of report.checks) {
    const sym = c.status === 'PASS' ? '✔' : c.status === 'WARN' ? '⚠' : '✖';
    console.log(`${sym} [${c.id}] ${c.message}`);
  }
  console.log('');
  process.exit(report.ok ? 0 : 1);
}

if (command === 'route') {
  const task = args.slice(1).filter((a) => !a.startsWith('-')).join(' ').trim();
  if (!task) {
    console.error('Error: task description is required for route command.');
    process.exit(1);
  }
  const handler = createFableApiHandler(process.cwd());
  const apply = args.includes('--apply');
  const res = apply ? handler.postRouteAndApply(task) : handler.postRoute(task);
  console.log(`\n--- Fable-DSH Routing Decision ---`);
  console.log(`Selected Skill:  ${res.decision.selectedSkill}`);
  console.log(`Selected Pack:   ${res.decision.selectedPack}`);
  console.log(`Confidence:      ${Math.round(res.decision.confidence * 100)}%`);
  console.log(`Applied:         ${res.applied ? 'YES' : 'NO'}`);
  console.log(`Reasons:`);
  for (const r of res.decision.reasons) {
    console.log(`  - ${r}`);
  }
  console.log('');
  process.exit(0);
}

// Default: 'serve'
let port = 4318;
const portIdx = args.findIndex((a) => a === '-p' || a === '--port');
if (portIdx !== -1 && args[portIdx + 1]) {
  port = parseInt(args[portIdx + 1], 10);
} else if (process.env.PORT) {
  port = parseInt(process.env.PORT, 10);
}

let hostname = '127.0.0.1';
const hostIdx = args.findIndex((a) => a === '--host');
if (hostIdx !== -1 && args[hostIdx + 1]) {
  hostname = args[hostIdx + 1];
}

const shouldOpen = args.includes('--open');

const server = startFableDshServer({
  port,
  hostname,
  projectRoot: process.cwd(),
});

const url = `http://${hostname}:${port}`;

console.log(`
┌─────────────────────────────────────────────────────────────┐
│  Fable-DSH Autonomous Agent Distribution Active             │
│  Core Engine: DeepSeek Harness + Cordis + Fable Lifecycle   │
│                                                             │
│  ➜ Web GUI Dashboard: ${url.padEnd(29)} │
│  ➜ API Endpoints:     ${(url + '/api/status').padEnd(29)} │
│                                                             │
│  Press Ctrl+C to terminate the daemon                       │
└─────────────────────────────────────────────────────────────┘
`);

if (shouldOpen) {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${opener} ${url}`);
}
