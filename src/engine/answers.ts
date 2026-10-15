import type { Puzzle } from '../content/types';

/* ------------------------------------------------------------------ */
/* Text normalisation                                                  */
/* ------------------------------------------------------------------ */

/** Lower-case, strip accents and punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const LEADING_ARTICLES = /^(the|a|an|el|la|los|las|un|una)\s+/;

/** Normalised form without leading articles and without spaces, for comparisons. */
export function canonical(input: string): string {
  let s = normalizeText(input);
  // Strip up to two leading articles ("the el ..." is unlikely, but harmless).
  s = s.replace(LEADING_ARTICLES, '').replace(LEADING_ARTICLES, '');
  return s.replace(/\s+/g, '');
}

/** Classic Levenshtein edit distance (small strings only). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** Typos we forgive: none for very short answers, one for medium, two for long. */
export function typoAllowance(len: number): number {
  if (len < 5) return 0;
  if (len < 9) return 1;
  return 2;
}

export function textMatches(answer: string, accepted: string[]): boolean {
  const a = canonical(answer);
  if (!a) return false;
  return accepted.some((acc) => {
    const c = canonical(acc);
    return a === c || editDistance(a, c) <= typoAllowance(c.length);
  });
}

/* ------------------------------------------------------------------ */
/* Number parsing (digits, English and Spanish words)                  */
/* ------------------------------------------------------------------ */

const EN_UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const EN_TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const ES_UNITS: Record<string, number> = {
  cero: 0, uno: 1, un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const ES_TENS: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};

/**
 * Parses "44", "44 years", "forty-four", "forty four", "cuarenta y cuatro",
 * "six", "seis"... Returns null when the input is not a number.
 */
export function parseNumber(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  // Digits first: allow thousands separators and trailing words ("44 years").
  const digitMatch = raw.replace(/(\d)[.,\s](?=\d{3}\b)/g, '$1').match(/-?\d+(?:[.,]\d+)?/);
  if (digitMatch) {
    const n = Number(digitMatch[0].replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  const words = normalizeText(raw)
    .replace(/-/g, ' ')
    .split(' ')
    .filter((w) => w && w !== 'and' && w !== 'y' && w !== 'years' && w !== 'anos' && w !== 'year');
  if (!words.length) return null;
  let total = 0;
  let seen = false;
  for (const w of words) {
    if (w in EN_UNITS) total += EN_UNITS[w]!;
    else if (w in EN_TENS) total += EN_TENS[w]!;
    else if (w in ES_UNITS) total += ES_UNITS[w]!;
    else if (w in ES_TENS) total += ES_TENS[w]!;
    else if (w === 'hundred' || w === 'cien' || w === 'ciento') total = (total || 1) * 100;
    else return null;
    seen = true;
  }
  return seen ? total : null;
}

/* ------------------------------------------------------------------ */
/* Cipher helpers                                                      */
/* ------------------------------------------------------------------ */

const A = 'A'.charCodeAt(0);

/** Shifts letters forward by the repeating key (spaces are kept, key advances on letters only). */
export function encipher(plain: string, key: number[]): string {
  let k = 0;
  return plain
    .toUpperCase()
    .split('')
    .map((ch) => {
      if (ch < 'A' || ch > 'Z') return ch;
      const shift = key[k++ % key.length]!;
      return String.fromCharCode(((ch.charCodeAt(0) - A + shift) % 26) + A);
    })
    .join('');
}

export function decipher(cipher: string, key: number[]): string {
  return encipher(cipher, key.map((s) => (26 - (s % 26)) % 26));
}

/* ------------------------------------------------------------------ */
/* Puzzle checking                                                     */
/* ------------------------------------------------------------------ */

export type Answer = string | string[];

export interface CheckResult {
  correct: boolean;
  /** A specific message for a recognised near-miss or wrong option. */
  feedback?: string;
  /** True when the input could not be interpreted (e.g. letters in a number field). */
  invalid?: boolean;
}

const GENERIC_WRONG = [
  'Not quite. Take another look.',
  'That’s not it — compare notes and try again.',
  'Still not it. A hint might help.',
];

export function genericWrong(attempt: number): string {
  return GENERIC_WRONG[Math.min(attempt, GENERIC_WRONG.length - 1)]!;
}

export function checkAnswer(puzzle: Puzzle, answer: Answer): CheckResult {
  switch (puzzle.type) {
    case 'number': {
      if (typeof answer !== 'string') return { correct: false, invalid: true };
      const n = parseNumber(answer);
      if (n === null) return { correct: false, invalid: true, feedback: 'Please enter a number.' };
      if (Math.abs(n - puzzle.answer) <= (puzzle.tolerance ?? 0)) return { correct: true };
      const near = puzzle.near?.find((x) => x.value === n);
      return { correct: false, feedback: near?.reply };
    }
    case 'text': {
      if (typeof answer !== 'string' || !normalizeText(answer)) return { correct: false, invalid: true };
      if (textMatches(answer, puzzle.accept)) return { correct: true };
      const near = puzzle.near?.find((x) => textMatches(answer, x.match));
      return { correct: false, feedback: near?.reply };
    }
    case 'cipher': {
      if (typeof answer !== 'string' || !normalizeText(answer)) return { correct: false, invalid: true };
      if (textMatches(answer, [puzzle.plaintext, ...puzzle.accept])) return { correct: true };
      const near = puzzle.near?.find((x) => textMatches(answer, x.match));
      return { correct: false, feedback: near?.reply };
    }
    case 'choice': {
      if (typeof answer !== 'string') return { correct: false, invalid: true };
      if (!puzzle.options.some((o) => o.id === answer)) return { correct: false, invalid: true };
      if (answer === puzzle.correct) return { correct: true };
      return { correct: false, feedback: puzzle.feedback[answer] };
    }
    case 'elimination': {
      if (typeof answer !== 'string') return { correct: false, invalid: true };
      if (!puzzle.candidates.some((c) => c.id === answer)) return { correct: false, invalid: true };
      if (answer === puzzle.correct) return { correct: true };
      return { correct: false, feedback: puzzle.feedback[answer] };
    }
    case 'order': {
      if (!Array.isArray(answer) || answer.length !== puzzle.correct.length) {
        return { correct: false, invalid: true, feedback: 'Place every name in a slot first.' };
      }
      const ok = answer.every((id, i) => id === puzzle.correct[i]);
      if (ok) return { correct: true };
      const right = answer.filter((id, i) => id === puzzle.correct[i]).length;
      return {
        correct: false,
        feedback: right === 0 ? 'None of the three is in the right place yet.' : `${right} of ${answer.length} in the right place.`,
      };
    }
    case 'code': {
      if (typeof answer !== 'string') return { correct: false, invalid: true };
      const digits = answer.replace(/\D/g, '');
      if (digits.length !== puzzle.code.length) return { correct: false, invalid: true, feedback: `The lock needs ${puzzle.code.length} digits.` };
      return { correct: digits === puzzle.code };
    }
  }
}

/** The canonical correct answer, for tests and for revealing after a skip. */
export function correctAnswerOf(puzzle: Puzzle): Answer {
  switch (puzzle.type) {
    case 'number':
      return String(puzzle.answer);
    case 'text':
      return puzzle.accept[0]!;
    case 'cipher':
      return puzzle.plaintext;
    case 'choice':
      return puzzle.correct;
    case 'elimination':
      return puzzle.correct;
    case 'order':
      return [...puzzle.correct];
    case 'code':
      return puzzle.code;
  }
}
