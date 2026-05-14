import { useEffect } from 'react';
import { SERVICES } from '@/lib/constants';

type Props = {
  /** Optional URL override; defaults to SERVICES.calendlyUrl. */
  url?: string;
  /** Min height of the embedded picker. */
  minHeight?: string;
};

/**
 * Embed Calendly inline scheduler. Loads the Calendly script on first mount,
 * then mounts the picker div. The script is lazy-loaded only when this
 * component renders — keeps the rest of the site clean of Calendly.
 */
export default function CalendlyEmbed({ url = SERVICES.calendlyUrl, minHeight = '700px' }: Props) {
  useEffect(() => {
    const SRC = 'https://assets.calendly.com/assets/external/widget.js';
    if (document.querySelector(`script[src="${SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    document.body.appendChild(s);
  }, []);

  return (
    <>
      <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
      <div
        className="calendly-inline-widget rounded-lg overflow-hidden border border-gray-200"
        data-url={url}
        style={{ minWidth: '320px', height: minHeight }}
      />
    </>
  );
}
