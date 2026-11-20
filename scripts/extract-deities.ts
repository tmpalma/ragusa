/**
 * Developer-only: read the local 5etools dump and write committed adapters.
 * Do not call from fetch:data, the app, or CI.
 *
 *   npx tsx scripts/extract-deities.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildDeityCatalog, type RawFiveToolsDeity } from "./lib/deitiesFromFiveTools.js";

const DUMP = path.join(os.homedir(), "Downloads", "5etools-v2.35.0", "data", "deities.json");
const OUT = path.join(import.meta.dirname, "adapters", "deities.json");

async function main() {
  const raw = JSON.parse(await readFile(DUMP, "utf8")) as { deity: RawFiveToolsDeity[] };
  const catalog = buildDeityCatalog(raw.deity);
  await writeFile(OUT, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`[write] scripts/adapters/deities.json (${catalog.length} deities)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
