import { useState } from 'preact/hooks';
import type { Fact, Thread } from '../../content/types';
import { haptic } from '../../platform/haptics';
import { sfx } from '../../audio/sfx';
import { Certainty } from './ui';
import { Icon } from './Icon';

export function FactCard({ fact, open }: { fact: Fact; open?: boolean }) {
  return (
    <article class="fact">
      <div class="row row--between" style={{ alignItems: 'flex-start' }}>
        <h4 class="fact__title">{fact.title}</h4>
        <Certainty c={fact.certainty} />
      </div>
      <p style={{ marginTop: '6px' }}>{fact.body}</p>
      {fact.more ? (
        <details class="disclosure" open={open}>
          <summary>
            <Icon name="chevronRight" size="sm" class="chev" />
            More
          </summary>
          <p class="small">{fact.more}</p>
        </details>
      ) : null}
      <p class="fact__source">Source: {fact.source}</p>
    </article>
  );
}

export function ThreadCard({ thread, n, revealed, skipped }: { thread: Thread; n: number; revealed?: boolean; skipped?: boolean }) {
  return (
    <blockquote class="thread" style={{ margin: 0 }}>
      <div class="thread__n">
        True thing no. {n}
        {skipped ? ' · from a skipped stop' : ''}
      </div>
      “{thread.text}”
      {revealed ? (
        <p class="small" style={{ fontFamily: 'var(--font-ui)', marginTop: '8px', color: '#4b5160' }}>
          {thread.reveal}
        </p>
      ) : null}
    </blockquote>
  );
}

/** A sealed card that the players open with a tap: the tactile clue reveal. */
export function SealReveal({
  initial = false,
  label = 'Break the seal',
  mark = 'R',
  onOpen,
  children,
}: {
  initial?: boolean;
  label?: string;
  mark?: string;
  onOpen?: () => void;
  children: preact.ComponentChildren;
}) {
  const [open, setOpen] = useState(initial);
  return (
    <div class={`seal-card${open ? ' is-open' : ''}`}>
      <div class="seal-card__flap" aria-hidden="true" />
      {!open ? (
        <>
          <button
            type="button"
            class="seal-card__seal"
            aria-label={label}
            onClick={() => {
              setOpen(true);
              haptic('reveal');
              void sfx('reveal');
              onOpen?.();
            }}
          >
            {mark}
          </button>
          <span class="seal-card__hint">{label}</span>
        </>
      ) : null}
      <div class="seal-card__content" aria-hidden={!open}>
        {children}
      </div>
    </div>
  );
}

export function Stamp({ skipped, label }: { skipped?: boolean; label?: string }) {
  return (
    <div class={`stamp${skipped ? ' stamp--skipped' : ''}`} role="img" aria-label={skipped ? 'Skipped' : 'Solved'}>
      <span>
        {label ?? (skipped ? 'Skipped' : 'Solved')}
        <small>{skipped ? 'story continues' : 'Buenos Aires'}</small>
      </span>
    </div>
  );
}
