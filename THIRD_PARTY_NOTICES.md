# Third-party notices

The app bundles the following third-party material.

| Material | Use | Licence |
| --- | --- | --- |
| Fraunces (Undercase Type) | Display typeface, Latin subset | SIL Open Font License 1.1 — `public/licenses/Fraunces-OFL.txt` |
| Inter (Rasmus Andersson) | Interface typeface, Latin subset | SIL Open Font License 1.1 — `public/licenses/Inter-OFL.txt` |
| Courier Prime (Quote-Unquote Apps) | Clue/typewriter typeface, Latin subset | SIL Open Font License 1.1 — `public/licenses/CourierPrime-OFL.txt` |
| Preact, @preact/signals | UI library | MIT |
| Workbox (Google) | Service-worker precaching | MIT |
| idb (Jake Archibald) | IndexedDB wrapper | ISC |

**Narration.** The 22 narration recordings in `public/audio/narration/` were
generated offline for this project with the open text-to-speech model
Kokoro-82M (weights licensed Apache-2.0, ONNX export from the `kokoro-onnx`
project), voice `af_heart`. The model weights are *not* included in this
repository; see `scripts/tts/build_narration.py` for how to regenerate the
audio.

**Sound effects and ambience** were synthesised for this project
(`scripts/generate-sfx.py`, and procedurally at runtime in
`src/audio/ambience.ts`). **Icons and illustrations** were drawn for this
project as SVG (`scripts/generate-icons.mjs`, `src/ui/components/Art.tsx`).

No map tiles, map data or remote services are used.
