import { useEffect, useState } from 'react';
import { useInView } from '@/lib/useInView';

type Props = {
  /** Target value to count up to. */
  to: number;
  /** Optional suffix (e.g. ' h', ' %', '+'). */
  suffix?: string;
  /** Optional prefix (e.g. '~'). */
  prefix?: string;
  /** Animation duration in milliseconds. */
  durationMs?: number;
  /** Use locale-aware grouping (de-DE) for thousands. */
  formatNumber?: boolean;
  /** Tailwind classes for the container. */
  className?: string;
};

/**
 * Counts from 0 → `to` once the component scrolls into view.
 * Respects prefers-reduced-motion (renders the final value immediately).
 */
export default function AnimatedCounter({
  to,
  suffix = '',
  prefix = '',
  durationMs = 1400,
  formatNumber = false,
  className,
}: Props) {
  const [ref, visible] = useInView<HTMLSpanElement>(0.4);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(to);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic for a snappy stop
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, to, durationMs]);

  const formatted = formatNumber ? value.toLocaleString('de-DE') : String(value);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
