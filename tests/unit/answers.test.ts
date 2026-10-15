import { describe, expect, it } from 'vitest';
import { PUZZLES } from '../../src/content';
import { canonical, checkAnswer, correctAnswerOf, editDistance, normalizeText, parseNumber, textMatches } from '../../src/engine/answers';

const P = (id: string) => PUZZLES[id]!;

describe('normalisation', () => {
  it('ignores case, accents, punctuation and leading articles', () => {
    expect(normalizeText('  Don QUIJOTE, de la Mancha! ')).toBe('don quijote de la mancha');
    expect(canonical('The Río de la Plata')).toBe('riodelaplata');
    expect(canonical('el río de la plata')).toBe('riodelaplata');
    expect(normalizeText('Córdoba')).toBe('cordoba');
  });

  it('measures edit distance', () => {
    expect(editDistance('silver', 'silver')).toBe(0);
    expect(editDistance('silver', 'silvr')).toBe(1);
    expect(editDistance('quixote', 'quijote')).toBe(1);
  });

  it('forgives small typos only in longer words', () => {
    expect(textMatches('Quixotte', ['Quixote'])).toBe(true);
    expect(textMatches('Galo', ['Gallo'])).toBe(true);
    expect(textMatches('Gold', ['Plata'])).toBe(false);
    expect(textMatches('', ['Gallo'])).toBe(false);
  });
});

describe('number parsing', () => {
  it.each([
    ['44', 44],
    [' 44 years', 44],
    ['forty-four', 44],
    ['Forty four', 44],
    ['cuarenta y cuatro', 44],
    ['six', 6],
    ['seis', 6],
    ['1,412', 1412],
    ['once', 11],
  ])('%s → %s', (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });

  it('returns null for non-numbers', () => {
    expect(parseNumber('banana')).toBeNull();
    expect(parseNumber('')).toBeNull();
  });
});

describe('every puzzle accepts its own correct answer', () => {
  for (const p of Object.values(PUZZLES)) {
    it(p.id, () => {
      expect(checkAnswer(p, correctAnswerOf(p)).correct).toBe(true);
    });
  }
});

describe('specific puzzles', () => {
  it('corner: accepts surname variants, explains near misses', () => {
    const p = P('p-corner');
    for (const a of ['Gallo', 'gallo', 'GALLO', 'Pedro León Gallo', 'pedro leon gallo']) expect(checkAnswer(p, a).correct, a).toBe(true);
    const r = checkAnswer(p, 'Córdoba');
    expect(r.correct).toBe(false);
    expect(r.feedback).toMatch(/avenue/i);
    expect(checkAnswer(p, 'Delfín Gallo').feedback).toMatch(/different man/i);
  });

  it('key: the lock needs exactly 1412', () => {
    const p = P('p-key');
    expect(checkAnswer(p, '1412').correct).toBe(true);
    expect(checkAnswer(p, '1 4 1 2').correct).toBe(true);
    expect(checkAnswer(p, '2141').correct).toBe(false);
    expect(checkAnswer(p, '141').invalid).toBe(true);
  });

  it('architects: correct order only, with partial feedback', () => {
    const p = P('p-architects');
    expect(checkAnswer(p, ['tamburini', 'meano', 'dormal']).correct).toBe(true);
    const wrong = checkAnswer(p, ['tamburini', 'dormal', 'meano']);
    expect(wrong.correct).toBe(false);
    expect(wrong.feedback).toMatch(/1 of 3/);
    expect(checkAnswer(p, ['tamburini']).invalid).toBe(true);
  });

  it('foundings: 44 in digits or words; specific feedback for 39 and 400', () => {
    const p = P('p-foundings');
    for (const a of ['44', 'forty-four', 'cuarenta y cuatro']) expect(checkAnswer(p, a).correct, a).toBe(true);
    expect(checkAnswer(p, '39').feedback).toMatch(/1541/);
    expect(checkAnswer(p, '400').feedback).toMatch(/anniversary/);
    expect(checkAnswer(p, 'many').invalid).toBe(true);
  });

  it('arches: 6, with feedback for 5 and 11', () => {
    const p = P('p-arches');
    expect(checkAnswer(p, '6').correct).toBe(true);
    expect(checkAnswer(p, 'six').correct).toBe(true);
    expect(checkAnswer(p, '5').feedback).toMatch(/left/);
    expect(checkAnswer(p, '11').feedback).toMatch(/there were/);
  });

  it('message: accepts the decoded sentence with or without spaces', () => {
    const p = P('p-message');
    for (const a of ['I AM NOT A PERSON', 'i am not a person', 'iamnotaperson', "I'm not a person", 'not a person', 'I AM NOT A PERSN']) {
      expect(checkAnswer(p, a).correct, a).toBe(true);
    }
    expect(checkAnswer(p, 'J EN PPX B RFVTQO').correct).toBe(false);
  });

  it('tale: only the tango statement is the tale; wrong options are explained', () => {
    const p = P('p-tale');
    expect(checkAnswer(p, 'tango').correct).toBe(true);
    for (const id of ['railway', 'metal', 'bridge']) {
      const r = checkAnswer(p, id);
      expect(r.correct).toBe(false);
      expect(r.feedback).toMatch(/true/i);
    }
    expect(checkAnswer(p, 'nonsense').invalid).toBe(true);
  });

  it('tiles: Don Quixote in English or Spanish; author is a near miss', () => {
    const p = P('p-tiles');
    for (const a of ['Don Quixote', 'don quijote', 'El Quijote', 'Quixote', 'Don Quixote de la Mancha']) expect(checkAnswer(p, a).correct, a).toBe(true);
    expect(checkAnswer(p, 'Cervantes').feedback).toMatch(/author/);
    expect(checkAnswer(p, 'Martin Fierro').feedback).toMatch(/Seville/);
  });

  it('silver: accepts silver/plata; materials and greys get nudges', () => {
    const p = P('p-silver');
    for (const a of ['silver', 'Plata', 'plateado', 'Silver colour']) expect(checkAnswer(p, a).correct, a).toBe(true);
    expect(checkAnswer(p, 'steel').feedback).toMatch(/made of/);
    expect(checkAnswer(p, 'grey').feedback).toMatch(/precious/);
    expect(checkAnswer(p, 'gold').correct).toBe(false);
  });

  it('voice: the river, with explanations for every other suspect', () => {
    const p = P('p-voice');
    expect(checkAnswer(p, 'river').correct).toBe(true);
    for (const id of ['porteno', 'garay', 'city', 'wind', 'obelisco']) {
      const r = checkAnswer(p, id);
      expect(r.correct).toBe(false);
      expect(r.feedback && r.feedback.length).toBeGreaterThan(20);
    }
  });

  it('wrong input types never throw', () => {
    for (const p of Object.values(PUZZLES)) {
      expect(() => checkAnswer(p, [])).not.toThrow();
      expect(() => checkAnswer(p, '')).not.toThrow();
      expect(() => checkAnswer(p, '   ')).not.toThrow();
      expect(checkAnswer(p, '').correct).toBe(false);
    }
  });
});
