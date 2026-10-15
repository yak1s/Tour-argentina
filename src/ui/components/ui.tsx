import { signal } from '@preact/signals';
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Icon, type IconName } from './Icon';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button(
  props: {
    variant?: BtnVariant;
    size?: 'sm' | 'lg';
    block?: boolean;
    icon?: IconName;
    iconRight?: IconName;
    children?: ComponentChildren;
    class?: string;
  } & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'icon'>,
) {
  const { variant = 'primary', size, block, icon, iconRight, children, class: cls, type, ...rest } = props;
  return (
    <button
      type={(type as 'button' | 'submit') ?? 'button'}
      class={`btn btn--${variant}${size ? ` btn--${size}` : ''}${block ? ' btn--block' : ''}${cls ? ` ${cls}` : ''}`}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} /> : null}
    </button>
  );
}

export function LinkButton(props: {
  href: string;
  variant?: BtnVariant;
  size?: 'sm' | 'lg';
  block?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  children?: ComponentChildren;
  external?: boolean;
  class?: string;
}) {
  const { href, variant = 'primary', size, block, icon, iconRight, children, external, class: cls } = props;
  return (
    <a
      href={href}
      class={`btn btn--${variant}${size ? ` btn--${size}` : ''}${block ? ' btn--block' : ''}${cls ? ` ${cls}` : ''}`}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} /> : null}
    </a>
  );
}

export function IconButton(props: { icon: IconName; label: string; class?: string } & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon'>) {
  const { icon, label, class: cls, ...rest } = props;
  return (
    <button type="button" class={`btn btn--secondary btn--icon${cls ? ` ${cls}` : ''}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} class="switch" onClick={() => onChange(!checked)} />;
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  full,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  full?: boolean;
}) {
  return (
    <div class={`segmented${full ? ' segmented--full' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pill({ tone, icon, children }: { tone?: 'ok' | 'warn' | 'accent'; icon?: IconName; children: ComponentChildren }) {
  return (
    <span class={`pill${tone ? ` pill--${tone}` : ''}`}>
      {icon ? <Icon name={icon} size="sm" /> : <span class="dot" />}
      {children}
    </span>
  );
}

export function Disclosure({ summary, children, open }: { summary: ComponentChildren; children: ComponentChildren; open?: boolean }) {
  return (
    <details class="disclosure" open={open}>
      <summary>
        <Icon name="chevronRight" size="sm" class="chev" />
        {summary}
      </summary>
      {children}
    </details>
  );
}

/* ---------------- Sheet & dialog ---------------- */

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  useEscape(onClose);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div class="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div class="sheet__grip" />
        <div class="row row--between" style={{ marginBottom: '10px' }}>
          <h3>{title}</h3>
          <button type="button" class="btn btn--ghost btn--icon" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: ComponentChildren;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEscape(onCancel);
  return (
    <div class="scrim scrim--center" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div class="dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <div class="stack">
          <h3>{title}</h3>
          <div class="muted">{body}</div>
          <div class="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} autoFocus>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Toasts ---------------- */

export const toastMessage = signal<{ text: string; id: number } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(text: string, ms = 3200): void {
  toastMessage.value = { text, id: Date.now() };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastMessage.value = null), ms);
}

export function ToastHost() {
  const t = toastMessage.value;
  if (!t) return null;
  return (
    <div class="toast-wrap" aria-live="polite">
      <div class="toast" key={t.id}>
        {t.text}
      </div>
    </div>
  );
}

export function Certainty({ c }: { c: 'documented' | 'disputed' | 'tradition' }) {
  const label = c === 'documented' ? 'Documented' : c === 'disputed' ? 'Sources differ' : 'Legend';
  return <span class={`chip chip--${c}`}>{label}</span>;
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
