---
name: extend-class-feature-choices
description: Implements D&D 5.5e base-class feature option pickers (Divine Order, Primal Order) with optional weapon/armor grants, extra cantrips, and skill bonuses in rpg-dm-player-toolset. Use when adding L1 class feature forks, choose_feature_option on class features, or extending FeatureOptionData effects.
---

# Extend class feature choices (rpg-dm-player-toolset)

Read this skill when adding **base-class** `choose_feature_option` pickers (not subclass — those use `SubclassChoicesInput` and `subclassFeatureChoices`).

For level caps, subclasses, limited-use combat cards, and spell progression, use `.cursor/skills/extend-class-level-mechanics/SKILL.md` first.

For catalog **lookups** and class-feature **row or string** changes, read `.cursor/skills/catalog-data/SKILL.md` first.

## Pattern overview

| Concern | Subclass choices | Base-class choices |
|---------|------------------|-------------------|
| Catalog source | **dnd55-data** (`subclasses`, `classes` data) | **dnd55-data** (class feature entries in class `data`) |
| State | `subclassFeatureChoices` | `classFeatureChoices` |
| Reducer | `SET_SUBCLASS_FEATURE_CHOICE` | `SET_CLASS_FEATURE_CHOICE` |
| UI | `SubclassChoicesInput` | `ClassFeatureChoicesInputAtLevel` |
| Domain | `subclasses.ts` | `classFeatures/featureChoices.ts` |

Both reuse the same `choose_feature_option` effect type and `FeatureOptionData` option shape in `src/data/types.ts`.

## Option effects (`FeatureOptionData`)

| Field | Example | Applied in |
|-------|---------|------------|
| `weaponProficiencies` | Protector / Warden → `{ kind: "martial" }` | `effectiveWeaponProficiencyGrants()` → Combat weapon attack to-hit (proficiency only when proficient) |
| `armorCategories` | Protector → `["heavy"]`, Warden → `["medium"]` | `armorCategoriesFromClassFeatureChoices()` (sheet/equipment later) |
| `extraCantripCount` | Thaumaturge / Magician → `1` | `extraCantripSlotsFromClassFeatureChoices()` → `spellPickLimitsForClass()` |
| `skillCheckBonus` | Thaumaturge → pick Arcana or Religion, +Wis (min +1); Magician → pick Arcana or Nature, +Wis (min +1) | `skillCheckBonus.choiceKey` + `skillBonusesFromClassFeatureChoices()` |
| `spellNames` | Circle of the Land land types | subclass only today via `alwaysPreparedSpellKeysFromSubclass()` |
| `actionTiming` | Pact of the Blade | Combat bonus/action/reaction card |
| `combatCards` | Armorer Armor Model | Selected-option Attacks (`attack`) and Bonus Actions (`actionTiming`); optional `limitedUses` |

Narrative-only higher-level benefits (L7/L15) stay in option `desc`; encode only L1 mechanical hooks above.

## Checklist: add a base-class feature choice

1. **Catalog (dnd55-data)** — On the class feature in the class row’s `data.features[]`:
   - Replace `{ type: "narrative" }` with `choose_feature_option` + `choiceKey` + `options[]`.
   - Set `grantedAtLevel` to when the pick is required (usually 1).
   - Update related `catalog_strings` if names/descriptions change. Plan must state this explicitly.
2. **UI** — `ClassFeatureChoicesInputAtLevel` in `ClassSection` at the matching level block (L1 uses the main level-1 subsection).
3. **State** — `SET_CLASS_FEATURE_CHOICE` validates against `classFeatureChoiceOptions()`; call `withClampedSpellPicks()` when `extraCantripCount` may change.
4. **Clear on class change** — `SET_CLASS` resets `classFeatureChoices`.
5. **Tests** — `featureChoices.test.ts` for domain; `characterState.test.ts` for reducer + cantrip slot resize.

## Reference implementations

- **Cleric Divine Order** — `divine-order` / Protector vs Thaumaturge
- **Druid Primal Order** — `primal-order` / Magician vs Warden (same wiring; UI appears when Druid is selected)

## Tests

```bash
npm test -- src/domain/classFeatures/featureChoices.test.ts src/state/characterState.test.ts
npm run build
```
