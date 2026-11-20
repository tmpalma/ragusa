import { characterFileName, parseCharacterFile, serializeCharacterFile } from "./characterFile";
import type { Character } from "../state/characterState";
import { pickFile, saveBytes, type PickedFile } from "../platform/fileIo";

const JSON_ACCEPT = { "application/json": [".json"] };

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function pickedFileToDomFile(picked: PickedFile): File {
  if (picked.text !== undefined) {
    return new File([picked.text], picked.name, { type: "application/json" });
  }
  if (picked.bytes !== undefined) {
    return new File([new Uint8Array(picked.bytes)], picked.name, { type: "application/json" });
  }
  return new File([], picked.name, { type: "application/json" });
}

export async function saveCharacterToDisk(character: Character): Promise<void> {
  const json = serializeCharacterFile(character);
  await saveBytes({
    bytes: json,
    filename: characterFileName(character),
    mimeType: "application/json",
  });
}

export async function pickCharacterFilesFromDisk(multiple = false): Promise<File[]> {
  // LoadCharacterDialog still owns the <input type="file"> fallback when FSA is unavailable.
  if (typeof window.showOpenFilePicker !== "function") {
    return [];
  }

  const picked = await pickFile({ accept: JSON_ACCEPT, multiple });
  return picked.map(pickedFileToDomFile);
}

export async function pickCharacterFileFromDisk(): Promise<File | null> {
  const files = await pickCharacterFilesFromDisk(false);
  return files[0] ?? null;
}

export async function loadCharacterFromFile(file: File): Promise<Character> {
  const source = await file.text();
  return parseCharacterFile(source);
}
