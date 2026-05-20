/**
 * Safe Aufmaß / Mengenermittlung formula evaluator. REB-23.003-lite.
 *
 * Accepts free text annotations followed by a numeric expression per line:
 *
 *   Wand 1 ............ 4.50 * 2.80
 *   - Tür .............. 2.10 * 1.00
 *   Wand 2 ............ 3.20 * 2.80
 *
 * Each line is split into "annotation" (anything that doesn't tokenize as a
 * number/operator) and a trailing arithmetic expression. Lines whose first
 * non-whitespace char is "-" subtract their absolute value from the running
 * sum; everything else adds. Lines that contain no parseable expression are
 * ignored. Decimals accept both "." and "," (German convention).
 *
 * NEVER uses eval / new Function — every operator is dispatched explicitly.
 * Only allowed tokens: digits, +, -, *, /, (, ), . , and whitespace.
 */

type Token =
  | { type: 'num'; value: number }
  | { type: 'op'; op: '+' | '-' | '*' | '/' }
  | { type: 'lparen' }
  | { type: 'rparen' };

class ParseError extends Error {}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ' || ch === '\t') {
      i++;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'op', op: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }
    if ((ch >= '0' && ch <= '9') || ch === '.' || ch === ',') {
      let j = i;
      while (
        j < expr.length &&
        (expr[j] === '.' || expr[j] === ',' || (expr[j] >= '0' && expr[j] <= '9'))
      ) {
        j++;
      }
      const raw = expr.slice(i, j).replace(',', '.');
      const n = parseFloat(raw);
      if (!Number.isFinite(n)) throw new ParseError(`bad number "${raw}"`);
      tokens.push({ type: 'num', value: n });
      i = j;
      continue;
    }
    throw new ParseError(`unexpected character "${ch}"`);
  }
  return tokens;
}

/** Shunting-yard → RPN → evaluate. Handles +,-,*,/ with normal precedence and parens,
 *  plus unary +/- at the start of an expression or after another operator. */
function evalArithmetic(expr: string): number {
  const rawTokens = tokenize(expr);
  if (rawTokens.length === 0) return NaN;
  // Pre-pass: insert a leading 0 before unary +/- so the shunting-yard handles
  // it without a separate unary code path. "- 2.10" → "0 - 2.10".
  const tokens: Token[] = [];
  let prevWasOperator = true; // start counts as operator boundary
  for (const t of rawTokens) {
    if (
      t.type === 'op' &&
      (t.op === '-' || t.op === '+') &&
      prevWasOperator
    ) {
      tokens.push({ type: 'num', value: 0 });
    }
    tokens.push(t);
    prevWasOperator = t.type === 'op' || t.type === 'lparen';
  }
  const precedence: Record<'+' | '-' | '*' | '/', number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const output: Token[] = [];
  const ops: Token[] = [];
  for (const t of tokens) {
    if (t.type === 'num') output.push(t);
    else if (t.type === 'op') {
      while (
        ops.length > 0 &&
        ops[ops.length - 1].type === 'op' &&
        precedence[(ops[ops.length - 1] as { op: '+' | '-' | '*' | '/' }).op] >= precedence[t.op]
      ) {
        output.push(ops.pop()!);
      }
      ops.push(t);
    } else if (t.type === 'lparen') ops.push(t);
    else if (t.type === 'rparen') {
      while (ops.length > 0 && ops[ops.length - 1].type !== 'lparen') output.push(ops.pop()!);
      if (ops.length === 0) throw new ParseError('unbalanced )');
      ops.pop(); // discard the (
    }
  }
  while (ops.length > 0) {
    const t = ops.pop()!;
    if (t.type === 'lparen' || t.type === 'rparen') throw new ParseError('unbalanced (');
    output.push(t);
  }
  const stack: number[] = [];
  for (const t of output) {
    if (t.type === 'num') stack.push(t.value);
    else if (t.type === 'op') {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new ParseError('missing operand');
      let r: number;
      switch (t.op) {
        case '+': r = a + b; break;
        case '-': r = a - b; break;
        case '*': r = a * b; break;
        case '/':
          if (b === 0) throw new ParseError('division by zero');
          r = a / b;
          break;
      }
      stack.push(r);
    }
  }
  if (stack.length !== 1) throw new ParseError('stack underflow');
  return stack[0];
}

export type AufmassLine = {
  raw: string;
  annotation: string;
  expression: string;
  value: number | null;
  signedValue: number;
  error?: string;
};

export type AufmassResult = {
  lines: AufmassLine[];
  total: number;
  hasErrors: boolean;
};

// Annotation and math expression are separated by ≥2 spaces or a tab —
// REB-23.003 convention. A single space stays inside the annotation so labels
// like "Wand 1" don't get their digit eaten as math.
const ANNOTATION_MATH_SEPARATOR = /[ \t]{2,}|\t/;
const PURE_MATH_LINE = /^[\d\s.,+\-*/()]+$/;

export function evaluateAufmass(formula: string): AufmassResult {
  const lines: AufmassLine[] = [];
  let total = 0;
  let hasErrors = false;

  for (const raw of formula.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;

    let annotation = '';
    let expression = '';
    if (PURE_MATH_LINE.test(trimmed)) {
      // Whole line is math, no annotation.
      expression = trimmed;
    } else {
      // Split off the LAST run separated by ≥2 spaces or a tab and treat it as math.
      // Everything before becomes the annotation.
      const parts = trimmed.split(ANNOTATION_MATH_SEPARATOR).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        expression = parts[parts.length - 1];
        annotation = parts.slice(0, -1).join(' ');
      } else {
        // No clear separator → can't tell which part is math. Treat the whole line as annotation only.
        annotation = trimmed;
      }
    }
    // A leading "-" on the line (e.g. "- Tür ... 2.10 * 1.00") means subtract
    // this line's absolute value from the running sum. Check the trimmed raw
    // because if the line was pure math we kept annotation empty.
    let signMultiplier = 1;
    let cleanAnnotation = annotation;
    if (trimmed.startsWith('-') && annotation.startsWith('-')) {
      signMultiplier = -1;
      cleanAnnotation = annotation.slice(1).trimStart();
    } else if (trimmed.startsWith('-') && annotation === '') {
      // pure math line starting with "-" is already a signed expression — let
      // the arithmetic evaluator handle it (no special handling here).
    }
    if (expression.length === 0) {
      lines.push({ raw, annotation: cleanAnnotation, expression: '', value: null, signedValue: 0 });
      continue;
    }
    try {
      const value = evalArithmetic(expression);
      if (!Number.isFinite(value)) throw new ParseError('non-finite result');
      const signed = signMultiplier * value;
      total += signed;
      lines.push({ raw, annotation: cleanAnnotation, expression, value, signedValue: signed });
    } catch (err) {
      hasErrors = true;
      lines.push({
        raw,
        annotation: cleanAnnotation,
        expression,
        value: null,
        signedValue: 0,
        error: err instanceof ParseError ? err.message : 'parse error',
      });
    }
  }

  return { lines, total, hasErrors };
}
