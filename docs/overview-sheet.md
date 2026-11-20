# Overview tab (sheet) map

Short reference for agents changing the **Overview** tab layout, copy, or movement/sense display. This is a where-things-live map, not an implementation skill.

## Entry point

| Layer | Path |
|-------|------|
| Tab routing | `src/App.tsx` — `tab === "overview"` renders `SheetPane` |
| UI | `src/components/sheet/SheetPane.tsx` — Overview sections; header identity line + combat stat grid in `OverviewHeaderStats.tsx` |
| Styles | `src/components/sheet/Sheet.module.css` |
| Derived stats | `src/state/CharacterContext.tsx` → `computeDerivedStats` in `src/domain/deriveCharacter.ts` |

## Header class line (multiclass)

The subtitle class segment comes from `resolvedClassLevels(effectiveLevelPath(character))`, not `classKey` + total `level`.

| Display | Source |
|---------|--------|
| Single class | `sheet.classLevelSegment` → `{className} {level}` (e.g. Wizard 4) |
| Multiclass | Same segment per class, joined with ` / ` (e.g. Wizard 3 / Fighter 1) |

Formatter: `formatClassLevelLine` in `src/domain/classLevels.ts`. Overview: `SheetPane.tsx` subtitle. PDF: `buildSheetPayload.ts` `class` slot and `enBackgroundClassRow`.

## Spellcasting summary (multiclass)

`SpellcastingSummary.tsx` reads `derived.perClassSpellcasting` (from `computeMulticlassSpellcasting` in `deriveCharacter`).

| Case | Overview layout |
|------|-----------------|
| One casting class | Spellcasting Ability, Spell Attack Bonus, Spell Save DC, optional prepared/known count (unchanged) |
| Two or more casting classes | One block per class: centered `{className} (level {level})` caption, then ability / attack / save DC on its own row (3 columns; 2 on narrow viewports) |

Combined spell **slots** still come from `derived.spellcasting.slotsByLevel` (Spell Access section and PDF slot checkboxes). Pact slots stay separate (`derived.pactMagic`).

PDF export (`buildSheetPayload.ts`): `spellSaveDc` uses a single field — one number for one caster, or `ClassName DC / ClassName DC` when two or more casters. Spell attack and ability mod stay on the primary caster row.

## Section order (top to bottom)

1. Header — name (`<h2>` in `SheetPane`); identity line + combat stat grid in shared `OverviewHeaderStats` (also used on Campaign party panes). Wrap both in `.headerStats` with `gap: 0.75rem` so the class · background · species line is visually separated from the stat cards. See `.cursor/skills/extend-overview-header/SKILL.md`.
2. **Top combat stat grid** — AC, HP (read-only `current/max+temp`), Initiative, Proficiency Bonus, Passive Perception (`styles.statGrid`, 5 cards in a 6-column grid)
3. **Attributes** — collapsible pane (`CollapsiblePane`, default open) with six ability cards in `statGrid` via shared `OverviewAttributes.tsx`. Character Overview shows score / mod / save only. Campaign party panes pass `showSkillsByAbility`: each ability card lists catalog skills tied to that ability (name + total modifier table; CON has none).
4. **Exploration & Movement** — Speed + Darkvision (`styles.explorationGrid`, 2 columns)
5. Proficiencies
6. Skills & Tools (`CollapsiblePane`)
7. Spellcasting summary
8. Class Features, Species Features, Feats, **Gear** (owned list), Carrying Capacity, Money, optional Alignment, optional **Deity**, **Languages**, Spells (spell list), optional Backstory

## CSS grids

| Class | Use |
|-------|-----|
| `.headerStats` | Flex column wrapping identity `.subtitle` + top combat `.statGrid`; `gap: 0.75rem` between them. |
| `.statGrid` | 6-col responsive grid for combat stats and ability scores. Cards are center-aligned. |
| `.explorationGrid` | 2-col grid for Speed + Darkvision. Cards are left-aligned; stacks to 1 col below 520px. |
| `.speedLines` | Unstyled list inside the Speed card — one movement type per `<li>`. |
| `.contentPane` | Bordered pane for proficiencies and similar prose blocks. |
| `.gearList` | Full-width owned-gear `<ul>` — one line per item, no per-row weight. |
| `.capacityGrid` | 3-col carrying stats (current / max carry / drag-lift-push). Stacks to 1 col below 520px. Over-capacity tints the current weight. |
| `.purse` | Read-only coin cards via `repeat(auto-fit, minmax(6.5rem, 1fr))` — two columns on ~320px viewports. |

Do not put two exploration cards in `.statGrid` — they would render as narrow 1/6-width cells. Do not put capacity or coins in `.statGrid`.

## Hit points (read-only)

Overview HP is **not** interactive — Combat tab owns `HitPointsBlock`.

| Display part | Source |
|--------------|--------|
| Current (left of `/`) | Base current (`character.currentHitPoints ?? derived.hitPoints`) **plus** remaining temp HP when active |
| Max | `derived.hitPoints` |
| `+N` suffix | `character.temporaryHitPointsRemaining` when temp HP is active (`> 0`) |

Example: 11 HP remaining with 2 temp HP on a 17-max character → `13/17+2`.

Format via `overviewHitPointsDisplay` in `src/domain/hitPoints.ts` and `sheet.hitPointsOverview` (`{current}/{max}{temp}`). Em dash when max HP is unknown (no class).

## Speed and darkvision

**Not stored on character state** — fully derived.

| Field | Source |
|-------|--------|
| `derived.speeds` | Species base speeds (`getSpeeds`), walk bonuses (unarmored movement, feats, magic-item floor), or **Wild Shape** beast speeds (replaces entire array) |
| `derived.darkvisionFeet` | Merged from species + class feature contributions (`mergeDarkvisionFeet`) |

Extra movement types (climb, swim, burrow) appear mainly during **Wild Shape**; species catalog is walk-only today.

Speed display: map each `derived.speeds` entry with `rules.speedList` (`{type} {feet}`), `tGlossary("speedType", type)`, and `rules.speedFeet`.

Darkvision display: `rules.speedFeet` when `darkvisionFeet > 0`, else `rules.emDash`.

PDF export (`src/domain/pdfSheet/buildSheetPayload.ts`) uses **walk speed only** for movement — beast/climb/swim speeds from Overview are not copied unless explicitly wired. Multiclass class lines and per-class spell save DCs **are** wired (see Header class line and Spellcasting summary sections above).

## i18n

| Content | Files |
|---------|-------|
| Section headings, stat labels | `src/locales/en/sheet.md` and `src/locales/pt-BR/sheet.md` — keys like `sheet.explorationAndMovement`, `sheet.movementSpeed`, `sheet.darkvision` |
| Format strings (`{value} ft.`, em dash) | `src/locales/{locale}/rules.md` — `rules.speedFeet`, `rules.speedList`, `rules.emDash` |
| Speed type labels | `catalog_strings` in Supabase (seed input: `catalog-source/locales/en/catalog/glossary.md`) — `speedType.walk`, `speedType.climb`, etc. |

Lookup: `t("sheet.*")`, `tGlossary("speedType", type)` → `catalog.glossary.speedType.{type}` with fallback to the raw type string.

**`npm run fetch:data`** regenerates `catalog-source/generated/*` and `catalog-source/locales/en/catalog/*`. After changing glossary harvest in `scripts/writeLocaleCatalog.ts`, add matching keys manually in `catalog-source/locales/pt-BR/catalog/glossary.md`, then **`npm run seed:catalog`**.

Speed types are harvested from species speeds and `WILD_SHAPE_BEASTS` speeds in `writeLocaleCatalog.ts`. At runtime, glossary strings come from `get_catalog()` like other catalog copy.

## Languages (read-only)

Editing stays on the Character tab (`LanguagesInput`). Overview lists every language the character knows.

| Block | Source |
|-------|--------|
| Language list | `allKnownLanguages` in `src/domain/languageGrants.ts` — automatic grants (Common, class/feat languages) plus `character.languagePicks` |
| Display names | `languageDisplayName` in `src/domain/languagePicks.ts` → `catalog.languages` |

Section: `LanguagesSummary.tsx`, placed immediately before the Spells spell-list block (`SpellAccessSummary`).

## Gear (read-only)

Editing stays on the Equipment tab. Overview shows what the character **owns** — not class/background starting-equipment *choices* (that section remains separate).

| Block | Source |
|-------|--------|
| Owned list | `overviewGearLines` in `src/domain/overviewGear.ts` — weapons/armor (variant names, thrown qty), adventuring gear, attuned wondrous keys only, misc inventory, mundane ammo `> 0`, optional `magicAmmunition` stacks |
| Carrying | `derived.carrying` (`currentLb`, `carryLb`, `dragLiftPushLb`) via `formatWeightLb` |
| Money | `character.currency` — all five denominations, zeros shown |

Labels reuse `equipment.carried`, `equipment.maxCarry`, `equipment.maxDragLiftPush`, `equipment.currency.*`. Section titles: `sheet.gear`, `equipment.carryingCapacity`, `equipment.money`. Empty gear list: `sheet.noGear`.

Overview section captions (`h3` in `.section`) share one style: `font-size: 1rem`, `font-weight: 600` — Exploration & Movement through Alignment, Languages, and Spells.

Armory weapons/armor appear once in the owned list; attuned wondrous items use `attunedMagicItemKeys` only (no double-count with Armory).

## Collapsible sections

Overview uses `CollapsiblePane` only for Skills (inside Skills & Tools). Exploration & Movement is a plain `<section>`, same as Attributes. For new collapsible blocks, see `.cursor/skills/extend-collapsible-panes/SKILL.md`.

## Tests

No dedicated `SheetPane` UI tests. Domain coverage: `src/domain/overviewGear.test.ts` (owned list order, variants, ammo, no Armory/wondrous double-list), `src/domain/wildShape.test.ts` (beast speeds), `src/domain/classFeatures.test.ts` (darkvision merge), `src/domain/combatActions.test.ts` (walk/darkvision examples).
