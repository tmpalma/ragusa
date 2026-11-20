import { describe, expect, it } from "vitest";
import {
  DEFAULT_SESSION_IDLE_MS,
  SESSION_IDLE_WARNING_MS,
  isIdleExpired,
  msUntilIdleWarning,
  shouldShowIdleWarning,
} from "./sessionIdle";

describe("sessionIdle", () => {
  const idleMs = DEFAULT_SESSION_IDLE_MS;
  const last = 1_000_000;

  it("warns inside the final warning window", () => {
    const inside = last + idleMs - SESSION_IDLE_WARNING_MS + 1_000;
    expect(shouldShowIdleWarning(last, inside, idleMs)).toBe(true);
    expect(msUntilIdleWarning(last, inside, idleMs)).toBe(0);
  });

  it("does not warn before the warning window", () => {
    const before = last + idleMs - SESSION_IDLE_WARNING_MS - 1_000;
    expect(shouldShowIdleWarning(last, before, idleMs)).toBe(false);
    expect(msUntilIdleWarning(last, before, idleMs)).toBeGreaterThan(0);
  });

  it("expires after the idle budget", () => {
    expect(isIdleExpired(last, last + idleMs, idleMs)).toBe(true);
    expect(isIdleExpired(last, last + idleMs - 1, idleMs)).toBe(false);
  });
});
