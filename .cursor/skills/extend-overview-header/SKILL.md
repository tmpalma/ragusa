---
name: extend-overview-header
description: Layout and styling for the shared Overview identity line and combat stat grid in rpg-dm-player-toolset. Use when changing OverviewHeaderStats, Campaign party member headers, or spacing between the class/background/species line and stat cards.
---

# Extend overview header (rpg-dm-player-toolset)

Read this skill when editing the **shared header block** that shows class · background · species and the five combat stat cards (AC, HP, initiative, proficiency, passive perception).

## When to use

| Use this skill | Use something else |
|----------------|-------------------|
| `OverviewHeaderStats.tsx` layout, spacing, or stat labels | Full Overview tab section order — [`docs/overview-sheet.md`](../../docs/overview-sheet.md) |
| Campaign party pane header stats (reuses the same component) | Character name `<h2>` in `SheetPane` (stays outside this component) |
| CSS for `.headerStats`, `.subtitle`, top `.statGrid` in `Sheet.module.css` | Lower Overview sections (Attributes, Exploration, Gear) |

## Component map

| Layer | Path |
|-------|------|
| UI | `src/components/sheet/OverviewHeaderStats.tsx` |
| Styles | `src/components/sheet/Sheet.module.css` — `.headerStats`, `.subtitle`, `.statGrid`, `.statCard` |
| Overview tab | `SheetPane.tsx` — `<h2>` name, then `<OverviewHeaderStats />` |
| Campaign | `CampaignPage.tsx` — member name in `CollapsiblePane` summary; body is `.memberOverviewBody` with `<OverviewHeaderStats />` then `<OverviewAttributes showSkillsByAbility />` |

## Layout rules

1. **Identity line** — one `<p className={styles.subtitle}>`: `{classLevel} · {background} · {species}` (lineage in parentheses when present). Use existing formatters (`formatClassLevelLine`, `backgroundDisplayName`, species/lineage helpers); do not duplicate string building in Campaign.
2. **Space before stat grid** — wrap identity line + combat stat grid in `.headerStats` with `display: flex; flex-direction: column; gap: 0.75rem`. Keep a visible gap between the subtitle and the five cards on both Overview and Campaign.
3. **Subtitle tuck under name** — `.subtitle` keeps `margin: -0.5rem 0 0` so the identity line sits close to the character name `<h2>` in Overview. Do not remove that margin without checking Overview name spacing.
4. **Stat grid** — reuse `.statGrid` (5 cards, 6-column responsive grid). Do not add exploration, ability, or gear cards here.
5. **Derived data** — pass `computeDerivedStats(character, tableRules)` from the parent; this component does not call hooks for character state.

## Checklist

1. Change `OverviewHeaderStats.tsx` once — both Overview and Campaign pick up the update.
2. Adjust spacing via `.headerStats` gap (preferred) rather than one-off margins on `.statGrid`.
3. Add or change player-facing labels in `src/locales/en/sheet.md` and `src/locales/pt-BR/sheet.md`.
4. Update [`docs/overview-sheet.md`](../../docs/overview-sheet.md) if section order or header responsibilities change.
