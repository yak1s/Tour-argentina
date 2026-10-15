import { useState } from 'preact/hooks';
import type { ChapterId, LatLng } from '../../content/types';
import { CHAPTERS, legById, waypointById } from '../../content';
import { effectiveCoords, progress } from '../../engine/store';
import { isDone } from '../../engine/progress';
import { position } from '../../platform/location';
import { heading, compassStatus } from '../../platform/compass';
import { isInBuenosAires, projectM } from '../../geo/math';
import { Segmented } from './ui';

/**
 * Offline schematic map. Stops are drawn at their coordinates and the
 * players' position is live, but the lines between stops are straight
 * connectors, not streets — the map never pretends to be a street map.
 * The old colonial riverbank appears once the players have found it.
 */

/** Approximate line of the old riverbank (today's Av. Leandro N. Alem / Paseo Colón). */
const OLD_SHORE: LatLng[] = [
  { lat: -34.5925, lng: -58.3745 },
  { lat: -34.5985, lng: -58.3712 },
  { lat: -34.6040, lng: -58.3694 },
  { lat: -34.6110, lng: -58.3686 },
  { lat: -34.6180, lng: -58.3682 },
  { lat: -34.6255, lng: -58.3680 },
  { lat: -34.6300, lng: -58.3672 },
];

const W = 340;

interface Projected {
  x: number;
  y: number;
}

function makeProjection(points: LatLng[], padM: number, minSpanM = 600) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const center = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
  const proj = points.map((p) => projectM(p, center));
  let minX = Math.min(...proj.map((p) => p.x)) - padM;
  let maxX = Math.max(...proj.map((p) => p.x)) + padM;
  let minY = Math.min(...proj.map((p) => p.y)) - padM;
  let maxY = Math.max(...proj.map((p) => p.y)) + padM;
  // Never zoom in closer than minSpan, so a short leg still has context.
  if (maxX - minX < minSpanM) {
    const c = (minX + maxX) / 2;
    minX = c - minSpanM / 2;
    maxX = c + minSpanM / 2;
  }
  if (maxY - minY < minSpanM) {
    const c = (minY + maxY) / 2;
    minY = c - minSpanM / 2;
    maxY = c + minSpanM / 2;
  }
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const scale = W / spanX;
  const H = Math.min(460, Math.max(220, spanY * scale));
  // Fit vertically too: if the box is taller than allowed, shrink.
  const s = Math.min(scale, H / spanY);
  const offX = (W - spanX * s) / 2;
  const offY = (H - spanY * s) / 2;
  return {
    H,
    metresPerPx: 1 / s,
    p(ll: LatLng): Projected {
      const m = projectM(ll, center);
      return { x: offX + (m.x - minX) * s, y: offY + (maxY - m.y) * s };
    },
  };
}

function niceScale(metresPerPx: number): { m: number; px: number; label: string } {
  const target = metresPerPx * 90;
  const steps = [100, 200, 250, 500, 1000, 2000, 2500, 5000];
  const m = steps.reduce((best, s) => (Math.abs(s - target) < Math.abs(best - target) ? s : best), steps[0]!);
  return { m, px: m / metresPerPx, label: m >= 1000 ? `${m / 1000} km` : `${m} m` };
}

const SHORT: Record<string, string> = {
  prologue: 'Start · Córdoba y Gallo',
  key: 'Ayacucho 1412',
  architects: 'Teatro Colón',
  foundings: 'Obelisco',
  arches: 'Plaza de Mayo',
  fever: 'San Telmo',
  colours: 'Caminito',
  garden: 'El Rosedal',
  flower: 'Floralis',
};

export function RouteMap({ onSelect, focus }: { onSelect?: (id: ChapterId) => void; focus?: ChapterId }) {
  const [mode, setMode] = useState<'route' | 'leg'>('route');
  const p = progress.value;
  const fix = position.value;
  const here = fix && isInBuenosAires(fix) ? fix : null;
  const stops = p.order.filter((id) => id !== 'finale').map((id) => {
    const ch = CHAPTERS.find((c) => c.id === id)!;
    return { id, chapter: ch, ll: effectiveCoords(ch.waypoint) };
  });
  const current = focus ?? p.current;
  const currentStop = stops.find((s) => s.id === (current === 'finale' ? 'prologue' : current));
  const showShore = p.chapters.arches.status === 'complete' || p.chapters.arches.status === 'skipped' || Boolean(p.deductions.shore);

  const legPoints: LatLng[] = currentStop ? [currentStop.ll, ...(here ? [here] : [])] : [];
  const bounds = mode === 'leg' && legPoints.length ? makeProjection(legPoints, 260, 700) : makeProjection([...stops.map((s) => s.ll), ...(here ? [here] : [])], 900);
  const { H } = bounds;
  const proj = (ll: LatLng) => bounds.p(ll);
  const scale = niceScale(bounds.metresPerPx);

  const ordered = p.order.filter((id) => id !== 'finale');
  const segments = ordered.slice(1).map((id, i) => {
    const from = stops.find((s) => s.id === ordered[i])!;
    const to = stops.find((s) => s.id === id)!;
    const leg = legById(to.chapter.legId);
    return { from, to, taxi: leg?.recommended === 'taxi', done: isDone(p.chapters[id].status) };
  });
  // The finale returns to the start.
  const last = stops.find((s) => s.id === ordered[ordered.length - 1]);
  const start = stops.find((s) => s.id === 'prologue');
  if (last && start && last.id !== 'prologue') {
    segments.push({ from: last, to: start, taxi: true, done: isDone(p.chapters.finale.status) });
  }

  const h = heading.value;
  const showHeading = here && compassStatus.value === 'active' && h !== null;
  const me = here ? proj(here) : null;
  const accuracyPx = here ? Math.min(80, here.accuracy / bounds.metresPerPx) : 0;

  return (
    <div class="stack stack--sm">
      <div class="row row--between row--wrap">
        <Segmented
          label="Map view"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'route', label: 'Whole route' },
            { value: 'leg', label: 'Next stop' },
          ]}
        />
        <span class="xsmall faint">Schematic · offline</span>
      </div>
      <div class="map">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Schematic map of the route with your position">
          <defs>
            <linearGradient id="river" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#a3b2c4" stop-opacity="0" />
              <stop offset="1" stop-color="#a3b2c4" stop-opacity="0.22" />
            </linearGradient>
          </defs>
          {/* The river lies to the north-east of the whole route (not drawn to scale). */}
          {mode === 'route' ? (
            <g>
              <path d={`M${W * 0.55} 0 L${W} 0 L${W} ${H * 0.6} Z`} fill="url(#river)" />
              <text x={W - 8} y={16} text-anchor="end" font-size="10" fill="#a3b2c4" font-weight="600" letter-spacing="0.5">
                RÍO DE LA PLATA ↗
              </text>
              <text x={W - 8} y={28} text-anchor="end" font-size="8.5" fill="#a3b2c4" opacity="0.8">
                (beyond the edge of this map)
              </text>
            </g>
          ) : null}

          {showShore ? (
            <g>
              <polyline
                points={OLD_SHORE.map((ll) => {
                  const q = proj(ll);
                  return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
                }).join(' ')}
                fill="none"
                stroke="#d8dfe8"
                stroke-width="1.6"
                stroke-dasharray="2 4"
                opacity="0.85"
              />
              {(() => {
                const q = proj(OLD_SHORE[3]!);
                return (
                  <text x={q.x + 6} y={q.y} font-size="9" fill="#d8dfe8" font-style="italic">
                    old riverbank (approx.)
                  </text>
                );
              })()}
            </g>
          ) : null}

          {/* Riachuelo beside Caminito. */}
          {(() => {
            const c = stops.find((s) => s.id === 'colours');
            if (!c) return null;
            const q = proj(c.ll);
            return (
              <g opacity="0.8">
                <path d={`M${q.x - 30} ${q.y + 18} q10 -5 20 0 t20 0 t20 0 t20 0`} fill="none" stroke="#a3b2c4" stroke-width="1.4" />
                <text x={q.x - 34} y={q.y + 22} font-size="8.5" fill="#a3b2c4" text-anchor="end">
                  Riachuelo
                </text>
              </g>
            );
          })()}

          {segments.map((s) => {
            const a = proj(s.from.ll);
            const b = proj(s.to.ll);
            return (
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--accent)"
                stroke-width={s.done ? 2.4 : 1.6}
                stroke-dasharray={s.taxi ? '6 5' : undefined}
                opacity={s.done ? 0.95 : 0.55}
                stroke-linecap="round"
              />
            );
          })}

          {stops.map((s) => {
            const q = proj(s.ll);
            const st = p.chapters[s.id].status;
            const done = st === 'complete';
            const skipped = st === 'skipped';
            const isCurrent = s.id === (current === 'finale' ? 'prologue' : current);
            const n = s.chapter.number;
            const w = waypointById(s.chapter.waypoint);
            const labelLeft = q.x > W * 0.62;
            return (
              <g
                class={onSelect ? 'map-stop' : undefined}
                style={onSelect ? { cursor: 'pointer' } : undefined}
                onClick={onSelect ? () => onSelect(s.id) : undefined}
                role={onSelect ? 'button' : undefined}
                aria-label={onSelect ? `Choose ${SHORT[s.id] ?? w.name}` : undefined}
              >
                {isCurrent ? <circle cx={q.x} cy={q.y} r="17" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.6" /> : null}
                <circle
                  cx={q.x}
                  cy={q.y}
                  r="11"
                  fill={done ? 'var(--accent)' : 'var(--bg-sunken)'}
                  stroke={skipped ? 'var(--text-faint)' : 'var(--accent)'}
                  stroke-width="1.8"
                  stroke-dasharray={skipped ? '3 3' : undefined}
                />
                <text x={q.x} y={q.y + 3.6} text-anchor="middle" font-size="10" font-weight="700" fill={done ? 'var(--accent-ink)' : 'var(--accent-strong)'}>
                  {n}
                </text>
                <text
                  x={labelLeft ? q.x - 16 : q.x + 16}
                  y={q.y + 4}
                  text-anchor={labelLeft ? 'end' : 'start'}
                  font-size="10.5"
                  font-weight={isCurrent ? 700 : 550}
                  fill="var(--text)"
                  paint-order="stroke"
                  stroke="var(--bg)"
                  stroke-width="3"
                >
                  {SHORT[s.id] ?? w.name}
                  {w.precision === 'approximate' && !p.waypointFixes[w.id] ? ' ≈' : ''}
                </text>
              </g>
            );
          })}

          {me ? (
            <g aria-label="You are here">
              <circle cx={me.x} cy={me.y} r={Math.max(6, accuracyPx)} fill="#6fa8ff" opacity="0.14" />
              {showHeading ? (
                <path
                  d={`M${me.x} ${me.y} L${me.x - 9} ${me.y - 24} A26 26 0 0 1 ${me.x + 9} ${me.y - 24} Z`}
                  fill="#6fa8ff"
                  opacity="0.35"
                  transform={`rotate(${h} ${me.x} ${me.y})`}
                />
              ) : null}
              <circle cx={me.x} cy={me.y} r="6.5" fill="#6fa8ff" stroke="#fff" stroke-width="2" />
            </g>
          ) : null}

          {/* North arrow and scale bar. */}
          <g transform={`translate(18 ${H - 46})`} fill="none" stroke="var(--text-muted)" stroke-width="1.4">
            <path d="M8 0 L14 16 L8 12 L2 16 Z" fill="var(--text-muted)" />
            <text x="8" y="28" text-anchor="middle" font-size="9" fill="var(--text-muted)" stroke="none" font-weight="700">
              N
            </text>
          </g>
          <g transform={`translate(44 ${H - 16})`}>
            <line x1="0" y1="0" x2={scale.px} y2="0" stroke="var(--text-muted)" stroke-width="2" />
            <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--text-muted)" stroke-width="1.5" />
            <line x1={scale.px} y1="-4" x2={scale.px} y2="4" stroke="var(--text-muted)" stroke-width="1.5" />
            <text x={scale.px / 2} y="-6" text-anchor="middle" font-size="9" fill="var(--text-muted)">
              {scale.label}
            </text>
          </g>
        </svg>
      </div>
      <div class="map-legend">
        <span>
          <i /> walk
        </span>
        <span>
          <i class="taxi" /> taxi
        </span>
        <span>≈ approximate position</span>
        {here ? <span style={{ color: '#6fa8ff' }}>● you</span> : <span>Location off: your dot is hidden</span>}
      </div>
    </div>
  );
}
