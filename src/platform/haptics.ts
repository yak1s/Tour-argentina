import { settings } from '../engine/store';

/** Subtle, optional vibration patterns. Silently does nothing where unsupported or disabled. */
const PATTERNS = {
  tap: [8],
  hint: [6, 40, 6],
  wrong: [14],
  reveal: [10, 50, 18],
  success: [16, 60, 28, 60, 40],
  arrival: [30, 90, 30, 90, 70],
} as const;

export type HapticKind = keyof typeof PATTERNS;

export function haptic(kind: HapticKind): void {
  if (!settings.value.haptics) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([...PATTERNS[kind]]);
  } catch {
    /* ignore */
  }
}

export function hapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}
