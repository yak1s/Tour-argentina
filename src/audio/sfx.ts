import { settings } from '../engine/store';
import { audioContext } from './context';

/**
 * Short, quiet sound effects rendered offline (scripts/generate-sfx.py) and
 * bundled with the app. Decoded once, played through Web Audio so they never
 * interrupt the narration.
 */
export const SFX = ['reveal', 'success', 'wrong', 'hint', 'arrival', 'stamp', 'page', 'finale'] as const;
export type SfxName = (typeof SFX)[number];

const buffers = new Map<SfxName, AudioBuffer>();
const loading = new Map<SfxName, Promise<AudioBuffer | null>>();

async function load(name: SfxName): Promise<AudioBuffer | null> {
  const cached = buffers.get(name);
  if (cached) return cached;
  const pending = loading.get(name);
  if (pending) return pending;
  const ctx = audioContext();
  if (!ctx) return null;
  const p = fetch(new URL(`audio/sfx/${name}.mp3`, document.baseURI).href)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((buf) => ctx.decodeAudioData(buf))
    .then((b) => {
      buffers.set(name, b);
      return b;
    })
    .catch(() => null);
  loading.set(name, p);
  return p;
}

/** Preloads all effects in the background (after the first user gesture). */
export function preloadSfx(): void {
  for (const n of SFX) void load(n);
}

export async function sfx(name: SfxName, gain = 1): Promise<void> {
  const s = settings.value;
  if (!s.sfx || s.muted) return;
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
  const buffer = await load(name);
  if (!buffer) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.value = Math.min(1, 0.55 * gain * Math.max(0.2, s.volume));
  src.connect(g).connect(ctx.destination);
  src.start();
}
