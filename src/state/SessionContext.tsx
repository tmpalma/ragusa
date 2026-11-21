import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getAuthBackend, type OtpRequestResult } from "../platform/authBackend";
import { onLibraryUnauthenticated } from "../platform/authEvents";
import type { AuthMode } from "../platform/authMode";
import { cleanupLegacyAuthStorage, sameSessionUser, type AppSession } from "../platform/authSessionStorage";
import { flushAllPersist } from "../platform/persistFlush";
import {
  clearLibraryCharacterBinding,
  getLibraryClient,
  LibraryClientError,
  setLibraryCampaignBinding,
} from "../platform/libraryClient";
import { suspendPlayPersist } from "../platform/playSessionPersist";

type SessionStatus = "loading" | "authenticated" | "anonymous";

/** Why the last session ended: the login page shows a notice for `idle` and `expired`. */
export type SessionEndReason = "manual" | "idle" | "expired";

interface SessionContextValue {
  status: SessionStatus;
  session: AppSession | null;
  /** `supabase`: email OTP (link + code). `local`: no Supabase env, email signs in directly. */
  authMode: AuthMode;
  /** Set when a session ends; cleared when the next one starts. */
  endReason: SessionEndReason | null;
  /**
   * Supabase: emails a sign-in link and 6-digit code (`code_sent`).
   * Local: signs in right away (`signed_in`).
   * Throws `AuthFlowError`.
   */
  requestOtp: (email: string) => Promise<OtpRequestResult>;
  /** Verifies the 6-digit code; resolves once the session is applied. Throws `AuthFlowError`. */
  verifyOtp: (email: string, code: string) => Promise<void>;
  /** Flushes persisted play state, then signs out. */
  endSession: (reason?: SessionEndReason) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function ensureKey(session: AppSession): string {
  return `${session.kind}:${session.userId ?? session.email}`;
}

function teardownPlay(): void {
  suspendPlayPersist();
  clearLibraryCharacterBinding();
  setLibraryCampaignBinding(null);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const backend = getAuthBackend();
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [session, setSession] = useState<AppSession | null>(null);
  const [endReason, setEndReason] = useState<SessionEndReason | null>(null);
  const sessionRef = useRef<AppSession | null>(null);
  const generationRef = useRef(0);
  const endingRef = useRef(false);
  /** One `ensurePlayer` per user per app run; failed attempts are dropped so they retry. */
  const ensuredRef = useRef(new Map<string, Promise<void>>());

  const applySession = useCallback((next: AppSession | null) => {
    sessionRef.current = next;
    setSession(next);
    setStatus(next ? "authenticated" : "anonymous");
    if (next) setEndReason(null);
  }, []);

  const ensurePlayerOnce = useCallback((next: AppSession): Promise<void> => {
    const key = ensureKey(next);
    const existing = ensuredRef.current.get(key);
    if (existing) return existing;
    const attempt = getLibraryClient()
      .ensurePlayer(next.email)
      .catch((error: unknown) => {
        ensuredRef.current.delete(key);
        throw error;
      });
    ensuredRef.current.set(key, attempt);
    return attempt;
  }, []);

  /** Applies a session reported by the auth backend (startup restore, OTP, magic link, refresh, sign-out). */
  const handleSession = useCallback(
    async (next: AppSession | null): Promise<void> => {
      if (!next) {
        const previous = sessionRef.current;
        generationRef.current += 1;
        if (previous && !endingRef.current) {
          // Signed out elsewhere (refresh token rejected, another tab): keep what we can.
          void flushAllPersist().catch(() => undefined);
          teardownPlay();
          setEndReason("expired");
        }
        applySession(null);
        return;
      }
      if (sameSessionUser(sessionRef.current, next)) return;

      const generation = ++generationRef.current;
      try {
        await ensurePlayerOnce(next);
      } catch (error) {
        // `unauthenticated` already ended the session through the library listener.
        if (error instanceof LibraryClientError && error.code === "unauthenticated") return;
        console.warn("ensurePlayer failed", error);
      }
      if (generation !== generationRef.current) return;
      applySession(next);
    },
    [applySession, ensurePlayerOnce],
  );

  const endSession = useCallback(
    async (reason: SessionEndReason = "manual") => {
      endingRef.current = true;
      generationRef.current += 1;
      try {
        try {
          await flushAllPersist();
        } catch (error) {
          console.warn("Flush before sign-out failed", error);
        }
        teardownPlay();
        setEndReason(reason);
        try {
          await backend.signOut();
        } catch (error) {
          console.warn("Sign-out failed", error);
        }
        applySession(null);
      } finally {
        endingRef.current = false;
      }
    },
    [applySession, backend],
  );

  useEffect(() => {
    cleanupLegacyAuthStorage();
    let cancelled = false;
    const unsubscribe = backend.subscribe((next) => {
      if (!cancelled) void handleSession(next);
    });
    void backend
      .getSession()
      .catch(() => null)
      .then(async (initial) => {
        if (cancelled) return;
        if (initial) {
          await handleSession(initial);
        } else if (!sessionRef.current) {
          applySession(null);
        }
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [backend, handleSession, applySession]);

  useEffect(
    () =>
      onLibraryUnauthenticated(() => {
        if (sessionRef.current && !endingRef.current) void endSession("expired");
      }),
    [endSession],
  );

  const requestOtp = useCallback(
    async (email: string) => {
      const result = await backend.requestOtp(email);
      if (result === "signed_in") {
        await handleSession(await backend.getSession());
      }
      return result;
    },
    [backend, handleSession],
  );

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      await backend.verifyOtp(email, code);
      const next = await backend.getSession();
      await handleSession(next);
    },
    [backend, handleSession],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      session,
      authMode: backend.mode,
      endReason,
      requestOtp,
      verifyOtp,
      endSession,
    }),
    [status, session, backend.mode, endReason, requestOtp, verifyOtp, endSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook belong together
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within a SessionProvider");
  return context;
}
