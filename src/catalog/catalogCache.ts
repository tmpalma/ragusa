import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
import type { CatalogPayload } from "./types";
import { validateCatalogPayload } from "./installCatalog";

const PREFERENCES_KEY = "rpg-dm-catalog-cache";
const FILE_NAME = "catalog-cache.json";

/** Preferences value size is limited on some devices; spill to Filesystem when needed. */
const PREFERENCES_MAX_CHARS = 900_000;

async function writeFilesystem(json: string): Promise<void> {
  await Filesystem.writeFile({
    path: FILE_NAME,
    data: json,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
}

async function readFilesystem(): Promise<string | null> {
  try {
    const result = await Filesystem.readFile({
      path: FILE_NAME,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return typeof result.data === "string" ? result.data : null;
  } catch {
    return null;
  }
}

async function saveWeb(json: string): Promise<void> {
  localStorage.setItem(PREFERENCES_KEY, json);
}

async function readWeb(): Promise<string | null> {
  return localStorage.getItem(PREFERENCES_KEY);
}

export async function saveCatalogCache(payload: CatalogPayload): Promise<void> {
  const json = JSON.stringify(payload);
  if (Capacitor.isNativePlatform()) {
    if (json.length <= PREFERENCES_MAX_CHARS) {
      await Preferences.set({ key: PREFERENCES_KEY, value: json });
      try {
        await Filesystem.deleteFile({ path: FILE_NAME, directory: Directory.Data });
      } catch {
        /* no file yet */
      }
      return;
    }
    await Preferences.remove({ key: PREFERENCES_KEY });
    await writeFilesystem(json);
    return;
  }
  await saveWeb(json);
}

export async function readCatalogCache(): Promise<CatalogPayload | null> {
  let raw: string | null = null;
  if (Capacitor.isNativePlatform()) {
    const pref = await Preferences.get({ key: PREFERENCES_KEY });
    raw = pref.value ?? null;
    if (!raw) raw = await readFilesystem();
  } else {
    raw = await readWeb();
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!validateCatalogPayload(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
