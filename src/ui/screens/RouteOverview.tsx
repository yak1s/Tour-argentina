import { useState } from 'preact/hooks';
import type { ChapterId } from '../../content/types';
import { chapterById, legById, waypointById } from '../../content';
import { progress, update } from '../../engine/store';
import { isDone, moveChapter, nextUnfinished, pause, restorePlannedOrder, setCurrent, setNavSuspended, skipChapter } from '../../engine/progress';
import { formatClock, legMinutes, plannedSchedule, projectSchedule } from '../../engine/schedule';
import { CHAPTER_IDS } from '../../content';
import { navigate } from '../router';
import { Button, ConfirmDialog, Sheet } from '../components/ui';
import { Icon } from '../components/Icon';
import { RouteMap } from '../components/RouteMap';
import { chapterLabel } from '../shared';

export function RouteScreen() {
  const p = progress.value;
  const [selected, setSelected] = useState<ChapterId | null>(null);
  const [confirmSkip, setConfirmSkip] = useState<ChapterId | null>(null);
  const now = new Date();
  const planned = plannedSchedule(p.order, now);
  const projected = projectSchedule(p, now);
  const doneCount = p.order.filter((id) => isDone(p.chapters[id].status)).length;
  const fill = p.order.length > 1 ? (doneCount / p.order.length) * 100 : 0;
  const reordered = p.order.some((id, i) => id !== CHAPTER_IDS[i]);
  const intendedNext = nextUnfinished({ ...p, order: [...CHAPTER_IDS] });
  const offRoute = intendedNext && intendedNext !== p.current && !isDone(p.chapters[p.current].status);

  const sel = selected ? chapterById(selected) : null;

  return (
    <div class="stack stack--lg">
      <section class="stack stack--sm">
        <p class="kicker">The day</p>
        <h2>Route &amp; map</h2>
        <p class="muted small">
          Starts 9:15 at Córdoba y Gallo and returns there. Times are estimates — traffic, crowds, lunch and curiosity all change them. Nothing here is a race.
        </p>
      </section>

      <RouteMap onSelect={(id) => setSelected(id)} />

      {offRoute || reordered ? (
        <div class="banner">
          <Icon name="route" />
          <div class="grow small">{reordered ? 'You’ve changed the order of the stops.' : 'You’re heading somewhere other than the planned next stop.'}</div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              update((prev, ts) => {
                const restored = restorePlannedOrder(prev, ts);
                const next = nextUnfinished(restored);
                return next ? setCurrent(restored, next, ts) : restored;
              });
            }}
          >
            Return to the planned route
          </Button>
        </div>
      ) : null}

      <div class="timeline-wrap">
      <i class="timeline__fill" style={{ height: `max(0px, calc(${fill}% - 36px))` }} aria-hidden="true" />
      <ol class="timeline" aria-label="Stops in order">
        {p.order.map((id, i) => {
          const ch = chapterById(id);
          const w = waypointById(ch.waypoint);
          const st = p.chapters[id].status;
          const leg = legById(ch.legId);
          const plan = planned.find((r) => r.chapterId === id);
          const proj = projected.find((r) => r.chapterId === id);
          const current = p.current === id && !isDone(st);
          return (
            <>
              {i > 0 && leg ? (
                <li class="tl-leg" aria-label={`${leg.recommended === 'walk' ? 'Walk' : 'Taxi'}, about ${legMinutes(leg)} minutes`}>
                  <Icon name={leg.recommended === 'walk' ? 'walk' : 'taxi'} size="sm" />
                  {leg.recommended === 'walk' ? 'Walk' : 'Taxi'} · ~{legMinutes(leg)} min
                </li>
              ) : null}
              <li class={`tl-item${current ? ' is-current' : ''}${st === 'complete' ? ' is-done' : ''}${st === 'skipped' ? ' is-skipped' : ''}`}>
                <div class="tl-dot">{st === 'complete' ? <Icon name="check" size="sm" /> : ch.number}</div>
                <div class="tl-body">
                  <button type="button" class="tl-button" onClick={() => setSelected(id)} aria-label={`Options for ${w.name}`}>
                    <div class="tl-title">{w.name}</div>
                    <div class="tl-meta">
                      {chapterLabel(ch.number)} · {ch.title}
                    </div>
                    <div class="tl-meta">
                      {st === 'complete'
                        ? `Done${p.chapters[id].completedAt ? ` at ${formatClock(new Date(p.chapters[id].completedAt!))}` : ''}`
                        : st === 'skipped'
                          ? 'Skipped'
                          : proj
                            ? `Planned ${plan ? formatClock(plan.arrive) : '—'} · now ~${formatClock(proj.arrive)}`
                            : plan
                              ? `Planned ${formatClock(plan.arrive)}`
                              : ''}
                    </div>
                  </button>
                  {!isDone(st)
                    ? proj?.warnings.map((wn) => (
                        <p class="xsmall" style={{ color: 'var(--warn)', marginTop: '4px' }}>
                          <Icon name="warning" size="sm" class="inline-icon" /> {wn}
                        </p>
                      ))
                    : null}
                </div>
              </li>
            </>
          );
        })}
      </ol>
      </div>

      <section class="card card--ink stack stack--sm">
        <p class="kicker">Pace yourselves</p>
        <div class="row row--wrap">
          <Button variant="secondary" icon="coffee" onClick={() => update((prev, ts) => pause(prev, 'Break', ts))}>
            Pause the tour
          </Button>
          <Button variant="secondary" icon="pin" onClick={() => update((prev, ts) => setNavSuspended(prev, !prev.navSuspended, ts))}>
            {p.navSuspended ? 'Resume GPS' : 'Suspend GPS'}
          </Button>
        </div>
        <p class="xsmall muted">Pausing or suspending never loses progress. GPS is only used on this phone.</p>
      </section>

      {sel && selected ? (
        <Sheet title={waypointById(sel.waypoint).name} onClose={() => setSelected(null)}>
          <div class="stack">
            <p class="small muted">
              {chapterLabel(sel.number)} · {sel.title}. {sel.teaser}
            </p>
            {isDone(p.chapters[selected].status) ? (
              <Button
                block
                variant="secondary"
                onClick={() => {
                  setSelected(null);
                  navigate(`chapter/${selected}`);
                }}
              >
                Revisit this chapter
              </Button>
            ) : (
              <>
                <Button
                  block
                  icon="route"
                  onClick={() => {
                    update((prev, ts) => setCurrent(prev, selected, ts));
                    setSelected(null);
                    navigate(selected === 'prologue' ? 'chapter/prologue' : `go/${selected}`);
                  }}
                >
                  {p.current === selected ? 'Directions' : 'Go here next'}
                </Button>
                {selected !== 'prologue' && selected !== 'finale' ? (
                  <div class="row row--wrap">
                    <Button size="sm" variant="secondary" icon="chevronUp" onClick={() => update((prev, ts) => moveChapter(prev, selected, -1, ts))}>
                      Earlier
                    </Button>
                    <Button size="sm" variant="secondary" icon="chevronDown" onClick={() => update((prev, ts) => moveChapter(prev, selected, 1, ts))}>
                      Later
                    </Button>
                    <Button size="sm" variant="ghost" icon="skip" onClick={() => setConfirmSkip(selected)}>
                      Skip
                    </Button>
                  </div>
                ) : null}
                <p class="xsmall faint">
                  Reordering is safe: each stop’s story stands on its own. Check opening times on the timeline (for example, El Rosedal is closed on Mondays).
                </p>
              </>
            )}
          </div>
        </Sheet>
      ) : null}

      {confirmSkip ? (
        <ConfirmDialog
          title="Skip this stop?"
          body="It will be marked as skipped. Its narrator line still goes into your journal."
          confirmLabel="Skip"
          onCancel={() => setConfirmSkip(null)}
          onConfirm={() => {
            const id = confirmSkip;
            setConfirmSkip(null);
            setSelected(null);
            update((prev, ts) => skipChapter(prev, id, 'Skipped from the route screen', ts));
          }}
        />
      ) : null}
    </div>
  );
}
