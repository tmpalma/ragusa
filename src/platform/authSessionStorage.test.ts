import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupLegacyAuthStorage,
  clearLocalDevSession,
  consumeReturnPath,
  LEGACY_AUTH_STORAGE_KEYS,
  loadLocalDevSession,
  localDevSession,
  peekReturnPath,
  sameSessionUser,
  saveLocalDevSession,
  saveReturnPath,
  sessionFromAuthUser,
  stripAuthCallbackParams,
} from "./authSessionStorage";

function installLocalStorageMock(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
  return store;
}

describe("authSessionStorage return path", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it("stores and restores a deep link once", () => {
    saveReturnPath("/character/combat");
    expect(peekReturnPath()).toBe("/character/combat");
    expect(consumeReturnPath()).toBe("/character/combat");
    expect(peekReturnPath()).toBeNull();
  });

  it("ignores login as a return target", () => {
    saveReturnPath("/login");
    expect(consumeReturnPath()).toBe("/account");
  });

  it("drops a leftover magic-link code from the saved path", () => {
    saveReturnPath("/?code=abc123");
    expect(peekReturnPath()).toBe("/");
    saveReturnPath("/campaign/party?code=abc&tab=1#top");
    expect(peekReturnPath()).toBe("/campaign/party?tab=1#top");
  });
});

describe("stripAuthCallbackParams", () => {
  it("leaves paths without a code untouched", () => {
    expect(stripAuthCallbackParams("/character?view=combat#x")).toBe("/character?view=combat#x");
    expect(stripAuthCallbackParams("/account")).toBe("/account");
  });
});

describe("sessionFromAuthUser", () => {
  it("normalizes the auth user's email", () => {
    expect(sessionFromAuthUser({ id: "u1", email: "  Ada@Example.COM " })).toEqual({
      kind: "supabase",
      email: "ada@example.com",
      userId: "u1",
    });
  });

  it("returns null without a usable email", () => {
    expect(sessionFromAuthUser(null)).toBeNull();
    expect(sessionFromAuthUser({ id: "u1" })).toBeNull();
    expect(sessionFromAuthUser({ id: "u1", email: null })).toBeNull();
    expect(sessionFromAuthUser({ id: "u1", email: "not-an-email" })).toBeNull();
  });
});

describe("sameSessionUser", () => {
  it("treats a refreshed session for the same user as unchanged", () => {
    const a = sessionFromAuthUser({ id: "u1", email: "ada@example.com" });
    const b = sessionFromAuthUser({ id: "u1", email: "ADA@example.com" });
    expect(sameSessionUser(a, b)).toBe(true);
    expect(sameSessionUser(a, sessionFromAuthUser({ id: "u2", email: "ada@example.com" }))).toBe(false);
    expect(sameSessionUser(a, null)).toBe(false);
    expect(sameSessionUser(null, null)).toBe(true);
  });
});

describe("local dev session", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it("persists and clears a local session", () => {
    const session = localDevSession("Dev@Example.com");
    expect(session).toEqual({ kind: "local", email: "dev@example.com", userId: null });
    saveLocalDevSession(session!);
    expect(loadLocalDevSession()).toEqual(session);
    clearLocalDevSession();
    expect(loadLocalDevSession()).toBeNull();
  });

  it("rejects invalid emails", () => {
    expect(localDevSession("nope")).toBeNull();
  });
});

describe("cleanupLegacyAuthStorage", () => {
  it("removes the claimed-identity and pre-Auth session keys only", () => {
    const store = installLocalStorageMock();
    localStorage.setItem("bypass-session", "{}");
    localStorage.setItem("local-auth-session", JSON.stringify({ kind: "magic", email: "dev@example.com" }));
    localStorage.setItem("claimed-identity", JSON.stringify({ email: "dev@example.com" }));
    localStorage.setItem("auth-return-path", "/character");
    localStorage.setItem("last-character:dev@example.com", "{}");

    cleanupLegacyAuthStorage();

    for (const key of LEGACY_AUTH_STORAGE_KEYS) expect(store.has(key)).toBe(false);
    expect(store.get("auth-return-path")).toBe("/character");
    expect(store.has("last-character:dev@example.com")).toBe(true);
    expect(() => cleanupLegacyAuthStorage()).not.toThrow();
  });
});
