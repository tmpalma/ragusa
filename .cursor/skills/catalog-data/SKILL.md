---
name: catalog-data
description: >-
  Look up D&D catalog rows and catalog_strings only via Supabase PostgREST.
  Hand off every catalog row or string change to dnd55-data — never edit
  catalog-source, adapters, or locale catalog markdown in this repo. Use when
  searching the catalog, verifying keys, planning catalog fixes, or changing
  names, descriptions, glossary labels, or pt-BR/en catalog copy.
---

# Catalog data (ragusa, formerly rpg-dm-player-toolset)

Read this skill before **looking up** catalog content or **planning** any catalog change (rows or display strings).

For **string-only** seed SQL shape and `catalog_strings` column mapping in **dnd55-data**, also read `/home/thiago/code/dnd55-data/.cursor/skills/catalog-strings/SKILL.md` when drafting handoff SQL.

## Repos and roles

| Repo | Role |
|------|------|
| **dnd55-data** (`/home/thiago/code/dnd55-data`) | Source of truth for catalog rows and `catalog_strings` — `supabase/seed/*.sql`, migrations |
| **ragusa** (this repo, formerly rpg-dm-player-toolset) | App mechanics, types, UI; loads catalog at runtime from Supabase only |

## Lookups — Supabase only

The **live catalog** is the Supabase project configured in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Query **PostgREST** with the anon key (select-only). Prefer **filtered** reads on individual tables rather than downloading the full payload:

| Table | Typical filters |
|-------|-----------------|
| `magic_items` | `key=eq.…`, `data->>name` via `ilike` on `key` |
| `spells`, `feats`, `weapons`, `armor`, `languages`, … | `key`, `srd`, `book` columns where present |
| `catalog_strings` | `entity_type`, `entity_key`, `field`, `locale` |

Schema reference: [`supabase/migrations/20261031120000_catalog.sql`](../../supabase/migrations/20261031120000_catalog.sql).

Example (shell, after loading env from `.env.local`):

```bash
curl -s "${VITE_SUPABASE_URL}/rest/v1/spells?key=eq.fireball&select=key,data" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}"
```

Use `ilike` / `eq` as needed. Call `get_catalog()` only when no narrower PostgREST query can answer the question.

### Never use as catalog source (any scenario)

Do **not** grep, read, or cite these as authority for “what is in the catalog”:

- `catalog-source/**`
- `scripts/adapters/*.json` and adapter TS that only feeds seeds
- Any generated JSON under `catalog-source/generated/`
- `catalog-source/locales/**/catalog/*.md`

You **may** still read **this repo** for:

- App code, types, domain mechanics (`src/**`)
- Test fixtures that mirror catalog shape for unit tests (including [`src/testSupport/uiStrings.fixture.json`](../../src/testSupport/uiStrings.fixture.json), generated from **dnd55-data** — not an authoring source)

### Security

- Do **not** print or commit `SUPABASE_SERVICE_ROLE_KEY`.
- Use the anon key from `.env.local` only for read queries during investigation.

## Changes — not in this repository

Do **not** add or edit catalog entity rows or `catalog_strings` in this repo.

Do **not** run `npm run fetch:data` or `npm run seed:catalog` to **land** catalog content here.

Every insert or update of catalog rows or `catalog_strings` is a **new** numbered seed SQL file in `/home/thiago/code/dnd55-data/supabase/seed/` (pick the next `NNN_*` after `ls supabase/seed/*.sql`). Do **not** add that seed script, or the rows it contains, in **rpg-dm-player-toolset** (`scripts/adapters`, `catalog-source`, hand-written catalog JSON, or editing `src/data/__fixtures__` by hand to author rules).

When a task **requires or recommends** a catalog change, the **plan and handoff** must include a dedicated section, for example:

```markdown
## Catalog changes (dnd55-data — not this repo)

Apply in `/home/thiago/code/dnd55-data`:

- … concrete row or `catalog_strings` change …
- New seed file: `supabase/seed/NNN_description.sql` (pick next numeric id)
```

Work in **this repo** only on mechanics that **consume** the catalog (`FeatDefinition`, class feature effects, pickers, combat overlays, etc.).

## Strings — same handoff as rows (including UI chrome)

**Never** add or edit display copy in this repository. That includes:

- `catalog_strings` rows (entity names, glossary, equipment UI labels like `equipment..gearSearch`)
- On-screen UI copy (formerly `src/locales/{locale}/*.md`) — now **`entity_type = ui`** rows in **dnd55-data**
- `catalog-source/locales/**` markdown

All of the above live in **`/home/thiago/code/dnd55-data`**:

| Copy kind | Author in dnd55-data | Generate / apply |
|-----------|----------------------|------------------|
| UI chrome (`t("app.tab.party")`, `equipment.*`, …) | A **new numbered seed file** `supabase/seed/NNN_<topic>_ui.sql`, with rows `('ui', <namespace>, <field>, locale, text)` | Hand-written idempotent upsert (`on conflict … do update`), the same pattern as `055`–`062`. `044_ui_strings.sql` is the original bulk seed: don't edit it. Override its rows from a newer file instead. |
| Catalog entity / glossary strings | seeds or generator scripts per domain | upsert SQL in `supabase/seed/` |
| Small equipment chrome (`customItems`, `gearSearch`) | `catalog_strings` with `entity_type = equipment`, empty `entity_key` | same seed workflow |

There is no `ui-locales/` folder or UI-string generator script in dnd55-data. Write the seed SQL directly.

- **Keys:** the runtime key is `<namespace>.<field>`, and `field` may contain dots (`('ui', 'app', 'campaign.items.export', …)` → `app.campaign.items.export`).
- **Interpolation:** single braces, `{count}`. Before adding a key, grep the existing seeds so it doesn't collide.
- **Escaping:** escape `'` as `''`.

**Applying a seed** is a write to the shared Supabase project, so do it only with the user's OK. Run the file in the dashboard SQL editor, or with `psql "$DATABASE_URL" -f supabase/seed/NNN_….sql`. dnd55-data has no apply script.

The app loads UI strings from `get_catalog()` only. After a seed is applied, refresh [`src/testSupport/uiStrings.fixture.json`](../../src/testSupport/uiStrings.fixture.json) if tests depend on the new keys.

Whenever **new** `catalog_strings` rows are added, follow **dnd55-data** [.cursor/skills/catalog-strings/SKILL.md](/home/thiago/code/dnd55-data/.cursor/skills/catalog-strings/SKILL.md): seed **both** `en` and `pt-BR` with the **same English text**; Portuguese translation is a later pass.

Work in **this repo** on mechanics and `t()` **keys** only; optional English fallbacks passed as the third argument to `t()` / `tEntity()` are last-resort literals, not a second catalog.

## Related skills

After catalog handoff is clear, use domain skills for app work only:

- Feats: `.cursor/skills/extend-feat-mechanics/SKILL.md`
- Classes / subclasses: `.cursor/skills/extend-class-level-mechanics/SKILL.md`
- 5etools transcription → catalog rows live in **dnd55-data**; domain encoding stays here — see `.cursor/skills/extract-srd-from-5etools/SKILL.md`
