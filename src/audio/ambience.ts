import { effect } from '@preact/signals';
import { settings } from '../engine/store';
import { audioContext } from './context';
import { nowPlaying } from './narrator';

/**
 * Optional ambience, generated in real time (nothing to download): a slow,
 * filtered water-like texture with a very soft low drone — the river under
 * the city. It ducks well below the narration whenever a clip is playing.
 */
let nodes: { master: GainNode; stop: () => void } | null = null;

function brownNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    // Crossfade the loop point to avoid a click.
    const fade = Math.floor(ctx.sampleRate * 0.25);
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      data[i] = data[i]! * t + data[length - fade + i]! * (1 - t);
    }
  }
  return buffer;
}

function start(): void {
  const ctx = audioContext();
  if (!ctx || nodes) return;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const noise = ctx.createBufferSource();
  noise.buffer = brownNoise(ctx, 6);
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  lp.Q.value = 0.4;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 260;
  lfo.connect(lfoGain).connect(lp.frequency);
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.55;
  noise.connect(lp).connect(noiseGain).connect(master);

  const drone = ctx.createGain();
  drone.gain.value = 0.05;
  const oscs = [110, 164.81, 220.5].map((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = [0.6, 0.35, 0.18][i]!;
    o.connect(g).connect(drone);
    return o;
  });
  const trem = ctx.createOscillator();
  trem.frequency.value = 0.09;
  const tremGain = ctx.createGain();
  tremGain.gain.value = 0.025;
  trem.connect(tremGain).connect(drone.gain);
  drone.connect(master);

  noise.start();
  lfo.start();
  trem.start();
  oscs.forEach((o) => o.start());
  nodes = {
    master,
    stop: () => {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(0, t, 0.4);
      setTimeout(() => {
        [noise, lfo, trem, ...oscs].forEach((n) => {
          try {
            n.stop();
          } catch {
            /* already stopped */
          }
        });
        master.disconnect();
      }, 2000);
    },
  };
}

function targetGain(): number {
  const s = settings.value;
  if (!s.ambience || s.muted) return 0;
  const speaking = nowPlaying.value?.status === 'playing' || nowPlaying.value?.status === 'loading';
  return s.ambienceVolume * 0.22 * (speaking ? 0.25 : 1);
}

effect(() => {
  const s = settings.value;
  const gain = targetGain();
  if (s.ambience && !s.muted) {
    if (!nodes) start();
    const ctx = audioContext();
    if (nodes && ctx) nodes.master.gain.setTargetAtTime(gain, ctx.currentTime, 0.8);
  } else if (nodes) {
    nodes.stop();
    nodes = null;
  }
});
