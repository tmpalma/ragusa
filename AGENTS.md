# Agent instructions

Guidance for AI agents working in this repository.

## Domain skills

When implementing or extending **feat mechanics** (choices, spell grants, per-rest tracking, Magic Initiate–style features), read and follow `.cursor/skills/extend-feat-mechanics/SKILL.md` first.

When implementing or extending **class level-up, subclass choice, multiclass level path, or class/subclass feature effects** (level caps, L3 features, subclass pickers, always-prepared oath spells, skill grants from features, spell progression at new levels, combat limited uses, TableRules policy), read and follow `.cursor/skills/extend-class-level-mechanics/SKILL.md` first.

When implementing **base-class feature option pickers** (Divine Order, Primal Order, and similar L1 forks with weapon/armor/cantrip/skill effects), read and follow `.cursor/skills/extend-class-feature-choices/SKILL.md` first.

When **searching the catalog**, or when a **catalog or catalog-string change** is needed or recommended, read and follow `.cursor/skills/catalog-data/SKILL.md` first (lookups via Supabase; row and string edits in **dnd55-data**, not this repo).

When **transcribing 2024 SRD mechanics from a local 5etools dump** (class features, beasts, spells, feats), read and follow `.cursor/skills/extract-srd-from-5etools/SKILL.md` first.

When implementing **capped unique catalog picks** (Wild Shape known forms, prepared/known/spellbook spells, or similar choose-N-distinct-keys lists), read and follow `.cursor/skills/extend-capped-catalog-picks/SKILL.md` first.

When adding or changing **generic variants, Armory rows, shared attunement, magic ammunition, or Armory combat overlays**, read and follow `.cursor/skills/extend-armory/SKILL.md` first.

When wrapping player-facing **info blocks in collapsible panes** (Combat columns, Special Traits, Class Features, spell-level descriptions, or similar hide-this-section UI), read and follow `.cursor/skills/extend-collapsible-panes/SKILL.md` first.

When changing **OverviewHeaderStats**, the shared identity line, top combat stat grid, or spacing between them (Overview tab and Campaign party panes), read and follow `.cursor/skills/extend-overview-header/SKILL.md` first.

When changing **Overview tab layout**, sheet section order, player-facing sheet copy, or glossary speed-type labels, read [`docs/overview-sheet.md`](docs/overview-sheet.md) first.

## Dev server lifecycle

If you start the Vite dev server (`npm run dev`) to run tests, verify UI changes, or debug in the browser, **always shut it down when you are done**. Do not leave background dev servers running after the task completes.

Before finishing:

1. Stop the process (for example, kill the `npm run dev` / `vite` process you started).
2. Confirm port 5173 (or whichever port you used) is no longer in use.

This applies even when verification is inconclusive or browser automation is unavailable.
