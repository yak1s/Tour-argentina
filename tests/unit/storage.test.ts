import { describe, expect, it } from 'vitest';
import { loadValue, saveValue, deleteValue, addMemory, listMemories, deleteMemory } from '../../src/platform/db';
import { defaultSettings, migrateSettings } from '../../src/engine/settings';

describe('storage', () => {
  it('saves and loads values (IndexedDB with a localStorage mirror)', async () => {
    await saveValue('test', { a: 1, updatedAt: 5 });
    expect(await loadValue('test')).toEqual({ a: 1, updatedAt: 5 });
    expect(JSON.parse(localStorage.getItem('hidden-city:test')!)).toEqual({ a: 1, updatedAt: 5 });
    await deleteValue('test');
    expect(await loadValue('test')).toBeUndefined();
  });

  it('prefers whichever copy is newer, and the synchronous mirror on a tie', async () => {
    await saveValue('race', { v: 'idb', updatedAt: 10 });
    localStorage.setItem('hidden-city:race', JSON.stringify({ v: 'ls', updatedAt: 20 }));
    expect(await loadValue('race')).toEqual({ v: 'ls', updatedAt: 20 });
    localStorage.setItem('hidden-city:race', JSON.stringify({ v: 'tie', updatedAt: 10 }));
    expect(await loadValue('race')).toEqual({ v: 'tie', updatedAt: 10 });
    localStorage.setItem('hidden-city:race', JSON.stringify({ v: 'old', updatedAt: 5 }));
    expect(await loadValue('race')).toEqual({ v: 'idb', updatedAt: 10 });
  });

  it('stores photo memories as blobs', async () => {
    const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    await addMemory({ id: 'm1', chapter: 'colours', createdAt: 1, blob, width: 10, height: 10 });
    const list = await listMemories();
    expect(list.map((m) => m.id)).toContain('m1');
    await deleteMemory('m1');
    expect((await listMemories()).map((m) => m.id)).not.toContain('m1');
  });
});

describe('settings', () => {
  it('fills defaults and rejects invalid values', () => {
    const s = migrateSettings({ volume: 7, theme: 'neon', textScale: 3, motion: 'reduce', haptics: false }, 1);
    expect(s.volume).toBe(1);
    expect(s.theme).toBe('night');
    expect(s.textScale).toBe(1);
    expect(s.motion).toBe('reduce');
    expect(s.haptics).toBe(false);
    expect(migrateSettings(null, 1)).toEqual(defaultSettings(1));
  });

  it('never autoplays narration or turns on location by default', () => {
    const d = defaultSettings(0);
    expect(d.autoplayStory).toBe(false);
    expect(d.location).toBe(false);
    expect(d.ambience).toBe(false);
  });
});
