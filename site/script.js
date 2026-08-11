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
