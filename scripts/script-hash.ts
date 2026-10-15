import { createHash } from 'node:crypto';

/** Stable short hash of a narration script; stored with each rendered audio file. */
export function scriptHash(script: string): string {
  return createHash('sha256').update(script, 'utf8').digest('hex').slice(0, 16);
}
