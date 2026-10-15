/**
 * Exports the narration scripts to JSON for the speech renderer
 * (scripts/tts/build_narration.py). Run with: npm run narration:export
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NARRATION } from '../src/content/narration';
import { scriptHash } from './script-hash';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'tts', 'narration.json');
mkdirSync(dirname(out), { recursive: true });

const clips = Object.values(NARRATION).map((clip) => ({
  id: clip.id,
  title: clip.title,
  script: clip.script,
  hash: scriptHash(clip.script),
}));
writeFileSync(out, JSON.stringify(clips, null, 2) + '\n', 'utf8');
console.log(`Exported ${clips.length} clips to ${out}`);
