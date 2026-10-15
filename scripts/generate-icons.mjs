/**
 * Renders the app icons from one SVG emblem: the Obelisco rising from the
 * river, inside a brass seal, on midnight blue. Run: npm run icons
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'public', 'icons');
mkdirSync(out, { recursive: true });

/** The emblem drawn in a 512 box; `scale` shrinks it for the maskable safe zone. */
function emblem(scale = 1) {
  const t = `translate(256 256) scale(${scale}) translate(-256 -256)`;
  return `
  <g transform="${t}">
    <circle cx="256" cy="244" r="176" fill="none" stroke="url(#brass)" stroke-width="10"/>
    <circle cx="256" cy="244" r="158" fill="none" stroke="#d3aa63" stroke-width="2" opacity="0.55"/>
    <path d="M256 92 L273 128 L284 330 H228 L239 128 Z" fill="url(#brass)"/>
    <rect x="251" y="140" width="10" height="13" rx="2" fill="#0b1121" opacity="0.75"/>
    <path d="M214 330 H298 V342 H214 Z" fill="url(#brass)"/>
    <g fill="none" stroke="#c8d3e0" stroke-linecap="round" stroke-width="9">
      <path d="M150 368 q26 -16 52 0 t52 0 t52 0 t52 0"/>
      <path d="M176 400 q20 -12 40 0 t40 0 t40 0 t40 0" opacity="0.7"/>
    </g>
  </g>`;
}

function svg({ rounded, scale }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="70%">
      <stop offset="0" stop-color="#1d2a47"/>
      <stop offset="1" stop-color="#0b1121"/>
    </radialGradient>
    <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0dcb0"/>
      <stop offset="0.55" stop-color="#d3aa63"/>
      <stop offset="1" stop-color="#9c7536"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  ${emblem(scale)}
</svg>`;
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0b1121"/>
  <path d="M32 8 L35 14 L37 46 H27 L29 14 Z" fill="#d3aa63"/>
  <path d="M15 52 q4 -3 8.5 0 t8.5 0 t8.5 0 t8.5 0" fill="none" stroke="#c8d3e0" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const anySvg = Buffer.from(svg({ rounded: true, scale: 1 }));
const fullSvg = Buffer.from(svg({ rounded: false, scale: 1 }));
const maskSvg = Buffer.from(svg({ rounded: false, scale: 0.78 }));

await sharp(anySvg).resize(192, 192).png().toFile(resolve(out, 'icon-192.png'));
await sharp(anySvg).resize(512, 512).png().toFile(resolve(out, 'icon-512.png'));
await sharp(maskSvg).resize(512, 512).png().toFile(resolve(out, 'maskable-512.png'));
await sharp(fullSvg).resize(180, 180).png().toFile(resolve(out, 'apple-touch-icon.png'));
await sharp(Buffer.from(favicon)).resize(32, 32).png().toFile(resolve(out, 'favicon-32.png'));
writeFileSync(resolve(out, 'favicon.svg'), favicon);
console.log('Icons written to', out);
