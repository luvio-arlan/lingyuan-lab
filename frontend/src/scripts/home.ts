import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountNetwork } from './network';

gsap.registerPlugin(ScrollTrigger);

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(sel),
];

const net = $<HTMLCanvasElement>('[data-net]');
if (net) mountNetwork(net);

const ORBIT_R = 232;
const ORBIT_C = 320;
const ACCENT_VARS = ['var(--c-blue)', 'var(--c-teal)', 'var(--c-violet)', 'var(--c-orange)'];

const mm = gsap.matchMedia();

mm.add(
  {
    motion: '(prefers-reduced-motion: no-preference)',
    desktop: '(min-width: 961px) and (min-height: 620px)',
  },
  (context) => {
    const { motion, desktop } = context.conditions as { motion: boolean; desktop: boolean };
    if (!motion) return;
    const cleanups: Array<() => void> = [];

    /* ---------- Hero: recede as the page scrolls ---------- */
    const hero = $('[data-hero]');
    if (hero) {
      gsap.to('[data-hero-inner]', {
        yPercent: -8,
        scale: 0.94,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 15%', scrub: 0.5 },
      });
      gsap.to('[data-hero-backdrop]', {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
      });
    }

    /* ---------- Manifesto: characters light up with scroll ---------- */
    const manifesto = $('[data-manifesto]');
    const text = $('[data-manifesto-text]');
    if (manifesto && text) {
      manifesto.classList.add('manifesto-armed');
      gsap.fromTo(
        $$('.ch', text),
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.04,
          duration: 0.2,
          scrollTrigger: { trigger: text, start: 'top 78%', end: 'bottom 42%', scrub: 0.6 },
        },
      );
      cleanups.push(() => manifesto.classList.remove('manifesto-armed'));
    }

    if (!desktop) return () => cleanups.forEach((fn) => fn());

    /* ---------- Orbit: pinned four-step story ---------- */
    const orbit = $('[data-orbit]');
    const stage = $('[data-orbit-stage]');
    if (orbit && stage) {
      orbit.classList.add('orbit-pinned');
      const nodes = $$<SVGGElement>('.node', orbit);
      const spokes = $$<SVGLineElement>('.spoke', orbit);
      const arcs = $$<SVGPathElement>('.arc', orbit);
      const panels = $$('.panel', orbit);
      const fills = $$('.progress i', orbit);
      const comet = $<SVGGElement>('[data-comet]', orbit);
      const svg = $<SVGSVGElement>('[data-orbit-svg]', orbit);
      let current = -1;

      const setStep = (s: number) => {
        if (s === current) return;
        current = s;
        nodes.forEach((n, i) => {
          n.classList.toggle('is-reached', i <= s);
          n.classList.toggle('is-active', i === s);
        });
        spokes.forEach((sp, i) => sp.classList.toggle('is-reached', i <= s));
        arcs.forEach((a, i) => a.classList.toggle('is-reached', i < s || (s === 3 && i === 3)));
        panels.forEach((p, i) => {
          p.classList.toggle('is-active', i === s);
          p.classList.toggle('is-past', i < s);
        });
        comet?.style.setProperty('--comet', ACCENT_VARS[s]);
      };

      const render = (p: number) => {
        setStep(Math.min(3, Math.floor(p * 4.0001)));
        fills.forEach((f, i) => f.style.setProperty('--fill', String(gsap.utils.clamp(0, 1, p * 4 - i))));
        if (comet) {
          const angle = ((-135 + p * 270) * Math.PI) / 180;
          const x = ORBIT_C + ORBIT_R * Math.cos(angle);
          const y = ORBIT_C + ORBIT_R * Math.sin(angle);
          comet.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        }
      };

      const proxy = { p: 0 };
      render(0);
      gsap.to(proxy, {
        p: 1,
        ease: 'none',
        onUpdate: () => render(proxy.p),
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: '+=280%',
          pin: true,
          scrub: 0.9,
          anticipatePin: 1,
        },
      });

      if (svg) {
        gsap.fromTo(
          svg,
          { scale: 0.86, rotate: -8, opacity: 0.4 },
          {
            scale: 1,
            rotate: 0,
            opacity: 1,
            ease: 'none',
            scrollTrigger: { trigger: orbit, start: 'top 90%', end: 'top top', scrub: 0.8 },
          },
        );
      }

      cleanups.push(() => {
        orbit.classList.remove('orbit-pinned');
        current = -1;
        [...nodes, ...spokes, ...arcs].forEach((el) => {
          el.classList.add('is-reached');
          el.classList.remove('is-active');
        });
        panels.forEach((p) => p.classList.remove('is-active', 'is-past'));
      });
    }

    /* ---------- Learning path: horizontal rail ---------- */
    const rail = $('[data-rail]');
    const railStage = $('[data-rail-stage]');
    const track = $('[data-rail-track]');
    const viewport = $('[data-rail-viewport]');
    const fill = $('[data-rail-fill]');
    if (rail && railStage && track && viewport) {
      rail.classList.add('rail-pinned');
      const distance = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: railStage,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => fill?.style.setProperty('--rail', String(0.1 + self.progress * 0.9)),
        },
      });
      $$('.stop', track).forEach((stop, i) => {
        gsap.fromTo(
          stop,
          { y: 40 + (i % 3) * 16, opacity: 0.3 },
          {
            y: 0,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: railStage,
              start: 'top 85%',
              end: 'top 15%',
              scrub: 0.8,
            },
          },
        );
      });
      cleanups.push(() => rail.classList.remove('rail-pinned'));
    }

    return () => cleanups.forEach((fn) => fn());
  },
);

document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
