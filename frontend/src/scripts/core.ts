const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function initReveal() {
  const items = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (reduced.matches || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  items.forEach((el) => io.observe(el));
}

/** Writes pointer position into --mx / --my for spotlight and button glow. */
function initPointerGlow() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  let frame = 0;
  let target: HTMLElement | null = null;
  let x = 0;
  let y = 0;
  document.addEventListener(
    'pointermove',
    (event) => {
      const el = (event.target as Element | null)?.closest<HTMLElement>('.spotlight, .btn');
      if (!el) return;
      target = el;
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        target.style.setProperty('--mx', `${x - rect.left}px`);
        target.style.setProperty('--my', `${y - rect.top}px`);
      });
    },
    { passive: true },
  );
}

initReveal();
initPointerGlow();
