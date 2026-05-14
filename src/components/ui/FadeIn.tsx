import { useInView } from '@/lib/useInView';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Render as a different element (default: div). */
  as?: 'div' | 'section';
};

export default function FadeIn({ children, className, as: Tag = 'div' }: Props) {
  const [ref, visible] = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref}
      className={cn('landing-fade-in', visible && 'landing-visible', className)}
    >
      {children}
    </Tag>
  );
}
