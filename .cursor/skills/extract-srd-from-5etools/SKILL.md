---
name: extract-srd-from-5etools
description: Transcribes 2024 SRD mechanics from a local 5etools dump — catalog rows in dnd55-data, domain behavior in rpg-dm-player-toolset. Use when adding class features, beasts, spells, or feats sourced from 5etools rather than Open5e.
---

# Extract SRD from 5etools (rpg-dm-player-toolset)

Read this skill before transcribing rules from a local **5etools** install. Do **not** restate SRD prose in code comments.

Read `.cursor/skills/catalog-data/SKILL.md` first: **catalog rows and strings** go to **dnd55-data**; **domain mechanics** go to `src/domain/*` and tests in this repo. Do not transcribe into `scripts/adapters/*` or run `fetch:data` to land catalog content here.

## Local dump location

Expected path on the developer machine:

```
$HOME/Downloads/5etools-v2.35.0
```

This path is **host-specific** and must **never** be read at runtime or in CI. Use it only as a **reference** while authoring **dnd55-data** seed SQL and while encoding behavior in this repo.

## File map

| Content | 5etools path |
|---------|--------------|
| Class features | `data/class/class-{class}.json` → `classFeature[]` |
| Subclass features | same file → `subclassFeature[]` |
| Beasts (2024) | `data/bestiary/index.json` → `"XMM"` → `bestiary-xmm.json` → `monster[]` |
| Spells | `data/spells/spells-xphb.json` (and index) |
| Feats | `data/feats/feats-xphb.json` (and index) |
| Conditions | `data/conditionsdiseases.json` → `condition[]` |
| Magic items (common/uncommon) | `data/items.json` → `source: "XDMG"`, rarity common/uncommon; stamp `srd` from `srd52` |
| Generic magic variants | `data/magicvariants.json` → `type: "GV|XDMG"`, `inherits.source` `XDMG` or `EFA`; stamp `srd` from `inherits.srd52`, `book` from `inherits.source`. **Do not skip** ammunition-only `requires` — extract with `appliesTo: "ammunition"` (see `.cursor/skills/extend-armory/SKILL.md`) |
| Adventuring gear / tools | `data/items.json` + `data/items-base.json` → `source: "XPHB"`, truthy `srd52`, types G/AT/INS/T/GS/FD/SCF/TAH |

Skip `fluff-*` files for mechanics. Skip `edition: "classic"` / `source: "PHB"` entries when a 2024 `XPHB` reprint exists in the same file.

## 2024 SRD filters

Prefer entries with:

- `source: "XPHB"` or `source: "XMM"` (2024 books)
- `srd52: true` (SRD 5.2)
- `basicRules2024: true` when present

Do **not** use 2014 `srd` / `basicRules` flags on `bestiary-mm.json` for new 2024 mechanics.

## Catalog origin (persist on every entity)

When transcribing into **dnd55-data**, **always** stamp on the row (and in seed SQL):

- `srd`: from `srd52` (or Open5e `srd-2024` slice → `true`)
- `book`: from 5etools `source` (print book key, e.g. `XPHB`, `EFA`) — not Open5e `document.key`

If the entity's `source` is **not** already in the `books` table, add a book row in **dnd55-data** first (`key`, `name`, `ruleset`, optional `srdPublication`).

Verify existing books and keys via Supabase (catalog-data skill), not files under `catalog-source/`.

## Wild Shape beast eligibility (L2)

When extracting Known Forms beasts from `bestiary-xmm.json`:

| Filter | Rule |
|--------|------|
| Type | `type === "beast"` or `type.type === "beast"` |
| SRD | `srd52 === true` |
| CR | `"0"`, `"1/8"`, or `"1/4"` |
| Fly | no `speed.fly` key |
| Swarm | exclude `type.swarmSize` or swarm in name |

Recommended defaults: Rat, Riding Horse, Spider, Wolf.

## Transcription workflow

1. Locate the canonical XPHB/XMM entry in 5etools JSON.
2. **Catalog (dnd55-data)** — Add or update seed SQL for the entity row(s) and `catalog_strings` (en + pt-BR when introducing new keys). Plan must call this out explicitly.
3. **Verify** — Query Supabase (PostgREST) for the new keys; do not rely on `catalog-source/` JSON.
4. Encode runtime behavior in `src/domain/*` and `src/state/characterState.ts`; add tests.
5. For class features with limited uses / combat cards, also read `.cursor/skills/extend-class-level-mechanics/SKILL.md`.

## What not to do

- Do not add `~/Downloads/5etools-*` as a dependency of `fetch:data` or the app build.
- Do not paste full 5etools `entries` arrays into catalog `desc` fields — keep descriptions short; mechanics live in types and domain code.
- Do not commit the 5etools dump into this repository.

## Reference implementation

Wild Shape beasts: `beasts` catalog rows in **dnd55-data**; eligibility filters in this skill’s Wild Shape table.

Wild Shape form state and combat overlay: `src/domain/wildShape.ts`, `src/state/characterState.ts`.
