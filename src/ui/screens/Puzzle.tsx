import { useEffect, useState } from 'preact/hooks';
import type { Puzzle } from '../../content/types';
import { chapterById, PUZZLES, puzzleById } from '../../content';
import { progress, settings, update } from '../../engine/store';
import { openPuzzle, recordAttempt, revealHint, saveDraft, skipPuzzle } from '../../engine/progress';
import { checkAnswer, correctAnswerOf, genericWrong } from '../../engine/answers';
import { haptic } from '../../platform/haptics';
import { sfx } from '../../audio/sfx';
import { play } from '../../audio/narrator';
import { navigate, href } from '../router';
import { Button, ConfirmDialog, LinkButton } from '../components/ui';
import { Icon } from '../components/Icon';
import { Stamp } from '../components/Journal';
import { ListenCard } from '../components/Player';
import { ChoiceAnswer, CipherAnswer, CodeLock, EliminationAnswer, OrderAnswer, TextAnswer } from '../puzzles/Inputs';
import { chapterLabel, triggerRevelation } from '../shared';

function answerLabel(puzzle: Puzzle, answer: string | string[]): string {
  if (Array.isArray(answer)) {
    if (puzzle.type === 'order') return answer.map((id) => puzzle.items.find((i) => i.id === id)?.label ?? id).join(' → ');
    return answer.join(', ');
  }
  if (puzzle.type === 'choice') return puzzle.options.find((o) => o.id === answer)?.label ?? answer;
  if (puzzle.type === 'elimination') return puzzle.candidates.find((c) => c.id === answer)?.label ?? answer;
  return answer;
}

export function PuzzleScreen({ puzzleId }: { puzzleId: string }) {
  const p = progress.value;
  const [feedback, setFeedback] = useState<{ kind: 'wrong' | 'right'; text: string; key: number } | null>(null);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [confirmLastHint, setConfirmLastHint] = useState(false);

  // Opening a challenge directly is allowed (the fallback when a place is closed).
  useEffect(() => {
    if (PUZZLES[puzzleId] && progress.value.puzzles[puzzleId]?.status === 'locked') {
      update((prev, now) => openPuzzle(prev, puzzleId, now));
    }
  }, [puzzleId]);

  if (!PUZZLES[puzzleId]) {
    return (
      <div class="card stack">
        <h3>Challenge not found</h3>
        <LinkButton href={href('')}>Back to the tour</LinkButton>
      </div>
    );
  }
  const puzzle = puzzleById(puzzleId);
  const ch = chapterById(puzzle.chapter);
  const st = p.puzzles[puzzleId]!;
  const finished = st.status === 'solved' || st.status === 'skipped';

  const onDraft = (d: string | string[]) => update((prev, now) => saveDraft(prev, puzzleId, d, now));

  const onSubmit = (answer: string | string[]) => {
    const result = checkAnswer(puzzle, answer);
    if (result.invalid) {
      setFeedback({ kind: 'wrong', text: result.feedback ?? 'That doesn’t look like an answer yet.', key: Date.now() });
      haptic('wrong');
      return;
    }
    const label = answerLabel(puzzle, answer);
    update((prev, now) => recordAttempt(prev, puzzleId, label, result.correct, now));
    if (result.correct) {
      setFeedback({ kind: 'right', text: puzzle.success, key: Date.now() });
      haptic('success');
      void sfx('success');
      setTimeout(() => void sfx('stamp', 0.8), 380);
      if (puzzle.id === 'p-message') triggerRevelation();
      if (puzzle.id === 'p-voice') {
        setTimeout(() => navigate('finale'), 900);
        return;
      }
      // Solving is a user gesture, so the follow-up narration may start right away.
      if (settings.value.autoplayStory && puzzle.solvedNarration) void play(puzzle.solvedNarration);
    } else {
      setFeedback({ kind: 'wrong', text: result.feedback ?? genericWrong(st.attempts), key: Date.now() });
      haptic('wrong');
      void sfx('wrong', 0.6);
    }
  };

  const takeHint = () => {
    const nextIndex = st.hintsRevealed;
    if (nextIndex >= puzzle.hints.length) return;
    if (nextIndex === puzzle.hints.length - 1 && !confirmLastHint) {
      setConfirmLastHint(true);
      return;
    }
    setConfirmLastHint(false);
    update((prev, now) => revealHint(prev, puzzleId, now));
    haptic('hint');
    void sfx('hint', 0.7);
  };

  const common = { draft: st.draft, onDraft, onSubmit, disabled: finished };
  const wrongChoices = puzzle.type === 'choice' ? puzzle.options.filter((o) => st.wrong.includes(o.label)).map((o) => o.id) : [];

  return (
    <div class="stack stack--lg">
      <section class="stack stack--sm">
        <p class="kicker">
          Challenge · {chapterLabel(ch.number)} · {ch.place.split(' · ')[0]}
        </p>
        <h2>{puzzle.title}</h2>
        <p class="lede">{puzzle.prompt}</p>
      </section>

      {!finished ? (
        <section class="card stack stack--sm" aria-label="How to solve">
          {puzzle.setup.map((line, i) => (
            <p class="small">
              <span class="setup-n">{i + 1}</span> {line}
            </p>
          ))}
          {puzzle.type === 'order' ? (
            <div class="stack stack--sm" style={{ marginTop: '6px' }}>
              <p class="kicker">Clue cards</p>
              {puzzle.clues.map((c) => (
                <div class="thread" style={{ fontSize: 'var(--fs-sm)' }}>
                  {c}
                </div>
              ))}
            </div>
          ) : null}
          {puzzle.chapter === 'colours' ? <ListenCard clipId="colours-story" showTranscript={false} /> : null}
        </section>
      ) : null}

      <section class="card stack" aria-label="Answer area">
        {puzzle.type === 'text' || puzzle.type === 'number' ? <TextAnswer puzzle={puzzle} {...common} /> : null}
        {puzzle.type === 'choice' ? <ChoiceAnswer puzzle={puzzle} {...common} wrong={wrongChoices} /> : null}
        {puzzle.type === 'order' ? <OrderAnswer puzzle={puzzle} {...common} /> : null}
        {puzzle.type === 'cipher' ? <CipherAnswer puzzle={puzzle} {...common} knownKey={p.deductions.key} /> : null}
        {puzzle.type === 'elimination' ? <EliminationAnswer puzzle={puzzle} {...common} /> : null}
        {puzzle.type === 'code' ? <CodeLock puzzle={puzzle} {...common} /> : null}

        {feedback && !finished ? (
          <div key={feedback.key} class={`feedback feedback--${feedback.kind}${feedback.kind === 'wrong' ? ' shake' : ''}`} role="status" aria-live="assertive">
            {feedback.text}
          </div>
        ) : null}

        {!finished && st.wrong.length ? (
          <p class="xsmall faint">Already tried: {st.wrong.join(' · ')}</p>
        ) : null}
      </section>

      {finished ? (
        <section class="card stack center" aria-live="polite">
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <Stamp skipped={st.status === 'skipped'} />
          </div>
          <h3>{st.status === 'solved' ? puzzle.success : 'Skipped — the story continues'}</h3>
          <p class="muted">{puzzle.solution}</p>
          {st.status === 'skipped' ? (
            <p class="small faint">The answer: {answerLabel(puzzle, correctAnswerOf(puzzle))}</p>
          ) : null}
          {puzzle.solvedNarration && puzzle.id !== 'p-voice' ? <ListenCard clipId={puzzle.solvedNarration} showTranscript /> : null}
          {puzzle.id === 'p-voice' ? (
            <LinkButton href={href('finale')} size="lg" block icon="sparkle">
              Open the envelope
            </LinkButton>
          ) : (
            <LinkButton href={href(`chapter/${ch.id}`)} size="lg" block iconRight="chevronRight">
              Continue
            </LinkButton>
          )}
        </section>
      ) : null}

      {!finished ? (
        <section class="stack" aria-label="Hints">
          {puzzle.hints.slice(0, st.hintsRevealed).map((h, i) => (
            <div class="hint">
              <b>Hint {i + 1}:</b> {h}
            </div>
          ))}
          {st.hintsRevealed < puzzle.hints.length ? (
            <Button variant="secondary" icon="hint" onClick={takeHint}>
              {confirmLastHint
                ? 'The last hint all but gives it away — show it?'
                : `Need a nudge? (hint ${st.hintsRevealed + 1} of ${puzzle.hints.length})`}
            </Button>
          ) : null}
          <p class="xsmall faint">
            <Icon name="info" size="sm" class="inline-icon" /> {puzzle.fallback}
          </p>
          <div class="center">
            <Button variant="ghost" icon="skip" onClick={() => setConfirmSkip(true)}>
              Skip this challenge
            </Button>
          </div>
        </section>
      ) : null}

      {confirmSkip ? (
        <ConfirmDialog
          title="Skip this challenge?"
          body="It will be recorded as skipped, not solved. You’ll see the answer, collect the narrator’s line, and carry on."
          confirmLabel="Skip and show the answer"
          onCancel={() => setConfirmSkip(false)}
          onConfirm={() => {
            setConfirmSkip(false);
            update((prev, now) => skipPuzzle(prev, puzzleId, now));
            if (puzzle.id === 'p-message') triggerRevelation();
            if (puzzle.id === 'p-voice') navigate('finale');
          }}
        />
      ) : null}
    </div>
  );
}
