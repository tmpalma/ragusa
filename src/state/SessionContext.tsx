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
import { saveClaimedIdentity } from "../platform/claimedIdentity";
import { flushAllPersist } from "../platform/persistFlush";
import {
  clearLegacyBypassSession,
  clearLocalAuthSession,
  loadLocalAuthSession,
  saveLocalAuthSession,
  sessionFromMagicUser,
  type AppSession,
} from "../platform/authSessionStorage";
import { getLibraryClient, clearLibraryCharacterBinding, setLibraryCampaignBinding } from "../platform/libraryClient";
import { suspendPlayPersist } from "../platform/playSessionPersist";

type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SessionContextValue {
  status: SessionStatus;
  session: AppSession | null;
  signIn: (email: string) => Promise<void>;
  endSession: (reason?: "idle" | "manual") => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function resolveSession(): AppSession | null {
  return loadLocalAuthSession();
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [session, setSession] = useState<AppSession | null>(null);
  const bootstrappedRef = useRef(false);

  const applySession = useCallback((next: AppSession | null) => {
    setSession(next);
    setStatus(next ? "authenticated" : "anonymous");
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    clearLegacyBypassSession();
    applySession(resolveSession());
  }, [applySession]);

  const signIn = useCallback(async (email: string) => {
    const local = sessionFromMagicUser(email);
    if (!local) {
      throw new Error("Invalid email.");
    }
    saveLocalAuthSession(local);
    saveClaimedIdentity({ email: local.email });
    await getLibraryClient().ensurePlayer(local.email);
    applySession(local);
  }, [applySession]);

  const endSession = useCallback(
    async (_reason?: "idle" | "manual") => {
      await flushAllPersist();
      suspendPlayPersist();
      clearLibraryCharacterBinding();
      setLibraryCampaignBinding(null);
      clearLegacyBypassSession();
      clearLocalAuthSession();
      applySession(null);
    },
    [applySession],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      session,
      signIn,
      endSession,
    }),
    [status, session, signIn, endSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook belong together
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within a SessionProvider");
  return context;
}
