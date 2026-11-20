import { describe, expect, it } from "vitest";
import { findByKey, FEATS, SPECIES } from "../data";
import type { AbilityId, FeatData } from "../data/types";
import { buildCombatActions } from "../domain/combatActions";
import { buildSpeciesFeatureActionCards, collectSpeciesFeatureContributions } from "../domain/speciesFeatures";
import { localizeCombatCard, localizeWeaponDamageLine } from "./localizeCombatCard";

const MODIFIERS: Record<AbilityId, number> = { str: 2, dex: 2, con: 0, int: 0, wis: 0, cha: 0 };

const t = (key: string, params?: Record<string, string | number>, fallback?: string) => {
  if (key === "combat.featAbilityCardTitle" && params) {
    return `${params.featName} - ${params.abilityName}`;
  }
  if (key === "combat.speciesFeatureCardTitle" && params) {
    return `${params.speciesName} ${params.speciesFeatureLabel} - ${params.featureName}`;
  }
  if (key === "combat.speciesFeatureLabel") return "Feature";
  return fallback ?? key;
};
const FEAT_NAMES: Record<string, string> = {
  "polearm-master": "Polearm Master",
  telekinetic: "Telekinetic",
  "lordly-resolve": "Lordly Resolve",
  "love-bites": "Love Bites",
  "divination-adept": "Divination Adept",
  sentinel: "Sentinel",
};

function featStub(key: string): FeatData {
  return {
    key,
    name: FEAT_NAMES[key] ?? key,
    category: "General",
    desc: "",
    srd: false,
    book: "XPHB",
  };
}

const tEntity = (catalog: string, key: string, field: string, fallback?: string) => {
  if (catalog === "catalog.feats" && field === "name") {
    return findByKey(FEATS, key)?.name ?? FEAT_NAMES[key] ?? fallback ?? key;
  }
  if (catalog === "catalog.species" && field === "name") {
    return findByKey(SPECIES, key)?.name ?? fallback ?? key;
  }
  return fallback ?? key;
};
const tGlossary = (_category: string, sourceText: string) => sourceText;

function localizedFeatTitle(featKey: string, cardId: string): string {
  const feat = findByKey(FEATS, featKey) ?? featStub(featKey);
  const lists = buildCombatActions({
    speciesKey: null,
    weapons: [],
    abilityModifiers: MODIFIERS,
    feats: [feat!],
  });
  const card = [...lists.actions, ...lists.bonusActions, ...lists.reactions].find((entry) => entry.id === cardId);
  expect(card).toBeTruthy();
  return localizeCombatCard(card!, t, tEntity, tGlossary).name;
}

describe("localizeCombatCard feat titles", () => {
  it("prefixes single-ability feat combat cards with feat name", () => {
    expect(localizedFeatTitle("polearm-master", "feat-polearm-master-pole-strike")).toBe(
      "Polearm Master - Pole Strike",
    );
    expect(localizedFeatTitle("polearm-master", "feat-polearm-master-reactive-strike")).toBe(
      "Polearm Master - Reactive Strike",
    );
    expect(localizedFeatTitle("telekinetic", "feat-telekinetic-telekinetic-shove")).toBe(
      "Telekinetic - Telekinetic Shove",
    );
    expect(localizedFeatTitle("lordly-resolve", "feat-lordly-resolve-standard-bearer")).toBe(
      "Lordly Resolve - Standard Bearer",
    );
    expect(localizedFeatTitle("love-bites", "feat-love-bites-endearing-pain")).toBe("Love Bites - Endearing Pain");
    expect(localizedFeatTitle("divination-adept", "feat-divination-adept-prescient-intervention")).toBe(
      "Divination Adept - Prescient Intervention",
    );
  });

  it("keeps feat name for multi-option combat cards", () => {
    const sentinel = featStub("sentinel");
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [],
      abilityModifiers: MODIFIERS,
      feats: [sentinel!],
    });
    const card = lists.reactions.find((entry) => entry.id === "feat-sentinel-reaction");
    expect(card).toBeTruthy();
    expect(localizeCombatCard(card!, t, tEntity, tGlossary).name).toBe("Sentinel");
  });
});

describe("localizeWeaponDamageLine", () => {
  it("localizes trailing physical damage types", () => {
    const tGlossary = (category: string, source: string) =>
      category === "damageType" && source === "Slashing" ? "Cortante" : source;
    expect(localizeWeaponDamageLine("1d8+3 Slashing", tGlossary)).toBe("1d8+3 Cortante");
  });
});

describe("localizeCombatCard weapon titles", () => {
  it("localizes base weapon name and variant affixes", () => {
    const card = {
      kind: "weapon" as const,
      id: "weapon-test",
      name: "Longsword",
      entityKey: "longsword",
      variantKey: "weapon-plus-1",
      description: "Finesse, Versatile (1d10)",
    };
    const tEntityWithWeapon = (
      catalog: string,
      key: string,
      field: string,
      fallback?: string,
    ) => {
      if (catalog === "catalog.weapons" && key === "longsword" && field === "name") {
        return "Espada longa";
      }
      if (catalog === "catalog.genericVariants" && key === "weapon-plus-1" && field === "namePrefix") {
        return "+1 ";
      }
      return fallback ?? key;
    };
    expect(localizeCombatCard(card, t, tEntityWithWeapon, tGlossary).name).toBe("+1 Espada longa");
  });

  it("localizes damage type in attack meta", () => {
    const card = {
      kind: "weapon" as const,
      id: "weapon-test",
      name: "Longsword",
      entityKey: "longsword",
      description: "",
      attackMeta: { bonus: "+5", damage: "1d8+3 Slashing", ability: "str" as const },
    };
    const tWithMeta = (key: string, params?: Record<string, string | number>, fallback?: string) => {
      if (key === "combat.attackMetaWithAbility" && params) {
        return `${params.bonus} / ${params.damage} (${params.ability})`;
      }
      return fallback ?? key;
    };
    const tGlossaryDamage = (category: string, source: string) =>
      category === "damageType" && source === "Slashing" ? "Cortante" : source;
    expect(localizeCombatCard(card, tWithMeta, tEntity, tGlossaryDamage).meta).toContain("Cortante");
    expect(localizeCombatCard(card, tWithMeta, tEntity, tGlossaryDamage).meta).not.toContain("Slashing");
  });
});

describe("localizeCombatCard species trait titles", () => {
  it("prefixes species action cards with species name", () => {
    const goliath = findByKey(SPECIES, "goliath");
    expect(goliath).toBeTruthy();
    const reactions = buildSpeciesFeatureActionCards({
      speciesData: goliath,
      lineageKey: "stone",
      level: 1,
      contributions: collectSpeciesFeatureContributions(goliath, "stone", 1),
      spellcastingAbility: null,
      formatMeta: () => "",
    }).reaction;
    const card = reactions.find((entry) => entry.traitSlug === "stones-endurance");
    expect(card).toBeTruthy();
    expect(localizeCombatCard(card!, t, tEntity, tGlossary).name).toBe(
      "Goliath Feature - Stone's Endurance",
    );
  });
});
