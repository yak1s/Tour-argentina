import { effect, signal } from '@preact/signals';
import { AUDIO_MANIFEST, clipById, transcriptOf } from '../content';
import { settings } from '../engine/store';

/**
 * Narration playback. There is exactly one narration channel: starting a clip
 * stops whatever was playing, so narrations never overlap — even when the
 * players move between screens. Playback continues across screens until it
 * ends or the players stop it (the mini-player stays visible).
 *
 * Files are fetched (from the offline cache via the service worker) and played
 * from a Blob URL, which avoids partial-content (Range) quirks and lets us
 * report a missing or corrupt file clearly. If a file can't be played, the UI
 * offers the transcript and, where available, the device's own voice.
 */
export type NarrationStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface NowPlaying {
  clipId: string;
  title: string;
  status: NarrationStatus;
  position: number;
  duration: number;
  error?: string;
  deviceVoice?: boolean;
}

export const nowPlaying = signal<NowPlaying | null>(null);

let audio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let token = 0;

function patch(p: Partial<NowPlaying>): void {
  if (nowPlaying.value) nowPlaying.value = { ...nowPlaying.value, ...p };
}

function effectiveVolume(): number {
  const s = settings.value;
  return s.muted ? 0 : Math.max(0, Math.min(1, s.volume));
}

function element(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio();
  a.preload = 'auto';
  a.addEventListener('timeupdate', () => patch({ position: a.currentTime }));
  a.addEventListener('loadedmetadata', () => patch({ duration: Number.isFinite(a.duration) ? a.duration : 0 }));
  a.addEventListener('play', () => patch({ status: 'playing', error: undefined }));
  a.addEventListener('pause', () => {
    if (nowPlaying.value?.status !== 'ended' && !a.ended) patch({ status: 'paused' });
  });
  a.addEventListener('ended', () => patch({ status: 'ended', position: a.duration || 0 }));
  a.addEventListener('error', () => {
    if (nowPlaying.value && !nowPlaying.value.deviceVoice) {
      patch({ status: 'error', error: 'This recording could not be played. The transcript is below.' });
    }
  });
  audio = a;
  return a;
}

effect(() => {
  const v = effectiveVolume();
  if (audio) audio.volume = v;
});

function stopDeviceVoice(): void {
  try {
    if (typeof speechSynthesis !== 'undefined' && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

function setMediaSession(title: string): void {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: 'The Hidden City',
      album: 'Buenos Aires: The Hidden City',
      artwork: [{ src: new URL('icons/icon-512.png', document.baseURI).href, sizes: '512x512', type: 'image/png' }],
    });
    navigator.mediaSession.setActionHandler('play', () => void resume());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => skip(-10));
    navigator.mediaSession.setActionHandler('seekforward', () => skip(10));
    navigator.mediaSession.setActionHandler('stop', () => stop());
  } catch {
    /* ignore */
  }
}

export function hasRecording(clipId: string): boolean {
  return Boolean(AUDIO_MANIFEST[clipId]?.file);
}

/** Plays a clip from the beginning (or resumes it if it is the paused clip). */
export async function play(clipId: string): Promise<void> {
  const clip = clipById(clipId);
  if (!clip) return;
  const np = nowPlaying.value;
  if (np && np.clipId === clipId && np.status === 'paused' && !np.deviceVoice) {
    await resume();
    return;
  }
  stopDeviceVoice();
  const a = element();
  a.pause();
  const my = ++token;
  const entry = AUDIO_MANIFEST[clipId];
  nowPlaying.value = { clipId, title: clip.title, status: 'loading', position: 0, duration: entry?.durationSec ?? 0 };
  if (!entry) {
    nowPlaying.value = { ...nowPlaying.value, status: 'error', error: 'No recording for this part. The transcript is below.' };
    return;
  }
  try {
    const res = await fetch(new URL(entry.file, document.baseURI).href);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (my !== token) return; // another clip was requested meanwhile
    if (blob.size < 1024) throw new Error('empty file');
    const url = URL.createObjectURL(blob);
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = url;
    a.src = url;
    a.volume = effectiveVolume();
    a.currentTime = 0;
    setMediaSession(clip.title);
    try {
      await a.play();
    } catch (err) {
      if (my !== token) return;
      // Autoplay policies: the browser wants a tap first.
      patch({ status: 'paused', error: (err as DOMException)?.name === 'NotAllowedError' ? 'Tap play to listen.' : undefined });
    }
  } catch {
    if (my !== token) return;
    patch({ status: 'error', error: 'This recording isn’t available on this device. The transcript is below.' });
  }
}

export async function resume(): Promise<void> {
  const np = nowPlaying.value;
  if (!np) return;
  if (np.deviceVoice) {
    try {
      speechSynthesis.resume();
      patch({ status: 'playing' });
    } catch {
      /* ignore */
    }
    return;
  }
  if (!audio || !audio.src) {
    await play(np.clipId);
    return;
  }
  if (np.status === 'ended') audio.currentTime = 0;
  try {
    await audio.play();
  } catch {
    patch({ status: 'paused', error: 'Tap play to listen.' });
  }
}

export function pause(): void {
  const np = nowPlaying.value;
  if (np?.deviceVoice) {
    try {
      speechSynthesis.pause();
    } catch {
      /* ignore */
    }
    patch({ status: 'paused' });
    return;
  }
  audio?.pause();
}

export function toggle(clipId?: string): void {
  const np = nowPlaying.value;
  if (clipId && np?.clipId !== clipId) {
    void play(clipId);
    return;
  }
  if (np?.status === 'playing') pause();
  else if (np) void resume();
}

export function replay(): void {
  const np = nowPlaying.value;
  if (!np) return;
  if (np.deviceVoice) {
    speakWithDeviceVoice(np.clipId);
    return;
  }
  if (audio && audio.src) {
    audio.currentTime = 0;
    void audio.play().catch(() => patch({ status: 'paused' }));
  } else void play(np.clipId);
}

export function skip(seconds: number): void {
  if (!audio || !audio.src || nowPlaying.value?.deviceVoice) return;
  const d = Number.isFinite(audio.duration) ? audio.duration : 0;
  audio.currentTime = Math.max(0, Math.min(d || Infinity, audio.currentTime + seconds));
}

export function seek(seconds: number): void {
  if (!audio || !audio.src || nowPlaying.value?.deviceVoice) return;
  audio.currentTime = Math.max(0, seconds);
}

export function stop(): void {
  token++;
  stopDeviceVoice();
  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  nowPlaying.value = null;
}

export function deviceVoiceAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Fallback: reads the transcript with the device's own speech engine. Which
 * voices exist (and whether they work offline) depends on the device, so this
 * is only offered when a recording can't be played.
 */
export function speakWithDeviceVoice(clipId: string): void {
  const clip = clipById(clipId);
  if (!clip || !deviceVoiceAvailable()) return;
  token++;
  audio?.pause();
  stopDeviceVoice();
  const text = transcriptOf(clip.script);
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  u.voice = english.find((v) => v.localService) ?? english[0] ?? null;
  u.lang = u.voice?.lang ?? 'en-US';
  u.rate = 0.95;
  u.volume = effectiveVolume();
  nowPlaying.value = { clipId, title: clip.title, status: 'playing', position: 0, duration: 0, deviceVoice: true };
  u.onend = () => patch({ status: 'ended' });
  u.onerror = () => patch({ status: 'error', error: 'The device voice is not available. Please read the transcript.' });
  speechSynthesis.speak(u);
}
