import { parseCharacterFile, serializeCharacterFile } from "../../domain/characterFile";
import { INITIAL_CHARACTER, type Character } from "../../state/characterState";
import {
  LibraryClientError,
  type CharacterLibrary,
  type LibraryCharacter,
  type LibraryCharacterSummary,
} from "../libraryClient";
import {
  ensurePlayerRow,
  membershipForCharacter,
  newId,
  normalizeEmail,
  now,
  requireCharacter,
  type CharacterRow,
  type MemoryLibraryStore,
} from "./store";

function toCharacter(row: CharacterRow): LibraryCharacter {
  return {
    id: row.id,
    ownerEmail: row.ownerEmail,
    title: row.title,
    document: parseCharacterFile(row.documentJson),
    updatedAt: row.updatedAt,
  };
}

export function createCharacterLibrary(store: MemoryLibraryStore): CharacterLibrary {
  const { characters, campaigns } = store;

  function characterSummary(row: CharacterRow): LibraryCharacterSummary {
    const membership = membershipForCharacter(store, row.id);
    const campaign = membership ? campaigns.get(membership.campaignId) : undefined;
    return {
      id: row.id,
      ownerEmail: row.ownerEmail,
      title: row.title,
      updatedAt: row.updatedAt,
      campaignId: membership?.campaignId ?? null,
      campaignTitle: campaign?.title ?? null,
    };
  }

  function insertCharacter(email: string, title: string, document: Character): LibraryCharacter {
    const row: CharacterRow = {
      id: newId(),
      ownerEmail: email,
      title,
      documentJson: serializeCharacterFile(document),
      updatedAt: now(),
    };
    characters.set(row.id, row);
    return toCharacter(row);
  }

  return {
    async listCharacters(email) {
      const ownerEmail = normalizeEmail(email);
      return [...characters.values()]
        .filter((row) => row.ownerEmail === ownerEmail)
        .map(characterSummary)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.title.localeCompare(b.title)));
    },

    async createCharacter(email, input) {
      const ownerEmail = normalizeEmail(email);
      const title = input.title.trim();
      if (!ownerEmail || !title) {
        throw new LibraryClientError("empty_title", "Title is required.");
      }
      ensurePlayerRow(store, ownerEmail);
      const document = input.document ?? { ...INITIAL_CHARACTER, name: title };
      return insertCharacter(ownerEmail, title, document);
    },

    async openCharacter(email, characterId) {
      const ownerEmail = normalizeEmail(email);
      return toCharacter(requireCharacter(store, ownerEmail, characterId));
    },

    async saveCharacter(email, characterId, input) {
      const ownerEmail = normalizeEmail(email);
      const row = requireCharacter(store, ownerEmail, characterId);
      const title = input.title?.trim();
      if (title) row.title = title;
      row.documentJson = serializeCharacterFile(input.document);
      row.updatedAt = now();
      return toCharacter(row);
    },

    async deleteCharacter(email, characterId) {
      const ownerEmail = normalizeEmail(email);
      requireCharacter(store, ownerEmail, characterId);
      if (membershipForCharacter(store, characterId)) {
        throw new LibraryClientError(
          "character_has_membership",
          "Remove the character from their campaign before deleting them.",
        );
      }
      characters.delete(characterId);
    },

    async importCharacter(email, fileJson) {
      const ownerEmail = normalizeEmail(email);
      if (!ownerEmail) {
        throw new LibraryClientError("empty_title", "Email is required.");
      }
      let document: Character;
      try {
        document = parseCharacterFile(fileJson);
      } catch {
        throw new LibraryClientError("invalid_character_file", "Invalid character file.");
      }
      ensurePlayerRow(store, ownerEmail);
      const title = document.name.trim() || "Imported character";
      return insertCharacter(ownerEmail, title, document);
    },
  };
}
