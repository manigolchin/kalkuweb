import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  question: string;
  answer: string;
  defaultOpen?: boolean;
};

export default function FaqItem({ question, answer, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState<string>(defaultOpen ? 'none' : '0px');
  const panelId = useId();

  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      setMaxH(`${contentRef.current.scrollHeight}px`);
    } else {
      setMaxH('0px');
    }
  }, [open, answer]);

  return (
    <div className="card-flat hover:shadow-sm transition-shadow">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-4 text-left"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span role="heading" aria-level={3} className="font-semibold text-gray-900">
          {question}
        </span>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5 transition-transform duration-200',
            open ? 'rotate-180' : '',
          )}
        />
      </button>
      <div
        id={panelId}
        ref={contentRef}
        style={{ maxHeight: maxH }}
        aria-hidden={!open}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      >
        <p className="pt-3 text-gray-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}
