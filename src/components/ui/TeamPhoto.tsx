/**
 * Team portrait slot used on /ueber-uns/.
 *
 * Renders a 4:5 portrait card. When `src` resolves to a real file under
 * /public/team/ (or anywhere), it shows the photo with object-cover. When
 * `src` is undefined OR the file is missing (image errors out at load),
 * it falls back to the original gradient-with-initials placeholder so
 * the page never looks broken.
 *
 * Drop photos into /public/team/ and pass the path as `src`:
 *
 *   <TeamPhoto src="/team/alaatdin-coksari.webp" alt="Alaatdin Coksari" … />
 *
 * Recommended source: 800×1000 px (4:5), WebP-encoded under 100 KB, modern
 * casual headshot with natural lighting and a neutral background. The 3/4
 * angle conveys both approachability and authority — the pattern that
 * Edelman's Trust Barometer correlates with the highest B2B trust scores.
 */
import { useState } from 'react';

type Accent = 'primary' | 'emerald';

const ACCENT_CLASSES: Record<Accent, { bg: string; chip: string; text: string }> = {
  primary: {
    bg: 'from-primary-100 via-primary-50 to-emerald-50',
    chip: 'bg-primary-500/15',
    text: 'text-primary-700',
  },
  emerald: {
    bg: 'from-emerald-100 via-emerald-50 to-primary-50',
    chip: 'bg-emerald-600/15',
    text: 'text-emerald-700',
  },
};

export default function TeamPhoto({
  src,
  alt,
  initials,
  accent = 'primary',
}: {
  /** Path to the portrait. Optional — falls back to initials block when missing or errored. */
  src?: string;
  /** Required for accessibility when a real photo is present. */
  alt: string;
  /** Two-letter fallback shown when no photo is available. */
  initials: string;
  accent?: Accent;
}) {
  const a = ACCENT_CLASSES[accent];
  const [errored, setErrored] = useState(false);
  const usePhoto = !!src && !errored;

  return (
    <div
      className={`relative aspect-[4/5] rounded-3xl bg-gradient-to-br ${a.bg} overflow-hidden flex items-center justify-center max-w-sm mx-auto lg:mx-0`}
    >
      {usePhoto ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          width={800}
          height={1000}
          onError={() => setErrored(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className={`w-36 h-36 rounded-full ${a.chip} backdrop-blur-sm flex items-center justify-center`}>
          <span className={`text-6xl font-bold ${a.text} tracking-tight`} aria-hidden="true">
            {initials}
          </span>
          <span className="sr-only">{alt} (Portraitfoto folgt)</span>
        </div>
      )}
    </div>
  );
}
