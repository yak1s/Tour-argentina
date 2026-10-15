import 'fake-indexeddb/auto';

// Minimal localStorage for the Node test environment.
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage?.getItem !== 'function') {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
  };
}
