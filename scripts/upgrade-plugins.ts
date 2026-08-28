import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');

// 1. Upgrade .claude-plugin/marketplace.json
const claudeMktPath = path.join(root, '.claude-plugin', 'marketplace.json');
if (fs.existsSync(claudeMktPath)) {
  const mkt = JSON.parse(fs.readFileSync(claudeMktPath, 'utf-8'));
  mkt.metadata.description = 'Portable coding lifecycle for AI agents with deterministic routing, durable mutation-aware state, 25 specialist skills across 8 packs, lifecycle hooks, and evidence gates.';
  mkt.plugins[0].description = 'Routes software work through discovery, research, planning, TDD, delegation, execution, verification, review, security, release, handoff, evaluation, and recovery across 25 canonical skills.';
  mkt.plugins[0].keywords = [
    'claude-code',
    'chatgpt',
    'codex',
    'agent-discipline',
    'agent-skills',
    'coding-lifecycle',
    'verification',
    'tdd',
    'spark',
    'skills'
  ];
  fs.writeFileSync(claudeMktPath, JSON.stringify(mkt, null, 2) + '\n', 'utf-8');
  console.log('✔ Upgraded .claude-plugin/marketplace.json');
}

// 2. Upgrade .claude-plugin/plugin.json
const claudePluginPath = path.join(root, '.claude-plugin', 'plugin.json');
if (fs.existsSync(claudePluginPath)) {
  const plug = JSON.parse(fs.readFileSync(claudePluginPath, 'utf-8'));
  plug.description = 'Portable coding lifecycle for AI agents: deterministic routing, research, planning, test-first changes, delegation, verification, review, security, release, handoff, evaluation, and recovery across 25 canonical skills.';
  plug.keywords = [
    'claude-code',
    'chatgpt',
    'codex',
    'agent-discipline',
    'agent-skills',
    'coding-lifecycle',
    'verification',
    'tdd',
    'spark',
    'skills'
  ];
  fs.writeFileSync(claudePluginPath, JSON.stringify(plug, null, 2) + '\n', 'utf-8');
  console.log('✔ Upgraded .claude-plugin/plugin.json');
}

// 3. Upgrade .codex-plugin/plugin.json
const codexPluginPath = path.join(root, '.codex-plugin', 'plugin.json');
if (fs.existsSync(codexPluginPath)) {
  const plug = JSON.parse(fs.readFileSync(codexPluginPath, 'utf-8'));
  plug.description = 'Portable coding lifecycle for AI agents: deterministic routing, research, planning, test-first changes, delegation, verification, review, security, release, handoff, evaluation, and recovery across 25 canonical skills.';
  plug.interface.capabilities = [
    'Route coding work across 25 canonical lifecycle skills in 8 packs',
    'Track mutation-aware verification and evidence freshness',
    'Use specialized TDD, review, security, and recovery specialists',
    'Predict atomic next moves with Fable Spark situational awareness'
  ];
  plug.interface.longDescription = 'Routes software work through 25 focused lifecycle skills across 8 packs, keeps durable mutation-aware state in .fable/state.json, and requires fresh evidence before completion.';
  fs.writeFileSync(codexPluginPath, JSON.stringify(plug, null, 2) + '\n', 'utf-8');
  console.log('✔ Upgraded .codex-plugin/plugin.json');
}

// 4. Upgrade .chatgpt-plugin/ai-plugin.json
const chatgptAiPath = path.join(root, '.chatgpt-plugin', 'ai-plugin.json');
if (fs.existsSync(chatgptAiPath)) {
  const plug = JSON.parse(fs.readFileSync(chatgptAiPath, 'utf-8'));
  plug.description_for_human = 'AI coding lifecycle governance, deterministic routing across 25 specialist skills, and spark situational prediction.';
  plug.description_for_model = 'Lifecycle governance kernel: route tasks across 25 specialist skills in 8 packs, track mutation state, collect typed evidence, and predict atomic next moves with spark.';
  fs.writeFileSync(chatgptAiPath, JSON.stringify(plug, null, 2) + '\n', 'utf-8');
  console.log('✔ Upgraded .chatgpt-plugin/ai-plugin.json');
}

// 5. Upgrade .chatgpt-plugin/marketplace.json
const chatgptMktPath = path.join(root, '.chatgpt-plugin', 'marketplace.json');
if (fs.existsSync(chatgptMktPath)) {
  const mkt = JSON.parse(fs.readFileSync(chatgptMktPath, 'utf-8'));
  mkt.metadata.description = 'ChatGPT Custom Action and Plugin for get-fable coding lifecycle across 25 skills in 8 packs.';
  mkt.plugins[0].description = 'Coding lifecycle governance, deterministic routing, and spark situational awareness plugin for ChatGPT.';
  fs.writeFileSync(chatgptMktPath, JSON.stringify(mkt, null, 2) + '\n', 'utf-8');
  console.log('✔ Upgraded .chatgpt-plugin/marketplace.json');
}

console.log('All plugin manifests upgraded successfully.');
