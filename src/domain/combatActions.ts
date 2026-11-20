import type { AmmoType } from "../data/ammunitionStats";
import type { AbilityId, FeatData, WeaponData, ActionTiming, WeaponProficiencyGrant } from "../data/types";
import type { CharacterWeapon } from "../state/characterState";
import { ammunitionTypeForWeapon } from "./ammunition";
import { isProficientWithWeapon } from "./classFeatures/weaponMastery";
import {
  FEAT_EMBEDDED_USE_TRACKER_KEYS,
  featCombatReferenceEffect,
  featWeaponDamageBonusForWeapon,
  findFeatDefinition,
  isRangedWeapon,
  type FeatCombatReferenceOption,
  type FeatContributions,
} from "./featEffects";
import { parseFeatDescriptionReference, parseFeatReferenceTable } from "./featDescription";
import { formatModifier } from "./modifiers";
import {
  bonusWeaponAmount,
  collectArmoryChargeTrackers,
  resolveEffectiveWeapon,
  weaponInstanceGrantsProficiency,
} from "./genericVariantResolve";
import type { OwnedMagicItemWeapon } from "./magicItemWeapons";
import {
  computeUnarmedStrike,
  computeWeaponAttack,
  isMagicWeaponAttack,
  weaponHasProperty,
} from "./weaponAttack";

export type { ActionTiming } from "../data/types";

export type CombatCardKind =
  | "standard-action"
  | "unarmed-strike"
  | "opportunity-attack"
  | "light-extra-attack"
  | "weapon"
  | "feat"
  | "species-trait"
  | "class-feature"
  | "spell"
  | "beast-attack";

export interface SpellCombatMeta {
  level: number;
  school: string;
  range: string;
  duration: string;
  components: string;
  concentration: boolean;
  saveAbility?: import("../data/types").AbilityId;
  saveDc?: number;
  spellAttackBonus?: number;
  /** Scaled cantrip damage dice and type (e.g. "2d10 Fire"). */
  spellDamage?: string;
}

export interface CombatCard {
  id: string;
  kind: CombatCardKind;
  messageKey?: string;
  entityKey?: string;
  traitSlug?: string;
  /** English fallback for weapon/feat/trait cards (not shown when locale resolves). */
  name: string;
  description: string;
  attackMeta?: { bonus: string; damage: string; ability?: AbilityId; offHandDamage?: string };
  /** Optional summary line for class features (heal dice, uses, etc.). */
  displayMeta?: string;
  /** Compact spell reference fields for combat cards. */
  spellMeta?: SpellCombatMeta;
  referenceIntro?: string;
  referenceOptions?: FeatCombatReferenceOption[];
  referenceTableTitle?: string;
  referenceTable?: FeatCombatReferenceOption[];
  /** When set, render a limited-use counter keyed by this feat on the card. */
  useTrackerFeatKey?: string;
  /** When set, render a limited-use counter keyed by this class feature on the card. */
  useTrackerClassFeatureKey?: string;
  /** When set, render a limited-use counter keyed by this species feature on the card. */
  useTrackerSpeciesFeatureKey?: string;
  /** Generic magic variant on a weapon instance (card title prefix/suffix). */
  variantKey?: string;
  /** Standalone magic weapon from Adventuring Gear (e.g. Javelin of Lightning). */
  magicItemKey?: string;
  /** Armory charge uses keyed by instance id (`armory:{id}`). */
  chargeUses?: { storageKey: string; max: number };
  /** Parent class feature name for flattened Combat description children. */
  combatParentName?: string;
}

export interface CombatActionLists {
  actions: CombatCard[];
  bonusActions: CombatCard[];
  reactions: CombatCard[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const STANDARD_ACTION_IDS = [
  "dash",
  "disengage",
  "dodge",
  "help",
  "hide",
  "influence",
  "magic",
  "ready",
  "search",
  "study",
  "utilize",
] as const;

const STANDARD_ACTIONS: CombatCard[] = STANDARD_ACTION_IDS.map((id) => ({
  id,
  kind: "standard-action" as const,
  messageKey: `combat.action.${id}`,
  name: id,
  description: "",
}));

const UNARMED_STRIKE: Omit<CombatCard, "attackMeta"> = {
  id: "unarmed-strike",
  kind: "unarmed-strike",
  messageKey: "combat.unarmedStrike",
  name: "Unarmed Strike",
  description: "",
};

const OPPORTUNITY_ATTACK: CombatCard = {
  id: "opportunity-attack",
  kind: "opportunity-attack",
  messageKey: "combat.opportunityAttack",
  name: "Opportunity Attack",
  description: "",
};

const LIGHT_EXTRA_ATTACK: CombatCard = {
  id: "light-extra-attack",
  kind: "light-extra-attack",
  messageKey: "combat.lightExtraAttack",
  name: "Light Weapon Extra Attack",
  description: "",
};

export function classifyActionEconomy(description: string): ActionTiming | null {
  if (/\bBonus Actions?\b/i.test(description)) return "bonus";
  if (/\bReactions?\b/i.test(description)) return "reaction";
  if (/\bMagic action\b/i.test(description)) return "action";
  if (/\bas an Action\b/i.test(description)) return "action";
  if (/\bAttack action\b/i.test(description)) return "action";
  return null;
}

function attackMetaFields(
  attackBonus: number,
  damage: string,
  ability: AbilityId,
  offHandDamage?: string,
): { bonus: string; damage: string; ability: AbilityId; offHandDamage?: string } {
  return { bonus: formatModifier(attackBonus), damage, ability, ...(offHandDamage ? { offHandDamage } : {}) };
}

function activeChargeUses(instance: CharacterWeapon): { storageKey: string; max: number } | undefined {
  const tracker = collectArmoryChargeTrackers({ weapons: [instance], armor: [] })[0];
  if (!tracker) return undefined;
  return { storageKey: tracker.storageKey, max: tracker.maxUses };
}

function buildWeaponAttackCard(input: {
  weaponData: WeaponData;
  cardId: string;
  displayName: string;
  abilityModifiers: Record<AbilityId, number>;
  rangedAttackBonus: number;
  lightExtraAttackAddsAbilityMod: boolean;
  weaponMasteryPicks: Set<string>;
  weaponProficiencyGrants: WeaponProficiencyGrant[];
  martialArtsDie?: string | null;
  weaponDamageBonuses?: Partial<Record<string, number>>;
  featWeaponDamageRules?: FeatContributions["weaponDamageBonusRules"];
  ammoBonusesByType?: Partial<Record<AmmoType, number>>;
  variantBonus?: number;
  proficientOverride?: boolean;
  variantKey?: string;
  magicItemKey?: string;
  chargeUses?: { storageKey: string; max: number };
  battleSmithMagicWeaponAttacks?: boolean;
}): CombatCard {
  const ammoType = ammunitionTypeForWeapon(input.weaponData);
  const ammoBonus = ammoType ? (input.ammoBonusesByType?.[ammoType] ?? 0) : 0;
  const variantBonus = input.variantBonus ?? 0;
  const totalBonus = variantBonus + ammoBonus;
  const extraAttackBonus =
    (input.rangedAttackBonus > 0 && isRangedWeapon(input.weaponData.key, input.weaponData.properties)
      ? input.rangedAttackBonus
      : 0) + totalBonus;
  const extraDamageBonus =
    (input.weaponDamageBonuses?.[input.weaponData.key] ?? 0) +
    featWeaponDamageBonusForWeapon(input.weaponData, input.featWeaponDamageRules ?? []) +
    totalBonus;
  const proficient =
    input.proficientOverride ??
    (isProficientWithWeapon(input.weaponData, input.weaponProficiencyGrants) || false);
  const useIntelligence =
    input.battleSmithMagicWeaponAttacks &&
    isMagicWeaponAttack({ variantKey: input.variantKey, magicItemKey: input.magicItemKey });
  const attack = computeWeaponAttack(
    input.weaponData,
    input.abilityModifiers,
    undefined,
    extraAttackBonus,
    proficient,
    input.martialArtsDie,
    extraDamageBonus,
    useIntelligence ? "int" : undefined,
  );
  const hasMastery = input.weaponMasteryPicks.has(input.weaponData.key) && input.weaponData.mastery;
  const propertyText =
    input.weaponData.properties.length > 0 ? input.weaponData.properties.join(", ") : "";
  const description = hasMastery
    ? propertyText
      ? `${propertyText} · Mastery: ${input.weaponData.mastery}`
      : `Mastery: ${input.weaponData.mastery}`
    : propertyText;
  const isLight = weaponHasProperty(input.weaponData, "Light");
  const offHandDamage =
    isLight && !input.lightExtraAttackAddsAbilityMod ? attack.offHandDamage : undefined;

  return {
    id: input.cardId,
    kind: "weapon",
    entityKey: input.weaponData.key,
    variantKey: input.variantKey,
    magicItemKey: input.magicItemKey,
    name: input.displayName,
    description,
    attackMeta: attackMetaFields(attack.attackBonus, attack.damage, attack.ability, offHandDamage),
    ...(input.chargeUses ? { chargeUses: input.chargeUses } : {}),
  };
}

function ownedWeapons(weapons: CharacterWeapon[]): { instance: CharacterWeapon; data: WeaponData }[] {
  return weapons
    .map((instance) => {
      const data = resolveEffectiveWeapon(instance);
      return data ? { instance, data } : null;
    })
    .filter((weapon): weapon is { instance: CharacterWeapon; data: WeaponData } => weapon !== null);
}

function enrichFeatActionCard(card: CombatCard, feat: FeatData, timing: ActionTiming): CombatCard {
  if (!FEAT_EMBEDDED_USE_TRACKER_KEYS.has(feat.key)) return card;
  const enriched: CombatCard = { ...card, useTrackerFeatKey: feat.key };
  if (feat.key === "mythal-touched" && timing === "reaction") {
    const reference = parseFeatDescriptionReference(feat.desc);
    const referenceTable = reference?.trailing ? parseFeatReferenceTable(reference.trailing) : null;
    if (referenceTable) {
      enriched.referenceTableTitle = referenceTable.title;
      enriched.referenceTable = referenceTable.options;
    }
  }
  return enriched;
}

function featActionCards(feats: FeatData[]): Record<ActionTiming, CombatCard[]> {
  const cards: Record<ActionTiming, CombatCard[]> = { action: [], bonus: [], reaction: [] };

  for (const feat of feats) {
    const definition = findFeatDefinition(feat.key);
    const referenceEffect = featCombatReferenceEffect(definition);
    const timedReferenceOptions = referenceEffect?.options.filter((option) => option.actionTiming) ?? [];

    if (timedReferenceOptions.length > 0) {
      const byTiming = new Map<ActionTiming, typeof timedReferenceOptions>();
      for (const option of timedReferenceOptions) {
        const timing = option.actionTiming;
        if (!timing) continue;
        const group = byTiming.get(timing) ?? [];
        group.push(option);
        byTiming.set(timing, group);
      }
      for (const [timing, group] of byTiming) {
        if (group.length === 1) {
          const option = group[0]!;
          cards[timing].push(
            enrichFeatActionCard(
              {
                id: `feat-${feat.key}-${option.key}`,
                kind: "feat",
                entityKey: feat.key,
                name: option.name,
                description: option.desc,
              },
              feat,
              timing,
            ),
          );
        } else {
          cards[timing].push(
            enrichFeatActionCard(
              {
                id: `feat-${feat.key}-${timing}`,
                kind: "feat",
                entityKey: feat.key,
                name: feat.name,
                description: "",
                referenceIntro: "",
                referenceOptions: group,
              },
              feat,
              timing,
            ),
          );
        }
      }
      continue;
    }

    if (definition?.combatSurface && !definition.actionTiming && !definition.actionTimings?.length) continue;

    const timings =
      definition?.actionTimings ??
      (definition?.combatSurface && definition.actionTiming
        ? [definition.actionTiming]
        : classifyActionEconomy(feat.desc)
          ? [classifyActionEconomy(feat.desc)!]
          : []);

    for (const timing of timings) {
      if (!timing) continue;
      cards[timing].push({
        id: definition?.actionTimings ? `feat-${feat.key}-${timing}` : `feat-${feat.key}`,
        kind: "feat",
        entityKey: feat.key,
        name: feat.name,
        description: feat.desc,
      });
    }
  }

  return cards;
}

export function buildCombatActions(input: {
  speciesKey: string | null;
  weapons: CharacterWeapon[];
  abilityModifiers: Record<AbilityId, number>;
  feats: FeatData[];
  rangedAttackBonus?: number;
  lightExtraAttackAddsAbilityMod?: boolean;
  weaponMasteryPicks?: string[];
  weaponProficiencyGrants?: WeaponProficiencyGrant[];
  martialArtsDie?: string | null;
  classFeatureActions?: Record<ActionTiming, CombatCard[]>;
  speciesFeatureActions?: Record<ActionTiming, CombatCard[]>;
  spellActions?: Record<ActionTiming, CombatCard[]>;
  /** When set, replaces weapon and unarmed strike cards (Wild Shape). */
  beastAttackCards?: CombatCard[];
  unarmedDamageDie?: string | null;
  weaponDamageBonuses?: Partial<Record<string, number>>;
  featWeaponDamageRules?: FeatContributions["weaponDamageBonusRules"];
  /** Magic ammunition bonusWeapon per ammo type (from preferred combat ammo source). */
  ammoBonusesByType?: Partial<Record<AmmoType, number>>;
  /** Common/uncommon non-attunement magic weapons from Adventuring Gear. */
  magicItemWeapons?: OwnedMagicItemWeapon[];
  /** Battle Smith Battle Ready: INT on magic weapon attack and damage rolls. */
  battleSmithMagicWeaponAttacks?: boolean;
}): CombatActionLists {
  const resolvedWeapons = ownedWeapons(input.weapons);
  const unarmed = computeUnarmedStrike(
    input.abilityModifiers,
    undefined,
    input.martialArtsDie,
    input.unarmedDamageDie,
  );
  const featFeatures = featActionCards(input.feats);
  const classFeatures = input.classFeatureActions ?? { action: [], bonus: [], reaction: [] };
  const speciesFeatures = input.speciesFeatureActions ?? { action: [], bonus: [], reaction: [] };
  const spellFeatures = input.spellActions ?? { action: [], bonus: [], reaction: [] };
  const rangedAttackBonus = input.rangedAttackBonus ?? 0;
  const lightExtraAttackAddsAbilityMod = input.lightExtraAttackAddsAbilityMod ?? false;
  const masterySet = new Set(input.weaponMasteryPicks ?? []);
  const weaponProficiencyGrants = input.weaponProficiencyGrants ?? [];

  const sharedWeaponCardInput = {
    abilityModifiers: input.abilityModifiers,
    rangedAttackBonus,
    lightExtraAttackAddsAbilityMod,
    weaponMasteryPicks: masterySet,
    weaponProficiencyGrants,
    martialArtsDie: input.martialArtsDie,
    weaponDamageBonuses: input.weaponDamageBonuses,
    featWeaponDamageRules: input.featWeaponDamageRules,
    ammoBonusesByType: input.ammoBonusesByType,
    battleSmithMagicWeaponAttacks: input.battleSmithMagicWeaponAttacks,
  };

  const weaponCards = input.beastAttackCards
    ? input.beastAttackCards
    : [
        ...resolvedWeapons.map((weapon) =>
          buildWeaponAttackCard({
            ...sharedWeaponCardInput,
            weaponData: weapon.data,
            cardId: `weapon-${weapon.instance.id}`,
            displayName: weapon.data.name,
            variantBonus: bonusWeaponAmount(weapon.instance),
            proficientOverride:
              isProficientWithWeapon(weapon.data, weaponProficiencyGrants) ||
              weaponInstanceGrantsProficiency(weapon.instance),
            variantKey: weapon.instance.variantKey,
            chargeUses: activeChargeUses(weapon.instance),
          }),
        ),
        ...(input.magicItemWeapons ?? []).map((owned) =>
          buildWeaponAttackCard({
            ...sharedWeaponCardInput,
            weaponData: owned.baseWeapon,
            cardId: `magic-item-weapon-${owned.magicItemKey}`,
            displayName: owned.name,
            magicItemKey: owned.magicItemKey,
          }),
        ),
      ];

  const attackCards = input.beastAttackCards
    ? weaponCards
    : [
        ...weaponCards,
        { ...UNARMED_STRIKE, attackMeta: attackMetaFields(unarmed.attackBonus, unarmed.damage, unarmed.ability) },
      ];

  const hasLightWeapon =
    !input.beastAttackCards &&
    (resolvedWeapons.some((weapon) => weaponHasProperty(weapon.data, "Light")) ||
      (input.magicItemWeapons ?? []).some((owned) => weaponHasProperty(owned.baseWeapon, "Light")));
  const lightExtraAttackCard: CombatCard = lightExtraAttackAddsAbilityMod
    ? {
        id: "light-extra-attack",
        kind: "light-extra-attack",
        messageKey: "combat.lightExtraAttackWithAbilityMod",
        name: "Light Weapon Extra Attack",
        description: "",
      }
    : LIGHT_EXTRA_ATTACK;

  const prependTimedFeatures = (cards: CombatCard[], timedFeatures: CombatCard[]) => [
    ...timedFeatures.slice().reverse(),
    ...cards,
  ];

  const prependSpells = (cards: CombatCard[], spellCards: CombatCard[]) => [...spellCards, ...cards];

  return {
    actions: prependTimedFeatures(
      prependTimedFeatures(
        prependSpells(
          [
            ...attackCards,
            ...STANDARD_ACTIONS,
            ...featFeatures.action,
          ],
          spellFeatures.action,
        ),
        speciesFeatures.action,
      ),
      classFeatures.action,
    ),
    bonusActions: prependTimedFeatures(
      prependTimedFeatures(
        prependSpells(
          [...(hasLightWeapon ? [lightExtraAttackCard] : []), ...featFeatures.bonus],
          spellFeatures.bonus,
        ),
        speciesFeatures.bonus,
      ),
      classFeatures.bonus,
    ),
    reactions: prependTimedFeatures(
      prependTimedFeatures(
        prependSpells([OPPORTUNITY_ATTACK, ...featFeatures.reaction], spellFeatures.reaction),
        speciesFeatures.reaction,
      ),
      classFeatures.reaction,
    ),
  };
}

export { slugify as traitSlugify };
