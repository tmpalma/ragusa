import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthMode, type AuthMode } from "./authMode";
import {
  clearLocalDevSession,
  loadLocalDevSession,
  localDevSession,
  saveLocalDevSession,
  sessionFromAuthUser,
  type AppSession,
} from "./authSessionStorage";
import { isValidEmail, normalizeEmail } from "./email";
import { authEmailRedirectTo, getSupabaseClient } from "./supabaseClient";

/** `code_sent`: an email with link + code went out. `signed_in`: local mode signed in right away. */
export type OtpRequestResult = "code_sent" | "signed_in";

export type AuthFlowErrorCode = "invalid_email" | "invalid_code" | "rate_limited" | "failed";

export class AuthFlowError extends Error {
  readonly code: AuthFlowErrorCode;

  constructor(code: AuthFlowErrorCode, message: string) {
    super(message);
    this.name = "AuthFlowError";
    this.code = code;
  }
}

/** Maps a Supabase Auth error to a UI-level code. `step` says whether it came from sending or verifying. */
export function classifyAuthError(
  error: { status?: number; code?: string } | null | undefined,
  step: "request" | "verify",
): AuthFlowErrorCode {
  if (!error) return "failed";
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return "rate_limited";
  }
  if (error.code === "email_address_invalid") return "invalid_email";
  if (step === "verify") {
    if (error.code === "otp_expired" || error.code === "otp_disabled") return "invalid_code";
    if (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 422) {
      return "invalid_code";
    }
  }
  return "failed";
}

export type AuthSessionListener = (session: AppSession | null) => void;

export interface AuthBackend {
  readonly mode: AuthMode;
  /** Current session. In Supabase mode this waits for init (including the magic-link code exchange). */
  getSession(): Promise<AppSession | null>;
  subscribe(listener: AuthSessionListener): () => void;
  requestOtp(email: string): Promise<OtpRequestResult>;
  verifyOtp(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
}

function requireEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new AuthFlowError("invalid_email", "Invalid email.");
  return normalized;
}

export function createSupabaseAuthBackend(supabase: SupabaseClient): AuthBackend {
  return {
    mode: "supabase",

    async getSession() {
      const { data } = await supabase.auth.getSession();
      return sessionFromAuthUser(data.session?.user);
    },

    subscribe(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        listener(sessionFromAuthUser(session?.user));
      });
      return () => data.subscription.unsubscribe();
    },

    async requestOtp(email) {
      const normalized = requireEmail(email);
      const emailRedirectTo = authEmailRedirectTo();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: { shouldCreateUser: true, ...(emailRedirectTo ? { emailRedirectTo } : {}) },
      });
      if (error) throw new AuthFlowError(classifyAuthError(error, "request"), error.message);
      return "code_sent";
    },

    async verifyOtp(email, code) {
      const normalized = requireEmail(email);
      const token = code.replace(/\s+/g, "");
      if (!/^\d{6}$/.test(token)) throw new AuthFlowError("invalid_code", "Code must be 6 digits.");
      const { error } = await supabase.auth.verifyOtp({ email: normalized, token, type: "email" });
      if (error) throw new AuthFlowError(classifyAuthError(error, "verify"), error.message);
    },

    async signOut() {
      // Local scope: an idle timeout on one device must not sign out the user's other devices.
      // supabase-js clears the stored session even when the revoke request fails.
      await supabase.auth.signOut({ scope: "local" });
    },
  };
}

/** Offline/dev mode: entering an email signs in on this device with no verification. */
export function createLocalAuthBackend(): AuthBackend {
  const listeners = new Set<AuthSessionListener>();
  const emit = (session: AppSession | null) => {
    for (const listener of [...listeners]) listener(session);
  };

  return {
    mode: "local",

    async getSession() {
      return loadLocalDevSession();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async requestOtp(email) {
      const session = localDevSession(email);
      if (!session) throw new AuthFlowError("invalid_email", "Invalid email.");
      saveLocalDevSession(session);
      emit(session);
      return "signed_in";
    },

    async verifyOtp() {
      throw new AuthFlowError("failed", "Local mode does not use codes.");
    },

    async signOut() {
      clearLocalDevSession();
      emit(null);
    },
  };
}

let backend: AuthBackend | null = null;

export function getAuthBackend(): AuthBackend {
  if (backend) return backend;
  const supabase = getAuthMode() === "supabase" ? getSupabaseClient() : null;
  backend = supabase ? createSupabaseAuthBackend(supabase) : createLocalAuthBackend();
  return backend;
}
