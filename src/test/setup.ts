/**
 * Vitest setup — runs once before every test file.
 *
 *  - registers @testing-library/react's cleanup hook (auto-unmount between tests)
 *  - polyfills form-submit propagation for happy-dom (jsdom auto-fires submit
 *    when a button[type=submit] is clicked; happy-dom doesn't, which breaks
 *    every form test that uses fireEvent.click on the submit button).
 *  - stubs window.confirm to always return true so confirmation-gated handlers
 *    can be exercised without per-test mock plumbing.
 */

import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

beforeAll(() => {
  // Form-submit propagation polyfill — happy-dom parity for HTMLButtonElement.click().
  // happy-dom does NOT auto-fire form submit when a submit button is .click()'d.
  // This polyfill only triggers on programmatic .click() (not on fireEvent.click
  // which dispatches synthetic events) — that means a handful of fireEvent-driven
  // form tests in Firma.test.tsx will need to migrate to userEvent or
  // fireEvent.submit. See FIXES.md "happy-dom limitation" entry.
  if (typeof HTMLButtonElement !== 'undefined') {
    const original = HTMLButtonElement.prototype.click;
    HTMLButtonElement.prototype.click = function patchedClick() {
      original.call(this);
      const btn = this as HTMLButtonElement;
      // Per HTML spec the default type for buttons inside a form is 'submit',
      // but the DOM property always reports one of 'submit' | 'button' | 'reset'.
      const isSubmit = btn.type === 'submit';
      if (isSubmit && btn.form && !btn.disabled) {
        const form = btn.form;
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit(btn);
        } else {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }
    };
  }

  // Confirmation dialog stub — tests that exercise destructive handlers
  // (delete row, archive firm, reset defaults) gate their click behind
  // window.confirm(). Default to "yes" so the happy path runs; tests that
  // need "no" can vi.spyOn(window, 'confirm').mockReturnValueOnce(false).
  if (typeof window !== 'undefined' && typeof window.confirm !== 'function') {
    window.confirm = () => true;
  }
});
