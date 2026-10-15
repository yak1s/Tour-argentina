/** One shared Web Audio context, created lazily and resumed on the first user gesture. */
let ctx: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
    | typeof AudioContext
    | undefined;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Browsers only allow audio after a user gesture; call this from one. */
export function unlockAudio(): void {
  const c = audioContext();
  if (c && c.state === 'suspended') void c.resume().catch(() => undefined);
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
