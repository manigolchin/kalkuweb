/**
 * Generic loading-skeleton primitive — shown alongside (not instead of)
 * the German "Lade…" copy so screen-reader users still hear the loading
 * state via the surrounding `aria-live` region.
 *
 * Visual:  flat `bg-slate-200/dark:bg-slate-800` block with `animate-pulse`.
 * Sizing:  via the `className` prop (heights / widths / radii).
 *
 * Accessibility: marked `aria-hidden` because the visual is decorative —
 * the real loading announcement comes from the page-level `aria-live`
 * region that wraps the skeleton tree (see PanelLayout-page consumers).
 *
 * Co-exists with `Skeleton` in `src/pages/panel/ui.tsx` (a shimmer variant
 * used elsewhere). The two are intentionally separate so this primitive
 * stays dependency-free and trivially testable.
 */
import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={clsx(
        'bg-slate-200 dark:bg-slate-800 rounded animate-pulse',
        className,
      )}
    />
  );
}

export default Skeleton;
