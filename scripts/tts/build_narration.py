#!/usr/bin/env python3
"""
Renders the tour narration to MP3 with Kokoro-82M (Apache-2.0), an open
neural text-to-speech model that runs locally on CPU via ONNX Runtime.

Inputs:
  scripts/tts/narration.json      (from `npm run narration:export`)
  models/kokoro-v1.0.onnx, models/voices-v1.0.bin
      (from https://github.com/thewh1teagle/kokoro-onnx/releases, tag model-files-v1.0;
       pass --models DIR if they live elsewhere)
Outputs:
  public/audio/narration/<clip>.mp3
  src/content/audio-manifest.json (clip -> file, duration, script hash, voice)

Pronunciation: English text is phonemised with espeak-ng (en-us). Text in
[[double brackets]] is phonemised as Latin-American Spanish and adjusted to
Rioplatense "sheísmo" (ll/y pronounced "sh", as in Buenos Aires). [[shown|spoken]]
uses `spoken`; [[shown|/ipa/]] uses the given phonemes; {{shown|spoken}} is an
English respelling.

Usage:
  python scripts/tts/build_narration.py [--only id1,id2] [--force] [--models DIR]
Requires: pip install kokoro-onnx soundfile ; ffmpeg on PATH.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[2]
NARRATION_JSON = ROOT / "scripts" / "tts" / "narration.json"
OUT_DIR = ROOT / "public" / "audio" / "narration"
MANIFEST = ROOT / "src" / "content" / "audio-manifest.json"

VOICE = "af_heart"
SPEED = 0.86
SAMPLE_RATE = 24000
PARAGRAPH_PAUSE = 0.62
LEAD_IN = 0.18
TAIL = 0.45

TOKEN = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\{\{([^}|]+)(?:\|([^}]+))?\}\}")
ONLY_PUNCT = re.compile(r"^[\s.,;:!?…—\-\"'“”‘’()]*$")


def tidy(text: str) -> str:
    return (
        text.replace("’", "'")
        .replace("‘", "'")
        .replace("“", '"')
        .replace("”", '"')
        .replace("—", ", ")
        .replace("–", "-")
    )


class Phonemizer:
    def __init__(self, kokoro: Kokoro):
        self.tok = kokoro.tokenizer
        self.vocab = set(self.tok.vocab.keys())

    def english(self, text: str) -> str:
        if len(text) > 2 and text.startswith("/") and text.endswith("/"):
            return text[1:-1]
        text = tidy(text)
        if ONLY_PUNCT.match(text):
            return "".join(ch for ch in text if ch in ".,;:!?") + (" " if text.endswith(" ") else "")
        lead = " " if text[:1].isspace() else ""
        trail = " " if text[-1:].isspace() else ""
        ph = self.tok.phonemize(text.strip(), "en-us").strip()
        return f"{lead}{ph}{trail}"

    def spanish(self, text: str) -> str:
        if text.startswith("/") and text.endswith("/"):
            return text[1:-1]
        ph = self.tok.phonemize(tidy(text), "es-419").strip()
        # Rioplatense sheísmo: ll / y -> [ʃ]
        ph = ph.replace("jj", "ʃ").replace("ʝ", "ʃ").replace("ʎ", "ʃ")
        return ph

    def paragraph(self, para: str) -> str:
        out: list[str] = []
        pos = 0
        for m in TOKEN.finditer(para):
            if m.start() > pos:
                out.append(self.english(para[pos : m.start()]))
            if m.group(1) is not None:
                out.append(self.spanish(m.group(2) or m.group(1)))
            else:
                out.append(self.english(m.group(4) or m.group(3)))
            pos = m.end()
        if pos < len(para):
            out.append(self.english(para[pos:]))
        joined = "".join(out)
        joined = re.sub(r"\s+", " ", joined).strip()
        # Make sure the paragraph ends in punctuation so the model closes the phrase.
        if joined and joined[-1] not in ".!?":
            joined += "."
        unknown = sorted({ch for ch in joined if ch not in self.vocab and ch != " "})
        if unknown:
            print(f"    note: dropping symbols not in the voice model: {unknown}", file=sys.stderr)
            joined = "".join(ch for ch in joined if ch in self.vocab or ch == " ")
        return joined


def render_clip(kokoro: Kokoro, phon: Phonemizer, script: str) -> np.ndarray:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", script) if p.strip()]
    pieces: list[np.ndarray] = [np.zeros(int(LEAD_IN * SAMPLE_RATE), dtype=np.float32)]
    for i, para in enumerate(paragraphs):
        ph = phon.paragraph(para.replace("\n", " "))
        audio, sr = kokoro.create(ph, voice=VOICE, speed=SPEED, is_phonemes=True, sentence_pause=0.4, clause_pause=0.14)
        assert sr == SAMPLE_RATE
        pieces.append(audio.astype(np.float32))
        pause = PARAGRAPH_PAUSE if i < len(paragraphs) - 1 else TAIL
        pieces.append(np.zeros(int(pause * SAMPLE_RATE), dtype=np.float32))
    return np.concatenate(pieces)


def encode_mp3(wav: Path, mp3: Path) -> None:
    # Loudness-normalise speech to -18 LUFS (true peak -1.5 dBTP), then encode
    # mono 24 kHz MP3 at 48 kbps: small, clear, and decodable everywhere.
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav),
        "-af", "highpass=f=70,loudnorm=I=-18:TP=-1.5:LRA=11",
        "-ar", str(SAMPLE_RATE), "-ac", "1", "-c:a", "libmp3lame", "-b:a", "48k",
        "-id3v2_version", "3", "-metadata", "artist=Buenos Aires: The Hidden City",
        str(mp3),
    ]
    subprocess.run(cmd, check=True)


def probe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    return round(float(out), 2)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="comma-separated clip ids")
    ap.add_argument("--force", action="store_true", help="re-render even if the script hash is unchanged")
    ap.add_argument("--models", default=str(Path(__file__).resolve().parent / "models"))
    args = ap.parse_args()

    clips = json.loads(NARRATION_JSON.read_text(encoding="utf-8"))
    only = {c for c in args.only.split(",") if c}
    manifest: dict = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    models = Path(args.models)
    kokoro = Kokoro(str(models / "kokoro-v1.0.onnx"), str(models / "voices-v1.0.bin"))
    phon = Phonemizer(kokoro)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    valid_ids = {c["id"] for c in clips}
    for stale in [k for k in manifest if k not in valid_ids]:
        print(f"removing stale manifest entry {stale}")
        manifest.pop(stale)

    for clip in clips:
        cid = clip["id"]
        if only and cid not in only:
            continue
        mp3 = OUT_DIR / f"{cid}.mp3"
        prev = manifest.get(cid)
        if not args.force and prev and prev.get("scriptHash") == clip["hash"] and prev.get("voice") == VOICE and mp3.exists():
            print(f"= {cid} (unchanged)")
            continue
        print(f"> {cid}: {clip['title']}")
        audio = render_clip(kokoro, phon, clip["script"])
        with tempfile.TemporaryDirectory() as td:
            wav = Path(td) / f"{cid}.wav"
            sf.write(wav, audio, SAMPLE_RATE, subtype="PCM_16")
            encode_mp3(wav, mp3)
        manifest[cid] = {
            "file": f"audio/narration/{cid}.mp3",
            "durationSec": probe_duration(mp3),
            "scriptHash": clip["hash"],
            "voice": VOICE,
        }
        MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=2) + "\n", encoding="utf-8")
        print(f"  {manifest[cid]['durationSec']} s, {mp3.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
