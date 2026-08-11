// Fable 5 Mythos Web Application Interactivity

document.addEventListener('DOMContentLoaded', () => {
  initTerminalSimulator();
  initSkillsVault();
  initClipboardHandlers();
  initModalHandlers();
});

// Terminal Commands Dataset
const TERMINAL_COMMANDS = {
  'install': [
    { type: 'prefix', text: '$ bunx get-fable install' },
    { type: 'dim', text: '⚡ Fable 5 Mythos System Installer v1.0.0' },
    { type: 'success', text: '✔ Environment scanned: Antigravity, Claude Code, Gemini CLI detected' },
    { type: 'highlight', text: '📦 Deploying 51 production skills to global agent vault...' },
    { type: 'highlight', text: '⚙ Injecting 4 mechanical guard hooks...' },
    { type: 'success', text: '✨ get-fable successfully installed across 3 CLI targets!' }
  ],
  'install-antigravity': [
    { type: 'prefix', text: '$ bunx get-fable install-antigravity' },
    { type: 'dim', text: '🚀 Provisioning Native Antigravity / Gemini CLI Plugin...' },
    { type: 'highlight', text: '↳ Target: ~/.gemini/config/plugins/fable-mythos' },
    { type: 'success', text: '✔ Registered 10 specialized agent personas' },
    { type: 'success', text: '✔ Initialized Plan Gate & Ledger Hooks' },
    { type: 'highlight', text: '🎉 Antigravity Fable 5 system ready. Restart your agent session.' }
  ],
  'init': [
    { type: 'prefix', text: '$ bunx get-fable init' },
    { type: 'dim', text: '📁 Initializing Fable Process Discipline in current workspace...' },
    { type: 'success', text: '✔ Created .fable/LEDGER.md' },
    { type: 'success', text: '✔ Created docs/SPEC.md' },
    { type: 'success', text: '✔ Created .agents/skills/ and .agents/rules/' },
    { type: 'warn', text: '🔒 Plan Gate is now ACTIVE: Code edits blocked until SPEC.md is approved.' }
  ],
  'serve': [
    { type: 'prefix', text: '$ bunx get-fable serve 8080' },
    { type: 'dim', text: '🌐 Starting Fable Mythos Local Proxy Server on port 8080...' },
    { type: 'highlight', text: '↳ Intercepting model stream & injecting process rules' },
    { type: 'success', text: '✔ Listening on http://localhost:8080' },
    { type: 'dim', text: 'Ready to route OpenAI / Ollama / Claude traffic with zero overhead.' }
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
          div.innerHTML = `<span class="term-prefix">fable@system:~$</span> <span>${line.text.replace('$ ', '')}</span>`;
        } else {
          div.innerHTML = `<span class="${'term-' + line.type}">${line.text}</span>`;
        }
        termBody.appendChild(div);
      }, idx * 120);
    });
  }

  termTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      termTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cmd = tab.getAttribute('data-cmd');
      renderCommand(cmd);
    });
  });

  // Render initial command
  renderCommand('install');
}

// Skills & Agents Dataset
const SKILLS_DATA = [
  { id: 1, name: 'Plan Gate Evaluator', category: 'rules', tag: 'Mechanical Guard', desc: 'Blocks implementation tool calls until SPEC.md and PLAN.md are written & approved.', details: 'Enforces strict Anthropic internal Fable 5 discipline. Returns error code 428 if code modification is attempted without an approved plan.' },
  { id: 2, name: 'Ledger Discipline Tracker', category: 'rules', tag: 'Mechanical Guard', desc: 'Mandates -- evidence: annotations for every task completion in .fable/LEDGER.md.', details: 'Prevents silent task closure. Every finished item must cite execution logs or test output.' },
  { id: 3, name: 'Attribution Ladder Escalator', category: 'rules', tag: 'Recovery Protocol', desc: 'Escalates root cause diagnosis (Harness → Runtime → Product → Class fix) on consecutive failures.', details: 'Triggered after 3 consecutive failures to prevent loops and force deep architectural review.' },
  { id: 4, name: 'Code Reviewer & Quality Auditor', category: 'skills', tag: 'Engineering', desc: 'Autonomous code review checking correctness, security, performance, and maintainability.', details: 'Performs SAST, dependency auditing, and style checking across TypeScript and Go.' },
  { id: 5, name: 'Accessibility & A11y Auditor', category: 'skills', tag: 'Design & UX', desc: 'Tests UI components against WCAG 2.1 AA standards and ARIA rules.', details: 'Verifies keyboard navigation, screen reader flow, tap targets, and contrast ratios.' },
  { id: 6, name: 'Database & SQL Optimizer', category: 'skills', tag: 'Backend', desc: 'Queries execution plans, indexing strategies, and schema normalization.', details: 'Optimizes Postgres, Supabase, and SQLite query patterns for ultra-fast response times.' },
  { id: 7, name: 'Security & Secrets Hygiene', category: 'skills', tag: 'Security', desc: 'Hunts hardcoded secrets, token leaks, CORS misconfigurations, and OWASP Top 10.', details: 'Runs secret scan before every git commit or push operation.' },
  { id: 8, name: 'Spawn Capability Guard', category: 'hooks', tag: 'Hook System', desc: 'Calculates model capability ceiling before allowing sub-agent invocation.', details: 'Prevents weak models from spawning recursive sub-agents that waste context tokens.' },
  { id: 9, name: 'Close Verification Guard', category: 'hooks', tag: 'Hook System', desc: 'Prevents turn termination until all active background tasks report final status.', details: 'Checks background run_command tasks and verifiers before releasing turn control.' }
];

// Initialize Skills Vault Search & Filter
function initSkillsVault() {
  const container = document.getElementById('skills-grid');
  const searchInput = document.getElementById('skill-search');
  const filterBtns = document.querySelectorAll('.filter-btn');

  if (!container) return;

  let currentCategory = 'all';
  let searchQuery = '';

  function renderSkills() {
    container.innerHTML = '';
    const filtered = SKILLS_DATA.filter(skill => {
      const matchCategory = (currentCategory === 'all' || skill.category === currentCategory);
      const matchSearch = (skill.name.toLowerCase().includes(searchQuery) || skill.desc.toLowerCase().includes(searchQuery));
      return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No skills match your query.</div>`;
      return;
    }

    filtered.forEach(skill => {
      const card = document.createElement('div');
      card.className = 'skill-card';
      card.innerHTML = `
        <div>
          <span class="skill-tag">${skill.tag}</span>
          <h3 class="skill-name">${skill.name}</h3>
          <p class="skill-desc">${skill.desc}</p>
        </div>
        <div class="skill-footer">
          <span>Click for details</span>
          <span>→</span>
        </div>
      `;
      card.addEventListener('click', () => openSkillModal(skill));
      container.appendChild(card);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderSkills();
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-filter');
      renderSkills();
    });
  });

  renderSkills();
}

// Modal Handlers
function openSkillModal(skill) {
  const modal = document.getElementById('skill-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  if (!modal || !modalTitle || !modalBody) return;

  modalTitle.textContent = skill.name;
  modalBody.innerHTML = `
    <div style="margin-bottom: 16px;">
      <span class="skill-tag">${skill.tag}</span>
    </div>
    <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 1rem;">${skill.desc}</p>
    <div style="background: var(--bg-terminal); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); font-family: var(--font-mono); font-size: 0.85rem; color: #a5b4fc;">
      <strong>System Enforcement:</strong><br/>
      ${skill.details}
    </div>
  `;

  modal.classList.add('active');
}

function initModalHandlers() {
  const modal = document.getElementById('skill-modal');
  const closeBtn = document.getElementById('modal-close');
  if (!modal) return;

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

// Clipboard Toast Handler
function initClipboardHandlers() {
  const copyBtns = document.querySelectorAll('.copy-trigger');
  
  copyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy') || 'bunx get-fable install';
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
