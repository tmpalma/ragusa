---
name: extend-capped-catalog-picks
description: Implements capped unique catalog pickers (combobox + Add + list + Remove) in rpg-dm-player-toolset. Use for Wild Shape known forms, prepared/known/spellbook spells, or similar choose-N-distinct-keys UI.
---

# Extend capped catalog picks (rpg-dm-player-toolset)

Read this skill when adding or migrating **capped unique catalog picks** — the player chooses up to N distinct keys from a catalog, with no duplicates.

For class level caps, subclass forks, and spell progression tables, use `.cursor/skills/extend-class-level-mechanics/SKILL.md`. For unlimited weapons/armor (including variants and quantity), use `ArmorySection` on the Equipment tab — see `.cursor/skills/extend-armory/SKILL.md`.

## When to use

| Use this skill | Use something else |
|----------------|-------------------|
| Wild Shape known forms (4 beasts) | Divine Order / Hunter's Prey (`choose_feature_option` combobox) |
| Prepared, known, or spellbook spell lists (future migration) | Armory weapons/armor (`ArmorySection` on Equipment) |
| Any "pick N distinct catalog keys" list | Unlimited weapons/armor (`ArmorySection` on Equipment) |
| Attuned wondrous magic items (3-slot cap; options = carried gear that requires attunement) | `MagicItemsSection` in `EquipmentCatalogPicks.tsx` |

## Pattern

| Layer | Location | Convention |
|-------|----------|------------|
| UI | `src/components/form/CappedPickList.tsx` | One combobox + Add; `itemList` rows with Remove; `maxCount` disables add |
| Wrapper | e.g. `WildShapeKnownFormsInput.tsx` | Filter already-picked from options; `renderSelected` for row labels |
| State | `character.*` as compact `string[]` | `ADD_*` / `REMOVE_*` actions |
| Reducer | `src/state/characterState.ts` | Reject duplicate, over-cap, ineligible; side effects on remove if needed |

### UI checklist

1. **`CappedPickList`** — pass `options` already excluding picked keys; `toolbarExtra` for filters (e.g. spell level) beside the combobox.
2. **Add** — clears pending selection after dispatch (matches armor flow).
3. **Remove** — dispatches remove; caller/reducer handles domain side effects (e.g. clear active Wild Shape form if removed).

### State checklist

1. Store **`string[]`**, not padded `(string | null)[]`.
2. **`ADD_*`** — no-op if: wrong class/level, duplicate, at `maxCount`, or key not in eligible set.
3. **`REMOVE_*`** — filter key out; clear dependent active state when the removed key is in use.
4. **Clear on reset** — return `[]` via domain helper (e.g. `initialWildShapeKnownForms()`).

## Reference implementation

- **Wild Shape known forms** — `WildShapeKnownFormsInput`, `ADD_WILD_SHAPE_KNOWN_FORM`, `REMOVE_WILD_SHAPE_KNOWN_FORM`, `src/domain/wildShape.ts`
- **Class spells (cantrips, prepared/known, spellbook)** — `SpellCappedPickList`, `SpellsView`, `ADD_*_PICK` / `REMOVE_*_PICK` in `characterState.ts`

## Tests

```bash
npm test -- src/domain/wildShape.test.ts src/domain/spellSelection.test.ts
npm run build
```

Cover: add, remove, duplicate reject, over-cap reject, ineligible reject, and remove-while-active side effects.
