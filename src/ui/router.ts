import { computed, signal } from '@preact/signals';

/**
 * Minimal hash router. Hash URLs keep the app working under any GitHub Pages
 * sub-path and from the offline cache (every route is the same index.html).
 * The Android back button walks the hash history.
 */
export type Route =
  | { name: 'home' }
  | { name: 'intro' }
  | { name: 'route' }
  | { name: 'go'; chapterId?: string }
  | { name: 'chapter'; chapterId: string }
  | { name: 'puzzle'; puzzleId: string }
  | { name: 'journal'; tab?: string }
  | { name: 'settings' }
  | { name: 'help'; topic?: string }
  | { name: 'finale' };

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const [head, arg] = path.split('/').map((s) => decodeURIComponent(s));
  switch (head) {
    case '':
    case undefined:
      return { name: 'home' };
    case 'intro':
      return { name: 'intro' };
    case 'route':
      return { name: 'route' };
    case 'go':
      return { name: 'go', chapterId: arg || undefined };
    case 'chapter':
      return arg ? { name: 'chapter', chapterId: arg } : { name: 'home' };
    case 'puzzle':
      return arg ? { name: 'puzzle', puzzleId: arg } : { name: 'home' };
    case 'journal':
      return { name: 'journal', tab: arg || undefined };
    case 'settings':
      return { name: 'settings' };
    case 'help':
      return { name: 'help', topic: arg || undefined };
    case 'finale':
      return { name: 'finale' };
    default:
      return { name: 'home' };
  }
}

export const hash = signal(typeof location === 'undefined' ? '' : location.hash);
export const route = computed(() => parse(hash.value));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    hash.value = location.hash;
  });
}

export function href(path: string): string {
  return `#/${path.replace(/^\/+/, '')}`;
}

export function navigate(path: string, opts: { replace?: boolean } = {}): void {
  const target = href(path);
  if (location.hash === target) return;
  if (opts.replace) {
    history.replaceState(null, '', target);
    hash.value = target;
  } else {
    location.hash = target;
  }
}

export function routeKey(r: Route): string {
  switch (r.name) {
    case 'go':
      return `go/${r.chapterId ?? ''}`;
    case 'chapter':
      return `chapter/${r.chapterId}`;
    case 'puzzle':
      return `puzzle/${r.puzzleId}`;
    case 'journal':
      return `journal/${r.tab ?? ''}`;
    case 'help':
      return `help/${r.topic ?? ''}`;
    default:
      return r.name;
  }
}
