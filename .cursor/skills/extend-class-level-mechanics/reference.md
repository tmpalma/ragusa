# Class level mechanics — file reference

## Core files

| Concern | Path |
|---------|------|
| Per-class level cap | `src/domain/characterLevel.ts` |
| Runtime classes / subclasses | Supabase → `src/catalog/catalogStore.ts` |
| Catalog authoring | **dnd55-data** — `.cursor/skills/catalog-data/SKILL.md` |
| Reference shapes (types) | `src/data/types.ts` (`ClassData`, `SubclassData`) |
| Subclass domain helpers | `src/domain/subclasses.ts` |
| Class feature contributions / trackers | `src/domain/classFeatures/contributions.ts` |
| Class feature skill grants | `src/domain/classFeatures/skillGrants.ts` |
| Combat feature cards | `src/domain/classFeatures/cards.ts` |
| Character storage + reducer | `src/state/characterState.ts` |
| Derived stats (merged features) | `src/domain/deriveCharacter.ts` |
| Effect type definitions | `src/data/types.ts` (`ClassFeatureEffect`, `SubclassData`) |
| Catalog lookup | PostgREST — see catalog-data skill |

## UI

| Concern | Path |
|---------|------|
| Level blocks, subclass combobox | `src/components/form/ClassSection.tsx` |
| Subclass skill / feature option pickers | `src/components/form/SubclassChoicesInput.tsx` |
| Class feature skill pickers (e.g. Primal Knowledge) | `src/components/form/ClassFeatureSkillInput.tsx` |
| Expertise (class L2+) | `src/components/form/ExpertiseInput.tsx` |
| Character sheet feature list | `src/components/sheet/SheetPane.tsx` |
| Combat limited uses + action cards | `src/components/combat/CombatView.tsx` |
| Class feature description cards | `buildClassFeatureCards()` in `src/domain/classFeatures/cards.ts` |
| Spells tab (granted + prepared) | `src/components/spells/SpellsView.tsx` |

## Spells integration

| Concern | Path |
|---------|------|
| Always-prepared subclass spells | `src/domain/subclasses.ts` → `alwaysPreparedSpellKeysFromSubclass(subclass, level, subclassFeatureChoices)` |
| Subclass spellbook picks | `subclassSpellbookPickGrants`, `subclassSpellbookPickCount`, `subclassSpellbookPickOptions` |
| Wizard spellbook list keys | `spellbookListKeys()` in `spellSelection.ts` |
| Granted + picked spell merge | `src/domain/spellSelection.ts` → `buildAllGrantedSpells` |
| Pick limits by level | `src/domain/spellSelection.ts` → `spellPickLimitsForClass` |
| Slot row helper | `src/domain/spellProgression.ts` (`spellSlotRow`, `spellSlotCount`, `spellSlotsByLevel`) |
| Spell slot remaining | `character.spellSlotRemaining` keyed by spell level; missing = at max |
| Prepared pick helpers | `filterSpellKeysByLevel`, `uniqueSpellLevels`, `spellPickerLabel` in `spellSelection.ts` |
| Class spell lists | Supabase `class_spell_lists` — **dnd55-data** |

## Rest / combat counters

| Concern | Path |
|---------|------|
| Class feature use trackers | `buildClassFeatureUseTrackers()` in `contributions.ts` |
| Hit point pool max | `resolveHitPointPoolMax()` in `contributions.ts` |
| Third-caster spell overlay | `effectiveSpellcasting()` in `spellcasting.ts` |
| Moon Wild Shape CR / AC | `wildShapeEligibleBeasts(level, subclassKey)`, `wildShapeEffectiveAc()` in `wildShape.ts` |
| Spent uses state | `character.classFeatureUses`, `SET_CLASS_FEATURE_USES` |
| Pool remaining state | `character.classFeaturePoolRemaining`, `SET_CLASS_FEATURE_POOL_REMAINING` |
| Short/long rest recovery | `src/domain/rest.ts` |
| Resource counter UI | `src/components/combat/ResourceCounter.tsx` |

### Combat Class Features display rule

`buildClassFeatureCards()` skips features with `actionTiming` unless `classFeatureCard: true`; always skips `weapon-mastery`. Timed features with `limitedUses` keep their tracker in Class Features (or Spells when `trackerSurface: "spells"`) and their action card via `buildClassFeatureActionCards()`. Features that spend another tracker (Sacred Weapon) get action cards only.

## Locales

| Concern | Path |
|---------|------|
| Class + subclass names/descriptions | `catalog_strings` — edit in **dnd55-data** |
| Form labels (subclass, skill picks) | `src/locales/en/character.md`, `pt-BR/character.md` |
| App subtitle (which classes reach L3) | `src/locales/en/app.md`, `pt-BR/app.md` |
| Combat copy | `src/locales/en/combat.md` |

Both locales for class/subclass catalog copy live in **dnd55-data** `catalog_strings` seeds.

## Data flow (subclass with choices + spells)

```
Supabase classes + subclasses (+ catalog_strings)
        ↓
installCatalog → CLASSES / SUBCLASSES
        ↓
LEVEL_UP to 3 (subclassKey stays null)
        ↓
SET_SUBCLASS → subclassStateForSelection → SubclassChoicesInput
        ↓
SET_SUBCLASS_SKILL_PICK / SET_SUBCLASS_FEATURE_CHOICE / SET_CLASS_FEATURE_SKILL_PICK
        ↓
mergeSkillProficiencies → character.skills
        ↓
alwaysPreparedSpellKeysFromSubclass → buildAllGrantedSpells → SpellsView / CombatView
        ↓
activeClassFeatures(class, level, subclass) → derived.activeClassFeatures, combat cards
```

## Reducer actions (level / subclass)

| Action | Notes |
|--------|-------|
| `LEVEL_UP` | Blocked at `maxCharacterLevelFor(classKey)` |
| `REVERT_LAST_LEVEL` | Step down 1; clears subclass + classFeatureSkillPicks below L3 |
| `SET_CLASS` | Level 1 reset; clears subclass state |
| `SET_SUBCLASS` | Validates classKey match; reinitializes subclass picks |
| `SET_SUBCLASS_SKILL_PICK` | Index into `subclassSkillProficiencies` slot count |
| `SET_SUBCLASS_FEATURE_CHOICE` | Keyed by effect `choiceKey` |
| `SET_SUBCLASS_SPELLBOOK_PICK` | Evoker Savant extra spellbook slots |
| `SET_CLASS_FEATURE_SKILL_PICK` | Keyed by class feature `featureKey` |
| `SET_CLASS_FEATURE_USES` | Combat tracker spend/restore |
| `SET_CLASS_FEATURE_POOL_REMAINING` | Arcane Ward remaining HP (0..max; missing = 0) |
| `SET_SUBCLASS_FEATURE_OPTION_PICK` | Multi-slot subclass option picks (maneuvers) |

## Sentinel conventions

Same as feat/class feature patterns elsewhere:

- `classFeatureUses[key]` missing → at max uses
- `subclassKey === null` → no subclass features merged
- Revert below level 3 → subclass fields empty (`subclassSpellbookPicks` included); do not retain stale picks

## SRD subclasses in this slice

| Class | Subclass key | Notable L3 effects |
|-------|--------------|-------------------|
| Barbarian | `path-of-the-berserker` | Frenzy (narrative combat) |
| Bard | `college-of-lore` | +3 skills, Cutting Words |
| Cleric | `life-domain` | Always-prepared domain spells, Preserve Life (spends CD) |
| Druid | `circle-of-the-land` | Land-type picker + always-prepared spells, Land's Aid (spends Wild Shape) |
| Fighter | `champion` | Improved Critical, Remarkable Athlete (combat reminders) |
| Monk | `warrior-of-the-open-hand` | Open Hand Technique |
| Paladin | `oath-of-devotion` | Always-prepared spells, Sacred Weapon |
| Ranger | `hunter` | Hunter's Prey choice |
| Rogue | `thief` | Fast Hands, Second-Story Work |
| Sorcerer | `draconic-sorcery` | Draconic Resilience (CHA unarmored defense + HP/level), Draconic Spells |
| Warlock | `fiend-patron` | Dark One's Blessing, Fiend Spells |
| Wizard | `evoker` | Potent Cantrip, Evocation Savant (`grant_spellbook_picks`) |

## Extra XPHB subclasses (non-SRD, `extraSubclasses.ts`)

Each SRD class also has three 2024 PHB extras in `EXTRA_SUBCLASSES` (27 total). Notable mechanics:

| Pattern | Examples |
|---------|----------|
| `grant_spellcasting` (wizard list, L3) | Eldritch Knight, Arcane Trickster (+ Mage Hand always prepared) |
| `choose_feature_option` count 3 | Battle Master maneuvers |
| `hit_point_pool` | Arcane Ward (Abjurer) |
| `uiSurface: "reference"` | Wild Magic Surge d100 table; Elemental Smite; Vitality of the Tree; Primal Knowledge rage benefit |
| Moon CR scaling | `circle-of-the-moon` — domain in `wildShape.ts`, not catalog-only |

Known gaps: Portent roll values not stored; L5+ domain spell progression; no Wild Magic roller; no auto damage routing through Arcane Ward.

## When to extend types vs. special-case

| Situation | Preferred approach |
|-----------|-------------------|
| Uses scale with level (Rage 2→3) | `LimitedUsesFormula` `{ kind: "byLevel", usesByLevel }` |
| Sneak Attack dice by level | `sneak_attack` with `diceByLevel` |
| Subclass spellbook extras | `grant_spellbook_picks` + `subclassSpellbookPicks` |
| Always-prepared from land pick | `choose_feature_option` option `spellNames` |
| One skill from class list at L3 | `grant_skill_proficiencies` on **class** feature + `ClassFeatureSkillInput` |
| Subclass skill bundle | `grant_skill_proficiencies` on **subclass** feature + `SubclassChoicesInput` |
| Fixed subclass skills (no picker) | `grant_skill_proficiencies.fixedSkills` + `subclassFixedSkills()` |
| Independent artisan tool choose | `grant_tool_proficiencies.choose` (empty `fixedTools` ok) |
| Third-caster overlay (EK/AT) | `grant_spellcasting` on subclass Spellcasting feature |
| Computed HP pool tracker | `hit_point_pool` + `classFeaturePoolRemaining` (not `classFeatureUses`) |
| Pick between feature options | `choose_feature_option` |
| Option-gated combat attacks / bonus actions | `FeatureOptionData.combatCards` (Armorer Armor Model) |
| Spells always prepared | `always_prepared_spells` |
| Display-only / combat card | `narrative` + `combatSurface` |

Do not add `if (classKey === "…")` in React components for grants — encode in catalog effects and read via domain helpers.
