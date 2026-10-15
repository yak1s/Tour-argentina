#!/usr/bin/env python3
"""
Synthesises the app's short sound effects (bells, paper, a stamp) with numpy
and encodes them as small MP3 files in public/audio/sfx. Deterministic (fixed
random seed). Requires numpy and ffmpeg.

Usage: python3 scripts/generate-sfx.py
"""
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parents[1] / "public" / "audio" / "sfx"
rng = np.random.default_rng(1536)


def t(sec: float) -> np.ndarray:
    return np.arange(int(SR * sec)) / SR


def env(n: int, attack: float, decay: float) -> np.ndarray:
    x = np.arange(n) / SR
    a = np.clip(x / max(attack, 1e-4), 0, 1)
    return a * np.exp(-x / decay)


def bell(freq: float, dur: float, decay: float = 0.9, gain: float = 1.0) -> np.ndarray:
    x = t(dur)
    partials = [(1.0, 1.0), (2.0, 0.42), (2.76, 0.26), (5.4, 0.12), (8.93, 0.05)]
    y = sum(a * np.sin(2 * np.pi * freq * r * x) * np.exp(-x / (decay / (1 + 0.6 * i))) for i, (r, a) in enumerate(partials))
    return gain * y * env(len(x), 0.004, 10.0)


def noise(dur: float) -> np.ndarray:
    return rng.standard_normal(int(SR * dur))


def lowpass(y: np.ndarray, cutoff: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * cutoff / SR)
    out = np.zeros_like(y)
    acc = 0.0
    for i, v in enumerate(y):
        acc = (1 - a) * v + a * acc
        out[i] = acc
    return out


def highpass(y: np.ndarray, cutoff: float) -> np.ndarray:
    return y - lowpass(y, cutoff)


def reverb(y: np.ndarray, length: float = 0.9, mix: float = 0.22) -> np.ndarray:
    ir = rng.standard_normal(int(SR * length)) * np.exp(-t(length) / (length / 4.5))
    ir /= np.sqrt(np.sum(ir**2))
    wet = np.convolve(y, ir)[: len(y) + len(ir) - 1]
    dry = np.concatenate([y, np.zeros(len(ir) - 1)])
    return (1 - mix) * dry + mix * wet


def place(total: float, *parts: tuple[float, np.ndarray]) -> np.ndarray:
    out = np.zeros(int(SR * total))
    for start, sig in parts:
        i = int(SR * start)
        j = min(len(out), i + len(sig))
        out[i:j] += sig[: j - i]
    return out


def normalize(y: np.ndarray, peak_db: float) -> np.ndarray:
    peak = np.max(np.abs(y)) or 1.0
    y = y / peak * (10 ** (peak_db / 20))
    fade = int(SR * 0.02)
    y[-fade:] *= np.linspace(1, 0, fade)
    return y


def write(name: str, y: np.ndarray, peak_db: float = -3.0) -> None:
    y = normalize(y, peak_db)
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16)
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        wav_path = Path(td) / f"{name}.wav"
        with wave.open(str(wav_path), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav_path), "-ac", "1", "-ar", str(SR), "-c:a", "libmp3lame", "-b:a", "96k", str(OUT / f"{name}.mp3")],
            check=True,
        )
    print(f"{name}.mp3  {len(y) / SR:.2f}s")


# Paper slide + a small high bell: a clue is revealed.
paper = highpass(noise(0.22), 1800) * env(int(SR * 0.22), 0.02, 0.07) * 0.5
write("reveal", reverb(place(1.4, (0.0, paper), (0.06, bell(1318.5, 1.2, 0.5, 0.6))), 0.8, 0.2), -6)

# Two warm notes, rising a fifth: solved.
write("success", reverb(place(2.2, (0.0, bell(659.25, 1.8, 0.7)), (0.16, bell(987.77, 2.0, 0.8, 0.85))), 1.2, 0.25), -4)

# A soft, low wooden knock: not quite (never harsh).
knock = np.sin(2 * np.pi * 190 * t(0.18)) * env(int(SR * 0.18), 0.002, 0.04) + lowpass(noise(0.18), 900) * env(int(SR * 0.18), 0.001, 0.015) * 0.6
write("wrong", place(0.35, (0.0, knock)), -10)

# A tiny tick and airy chime: a hint.
tick = highpass(noise(0.03), 3000) * env(int(SR * 0.03), 0.001, 0.006)
write("hint", reverb(place(1.0, (0.0, tick), (0.03, bell(1760.0, 0.9, 0.35, 0.45))), 0.6, 0.25), -9)

# Three-note motif: arrival.
write(
    "arrival",
    reverb(place(2.6, (0.0, bell(392.0, 2.2, 0.9)), (0.22, bell(587.33, 2.2, 0.9, 0.85)), (0.44, bell(783.99, 2.2, 1.0, 0.8))), 1.4, 0.28),
    -4,
)

# Rubber stamp on paper: a low thump with a crackle.
x = t(0.2)
thump = np.sin(2 * np.pi * (60 + 90 * np.exp(-x / 0.03)) * x) * env(len(x), 0.002, 0.06)
crackle = highpass(noise(0.12), 2500) * env(int(SR * 0.12), 0.001, 0.025) * 0.35
write("stamp", place(0.45, (0.0, thump), (0.005, crackle)), -6)

# A page turning.
n = int(SR * 0.32)
sweep = highpass(noise(0.32), 900) * np.sin(np.linspace(0, np.pi, n)) ** 2
write("page", lowpass(sweep, 5000) * 0.8, -12)

# The finale: a slow, open chord of bells.
chord = place(
    5.0,
    (0.0, bell(261.63, 4.5, 1.6)),
    (0.35, bell(392.0, 4.2, 1.5, 0.8)),
    (0.7, bell(523.25, 4.0, 1.4, 0.7)),
    (1.05, bell(659.25, 3.8, 1.3, 0.6)),
    (1.4, bell(987.77, 3.4, 1.2, 0.45)),
)
write("finale", reverb(chord, 1.8, 0.3), -4)
