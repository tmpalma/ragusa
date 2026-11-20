import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://api.open5e.com/v2";
const CACHE_DIR = path.join(import.meta.dirname, "..", ".cache");

interface Open5ePage<T> {
  count: number;
  next: string | null;
  results: T[];
}

/**
 * Fetches an Open5e v2 endpoint (a single page is enough for most resources
 * in the 2024 SRD slice) and caches the raw response on disk so re-running
 * the ingest script doesn't hit the network every time.
 */
export async function fetchOpen5e<T>(endpoint: string, query: string): Promise<T[]> {
  const cacheFile = path.join(CACHE_DIR, `${endpoint}.json`);

  try {
    const cached = await readFile(cacheFile, "utf-8");
    console.log(`[cache] ${endpoint}`);
    return JSON.parse(cached).results as T[];
  } catch {
    // fall through to network fetch
  }

  const url = `${API_BASE}/${endpoint}/?${query}&limit=200`;
  console.log(`[fetch] ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open5e request failed for ${endpoint}: ${response.status} ${response.statusText}`);
  }
  const body = (await response.json()) as Open5ePage<T>;

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cacheFile, JSON.stringify(body, null, 2));

  return body.results;
}

/**
 * Paginates through every result for an endpoint. Spells (~339) exceed the
 * default single-page limit, so they use this helper instead.
 */
export async function fetchOpen5eAll<T>(endpoint: string, query: string): Promise<T[]> {
  const cacheFile = path.join(CACHE_DIR, `${endpoint}-all.json`);

  try {
    const cached = await readFile(cacheFile, "utf-8");
    console.log(`[cache] ${endpoint} (all pages)`);
    return JSON.parse(cached) as T[];
  } catch {
    // fall through to network fetch
  }

  const results: T[] = [];
  let url: string | null = `${API_BASE}/${endpoint}/?${query}&limit=200`;

  while (url) {
    console.log(`[fetch] ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open5e request failed for ${endpoint}: ${response.status} ${response.statusText}`);
    }
    const body = (await response.json()) as Open5ePage<T>;
    results.push(...body.results);
    url = body.next;
  }

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cacheFile, JSON.stringify(results, null, 2));

  return results;
}

export function stripKeyPrefix(key: string): string {
  return key.replace(/^srd-2024_/, "");
}
