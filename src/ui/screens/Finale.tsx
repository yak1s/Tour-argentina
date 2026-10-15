import { useMemo, useState } from 'preact/hooks';
import type { LatLng } from '../../content/types';
import { allThreads, CHAPTERS, transcriptOf, NARRATION, waypointById } from '../../content';
import { effectiveCoords, progress, update } from '../../engine/store';
import { openEnvelope, summarize } from '../../engine/progress';
import { projectM } from '../../geo/math';
import { haptic } from '../../platform/haptics';
import { sfx } from '../../audio/sfx';
import { play } from '../../audio/narrator';
import { href } from '../router';
import { Button, LinkButton, toast } from '../components/ui';
import { Icon } from '../components/Icon';
import { ThreadCard } from '../components/Journal';
import { ListenCard } from '../components/Player';

/** Traditional (unconfirmed) site of the 1536 settlement: the bluffs of today's Parque Lezama (approximate). */
const LOST_CITY: LatLng = { lat: -34.628, lng: -58.3696 };
const OLD_SHORE: LatLng[] = [
  { lat: -34.5925, lng: -58.3745 },
  { lat: -34.5985, lng: -58.3712 },
  { lat: -34.604, lng: -58.3694 },
  { lat: -34.611, lng: -58.3686 },
  { lat: -34.618, lng: -58.3682 },
  { lat: -34.6255, lng: -58.368 },
  { lat: -34.63, lng: -58.3672 },
];

function KeepsakeSvg({ names }: { names: string }) {
  const p = progress.value;
  const s = summarize(p);
  const stops = p.order.filter((id) => id !== 'finale').map((id) => {
    const ch = CHAPTERS.find((c) => c.id === id)!;
    return { id, ch, ll: effectiveCoords(ch.waypoint) };
  });
  const all = [...stops.map((x) => x.ll), LOST_CITY];
  const lats = all.map((q) => q.lat);
  const lngs = all.map((q) => q.lng);
  const center = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
  const pts = all.map((q) => projectM(q, center));
  const minX = Math.min(...pts.map((q) => q.x)) - 700;
  const maxX = Math.max(...pts.map((q) => q.x)) + 900;
  const minY = Math.min(...pts.map((q) => q.y)) - 500;
  const maxY = Math.max(...pts.map((q) => q.y)) + 500;
  const W = 1080;
  const H = 1350;
  const top = 250;
  const boxH = 820;
  const scale = Math.min((W - 120) / (maxX - minX), boxH / (maxY - minY));
  const proj = (q: LatLng) => {
    const m = projectM(q, center);
    return { x: 60 + (m.x - minX) * scale, y: top + (maxY - m.y) * scale };
  };
  const date = new Date(p.startedAt ?? Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const shore = OLD_SHORE.map((q) => {
    const r = proj(q);
    return `${r.x.toFixed(1)},${r.y.toFixed(1)}`;
  }).join(' ');
  const lost = proj(LOST_CITY);
  const ordered = stops;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} id="keepsake-svg">
      <rect width={W} height={H} fill="#0b1121" />
      <rect x="28" y="28" width={W - 56} height={H - 56} fill="none" stroke="#d3aa63" stroke-width="2" opacity="0.6" />
      <rect x="40" y="40" width={W - 80} height={H - 80} fill="none" stroke="#d3aa63" stroke-width="1" opacity="0.35" />
      <text x={W / 2} y="118" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="30" letter-spacing="8" fill="#d3aa63">
        BUENOS AIRES
      </text>
      <text x={W / 2} y="188" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="64" fill="#f2ebdc">
        The Hidden City
      </text>
      <polygon points={`${W * 0.55},${top - 40} ${W - 60},${top - 40} ${W - 60},${top + 380}`} fill="#a3b2c4" opacity="0.12" />
      <text x={W - 70} y={top - 10} text-anchor="end" font-family="Georgia, serif" font-size="22" fill="#a3b2c4" font-style="italic">
        Río de la Plata ↗
      </text>
      <polyline points={shore} fill="none" stroke="#d8dfe8" stroke-width="3" stroke-dasharray="4 8" opacity="0.8" />
      <text x={proj(OLD_SHORE[2]!).x + 14} y={proj(OLD_SHORE[2]!).y} font-family="Georgia, serif" font-size="18" fill="#d8dfe8" font-style="italic">
        the old riverbank
      </text>
      {ordered.slice(1).map((st, i) => {
        const a = proj(ordered[i]!.ll);
        const b = proj(st.ll);
        return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#d3aa63" stroke-width="3" opacity="0.7" />;
      })}
      {(() => {
        const a = proj(ordered[ordered.length - 1]!.ll);
        const b = proj(ordered[0]!.ll);
        return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#d3aa63" stroke-width="3" stroke-dasharray="10 9" opacity="0.6" />;
      })()}
      <circle cx={lost.x} cy={lost.y} r="22" fill="none" stroke="#e3a1ad" stroke-width="2.5" stroke-dasharray="5 6" />
      <text x={lost.x + 30} y={lost.y + 2} font-family="Georgia, serif" font-size="19" fill="#e3a1ad" font-style="italic">
        the lost city of 1536?
      </text>
      <text x={lost.x + 30} y={lost.y + 26} font-family="Arial, sans-serif" font-size="14" fill="#e3a1ad" opacity="0.8">
        tradition: today’s Parque Lezama (never found)
      </text>
      {ordered.map((st) => {
        const q = proj(st.ll);
        const status = p.chapters[st.id].status;
        const done = status === 'complete';
        return (
          <g>
            <circle cx={q.x} cy={q.y} r="20" fill={done ? '#d3aa63' : '#0b1121'} stroke="#d3aa63" stroke-width="3" stroke-dasharray={status === 'skipped' ? '5 5' : undefined} />
            <text x={q.x} y={q.y + 7} text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="19" fill={done ? '#1b1406' : '#e5c88d'}>
              {st.ch.number}
            </text>
            <text x={q.x + 28} y={q.y + 7} font-family="Arial, sans-serif" font-size="19" fill="#f2ebdc">
              {waypointById(st.ch.waypoint).name}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={H - 210} text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#f2ebdc" font-style="italic">
        Solved by {names || 'two explorers'}
      </text>
      <text x={W / 2} y={H - 160} text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#bdb5a4">
        {date} · {s.stopsVisited} stops · {s.solved} challenges solved · {s.hintsUsed} hints
      </text>
      <text x={W / 2} y={H - 100} text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#d3aa63">
        “Thank you for looking so carefully. Most people don’t.” — the river
      </text>
    </svg>
  );
}

async function saveKeepsake(): Promise<void> {
  const svg = document.getElementById('keepsake-svg');
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('render failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('no image');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'the-hidden-city-keepsake.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Keepsake saved to your downloads.');
  } catch {
    toast('Couldn’t create the image on this device — a screenshot works too.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FinaleScreen() {
  const p = progress.value;
  const voice = p.puzzles['p-voice'];
  const solved = voice?.status === 'solved' || voice?.status === 'skipped';
  const [names, setNames] = useState('');
  const letter = useMemo(() => transcriptOf(NARRATION['finale-letter']!.script).split(/\n\s*\n/), []);

  if (!solved) {
    return (
      <div class="stack stack--lg">
        <div class="hero center">
          <Icon name="lock" size="lg" />
          <h2 style={{ marginTop: '8px' }}>The envelope is still sealed</h2>
          <p class="muted" style={{ marginTop: '6px' }}>
            It opens back at Córdoba y Gallo, once you’ve named the voice.
          </p>
        </div>
        <LinkButton href={href('chapter/finale')} block>
          Go to the finale
        </LinkButton>
      </div>
    );
  }

  const opened = p.envelopeOpened;
  const s = summarize(p);
  const minutes = p.startedAt ? Math.round(((p.finishedAt ?? Date.now()) - p.startedAt - p.pausedTotalMs) / 60_000) : null;

  return (
    <div class="stack stack--lg">
      <section class="center stack">
        <p class="kicker">Finale · Córdoba y Gallo</p>
        <h2>{opened ? 'A letter from the river' : 'The sealed envelope'}</h2>
        <div class={`envelope${opened ? ' is-open' : ''}`}>
          <div class="envelope__body" />
          <div class="envelope__letter" />
          <div class="envelope__flap" />
          {!opened ? (
            <button
              type="button"
              class="envelope__seal"
              aria-label="Break the seal"
              onClick={() => {
                update((prev, now) => openEnvelope(prev, now));
                haptic('success');
                void sfx('finale');
                setTimeout(() => void play('finale-letter'), 1400);
              }}
            >
              R
            </button>
          ) : null}
        </div>
        {!opened ? <p class="small muted">Tap the seal. The letter will be read to you.</p> : null}
      </section>

      {opened ? (
        <>
          <ListenCard clipId="finale-letter" showTranscript={false} />
          <article class="letter reveal-1" aria-label="The letter">
            {letter.map((para) => (
              <p>{para}</p>
            ))}
            <p class="sig">— the Río de la Plata</p>
          </article>

          <section class="stack reveal-2" aria-label="The nine true things">
            <h3>The nine true things, explained</h3>
            {allThreads().map(({ thread }, i) => (
              <ThreadCard thread={thread} n={i + 1} revealed />
            ))}
          </section>

          <section class="card stack reveal-3" aria-label="Your day">
            <p class="kicker">Your day</p>
            <div class="row row--wrap small">
              <span class="pill pill--ok">{s.stopsVisited} stops visited</span>
              <span class="pill">{s.stopsSkipped} skipped</span>
              <span class="pill pill--ok">{s.solved} challenges solved</span>
              <span class="pill">{s.hintsUsed} hints</span>
              {minutes !== null ? <span class="pill">{Math.floor(minutes / 60)} h {minutes % 60} min of exploring</span> : null}
            </div>
            <p class="small muted">Not bad for two people who started the morning on an ordinary street corner.</p>
          </section>

          <section class="stack" aria-label="Keepsake map">
            <h3>Your keepsake</h3>
            <label class="small" for="names">
              Your names, for the keepsake (optional — stays on this phone):
            </label>
            <input id="names" class="input" placeholder="e.g. Ana & Tomás" value={names} maxLength={40} onInput={(e) => setNames((e.currentTarget as HTMLInputElement).value)} />
            <div class="keepsake">
              <KeepsakeSvg names={names.trim()} />
            </div>
            <Button icon="download" onClick={() => void saveKeepsake()}>
              Save as an image
            </Button>
          </section>

          <section class="hero center stack">
            <p class="lede">Before you leave Buenos Aires, go and see the river.</p>
            <p class="small muted">
              A riverside walk such as the Costanera, beyond Puerto Madero or north of the centre, is the place. On most days you can’t see the far shore.
            </p>
            <p class="kicker">The end</p>
          </section>
        </>
      ) : null}
    </div>
  );
}
