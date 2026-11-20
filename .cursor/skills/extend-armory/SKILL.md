---
name: extend-armory
description: Implements or extends generic magic variants, Armory weapon/armor rows, shared attunement, magic ammunition packs, and Armory combat overlays in rpg-dm-player-toolset.
---

# Extend Armory (rpg-dm-player-toolset)

Read this skill when adding or changing **generic variants**, **Armory rows** (weapon/armor + variant), **shared attunement**, **magic ammunition**, or **Armory combat overlays**.

For capped wondrous picks (cloak, ring, etc.), use `.cursor/skills/extend-capped-catalog-picks/SKILL.md`. For collapsing Equipment sections, use `.cursor/skills/extend-collapsible-panes/SKILL.md`. For transcribing variants from 5etools, use `.cursor/skills/extract-srd-from-5etools/SKILL.md`. For catalog lookups and new variant rows or strings, read `.cursor/skills/catalog-data/SKILL.md` — **dnd55-data** only.

## When to use

| Use this skill | Use something else |
|----------------|-------------------|
| +1 weapon, Repeating Shot, Dazzling Weapon, magic armor variants | Wondrous magic items (`MAGIC_ITEMS`, `attunedMagicItemKeys`) |
| Magic ammo packs (+1 arrows, Ammunition of Slaying) | Mundane ammo counts (`ammunitionRemaining`) |
| Attunement toggle on an Armory row | Capped wondrous pick list |
| Combat bonus/charge overlays from variants | Class feature limited uses |

## Contracts (do not re-explore)

| Topic | Rule |
|-------|------|
| **Catalog split** | Supabase `generic_variants` vs `magic_items` (runtime `GENERIC_VARIANTS` / `MAGIC_ITEMS`). Never stub a variant as a wondrous item. New rows in **dnd55-data**. |
| **UI** | Dual pickers (variant left, base right, Add) live in `src/components/equipment/ArmorySection.tsx` on the **Equipment** tab — not Character form. |
| **State** | `variantKey` + `attuned` on `character.weapons` / `character.armor` instances. `ADD_WEAPON` / `ADD_ARMOR` auto-attune when `armoryVariantAutoAttunes(variantKey)` and a slot is free. |
| **Attunement** | Shared 3-slot pool: `countAttunedSlots` = `attunedMagicItemKeys.length` + attuned Armory flags (`src/domain/attunement.ts`). Wondrous attunement picks require the item in `adventuringGear` first; `attunedMagicItemKeys` is attunement only, not ownership. `listAttunedDisplayItems` merges Armory into Magic Items UI/PDF — **display only**. Do **not** write Armory instance ids into `attunedMagicItemKeys`. |
| **Weight** | Armory mass from `WEAPONS` / `ARMOR` base keys (`carryingCapacity.ts`). Wondrous from `MAGIC_ITEMS.weightLb`. Variants have no `weightLb`. |
| **Charges** | `featSpellUses["armory:" + instanceId]` (`armoryChargeStorageKey` in `genericVariantResolve.ts`). `ResourceCounter` on Combat attack/armor cards **and** Armory rows. Long Rest clears the whole `featSpellUses` map (`rest.ts`). |
| **Combat** | Overlays in `src/domain/genericVariantResolve.ts` (`activeEffectsForPiece`, `bonusWeaponAmount`, etc.). Variants with `requiresAttunement` grant **nothing** when unattuned. |
| **Locales** | Variant `name` / `desc` / prefixes are `catalog_strings` (`genericVariants`) — edit in **dnd55-data**, not locale markdown in this repo. |
| **Out of scope** | Artificer Replicate Magic Item auto-insert; Enspelled spell pickers; Flame Tongue / Vorpal / Defender automation. |

## Magic ammunition

Ammo-only 5etools templates (`+1/+2/+3 Ammunition`, `Ammunition of Slaying`, `Walloping Ammunition`) extract with `appliesTo: "ammunition"` — do not skip them.

| Layer | Location | Convention |
|-------|----------|------------|
| Catalog | `variantsForAmmunition()` | Five variants; matcher `appliesTo === "ammunition"` |
| State | `character.magicAmmunition[]` | `{ id, ammoType, variantKey, remaining }`; `ADD_MAGIC_AMMUNITION_PACK` adds one mundane pack size |
| Preference | `character.preferredAmmoSource` | Per `AmmoType`: magic stack id or unset (mundane); combat control in `CombatView.tsx` |
| Equipment | `EquipmentView.tsx` Ammunition section | Mundane + variant picker, ammo type, Add pack; list stacks with stepper + Remove |
| Combat | `ammunition.ts`, `genericVariantResolve.ts` | Spend from preferred magic stack when weapon fires (Repeating Shot still ignores ammo). `bonusWeapon` stacks with weapon instance bonus. One hit consumes one piece. Slaying/Walloping extra effects stay in `desc` only. |
| Weight/value | `ammoStackWeightLb` / `ammoStackValueCp` | Same per-piece formula as mundane packs |

## Pattern

| Layer | Location | Convention |
|-------|----------|------------|
| Matcher | `src/domain/genericVariantMatcher.ts` | `variantsForWeapon` / `variantsForArmor` / `variantsForAmmunition`; `findGenericVariant` |
| Display | `src/domain/genericVariantDisplay.ts` | `variantDisplayName`, rarity locale keys |
| Attunement merge | `src/domain/attunement.ts` | `listAttunedDisplayItems`, `maxWondrousAttunementPicks` for `MagicItemsSection` cap |
| UI | `ArmorySection.tsx`, `EquipmentCatalogPicks.tsx` | Section pane + nested `equipment.armoryDescriptions`; Magic Items uses merged list |
| State | `src/state/characterState.ts` | `ADD_WEAPON`, `SET_WEAPON_ATTUNED`, `ADD_ARMOR`, `SET_ARMOR_ATTUNED`, magic ammo actions |

### UI checklist

1. **Dual pickers** — variant combobox filters by selected base (or all variants when base empty); mundane = no `variantKey`.
2. **Attune checkbox** — only for variants with `requiresAttunement`; disabled when cap full and piece unattuned.
3. **Charge counter** — reuse `collectArmoryChargeTrackers` + `ResourceCounter` wired to `SET_FEAT_SPELL_USES`.
4. **Descriptions** — nested `CollapsiblePane` with `tEntity("catalog.genericVariants", key, "desc", …)`; skip pane when no variant pieces.

## Reference implementation

- Armory UI — `ArmorySection.tsx`
- Attuned list merge — `attunement.ts`, `MagicItemsSection` in `EquipmentCatalogPicks.tsx`
- Combat overlays — `genericVariantResolve.ts`, `CombatView.tsx`
- Magic ammo — `EquipmentView.tsx`, `ammunition.ts`, `characterState.ts` (`ADD_MAGIC_AMMUNITION_PACK`, `SET_PREFERRED_AMMO_SOURCE`)
- 5etools reference — `scripts/extract-srd-items.ts` (`inferAppliesTo`, `isAmmunitionOnlyRequires`) for **shape only** when drafting **dnd55-data** seeds; do not run extract to commit catalog here

## Tests

```bash
npm test -- src/domain/attunement.test.ts src/domain/genericVariantResolve.test.ts src/domain/genericVariantMatcher.test.ts src/domain/ammunition.test.ts src/domain/carryingCapacity.test.ts
npm run build
```

Cover: slot counting (wondrous + Armory), list merge without double weight, unattuned effect gating, charge storage keys, magic ammo spend + `bonusWeapon` stack, character-file round-trip.
