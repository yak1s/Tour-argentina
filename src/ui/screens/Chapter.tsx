import { useState } from 'preact/hooks';
import type { ChapterId, Extra } from '../../content/types';
import { chapterById, CHAPTERS, puzzleById, waypointById } from '../../content';
import { effectiveCoords, progress, settings, update } from '../../engine/store';
import { advance, isDone, markExtraDone, openPuzzle, setDeduction, skipChapter } from '../../engine/progress';
import { confirmArrival } from '../../engine/navigation';
import { bearingDeg, compassWord, angleDiff } from '../../geo/math';
import { heading, compassStatus, startCompass } from '../../platform/compass';
import { position } from '../../platform/location';
import { haptic } from '../../platform/haptics';
import { sfx } from '../../audio/sfx';
import { play } from '../../audio/narrator';
import { navigate, href } from '../router';
import { Art } from '../components/Art';
import { Button, ConfirmDialog, Disclosure, LinkButton, Sheet } from '../components/ui';
import { Icon } from '../components/Icon';
import { ListenCard } from '../components/Player';
import { FactCard, SealReveal, Stamp, ThreadCard } from '../components/Journal';
import { CameraOverlay, type CameraMode } from '../components/Camera';
import { chapterLabel } from '../shared';

const OBELISCO_HEIGHT_M = 67.5;

/** The old shoreline lay east of Plaza de Mayo, behind the Casa Rosada. */
function ShoreFinder({ onDone }: { onDone: (dir: string) => void }) {
  const h = heading.value;
  const live = compassStatus.value === 'active' && h !== null;
  const plaza = effectiveCoords('plaza-de-mayo');
  const fix = position.value;
  // Point from the players towards a spot just behind the Casa Rosada.
  const target = { lat: plaza.lat - 0.0003, lng: plaza.lng + 0.004 };
  const want = fix ? bearingDeg(fix, target) : 90;
  const [result, setResult] = useState<string | null>(null);
  const choose = (dir: string, deg: number) => {
    const ok = Math.abs(angleDiff(deg, 90)) <= 50;
    setResult(ok ? `Yes — ${dir}. The water came right up behind the fort where the Casa Rosada stands.` : `Not quite: think about where the pink house is. The river was beyond it.`);
    if (ok) onDone(dir);
    haptic(ok ? 'success' : 'wrong');
  };
  return (
    <div class="stack">
      <p class="small">Stand by the Pirámide. Where was the river before the landfill?</p>
      {live ? (
        <>
          <p class="small muted">Point the top of your phone where you think the water was, then lock it in.</p>
          <Button onClick={() => choose(compassWord(h!), h!)}>Lock in: {compassWord(h!)}</Button>
          <p class="xsmall faint">(Compass reading {Math.round(h!)}°; the old shore is around {compassWord(want)} of you.)</p>
        </>
      ) : (
        <>
          <div class="row row--wrap">
            {(['north', 'east', 'south', 'west'] as const).map((d, i) => (
              <Button variant="secondary" size="sm" onClick={() => choose(d, i * 90)}>
                {d[0]!.toUpperCase() + d.slice(1)}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon="compass" onClick={() => void startCompass()}>
            Use the compass instead
          </Button>
        </>
      )}
      {result ? <div class={`feedback ${result.startsWith('Yes') ? 'feedback--right' : 'feedback--wrong'}`}>{result}</div> : null}
    </div>
  );
}

function ExtraCard({ extra, onCamera }: { extra: Extra; onCamera: (m: CameraMode) => void }) {
  const p = progress.value;
  const done = p.extrasDone.includes(extra.id);
  const [open, setOpen] = useState(false);
  const icon = extra.kind === 'camera' ? 'camera' : extra.kind === 'compass' ? 'compass' : extra.kind === 'inclinometer' ? 'tilt' : extra.kind === 'taste' ? 'coffee' : 'eye';
  const mark = () => update((prev, now) => markExtraDone(prev, extra.id, now));
  return (
    <div class="fact">
      <div class="row" style={{ alignItems: 'flex-start' }}>
        <Icon name={icon} />
        <div class="grow">
          <div class="row row--between">
            <strong>{extra.title}</strong>
            {done ? <span class="chip chip--documented">Done</span> : <span class="xsmall faint">Optional</span>}
          </div>
          <p class="small" style={{ marginTop: '4px' }}>
            {extra.body}
          </p>
          <div class="row row--wrap" style={{ marginTop: '8px' }}>
            {extra.kind === 'camera' ? (
              <Button
                size="sm"
                variant="secondary"
                icon="camera"
                onClick={() => {
                  mark();
                  onCamera(extra.id === 'x-windows' ? 'loupe' : 'memory');
                }}
              >
                Open camera
              </Button>
            ) : extra.kind === 'inclinometer' ? (
              <Button
                size="sm"
                variant="secondary"
                icon="tilt"
                onClick={() => {
                  mark();
                  onCamera('survey');
                }}
              >
                Start measuring
              </Button>
            ) : extra.kind === 'compass' ? (
              <Button size="sm" variant="secondary" icon="compass" onClick={() => setOpen(true)}>
                {p.deductions.shore ? `Found: ${p.deductions.shore}` : 'Find it'}
              </Button>
            ) : !done ? (
              <Button size="sm" variant="ghost" icon="check" onClick={mark}>
                {extra.kind === 'taste' ? 'Noted' : 'We did it'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {open ? (
        <Sheet title={extra.title} onClose={() => setOpen(false)}>
          <ShoreFinder
            onDone={(dir) => {
              update((prev, now) => markExtraDone(setDeduction(prev, 'shore', dir, now), extra.id, now));
            }}
          />
        </Sheet>
      ) : null}
    </div>
  );
}

export function ChapterScreen({ chapterId }: { chapterId: string }) {
  const p = progress.value;
  const [camera, setCamera] = useState<CameraMode | null>(null);
  const [confirmSkip, setConfirmSkip] = useState(false);
  if (!(chapterId in p.chapters)) {
    return (
      <div class="card stack">
        <h3>Chapter not found</h3>
        <LinkButton href={href('')}>Back to the tour</LinkButton>
      </div>
    );
  }
  const id = chapterId as ChapterId;
  const ch = chapterById(id);
  const w = waypointById(ch.waypoint);
  const st = p.chapters[id].status;
  const arrived = st === 'arrived' || isDone(st);
  const puzzle = ch.puzzleId ? puzzleById(ch.puzzleId) : null;
  const pst = ch.puzzleId ? p.puzzles[ch.puzzleId] : undefined;
  const threadIndex = CHAPTERS.filter((c) => c.thread).findIndex((c) => c.id === id) + 1;
  const nextId = p.order.find((cid, i) => i > p.order.indexOf(id) && !isDone(p.chapters[cid].status));
  const next = nextId ? chapterById(nextId) : null;

  const startChallenge = () => {
    if (!puzzle) return;
    update((prev, now) => openPuzzle(prev, puzzle.id, now));
    navigate(`puzzle/${puzzle.id}`);
  };

  const goNext = () => {
    update((prev, now) => advance(prev, now));
    if (!next) navigate('finale');
    else navigate(`go/${next.id}`);
  };

  return (
    <div class="stack stack--lg">
      <section class="hero">
        <div class="hero__art">
          <Art id={ch.art} label={`Illustration: ${w.name}`} />
        </div>
        <p class="kicker">
          {chapterLabel(ch.number)} · {ch.place}
        </p>
        <h2 style={{ marginTop: '4px' }}>{ch.title}</h2>
        <p class="lede" style={{ marginTop: '8px' }}>
          {ch.intro}
        </p>
      </section>

      {!arrived ? (
        <div class="banner">
          <Icon name="route" />
          <div class="grow small">
            <strong>You haven’t arrived yet.</strong> Facts unlock when you get here — or tap “We’re here” if you already are.
          </div>
          <div class="stack stack--sm">
            <LinkButton size="sm" href={href(`go/${id}`)}>
              Directions
            </LinkButton>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                confirmArrival(id);
                haptic('arrival');
                void sfx('arrival');
              }}
            >
              We’re here
            </Button>
          </div>
        </div>
      ) : null}

      {isDone(st) ? (
        <section class="card stack center" aria-label="Chapter complete">
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <Stamp skipped={st === 'skipped' || pst?.status === 'skipped'} />
          </div>
          {ch.thread ? (
            <SealReveal label="Open the narrator’s note" mark={String(threadIndex)}>
              <ThreadCard thread={ch.thread} n={threadIndex} skipped={st === 'skipped'} />
            </SealReveal>
          ) : null}
          <p>
            <strong>Why it matters:</strong> {ch.whyItMatters}
          </p>
          {puzzle?.solvedNarration && st === 'complete' ? <ListenCard clipId={puzzle.solvedNarration} /> : null}
          <hr class="rule" />
          <p class="muted">{ch.transition}</p>
          {id === 'finale' ? (
            <LinkButton href={href('finale')} size="lg" block icon="sparkle">
              Open the envelope
            </LinkButton>
          ) : (
            <Button size="lg" block iconRight="chevronRight" onClick={goNext}>
              {next ? `On to ${waypointById(next.waypoint).name}` : 'To the finale'}
            </Button>
          )}
        </section>
      ) : null}

      {!isDone(st) ? (
        <section class="card stack" aria-labelledby="arrival-title">
          <h3 id="arrival-title">{arrived ? 'You’re here' : 'When you arrive'}</h3>
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

      <section class="card stack" aria-label="Narration">
        <p class="kicker">Listen</p>
        {ch.narration.map((clip) => (
          <ListenCard clipId={clip} key={clip} showTranscript={true} />
        ))}
        {!settings.value.autoplayStory && arrived && !isDone(st) ? (
          <p class="xsmall faint">Narration never starts by itself unless you turn on “Play the story on arrival” in Settings.</p>
        ) : null}
      </section>

      {puzzle && !isDone(st) ? (
        <section class="stack stack--sm">
          <Button size="lg" block icon="sparkle" class={arrived ? 'pulse' : undefined} onClick={startChallenge}>
            {pst?.status === 'open' && (pst.attempts > 0 || pst.hintsRevealed > 0) ? 'Back to the challenge' : `Start the challenge: ${puzzle.title}`}
          </Button>
          {!arrived ? <p class="xsmall faint center">You can open it from anywhere — useful if a stop is closed.</p> : null}
        </section>
      ) : null}

      <section class="stack" aria-label="Discoveries">
        <div class="row row--between">
          <h3>Discoveries</h3>
          <span class="small muted">{ch.facts.length}</span>
        </div>
        {arrived ? (
          ch.facts.map((f) => <FactCard fact={f} key={f.id} />)
        ) : (
          <div class="fact">
            <p class="small">
              <Icon name="lock" size="sm" class="inline-icon" /> {ch.facts.length} discoveries unlock when you arrive.
            </p>
          </div>
        )}
      </section>

      {ch.extras.length ? (
        <section class="stack" aria-label="Optional extras">
          <h3>Optional extras</h3>
          {ch.extras.map((x) => (
            <ExtraCard extra={x} key={x.id} onCamera={setCamera} />
          ))}
        </section>
      ) : null}

      <section class="card card--ink">
        <Disclosure summary="What if something goes wrong here?">
          <div class="stack stack--sm" style={{ marginTop: '6px' }}>
            {ch.alternatives.map((a) => (
              <p class="small">• {a.text}</p>
            ))}
            <p class="small muted">{w.access}</p>
            <p class="xsmall faint">{w.coordsNote}</p>
          </div>
        </Disclosure>
      </section>

      {ch.skippable && !isDone(st) ? (
        <div class="center">
          <Button variant="ghost" icon="skip" onClick={() => setConfirmSkip(true)}>
            Skip this stop
          </Button>
        </div>
      ) : null}

      {confirmSkip ? (
        <ConfirmDialog
          title={`Skip ${w.name}?`}
          body="It will be recorded as skipped, not solved. The narrator’s line still goes into your journal, so nothing breaks."
          confirmLabel="Skip this stop"
          onCancel={() => setConfirmSkip(false)}
          onConfirm={() => {
            setConfirmSkip(false);
            update((prev, now) => skipChapter(prev, id, 'Skipped by the players', now));
          }}
        />
      ) : null}

      {camera ? (
        <CameraOverlay
          mode={camera}
          chapterId={id}
          target={camera === 'survey' ? { ...effectiveCoords('obelisco'), heightM: OBELISCO_HEIGHT_M, name: 'Obelisco' } : undefined}
          onClose={() => setCamera(null)}
        />
      ) : null}

      {settings.value.autoplayStory && arrived && !isDone(st) && ch.narration[0] ? <AutoPlay clip={ch.narration[0]} chapterId={id} /> : null}
    </div>
  );
}

/** Plays the chapter story once per arrival when the players enabled autoplay. */
const autoplayed = new Set<string>();
function AutoPlay({ clip, chapterId }: { clip: string; chapterId: string }) {
  const key = `${chapterId}:${progress.value.chapters[chapterId as ChapterId].arrivedAt ?? 0}`;
  if (!autoplayed.has(key)) {
    autoplayed.add(key);
    queueMicrotask(() => void play(clip));
  }
  return null;
}
