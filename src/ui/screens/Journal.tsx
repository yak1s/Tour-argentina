import { useEffect, useState } from 'preact/hooks';
import { allThreads, chapterById, CHAPTERS, PUZZLES } from '../../content';
import { progress } from '../../engine/store';
import { summarize } from '../../engine/progress';
import { correctAnswerOf } from '../../engine/answers';
import { deleteMemory, listMemories, type Memory } from '../../platform/db';
import { navigate, href } from '../router';
import { Button, ConfirmDialog, Segmented } from '../components/ui';
import { Icon } from '../components/Icon';
import { FactCard, ThreadCard } from '../components/Journal';
import { chapterLabel } from '../shared';

type Tab = 'threads' | 'facts' | 'clues' | 'challenges' | 'memories';
const TABS: { value: Tab; label: string }[] = [
  { value: 'threads', label: 'Threads' },
  { value: 'facts', label: 'Facts' },
  { value: 'clues', label: 'Clues' },
  { value: 'challenges', label: 'Record' },
  { value: 'memories', label: 'Photos' },
];

function Threads() {
  const p = progress.value;
  const threads = allThreads();
  return (
    <div class="stack">
      <p class="small muted">
        One true thing from every stop. Read them together at the end: they tell you who has been speaking. Lines from skipped stops are included so the
        mystery always stays solvable.
      </p>
      {threads.map(({ thread, chapter }, i) =>
        p.threads.includes(thread.id) ? (
          <ThreadCard thread={thread} n={i + 1} skipped={p.chapters[chapter.id].status === 'skipped'} revealed={p.envelopeOpened} />
        ) : (
          <div class="thread thread--locked">
            <div class="thread__n">True thing no. {i + 1}</div>
            Collected at {chapter.place.split(' · ')[0]}.
          </div>
        ),
      )}
      <div class="fact center">
        <Icon name="lock" />
        <p class="small" style={{ marginTop: '6px' }}>
          {p.envelopeOpened ? 'The envelope is open.' : 'The sealed envelope opens back at Córdoba y Gallo.'}
        </p>
        {p.envelopeOpened ? (
          <a class="btn btn--ghost btn--sm" href={href('finale')}>
            Read the letter
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Facts() {
  const p = progress.value;
  const groups = CHAPTERS.map((c) => ({ chapter: c, facts: c.facts.filter((f) => p.facts.includes(f.id)) })).filter((g) => g.facts.length);
  if (!groups.length) return <p class="muted">Facts appear here as you reach each stop.</p>;
  return (
    <div class="stack stack--lg">
      {groups.map((g) => (
        <section class="stack">
          <p class="kicker">
            {chapterLabel(g.chapter.number)} · {g.chapter.place.split(' · ')[0]}
          </p>
          {g.facts.map((f) => (
            <FactCard fact={f} />
          ))}
        </section>
      ))}
    </div>
  );
}

function Clues() {
  const p = progress.value;
  const items: { title: string; body: string; icon: 'key' | 'compass' | 'text' | 'sparkle' }[] = [];
  if (p.deductions.key) items.push({ title: 'The key', body: `${p.deductions.key} — the street number on Ayacucho. Digits: ${p.deductions.key.split('').join(' · ')}.`, icon: 'key' });
  if (p.deductions.shore) items.push({ title: 'Where the water was', body: `To the ${p.deductions.shore} of Plaza de Mayo: behind the fort where the Casa Rosada stands.`, icon: 'compass' });
  const msg = p.puzzles['p-message'];
  if (msg && (msg.status === 'solved' || msg.status === 'skipped')) items.push({ title: 'The coded message', body: 'J EN PPX B RFVTQO → I AM NOT A PERSON', icon: 'text' });
  const silver = p.puzzles['p-silver'];
  if (silver && (silver.status === 'solved' || silver.status === 'skipped')) items.push({ title: 'The colour of the name', body: 'Silver — plata.', icon: 'sparkle' });
  return (
    <div class="stack">
      {items.length ? (
        items.map((it) => (
          <div class="fact row" style={{ alignItems: 'flex-start' }}>
            <Icon name={it.icon} />
            <div>
              <strong>{it.title}</strong>
              <p class="small">{it.body}</p>
            </div>
          </div>
        ))
      ) : (
        <p class="muted">Keys, decoded messages and deductions will be kept here.</p>
      )}
    </div>
  );
}

function Challenges() {
  const p = progress.value;
  const s = summarize(p);
  return (
    <div class="stack">
      <div class="row row--wrap small">
        <span class="pill pill--ok">{s.solved} solved</span>
        <span class="pill">{s.skippedPuzzles} skipped</span>
        <span class="pill">{s.hintsUsed} hints</span>
        <span class="pill">{s.stopsVisited + s.stopsSkipped} of {s.totalStops} stops</span>
      </div>
      {Object.values(PUZZLES).map((pz) => {
        const st = p.puzzles[pz.id]!;
        const ch = chapterById(pz.chapter);
        const label =
          st.status === 'solved' ? 'Solved' : st.status === 'skipped' ? 'Skipped' : st.status === 'open' ? 'In progress' : 'Not yet';
        const done = st.status === 'solved' || st.status === 'skipped';
        const answer = correctAnswerOf(pz);
        const shown = Array.isArray(answer)
          ? pz.type === 'order'
            ? answer.map((id) => pz.items.find((i) => i.id === id)?.label).join(' → ')
            : answer.join(', ')
          : pz.type === 'choice'
            ? pz.options.find((o) => o.id === answer)?.label
            : pz.type === 'elimination'
              ? pz.candidates.find((c) => c.id === answer)?.label
              : answer;
        return (
          <button type="button" class="fact" style={{ textAlign: 'left', width: '100%' }} onClick={() => navigate(st.status === 'locked' ? `chapter/${ch.id}` : `puzzle/${pz.id}`)}>
            <div class="row row--between">
              <strong>{pz.title}</strong>
              <span class={`chip ${st.status === 'solved' ? 'chip--documented' : st.status === 'skipped' ? 'chip--tradition' : 'chip--disputed'}`}>{label}</span>
            </div>
            <p class="xsmall faint">
              {chapterLabel(ch.number)} · {ch.place.split(' · ')[0]}
              {st.hintsRevealed ? ` · ${st.hintsRevealed} hint${st.hintsRevealed > 1 ? 's' : ''}` : ''}
              {st.attempts ? ` · ${st.attempts} attempt${st.attempts > 1 ? 's' : ''}` : ''}
            </p>
            {done ? <p class="small">Answer: {shown}</p> : null}
          </button>
        );
      })}
    </div>
  );
}

function Memories() {
  const [items, setItems] = useState<(Memory & { url: string })[] | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  useEffect(() => {
    let urls: string[] = [];
    void listMemories().then((list) => {
      const withUrls = list.map((m) => ({ ...m, url: URL.createObjectURL(m.blob) }));
      urls = withUrls.map((m) => m.url);
      setItems(withUrls);
    });
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);
  if (!items) return <p class="muted">Loading…</p>;
  if (!items.length)
    return (
      <p class="muted">
        No photos yet. Look for the camera extras at Caminito, El Rosedal and the Floralis Genérica. Photos are stored only on this phone.
      </p>
    );
  return (
    <div class="stack">
      <div class="memories">
        {items.map((m) => (
          <button type="button" style={{ padding: 0, border: 0, background: 'none' }} aria-label="Delete photo" onClick={() => setConfirm(m.id)}>
            <img src={m.url} alt={`Photo at ${chapterById(m.chapter as never)?.place ?? 'the tour'}`} loading="lazy" />
          </button>
        ))}
      </div>
      <p class="xsmall faint">Tap a photo to delete it. To keep one, take a screenshot or long-press it.</p>
      {confirm ? (
        <ConfirmDialog
          title="Delete this photo?"
          body="It is stored only on this phone and can’t be recovered."
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const id = confirm;
            setConfirm(null);
            void deleteMemory(id).then(() => setItems((list) => (list ? list.filter((x) => x.id !== id) : list)));
          }}
        />
      ) : null}
    </div>
  );
}

export function JournalScreen({ tab }: { tab?: string }) {
  const current = (TABS.some((t) => t.value === tab) ? tab : 'threads') as Tab;
  return (
    <div class="stack stack--lg">
      <section class="stack stack--sm">
        <p class="kicker">Your journal</p>
        <h2>Discoveries</h2>
      </section>
      <Segmented full label="Journal section" value={current} options={TABS} onChange={(v) => navigate(`journal/${v}`, { replace: true })} />
      {current === 'threads' ? <Threads /> : null}
      {current === 'facts' ? <Facts /> : null}
      {current === 'clues' ? <Clues /> : null}
      {current === 'challenges' ? <Challenges /> : null}
      {current === 'memories' ? <Memories /> : null}
      <div class="center">
        <Button variant="ghost" icon="home" onClick={() => navigate('')}>
          Back to the tour
        </Button>
      </div>
    </div>
  );
}
