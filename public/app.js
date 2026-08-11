// Fable Agent Execution Harness Web Interactivity

document.addEventListener('DOMContentLoaded', () => {
  initTerminalSimulator();
  initClipboardHandlers();
});

// Terminal Commands Dataset based on README.md single source of truth
const TERMINAL_COMMANDS = {
  'status': [
    { type: 'prefix', text: '$ bun ./bin/get-fable.js status' },
    { type: 'dim', text: '=== get-fable installation status ===' },
    { type: 'success', text: '✔ Claude Config Dir: ~/.claude' },
    { type: 'success', text: '✔ Skill Installed: YES' },
    { type: 'success', text: '✔ Claude Registered Hooks: 4 / 4' },
    { type: 'success', text: '✔ Antigravity/Gemini Rule Installed: YES' },
    { type: 'success', text: '✔ Antigravity Plugin Installed: YES' },
    { type: 'highlight', text: '✔ Current Project (.fable active): YES' }
  ],
  'assets': [
    { type: 'prefix', text: '$ bun ./bin/get-fable.js assets' },
    { type: 'dim', text: '=== Bundled get-fable assets ===' },
    { type: 'success', text: '✔ System Prompts: 3 files' },
    { type: 'success', text: '✔ Agent Definitions: 10 agents' },
    { type: 'success', text: '✔ Claude Code Skills: 29 skills' },
    { type: 'success', text: '✔ Claude Design Skills: 22 skills' },
    { type: 'success', text: '✔ Slash Commands: 9 commands' },
    { type: 'success', text: '✔ Injected Reminders: 8 reminders' },
    { type: 'success', text: '✔ Starter Components: 10 components' }
  ],
  'init': [
    { type: 'prefix', text: '$ bun ./bin/get-fable.js init' },
    { type: 'dim', text: 'Initializing get-fable structure in workspace...' },
    { type: 'success', text: '✔ Created .fable/LEDGER.md' },
    { type: 'success', text: '✔ Created .fable/PROGRESS.md' },
    { type: 'success', text: '✔ Created .fable/VERIFIER_PROMPT.md' },
    { type: 'success', text: '✔ Created .agents/skills/fable-mode/SKILL.md' },
    { type: 'success', text: '✔ Created .agents/rules/fable5-mode.md' },
    { type: 'success', text: '✔ Created docs/SPEC.md' }
  ],
  'install': [
    { type: 'prefix', text: '$ bun ./bin/get-fable.js install' },
    { type: 'dim', text: 'Installing get-fable global integrations...' },
    { type: 'success', text: '✔ Configured ~/.claude/ (Fable Mode skill + 4 lifecycle hooks)' },
    { type: 'success', text: '✔ Configured ~/.gemini/config/ (Antigravity plugin & skills)' },
    { type: 'highlight', text: '✔ Checked ~/.agent-kernel/ (rules updated)' }
  ],
  'serve': [
    { type: 'prefix', text: '$ bun ./bin/get-fable.js serve 8080' },
    { type: 'dim', text: 'Starting get-fable Request Proxy Router on port 8080...' },
    { type: 'highlight', text: 'Endpoint: POST /v1/chat/completions' },
    { type: 'success', text: '✔ Normalizing messages & Gemini contents arrays' },
    { type: 'success', text: '✔ Prepending Fable prompt context' },
    { type: 'dim', text: 'Listening on http://localhost:8080' }
  ]
};

// Initialize Terminal Simulator
function initTerminalSimulator() {
  const termBody = document.getElementById('terminal-body');
  const termTabs = document.querySelectorAll('.term-tab');
  if (!termBody || !termTabs.length) return;

  function renderCommand(cmdKey) {
    const lines = TERMINAL_COMMANDS[cmdKey] || [];
    termBody.innerHTML = '';
    
    lines.forEach((line, idx) => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'term-line';
        if (line.type === 'prefix') {
          div.innerHTML = `<span class="term-prefix">user@host:~/project$</span> <span>${line.text.replace('$ ', '')}</span>`;
        } else {
          div.innerHTML = `<span class="${'term-' + line.type}">${line.text}</span>`;
        }
        termBody.appendChild(div);
      }, idx * 100);
    });
  }

  termTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      termTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const cmd = tab.getAttribute('data-cmd');
      renderCommand(cmd);
    });
  });

  renderCommand('status');
}

// Clipboard Toast Handler
function initClipboardHandlers() {
  const copyBtns = document.querySelectorAll('.copy-trigger');
  
  copyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy') || 'bun ./bin/get-fable.js install';
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Command copied to clipboard!');
      });
    });
  });
}

function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✔</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
