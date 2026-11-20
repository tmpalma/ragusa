---
name: extend-class-level-mechanics
description: Implements or extends D&D 5.5e class level-up, subclass choice, class/subclass feature effects, spell progression at new levels, combat limited uses, always-prepared class feature spells (Paladin's Smite), and level revert behavior in rpg-dm-player-toolset. Use when adding a class to a new level cap, adding subclasses, L3 features, Primal Knowledge–style skill grants, oath always-prepared spells, free spell-cast class features, Hunter's Prey options, subclass pickers, or REVERT_LAST_LEVEL / LEVEL_UP behavior.
---

# Extend class level mechanics (rpg-dm-player-toolset)

Read this skill before extending level caps, subclasses, or class/subclass features. Do **not** restate SRD rules in code comments — encode mechanics in the existing patterns below.

For **origin feats** (background, Human Versatile, Magic Initiate) and **Fighting Style** combat display (class-granted feat pick + Combat tab effects), use `.cursor/skills/extend-feat-mechanics/SKILL.md` instead.

For catalog **lookups** and any new or changed class/subclass **rows or display strings**, read `.cursor/skills/catalog-data/SKILL.md` first — hand off to **dnd55-data**, not adapters in this repo.

## Architecture (three layers)

| Layer | Location | Purpose |
|-------|----------|---------|
| Catalog | Supabase `classes`, `subclasses`, `class_spell_lists`, `spells`, `catalog_strings` | Class/subclass definitions, spell tables, names/descriptions |
| Runtime install | `src/catalog/catalogStore.ts` | `CLASSES`, `SUBCLASSES`, etc. after `get_catalog()` |
| Mechanics | `src/domain/subclasses.ts`, `src/domain/classFeatures/*`, `src/state/characterState.ts` | Merged features, picks, derived stats, UI wiring |

Class base features and subclass entries live in the catalog payload. Encode **behavior** here; encode **catalog rows and strings** in **dnd55-data**.

## Current slice (v1)

- **Level cap:** total character level 1–6 via `MAX_CHARACTER_LEVEL` in `src/domain/characterLevel.ts`; each class may also have its own cap via `maxCharacterLevelFor()`
- **Subclass choice:** explicit player pick when **that class** reaches level 3 — **never auto-select**, even when only one SRD subclass exists; first pick is **permanent** until that class falls below 3 (`REVERT_LAST_LEVEL` / path change); L4+ UI shows read-only subclass name under the class combobox on that class’s level block
- **Multiclass:** supported via `levelPath` (see below); RAW defaults in `RAW_TABLE_RULES` (`src/domain/tableRules.ts`); policy via `evaluateMulticlassAction()` and `LEVEL_UP_CLASS`
- **L4 ASI:** every class gains `ability-score-improvement` via catalog `grant_feat` at **that class's level 4**; a 2/2 split gets no ASI; player picks in `ClassGrantedFeatInput` keyed by class level block
- **Monk L4:** Slow Fall reaction card (`slow-fall`); no TCE L4 optionals in this slice

## Multiclass (level path + TableRules)

| Concept | Location | Notes |
|---------|----------|-------|
| `levelPath: string[]` | `Character` in `characterState.ts` | Class taken at each character level; `level` = path length; `classKey` = first entry |
| `resolvedClassLevels()` | `src/domain/classLevels.ts` | Aggregates path to `{ classKey, classLevel }[]` in first-taken order |
| `TableRules` | `src/domain/tableRules.ts` | `maxDistinctClasses`, `abilityPrerequisite`, save/full-starting-proficiency knobs; pass to reducer/domain — never read a global |
| `evaluateMulticlassAction()` | `src/domain/multiclass.ts` | Returns `{ ok, code, messageKey, enforcement }`; reducer `LEVEL_UP_CLASS` rejects when `ok` is false |
| Legacy hydrate | `hydrateLevelPath()` / `syncCharacterLevelAliases()` in `classLevels.ts` | Old saves with only `classKey` + `level` expand to a path on load |

**Class level vs character level:** features, spell pick limits, prepared/known counts, limited-use formulas (`limitedUses` `byLevel`, Sneak Attack, Weapon Mastery, Rage uses), and ASI `grant_feat` slots all key off **that class's level**, not total character level. Proficiency bonus, cantrip scaling, and XP still use character level.

**Actions:** `SET_CLASS` resets path to `[key]`; `LEVEL_UP` appends the primary class; `LEVEL_UP_CLASS { classKey }` appends a new or existing class (after `evaluateMulticlassAction`); `REVERT_LAST_LEVEL` pops the last path entry. Subclass state lives in `subclassByClass[classKey]`; `SET_SUBCLASS` accepts optional `classKey` when a non-primary class reaches 3.

**Integration tests:** `src/domain/multiclassIntegration.test.ts` (cross-stream); unit tests in `multiclass.test.ts`, `multiclassCasterLevel.test.ts`, `multiclassSpellcasting.test.ts`, `multiclassFeatures.test.ts`, and `characterState.test.ts` (spine).

## Where level-up state lives

| Field | Purpose |
|-------|---------|
| `character.levelPath` | Class taken at each character level (length 1–6); aliases `level` and `classKey` via `syncCharacterLevelAliases` |
| `character.level` | Total character level (= `levelPath.length` when path is set) |
| `character.classKey` | First class in the path (file compatibility) |
| `character.subclassByClass` | Selected subclass per class key; legacy `subclassKey` mirrors the primary class |
| `character.classGrantedFeats` | Class-granted feat keys by **class** grant level on the primary class (e.g. `{ 4: "grappler" }`) |
| `character.classGrantedFeatsByClass` | Per-class grant slots (shape for future UI; primary still uses `classGrantedFeats`) |
| `character.classGrantedFeatChoices` | Per-slot `FeatChoices` for class-granted feats (keyed by grant level) |
| `character.subclassSkillPicks` | Skill slots from **subclass** `grant_skill_proficiencies` effects |
| `character.subclassFeatureChoices` | Options for **subclass** `choose_feature_option` effects (keyed by `choiceKey`) |
| `character.subclassSpellbookPicks` | Extra spellbook slots from subclass `grant_spellbook_picks` (Evoker Savant) |
| `character.classFeatureSkillPicks` | Skill slots from **class** `grant_skill_proficiencies` effects (keyed by feature key, e.g. `primal-knowledge`) |
| `character.classFeatureUses` | Spent uses for limited-use class features (missing key = at max); formulas use **class** level |
| `character.classFeaturePoolRemaining` | Remaining HP for `hit_point_pool` features (missing key = 0; Long Rest zeros all) |
| `character.subclassFeatureOptionPicks` | Multi-slot subclass `choose_feature_option` (Battle Master maneuvers, Experimental Elixir) |
| `character.spellPicksByClass` / `cantripPicks` | Per-class prepared/known spells; cantrips union across spellcasting classes |
| `character.pactSlotRemaining` | Warlock Pact Magic pool (separate from Spellcasting table slots) |
| `character.hitDiceRemaining` | Hit dice keyed by die size (multiclass pools) |
| `character.armorClassFormulaKey` | Player pick when 2+ unarmored-defense formulas apply |

Subclass grants come from **subclass feature effects**, not from `if (classKey === "bard")` checks in UI or domain code.

## ClassFeatureEffect types (class + subclass)

Defined in `src/data/types.ts`. Reference implementations:

| Effect | Example | Player UI | Applied in |
|--------|---------|-----------|------------|
| `grant_skill_proficiencies` (subclass) | College of Lore (+3 any skill) | `SubclassChoicesInput` | `subclassSkillPicks` → `mergeSkillProficiencies` |
| `grant_skill_proficiencies` (class) | Primal Knowledge (+1 barbarian skill) | `ClassFeatureSkillInput` | `classFeatureSkillPicks` → `mergeSkillProficiencies` |
| `choose_feature_option` | Hunter's Prey, Circle of the Land land type | `SubclassChoicesInput` combobox | `subclassFeatureChoices`; optional `spellNames` on options → always-prepared |
| `always_prepared_spells` | Oath of Devotion, Paladin's Smite, Tinker's Magic | none (automatic) | `buildGrantedSpells()` in `spellSelection.ts` (class + subclass features) |
| `grant_spellbook_picks` | Evoker Savant | Spells tab extra pickers | `subclassSpellbookPicks` + `SET_SUBCLASS_SPELLBOOK_PICK` |
| `grant_spellcasting` | Eldritch Knight, Arcane Trickster | Spells tab (wizard list overlay) | `effectiveSpellcasting()` / `computeEffectiveSpellcasting()` in `spellcasting.ts`; `spellPickLimitsForClass(..., subclass)` |
| `hit_point_pool` | Arcane Ward | Combat Class Features `ResourceCounter` (remaining HP) | `resolveHitPointPoolMax()` in `contributions.ts`; `classFeaturePoolRemaining` + `SET_CLASS_FEATURE_POOL_REMAINING` |
| `grant_skill_proficiencies.fixedSkills` | Implements of Mercy | none (automatic) | `subclassFixedSkills()` → `mergeSkillProficiencies` |
| `grant_tool_proficiencies.choose` | Student of War | `SubclassChoicesInput` artisan combobox | `subclassToolPicks` (independent of replacement choose) |
| `choose_feature_option` count > 1, `uiSurface: "character"` | Battle Master maneuvers | `SubclassChoicesInput` multi-slot | `subclassFeatureOptionPicks` + `SET_SUBCLASS_FEATURE_OPTION_PICK` |
| `choose_feature_option` `uiSurface: "reference"` | Wild Magic Surge table | nested `CollapsiblePane` on Combat card | listed on card; no stored pick |
| `hit_points_per_class_level` | Draconic Resilience | none | `collectClassFeatureContributions` → `computeHitPoints` |
| `unarmored_defense` (subclass) | Draconic Resilience | none | `collectClassFeatureContributions` → AC |
| `darkvision` (`increaseExisting`) | Warrior of Shadow, Umbral Sight | Overview Darkvision stat (— if none); Special Traits range | `mergeDarkvisionFeet` in `deriveCharacter` |
| `expertise` | Bard L2 | `ExpertiseInput` | `expertiseSkillPicks` |
| `weapon_mastery` | Fighter L1 | `WeaponMasteryInput` | `collectClassFeatureContributions`; optional `countByLevel` (Barbarian 2→3, Fighter 3→4 at L4) |
| `grant_feat` | Ability Score Improvement (all classes L4) | `ClassGrantedFeatInput` in matching `LevelBlock` | `classGrantedFeats` / `classGrantedFeatChoices`; cleared below grant level on `REVERT_LAST_LEVEL` / `SET_CLASS` |
| `narrative` + `combatSurface` | Frenzy, Cutting Words, Reckless Attack, Danger Sense | timed action cards or Class Features description | `buildClassFeatureActionCards` / `CombatView` |
| `limitedUses` on feature | Rage, Channel Divinity, Second Wind | description card + `ResourceCounter` in Combat Class Features; action card when `actionTiming` set | `buildClassFeatureCards`, `buildClassFeatureUseTrackers`, `SET_CLASS_FEATURE_USES` |

Copy the closest existing class/subclass before inventing new abstractions.

## Checklist: enable a class for level N

1. **Level cap** — Ensure `maxCharacterLevelFor()` returns the new cap (today all classes use `MAX_CHARACTER_LEVEL`).
2. **Catalog (dnd55-data)** — Class L3 feature entries, spell progression rows, and related `catalog_strings` in **dnd55-data** seed SQL. Plan must state this explicitly.
3. **Spell progression tests** (casters only) — Add expectations in `src/domain/spellProgression.test.ts` against runtime catalog shape.
   - **Slot UI is generic:** `spellSlotsByLevel()` drives Spells tab `ResourceCounter`s (and sheet slot lines) plus `SET_SPELL_SLOT_REMAINING` for **every** spell level with slots > 0. Do **not** hardcode a 1st-level-only tracker when a class gains 2nd-level (or higher) slots.
   - **Wizard spellbook:** `spellbookListKeys()` includes every list level up to the highest slot level with slots > 0; Savant extra picks live in `subclassSpellbookPicks`, separate from generic spellbook size.
   - **Pact Magic:** at L3 slots are 2nd-level only (`[0, 2, …]`); `preparedSpellListKeys()` still includes 1st-level list spells when `casterType === "PACT"`; Short Rest clears `spellSlotRemaining` for warlocks.
   - **Prepared pickers:** use `.cursor/skills/extend-capped-catalog-picks/SKILL.md` (`SpellCappedPickList` + spell-level filter). When more than one spell level is on the class list, filter beside the combobox; option labels are `Name (School)` via `spellPickerLabel`.
4. **Spell lists** (if new spell levels) — `class_spell_lists` / `spells` rows in **dnd55-data** when list membership changes.
5. **Locales** — Update `src/locales/en/app.md` and `src/locales/pt-BR/app.md` subtitles listing level-3 classes (UI copy in this repo).
6. **Mechanics** — Domain, reducer, and UI in this repo for the new level behavior.
7. **Tests** — `characterState.test.ts`: class can `LEVEL_UP` to N; fighter (or non-enabled class) stays capped; `REVERT_LAST_LEVEL` clears subclass state below 3.

## Checklist: add a subclass

1. **Catalog (dnd55-data)** — Add `SubclassData`-shaped row in `subclasses` + `catalog_strings` (`key`, `classKey`, `features[]`, `grantedAtLevel`, effects, combat flags). New print books belong in **dnd55-data** `books` seeds. Plan must state this explicitly.
2. **Mechanics** — Subclass helpers, pickers, and tests in this repo.
3. **Reducer validation** — `SET_SUBCLASS` must reject keys whose `classKey` does not match the selected class context (see multiclass rules).
4. **No auto-select** — Do not set `subclassKey` on `LEVEL_UP`; player must dispatch `SET_SUBCLASS`.
5. **Tests** — `subclasses.test.ts` and `characterState.test.ts`: subclass list length, explicit selection, effect outcomes after picks.

## Checklist: subclass / class feature with player choices

### Subclass skill picks (`grant_skill_proficiencies`)

1. Effect on subclass feature: `{ type: "grant_skill_proficiencies", count: N, options?: SkillId[] }` — omit `options` for any skill (Lore).
2. `subclassSkillProficiencyCount()` sizes slots; `initialSubclassSkillPicks()` initializes arrays.
3. Reducer: `SET_SUBCLASS_SKILL_PICK` — use `applySubclassSkillPick` + `takenSkillsForSubclassPicks`.
4. UI: `SubclassChoicesInput` (rendered when subclass selected in `ClassSection` L3 block).

### Class feature skill picks (`grant_skill_proficiencies` on base class)

1. Effect on **class** feature in `classFeatureCatalog.ts` (e.g. Primal Knowledge with barbarian skill list as `options`).
2. Helpers in `src/domain/classFeatures/skillGrants.ts`: `classFeatureSkillGrantsAtLevel`, `initialClassFeatureSkillPicks`.
3. Reducer: `SET_CLASS_FEATURE_SKILL_PICK` — use `takenSkillsForClassFeaturePicks`.
4. UI: `ClassFeatureSkillInputAtLevel` in `ClassSection` LevelBlock (shows for any level block with qualifying features).

### Feature option picks on base class (`choose_feature_option`)

Follow **Divine Order** / **Primal Order** — see `.cursor/skills/extend-class-feature-choices/SKILL.md`.

1. Effect on **class** feature in `classFeatureCatalog.ts` with `choiceKey` and `FeatureOptionData` options.
2. State: `classFeatureChoices`; reducer: `SET_CLASS_FEATURE_CHOICE`.
3. Domain: `src/domain/classFeatures/featureChoices.ts`.
4. UI: `ClassFeatureChoicesInputAtLevel` in `ClassSection`.

### Feature option picks (`choose_feature_option`) on subclass

1. Effect: `{ type: "choose_feature_option", choiceKey, options: [{ key, name, desc, spellNames?: string[] }] }`.
2. Reducer: `SET_SUBCLASS_FEATURE_CHOICE`; validate against `subclassFeatureChoiceOptions()`.
3. Domain: pass `subclassFeatureChoices` into `alwaysPreparedSpellKeysFromSubclass()` / `buildGrantedSpells()` so land-type spells follow the pick.
4. UI: combobox in `SubclassChoicesInput` when `uiSurface` is omitted/`character`. Set `uiSurface: "combat"` (Armorer Armor Model) to show the single-choice combobox only on the Combat Class Features card. Set `uiSurface: "reference"` (Elemental Smite) to list all options on the Combat Class Features description card with **no** stored pick on Character or Combat tabs.

### Multi-benefit combat reference layout (`uiSurface: "reference"`)

When one feature grants **multiple named modes or benefits** that should appear together on the Combat Class Features card (no stored pick), use `choose_feature_option` with `uiSurface: "reference"`:

| Piece | Rule |
|-------|------|
| `desc` | Short intro only — e.g. “You gain the following benefits.” Do **not** repeat option text in `desc`. |
| `combatSurface` | `true` |
| `options[]` | One entry per named benefit: `{ key, name, desc }` with the full rules text for that benefit |
| UI | `CombatView` renders intro `desc`, then each option as **Name.** description (same layout as Elemental Smite) |
| Large tables | Wrap in nested `CollapsiblePane` when the option list is long (Wild Magic Surge) |

**Canonical examples:** Elemental Smite (Oath of the Noble Genies), Elemental Attunement (Warrior of the Elements), Rage of the Wilds (Path of the Wild Heart), Vitality of the Tree (Path of the World Tree).

**Class features with a separate Character-tab picker:** Primal Knowledge combines `grant_skill_proficiencies` (skill picker on Character tab) with a `reference` effect for the rage-only combat reminder (Strength substitution on certain skill checks). Set `combatSurface: true` on the feature.

**Tests:** `classFeatures.test.ts` — card has `referenceOptions` with expected keys; `choice` is undefined; intro `description` does not duplicate option prose.

## Checklist: always-prepared subclass spells

Follow **Oath of Devotion** (`oath-of-devotion-spells`):

1. Subclass feature effect: `{ type: "always_prepared_spells", spellNames: [...] }`
2. Domain: `alwaysPreparedSpellKeysFromSubclass()` → merged in `buildAllGrantedSpells()` (`spellSelection.ts`)
3. Spells tab shows granted spells; exclude from redundant prepared pickers where applicable
4. Test spell keys resolve via `spellKeyFromName`

## Checklist: always-prepared spells on base class features

Follow **Paladin's Smite** (`paladins-smite`) for spell-granting **class** features. Simpler cantrip-only cases (e.g. **Tinker's Magic** / Mending) use the same effect without combat flags.

1. Class feature effect in `classFeatureCatalog.ts`: `{ type: "always_prepared_spells", spellNames: ["Divine Smite"] }`
2. Domain: `buildGrantedSpells()` loops `classData.features` at `grantedAtLevel <= level` — no subclass helper needed
3. Spells tab shows the granted spell (locked); `preparedSpellPickOptions()` excludes it automatically
4. Test in `spellSelection.test.ts`: granted at the feature's level, absent below it; excluded from prepared pickers

### Recipe: free always-prepared spell cast (slot-free limited use)

When a class feature grants an always-prepared spell **and** a number of free casts per rest (no spell slot spent), combine catalog flags like **Paladin's Smite**:

| Player-facing need | Catalog field / effect |
|--------------------|------------------------|
| Spell on Spells tab | `always_prepared_spells` effect |
| Use tracker (free casts) | `limitedUses` + `restRecovery` (`long`, `short`, or `shortOne`) |
| Timed action card | `combatSurface: true` + `actionTiming` matching the spell's `castingTime` in `spells.json` (e.g. Divine Smite → `"bonus"`) |
| Tracker embedded on timed action card only | Omit `classFeatureCard` — add the feature key to `CLASS_EMBEDDED_USE_TRACKER_KEYS` so the counter renders on the action card with a Uses-per-rest caption and is omitted from the stat row |

```typescript
// Paladin's Smite — canonical pattern
{
  key: "paladins-smite",
  grantedAtLevel: 2,
  combatSurface: true,
  actionTiming: "bonus",
  limitedUses: { kind: "fixed", uses: 1 },
  restRecovery: "long",
  effects: [{ type: "always_prepared_spells", spellNames: ["Divine Smite"] }],
}
```

5. **Tests** (`classFeatures.test.ts`): no description card in `buildClassFeatureCards`; tracker in `buildClassFeatureUseTrackers`; embedded `useTrackerClassFeatureKey` on the action card in `buildClassFeatureActionCards` at the matching timing column
6. **Do not** add `if (classKey === …)` spell grants in `spellSelection.ts` — use `always_prepared_spells` on the feature instead. **Favored Enemy** / Hunter's Mark is a legacy hardcode; new work should follow Paladin's Smite.

## Checklist: limited-use class features at new levels

1. Add feature with `limitedUses`, optional `restRecovery` (`shortOne` for Rage / Channel Divinity pattern).
2. Set `combatSurface: true` when the feature should appear on the Combat tab.
3. **Combat Class Features display** (see `buildClassFeatureCards` in `src/domain/classFeatures/cards.ts`):
   - `limitedUses` → `ResourceCounter` via `buildClassFeatureUseTrackers()`; `SET_CLASS_FEATURE_USES` clamps spent uses. Use `trackerSurface: "spells"` when the counter belongs on the Spells tab (Font of Magic).
   - `combatSurface` + `actionTiming` → **uses tracker only** in Class Features (when `limitedUses`); timed action card in Actions/Bonus/Reactions; **no** duplicate description card unless `classFeatureCard: true` (Land's Aid).
   - `combatSurface` + no `actionTiming` → description card in Class Features (Font of Magic, Draconic Resilience, Tactical Mind, Danger Sense, Reckless Attack).
   - `combatSurface` + `actionTiming` without `limitedUses` → action/bonus/reaction card only (Sacred Weapon).
   - `combatSurface: false` + `limitedUses` → tracker only, no description card (Monk's Focus). Legacy: Favored Enemy also uses this layout but Hunter's Mark is still hardcoded in `spellSelection.ts` — prefer the Paladin's Smite pattern for new spell-granting features.
   - Selected option `combatCards` (Armorer Armor Model): `attack` cards go to Combat Attacks; `actionTiming` cards go to Bonus/Actions/Reactions; `limitedUses` on a combat card adds a tracker while that option is selected.
4. **Multi-mode combat features:** when one rules entry offers distinct modes with different action economy (e.g. College of Valor **Combat Inspiration** Defense vs Offense), split into separate catalog features instead of one combined card:
   - **Reaction / Action / Bonus** mode → `actionTiming` set; card in the matching Actions/Bonus/Reactions column only (no Class Features description unless `classFeatureCard: true`).
   - **Passive or ally-triggered reminder** (no player action timing) → `combatSurface: true` without `actionTiming`; description card in Class Features (Improved Critical, Combat Inspiration Offense).
   - Use suffixed keys (`combat-inspiration-defense`, `combat-inspiration-offense`) and names that label the mode.
   - **Spends a shared tracker** (Flurry of Blows / Patient Defense / Step of the Wind spending Monk's Focus): keep the pool on the parent feature (`limitedUses`, no `actionTiming`); split each timed mode into its own `actionTiming` card with no extra counter.
5. Short/long rest recovery in `src/domain/rest.ts` via `activeClassFeatures`.
6. **Level-scaled uses:** `LimitedUsesFormula` `{ kind: "byLevel"; usesByLevel }` (e.g. Rage 2 → 3; Second Wind 2 → 3 at L4). Pair `second_wind` effect `healDice` with feature `limitedUses` — contributions derive uses from `resolveLimitedUses`, not the effect's `uses` field. **Sneak Attack:** `sneak_attack` effect with `diceByLevel` table.
7. **Spends another tracker:** features like Sacred Weapon, Preserve Life, Land's Aid — combat card only; no extra counter (player spends Channel Divinity / Wild Shape manually).
8. **Tests:** `classFeatures.test.ts` — card appears in `buildClassFeatureCards` and tracker in `buildClassFeatureUseTrackers` for the new feature.

## Level-up / revert lifecycle

| Action | Behavior |
|--------|----------|
| `LEVEL_UP` | Append primary `classKey` to `levelPath` (respect total and per-class caps) |
| `LEVEL_UP_CLASS` | Append `classKey` after `evaluateMulticlassAction(tableRules, …)`; honors `maxDistinctClasses` and ability prereq mode |
| `REVERT_LAST_LEVEL` | Pop last `levelPath` entry; below level 3 clears subclass state for affected classes; below each `grant_feat` level clears matching feat slots |
| `SET_CLASS` | Reset path to `[key]`, level 1; clear subclass state, per-class picks, and class-granted feat slots |
| `SET_SUBCLASS` | Optional `classKey` (defaults to primary); requires **that class's** level ≥ 3; stores in `subclassByClass`; rejects change or clear after first pick for that class |

Merged active features: `activeMulticlassClassFeatures()` in `contributions.ts` — union base + subclass features at each class's **class level**. Exposed on derived stats as `activeClassFeatures`.

## UI layout (`ClassSection`)

- Level 1 block: class select, class skills/tools, expertise (if any), weapon mastery
- L2+ **level-up class combobox** when `TableRules.maxDistinctClasses` allows another distinct class (or continuing an existing one); prereq banner when mode is `warn` / control disabled on `enforce`
- **Per-class `LevelBlock`s** keyed by `(classKey, classLevel)` from `levelPath` — not one block per character level
- Subclass combobox when **that class** is level 3, or level 4+ with no pick yet; disabled after pick at L3; read-only subclass name under class combobox at L4+ when locked (`SET_SUBCLASS` with `classKey` for non-primary classes)
- Primary class only: expertise L2, Fighting Style, class-granted feat pickers (`ClassGrantedFeatInputAtLevel` uses **class level**), weapon mastery increases, L1 feature choice deferrals
- Level 3 block on primary: `SubclassChoicesInput`, `ClassFeatureSkillInputAtLevel`

Feature names in lists use `tEntity("catalog.classes", entityKey, "name", fallback)` — subclass features use `{classKey}.subclass.{subclassKey}.feature.{featureKey}`.

## Tests to run

```bash
npm test -- src/domain/multiclassIntegration.test.ts src/domain/multiclass.test.ts \
  src/domain/multiclassCasterLevel.test.ts src/domain/multiclassSpellcasting.test.ts \
  src/domain/multiclassFeatures.test.ts src/domain/subclasses.test.ts \
  src/domain/classFeatures.test.ts src/domain/spellProgression.test.ts \
  src/domain/spellSelection.test.ts src/state/characterState.test.ts
npm run build
```

## L4 spell tables (2024 SRD)

| Track | L4 slots | Cantrips | Prepared / known / book |
|-------|----------|----------|-------------------------|
| Full (Bard/Cleric/Druid/Sorcerer/Wizard) | `[4, 3, …]` | 3 / 4 / 3 / 5 / 4 | 7 prepared (Sorcerer 7 known; Wizard book 12) |
| Half + Artificer | `[3, 0, …]` | Artificer 2 | 5 prepared |
| Warlock (Pact) | `[0, 2, …]` | 3 | 5 known |

Eldritch Knight / Arcane Trickster: keep `grant_spellcasting` rows at L3 only — `resolveByLevel` holds slot/cantrip counts through L4.

## Known gaps (not implemented in this slice)

- **Second+ ASI slots** (L6 Fighter, L8 everyone) — level-keyed `classGrantedFeats` is the hook; not wired yet
- **TCE L4 versatility** (Cantrip/Martial/Bardic/Eldritch Versatility, Quickened Healing)
- **Favored Enemy** — Hunter's Mark grant is hardcoded in `buildGrantedSpells()` instead of `always_prepared_spells` on the feature; migrate when touching ranger
- Protector/Warden **armor proficiency enforcement** on Equipment tab (categories are catalogued; weapon grants apply to mastery)
- Eldritch Invocations above L2 prerequisites; Lessons of the First Ones granting Origin feats; Pact of the Blade CHA-to-hit; Agonizing Blast damage math; Magical Cunning auto slot restore

## Additional reference

For file paths, data-flow diagram, and reducer action list, read [reference.md](reference.md).
