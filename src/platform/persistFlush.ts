type PersistFlusher = () => void | Promise<void>;

const flushers = new Set<PersistFlusher>();

export function registerPersistFlush(flusher: PersistFlusher): () => void {
  flushers.add(flusher);
  return () => flushers.delete(flusher);
}

export async function flushAllPersist(): Promise<void> {
  await Promise.all([...flushers].map((flusher) => Promise.resolve(flusher())));
}
