#!/usr/bin/env bun
// @bun
// src/cli.ts
import fs4 from "fs";
import path4 from "path";

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
  const geminiConfigDir = getGeminiConfigDir();
  if (fs2.existsSync(geminiConfigDir)) {
    const geminiRulesDir = path2.join(geminiConfigDir, "rules");
    fs2.mkdirSync(geminiRulesDir, { recursive: true });
    fs2.copyFileSync(path2.join(repoRoot, "prompts", "fable5-rules.md"), path2.join(geminiRulesDir, "fable5-mode.md"));
    const geminiSkillDir = path2.join(geminiConfigDir, "skills", "fable-mode");
    fs2.mkdirSync(geminiSkillDir, { recursive: true });
    fs2.copyFileSync(path2.join(repoRoot, "prompts", "fable-mode-skill.md"), path2.join(geminiSkillDir, "SKILL.md"));
    logSuccess("Updated Antigravity / Gemini CLI rules & skills");
  }
  const kernelDir = getAgentKernelDir();
  if (fs2.existsSync(kernelDir)) {
    const kernelRulesDir = path2.join(kernelDir, "rules");
    fs2.mkdirSync(kernelRulesDir, { recursive: true });
    fs2.copyFileSync(path2.join(repoRoot, "prompts", "fable5-rules.md"), path2.join(kernelRulesDir, "fable5-mode.md"));
    logSuccess("Updated Agent Kernel rules");
  }
  logSuccess("Global Fable 5 Mythos System & Fable Mode successfully installed!");
}
function initProjectFable(targetDir = process.cwd()) {
  const repoRoot = getRepoRootDir();
  const fableDir = path2.join(targetDir, ".fable");
  const docsDir = path2.join(targetDir, "docs");
  fs2.mkdirSync(fableDir, { recursive: true });
  fs2.mkdirSync(docsDir, { recursive: true });
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
  console.log(`Registered Hooks: ${registeredHooksCount} / 4`);
  const geminiRule = path2.join(getGeminiConfigDir(), "rules", "fable5-mode.md");
  console.log(`Antigravity/Gemini Rule Installed: ${fs2.existsSync(geminiRule) ? "YES" : "NO"}`);
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

// src/cli.ts
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "install";
  switch (command) {
    case "install":
      logHeader("Installing Fable 5 Mythos System & Fable Mode");
      installGlobalFable();
      break;
    case "init":
      logHeader("Initializing Project Fable Discipline (.fable/)");
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
    case "prompt":
      logHeader("Claude Code Fable 5 System Prompt");
      const repoRoot = getRepoRootDir();
      const promptPath = path4.join(repoRoot, "prompts", "claude-code-fable-5.md");
      if (fs4.existsSync(promptPath)) {
        console.log(fs4.readFileSync(promptPath, "utf-8"));
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
function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}get-fable v1.0.0${colors.reset} \u2014 Fable 5 Mythos System & Fable Mode Discipline Installer

${colors.bright}USAGE:${colors.reset}
  $ ${colors.green}npx get-fable${colors.reset} [command]
  $ ${colors.green}bunx get-fable${colors.reset} [command]

${colors.bright}COMMANDS:${colors.reset}
  ${colors.yellow}install${colors.reset}   (Default) Installs Fable 5 Mode & System Prompt globally across Claude Code & Antigravity/Gemini CLI
  ${colors.yellow}init${colors.reset}      Initializes .fable/ ledger, SPEC.md, and VERIFIER templates in the current project
  ${colors.yellow}lint${colors.reset}      Verifies .fable/LEDGER.md for acceptance criteria and evidence annotations
  ${colors.yellow}status${colors.reset}    Displays current installation status and registered hooks
  ${colors.yellow}prompt${colors.reset}    Outputs the complete Anthropic Claude Code Fable 5 System Prompt
  ${colors.yellow}help${colors.reset}      Displays this help menu
`);
}
main();
export {
  main
};
