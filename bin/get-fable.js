#!/usr/bin/env bun
// @bun
// src/cli.ts
import fs5 from "fs";
import path5 from "path";

// src/installer.ts
import fs2 from "fs";
import path2 from "path";

// src/utils.ts
import fs from "fs";
import path from "path";
import os from "os";
var colors = {
  reset: "\x1B[0m",
  bright: "\x1B[1m",
  dim: "\x1B[2m",
  cyan: "\x1B[36m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  red: "\x1B[31m",
  magenta: "\x1B[35m",
  blue: "\x1B[34m"
};
function logInfo(msg) {
  console.log(`${colors.cyan}\u2139 ${msg}${colors.reset}`);
}
function logSuccess(msg) {
  console.log(`${colors.green}\u2714 ${msg}${colors.reset}`);
}
function logWarn(msg) {
  console.log(`${colors.yellow}\u26A0 ${msg}${colors.reset}`);
}
function logError(msg) {
  console.log(`${colors.red}\u2716 ${msg}${colors.reset}`);
}
function logHeader(msg) {
  console.log(`
${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}
`);
}
function getClaudeDir() {
  if (process.env.CLAUDE_CONFIG_DIR) {
    return process.env.CLAUDE_CONFIG_DIR;
  }
  return path.join(os.homedir(), ".claude");
}
function getGeminiConfigDir() {
  return path.join(os.homedir(), ".gemini", "config");
}
function getAgentKernelDir() {
  return path.join(os.homedir(), ".agent-kernel");
}
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
function mergeJsonFile(filePath, updater) {
  let existing = {};
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      existing = JSON.parse(raw);
    } catch {
      existing = {};
    }
  }
  const updated = updater(existing);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
}

// src/installer.ts
function getRepoRootDir() {
  const currentFile = new URL(import.meta.url).pathname;
  return path2.resolve(path2.dirname(currentFile), "..");
}
function installGlobalFable() {
  const repoRoot = getRepoRootDir();
  const claudeDir = getClaudeDir();
  const fableSkillDir = path2.join(claudeDir, "skills", "fable-mode");
  logInfo(`Installing Fable Mode skill and hooks to ${fableSkillDir}...`);
  fs2.mkdirSync(fableSkillDir, { recursive: true });
  fs2.copyFileSync(path2.join(repoRoot, "prompts", "fable-mode-skill.md"), path2.join(fableSkillDir, "SKILL.md"));
  const hooksSrc = path2.join(repoRoot, "hooks");
  const hooksDest = path2.join(fableSkillDir, "hooks");
  copyDirSync(hooksSrc, hooksDest);
  const settingsPath = path2.join(claudeDir, "settings.json");
  const pyProfileInject = path2.join(hooksDest, "fable_profile_inject.py");
  const pySpawnGuard = path2.join(hooksDest, "fable_spawn_guard.py");
  const pyFailStreak = path2.join(hooksDest, "fable_fail_streak.py");
  const pyCloseGuard = path2.join(hooksDest, "fable_close_guard.py");
  mergeJsonFile(settingsPath, (existing) => {
    const hooks = existing.hooks || {};
    const createHookObj = (cmd, matcher) => {
      const obj = {
        hooks: [{ type: "command", command: cmd }]
      };
      if (matcher)
        obj.matcher = matcher;
      return obj;
    };
    const isFableHook = (entry, pyName) => {
      if (!entry)
        return false;
      const subHooks = entry.hooks || (Array.isArray(entry) ? entry : [entry]);
      return subHooks.some((h) => typeof h?.command === "string" && h.command.includes(pyName));
    };
    const registerOrUpdate = (event, cmd, pyName, matcher) => {
      let list = hooks[event] || [];
      list = list.filter((item) => !isFableHook(item, pyName));
      list.push(createHookObj(`python3 ${cmd}`, matcher));
      hooks[event] = list;
    };
    registerOrUpdate("SessionStart", pyProfileInject, "fable_profile_inject");
    registerOrUpdate("PreToolUse", pySpawnGuard, "fable_spawn_guard", "Agent|Task|Workflow");
    registerOrUpdate("PostToolUse", pyFailStreak, "fable_fail_streak", "Bash");
    registerOrUpdate("Stop", pyCloseGuard, "fable_close_guard");
    existing.hooks = hooks;
    return existing;
  });
  logSuccess("Claude Code hooks registered in settings.json");
  const claudeMdPath = path2.join(claudeDir, "CLAUDE.md");
  const fableRuleText = fs2.readFileSync(path2.join(repoRoot, "prompts", "fable5-rules.md"), "utf-8");
  let existingClaudeMd = fs2.existsSync(claudeMdPath) ? fs2.readFileSync(claudeMdPath, "utf-8") : "";
  if (!existingClaudeMd.includes("Fable 5 Mythos System Directive")) {
    existingClaudeMd += `

${fableRuleText}`;
    fs2.writeFileSync(claudeMdPath, existingClaudeMd.trim() + `
`, "utf-8");
    logSuccess("Updated ~/.claude/CLAUDE.md with Fable 5 System Prompt");
  }
  installAntigravityGlobal();
  const kernelDir = getAgentKernelDir();
  if (fs2.existsSync(kernelDir)) {
    const kernelRulesDir = path2.join(kernelDir, "rules");
    fs2.mkdirSync(kernelRulesDir, { recursive: true });
    fs2.copyFileSync(path2.join(repoRoot, "prompts", "fable5-rules.md"), path2.join(kernelRulesDir, "fable5-mode.md"));
    logSuccess("Updated Agent Kernel rules");
  }
  logSuccess("Global Fable 5 Mythos System & Fable Mode successfully installed across all platforms!");
}
function installAntigravityGlobal() {
  const repoRoot = getRepoRootDir();
  const geminiConfigDir = getGeminiConfigDir();
  logInfo(`Installing Fable 5 Mythos Suite into Antigravity (${geminiConfigDir})...`);
  fs2.mkdirSync(geminiConfigDir, { recursive: true });
  const rulesDir = path2.join(geminiConfigDir, "rules");
  fs2.mkdirSync(rulesDir, { recursive: true });
  fs2.copyFileSync(path2.join(repoRoot, "prompts", "fable5-rules.md"), path2.join(rulesDir, "fable5-mode.md"));
  logSuccess("Installed Antigravity Rule: fable5-mode.md");
  const pluginDir = path2.join(geminiConfigDir, "plugins", "get-fable");
  fs2.mkdirSync(pluginDir, { recursive: true });
  fs2.copyFileSync(path2.join(repoRoot, "assets", "antigravity", "plugin.json"), path2.join(pluginDir, "plugin.json"));
  const pluginSkillsDir = path2.join(pluginDir, "skills");
  const pluginRulesDir = path2.join(pluginDir, "rules");
  copyDirSync(path2.join(repoRoot, "assets", "skills"), pluginSkillsDir);
  fs2.mkdirSync(pluginRulesDir, { recursive: true });
  fs2.copyFileSync(path2.join(repoRoot, "prompts", "fable5-rules.md"), path2.join(pluginRulesDir, "fable5-mode.md"));
  logSuccess("Installed Antigravity Plugin: get-fable");
  const globalSkillsDir = path2.join(geminiConfigDir, "skills");
  fs2.mkdirSync(path2.join(globalSkillsDir, "fable-mode"), { recursive: true });
  fs2.copyFileSync(path2.join(repoRoot, "prompts", "fable-mode-skill.md"), path2.join(globalSkillsDir, "fable-mode", "SKILL.md"));
  logSuccess("Installed Antigravity Skill: fable-mode");
  const hooksJsonPath = path2.join(geminiConfigDir, "hooks.json");
  const hooksDest = path2.join(claudeDirToHooks(getClaudeDir()), "fable-mode", "hooks");
  if (fs2.existsSync(hooksDest)) {
    mergeJsonFile(hooksJsonPath, (existing) => {
      const hooksList = existing.hooks || [];
      const pyProfileInject = path2.join(hooksDest, "fable_profile_inject.py");
      const pySpawnGuard = path2.join(hooksDest, "fable_spawn_guard.py");
      const pyFailStreak = path2.join(hooksDest, "fable_fail_streak.py");
      const pyCloseGuard = path2.join(hooksDest, "fable_close_guard.py");
      const fableHooks = [
        { name: "fable5-profile-inject", events: ["SessionStart"], command: `python3 ${pyProfileInject}` },
        { name: "fable5-spawn-guard", events: ["PreToolUse"], command: `python3 ${pySpawnGuard}` },
        { name: "fable5-fail-streak", events: ["PostToolUse"], command: `python3 ${pyFailStreak}` },
        { name: "fable5-close-guard", events: ["Stop", "SessionEnd"], command: `python3 ${pyCloseGuard}` }
      ];
      for (const fHook of fableHooks) {
        const idx = hooksList.findIndex((h) => h.name === fHook.name);
        if (idx >= 0) {
          hooksList[idx] = fHook;
        } else {
          hooksList.push(fHook);
        }
      }
      existing.hooks = hooksList;
      return existing;
    });
    logSuccess("Registered Antigravity Hooks in ~/.gemini/config/hooks.json");
  }
}
function claudeDirToHooks(claudeDir) {
  return path2.join(claudeDir, "skills");
}
function initProjectFable(targetDir = process.cwd()) {
  const repoRoot = getRepoRootDir();
  const fableDir = path2.join(targetDir, ".fable");
  const docsDir = path2.join(targetDir, "docs");
  const agentsDir = path2.join(targetDir, ".agents");
  fs2.mkdirSync(fableDir, { recursive: true });
  fs2.mkdirSync(docsDir, { recursive: true });
  fs2.mkdirSync(path2.join(agentsDir, "skills", "fable-mode"), { recursive: true });
  fs2.mkdirSync(path2.join(agentsDir, "rules"), { recursive: true });
  const templatesDir = path2.join(repoRoot, "templates");
  const filesToCopy = [
    { src: "LEDGER.template.md", dest: path2.join(fableDir, "LEDGER.md") },
    { src: "PROGRESS.template.md", dest: path2.join(fableDir, "PROGRESS.md") },
    { src: "VERIFIER_PROMPT.md", dest: path2.join(fableDir, "VERIFIER_PROMPT.md") },
    { src: "SPEC.template.md", dest: path2.join(docsDir, "SPEC.md") }
  ];
  for (const item of filesToCopy) {
    if (!fs2.existsSync(item.dest)) {
      fs2.copyFileSync(path2.join(templatesDir, item.src), item.dest);
      logSuccess(`Created ${path2.relative(targetDir, item.dest)}`);
    } else {
      logWarn(`Skipped existing file ${path2.relative(targetDir, item.dest)}`);
    }
  }
  fs2.copyFileSync(path2.join(repoRoot, "prompts", "fable-mode-skill.md"), path2.join(agentsDir, "skills", "fable-mode", "SKILL.md"));
  fs2.copyFileSync(path2.join(repoRoot, "prompts", "fable5-rules.md"), path2.join(agentsDir, "rules", "fable5-mode.md"));
  logSuccess(`Installed Antigravity workspace rules & skills in .agents/`);
  logSuccess(`Project initialized with Fable 5 discipline at ${targetDir}`);
}
function checkFableStatus() {
  const claudeDir = getClaudeDir();
  const fableSkillDir = path2.join(claudeDir, "skills", "fable-mode");
  const settingsPath = path2.join(claudeDir, "settings.json");
  logInfo("--- Fable 5 System Status ---");
  console.log(`Claude Config Dir: ${claudeDir}`);
  console.log(`Skill Installed: ${fs2.existsSync(fableSkillDir) ? "YES" : "NO"}`);
  let registeredHooksCount = 0;
  if (fs2.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs2.readFileSync(settingsPath, "utf-8"));
      const hooks = settings.hooks || {};
      for (const event of ["SessionStart", "PreToolUse", "PostToolUse", "Stop"]) {
        const list = hooks[event] || [];
        const found = list.some((entry) => {
          const subHooks = entry.hooks || (Array.isArray(entry) ? entry : [entry]);
          return subHooks.some((h) => typeof h?.command === "string" && h.command.includes("fable_"));
        });
        if (found)
          registeredHooksCount++;
      }
    } catch {}
  }
  console.log(`Claude Registered Hooks: ${registeredHooksCount} / 4`);
  const geminiConfig = getGeminiConfigDir();
  const geminiRule = path2.join(geminiConfig, "rules", "fable5-mode.md");
  const geminiPlugin = path2.join(geminiConfig, "plugins", "get-fable", "plugin.json");
  console.log(`Antigravity/Gemini Rule Installed: ${fs2.existsSync(geminiRule) ? "YES" : "NO"}`);
  console.log(`Antigravity Plugin Installed: ${fs2.existsSync(geminiPlugin) ? "YES" : "NO"}`);
  const activeProjectFable = fs2.existsSync(path2.join(process.cwd(), ".fable"));
  console.log(`Current Project (.fable active): ${activeProjectFable ? "YES" : "NO"}`);
}

// src/fable-lint.ts
import fs3 from "fs";
import path3 from "path";
function runFableLint(targetDir = process.cwd()) {
  logInfo(`Running Fable lint checks on ${targetDir}...`);
  let hasErrors = false;
  const fableDir = path3.join(targetDir, ".fable");
  const ledgerPath = path3.join(fableDir, "LEDGER.md");
  const specPath = path3.join(targetDir, "docs", "SPEC.md");
  if (!fs3.existsSync(ledgerPath)) {
    logWarn(`No .fable/LEDGER.md found in ${targetDir}`);
  } else {
    const content = fs3.readFileSync(ledgerPath, "utf-8");
    const lines = content.split(`
`);
    let openCards = 0;
    let closedCards = 0;
    let cardsMissingAcceptance = 0;
    let closedMissingEvidence = 0;
    let currentCard = null;
    lines.forEach((line, idx) => {
      const openMatch = line.match(/^\s*-\s*\[\s*\]\s*(.*)/);
      const closedMatch = line.match(/^\s*-\s*\[[xX]\]\s*(.*)/);
      if (openMatch || closedMatch) {
        if (openMatch) {
          openCards++;
          const text = openMatch[1];
          if (!text.toLowerCase().includes("acceptance") && !text.includes("test") && !text.includes("check")) {
            cardsMissingAcceptance++;
            logError(`LEDGER.md L${idx + 1}: Open card missing explicit machine-checkable acceptance test`);
            hasErrors = true;
          }
        } else if (closedMatch) {
          closedCards++;
          currentCard = {
            line: idx + 1,
            text: closedMatch[1],
            isClosed: true,
            hasEvidence: line.includes("-- evidence:")
          };
          if (!currentCard.hasEvidence) {
            closedMissingEvidence++;
            logError(`LEDGER.md L${idx + 1}: Closed card missing '-- evidence:' annotation`);
            hasErrors = true;
          }
        }
      }
    });
    logInfo(`LEDGER.md Summary: ${openCards} open cards, ${closedCards} closed cards.`);
  }
  if (fs3.existsSync(specPath)) {
    const specContent = fs3.readFileSync(specPath, "utf-8");
    const tags = ["[measured]", "[inferred]", "[not-shown]"];
    const hasTags = tags.some((t) => specContent.includes(t));
    if (!hasTags) {
      logWarn(`SPEC.md missing source tags ([measured]/[inferred]/[not-shown]) for claims.`);
    }
  }
  if (!hasErrors) {
    logSuccess("Fable lint passed! All cards and acceptance criteria met.");
  }
  return !hasErrors;
}

// src/router/index.ts
import http from "http";

// src/router/provider-translator.ts
class ProviderTranslator {
  static normalizeRequest(body) {
    if (Array.isArray(body.messages)) {
      return {
        model: body.model || "default-fable-model",
        messages: body.messages.map((m) => ({
          role: m.role || "user",
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          name: m.name
        })),
        temperature: body.temperature,
        max_tokens: body.max_tokens || body.max_completion_tokens,
        stream: body.stream || false
      };
    }
    if (Array.isArray(body.contents)) {
      const messages = [];
      if (body.systemInstruction) {
        messages.push({
          role: "system",
          content: typeof body.systemInstruction === "string" ? body.systemInstruction : JSON.stringify(body.systemInstruction)
        });
      }
      for (const item of body.contents) {
        const role = item.role === "model" ? "assistant" : "user";
        const partsText = (item.parts || []).map((p) => p.text || "").join(`
`);
        messages.push({ role, content: partsText });
      }
      return {
        model: body.model || "gemini-fable-wrapper",
        messages,
        temperature: body.generationConfig?.temperature,
        max_tokens: body.generationConfig?.maxOutputTokens,
        stream: false
      };
    }
    return {
      model: body.model || "fable-generic",
      messages: [{ role: "user", content: JSON.stringify(body) }]
    };
  }
  static injectFableSystemPrompt(req, fablePromptText) {
    const existingSystemIdx = req.messages.findIndex((m) => m.role === "system");
    if (existingSystemIdx >= 0) {
      req.messages[existingSystemIdx].content = `${fablePromptText}

--- ORIGINAL SYSTEM INSTRUCTIONS ---
${req.messages[existingSystemIdx].content}`;
    } else {
      req.messages.unshift({
        role: "system",
        content: fablePromptText
      });
    }
    return req;
  }
}

// src/router/context-injector.ts
import fs4 from "fs";
import path4 from "path";
class ContextInjector {
  static getFableSystemPrompt() {
    const repoRoot = getRepoRootDir();
    const promptPath = path4.join(repoRoot, "assets", "prompts", "claude-code-fable-5.md");
    const rulesPath = path4.join(repoRoot, "prompts", "fable5-rules.md");
    let fablePrompt = "";
    if (fs4.existsSync(rulesPath)) {
      fablePrompt += fs4.readFileSync(rulesPath, "utf-8") + `

`;
    }
    if (fs4.existsSync(promptPath)) {
      fablePrompt += fs4.readFileSync(promptPath, "utf-8");
    }
    return fablePrompt;
  }
  static loadSkill(skillName) {
    const repoRoot = getRepoRootDir();
    const claudeCodeSkill = path4.join(repoRoot, "assets", "skills", "claude-code", `${skillName}.md`);
    const claudeDesignSkill = path4.join(repoRoot, "assets", "skills", "claude-design", `${skillName}.md`);
    if (fs4.existsSync(claudeCodeSkill)) {
      return fs4.readFileSync(claudeCodeSkill, "utf-8");
    }
    if (fs4.existsSync(claudeDesignSkill)) {
      return fs4.readFileSync(claudeDesignSkill, "utf-8");
    }
    return null;
  }
  static loadAgent(agentName) {
    const repoRoot = getRepoRootDir();
    const agentPath = path4.join(repoRoot, "assets", "agents", `${agentName}.md`);
    if (fs4.existsSync(agentPath)) {
      return fs4.readFileSync(agentPath, "utf-8");
    }
    return null;
  }
}

// src/router/index.ts
function startMythosRouterServer(port = 8080) {
  const fablePrompt = ContextInjector.getFableSystemPrompt();
  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.url === "/health" || req.url === "/v1/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", mode: "Claude Fable 5 Mythos Router", port }));
      return;
    }
    if (req.method === "POST" && (req.url === "/v1/chat/completions" || req.url === "/chat/completions")) {
      let bodyStr = "";
      req.on("data", (chunk) => {
        bodyStr += chunk;
      });
      req.on("end", async () => {
        try {
          const body = JSON.parse(bodyStr);
          const normalized = ProviderTranslator.normalizeRequest(body);
          const enriched = ProviderTranslator.injectFableSystemPrompt(normalized, fablePrompt);
          logInfo(`[Mythos Router] Wrapped request for model: ${enriched.model} with Fable 5 Mythos System Prompt.`);
          const targetUpstream = process.env.UPSTREAM_OPENAI_URL;
          if (targetUpstream) {
            const upstreamRes = await fetch(targetUpstream, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: req.headers.authorization || ""
              },
              body: JSON.stringify(enriched)
            });
            const data = await upstreamRes.json();
            res.writeHead(upstreamRes.status, { "Content-Type": "application/json" });
            res.end(JSON.stringify(data));
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              id: `chatcmpl-fable-${Date.now()}`,
              object: "chat.completion",
              created: Math.floor(Date.now() / 1000),
              model: enriched.model,
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: `[Fable 5 Mythos System Router] Enhanced Request for model ${enriched.model} processed successfully with Fable 5 process discipline. Set UPSTREAM_OPENAI_URL to route calls dynamically.`
                  },
                  finish_reason: "stop"
                }
              ],
              fableEnriched: true,
              systemPromptBytes: fablePrompt.length
            }));
          }
        } catch (err) {
          logError(`Router Error: ${err.message}`);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found. Use POST /v1/chat/completions" }));
  });
  server.listen(port, () => {
    logSuccess(`\uD83D\uDEE1\uFE0F Fable 5 Mythos Router Server active on http://localhost:${port}`);
    logInfo(`Post OpenAI-compatible requests to http://localhost:${port}/v1/chat/completions`);
  });
}

// src/cli.ts
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "install";
  switch (command) {
    case "install":
      if (args[1] === "--antigravity" || args[1] === "-a") {
        logHeader("Installing Fable 5 Mythos Suite for Antigravity");
        installAntigravityGlobal();
      } else {
        logHeader("Installing Fable 5 Mythos System & Fable Mode (All Platforms)");
        installGlobalFable();
      }
      break;
    case "install-antigravity":
      logHeader("Installing Fable 5 Mythos Suite for Antigravity");
      installAntigravityGlobal();
      break;
    case "init":
      logHeader("Initializing Project Fable Discipline (.fable/ & .agents/)");
      initProjectFable(process.cwd());
      break;
    case "lint":
      logHeader("Fable Spec & Ledger Verification");
      const pass = runFableLint(process.cwd());
      process.exit(pass ? 0 : 1);
      break;
    case "status":
      logHeader("Fable System Installation Status");
      checkFableStatus();
      break;
    case "serve":
    case "router":
      const port = parseInt(args[1] || "8080", 10);
      logHeader(`Starting Mythos Router Server on Port ${port}`);
      startMythosRouterServer(port);
      break;
    case "assets":
      logHeader("Bundled Claude Fable Assets");
      listAssets();
      break;
    case "prompt":
      logHeader("Claude Code Fable 5 System Prompt");
      const repoRoot = getRepoRootDir();
      const promptPath = path5.join(repoRoot, "prompts", "claude-code-fable-5.md");
      if (fs5.existsSync(promptPath)) {
        console.log(fs5.readFileSync(promptPath, "utf-8"));
      } else {
        console.log("Prompt file not found.");
      }
      break;
    case "help":
    case "--help":
    case "-h":
      showHelp();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}
function listAssets() {
  const repoRoot = getRepoRootDir();
  const assetsDir = path5.join(repoRoot, "assets");
  const countItems = (dir) => {
    if (!fs5.existsSync(dir))
      return 0;
    return fs5.readdirSync(dir).length;
  };
  console.log(`${colors.green}\u2714 System Prompts:${colors.reset} ${countItems(path5.join(assetsDir, "prompts"))} files`);
  console.log(`${colors.green}\u2714 Leaked Agents:${colors.reset} ${countItems(path5.join(assetsDir, "agents"))} agents`);
  console.log(`${colors.green}\u2714 Claude Code Skills:${colors.reset} ${countItems(path5.join(assetsDir, "skills", "claude-code"))} skills`);
  console.log(`${colors.green}\u2714 Claude Design Skills:${colors.reset} ${countItems(path5.join(assetsDir, "skills", "claude-design"))} skills`);
  console.log(`${colors.green}\u2714 Slash Commands:${colors.reset} ${countItems(path5.join(assetsDir, "slash-commands"))} commands`);
  console.log(`${colors.green}\u2714 Injected Reminders:${colors.reset} ${countItems(path5.join(assetsDir, "injected-reminders"))} reminders`);
  console.log(`${colors.green}\u2714 Starter Components:${colors.reset} ${countItems(path5.join(assetsDir, "starter-components"))} components`);
}
function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}get-fable v1.2.0${colors.reset} \u2014 Fable 5 Mythos System & Multi-Model Upgrade Suite

${colors.bright}USAGE:${colors.reset}
  $ ${colors.green}npx get-fable${colors.reset} [command]
  $ ${colors.green}bunx get-fable${colors.reset} [command]

${colors.bright}COMMANDS:${colors.reset}
  ${colors.yellow}install${colors.reset}              Installs Fable 5 Mode & System Prompt globally across Claude Code, Antigravity, & Agent Kernel
  ${colors.yellow}install-antigravity${colors.reset}  Installs Fable 5 Plugin, Rules, Skills, and Hooks specifically into Antigravity (~/.gemini/config)
  ${colors.yellow}init${colors.reset}                 Initializes .fable/ ledger, .agents/ rules/skills, and SPEC.md in current project
  ${colors.yellow}serve${colors.reset}                Starts the Mythos Router proxy server to wrap any LLM provider (OpenAI, Gemini, Ollama)
  ${colors.yellow}lint${colors.reset}                 Verifies .fable/LEDGER.md for acceptance criteria and evidence annotations
  ${colors.yellow}status${colors.reset}               Displays current installation status across Claude Code & Antigravity
  ${colors.yellow}assets${colors.reset}               Lists all bundled Anthropic Claude Code & Design agents, skills, and prompts
  ${colors.yellow}prompt${colors.reset}               Outputs the complete Anthropic Claude Code Fable 5 System Prompt
  ${colors.yellow}help${colors.reset}                 Displays the help menu
`);
}
main();
export {
  main
};
