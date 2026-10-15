import { useEffect } from 'preact/hooks';
import { chapterById, legById, waypointById } from '../../content';
import { progress, update, settings, updateSettings } from '../../engine/store';
import { advance, completion, pause, resume, isDone } from '../../engine/progress';
import { confirmArrival, navTarget, targetVector } from '../../engine/navigation';
import { formatClock, projectSchedule } from '../../engine/schedule';
import { formatMinutes } from '../../geo/math';
import { locationStatus, startLocation } from '../../platform/location';
import { navigate, href } from '../router';
import { Art } from '../components/Art';
import { Button, LinkButton } from '../components/ui';
import { Icon } from '../components/Icon';
import { CompassDial, DistanceReadout } from '../components/Compass';
import { chapterLabel } from '../shared';

export function HomeScreen() {
  const p = progress.value;
  useEffect(() => {
    if (!p.started) navigate('intro', { replace: true });
  }, [p.started]);
  if (!p.started) return null;

  const ch = chapterById(p.current);
  const st = p.chapters[ch.id].status;
  const w = waypointById(ch.waypoint);
  const leg = legById(ch.legId);
  const vec = targetVector.value;
  const target = navTarget.value;
  const pct = Math.round(completion(p) * 100);
  const schedule = projectSchedule(p, new Date());
  const row = schedule.find((r) => r.chapterId === ch.id);
  const nextId = p.order.find((id, i) => i > p.order.indexOf(ch.id) && !isDone(p.chapters[id].status));
  const allDone = p.order.every((id) => isDone(p.chapters[id].status));

  if (p.paused) {
    const mins = Math.max(0, Math.round((Date.now() - p.paused.since) / 60_000));
    return (
      <div class="stack stack--lg">
        <div class="hero center">
          <div class="hero__art">
            <Art id="market" />
          </div>
          <p class="kicker">Paused · {p.paused.reason}</p>
          <h2>Take your time</h2>
          <p class="muted" style={{ marginTop: '8px' }}>
            Paused {mins < 1 ? 'just now' : `${mins} min ago`}. Everything is saved; location is off to save battery.
          </p>
        </div>
        <Button size="lg" block icon="play" onClick={() => update((prev, now) => resume(prev, now))}>
          Resume the tour
        </Button>
        <p class="center small muted">Next up: {ch.place}</p>
      </div>
    );
  }

  let primary: { label: string; to?: string; action?: () => void; icon: 'route' | 'flag' | 'chevronRight' | 'sparkle' };
  let statusLine: string;
  if (allDone || p.envelopeOpened) {
    primary = { label: 'Read the letter again', to: 'finale', icon: 'sparkle' };
    statusLine = 'The mystery is solved. Thank you for playing.';
  } else if (st === 'upcoming' || st === 'active') {
    primary = { label: ch.id === 'prologue' ? 'Begin the prologue' : `Directions to ${w.name}`, to: ch.id === 'prologue' ? `chapter/${ch.id}` : `go/${ch.id}`, icon: 'route' };
    statusLine = ch.id === 'finale' ? 'Head back to where you started.' : 'On your way.';
  } else if (st === 'arrived') {
    const pst = ch.puzzleId ? p.puzzles[ch.puzzleId]?.status : undefined;
    primary = { label: pst === 'open' && p.chapters[ch.id].arrivedAt ? 'Continue the chapter' : 'Begin the chapter', to: `chapter/${ch.id}`, icon: 'flag' };
    statusLine = `You’re at ${w.name}.`;
  } else {
    const next = nextId ? chapterById(nextId) : null;
    primary = next
      ? {
          label: `Next: ${waypointById(next.waypoint).name}`,
          action: () => {
            update((prev, now) => advance(prev, now));
            navigate(`go/${next.id}`);
          },
          icon: 'chevronRight',
        }
      : { label: 'Open the finale', to: 'finale', icon: 'sparkle' };
    statusLine = 'Chapter complete.';
  }

  const mode = leg?.recommended;
  const modeInfo = leg ? (mode === 'walk' ? leg.walk : leg.taxi) : undefined;

  return (
    <div class="stack stack--lg">
      <section class="hero" aria-labelledby="now-title">
        <div class="hero__art">
          <Art id={ch.art} />
        </div>
        <p class="kicker">
          {chapterLabel(ch.number)} · {ch.place}
        </p>
        <h2 id="now-title" style={{ marginTop: '4px' }}>
          {ch.title}
        </h2>
        <p class="muted" style={{ marginTop: '6px' }}>
          {statusLine} {st !== 'complete' ? ch.teaser : ''}
        </p>
        <div class="stack stack--sm" style={{ marginTop: '14px' }}>
          {primary.to ? (
            <LinkButton href={href(primary.to)} size="lg" block icon={primary.icon}>
              {primary.label}
            </LinkButton>
          ) : (
            <Button size="lg" block icon={primary.icon} onClick={primary.action}>
              {primary.label}
            </Button>
          )}
          {(st === 'upcoming' || st === 'active') && ch.id !== 'prologue' ? (
            <Button
              variant="secondary"
              block
              icon="flag"
              onClick={() => {
                confirmArrival(ch.id);
                navigate(`chapter/${ch.id}`);
              }}
            >
              We’re already here
            </Button>
          ) : null}
        </div>
      </section>

      {(st === 'upcoming' || st === 'active') && ch.id !== 'prologue' ? (
        <section class="card card--ink stack" aria-label="Distance and direction">
          <div class="navdial">
            <CompassDial bearingDeg={vec?.bearingDeg ?? null} />
            <DistanceReadout
              distanceM={vec?.distanceM ?? null}
              accuracyM={vec?.accuracyM ?? null}
              bearingDeg={vec?.bearingDeg ?? null}
              approximate={!target.precise}
            />
          </div>
          {!settings.value.location || locationStatus.value === 'off' ? (
            <Button
              variant="secondary"
              icon="pin"
              onClick={() => {
                updateSettings({ location: true });
                startLocation();
              }}
            >
              Show distance with GPS
            </Button>
          ) : null}
          {leg && modeInfo ? (
            <p class="small">
              <Icon name={mode === 'walk' ? 'walk' : 'taxi'} size="sm" class="inline-icon" />{' '}
              <strong>{mode === 'walk' ? 'Walk' : 'Taxi'}</strong> · {formatMinutes(modeInfo.minutes)} · {leg.why}
            </p>
          ) : null}
        </section>
      ) : null}

      {st === 'arrived' ? (
        <section class="card stack" aria-label="What to do now">
          <p class="kicker">What to do now</p>
          <p>
            <strong>Stand:</strong> {ch.arrival.whereToStand}
          </p>
          <p>
            <strong>Look for:</strong> {ch.arrival.lookFor}
          </p>
          <p>
            <strong>Then:</strong> {ch.arrival.startAction}
          </p>
        </section>
      ) : null}

      <section class="stack stack--sm" aria-label="Progress">
        <div class="row row--between small">
          <span>
            {p.order.filter((id) => isDone(p.chapters[id].status)).length} of {p.order.length} chapters
          </span>
          {row && !allDone ? <span class="muted">This stop until ~{formatClock(row.leave)}</span> : null}
        </div>
        <div class="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${pct}%` }} />
        </div>
        {row?.warnings.map((wn) => (
          <div class="banner banner--warn small">
            <Icon name="warning" size="sm" /> {wn}
          </div>
        ))}
      </section>

      <section class="quick-grid" aria-label="Shortcuts">
        <a class="quick" href={href('route')}>
          <Icon name="map" />
          Route &amp; map
        </a>
        <a class="quick" href={href('journal')}>
          <Icon name="journal" />
          Journal
        </a>
        <button type="button" class="quick" onClick={() => update((prev, now) => pause(prev, 'Break', now))}>
          <Icon name="coffee" />
          Pause for a break
        </button>
        <a class="quick" href={href('help')}>
          <Icon name="help" />
          Something wrong?
        </a>
      </section>
    </div>
  );
}
