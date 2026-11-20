import type { SpeciesData } from "../../src/data/types.js";
import { fetchOpen5e, stripKeyPrefix } from "../lib/open5eClient.js";
import { SPECIES_FEATURE_CATALOG } from "../../catalog-source/speciesFeatureCatalog.js";
import { NON_SRD_EFA, SRD_XPHB } from "./catalogSource.js";

interface RawTrait {
  name: string;
  desc: string;
  type: string | null;
}

interface RawSpecies {
  key: string;
  name: string;
  traits: RawTrait[];
}

function parseSpeeds(traits: RawTrait[]): { type: string; feet: number }[] {
  const speedTrait = traits.find((t) => t.type === "SPEED");
  if (!speedTrait) return [{ type: "walk", feet: 30 }];

  // Open5e's SPEED trait is prose, e.g. "30 feet". Every srd-2024 species has
  // exactly one walking speed at character creation, but the shape stays an
  // array so a future species with a secondary movement type degrades gracefully.
  const feet = Number.parseInt(speedTrait.desc, 10);
  return [{ type: "walk", feet: Number.isFinite(feet) ? feet : 30 }];
}

function withSpeciesFeatures(species: Omit<SpeciesData, "features"> & { features?: SpeciesData["features"] }): SpeciesData {
  const catalog = SPECIES_FEATURE_CATALOG[species.key];
  return {
    ...species,
    features: catalog?.features ?? [],
    ...(catalog?.choice ? { choice: catalog.choice } : {}),
    ...(catalog?.hasSizeChoice ? { hasSizeChoice: true } : {}),
  };
}

/** Eberron: Forge of the Artificer (2024) species — not in Open5e srd-2024. */
const EXTRA_SPECIES: Omit<SpeciesData, "features">[] = [
  {
    key: "changeling",
    name: "Changeling",
    ...NON_SRD_EFA,
    speeds: [{ type: "walk", feet: 30 }],
    traits: [
      {
        name: "Creature Type",
        desc: "You are a Fey.",
      },
      {
        name: "Size",
        desc: "Medium (about 4–7 feet tall) or Small (about 2–4 feet tall), chosen when you select this species.",
      },
    ],
  },
  {
    key: "warforged",
    name: "Warforged",
    ...NON_SRD_EFA,
    speeds: [{ type: "walk", feet: 30 }],
    traits: [
      {
        name: "Creature Type",
        desc: "You are a Construct.",
      },
      {
        name: "Size",
        desc: "Medium (about 6–8 feet tall) or Small (about 3–4 feet tall), chosen when you select this species.",
      },
    ],
  },
];

export async function loadSpecies(): Promise<SpeciesData[]> {
  const raw = await fetchOpen5e<RawSpecies>("species", "document__key__in=srd-2024");

  const fromOpen5e = raw.map((s) =>
    withSpeciesFeatures({
      key: stripKeyPrefix(s.key),
      name: s.name,
      ...SRD_XPHB,
      speeds: parseSpeeds(s.traits),
      traits: s.traits.map((t) => ({ name: t.name, desc: t.desc })),
    }),
  );

  const extra = EXTRA_SPECIES.map((s) => withSpeciesFeatures(s));
  return [...fromOpen5e, ...extra];
}
