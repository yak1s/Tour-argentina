import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type {
  ChoicePuzzle,
  CipherPuzzle,
  CodePuzzle,
  EliminationPuzzle,
  NumberPuzzle,
  OrderPuzzle,
  TextPuzzle,
} from '../../content/types';
import { Button } from '../components/ui';
import { Icon } from '../components/Icon';
import { haptic } from '../../platform/haptics';

export interface InputProps<P> {
  puzzle: P;
  draft?: string | string[];
  onDraft: (d: string | string[]) => void;
  onSubmit: (answer: string | string[]) => void;
  disabled?: boolean;
}

/* ---------------- Text & number ---------------- */

export function TextAnswer({ puzzle, draft, onDraft, onSubmit, disabled }: InputProps<TextPuzzle | NumberPuzzle>) {
  const [value, setValue] = useState(typeof draft === 'string' ? draft : '');
  const isNumber = puzzle.type === 'number';
  return (
    <form
      class="answer"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
    >
      <label class="sr-only" for={`a-${puzzle.id}`}>
        Your answer
      </label>
      <input
        id={`a-${puzzle.id}`}
        class="input"
        value={value}
        inputMode={isNumber ? 'numeric' : 'text'}
        autoComplete="off"
        autoCapitalize={isNumber ? 'off' : 'words'}
        spellcheck={false}
        enterKeyHint="done"
        placeholder={isNumber ? (puzzle.unit ? `Number of ${puzzle.unit}` : 'A number') : (puzzle as TextPuzzle).placeholder}
        disabled={disabled}
        onInput={(e) => {
          const v = (e.currentTarget as HTMLInputElement).value;
          setValue(v);
          onDraft(v);
        }}
      />
      <Button type="submit" disabled={disabled || !value.trim()} aria-label="Check answer">
        Check
      </Button>
    </form>
  );
}

/* ---------------- Choice ---------------- */

export function ChoiceAnswer({ puzzle, draft, onDraft, onSubmit, disabled, wrong }: InputProps<ChoicePuzzle> & { wrong: string[] }) {
  const [sel, setSel] = useState<string | null>(typeof draft === 'string' ? draft : null);
  return (
    <div class="stack">
      <div class="choices" role="radiogroup" aria-label="Choose one">
        {puzzle.options.map((o, i) => {
          const isWrong = wrong.includes(o.id);
          return (
            <button
              type="button"
              role="radio"
              aria-checked={sel === o.id}
              aria-pressed={sel === o.id}
              class={`choice${isWrong ? ' is-wrong' : ''}`}
              disabled={disabled}
              onClick={() => {
                setSel(o.id);
                onDraft(o.id);
                haptic('tap');
              }}
            >
              <span class="choice__n">{i + 1}</span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
      <Button block disabled={disabled || !sel} onClick={() => sel && onSubmit(sel)}>
        This one is the tale
      </Button>
    </div>
  );
}

/* ---------------- Order ---------------- */

export function OrderAnswer({ puzzle, draft, onDraft, onSubmit, disabled }: InputProps<OrderPuzzle>) {
  const initial = Array.isArray(draft) && draft.length === puzzle.slots.length ? draft : puzzle.slots.map(() => '');
  const [slots, setSlots] = useState<string[]>(initial);
  const [picked, setPicked] = useState<string | null>(null);
  const update = (next: string[]) => {
    setSlots(next);
    onDraft(next);
  };
  const place = (slotIndex: number) => {
    if (disabled) return;
    if (picked) {
      const next = slots.map((s) => (s === picked ? '' : s));
      next[slotIndex] = picked;
      update(next);
      setPicked(null);
      haptic('tap');
    } else if (slots[slotIndex]) {
      const next = [...slots];
      next[slotIndex] = '';
      update(next);
    }
  };
  const label = (id: string) => puzzle.items.find((i) => i.id === id)?.label ?? '';
  const full = slots.every(Boolean);
  return (
    <div class="stack">
      <p class="small muted">{picked ? `Now tap a slot for ${label(picked)}.` : 'Tap a name, then tap the slot where it belongs. Tap a filled slot to clear it.'}</p>
      <div class="tiles" role="group" aria-label="Architects">
        {puzzle.items.map((it) => {
          const used = slots.includes(it.id);
          return (
            <button
              type="button"
              class={`tile${used ? ' is-used' : ''}`}
              aria-pressed={picked === it.id}
              disabled={disabled}
              onClick={() => setPicked(picked === it.id ? null : it.id)}
            >
              {it.label}
              {it.detail ? <span class="xsmall muted"> · {it.detail}</span> : null}
            </button>
          );
        })}
      </div>
      <div class="slots">
        {puzzle.slots.map((s, i) => (
          <button
            type="button"
            class={`slot${slots[i] ? ' is-filled' : ''}${picked ? ' is-target' : ''}`}
            disabled={disabled}
            onClick={() => place(i)}
            aria-label={`${s}: ${slots[i] ? label(slots[i]!) : 'empty'}`}
          >
            <span class="slot__n">{i + 1}</span>
            <span>
              <span class="slot__label">{s}</span>
              <span class="slot__value" style={{ display: 'block' }}>
                {slots[i] ? label(slots[i]!) : '—'}
              </span>
            </span>
          </button>
        ))}
      </div>
      <Button block disabled={disabled || !full} onClick={() => onSubmit(slots)}>
        Check the order
      </Button>
    </div>
  );
}

/* ---------------- Cipher ---------------- */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function CipherAnswer({ puzzle, draft, onDraft, onSubmit, disabled, knownKey }: InputProps<CipherPuzzle> & { knownKey?: string }) {
  const keyText = puzzle.key.join('');
  const [keyInput, setKeyInput] = useState('');
  const [keyOk, setKeyOk] = useState(false);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const letters = useMemo(() => puzzle.ciphertext.split(''), [puzzle.ciphertext]);
  const letterCount = letters.filter((c) => c !== ' ').length;
  const initialCells = Array.isArray(draft) && draft.length === letterCount ? draft : Array.from({ length: letterCount }, () => '');
  const [cells, setCells] = useState<string[]>(initialCells);
  const [typed, setTyped] = useState(typeof draft === 'string' ? draft : '');
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (Array.isArray(draft) && draft.some(Boolean)) setKeyOk(true);
  }, []);

  const submitKey = () => {
    const k = keyInput.replace(/\D/g, '');
    if (k === keyText) {
      setKeyOk(true);
      setKeyMsg(null);
      haptic('reveal');
    } else {
      setKeyMsg(k.length !== 4 ? 'The key has four digits.' : 'That’s not the key. Check your journal: it’s the number from Ayacucho street.');
      haptic('wrong');
    }
  };

  // Group letters into words, keeping the key index for each letter.
  const words: { ch: string; k: number; idx: number }[][] = [];
  let current: { ch: string; k: number; idx: number }[] = [];
  let li = 0;
  for (const ch of letters) {
    if (ch === ' ') {
      if (current.length) words.push(current);
      current = [];
    } else {
      current.push({ ch, k: puzzle.key[li % puzzle.key.length]!, idx: li });
      li++;
    }
  }
  if (current.length) words.push(current);

  const fromCells = () => {
    let out = '';
    let i = 0;
    for (const ch of letters) {
      if (ch === ' ') out += ' ';
      else out += cells[i++] || '·';
    }
    return out;
  };
  const cellsFull = cells.every(Boolean);

  return (
    <div class="stack">
      {!keyOk ? (
        <form
          class="stack stack--sm"
          onSubmit={(e) => {
            e.preventDefault();
            submitKey();
          }}
        >
          <label class="small" for="cipher-key">
            First, enter your key{knownKey ? ' (it’s in your journal)' : ''}:
          </label>
          <div class="answer">
            <input
              id="cipher-key"
              class="input input--mono"
              inputMode="numeric"
              maxLength={4}
              placeholder="• • • •"
              value={keyInput}
              onInput={(e) => setKeyInput((e.currentTarget as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4))}
            />
            <Button type="submit" icon="key" disabled={keyInput.length !== 4}>
              Use key
            </Button>
          </div>
          {keyMsg ? <div class="feedback feedback--wrong">{keyMsg}</div> : null}
        </form>
      ) : null}

      <div class="cipher" aria-label={`Coded message: ${puzzle.ciphertext}`}>
        {words.map((w) => (
          <div class="cipher__word">
            {w.map((c) => (
              <div class="cipher__cell">
                <div class="cipher__ct" aria-hidden="true">
                  {c.ch}
                </div>
                <div class="cipher__k" aria-hidden="true">
                  {keyOk ? `−${c.k}` : ''}
                </div>
                {keyOk ? (
                  <input
                    ref={(el) => {
                      refs.current[c.idx] = el;
                    }}
                    class="cipher__pt"
                    maxLength={1}
                    aria-label={`Letter ${c.idx + 1}: ${c.ch} minus ${c.k}`}
                    value={cells[c.idx]}
                    disabled={disabled}
                    autoCapitalize="characters"
                    autoComplete="off"
                    onInput={(e) => {
                      const v = (e.currentTarget as HTMLInputElement).value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
                      const next = [...cells];
                      next[c.idx] = v;
                      setCells(next);
                      onDraft(next);
                      if (v) refs.current[c.idx + 1]?.focus();
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>

      {keyOk ? (
        <>
          <div class="alphabet" aria-label="Alphabet helper">
            {ALPHABET}
          </div>
          <p class="xsmall muted">Step back in the alphabet: J − 1 = I. Going back from A wraps round to Z.</p>
          {cellsFull ? (
            <Button block disabled={disabled} onClick={() => onSubmit(fromCells())}>
              Check: “{fromCells()}”
            </Button>
          ) : null}
          <details class="disclosure">
            <summary>
              <Icon name="chevronRight" size="sm" class="chev" />
              Prefer to type the whole message?
            </summary>
            <form
              class="answer"
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.trim()) onSubmit(typed.trim());
              }}
            >
              <input
                class="input input--mono"
                placeholder={puzzle.placeholder}
                value={typed}
                autoComplete="off"
                onInput={(e) => setTyped((e.currentTarget as HTMLInputElement).value)}
              />
              <Button type="submit" disabled={disabled || !typed.trim()}>
                Check
              </Button>
            </form>
          </details>
        </>
      ) : null}
    </div>
  );
}

/* ---------------- Elimination ---------------- */

export function EliminationAnswer({ puzzle, draft, onDraft, onSubmit, disabled }: InputProps<EliminationPuzzle>) {
  const [crossed, setCrossed] = useState<string[]>(Array.isArray(draft) ? draft : []);
  const remaining = puzzle.candidates.filter((c) => !crossed.includes(c.id));
  const toggle = (id: string) => {
    const next = crossed.includes(id) ? crossed.filter((x) => x !== id) : [...crossed, id];
    setCrossed(next);
    onDraft(next);
    haptic('tap');
  };
  return (
    <div class="stack">
      <div class="suspects">
        {puzzle.candidates.map((c) => {
          const isCrossed = crossed.includes(c.id);
          return (
            <button
              type="button"
              class={`suspect${isCrossed ? ' is-crossed' : ''}`}
              aria-pressed={!isCrossed && remaining.length === 1}
              aria-label={`${c.label}${isCrossed ? ' (crossed out)' : ''}`}
              disabled={disabled}
              onClick={() => toggle(c.id)}
            >
              <div class="suspect__name">{c.label}</div>
              <div class="suspect__detail">{c.detail}</div>
            </button>
          );
        })}
      </div>
      <p class="small muted center">
        {remaining.length === 1
          ? 'One suspect left.'
          : remaining.length === 0
            ? 'You’ve crossed out everyone — tap a card to bring it back.'
            : `${remaining.length} suspects left. Tap a card to cross it out.`}
      </p>
      <Button block size="lg" disabled={disabled || remaining.length !== 1} onClick={() => remaining[0] && onSubmit(remaining[0].id)}>
        {remaining.length === 1 ? `Name the voice: ${remaining[0]!.label}` : 'Cross out until one remains'}
      </Button>
    </div>
  );
}

/* ---------------- Code lock ---------------- */

export function CodeLock({ puzzle, draft, onDraft, onSubmit, disabled }: InputProps<CodePuzzle>) {
  const n = puzzle.code.length;
  const start = typeof draft === 'string' && /^\d+$/.test(draft) && draft.length === n ? draft.split('').map(Number) : Array.from({ length: n }, () => 0);
  const [digits, setDigits] = useState<number[]>(start);
  const set = (i: number, d: number) => {
    const next = [...digits];
    next[i] = (d + 10) % 10;
    setDigits(next);
    onDraft(next.join(''));
    haptic('tap');
  };
  const [typed, setTyped] = useState('');
  return (
    <div class="stack">
      <div class="lock" role="group" aria-label="Combination lock">
        {digits.map((d, i) => (
          <div class="lock__wheel">
            <button type="button" class="lock__btn" aria-label={`Digit ${i + 1} up`} disabled={disabled} onClick={() => set(i, d + 1)}>
              <Icon name="chevronUp" />
            </button>
            <div class="lock__digit" aria-live="polite" aria-label={`Digit ${i + 1}: ${d}`}>
              {d}
            </div>
            <button type="button" class="lock__btn" aria-label={`Digit ${i + 1} down`} disabled={disabled} onClick={() => set(i, d - 1)}>
              <Icon name="chevronDown" />
            </button>
          </div>
        ))}
      </div>
      <Button block icon="unlock" disabled={disabled} onClick={() => onSubmit(digits.join(''))}>
        Try the lock
      </Button>
      <form
        class="answer"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed.length === n) {
            setDigits(typed.split('').map(Number));
            onSubmit(typed);
          }
        }}
      >
        <label class="sr-only" for={`code-${puzzle.id}`}>
          Type the code
        </label>
        <input
          id={`code-${puzzle.id}`}
          class="input input--mono"
          inputMode="numeric"
          placeholder="…or type it"
          maxLength={n}
          value={typed}
          onInput={(e) => setTyped((e.currentTarget as HTMLInputElement).value.replace(/\D/g, '').slice(0, n))}
        />
        <Button type="submit" variant="secondary" disabled={disabled || typed.length !== n}>
          Enter
        </Button>
      </form>
    </div>
  );
}
