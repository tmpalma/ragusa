import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

/** Key-value store for last-character / last-campaign payloads. Web uses IndexedDB; native uses Preferences. */

export interface PersistStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const DB_NAME = "dnd55e-chargen-persist";
const DB_VERSION = 1;
const STORE_NAME = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function openIndexedDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });

  return dbPromise;
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export function createIndexedDbPersistStore(): PersistStore {
  return {
    async get(key: string): Promise<string | null> {
      const db = await openIndexedDb();
      const tx = db.transaction(STORE_NAME, "readonly");
      const value = await idbRequest(tx.objectStore(STORE_NAME).get(key));
      return typeof value === "string" ? value : null;
    },

    async set(key: string, value: string): Promise<void> {
      const db = await openIndexedDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write aborted"));
      });
    },
  };
}

export function createPreferencesPersistStore(): PersistStore {
  return {
    async get(key: string): Promise<string | null> {
      const { value } = await Preferences.get({ key });
      return value ?? null;
    },

    async set(key: string, value: string): Promise<void> {
      await Preferences.set({ key, value });
    },
  };
}

/** In-memory store for unit tests. */
export function createMemoryPersistStore(initial?: Record<string, string>): PersistStore {
  const data = new Map(Object.entries(initial ?? {}));
  return {
    async get(key: string): Promise<string | null> {
      return data.get(key) ?? null;
    },
    async set(key: string, value: string): Promise<void> {
      data.set(key, value);
    },
  };
}

let activeStore: PersistStore = Capacitor.isNativePlatform()
  ? createPreferencesPersistStore()
  : createIndexedDbPersistStore();

export function getPersistStore(): PersistStore {
  return activeStore;
}

/** Test-only: inject a fake backend. */
export function setPersistStoreForTests(store: PersistStore): void {
  activeStore = store;
}

/** Test-only: restore the default IndexedDB backend. */
export function resetPersistStoreForTests(): void {
  activeStore = Capacitor.isNativePlatform()
    ? createPreferencesPersistStore()
    : createIndexedDbPersistStore();
  dbPromise = null;
}
