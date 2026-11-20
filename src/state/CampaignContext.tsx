import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
} from "react";
import { saveActivePlay, savePlayerLastCampaign } from "../platform/characterPersist";
import { registerPersistFlush } from "../platform/persistFlush";
import {
  getLibraryCampaignBinding,
  subscribeLibrarySession,
} from "../platform/libraryClient";
import {
  getPlayPersistEmail,
  isPlayPersistReady,
  subscribePlayPersistReady,
} from "../platform/playSessionPersist";
import { useToast } from "../components/toast/ToastContext";
import {
  campaignReducer,
  INITIAL_CAMPAIGN_STATE,
  type CampaignAction,
  type CampaignMember,
  type CampaignState,
} from "./campaignState";

const PERSIST_DEBOUNCE_MS = 400;

interface CampaignContextValue {
  members: CampaignMember[];
  dispatch: Dispatch<CampaignAction>;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [state, dispatch] = useReducer(campaignReducer, INITIAL_CAMPAIGN_STATE);
  const libraryCampaign = useSyncExternalStore(
    subscribeLibrarySession,
    getLibraryCampaignBinding,
    getLibraryCampaignBinding,
  );

  const persistReady = useSyncExternalStore(
    subscribePlayPersistReady,
    isPlayPersistReady,
    isPlayPersistReady,
  );
  const membersRef = useRef(state.members);
  membersRef.current = state.members;
  const saveErrorToastShownRef = useRef(false);

  useEffect(() => {
    return registerPersistFlush(() => {
      if (!persistReady) return;
      const email = getPlayPersistEmail();
      if (!email) return;

      const campaignBinding = getLibraryCampaignBinding();
      if (campaignBinding) {
        void saveActivePlay(email, { campaignId: campaignBinding.campaignId }).catch(() => undefined);
        return;
      }

      void savePlayerLastCampaign(email, membersRef.current).catch(() => undefined);
      void saveActivePlay(email, { campaignId: null }).catch(() => undefined);
    });
  }, [persistReady]);

  useEffect(() => {
    if (!persistReady) return;
    if (libraryCampaign) return;

    const timer = window.setTimeout(() => {
      const email = getPlayPersistEmail();
      if (!email) return;

      void savePlayerLastCampaign(email, state.members).catch(() => {
        if (!saveErrorToastShownRef.current) {
          saveErrorToastShownRef.current = true;
          showToast("Could not save the last campaign roster.", "error");
        }
      });
      void saveActivePlay(email, { campaignId: null }).catch(() => undefined);
    }, PERSIST_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [state.members, persistReady, libraryCampaign, showToast]);

  const value: CampaignContextValue = {
    members: state.members,
    dispatch,
  };

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook belong together
export function useCampaign(): CampaignContextValue {
  const context = useContext(CampaignContext);
  if (!context) throw new Error("useCampaign must be used within a CampaignProvider");
  return context;
}

export type { CampaignMember, CampaignState, CampaignAction };
