import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLocalAuthSession,
  consumeReturnPath,
  loadLocalAuthSession,
  peekReturnPath,
  saveLocalAuthSession,
  saveReturnPath,
  sessionFromMagicUser,
} from "./authSessionStorage";

function installLocalStorageMock(): void {
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
}

describe("authSessionStorage return path", () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
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
});

describe("authSessionStorage local session", () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
  });

  it("persists and clears a local auth session", () => {
    const session = sessionFromMagicUser("dev@example.com");
    expect(session).not.toBeNull();
    saveLocalAuthSession(session!);
    expect(loadLocalAuthSession()).toEqual(session);
    clearLocalAuthSession();
    expect(loadLocalAuthSession()).toBeNull();
  });

  it("loads legacy sessions that stored a display name", () => {
    localStorage.setItem(
      "local-auth-session",
      JSON.stringify({ kind: "magic", email: "dev@example.com", displayName: "Dev User" }),
    );
    expect(loadLocalAuthSession()).toEqual({ kind: "magic", email: "dev@example.com" });
  });
});
