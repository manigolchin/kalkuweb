/**
 * Round 10 — tests for the new <Skeleton /> primitive used in loading
 * states inside the panel pages (Firmen, Firma, ProjectsList).
 */

import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '../Skeleton';

describe('Skeleton primitive', () => {
  test('renders a div with the animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    const div = container.querySelector('div');
    expect(div).not.toBeNull();
    expect(div?.className).toContain('animate-pulse');
  });

  test('applies the user-passed className alongside the base classes', () => {
    const { container } = render(<Skeleton className="h-10 w-1/2" />);
    const div = container.querySelector('div');
    expect(div?.className).toContain('h-10');
    expect(div?.className).toContain('w-1/2');
    expect(div?.className).toContain('animate-pulse');
  });

  test('is decorative — has aria-hidden and role=presentation so screen readers skip it', () => {
    const { container } = render(<Skeleton />);
    const div = container.querySelector('div');
    expect(div?.getAttribute('aria-hidden')).toBe('true');
    expect(div?.getAttribute('role')).toBe('presentation');
  });

  test('does not interfere with an aria-busy region wrapping it', () => {
    // The skeleton primitive should not announce anything itself — the
    // surrounding aria-busy region is the single source of "loading" truth.
    const { container } = render(
      <div aria-busy="true" aria-live="polite" data-testid="busy-wrap">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>,
    );
    const wrap = container.querySelector('[data-testid=busy-wrap]');
    expect(wrap?.getAttribute('aria-busy')).toBe('true');
    expect(wrap?.getAttribute('aria-live')).toBe('polite');
    // Every skeleton inside is aria-hidden so it doesn't generate its own
    // SR-announced content.
    const skeletons = wrap?.querySelectorAll('[aria-hidden=true]');
    expect(skeletons?.length).toBe(2);
  });
});
