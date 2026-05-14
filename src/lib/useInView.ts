import { useEffect, useRef, useState } from 'react';

/**
 * Trigger a one-shot reveal when the element enters the viewport.
 * Returns a ref to attach to the target element and a boolean `inView`.
 *
 * Mirrors the pattern used in the Anfragetool LandingPage:
 *   const [ref, visible] = useInView();
 *   <div ref={ref} className={`landing-fade-in ${visible ? 'landing-visible' : ''}`}>
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect users who prefer reduced motion — show immediately
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -10% 0px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView];
}
