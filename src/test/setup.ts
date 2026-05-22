/**
 * Vitest setup — runs once before every test file.
 *
 * Currently only registers `@testing-library/react`'s cleanup hook (auto-
 * unmounts components between tests) and the jest-dom-style matcher import
 * pattern. If we add MSW for API mocking later, its setup goes here too.
 */

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
