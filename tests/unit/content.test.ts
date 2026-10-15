import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AUDIO_MANIFEST,
  CHAPTERS,
  CHAPTER_IDS,
  LEGS,
  NARRATION,
  PUZZLES,
  WAYPOINTS,
  allThreads,
  transcriptOf,
} from '../../src/content';
import { isInBuenosAires, distanceM } from '../../src/geo/math';
import { decipher, encipher } from '../../src/engine/answers';
import { scriptHash } from '../../scripts/script-hash';

const ROOT = resolve(__dirname, '../..');

describe('chapters', () => {
  it('have unique ids and start with the prologue and end with the finale', () => {
    expect(new Set(CHAPTER_IDS).size).toBe(CHAPTER_IDS.length);
    expect(CHAPTER_IDS[0]).toBe('prologue');
    expect(CHAPTER_IDS[CHAPTER_IDS.length - 1]).toBe('finale');
    CHAPTERS.forEach((c, i) => expect(c.number).toBe(i));
  });

  it('begin and end at Córdoba y Gallo and include Ayacucho 1412 as an explicit waypoint', () => {
    expect(CHAPTERS[0]!.waypoint).toBe('start');
    expect(CHAPTERS[CHAPTERS.length - 1]!.waypoint).toBe('start');
    const key = CHAPTERS.find((c) => c.waypoint === 'ayacucho');
    expect(key).toBeDefined();
    expect(key!.puzzleId).toBe('p-key');
    expect(WAYPOINTS.ayacucho.address).toContain('Ayacucho 1412');
  });

  it('visit every required destination', () => {
    const visited = CHAPTERS.map((c) => c.waypoint);
    for (const w of ['colon', 'obelisco', 'plaza-de-mayo', 'san-telmo', 'caminito', 'rosedal', 'floralis', 'ayacucho', 'start'] as const) {
      expect(visited).toContain(w);
    }
  });

  it('link each stop to a leg arriving from the previous stop', () => {
    for (let i = 1; i < CHAPTERS.length; i++) {
      const c = CHAPTERS[i]!;
      const prev = CHAPTERS[i - 1]!;
      const leg = LEGS[c.legId!];
      expect(leg, `${c.id} leg`).toBeDefined();
      expect(leg!.to).toBe(c.waypoint);
      expect(leg!.from).toBe(prev.waypoint);
    }
  });

  it('give complete arrival guidance and alternatives', () => {
    for (const c of CHAPTERS) {
      expect(c.arrival.whereToStand.length).toBeGreaterThan(10);
      expect(c.arrival.lookFor.length).toBeGreaterThan(5);
      expect(c.arrival.startAction.length).toBeGreaterThan(5);
      expect(c.intro.length).toBeGreaterThan(40);
      expect(c.transition.length).toBeGreaterThan(5);
      expect(c.alternatives.length).toBeGreaterThan(0);
      expect(c.narration.length).toBeGreaterThan(0);
      if (c.id !== 'prologue' && c.id !== 'finale') expect(c.skippable).toBe(true);
    }
  });

  it('carry one narrator thread per stop (nine in total)', () => {
    const threads = allThreads();
    expect(threads).toHaveLength(9);
    expect(new Set(threads.map((t) => t.thread.id)).size).toBe(9);
    for (const c of CHAPTERS.filter((c) => c.id !== 'finale')) expect(c.thread, c.id).toBeDefined();
  });

  it('label every fact with a certainty and a source', () => {
    const ids = new Set<string>();
    for (const c of CHAPTERS) {
      expect(c.facts.length).toBeGreaterThan(0);
      for (const f of c.facts) {
        expect(ids.has(f.id), f.id).toBe(false);
        ids.add(f.id);
        expect(['documented', 'disputed', 'tradition']).toContain(f.certainty);
        expect(f.source.length).toBeGreaterThan(5);
      }
    }
  });
});

describe('waypoints and legs', () => {
  it('have coordinates inside Buenos Aires with sensible arrival radii', () => {
    for (const w of Object.values(WAYPOINTS)) {
      expect(isInBuenosAires(w.coords), w.id).toBe(true);
      expect(w.arrivalRadiusM).toBeGreaterThanOrEqual(50);
      expect(w.arrivalRadiusM).toBeLessThanOrEqual(250);
      expect(w.coordsNote.length).toBeGreaterThan(20);
      if (w.precision === 'approximate') expect(w.coordsNote.toLowerCase()).toContain('approximate');
    }
  });

  it('keep known geographic relationships (sanity checks against verified points)', () => {
    // Teatro Colón → Obelisco is about 350 m; Obelisco → Plaza de Mayo about 1 km.
    expect(distanceM(WAYPOINTS.colon.coords, WAYPOINTS.obelisco.coords)).toBeGreaterThan(250);
    expect(distanceM(WAYPOINTS.colon.coords, WAYPOINTS.obelisco.coords)).toBeLessThan(450);
    expect(distanceM(WAYPOINTS.obelisco.coords, WAYPOINTS['plaza-de-mayo'].coords)).toBeGreaterThan(850);
    expect(distanceM(WAYPOINTS.obelisco.coords, WAYPOINTS['plaza-de-mayo'].coords)).toBeLessThan(1150);
    // Córdoba y Gallo lies west of the Teatro Colón (not south).
    expect(WAYPOINTS.start.coords.lng).toBeLessThan(WAYPOINTS.colon.coords.lng - 0.02);
    // La Boca and the Palermo rose garden are far apart (the plan's 4.8 km was too short).
    expect(distanceM(WAYPOINTS.caminito.coords, WAYPOINTS.rosedal.coords)).toBeGreaterThan(7500);
  });

  it('separate walking and taxi guidance and give a reason for the recommendation', () => {
    for (const leg of Object.values(LEGS)) {
      expect(leg.why.length).toBeGreaterThan(5);
      if (leg.recommended === 'walk') expect(leg.walk).toBeDefined();
      if (leg.recommended === 'taxi') expect(leg.taxi).toBeDefined();
      if (leg.walk) {
        expect(leg.walk.steps.length).toBeGreaterThan(0);
        expect(leg.walk.minutes[0]).toBeLessThanOrEqual(leg.walk.minutes[1]);
      }
      if (leg.taxi) {
        expect(leg.taxi.tellDriver.length).toBeGreaterThan(5);
        expect(leg.taxi.minutes[0]).toBeLessThanOrEqual(leg.taxi.minutes[1]);
      }
      expect(leg.safety.length).toBeGreaterThan(0);
    }
  });

  it('recommend a taxi for La Boca and for the long cross-city legs', () => {
    expect(LEGS['santelmo-caminito']!.recommended).toBe('taxi');
    expect(LEGS['caminito-rosedal']!.recommended).toBe('taxi');
    expect(LEGS['caminito-rosedal']!.taxi!.distanceKm[0]).toBeGreaterThan(8);
  });
});

describe('religious places are excluded', () => {
  const RELIGIOUS = /\b(church|cathedral|catedral|iglesia|bas[ií]lica|parroquia|chapel|capilla|convent|convento|monastery|monasterio|synagogue|sinagoga|mosque|mezquita|temple|templo|chabad|jabad|shrine|santuario)\b/i;
  it('no destination, direction, challenge or narration refers to one', () => {
    const texts: string[] = [];
    for (const w of Object.values(WAYPOINTS)) texts.push(w.name, w.description, w.address, w.access);
    for (const leg of Object.values(LEGS)) texts.push(JSON.stringify(leg));
    for (const c of CHAPTERS) texts.push(JSON.stringify(c));
    for (const p of Object.values(PUZZLES)) texts.push(JSON.stringify(p));
    for (const n of Object.values(NARRATION)) texts.push(n.script);
    for (const t of texts) expect(t).not.toMatch(RELIGIOUS);
  });
});

describe('puzzles', () => {
  it('each belong to exactly one chapter and have graduated hints, a fallback and a solution', () => {
    const referenced = CHAPTERS.flatMap((c) => (c.puzzleId ? [c.puzzleId] : []));
    expect(new Set(referenced).size).toBe(referenced.length);
    expect(new Set(referenced)).toEqual(new Set(Object.keys(PUZZLES)));
    for (const p of Object.values(PUZZLES)) {
      expect(CHAPTERS.find((c) => c.puzzleId === p.id)!.id).toBe(p.chapter);
      expect(p.hints.length, p.id).toBeGreaterThanOrEqual(3);
      expect(p.fallback.length).toBeGreaterThan(10);
      expect(p.solution.length).toBeGreaterThan(10);
      expect(p.intended.length).toBeGreaterThan(10);
      expect(p.setup.length).toBeGreaterThan(0);
    }
  });

  it('use a variety of mechanics', () => {
    const types = new Set(Object.values(PUZZLES).map((p) => p.type));
    expect(types.size).toBeGreaterThanOrEqual(6);
  });

  it('cipher text matches its plaintext under the Ayacucho key', () => {
    const p = PUZZLES['p-message']!;
    if (p.type !== 'cipher') throw new Error('expected cipher');
    expect(p.key.join('')).toBe('1412');
    expect(encipher(p.plaintext, p.key)).toBe(p.ciphertext);
    expect(decipher(p.ciphertext, p.key)).toBe(p.plaintext);
  });

  it('final elimination explains every wrong suspect', () => {
    const p = PUZZLES['p-voice']!;
    if (p.type !== 'elimination') throw new Error('expected elimination');
    for (const c of p.candidates) if (c.id !== p.correct) expect(p.feedback[c.id], c.id).toBeTruthy();
    expect(p.candidates.some((c) => c.id === p.correct)).toBe(true);
  });

  it('choice and order puzzles reference real options', () => {
    for (const p of Object.values(PUZZLES)) {
      if (p.type === 'choice') {
        expect(p.options.some((o) => o.id === p.correct)).toBe(true);
        for (const o of p.options) if (o.id !== p.correct) expect(p.feedback[o.id], o.id).toBeTruthy();
      }
      if (p.type === 'order') {
        expect(p.correct).toHaveLength(p.slots.length);
        expect(new Set(p.correct)).toEqual(new Set(p.items.map((i) => i.id)));
      }
    }
  });
});

describe('narration', () => {
  it('every referenced clip exists', () => {
    const refs = new Set<string>();
    for (const c of CHAPTERS) c.narration.forEach((n) => refs.add(n));
    for (const p of Object.values(PUZZLES)) if (p.solvedNarration) refs.add(p.solvedNarration);
    for (const r of refs) expect(NARRATION[r], r).toBeDefined();
  });

  it('every clip has a bundled, up-to-date recording', () => {
    for (const clip of Object.values(NARRATION)) {
      const entry = AUDIO_MANIFEST[clip.id];
      expect(entry, `${clip.id} has no recording`).toBeDefined();
      expect(entry!.scriptHash, `${clip.id} recording is stale — re-render narration`).toBe(scriptHash(clip.script));
      const file = resolve(ROOT, 'public', entry!.file);
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(20_000);
      expect(entry!.durationSec).toBeGreaterThan(10);
    }
  });

  it('transcripts drop pronunciation markup', () => {
    expect(transcriptOf('Welcome to the [[Teatro Colón]] and [[9 de Julio|nueve de julio]], {{1412|fourteen twelve}}.')).toBe(
      'Welcome to the Teatro Colón and 9 de Julio, 1412.',
    );
    expect(transcriptOf('[[Prebisch|/pɾeβˈiʃ/]]')).toBe('Prebisch');
    expect(transcriptOf(`Yes. I'm the river. The name means "the mouth".`)).toBe('Yes. I’m the river. The name means “the mouth”.');
    expect(transcriptOf(`Cervantes' knight`)).toBe('Cervantes’ knight');
    for (const clip of Object.values(NARRATION)) {
      const t = transcriptOf(clip.script);
      expect(t).not.toMatch(/\[\[|\]\]|\{\{|\}\}/);
    }
  });
});
