export const DEFAULT_SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_IDLE_WARNING_MS = 2 * 60 * 1000;

export function readSessionIdleMs(): number {
  const raw = import.meta.env.VITE_SESSION_IDLE_MINUTES;
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_SESSION_IDLE_MS;
  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || minutes <= 0) return DEFAULT_SESSION_IDLE_MS;
  return Math.round(minutes * 60 * 1000);
}

export function msUntilIdleWarning(lastActivityAt: number, now: number, idleMs: number): number | null {
  const warningAt = lastActivityAt + idleMs - SESSION_IDLE_WARNING_MS;
  if (now >= warningAt) return 0;
  return warningAt - now;
}

export function shouldShowIdleWarning(lastActivityAt: number, now: number, idleMs: number): boolean {
  const remaining = idleMs - (now - lastActivityAt);
  return remaining > 0 && remaining <= SESSION_IDLE_WARNING_MS;
}

export function isIdleExpired(lastActivityAt: number, now: number, idleMs: number): boolean {
  return now - lastActivityAt >= idleMs;
}
