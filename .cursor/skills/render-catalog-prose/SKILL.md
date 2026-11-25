---
name: render-catalog-prose
description: Render catalog description copy with a safe markdown subset (bold, italic, paragraphs, lists) via CatalogProse. Use when adding or changing player-facing description blocks for spells, feats, class features, items, or conditions.
---

# Render catalog prose (rpg-dm-player-toolset)

Read this skill before adding or changing **player-facing description blocks** that show catalog `desc` or `catalog_strings` prose.

## When to use

| Use this skill | Use something else |
|----------------|-------------------|
| Spell / feat / class-feature / item / condition **description body** | `CollapsiblePane` wrappers only — `.cursor/skills/extend-collapsible-panes/SKILL.md` |
| Editing `**Bold.**` clauses in UI (Control Water effects, magic item sections) | Catalog row or string **authoring** — `.cursor/skills/catalog-data/SKILL.md` |
| New Combat card description text | Combat layout / limited-use trackers — domain skills for class feats |

## Pattern

| Layer | Location | Convention |
|-------|----------|------------|
| Parse | `src/domain/parseCatalogProse.ts` | Safe subset: `**bold**`, `*italic*`, blank-line paragraphs, `- ` lists |
| UI | `src/components/CatalogProse.tsx` | Renders parsed blocks; accepts `className` (e.g. `Combat.module.css` `.description`) |
| Measurements | `formatProse` from `useMeasurementSystem()` | Always **before** `CatalogProse` — converts ft/lb in prose |
| Inline labels | `<strong>{name}.</strong>` + `CatalogProse` | Combat reference options keep the name outside; option `desc` uses `CatalogProse` |

### Checklist

1. **Never** put raw catalog `desc` in `<p>{text}</p>` after `formatProse` — use `<CatalogProse className={…}>{formatProse(text)}</CatalogProse>`.
2. **Do not** strip `**` in SQL or fix one entity in CSS — fix the shared renderer.
3. **Tables / structured reference** — keep `CombatReferenceOptions` table markup; only run intro, option `desc`, trailing, and table cell strings through `CatalogProse` when they are prose paragraphs.
4. Add parser cases in `parseCatalogProse.test.ts` when introducing new markdown patterns in catalog copy (prefer extending the subset over new per-surface HTML).

## Reference implementation

- Spell descriptions — `SpellsView.tsx`
- Class Features / feats — `CombatView.tsx`, `FeatPickDescription.tsx`
- Magic items / gear — `EquipmentCatalogPicks.tsx`, `GenericVariantDescription.tsx`
- Shared reference layout — `CombatReferenceOptions.tsx`

## Tests

```bash
npm test -- src/domain/parseCatalogProse.test.ts
npm run build
```