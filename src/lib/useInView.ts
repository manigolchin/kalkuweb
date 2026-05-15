import { useEffect, useRef, useState } from 'react';

/**
 * Trigger a one-shot reveal when the element enters the viewport.
 * Returns a ref to attach to the target element and a boolean `inView`.
 *
 * Reveal is robust to weird viewport/scroll situations:
 *  - Reduced-motion: shows immediately.
 *  - IntersectionObserver fires when the element overlaps the viewport.
 *  - Belt-and-suspenders: a scroll listener checks geometry directly.
 *  - Final safety net: a 1.4 s timer reveals regardless.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.05,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof window === 'undefined') {
      setInView(true);
      return;
    }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setInView(true);
      return;
    }

    // Direct geometry check — fires on initial paint AND on every scroll
    let revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      setInView(true);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
    function onScroll() {
      const n = ref.current;
      if (!n) return;
      const rect = n.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
        reveal();
      }
    }

    onScroll(); // initial check — if already in view, reveal immediately
    if (revealed) return;

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Backup IntersectionObserver in case the scroll listener misses (modern browsers)
    let obs: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            reveal();
            obs?.disconnect();
          }
        },
        { threshold, rootMargin: '0px 0px 0px 0px' },
      );
      obs.observe(node);
    }

    // Last-resort safety net — never leave content invisible
    const safety = setTimeout(reveal, 1400);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      obs?.disconnect();
      clearTimeout(safety);
    };
  }, [threshold]);

  return [ref, inView];
}
