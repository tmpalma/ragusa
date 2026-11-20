import type { TableRules } from "../domain/tableRules";
import { characterReducer, type Character } from "./characterState";

export interface CampaignMember {
  id: string;
  character: Character;
  initiative: number | null;
}

export interface CampaignState {
  members: CampaignMember[];
}

export const INITIAL_CAMPAIGN_STATE: CampaignState = {
  members: [],
};

export type CampaignAction =
  | { type: "ADD_MEMBERS"; characters: Character[] }
  | { type: "REMOVE_MEMBER"; id: string }
  | { type: "SET_INITIATIVE"; id: string; initiative: number | null }
  | { type: "SET_MEMBER_CONCENTRATION_SPELL"; id: string; spellKey: string | null; tableRules: TableRules }
  | { type: "SORT_BY_INITIATIVE" }
  | { type: "HYDRATE_MEMBERS"; members: CampaignMember[] };

function sortMembersByInitiative(members: CampaignMember[]): CampaignMember[] {
  const indexed = members.map((member, index) => ({ member, index }));
  indexed.sort((a, b) => {
    const aInit = a.member.initiative;
    const bInit = b.member.initiative;
    const aHas = aInit !== null;
    const bHas = bInit !== null;

    if (aHas && bHas) {
      if (bInit !== aInit) return bInit - aInit;
      return a.index - b.index;
    }
    if (aHas !== bHas) return aHas ? -1 : 1;
    return a.index - b.index;
  });
  return indexed.map(({ member }) => member);
}

export function campaignReducer(state: CampaignState, action: CampaignAction): CampaignState {
  switch (action.type) {
    case "ADD_MEMBERS":
      if (action.characters.length === 0) return state;
      return {
        members: [
          ...state.members,
          ...action.characters.map((character) => ({
            id: crypto.randomUUID(),
            character,
            initiative: null,
          })),
        ],
      };
    case "REMOVE_MEMBER":
      return {
        members: state.members.filter((member) => member.id !== action.id),
      };
    case "SET_INITIATIVE":
      return {
        members: state.members.map((member) =>
          member.id === action.id ? { ...member, initiative: action.initiative } : member,
        ),
      };
    case "SET_MEMBER_CONCENTRATION_SPELL":
      return {
        members: state.members.map((member) => {
          if (member.id !== action.id) return member;
          const nextCharacter = characterReducer(
            member.character,
            { type: "SET_CONCENTRATION_SPELL", spellKey: action.spellKey },
            action.tableRules,
          );
          if (nextCharacter === member.character) return member;
          return { ...member, character: nextCharacter };
        }),
      };
    case "SORT_BY_INITIATIVE":
      return {
        members: sortMembersByInitiative(state.members),
      };
    case "HYDRATE_MEMBERS":
      return { members: action.members };
    default:
      return state;
  }
}

/** 1-based caption for a roster member (named or "Char {n}" template). */
export function memberCaption(
  character: Character,
  oneBasedIndex: number,
  unnamedTemplate: string,
): string {
  const trimmed = character.name.trim();
  if (trimmed) return trimmed;
  return unnamedTemplate.replace(/\{n\}/g, String(oneBasedIndex));
}
