import { normalizeEmail } from "./claimedIdentity";

let persistEmail: string | null = null;
let persistReady = false;

const readyListeners = new Set<() => void>();

function emitReady(): void {
  for (const listener of readyListeners) readyListeners.has(listener) && listener();
}

export function suspendPlayPersist(): void {
  persistReady = false;
  persistEmail = null;
  emitReady();
}

export function resumePlayPersist(email: string): void {
  persistEmail = normalizeEmail(email);
  persistReady = true;
  emitReady();
}

export function getPlayPersistEmail(): string | null {
  return persistReady ? persistEmail : null;
}

export function isPlayPersistReady(): boolean {
  return persistReady;
}

export function subscribePlayPersistReady(listener: () => void): () => void {
  readyListeners.add(listener);
  return () => {
    readyListeners.delete(listener);
  };
}
