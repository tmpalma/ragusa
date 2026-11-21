/**
 * Library calls report a rejected token here; SessionProvider listens and ends the session
 * (sending the user to /login with `account.sessionExpired`).
 */
type UnauthenticatedListener = () => void;

const listeners = new Set<UnauthenticatedListener>();

export function onLibraryUnauthenticated(listener: UnauthenticatedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyLibraryUnauthenticated(): void {
  for (const listener of [...listeners]) listener();
}
