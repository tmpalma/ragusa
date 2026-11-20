# Feat mechanics — file reference

## Core files

| Concern | Path |
|---------|------|
| Effect types, definitions, contributions | `src/domain/featEffects.ts` |
| Combat action columns + weapon mutations | `src/domain/combatActions.ts` |
| Special Traits feat reminder cards | `buildFeatSpecialFeatureCards()` in `featEffects.ts`, `CombatView.tsx` |
| Multi-benefit combat reference layout | `combat_reference_options` effect, `CombatReferenceOptions.tsx` |
| Fighting Style class picker | `src/components/form/FightingStyleFeatInput.tsx`, `src/domain/classFeatures/fightingStyle.ts` |
| Prerequisites | `src/domain/featPrerequisites.ts` |
| Character storage + reducer | `src/state/characterState.ts` |
| Derived feat list | `src/domain/deriveCharacter.ts` |
| Runtime catalog | Supabase → `src/catalog/catalogStore.ts` (`FEATS`) |
| Catalog authoring | **dnd55-data** — see `.cursor/skills/catalog-data/SKILL.md` |
| Background feat suggestions | `backgrounds` table + `feat_key` in Supabase |

## UI

| Concern | Path |
|---------|------|
| Feat combobox (all feats) | `src/components/form/FeatInput.tsx` |
| Human extra origin feat | `src/components/form/HumanVersatileFeatInput.tsx` |
| Skill/tool + ASI choices | `src/components/form/FeatProficiencyChoices.tsx` |
| Spell choices wrapper | `src/components/form/FeatChoicesInput.tsx` |
| Spell ability/cantrip/L1 picks | `src/components/form/FeatSpellChoices.tsx` |
| Form layout | `src/components/form/FormPane.tsx` |

## Spells integration

| Concern | Path |
|---------|------|
| Granted + picked spell entries | `src/domain/spellSelection.ts` |
| Class spell lists | Supabase `class_spell_lists` — **dnd55-data** |
| Spells tab | `src/components/spells/SpellsView.tsx` |
| Spell attack/DC helper | `src/domain/spellcasting.ts`, `buildFeatSpellcastingEntries()` |
| Combat spell action cards | `src/domain/spellCombat.ts`, `CombatView.tsx` |

## Rest / combat counters

| Concern | Path |
|---------|------|
| Long/short rest | `src/domain/rest.ts` |
| HP-style counter component | `src/components/combat/ResourceCounter.tsx` |
| Class feature uses pattern | `buildClassFeatureUseTrackers`, `SET_CLASS_FEATURE_USES` |
| Feat spell uses | `featSpellUses`, `SET_FEAT_SPELL_USES`, `buildFeatSpellUseTrackers` |

## Locales

| Concern | Path |
|---------|------|
| Feat names/descriptions | `catalog_strings` (`entity_type` `feats`) — edit in **dnd55-data** |
| Form labels | `src/locales/en/character.md` |
| Spells tab | `src/locales/en/spells.md` |
| Combat counters | `src/locales/en/combat.md` |
| Special Traits group labels | `combat.specialTraitsSpecies`, `combat.specialTraitsFeats` |
| TWF bonus-action copy | `combat.lightExtraAttackWithAbilityMod` |
| Catalog lookup | `.cursor/skills/catalog-data/SKILL.md` (PostgREST / Supabase) |

## Data flow (spell-granting feat)

```
FEATS (from Supabase) + FEAT_DEFINITIONS
        ↓
SET_FEAT → initialFeatChoicesForFeat → FeatSpellChoices UI
        ↓
buildFeatGrantedSpells → buildAllGrantedSpells
        ↓                    ↓
   SpellsView            CombatView (spell cards + ResourceCounter)
        ↓
applyRest(long) clears featSpellUses
```

## Data flow (combat feat surfaces)

```
FEAT_DEFINITIONS (effects + optional combatSurface / actionTiming)
        ↓
collectFeatContributions → derived.featContributions (AC, ranged bonus, TWF flag, …)
        ↓
buildCombatActions (weapon cards, action columns)
buildFeatSpecialFeatureCards → CombatView Special Traits → Feats group
```

## Reducer action naming

| Primary feat | Extra feat (Human Versatile) |
|--------------|------------------------------|
| `SET_FEAT` | `SET_EXTRA_FEAT` |
| `SET_FEAT_PROFICIENCY_PICK` | `SET_EXTRA_FEAT_PROFICIENCY_PICK` |
| `SET_FEAT_ABILITY_INCREASES` | `SET_EXTRA_FEAT_ABILITY_INCREASES` |
| `SET_FEAT_SPELLCASTING_ABILITY` | `SET_EXTRA_FEAT_SPELLCASTING_ABILITY` |
| `SET_FEAT_CANTRIP_PICK` | `SET_EXTRA_FEAT_CANTRIP_PICK` |
| `SET_FEAT_SPELL_PICK` | `SET_EXTRA_FEAT_SPELL_PICK` |
| `SET_FEAT_SPELL_USES` | (shared — keyed by featKey) |

## Sentinel conventions

- `classFeatureUses[ key ]` missing → at max uses
- `featSpellUses[ featKey ]` missing → free cast available
- `currentHitPoints === null` → at max HP
- `spellSlotRemaining[1]` missing → all L1 slots remain

Long rest clears these “spent” maps to `{}` or `null` where applicable.

## Catalog note

Magic Initiate is three distinct feat keys in the live catalog. New feat keys and strings are added in **dnd55-data** only; keep `FEAT_DEFINITIONS` in sync in this repo.
