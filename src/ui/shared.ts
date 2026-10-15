import { signal } from '@preact/signals';

export function chapterLabel(n: number): string {
  if (n === 0) return 'Prologue';
  if (n === 9) return 'Finale';
  return `Chapter ${n} of 8`;
}

/** Timestamp of the current narrative "revelation" overlay (0 = none). */
export const revelation = signal(0);

/** Shows the brief silver-line transition used at major narrative turns. */
export function triggerRevelation(): void {
  const at = Date.now();
  revelation.value = at;
  setTimeout(() => {
    if (revelation.value === at) revelation.value = 0;
  }, 2700);
}
