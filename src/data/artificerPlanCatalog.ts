import type { CatalogSource } from "./types";

const EFA_SOURCE: CatalogSource = { srd: false, book: "EFA" };

/** Magic item plans from EFA Replicate Magic Item (Artificer Level 2+). */
export interface ArtificerPlanData extends CatalogSource {
  key: string;
  name: string;
  minArtificerLevel: number;
  requiresAttunement: boolean;
}

const RAW_ARTIFICER_PLANS: Omit<ArtificerPlanData, keyof CatalogSource>[] = [
  { key: "alchemy-jug", name: "Alchemy Jug", minArtificerLevel: 2, requiresAttunement: false },
  { key: "bag-of-holding", name: "Bag of Holding", minArtificerLevel: 2, requiresAttunement: false },
  { key: "cap-of-water-breathing", name: "Cap of Water Breathing", minArtificerLevel: 2, requiresAttunement: false },
  { key: "goggles-of-night", name: "Goggles of Night", minArtificerLevel: 2, requiresAttunement: false },
  { key: "manifold-tool", name: "Manifold Tool", minArtificerLevel: 2, requiresAttunement: true },
  { key: "repeating-shot", name: "Repeating Shot", minArtificerLevel: 2, requiresAttunement: true },
  { key: "returning-weapon", name: "Returning Weapon", minArtificerLevel: 2, requiresAttunement: false },
  { key: "rope-of-climbing", name: "Rope of Climbing", minArtificerLevel: 2, requiresAttunement: false },
  { key: "sending-stones", name: "Sending Stones", minArtificerLevel: 2, requiresAttunement: false },
  { key: "shield-plus-1", name: "Shield +1", minArtificerLevel: 2, requiresAttunement: false },
  { key: "wand-of-magic-detection", name: "Wand of Magic Detection", minArtificerLevel: 2, requiresAttunement: false },
  { key: "wand-of-secrets", name: "Wand of Secrets", minArtificerLevel: 2, requiresAttunement: false },
  { key: "wand-of-the-war-mage-plus-1", name: "Wand of the War Mage +1", minArtificerLevel: 2, requiresAttunement: true },
  { key: "weapon-plus-1", name: "Weapon +1", minArtificerLevel: 2, requiresAttunement: false },
  { key: "wraps-of-unarmed-power-plus-1", name: "Wraps of Unarmed Power +1", minArtificerLevel: 2, requiresAttunement: false },
  { key: "armor-plus-1", name: "Armor +1", minArtificerLevel: 6, requiresAttunement: false },
  { key: "boots-of-elvenkind", name: "Boots of Elvenkind", minArtificerLevel: 6, requiresAttunement: false },
  { key: "boots-of-the-winding-path", name: "Boots of the Winding Path", minArtificerLevel: 6, requiresAttunement: true },
  { key: "cloak-of-elvenkind", name: "Cloak of Elvenkind", minArtificerLevel: 6, requiresAttunement: true },
  { key: "mind-sharpener", name: "Mind Sharpener", minArtificerLevel: 6, requiresAttunement: true },
  { key: "repulsion-shield", name: "Repulsion Shield", minArtificerLevel: 6, requiresAttunement: false },
];

export const ARTIFICER_PLANS: ArtificerPlanData[] = RAW_ARTIFICER_PLANS.map((plan) => ({
  ...plan,
  ...EFA_SOURCE,
}));
