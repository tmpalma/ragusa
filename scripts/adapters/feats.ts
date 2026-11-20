import type { FeatData } from "../../src/data/types.js";
import { fetchOpen5e, stripKeyPrefix } from "../lib/open5eClient.js";
import { SRD_XPHB } from "./catalogSource.js";
import { EXTRA_FEATS } from "./extraFeats.js";
import { BACKGROUND_ORIGIN_FEATS } from "./backgroundOriginFeats.js";
import { POST2024_FEATS } from "./post2024Feats.js";

interface RawFeat {
  key: string;
  name: string;
  type: string;
  prerequisite: string;
  benefits: { desc: string }[];
}

const MAGIC_INITIATE_LISTS = [
  { key: "magic-initiate-wizard", name: "Magic Initiate (Wizard)", listLabel: "Wizard" },
  { key: "magic-initiate-cleric", name: "Magic Initiate (Cleric)", listLabel: "Cleric" },
  { key: "magic-initiate-druid", name: "Magic Initiate (Druid)", listLabel: "Druid" },
] as const;

function expandMagicInitiate(feat: FeatData): FeatData[] {
  if (feat.key !== "magic-initiate") return [feat];

  return MAGIC_INITIATE_LISTS.map(({ key, name, listLabel }) => ({
    key,
    name,
    category: feat.category,
    desc: feat.desc
      .replace(
        /You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list\./,
        `You learn two cantrips of your choice from the ${listLabel} spell list.`,
      )
      .replace(
        /Choose a level 1 spell from the same list you selected for this feat's cantrips\./,
        `Choose a level 1 spell from the ${listLabel} spell list.`,
      )
      .replace(
        /from the chosen spell list\./g,
        `from the ${listLabel} spell list.`,
      ),
    ...SRD_XPHB,
  }));
}

export async function loadFeats(): Promise<FeatData[]> {
  const raw = await fetchOpen5e<RawFeat>("feats", "document__key__in=srd-2024");

  const open5eKeys = new Set<string>();
  const fromOpen5e = raw.flatMap((f) => {
    const feat: FeatData = {
      key: stripKeyPrefix(f.key),
      name: f.name,
      category: f.type,
      desc: [f.prerequisite && `Prerequisite: ${f.prerequisite}`, ...f.benefits.map((b) => b.desc)]
        .filter(Boolean)
        .join("\n\n"),
      ...SRD_XPHB,
    };
    const expanded = expandMagicInitiate(feat);
    for (const entry of expanded) open5eKeys.add(entry.key);
    return expanded;
  });

  const extras = [...EXTRA_FEATS, ...BACKGROUND_ORIGIN_FEATS, ...POST2024_FEATS].filter(
    (feat) => !open5eKeys.has(feat.key),
  );
  return [...fromOpen5e, ...extras].sort((a, b) => a.name.localeCompare(b.name));
}
