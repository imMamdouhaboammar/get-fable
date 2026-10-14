const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const prefersReducedMotion = reducedMotionQuery.matches;

const year = document.querySelector('[data-year]');
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const copyButton = document.querySelector('[data-copy]');
const copySource = document.querySelector('[data-copy-source]');
const copyStatus = document.querySelector('[data-copy-status]');

const fallbackCopy = (text) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('Copy command was rejected');
  }
};

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  fallbackCopy(text);
};

if (copyButton && copySource && copyStatus) {
  copyButton.addEventListener('click', async () => {
    const text = copySource.textContent?.trim() ?? '';

    try {
      await copyText(text);
      copyButton.textContent = 'Copied';
      copyStatus.textContent = 'Copied quick-start commands to the clipboard';
    } catch {
      copyButton.textContent = 'Copy';
      copyStatus.textContent = 'Copy failed. Select the commands manually';
    }

    window.setTimeout(() => {
      copyButton.textContent = 'Copy';
      copyStatus.textContent = '';
    }, 2600);
  });
}

const revealItems = [...document.querySelectorAll('[data-reveal]')];

if (!prefersReducedMotion && 'IntersectionObserver' in window && revealItems.length) {
  document.documentElement.classList.add('reveal-ready');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.08,
  });

  revealItems.forEach((item) => revealObserver.observe(item));
}

const traceSteps = [...document.querySelectorAll('[data-trace-step]')];
let traceIndex = 0;
let traceTimer = null;

const stopTrace = () => {
  if (traceTimer !== null) {
    window.clearInterval(traceTimer);
    traceTimer = null;
  }
};

const startTrace = () => {
  if (prefersReducedMotion || traceSteps.length < 2 || traceTimer !== null) return;

  traceTimer = window.setInterval(() => {
    traceSteps[traceIndex]?.classList.remove('is-active');
    traceIndex = (traceIndex + 1) % traceSteps.length;
    traceSteps[traceIndex]?.classList.add('is-active');
  }, 1700);
};

if (!prefersReducedMotion) {
  startTrace();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTrace();
    } else {
      startTrace();
    }
  });
}

// Generic code block copy handler
document.querySelectorAll('.code-block .copy-button').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const code = btn.parentElement?.querySelector('code')?.textContent?.trim() || '';
    if (!code) return;
    try {
      await copyText(code);
      const originalText = btn.textContent;
      btn.textContent = 'Copied';
      window.setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    } catch {
      btn.textContent = 'Copy failed';
      window.setTimeout(() => {
        btn.textContent = 'Copy';
      }, 2000);
    }
  });
});

// Skills Catalog interactive search & filtering
const skillSearchInput = document.getElementById('skill-search');
const filterChips = document.querySelectorAll('.filter-chip');
const skillCards = document.querySelectorAll('.skill-card');
const noSkillsMsg = document.getElementById('no-skills-match');

function applySkillFilters() {
  if (!skillCards.length) return;
  const activeChip = document.querySelector('.filter-chip.is-active');
  const activePack = activeChip?.getAttribute('data-filter') || 'all';
  const query = (skillSearchInput?.value || '').trim().toLowerCase();

  let visibleCount = 0;
  skillCards.forEach((card) => {
    const cardPack = card.getAttribute('data-pack') || '';
    const cardKeywords = card.getAttribute('data-keywords') || '';

    const matchesPack = activePack === 'all' || cardPack === activePack;
    const matchesQuery = !query || cardKeywords.includes(query);

    if (matchesPack && matchesQuery) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  if (noSkillsMsg) {
    noSkillsMsg.style.display = visibleCount === 0 ? 'block' : 'none';
  }
}

if (skillSearchInput) {
  skillSearchInput.addEventListener('input', applySkillFilters);
}

filterChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    filterChips.forEach((c) => {
      c.classList.remove('is-active');
      c.setAttribute('aria-selected', 'false');
    });
    chip.classList.add('is-active');
    chip.setAttribute('aria-selected', 'true');
    applySkillFilters();
  });
});

