import { compassStatus, compassUnsteady, heading, startCompass } from '../../platform/compass';
import { compassShort, compassWord, formatDistance } from '../../geo/math';
import { settings, updateSettings } from '../../engine/store';
import { Icon } from './Icon';

/**
 * Direction dial. With a working compass the needle points towards the
 * target relative to where the phone faces; without one, it shows the
 * absolute bearing (north up) and says so in words.
 */
export function CompassDial({ bearingDeg, label }: { bearingDeg: number | null; label?: string }) {
  const h = heading.value;
  const live = compassStatus.value === 'active' && h !== null;
  const rotation = bearingDeg === null ? 0 : live ? (bearingDeg - h + 360) % 360 : bearingDeg;
  return (
    <div class="compass" role="img" aria-label={label ?? (bearingDeg === null ? 'Direction unknown' : `Target is ${compassWord(bearingDeg, 16)}`)}>
      <svg class="compass__ticks" viewBox="0 0 100 100" aria-hidden="true">
        <g stroke="currentColor" stroke-width="1" opacity="0.35" style={{ color: 'var(--accent)' }}>
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i * 15 * Math.PI) / 180;
            const r1 = i % 6 === 0 ? 40 : 44;
            return <line x1={50 + r1 * Math.sin(a)} y1={50 - r1 * Math.cos(a)} x2={50 + 47 * Math.sin(a)} y2={50 - 47 * Math.cos(a)} />;
          })}
        </g>
        {!live ? (
          <text x="50" y="16" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" opacity="0.7">
            N
          </text>
        ) : null}
      </svg>
      {bearingDeg === null ? (
        <Icon name="compass" size="lg" />
      ) : (
        <svg class="compass__needle" viewBox="0 0 60 60" style={{ transform: `rotate(${Math.round(rotation)}deg)` }} aria-hidden="true">
          <path d="M30 4 L41 40 L30 33 L19 40 Z" fill="currentColor" />
          <circle cx="30" cy="30" r="3" fill="var(--ink-900)" />
        </svg>
      )}
      <span class="compass__label">{bearingDeg === null ? '—' : live ? 'AHEAD' : compassShort(bearingDeg)}</span>
    </div>
  );
}

export function DistanceReadout({
  distanceM,
  accuracyM,
  bearingDeg,
  approximate,
}: {
  distanceM: number | null;
  accuracyM: number | null;
  bearingDeg: number | null;
  approximate: boolean;
}) {
  if (distanceM === null) {
    return (
      <div class="distance" style={{ fontSize: 'var(--fs-xl)' }}>
        No position yet
        <small>Turn on location, or follow the directions below.</small>
      </div>
    );
  }
  const live = compassStatus.value === 'active' && heading.value !== null;
  return (
    <div class="distance" aria-live="polite">
      {approximate ? '≈ ' : ''}
      {formatDistance(distanceM)}
      <small>
        straight line{bearingDeg !== null ? `, to the ${compassWord(bearingDeg, 16)}` : ''}
        {accuracyM !== null ? ` · GPS ±${Math.round(accuracyM)} m` : ''}
        {!live && bearingDeg !== null ? ' · arrow shows map direction (north up)' : ''}
      </small>
    </div>
  );
}

/** Small control to turn the compass on (needs a tap on iOS). */
export function CompassToggle() {
  const st = compassStatus.value;
  const s = settings.value;
  if (!s.compass) {
    return (
      <button type="button" class="btn btn--ghost btn--sm" onClick={() => (updateSettings({ compass: true }), void startCompass())}>
        <Icon name="compass" size="sm" /> Use compass
      </button>
    );
  }
  if (st === 'active') {
    return compassUnsteady.value ? (
      <span class="xsmall muted">Compass unsteady: move the phone in a slow figure-eight to calibrate.</span>
    ) : (
      <span class="xsmall muted">Compass on · arrow turns with your phone</span>
    );
  }
  if (st === 'unavailable') return <span class="xsmall muted">No compass on this device — use the street directions.</span>;
  return (
    <button type="button" class="btn btn--ghost btn--sm" onClick={() => void startCompass()}>
      <Icon name="compass" size="sm" /> {st === 'starting' ? 'Starting compass…' : 'Turn on compass'}
    </button>
  );
}
