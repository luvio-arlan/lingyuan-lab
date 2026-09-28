type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string | null;
  phase: number;
};

const ACCENTS = ['59,108,255', '124,92,255', '20,167,156', '255,122,69'];

/**
 * A quiet, drifting relationship network. Pointer proximity draws accent-coloured links.
 * Pauses when offscreen or when the tab is hidden; renders a single still frame for reduced motion.
 */
export function mountNetwork(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;
  let nodes: Node[] = [];
  let raf = 0;
  let running = false;
  const pointer = { x: -9999, y: -9999, active: false };
  const LINK = 150;

  const seed = () => {
    const area = w * h;
    const count = Math.round(Math.min(90, Math.max(28, area / 17000)));
    nodes = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.4 + 1,
      color: i % 5 === 0 ? ACCENTS[i % ACCENTS.length] : null,
      phase: Math.random() * Math.PI * 2,
    }));
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (!running) draw(0);
  };

  const draw = (t: number) => {
    ctx.clearRect(0, 0, w, h);

    for (const n of nodes) {
      if (!reduced) {
        n.x += n.vx;
        n.y += n.vy;
        if (pointer.active) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 200 * 200 && d2 > 1) {
            const f = 0.012 * (1 - Math.sqrt(d2) / 200);
            n.x += dx * f;
            n.y += dy * f;
          }
        }
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > LINK * LINK) continue;
        const alpha = (1 - Math.sqrt(d2) / LINK) * 0.16;
        ctx.strokeStyle = `rgba(11,18,32,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    if (pointer.active) {
      for (const n of nodes) {
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d > 180) continue;
        const rgb = n.color ?? ACCENTS[0];
        ctx.strokeStyle = `rgba(${rgb},${(1 - d / 180) * 0.35})`;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
      }
    }

    for (const n of nodes) {
      const pulse = reduced ? 1 : 0.75 + 0.25 * Math.sin(t / 900 + n.phase);
      if (n.color) {
        ctx.fillStyle = `rgba(${n.color},${0.16 * pulse})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${n.color},0.9)`;
      } else {
        ctx.fillStyle = 'rgba(11,18,32,0.28)';
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.color ? n.r + 0.6 : n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const loop = (t: number) => {
    draw(t);
    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    if (running || reduced) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = pointer.y >= 0 && pointer.y <= rect.height;
  };
  const onLeave = () => (pointer.active = false);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
  io.observe(canvas);

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  resize();

  return () => {
    stop();
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
  };
}
