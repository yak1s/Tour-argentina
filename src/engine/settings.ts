/** User preferences, stored separately from game progress (a reset keeps them). */

export const SETTINGS_SCHEMA = 1;

export interface Settings {
  schema: typeof SETTINGS_SCHEMA;
  updatedAt: number;
  /** Start the chapter story automatically when arrival is confirmed. */
  autoplayStory: boolean;
  /** Narration volume, 0–1. */
  volume: number;
  /** Mutes narration, sound effects and ambience at once. */
  muted: boolean;
  /** Soft generated ambience under the narration. */
  ambience: boolean;
  ambienceVolume: number;
  /** Short sound effects (clue reveal, success, arrival). */
  sfx: boolean;
  /** Vibration feedback. */
  haptics: boolean;
  /** The players opted in to GPS (the browser permission is asked separately, in context). */
  location: boolean;
  /** Use the device compass for the direction arrow when available. */
  compass: boolean;
  /** Keep the screen awake while navigating (uses more battery). */
  keepAwake: boolean;
  /** Text size multiplier. */
  textScale: 1 | 1.12 | 1.25;
  /** Motion preference; 'system' follows the device's reduced-motion setting. */
  motion: 'system' | 'reduce' | 'full';
  /** 'night' = midnight-blue journal; 'sun' = high-contrast light theme for bright sunlight. */
  theme: 'night' | 'sun';
}

export function defaultSettings(now: number): Settings {
  return {
    schema: SETTINGS_SCHEMA,
    updatedAt: now,
    autoplayStory: false,
    volume: 0.9,
    muted: false,
    ambience: false,
    ambienceVolume: 0.35,
    sfx: true,
    haptics: true,
    location: false,
    compass: true,
    keepAwake: false,
    textScale: 1,
    motion: 'system',
    theme: 'night',
  };
}

function clamp01(n: unknown, fallback: number): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

/** Validates stored settings field by field; anything unknown falls back to the default. */
export function migrateSettings(raw: unknown, now: number): Settings {
  const d = defaultSettings(now);
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const bool = (k: keyof Settings) => (typeof r[k] === 'boolean' ? (r[k] as boolean) : (d[k] as boolean));
  return {
    schema: SETTINGS_SCHEMA,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : now,
    autoplayStory: bool('autoplayStory'),
    volume: clamp01(r.volume, d.volume),
    muted: bool('muted'),
    ambience: bool('ambience'),
    ambienceVolume: clamp01(r.ambienceVolume, d.ambienceVolume),
    sfx: bool('sfx'),
    haptics: bool('haptics'),
    location: bool('location'),
    compass: bool('compass'),
    keepAwake: bool('keepAwake'),
    textScale: r.textScale === 1.12 || r.textScale === 1.25 ? r.textScale : 1,
    motion: r.motion === 'reduce' || r.motion === 'full' ? r.motion : 'system',
    theme: r.theme === 'sun' ? 'sun' : 'night',
  };
}
