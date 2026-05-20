import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAufmass } from '../src/lib/aufmass.js';

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

test('annotated REB-style lines with a minus row', () => {
  const r = evaluateAufmass('Wand 1  4.50 * 2.80\n- Tür   2.10 * 1.00\nWand 2  3.20 * 2.80');
  assert.equal(r.hasErrors, false);
  assert.equal(round(r.total, 2), 19.46);
  assert.equal(r.lines.length, 3);
  assert.equal(r.lines[1].annotation, 'Tür');
  assert.equal(r.lines[1].signedValue, -2.1);
});

test('pure-math lines (no annotation)', () => {
  const r = evaluateAufmass('4.50 * 2.80\n3.20 * 2.80');
  assert.equal(r.hasErrors, false);
  assert.equal(round(r.total, 2), 21.56);
});

test('signed pure-math lines (leading +/- on the math itself)', () => {
  const r = evaluateAufmass('   12.60\n- 2.10\n+ 8.96');
  assert.equal(r.hasErrors, false);
  assert.equal(round(r.total, 2), 19.46);
});

test('parens with mixed precedence', () => {
  const r = evaluateAufmass('(4.50 + 0.50) * 2.80');
  assert.equal(r.hasErrors, false);
  assert.equal(r.total, 14);
});

test('division-by-zero is flagged, total stays at last-good value', () => {
  const r = evaluateAufmass('10 / 0');
  assert.equal(r.hasErrors, true);
  assert.equal(r.total, 0);
});

test('single number on a line', () => {
  const r = evaluateAufmass('5');
  assert.equal(r.hasErrors, false);
  assert.equal(r.total, 5);
});

test('empty formula returns zero, no error', () => {
  const r = evaluateAufmass('');
  assert.equal(r.hasErrors, false);
  assert.equal(r.total, 0);
});

test('garbage line is dropped silently (annotation-only)', () => {
  const r = evaluateAufmass('foo bar baz');
  assert.equal(r.hasErrors, false);
  assert.equal(r.total, 0);
});

test('label with internal digit does not eat the math', () => {
  // "Wand 1" has a digit — needs ≥2 spaces between label and expression
  const r = evaluateAufmass('Wand 1  4.5\nWand 2  3.0');
  assert.equal(r.hasErrors, false);
  assert.equal(r.total, 7.5);
});

test('label with internal digit but only single space falls through', () => {
  // "Wand 1 4.50" with a single space → can't split → whole line is annotation
  const r = evaluateAufmass('Wand 1 4.50');
  assert.equal(r.hasErrors, false);
  assert.equal(r.total, 0);
});

test('comma decimal (German convention)', () => {
  const r = evaluateAufmass('Wand 1  4,50 * 2,80');
  assert.equal(r.hasErrors, false);
  assert.equal(round(r.total, 2), 12.6);
});

test('mixed dot and comma decimal in same expression', () => {
  const r = evaluateAufmass('3.20 * 2,80');
  assert.equal(r.hasErrors, false);
  assert.equal(round(r.total, 2), 8.96);
});

test('tab separator works', () => {
  const r = evaluateAufmass('Wand 1\t4.50 * 2.80');
  assert.equal(r.hasErrors, false);
  assert.equal(round(r.total, 2), 12.6);
});

test('multiple blank lines are ignored', () => {
  const r = evaluateAufmass('\n\n4.5\n\n\n3.0\n');
  assert.equal(r.hasErrors, false);
  assert.equal(r.total, 7.5);
});

test('unbalanced parens flag an error', () => {
  const r = evaluateAufmass('(4.5 + 0.5');
  assert.equal(r.hasErrors, true);
});

test('error on one parseable-but-invalid line does not stop the others', () => {
  // Line 2 IS detected as math (all chars in the char class) but is
  // syntactically broken (unbalanced paren). Lines 1 and 3 still sum.
  const r = evaluateAufmass('4.5\n(5 + 3\n3.0');
  assert.equal(r.hasErrors, true);
  assert.equal(r.total, 7.5);
});

test('non-math garbage line is treated as annotation, not an error', () => {
  // "foo bar baz" has no math chars at all → annotation-only, ignored silently.
  const r = evaluateAufmass('4.5\nfoo bar baz\n3.0');
  assert.equal(r.hasErrors, false);
  assert.equal(r.total, 7.5);
});

test('regression: previous-agent commit-message math (50 × 140 = 7000, NOT 8963.08)', () => {
  const r = evaluateAufmass('Fliesen  50 * 140');
  assert.equal(r.total, 7000);
});
