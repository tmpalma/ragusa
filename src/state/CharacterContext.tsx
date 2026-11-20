import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
} from "react";
import { computeDerivedStats, type DerivedStats } from "../domain/deriveCharacter";
import { saveActivePlay, savePlayerLastCharacter } from "../platform/characterPersist";
import { registerPersistFlush } from "../platform/persistFlush";
import {
  clearLibraryCharacterBinding,
  getLibraryCharacterBinding,
  getLibraryClient,
  subscribeLibrarySession,
} from "../platform/libraryClient";
import {
  getPlayPersistEmail,
  isPlayPersistReady,
  subscribePlayPersistReady,
} from "../platform/playSessionPersist";
import { useToast } from "../components/toast/ToastContext";
import { characterReducer, INITIAL_CHARACTER, type Character, type CharacterAction } from "./characterState";
import { useTableRules } from "./TableRulesContext";

const PERSIST_DEBOUNCE_MS = 400;

interface CharacterContextValue {
  character: Character;
  dispatch: Dispatch<CharacterAction>;
  derived: DerivedStats;
}

const CharacterContext = createContext<CharacterContextValue | null>(null);

export function CharacterProvider({ children }: { children: ReactNode }) {
  const tableRules = useTableRules();
  const { showToast } = useToast();
  const [character, rawDispatch] = useReducer(
    (state: Character, action: CharacterAction) => characterReducer(state, action, tableRules),
    INITIAL_CHARACTER,
  );
  const libraryCharacter = useSyncExternalStore(
    subscribeLibrarySession,
    getLibraryCharacterBinding,
    getLibraryCharacterBinding,
  );
  const dispatch = useCallback((action: CharacterAction) => {
    if (action.type === "NEW_CHARACTER") clearLibraryCharacterBinding();
    rawDispatch(action);
  }, []);
  const derived = useMemo(() => computeDerivedStats(character, tableRules), [character, tableRules]);
  const value = useMemo(() => ({ character, dispatch, derived }), [character, dispatch, derived]);

  const persistReady = useSyncExternalStore(
    subscribePlayPersistReady,
    isPlayPersistReady,
    isPlayPersistReady,
  );
  const characterRef = useRef(character);
  characterRef.current = character;
  const libraryCharacterRef = useRef(libraryCharacter);
  libraryCharacterRef.current = libraryCharacter;
  const saveErrorToastShownRef = useRef(false);

  useEffect(() => {
    return registerPersistFlush(() => {
      if (!persistReady) return;
      const current = characterRef.current;
      const binding = libraryCharacterRef.current;
      const email = getPlayPersistEmail();
      if (!email) return;

      if (binding?.loaded) {
        const title = current.name.trim();
        void getLibraryClient()
          .saveCharacter(binding.email, binding.characterId, {
            document: current,
            ...(title ? { title } : {}),
          })
          .catch(() => undefined);
        void saveActivePlay(email, { characterId: binding.characterId }).catch(() => undefined);
        return;
      }

      void savePlayerLastCharacter(email, current).catch(() => undefined);
      void saveActivePlay(email, { characterId: null }).catch(() => undefined);
    });
  }, [persistReady]);

  useEffect(() => {
    if (!persistReady) return;

    if (libraryCharacter && !libraryCharacter.loaded) return;

    const timer = window.setTimeout(() => {
      const email = getPlayPersistEmail();
      if (!email) return;

      if (libraryCharacter?.loaded) {
        const title = character.name.trim();
        void getLibraryClient()
          .saveCharacter(libraryCharacter.email, libraryCharacter.characterId, {
            document: character,
            ...(title ? { title } : {}),
          })
          .catch(() => {
            if (!saveErrorToastShownRef.current) {
              saveErrorToastShownRef.current = true;
              showToast("Could not save the library character.", "error");
            }
          });
        void saveActivePlay(email, { characterId: libraryCharacter.characterId }).catch(() => undefined);
        return;
      }

      void savePlayerLastCharacter(email, character).catch(() => {
        if (!saveErrorToastShownRef.current) {
          saveErrorToastShownRef.current = true;
          showToast("Could not save the last character.", "error");
        }
      });
      void saveActivePlay(email, { characterId: null }).catch(() => undefined);
    }, PERSIST_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [character, persistReady, libraryCharacter, showToast]);

  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook belong together
export function useCharacter(): CharacterContextValue {
  const context = useContext(CharacterContext);
  if (!context) throw new Error("useCharacter must be used within a CharacterProvider");
  return context;
}
