import type { CSSProperties } from 'react';
import { useInView } from '@/lib/useInView';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Render as a different element (default: div). */
  as?: 'div' | 'section';
  /** Additional delay in ms (cascade reveal effect). */
  delayMs?: number;
};

/**
 * Inline-style fade-up. We deliberately don't rely on a CSS class toggle —
 * cascade-layer ordering with Tailwind layers can make `.landing-visible`
 * lose to `.landing-fade-in` in some build configurations, leaving content
 * stuck at opacity 0. Inline styles are bulletproof.
 */
export default function FadeIn({ children, className, as: Tag = 'div', delayMs = 0 }: Props) {
  const [ref, visible] = useInView<HTMLDivElement>();

  const style: CSSProperties = visible
    ? { opacity: 1, transform: 'translateY(0)' }
    : {
        opacity: 0,
        transform: 'translateY(24px)',
        transition: `opacity 700ms cubic-bezier(0.2, 0.6, 0.2, 1) ${delayMs}ms, transform 700ms cubic-bezier(0.2, 0.6, 0.2, 1) ${delayMs}ms`,
      };

  return (
    <Tag ref={ref} className={cn(className)} style={style}>
      {children}
    </Tag>
  );
}
