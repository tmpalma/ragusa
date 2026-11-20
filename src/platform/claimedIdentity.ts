const STORAGE_KEY = "claimed-identity";

export interface ClaimedIdentity {
  email: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function readIdentity(value: unknown): ClaimedIdentity | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.email !== "string") return null;
  const email = normalizeEmail(record.email);
  if (!isValidEmail(email)) return null;
  return { email };
}

export function loadClaimedIdentity(): ClaimedIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return readIdentity(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function saveClaimedIdentity(identity: ClaimedIdentity): void {
  const email = normalizeEmail(identity.email);
  if (!isValidEmail(email)) {
    throw new Error("Claimed identity needs a valid email.");
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ email }));
}

export function clearClaimedIdentity(): void {
  localStorage.removeItem(STORAGE_KEY);
}