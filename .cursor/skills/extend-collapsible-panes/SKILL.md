---
name: extend-collapsible-panes
description: Wraps player-facing info blocks in CollapsiblePane (details/summary) in rpg-dm-player-toolset. Use when adding collapsible or accordion sections, hiding Combat or tab info, or matching action-column collapse behavior.
---

# Extend collapsible panes (rpg-dm-player-toolset)

Read this skill when turning a **block of information** into a collapsible pane so the player can hide unused UI.

## When to use

| Use this skill | Use something else |
|----------------|-------------------|
| Combat/Spells/tab **sections** (Special Traits, Class Features, spell-level descriptions, action columns) | Individual feature/spell **cards** — do not wrap each card |
| Magic Item / Adventuring Gear description panes; nested `equipment.armoryDescriptions` inside Armory | Armory outer block (static bordered section, not collapsible); Eldritch Invocations (pick list **inside** Class Features — not its own pane) |
| New “same as the action columns” collapse | Character **level** panes in `ClassSection` (controlled open + revert in the summary) |
| Nested groups inside an already-collapsible column | A new accordion library or `useState` open/closed besides `CollapsiblePane` |
| Inner **description prose** (`**bold**`, lists in spell/feat copy) | `.cursor/skills/render-catalog-prose/SKILL.md` (`CatalogProse`) |

## Pattern

| Layer | Location | Convention |
|-------|----------|------------|
| UI | `src/components/CollapsiblePane.tsx` | Native `<details>` / `<summary>`; caption then `(+)` / `(-)` indicator (collapsed / expanded), optional `summaryActions` on the far right (e.g. Remove); default **open** |
| CSS | `src/components/CollapsiblePane.module.css` | Closed pane hides all non-summary children |
| Nested | `variant="nested"` | Combat action subsections (Spells / Attacks / Actions) |
| Copy | locale keys for the **summary title** | Do not hardcode English in the pane title |

### Checklist

1. **Wrap existing inner content** — do not restructure cards; only the outer block becomes a pane.
2. **Use `CollapsiblePane`** — do not copy Combat `<details>` markup or add an accordion package.
3. **Default open** — collapse lives in component state only; do not persist on the character unless the user asks.
4. **Titles** — add keys in `src/locales/en/` and `src/locales/pt-BR/` (same heading id in both files).
5. **Spell descriptions** — one pane **per catalog spell level that has at least one** known/prepared/granted spell; no empty slot-level panes.

## Reference implementation

- Combat columns and nested subsections — `ActionColumn` in `CombatView.tsx`
- Special Traits / Class Features — `CombatView.tsx`
- Spell Descriptions by level — `SpellsView.tsx`
- Armory bordered section (static `h3`) + nested collapsible `equipment.armoryDescriptions` — `ArmorySection.tsx`
- Magic Item Descriptions / Adventuring Gear Descriptions — `MagicItemsSection`, `AdventuringGearSection` in `EquipmentCatalogPicks.tsx`
