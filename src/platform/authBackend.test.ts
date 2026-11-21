import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthFlowError,
  classifyAuthError,
  createLocalAuthBackend,
  createSupabaseAuthBackend,
} from "./authBackend";

vi.mock("./supabaseClient", () => ({
  getSupabaseClient: () => null,
  authEmailRedirectTo: () => "https://app.example",
}));

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
}

describe("classifyAuthError", () => {
  it("maps verify failures to invalid_code", () => {
    expect(classifyAuthError({ status: 403, code: "otp_expired" }, "verify")).toBe("invalid_code");
    expect(classifyAuthError({ status: 400 }, "verify")).toBe("invalid_code");
  });

  it("maps rate limits and leaves other failures generic", () => {
    expect(classifyAuthError({ status: 429 }, "request")).toBe("rate_limited");
    expect(classifyAuthError({ code: "over_email_send_rate_limit" }, "request")).toBe("rate_limited");
    expect(classifyAuthError({ status: 400 }, "request")).toBe("failed");
    expect(classifyAuthError({ status: 500 }, "verify")).toBe("failed");
    expect(classifyAuthError(null, "verify")).toBe("failed");
  });
});

describe("local auth backend", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it("signs in on request with no code and persists across instances", async () => {
    const backend = createLocalAuthBackend();
    const seen: unknown[] = [];
    backend.subscribe((session) => seen.push(session));
    await expect(backend.requestOtp("Dev@Example.com")).resolves.toBe("signed_in");
    const expected = { kind: "local", email: "dev@example.com", userId: null };
    expect(seen).toEqual([expected]);
    await expect(createLocalAuthBackend().getSession()).resolves.toEqual(expected);
    await backend.signOut();
    expect(seen).toEqual([expected, null]);
    await expect(backend.getSession()).resolves.toBeNull();
  });

  it("rejects invalid emails", async () => {
    await expect(createLocalAuthBackend().requestOtp("nope")).rejects.toMatchObject({ code: "invalid_email" });
  });
});

describe("supabase auth backend", () => {
  const signInWithOtp = vi.fn();
  const verifyOtp = vi.fn();
  const signOut = vi.fn();
  const getSession = vi.fn();
  const supabase = {
    auth: { signInWithOtp, verifyOtp, signOut, getSession, onAuthStateChange: vi.fn() },
  } as unknown as SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests an OTP with the redirect and user creation", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await expect(createSupabaseAuthBackend(supabase).requestOtp(" Ada@Example.com ")).resolves.toBe("code_sent");
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "ada@example.com",
      options: { shouldCreateUser: true, emailRedirectTo: "https://app.example" },
    });
  });

  it("verifies a 6-digit email code and maps a bad code", async () => {
    verifyOtp.mockResolvedValueOnce({ data: {}, error: null });
    const backend = createSupabaseAuthBackend(supabase);
    await backend.verifyOtp("ada@example.com", "123 456");
    expect(verifyOtp).toHaveBeenCalledWith({ email: "ada@example.com", token: "123456", type: "email" });

    verifyOtp.mockResolvedValueOnce({ data: {}, error: { status: 403, code: "otp_expired", message: "expired" } });
    const failure = backend.verifyOtp("ada@example.com", "000000");
    await expect(failure).rejects.toBeInstanceOf(AuthFlowError);
    await expect(failure).rejects.toMatchObject({ code: "invalid_code" });
    await expect(backend.verifyOtp("ada@example.com", "12")).rejects.toMatchObject({ code: "invalid_code" });
  });

  it("maps the auth user to the app session and signs out locally", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1", email: "Ada@Example.com" } } } });
    const backend = createSupabaseAuthBackend(supabase);
    await expect(backend.getSession()).resolves.toEqual({ kind: "supabase", email: "ada@example.com", userId: "u1" });
    signOut.mockResolvedValue({ error: null });
    await backend.signOut();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
