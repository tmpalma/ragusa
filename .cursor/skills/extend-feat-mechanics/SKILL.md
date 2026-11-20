---
name: extend-feat-mechanics
description: Implements or extends D&D 5.5e feat mechanics in rpg-dm-player-toolset — catalog entries, FeatDefinition effects, FeatChoices UI/state, spell grants, combat ResourceCounters, and Long Rest recovery. Use when adding or changing feats, origin feat choices, Human Versatile feats, Magic Initiate variants, grant_spells, feat spell pickers, featSpellUses, or per-long-rest feat tracking.
---

# Extend feat mechanics (rpg-dm-player-toolset)

Read this skill before implementing feat behavior. Do **not** restate SRD rules in code comments — encode mechanics in the existing patterns below.

For catalog **lookups** and any new or changed feat **rows or display strings**, read `.cursor/skills/catalog-data/SKILL.md` first — hand off to **dnd55-data**, not adapters or JSON in this repo.

## Architecture (two layers)

| Layer | Location | Purpose |
|-------|----------|---------|
| Catalog | Supabase `feats` + `catalog_strings` (see catalog-data skill) | Name, category, description (display only) |
| Mechanics | `src/domain/featEffects.ts` → `FEAT_DEFINITIONS` | Prerequisites, effects, choice slot sizing |

Every catalog feat **must** have a matching `FeatDefinition` entry. `featEffects.test.ts` asserts `FEAT_DEFINITIONS.length === FEATS.length` against runtime `FEATS` from the installed catalog.

## Where feats live on a character

- **Primary origin feat:** `character.featKey` + `character.featChoices`
- **Fighting Style (class-granted):** `character.fightingStyleFeatKey` + `character.fightingStyleFeatChoices` — picked in `FightingStyleFeatInput`
- **Human Versatile extra:** `character.extraFeats[]` + `character.extraFeatChoices[]` (parallel arrays, index 0 today)
- **Class-granted feat (ASI slot):** `character.classGrantedFeats[level]` + `character.classGrantedFeatChoices[level]` — picked in `ClassGrantedFeatInput` at the grant level (L4 today); **not** `extraFeats[0]`, **not** `featKey`, **not** `fightingStyleFeatKey`
- **Active slots:** `activeFeatSlots()` in `featSlots.ts` → `activeFeatKeysFromCharacter()`; duplicate feat keys allowed when `FeatDefinition.repeatable` (ASI only today)
- **Background suggestion:** `background.featKey`; auto-applied until `featTouched`

Origin feats come from background + Human Versatile. Fighting Style is granted by class features (Fighter L1, Paladin/Ranger L2). L4+ class feats come from catalog `grant_feat` effects.

## FeatChoices shape

```ts
interface FeatChoices {
  proficiencyPicks: (FeatProficiencyPick | null)[];
  abilityIncreases: Partial<Record<AbilityId, number>>;
  spellcastingAbility: AbilityId | null;
  cantripPicks: (string | null)[];
  spellPicks: (string | null)[];
}
```

- `initialFeatChoicesForFeat(featKey)` sizes arrays from `grant_skill_proficiencies` and `grant_spells` effects.
- Resolve choices per **slot** with `featChoicesForSlot()` / `featChoicesResolverForCharacter()` — required when the same feat key appears twice (e.g. two ASI picks later). `featChoicesForKey()` accepts optional `classGrantLevel` for class slots.
- **Class-granted picker:** `classGrantedFeatPickerOptions()` — General + Origin + Fighting Style (if prerequisite met), excludes Epic Boon and already-taken non-repeatable keys across all slots. UI: [`FeatPickerCombobox`](src/components/form/FeatPickerCombobox.tsx) with category filter + optgroups when unfiltered (`featCategories.ts`: `availableFeatCategories`, `filterFeatsByCategory`). Same component on background [`FeatInput`](src/components/form/FeatInput.tsx) (Origin + Dragonmark). Single-category pickers (Human Versatile, Fighting Style) skip the filter.

## Effect types and reference implementations

| Effect | Example feat | Choices UI | Applied in |
|--------|--------------|------------|------------|
| `grant_skill_proficiencies` | Skilled | `FeatProficiencyChoices` | skills/tools via reducer |
| `ability_score_increase` | Grappler, ASI | L1-style ability table in `FeatProficiencyChoices` (steppers on allowed abilities only) | `collectFeatContributions` |
| `grant_spells` | Magic Initiate (×3) | `MagicInitiateSpellsSection` on Spells tab; Fey/Shadow/Vampire Touched L1 pick in `TouchedFeatSpellsSection` | spell grant + combat uses |
| `initiative_add_proficiency` | Alert | none | `collectFeatContributions` |
| `ac_bonus_in_armor` | Defense | none | `collectFeatContributions` → AC |
| `ranged_attack_bonus` | Archery | none | `collectFeatContributions` → weapon attack cards |
| `light_extra_attack_add_ability_mod` | Two-Weapon Fighting | none | `collectFeatContributions` → omit Light off-hand line + bonus-action copy |
| `damage_die_floor` | Great Weapon Fighting | none | reminder card only (too conditional for weapon line) |
| `narrative` | many | description only | optional combat surface (see below) |
| `combat_reference_options` | GWM, Charger, Polearm Master | none (mechanics text only) | Combat Special Traits or action columns (see below) |

Copy the closest existing feat before inventing new abstractions.

### Multi-benefit combat reference layout (`combat_reference_options`)

When one feat grants **multiple named modes or benefits** that should appear together on a combat card (same layout as Elemental Smite / `uiSurface: "reference"` on class features), add a `combat_reference_options` effect:

| Piece | Rule |
|-------|------|
| `intro` | Short intro only — defaults to "You gain the following benefits." Use `intro: ""` for single extra abilities (Adept feats) so no boilerplate appears. Do **not** repeat option text in `intro`. |
| `options[]` | One entry per named benefit: `{ key, name, desc }` with the full rules text for that benefit |
| `actionTiming` on option | When set, emits an action-economy card for that benefit (`name` + `desc`) instead of listing it only on Special Traits |
| `combatSurface` | `true` on the `FeatDefinition` |
| UI | `CombatReferenceOptions` / `FeatPickDescription` — intro paragraph, then each option as **Name.** description (Combat Special Traits and Background feat picker). On Combat action cards, use card `referenceOptions` — **do not** replace option copy with catalog `desc` in `localizeCombatCard`. Catalog feats auto-parse `**Name.**` and `Name:` blocks via `parseFeatDescriptionReference()` when no `combat_reference_options` effect exists. |

**Canonical examples:** Great Weapon Master (Special Traits), Charger (Special Traits), Polearm Master (bonus + reaction cards from timed options).

**Tests:** `featEffects.test.ts` — card has `referenceOptions` with expected keys; intro does not duplicate option prose. `combatActions.test.ts` — timed options emit per-timing cards. Single timed `combat_reference_options` cards title as `{featName} - {abilityName}` via `combat.featAbilityCardTitle` in `localizeCombatCard` (multi-option cards keep the feat name).

## Combat surfaces for feats

`FeatDefinition` may set optional `combatSurface` and `actionTiming` (same split as class/species features):

| Surface | When to use | Example | Rendered in |
|---------|-------------|---------|-------------|
| **Numeric / weapon mutation** | Changes derived stats or weapon card math | Archery, Defense, Two-Weapon Fighting | `collectFeatContributions` + `buildCombatActions` |
| **Action / bonus / reaction card** | Clear action-economy trigger | (future explicit-timing feats) | Combat action columns via `featActionCards` |
| **Special Traits reminder** | `combatSurface: true`, no `actionTiming` — mechanic too conditional for a timing block | Great Weapon Fighting, Savage Attacker | Combat **Special Traits → Feats** group via `buildFeatSpecialFeatureCards` |

Rules in `featActionCards` / `buildFeatSpecialFeatureCards`:

- `combatSurface && actionTiming` → action columns (prefer explicit timing over `classifyActionEconomy(feat.desc)`).
- `combatSurface && !actionTiming` → Special Traits Feats group (not action columns).
- No `combatSurface` → legacy `classifyActionEconomy(feat.desc)` fallback for action columns only.

**Special Traits visibility:** section shows for non-Human species **or** when feat reminder cards exist (Human Paladin with GWF still sees Feats group). Species and Feats are labeled sub-groups inside the section.

Fighting Style feats are class-granted via `fightingStyleFeatKey`; they participate in active feat keys like origin feats.

## Checklist: new feat with player choices

1. **Catalog (dnd55-data)** — Add or update the feat row and `catalog_strings` in **dnd55-data** (`supabase/seed/*.sql`). Include `srd`, `book`, category, and en/pt-BR copy. If the print source is new, add book metadata there too. Background suggested `featKey` changes are catalog rows on `backgrounds`. Plan must state this explicitly; do not edit `catalog-source/` or adapters here.
2. **Definition** — Add `FeatDefinition` in `featEffects.ts` with `featKey`, `prerequisites`, `effects`.
3. **Choice init** — Extend `initialFeatChoicesForFeat` if new effect type needs new `FeatChoices` fields.
4. **Reducer** — In `characterState.ts`:
   - Primary: `SET_FEAT_*` actions
   - Extra: `SET_EXTRA_FEAT_*` actions (mirror primary)
   - Reset choices on `SET_FEAT` / `SET_EXTRA_FEAT` via `initialFeatChoicesForFeat`
5. **UI** — Wire in `FeatChoicesInput` (primary) and `HumanVersatileFeatInput` (extra). Exclude already-taken feat keys between the two pickers.
6. **Derived stats** — If scores/AC/initiative/HP change, handle in `collectFeatContributions` (switch on effect type).
7. **Tests** — `featEffects.test.ts`, `characterState.test.ts`; add domain tests for new helpers.
8. **Locales** — `character.md` labels for any new pickers; combat/spells copy if new UI surfaces.

## Checklist: feat grants spells (`grant_spells`)

Helpers live in [`src/domain/featGrantSpells.ts`](../../../src/domain/featGrantSpells.ts). A feat may include **multiple** `grant_spells` effects (school Adepts).

Optional fields on the existing effect (keep Magic Initiate working):

| Field | Use |
|-------|-----|
| `fixedSpellKeys` / `fixedSpellGrants` | Always granted (Misty Step, Mage Hand, Adept slot spells with `minSlotLevel`) |
| `schools`, `ritualOnly`, `spellList: "any"` | Filter spell picks |
| `spellPickCount`, `spellPickCountFromProficiency` | Ritual Caster = PB rituals at L4 |
| `freeCast: "none" \| "firstSpellPick" \| "eachGranted"` | Magic Initiate vs Fey-Touched |
| `inheritAbilityFromAsi: true` | Hide Int/Wis/Cha combobox; use ASI ability |
| `minSlotLevel` | Gate fixed grants on spell slot level |

1. Grant locked spells: `buildFeatGrantedSpells()` → merge via `buildAllGrantedSpells()`
2. Spells tab + `buildFeatSpellcastingEntries()` for attack/DC
3. Combat spell cards + per-spell `ResourceCounter` when `freeCast` applies
4. Exclude granted keys from class pickers; duplicate prevention via `featGrantedSpellKeysFromChoices`

## Checklist: once-per-long-rest tracking (feat spells)

1. **State:** `character.featSpellUses: Record<string, number>` keyed by **`featKey:spellKey`** (legacy `featKey`-only keys still read once for Magic Initiate saves)
2. **Trackers:** `buildFeatSpellUseTrackers()` — one counter per free-cast spell (Fey-Touched = two). For `limited_uses` on Genie Magic, Lordly Resolve, Love Bites, Mage Slayer, Mythal Touched, Rebuke, and Divination Adept, embed `ResourceCounter` on the feat card (`useTrackerFeatKey` / `FEAT_EMBEDDED_USE_TRACKER_KEYS`) and pass `excludeEmbeddedOnCard: true` to `buildFeatUseTrackers()` so the standalone Special Traits row omits those keys.
3. **Reducer:** `SET_FEAT_SPELL_USES` with the storage key; clamp; remove key when at max
4. **Long Rest:** clear `featSpellUses` in `applyRest()`. Short rest restores only feats in `featKeysRecoveringOnShortRest()`
5. **Prune:** `withPrunedFeatSpellUses()` when feat or spell pick changes

## L4 picker and post-2024 catalog

- `classGrantedFeatPickerOptions()` includes every category except Epic Boon (Dragonmark, Dark Gift, etc.)
- Prereqs: `{ type: "feat" }`, `{ type: "feat_category" }`, `{ type: "martial_weapon_proficiency" }`
- Import new print feats: transcribe catalog rows in **dnd55-data** (local 5etools as reference only). In this repo: `src/domain/post2024FeatDefinitions.ts`, `post2024FeatMechanics.ts`, and `FeatDefinition` entries — no `fetch:data` for catalog content.

Class/species limited uses use `classFeatureUses` / `speciesFeatureUses` + catalog `limitedUses` — prefer that pattern for non-spell features.

## Multiple instances of the same feat family

When SRD allows taking a feat more than once with different options (e.g. Magic Initiate per spell list):

- Split into **separate catalog keys** (`magic-initiate-wizard`, etc.), not one feat with a list picker.
- Filter duplicate keys between primary and versatile feat comboboxes.

**Repeatable feat keys** (e.g. `ability-score-improvement`): set `repeatable: true` on `FeatDefinition`. Level-keyed `classGrantedFeats` slots give each instance its own `FeatChoices`; `collectFeatContributions` iterates `activeFeatSlots` so both ASI ability increases apply.

## Tests to run

```bash
npm test -- src/domain/featEffects.test.ts src/domain/combatActions.test.ts src/domain/spellSelection.test.ts src/domain/rest.test.ts src/state/characterState.test.ts
npm run build
```

## Additional reference

For file paths, data-flow diagram, and action naming conventions, read [reference.md](reference.md).
