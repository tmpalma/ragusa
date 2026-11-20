import type { CombatCard } from "../domain/combatActions";
import { localizedVariantDisplayName } from "../domain/genericVariantDisplay";
import { findGenericVariant } from "../domain/genericVariantMatcher";
import { formatSpeciesFeatureCombatTitle } from "../domain/speciesFeatures";
import { formatModifier } from "../domain/modifiers";
import type { AbilityId } from "../data/types";
import type { TranslateFn } from "./LocaleContext";

type GlossaryTranslate = (category: string, sourceText: string) => string;

const KNOWN_DAMAGE_TYPES = [
  "Bludgeoning",
  "Piercing",
  "Slashing",
  "Acid",
  "Cold",
  "Fire",
  "Force",
  "Lightning",
  "Necrotic",
  "Poison",
  "Psychic",
  "Radiant",
  "Thunder",
].sort((a, b) => b.length - a.length);

/** Localize trailing damage type in weapon/beast attack meta (e.g. `1d8+3 Slashing`). */
export function localizeWeaponDamageLine(
  damage: string,
  tGlossary: GlossaryTranslate,
): string {
  for (const type of KNOWN_DAMAGE_TYPES) {
    const suffix = ` ${type}`;
    if (damage.endsWith(suffix)) {
      return `${damage.slice(0, -suffix.length)} ${tGlossary("damageType", type)}`;
    }
  }
  return damage;
}

function attackMetaLine(
  attackMeta: NonNullable<CombatCard["attackMeta"]>,
  t: TranslateFn,
  tGlossary: GlossaryTranslate,
): string {
  const damage = localizeWeaponDamageLine(attackMeta.damage, tGlossary);
  if (attackMeta.ability) {
    return t("combat.attackMetaWithAbility", {
      bonus: attackMeta.bonus,
      damage,
      ability: t(`rules.ability.${attackMeta.ability}` as `rules.ability.${AbilityId}`),
    });
  }
  return t("combat.attackMeta", { bonus: attackMeta.bonus, damage });
}

type EntityTranslate = (catalogPrefix: string, entityKey: string, field: string, fallback?: string) => string;

export function localizeCombatCard(
  card: CombatCard,
  t: TranslateFn,
  tEntity: EntityTranslate,
  tGlossary: GlossaryTranslate,
  formatProse: (text: string) => string = (text) => text,
): {
  name: string;
  description: string;
  meta?: string;
  offHandMeta?: string;
  spellLevelSchool?: string;
  spellLines?: string[];
  spellAttackLine?: string;
  spellDamageLine?: string;
} {
  const meta =
    card.displayMeta ??
    (card.attackMeta ? attackMetaLine(card.attackMeta, t, tGlossary) : undefined);
  const offHandMeta = card.attackMeta?.offHandDamage
    ? t("combat.offHandDamageMeta", {
        damage: localizeWeaponDamageLine(card.attackMeta.offHandDamage, tGlossary),
      })
    : undefined;

  switch (card.kind) {
    case "standard-action":
    case "unarmed-strike":
    case "opportunity-attack":
    case "light-extra-attack":
      return {
        name: t(`${card.messageKey}.name`, undefined, card.name),
        description: formatProse(t(`${card.messageKey}.description`, undefined, card.description)),
        meta,
        offHandMeta,
      };
    case "weapon": {
      const masteryMatch = card.description.match(/ · Mastery: (.+)$|^Mastery: (.+)$/);
      const masteryName = masteryMatch?.[1] ?? masteryMatch?.[2];
      const baseDescription = card.description.replace(/ · Mastery: .+$|^Mastery: .+$/, "");
      const properties = baseDescription
        ? baseDescription.split(", ").map((prop: string) => tGlossary("weaponProperty", prop))
        : [];
      const masteryLine = masteryName
        ? t("combat.weaponMasteryLine", { mastery: tGlossary("weaponProperty", masteryName) })
        : null;
      const descriptionParts = [...properties];
      if (masteryLine) descriptionParts.push(masteryLine);
      const baseName = card.magicItemKey
        ? tEntity("catalog.magicItems", card.magicItemKey, "name", card.name)
        : tEntity("catalog.weapons", card.entityKey ?? "", "name", card.name);
      const rawDescription =
        descriptionParts.length > 0
          ? descriptionParts.join(", ")
          : t("combat.noSpecialProperties", undefined, "No special properties.");
      return {
        name: card.magicItemKey
          ? baseName
          : localizedVariantDisplayName(baseName, findGenericVariant(card.variantKey), tEntity),
        description: formatProse(rawDescription),
        meta,
        offHandMeta,
      };
    }
    case "feat": {
      if (card.referenceOptions?.length) {
        return {
          name: tEntity("catalog.feats", card.entityKey ?? "", "name", card.name),
          description: "",
          meta,
          offHandMeta,
        };
      }
      if (card.entityKey) {
        const featName = tEntity("catalog.feats", card.entityKey, "name", card.entityKey);
        if (card.name !== featName) {
          return {
            name: t(
              "combat.featAbilityCardTitle",
              { featName, abilityName: card.name },
              `${featName} - ${card.name}`,
            ),
            description: formatProse(card.description),
            meta,
            offHandMeta,
          };
        }
      }
      return {
        name: card.name,
        description: formatProse(card.description),
        meta,
        offHandMeta,
      };
    }
    case "species-trait":
      if (card.entityKey && card.traitSlug) {
        return {
          name: formatSpeciesFeatureCombatTitle(
            card.entityKey,
            card.traitSlug,
            card.name,
            t,
            tEntity,
          ),
          description: formatProse(
            t(
              `catalog.species.${card.entityKey}.trait.${card.traitSlug}.desc`,
              undefined,
              card.description,
            ),
          ),
          meta,
          offHandMeta,
        };
      }
      return { name: card.name, description: formatProse(card.description), meta, offHandMeta };
    case "class-feature":
      if (card.entityKey && card.traitSlug) {
        const className = tEntity("catalog.classes", card.entityKey, "name", card.entityKey);
        const featureName = tEntity(
          "catalog.classes",
          `${card.entityKey}.feature.${card.traitSlug}`,
          "name",
          card.name,
        );
        const classFeatureLabel = t("combat.classFeatureLabel", undefined, "Class Feature");
        const cardTitle = card.combatParentName
          ? t(
              "combat.nestedClassFeatureTitle",
              { classFeatureName: card.combatParentName, abilityName: featureName },
              `${card.combatParentName} - ${featureName}`,
            )
          : t(
              "combat.classFeatureCardTitle",
              { className, classFeatureLabel, featureName },
              `${className} ${classFeatureLabel} - ${featureName}`,
            );
        return {
          name: cardTitle,
          description: formatProse(
            tEntity("catalog.classes", `${card.entityKey}.feature.${card.traitSlug}`, "desc", card.description),
          ),
          meta,
          offHandMeta,
        };
      }
      return { name: card.name, description: formatProse(card.description), meta, offHandMeta };
    case "spell": {
      const spellMeta = card.spellMeta;
      if (!spellMeta) {
        return {
          name: tEntity("catalog.spells", card.entityKey ?? "", "name", card.name),
          description: "",
        };
      }

      const levelLabel =
        spellMeta.level === 0
          ? t("spells.cantrip")
          : t("spells.spellLevel", { level: spellMeta.level });
      const concentrationMark = spellMeta.concentration ? t("spells.concentrationMark") : "";
      const spellLevelSchool = `${levelLabel}, ${tGlossary("spellSchool", spellMeta.school)}`;
      const spellLines = [
        t("combat.spellRange", { range: spellMeta.range }),
        t("combat.spellComponents", { components: spellMeta.components }),
        t("combat.spellDuration", { duration: spellMeta.duration, concentrationMark }),
      ].map((line) => formatProse(line));
      const saveLine = spellMeta.saveAbility
        ? t("combat.spellSave", {
            ability: t(`rules.ability.${spellMeta.saveAbility}`),
            dc: spellMeta.saveDc ?? "",
          })
        : undefined;
      const spellAttackLine =
        spellMeta.spellAttackBonus != null
          ? spellMeta.spellDamage
            ? t("combat.spellAttackWithDamage", {
                bonus: formatModifier(spellMeta.spellAttackBonus),
                damage: spellMeta.spellDamage,
              })
            : t("combat.spellAttack", { bonus: formatModifier(spellMeta.spellAttackBonus) })
          : undefined;
      const spellDamageLine =
        spellMeta.spellAttackBonus == null && spellMeta.spellDamage ? spellMeta.spellDamage : undefined;

      return {
        name: tEntity("catalog.spells", card.entityKey ?? "", "name", card.name),
        description: "",
        spellLevelSchool,
        spellLines,
        spellAttackLine,
        spellDamageLine,
        meta: saveLine,
      };
    }
    case "beast-attack": {
      const beastName = tEntity("catalog.beasts", card.entityKey ?? "", "name", "");
      return {
        name: beastName ? `${beastName}: ${card.name}` : card.name,
        description: formatProse(card.description),
        meta,
        offHandMeta,
      };
    }
    default:
      return { name: card.name, description: formatProse(card.description), meta, offHandMeta };
  }
}
