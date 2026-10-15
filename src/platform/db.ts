import { openDB, type IDBPDatabase } from 'idb';

/**
 * Local persistence. Progress and settings live in IndexedDB (key-value
 * store), mirrored to localStorage as a small backup. Photo memories are
 * Blobs in their own store. Nothing ever leaves the device.
 */

const DB_NAME = 'hidden-city';
const DB_VERSION = 1;
const LS_PREFIX = 'hidden-city:';

export interface Memory {
  id: string;
  chapter: string;
  createdAt: number;
  blob: Blob;
  width: number;
  height: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('kv')) database.createObjectStore('kv');
        if (!database.objectStoreNames.contains('memories')) {
          const store = database.createObjectStore('memories', { keyPath: 'id' });
          store.createIndex('chapter', 'chapter');
        }
      },
      blocked() {
        console.warn('[db] upgrade blocked by another tab');
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

function lsGet(key: string): unknown {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable: IndexedDB copy still exists */
  }
}

/**
 * Picks the newer of the IndexedDB copy (a) and the localStorage mirror (b).
 * The mirror is written synchronously, so on a tie it wins: an IndexedDB write
 * started while the page was closing may not have finished.
 */
function newer(a: unknown, b: unknown): unknown {
  const ta = typeof a === 'object' && a && 'updatedAt' in a ? Number((a as { updatedAt: unknown }).updatedAt) : -1;
  const tb = typeof b === 'object' && b && 'updatedAt' in b ? Number((b as { updatedAt: unknown }).updatedAt) : -1;
  return tb >= ta ? b : a;
}

/** Reads a JSON value, preferring whichever copy (IndexedDB or localStorage) is newer. */
export async function loadValue(key: string): Promise<unknown> {
  const backup = lsGet(key);
  try {
    const value = await (await db()).get('kv', key);
    if (value === undefined) return backup;
    return backup === undefined ? value : newer(value, backup);
  } catch (err) {
    console.warn('[db] IndexedDB unavailable, using localStorage', err);
    return backup;
  }
}

export async function saveValue(key: string, value: unknown): Promise<void> {
  lsSet(key, value);
  try {
    await (await db()).put('kv', value, key);
  } catch (err) {
    console.warn('[db] could not write IndexedDB', err);
  }
}

export async function deleteValue(key: string): Promise<void> {
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    /* ignore */
  }
  try {
    await (await db()).delete('kv', key);
  } catch {
    /* ignore */
  }
}

export async function addMemory(memory: Memory): Promise<void> {
  await (await db()).put('memories', memory);
}

export async function listMemories(): Promise<Memory[]> {
  try {
    const all = (await (await db()).getAll('memories')) as Memory[];
    return all.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function deleteMemory(id: string): Promise<void> {
  await (await db()).delete('memories', id);
}

export async function clearMemories(): Promise<void> {
  try {
    await (await db()).clear('memories');
  } catch {
    /* ignore */
  }
}

/** Asks the browser not to evict our storage (granted automatically to installed PWAs in Chrome). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null;
  } catch {
    return null;
  }
}
