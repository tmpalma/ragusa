import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  loadActivePlay,
  loadPlayerLastCampaign,
  loadPlayerLastCharacter,
} from "../../platform/characterPersist";
import {
  beginLibraryCharacterOpen,
  clearLibraryCharacterBinding,
  completeLibraryCharacterOpen,
  getLibraryCharacterBinding,
  getLibraryClient,
  setLibraryCampaignBinding,
} from "../../platform/libraryClient";
import {
  clearHomebrewItemRegistryForSession,
  refreshHomebrewItemRegistryForCharacter,
} from "../../platform/refreshHomebrewItemRegistry";
import { resumePlayPersist, suspendPlayPersist } from "../../platform/playSessionPersist";
import { INITIAL_CHARACTER } from "../../state/characterState";
import { useCampaign } from "../../state/CampaignContext";
import { useCharacter } from "../../state/CharacterContext";
import { useSession } from "../../state/SessionContext";

export function PlaySessionGate({ children }: { children: ReactNode }) {
  const { status, session } = useSession();
  const { dispatch: characterDispatch } = useCharacter();
  const { dispatch: campaignDispatch } = useCampaign();
  const restoreGenerationRef = useRef(0);

  useLayoutEffect(() => {
    if (status === "loading") return;

    const email = session?.email ?? null;
    suspendPlayPersist();
    clearLibraryCharacterBinding();
    setLibraryCampaignBinding(null);
    clearHomebrewItemRegistryForSession();
    characterDispatch({ type: "LOAD_CHARACTER", character: INITIAL_CHARACTER });
    campaignDispatch({ type: "HYDRATE_MEMBERS", members: [] });

    if (!email) return;

    const generation = ++restoreGenerationRef.current;
    void (async () => {
      const active = await loadActivePlay(email);
      if (generation !== restoreGenerationRef.current) return;

      if (active?.characterId) {
        try {
          const record = await getLibraryClient().openCharacter(email, active.characterId);
          if (generation !== restoreGenerationRef.current) return;
          beginLibraryCharacterOpen(email, record.id);
          characterDispatch({ type: "LOAD_CHARACTER", character: record.document });
          completeLibraryCharacterOpen();
          await refreshHomebrewItemRegistryForCharacter(email, record.id);
        } catch {
          const local = await loadPlayerLastCharacter(email);
          if (generation !== restoreGenerationRef.current) return;
          if (local != null) {
            characterDispatch({ type: "LOAD_CHARACTER", character: local });
          }
        }
      } else {
        const local = await loadPlayerLastCharacter(email);
        if (generation !== restoreGenerationRef.current) return;
        if (local != null) {
          characterDispatch({ type: "LOAD_CHARACTER", character: local });
        }
      }

      if (active?.campaignId) {
        try {
          const record = await getLibraryClient().openCampaign(email, active.campaignId);
          if (generation !== restoreGenerationRef.current) return;
          setLibraryCampaignBinding({ email, campaignId: record.id });
          campaignDispatch({
            type: "HYDRATE_MEMBERS",
            members: record.members.map((member) => ({
              id: member.id,
              character: member.character,
              initiative: member.initiative ?? null,
            })),
          });
        } catch {
          const members = await loadPlayerLastCampaign(email);
          if (generation !== restoreGenerationRef.current) return;
          if (members.length > 0) {
            campaignDispatch({ type: "HYDRATE_MEMBERS", members });
          }
        }
      } else {
        const members = await loadPlayerLastCampaign(email);
        if (generation !== restoreGenerationRef.current) return;
        if (members.length > 0) {
          campaignDispatch({ type: "HYDRATE_MEMBERS", members });
        }
      }

      if (generation !== restoreGenerationRef.current) return;
      const binding = getLibraryCharacterBinding();
      if (binding?.loaded) {
        await refreshHomebrewItemRegistryForCharacter(email, binding.characterId);
      }
      resumePlayPersist(email);
    })();
  }, [status, session?.email, characterDispatch, campaignDispatch]);

  return children;
}
