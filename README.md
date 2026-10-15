# Buenos Aires: The Hidden City

**A mystery for two, told by someone who was here first.**

An installable, offline-first web app (PWA) that turns a day in Buenos Aires
into a guided treasure hunt for two adults. It is a real city guide (clear
directions, distances, walk-or-taxi advice, opening-hours warnings, safety
notes) and a real game: nine places, nine challenges of different kinds, about
22 minutes of narration, and a narrator whose identity is the final mystery.

- **Live site (GitHub Pages):** https://yak1s.github.io/Tour-argentina/
- Works offline after the first visit · no account · no tracking · nothing leaves the phone

---

## Install it on an Android phone

1. Open **https://yak1s.github.io/Tour-argentina/** in **Chrome**, on Wi-Fi if possible.
2. Wait until the top bar says **“Ready offline”** (Settings → *Offline & install*
   shows how many files are stored; all must be stored).
3. Tap **Install** when Chrome offers it, or the menu **⋮ → Install app / Add to Home screen**.
4. Open **Hidden City** from the home screen. From now on it starts and runs
   with no connection at all — narration included.

Samsung Internet and Edge also install it (“Add page to → Home screen”). On an
iPhone, Safari’s *Share → Add to Home Screen* works too, but Android/Chrome is
the tested target.

## How the day works

The tour starts at **9:15 at the corner of Avenida Córdoba and Gallo** and
returns there in the evening. Times are guides, never a race.

| # | Chapter | Place | Getting there (estimates) | Challenge |
|---|---------|-------|---------------------------|-----------|
| 0 | The Corner | Córdoba y Gallo (start) | — | Read a street sign (warm-up) |
| 1 | The Key | **Ayacucho 1412**, Recoleta (exterior only) | Taxi 10–15 min (≈2.5–3 km) or walk ≈30 min | Find the key on the building: a 4-digit lock |
| 2 | Three Architects | Teatro Colón (Libertad 621) | Walk ≈25–30 min (≈2 km) or taxi 8–12 min | Logic: put the three architects in order |
| 3 | Two Births | Obelisco | Walk 6–9 min (≈500 m) | Read the faces’ years, compute |
| 4 | The Missing Arches | Plaza de Mayo (public square only) | Walk 13–16 min along Diagonal Norte | Count the Cabildo’s arches; optional compass deduction |
| 5 | The Message in the Market | Mercado de San Telmo | Walk 15–20 min along Defensa | Decode a cipher with the key from chapter 1 |
| 6 | Three Truths and a Tale | Caminito, La Boca | **Taxi** 10–15 min (never walk there) | Audio + observation: spot the false statement |
| 7 | The Garden of a Fallen Man | El Rosedal, Palermo | **Taxi** 25–40 min (11–13 km) | Recognise the novel in Seville’s tiles |
| 8 | The Silver Flower | Floralis Genérica | Taxi 8–12 min or a long park walk | Name the colour of the narrator’s name |
| 9 | The Voice | back at Córdoba y Gallo | Taxi 12–18 min (3–4 km) | Final deduction by elimination, then the sealed envelope |

Things to know:

- **No religious sites** are part of the route or of any challenge. Plaza de
  Mayo is visited as a public square only.
- **El Rosedal is closed on Mondays** (and in strong wind or rain). The app
  warns you and its challenge can be solved from the fallback information.
- **La Boca:** daylight only, arrive and leave by taxi, stay on Caminito and the
  riverside walk. The app says so on every relevant screen.
- **Ayacucho 1412** is a private building: you look at it from the opposite
  sidewalk. Directories list the address for a kosher dairy café (Luba Café);
  its hours are not verified and the game never requires entering.
- Every stop can be **skipped**, every challenge has **graduated hints** and a
  **skip**, the order of remaining stops can be **changed**, and the tour can be
  **paused** for lunch. Skipped things are recorded as skipped (never as
  solved), and the story always remains solvable.

## Features

- **Navigation that answers four questions at all times:** where am I going,
  how far is it, how do I get there (walk *or* taxi, kept separate, with a
  Spanish “show the driver” card), and what do I do when I arrive.
- **GPS, used only on the device:** straight-line distance and direction, an
  arrival detector that needs several consistent fixes and tolerates drift,
  automatic arrival at well-verified stops, “looks like you’re here — confirm?”
  at approximate ones, and a **“We’re here”** button that always works.
- **Compass** arrow (with Buenos Aires magnetic-declination correction) where
  the phone supports it; north-up arrow and street directions otherwise.
- **Offline schematic map** of the route with your live position, a “next stop”
  zoom, and the old colonial riverbank, which appears once you discover it.
- **Narration** (22 recorded clips, play / pause / replay / ±10 s / mute,
  lock-screen controls, one clip at a time, full transcripts, never autoplays
  unless you turn it on), soft **sound effects**, optional generated **river
  ambience** that ducks under the voice, optional **vibration**.
- **Camera (opt-in):** private photo memories stored only on the phone, a zoom
  loupe for distant details, and a *surveyor’s challenge* that estimates the
  Obelisco’s height from your phone’s tilt.
- **Journal:** the narrator’s nine lines (“threads”), every unlocked fact with
  its certainty label and sources, clues and deductions, a record of solved and
  skipped challenges, and your photos.
- **Finale:** a sealed envelope, a narrated letter, and a keepsake map you can
  save as an image (offline).
- Two themes (midnight journal / high-contrast **sunlight** mode), three text
  sizes, reduced-motion support, large touch targets, works at 320 px.

## Research and accuracy

The mystery is fiction; the history is not. Every fact card is labelled
**documented**, **sources differ**, or **legend**, and names its sources. The
narrator never lies: every first-person line is literally true of the river.

The research for this build was done with web search (sources are named in the
app, in *Help → Sources*). Limits worth knowing:

- **Coordinates.** Teatro Colón, the Obelisco and Plaza de Mayo use published
  coordinates confirmed by two sources, so GPS confirms arrival there
  automatically. Córdoba y Gallo, Ayacucho 1412, the San Telmo market,
  Caminito, El Rosedal and the Floralis Genérica are **approximate** (±150–250 m):
  the build environment had no access to a geocoder. The app therefore only
  *suggests* arrival there, shows those distances with “≈”, and replaces the
  estimate with your real position once you confirm arrival with a good GPS
  fix (the starting corner is captured during the prologue, so the return in
  the evening is GPS-confirmed).
- **Corrections to the original plan:** Córdoba y Gallo is about 2.7 km *east*
  of the Teatro Colón (not south); Caminito → El Rosedal is 11–13 km by road
  (not 4.8 km); Floralis → Córdoba y Gallo is about 3–4 km; the street Gallo
  honours Pedro León Gallo (not Delfín Gallo).
- **Walking directions** are marked either *street-checked* (Colón → Obelisco →
  Plaza de Mayo → San Telmo) or *general orientation* (the longer optional
  walks). Taxi times are daytime estimates.
- **Things that change:** the Floralis Genérica’s petals no longer move (the
  mechanism has not fully worked since about 2009; two petals were replaced in
  2025), Rosedal hours differ between sources, and building works may fence off
  parts of plazas. Every challenge has a fallback that does not depend on them.

## Privacy

No account, analytics or tracking. Location, answers, progress and photos are
stored only on the phone (IndexedDB, with a localStorage mirror) and never
uploaded. Permissions are requested only in context: location when you switch
it on, the camera when you open a camera activity, motion sensors when you use
the compass or the surveyor’s challenge.

---

## Development

Requirements: Node 20.19+ (22 recommended).

```bash
npm ci
npm run dev          # local dev server (no service worker in dev)
npm run build        # type-check + production build into dist/
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright; serves dist/ under /Tour-argentina/)
```

The build uses relative URLs (`base: './'`) and hash routing, so the same
`dist/` works at `https://<user>.github.io/<repo>/`, at a server root, and from
the offline cache.

### Project structure

```
src/
  content/      route, waypoints, legs, chapters, puzzles, narration scripts (data only)
  engine/       progress model + migrations, answer checking, store, navigation, schedule
  geo/          distance/bearing maths, arrival detector
  audio/        narration player, sound effects, generated ambience
  platform/     IndexedDB, geolocation, compass, tilt, camera, haptics, wake lock, PWA
  ui/           screens, components, styles
  sw.ts         service worker (precaches the whole app, narration included)
scripts/
  tts/build_narration.py   renders narration with Kokoro TTS
  export-narration.ts      exports scripts for the renderer
  generate-sfx.py          synthesises the sound effects
  generate-icons.mjs       renders the app icons
tests/
  unit/        content integrity, answers, progress & migration, geo, schedule, storage
  e2e/         full journey with simulated GPS, offline lifecycle, audio, layout, assets
```

### Editing content

All text, clues, answers, hints, directions and facts live in `src/content/`.
Unit tests enforce the rules that types can’t (unique ids, valid coordinates,
legs that connect, hints for every puzzle, no religious destinations, every
narration clip has an up-to-date recording, …).

### Regenerating the narration

Narration is rendered locally with [Kokoro-82M](https://github.com/thewh1teagle/kokoro-onnx)
(Apache-2.0) and committed as MP3. If you change a script, the unit tests fail
until the audio is re-rendered:

```bash
python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile
mkdir -p scripts/tts/models && cd scripts/tts/models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ../../..
npm run narration:export
.venv/bin/python scripts/tts/build_narration.py   # only changed clips are re-rendered
```

Spanish names are written as `[[Teatro Colón]]` in the scripts and pronounced
in Rioplatense Spanish; `{{shown|spoken}}` and `[[shown|/ipa/]]` give finer
control. Needs `ffmpeg`.

### Deployment

`.github/workflows/deploy.yml` builds, type-checks, runs the unit and
end-to-end tests, and deploys `dist/` to GitHub Pages on every push to the
repository’s default branch. GitHub Pages must be enabled once with
**Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Credits and licences

Code: MIT (see `LICENSE`). Fonts: Fraunces, Inter and Courier Prime (SIL Open
Font License). Narration voice generated with Kokoro-82M (Apache-2.0).
Illustrations, icons and sounds made for this project. See
`THIRD_PARTY_NOTICES.md`.
