/**
 * Developer-only: read the local 5etools dump and write committed adapters.
 * Do not call from fetch:data, the app, or CI.
 *
 *   npx tsx scripts/extract-post2024-feats.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { flattenFiveToolsEntries, slugifyItemName } from "./lib/fiveToolsText.js";
import { EXTRA_FEATS } from "./adapters/extraFeats.js";
import { BACKGROUND_ORIGIN_FEATS } from "./adapters/backgroundOriginFeats.js";

const DUMP = path.join(os.homedir(), "Downloads", "5etools-v2.35.0", "data", "feats.json");
const ADAPTERS = path.join(import.meta.dirname, "adapters");
const DOMAIN = path.join(import.meta.dirname, "..", "src", "domain");

const SOURCES = new Set(["FRHoF", "ABH", "EFA", "RHW", "AU"]);
const CATEGORY_MAP: Record<string, string> = {
  O: "Origin",
  G: "General",
  FS: "Fighting Style",
  D: "Dragonmark",
  DG: "Dark Gift",
};

interface RawFeat {
  name: string;
  source: string;
  category: string;
  prerequisite?: unknown;
  entries?: unknown;
  ability?: { choose?: { from?: string[]; count?: number; amount?: number }[] };
  additionalSpells?: unknown;
}

function existingKeys(): Set<string> {
  const keys = new Set<string>();
  for (const feat of [...EXTRA_FEATS, ...BACKGROUND_ORIGIN_FEATS]) {
    keys.add(feat.key);
  }
  return keys;
}

function prerequisiteText(raw: RawFeat): string {
  if (!raw.prerequisite) return "";
  if (typeof raw.prerequisite === "string") return raw.prerequisite;
  return flattenFiveToolsEntries(raw.prerequisite);
}

function inferActionTiming(desc: string): "action" | "bonus" | "reaction" | null {
  const lower = desc.toLowerCase();
  if (lower.includes("bonus action")) return "bonus";
  if (lower.includes("reaction")) return "reaction";
  if (lower.includes("magic action") || lower.includes("as an action")) return "action";
  return null;
}

function inferCombatSurface(desc: string): boolean {
  const lower = desc.toLowerCase();
  return (
    lower.includes("bonus action") ||
    lower.includes("reaction") ||
    lower.includes("magic action") ||
    lower.includes("attack roll") ||
    lower.includes("saving throw")
  );
}

function asiEffect(raw: RawFeat): string | null {
  const choose = raw.ability?.choose?.[0];
  if (!choose) return null;
  const abilities = (choose.from ?? []).map((ability) => `"${ability}"`).join(", ");
  const points = choose.amount ?? 1;
  return `{ type: "ability_score_increase", points: ${points}, maxScore: 20${abilities ? `, allowedAbilities: [${abilities}]` : ""} }`;
}

function stubDefinition(key: string, raw: RawFeat): string {
  const category = CATEGORY_MAP[raw.category] ?? "General";
  const desc = flattenFiveToolsEntries(raw.entries);
  const timing = inferActionTiming(desc);
  const combatSurface = inferCombatSurface(desc);
  const prereqs: string[] = [];
  if (category === "General" || category === "Fighting Style") {
    prereqs.push('{ type: "level", min: 4 }');
  }
  const asi = asiEffect(raw);
  const effects = [asi, '{ type: "narrative" }'].filter(Boolean).join(", ");
  const lines = [
    "  {",
    `    featKey: "${key}",`,
    `    prerequisites: [${prereqs.join(", ")}],`,
    `    effects: [${effects}],`,
  ];
  if (combatSurface) lines.push("    combatSurface: true,");
  if (timing) lines.push(`    actionTiming: "${timing}",`);
  lines.push("  },");
  return lines.join("\n");
}

function catalogEntry(key: string, raw: RawFeat): string {
  const category = CATEGORY_MAP[raw.category] ?? "General";
  const prereq = prerequisiteText(raw);
  const desc = flattenFiveToolsEntries(raw.entries);
  const fullDesc = [prereq ? `Prerequisite: ${prereq}` : null, desc].filter(Boolean).join("\n\n");
  const escaped = fullDesc.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
  return `  {
    key: "${key}",
    name: ${JSON.stringify(raw.name)},
    category: ${JSON.stringify(category)},
    desc: \`${escaped}\`,
    ...nonSrd(${JSON.stringify(raw.source)}),
  },`;
}

async function main(): Promise<void> {
  const rawJson = JSON.parse(await readFile(DUMP, "utf8")) as { feat: RawFeat[] };
  const skip = existingKeys();
  const open5eKeys = new Set<string>();
  try {
    const generated = JSON.parse(
      await readFile(path.join(import.meta.dirname, "..", "catalog-source", "generated", "feats.json"), "utf8"),
    ) as { key: string }[];
    for (const feat of generated) open5eKeys.add(feat.key);
  } catch {
    // generated feats optional during first extract
  }

  const selected = rawJson.feat.filter((feat) => {
    if (!SOURCES.has(feat.source)) return false;
    if (feat.category === "EB") return false;
    const key = slugifyItemName(feat.name);
    if (skip.has(key) || open5eKeys.has(key)) return false;
    return true;
  });

  selected.sort((a, b) => a.name.localeCompare(b.name));

  const catalogBody = selected.map((feat) => catalogEntry(slugifyItemName(feat.name), feat)).join("\n");
  const definitionsBody = selected.map((feat) => stubDefinition(slugifyItemName(feat.name), feat)).join("\n");

  const catalogFile = `import type { FeatData } from "../../src/data/types.js";
import { nonSrd } from "./catalogSource.js";

/** Post-2024 book feats transcribed from 5etools (developer extract). */
export const POST2024_FEATS: FeatData[] = [
${catalogBody}
];
`;

  const definitionsFile = `import type { FeatDefinition } from "./featEffects.js";

/** Stub mechanics for post-2024 imported feats (extend per feat as needed). */
export const POST2024_FEAT_DEFINITIONS: FeatDefinition[] = [
${definitionsBody}
];
`;

  await writeFile(path.join(ADAPTERS, "post2024Feats.ts"), catalogFile);
  await writeFile(path.join(DOMAIN, "post2024FeatDefinitions.ts"), definitionsFile);
  console.log(`Wrote ${selected.length} post-2024 feats`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
