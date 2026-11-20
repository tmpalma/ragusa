/**
 * Developer-only: read the local 5etools dump and write committed adapters.
 * Do not call from fetch:data, the app, or CI.
 *
 *   npx tsx scripts/extract-srd-conditions.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { flattenFiveToolsEntries, slugifyItemName } from "./lib/fiveToolsText.js";

const DUMP = path.join(os.homedir(), "Downloads", "5etools-v2.35.0", "data", "conditionsdiseases.json");
const OUT = path.join(import.meta.dirname, "adapters", "conditions.ts");

interface RawCondition {
  name: string;
  source: string;
  srd52?: boolean;
  entries?: unknown;
}

async function main() {
  const raw = JSON.parse(await readFile(DUMP, "utf8")) as { condition: RawCondition[] };
  const rows = raw.condition
    .filter((entry) => entry.source === "XPHB" && entry.srd52 === true)
    .map((entry) => ({
      key: slugifyItemName(entry.name),
      name: entry.name,
      desc: flattenFiveToolsEntries(entry.entries),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const content = `import type { ConditionData } from "../../src/data/types.js";
import { SRD_XPHB } from "./catalogSource.js";

/** 2024 SRD conditions transcribed from XPHB (conditionsdiseases.json). */
export const CONDITIONS: ConditionData[] = ${JSON.stringify(rows, null, 2).replace(
    /"([^"]+)":/g,
    "$1:",
  ).replace(/"/g, '"')}.map((row) => ({ ...row, ...SRD_XPHB }));
`;

  await writeFile(OUT, content);
  console.log(`[write] ${OUT} (${rows.length} conditions)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
