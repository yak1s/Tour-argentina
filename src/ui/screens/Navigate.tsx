import { useEffect, useState } from 'preact/hooks';
import type { Alternative, ChapterId } from '../../content/types';
import { chapterById, legById, waypointById } from '../../content';
import { effectiveCoords, isPrecise, progress, settings, update, updateSettings } from '../../engine/store';
import { pause, setCurrent, setNavSuspended, skipChapter } from '../../engine/progress';
import { confirmArrival, navReading, targetVector } from '../../engine/navigation';
import { formatMinutes, walkingMinutesRange, distanceM, formatDistance } from '../../geo/math';
import { locationStatus, position, startLocation } from '../../platform/location';
import { wakeLockSupported } from '../../platform/wakelock';
import { online } from '../../platform/network';
import { haptic } from '../../platform/haptics';
import { sfx } from '../../audio/sfx';
import { navigate, href } from '../router';
import { Button, ConfirmDialog, LinkButton, Segmented, Sheet, Switch } from '../components/ui';
import { Icon } from '../components/Icon';
import { CompassDial, CompassToggle, DistanceReadout } from '../components/Compass';
import { chapterLabel } from '../shared';

const ALT_LABEL: Record<Alternative['when'], string> = {
  closed: 'It’s closed',
  crowded: 'Too crowded',
  weather: 'Bad weather',
  gps: 'GPS trouble',
  tired: 'We’re tired',
  unsafe: 'Doesn’t feel safe',
  time: 'Short on time',
};

function mapsUrl(lat: number, lng: number, mode: 'walking' | 'driving'): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}&travelmode=${mode}`;
}

export function NavigateScreen({ chapterId }: { chapterId?: string }) {
  const p = progress.value;
  const id = (chapterId && chapterId in p.chapters ? chapterId : p.current) as ChapterId;
  const ch = chapterById(id);
  const w = waypointById(ch.waypoint);
  const leg = legById(ch.legId);
  const [mode, setMode] = useState<'walk' | 'taxi'>(leg?.recommended ?? 'walk');
  const [driverCard, setDriverCard] = useState(false);
  const [problems, setProblems] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const isCurrent = p.current === id;
  const coords = effectiveCoords(w.id);
  const fix = position.value;
  const vec = isCurrent ? targetVector.value : null;
  const dist = vec?.distanceM ?? (fix ? distanceM(fix, coords) : null);
  const reading = isCurrent ? navReading.value : null;
  const precise = isPrecise(w);
  const s = settings.value;

  // Opening directions to a stop makes it the current target.
  useEffect(() => {
    const status = progress.value.chapters[id].status;
    if (progress.value.current !== id && status !== 'complete' && status !== 'skipped') {
      update((prev, now) => setCurrent(prev, id, now));
    }
  }, [id]);

  const walk = leg?.walk;
  const taxi = leg?.taxi;
  const showWalk = mode === 'walk' && walk;
  const showTaxi = mode === 'taxi' && taxi;

  const arrive = () => {
    confirmArrival(id);
    haptic('arrival');
    void sfx('arrival');
    navigate(`chapter/${id}`);
  };

  return (
    <div class="stack stack--lg">
      <section class="stack stack--sm">
        <p class="kicker">
          {chapterLabel(ch.number)} · Where am I going?
        </p>
        <h2>{w.name}</h2>
        <p class="muted">{w.description}</p>
        <p class="small">
          <Icon name="pin" size="sm" class="inline-icon" /> {w.address}
        </p>
      </section>

      <section class="card card--ink stack" aria-label="Distance and direction">
        <div class="navdial">
          <CompassDial bearingDeg={vec?.bearingDeg ?? null} />
          <DistanceReadout distanceM={dist} accuracyM={vec?.accuracyM ?? fix?.accuracy ?? null} bearingDeg={vec?.bearingDeg ?? null} approximate={!precise} />
        </div>
        {reading?.note ? <p class="small muted">{reading.note}</p> : null}
        {!precise ? <p class="xsmall faint">This stop’s position is approximate: the app will suggest arrival, and you confirm it.</p> : null}
        {!s.location || locationStatus.value === 'off' ? (
          <Button
            variant="secondary"
            icon="pin"
            onClick={() => {
              updateSettings({ location: true });
              startLocation();
            }}
          >
            Turn on location
          </Button>
        ) : locationStatus.value === 'denied' ? (
          <p class="small muted">Location is blocked for this site. You can allow it in the browser’s site settings, or carry on with the directions below.</p>
        ) : locationStatus.value === 'unavailable' ? (
          <p class="small muted">No GPS fix right now (tall buildings or indoors). Follow the directions; we’ll pick it up again.</p>
        ) : (
          <CompassToggle />
        )}
        {dist !== null && dist > 0 && leg?.walk ? (
          <p class="xsmall faint">
            Straight-line distance isn’t walking distance: on foot this leg is about {formatDistance(leg.walk.distanceM)} ({formatMinutes(leg.walk.minutes)}). From here: roughly {formatMinutes(walkingMinutesRange(dist))} on foot.
          </p>
        ) : null}
      </section>

      {leg ? (
        <section class="card stack" aria-labelledby="how-title">
          <div class="row row--between row--wrap">
            <h3 id="how-title">How do I get there?</h3>
            {walk && taxi ? (
              <Segmented
                label="Travel mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'walk', label: leg.recommended === 'walk' ? 'Walk ★' : 'Walk' },
                  { value: 'taxi', label: leg.recommended === 'taxi' ? 'Taxi ★' : 'Taxi' },
                ]}
              />
            ) : null}
          </div>
          <p class="small muted">
            <strong>Recommended: {leg.recommended === 'walk' ? 'walk' : 'taxi'}.</strong> {leg.why}
          </p>

          {showWalk && walk ? (
            <div class="stack">
              <div class="row row--wrap" style={{ gap: '8px' }}>
                <span class="pill pill--accent">
                  <Icon name="walk" size="sm" /> {formatDistance(walk.distanceM)} · {formatMinutes(walk.minutes)}
                </span>
                <span class={`pill${walk.verification === 'streets' ? ' pill--ok' : ''}`}>
                  {walk.verification === 'streets' ? 'Street-checked directions' : 'General orientation only'}
                </span>
              </div>
              {walk.verification === 'orientation' ? (
                <p class="xsmall muted">These steps give the general way, not every turn: follow the street signs, or open the leg in a maps app if you have a connection.</p>
              ) : null}
              <ol class="steps">
                {walk.steps.map((st) => (
                  <li>
                    {st.text}
                    {st.landmark ? <span class="landmark">{st.landmark}</span> : null}
                  </li>
                ))}
              </ol>
              {leg.enRoute?.map((t) => (
                <p class="small">
                  <Icon name="eye" size="sm" class="inline-icon" /> {t}
                </p>
              ))}
            </div>
          ) : null}

          {showTaxi && taxi ? (
            <div class="stack">
              <div class="row row--wrap" style={{ gap: '8px' }}>
                <span class="pill pill--accent">
                  <Icon name="taxi" size="sm" /> {taxi.distanceKm[0]}–{taxi.distanceKm[1]} km · {formatMinutes(taxi.minutes)}
                </span>
                <span class="pill">Estimate · traffic varies</span>
              </div>
              <p class="small">
                <strong>Pick-up:</strong> {taxi.pickup}
              </p>
              <p class="small">
                <strong>Drop-off:</strong> {taxi.dropoff}
              </p>
              <Button variant="secondary" icon="text" onClick={() => setDriverCard(true)}>
                Show the driver (in Spanish)
              </Button>
              <p class="xsmall muted">Hail an official black-and-yellow taxi or use a ride app; agree on the destination before you set off.</p>
            </div>
          ) : null}

          <div class="row row--wrap">
            <LinkButton href={mapsUrl(coords.lat, coords.lng, mode === 'walk' ? 'walking' : 'driving')} variant="ghost" icon="external" external>
              Open in Maps{online.value ? '' : ' (needs internet)'}
            </LinkButton>
          </div>
        </section>
      ) : null}

      {leg?.safety.length ? (
        <section class="card card--ink stack stack--sm" aria-label="Safety">
          <p class="kicker">
            <Icon name="shield" size="sm" class="inline-icon" /> Safety
          </p>
          {leg.safety.map((t) => (
            <p class="small">{t}</p>
          ))}
        </section>
      ) : null}

      <section class="card stack" aria-labelledby="arrive-title">
        <h3 id="arrive-title">When you arrive</h3>
        <p>
          <strong>Stand:</strong> {ch.arrival.whereToStand}
        </p>
        <p>
          <strong>Look for:</strong> {ch.arrival.lookFor}
        </p>
        <p>
          <strong>Then:</strong> {ch.arrival.startAction}
        </p>
        <p class="small muted">{w.access}</p>
      </section>

      <div class="stack stack--sm">
        <Button size="lg" block icon="flag" onClick={arrive}>
          We’re here
        </Button>
        <div class="row row--wrap" style={{ justifyContent: 'center' }}>
          <Button variant="ghost" icon="warning" onClick={() => setProblems(true)}>
            Problems?
          </Button>
          <a class="btn btn--ghost" href={href('route')}>
            <Icon name="route" /> Choose another stop
          </a>
        </div>
        {wakeLockSupported() && s.location ? (
          <div class="row small muted" style={{ justifyContent: 'center' }}>
            Keep screen on while navigating <Switch label="Keep screen on" checked={s.keepAwake} onChange={(v) => updateSettings({ keepAwake: v })} />
          </div>
        ) : null}
      </div>

      {driverCard && taxi ? (
        <Sheet title="Show this to the driver" onClose={() => setDriverCard(false)}>
          <div class="driver-card" lang="es">
            {taxi.tellDriver}
          </div>
          <p class="small muted" style={{ marginTop: '12px' }}>
            In English: take us to {w.name} — {w.address}.
          </p>
        </Sheet>
      ) : null}

      {problems ? (
        <Sheet title="Something not right?" onClose={() => setProblems(false)}>
          <div class="stack">
            {ch.alternatives.map((a) => (
              <div class="fact">
                <strong>{ALT_LABEL[a.when]}</strong>
                <p class="small" style={{ marginTop: '4px' }}>
                  {a.text}
                </p>
              </div>
            ))}
            <div class="fact">
              <strong>Lost or no GPS?</strong>
              <p class="small" style={{ marginTop: '4px' }}>
                Follow the written directions and street signs; ask for “{w.name}”. You can always tap “We’re here” yourself.
              </p>
            </div>
            <div class="stack stack--sm">
              <Button
                variant="secondary"
                icon="coffee"
                onClick={() => {
                  update((prev, now) => pause(prev, 'Break', now));
                  setProblems(false);
                  navigate('');
                }}
              >
                Pause the tour
              </Button>
              <Button
                variant="secondary"
                icon="pin"
                onClick={() => {
                  update((prev, now) => setNavSuspended(prev, !prev.navSuspended, now));
                  setProblems(false);
                }}
              >
                {p.navSuspended ? 'Resume GPS navigation' : 'Suspend GPS (save battery)'}
              </Button>
              {ch.skippable ? (
                <Button variant="secondary" icon="skip" onClick={() => setConfirmSkip(true)}>
                  Skip this stop
                </Button>
              ) : null}
            </div>
          </div>
        </Sheet>
      ) : null}

      {confirmSkip ? (
        <ConfirmDialog
          title={`Skip ${w.name}?`}
          body="The stop is marked as skipped (not solved). Its narrator line still goes into your journal, so the final question stays solvable. You can come back to it from the route screen."
          confirmLabel="Skip this stop"
          onCancel={() => setConfirmSkip(false)}
          onConfirm={() => {
            setConfirmSkip(false);
            setProblems(false);
            update((prev, now) => skipChapter(prev, id, 'Skipped from directions', now));
            navigate('', { replace: true });
          }}
        />
      ) : null}
    </div>
  );
}

