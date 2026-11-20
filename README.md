# Ragusa

Baseline forked from rpg-dm-player-toolset (D&D 5.5e character generator), being evolved toward a social-network feel.

## Original README

# D&D 5.5e (2024) Character Generator — Draft v1

A browser-based tool for building a level-1 D&D 2024-rules character: class, background, species, ability scores, skills, weapons, armor, alignment, and spellcasting where applicable. Produces a live on-screen sheet and a Markdown export.

This is a client-only app for building characters. Rules data (species, classes, spells, feats, items, and catalog display strings) loads at startup from Supabase `get_catalog()` using the anon key. There is no bundled catalog fallback.

Authoring copies for re-seeding the database live under `catalog-source/` (generated JSON, equipment stat tables, species feature catalog, and locale catalog Markdown). The running app never imports that tree.

## Prerequisites

- Node.js 20+ and npm. If you don't already have npm (e.g. only a bare `node` binary is installed), the easiest path is [nvm](https://github.com/nvm-sh/nvm):

  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  # open a new shell, or:
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  nvm install --lts
  ```

- A Supabase project with the catalog migration applied (`supabase/migrations/20261031120000_catalog.sql`) and rows seeded (`npm run seed:catalog`).

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (and service role for seed:catalog)
```

Apply library migrations in `supabase/migrations/` (including `20261104180000_homebrew_items.sql`) to your Supabase project, then deploy the library Edge Function so campaigns, characters, and custom items persist:

```bash
npx supabase functions deploy library --remote=<project-ref> --yes
```

When `VITE_SUPABASE_*` is set, the app calls that function; without it, the in-memory library stub is used instead.

Refresh local authoring data from Open5e adapters when needed:

```bash
npm run fetch:data
npm run seed:catalog   # requires SUPABASE_* in .env.local
```

## Run locally

```bash
npm run dev
```

Open the printed URL (defaults to http://localhost:5173). The root URL is a **welcome hub**; the character generator lives under `/character` (with views such as `/character/overview`, `/character/vitals`, and `/character/actions`). Campaign mode at `/campaign` loads an in-memory party roster from character JSON files.

The first visit asks for an email on `/login` so Character and Campaign can load and save data for that address on this device. Email is not verified yet (no sign-in link is sent).

### Navigation

- **`/`** — welcome hub with shortcuts to Character and Campaign
- **`/character`** — character builder (form)
- **`/character/equipment`**, **`/character/spells`**, **`/character/overview`**, **`/character/vitals`**, **`/character/actions`** — other character views (`/character/combat` redirects to Vitals)
- **`/campaign`** — party roster (load character JSON; overview stats and attributes with default skills per member)

On desktop, a left sidebar lists modes and character views (Notion-style). On mobile, the sidebar is an overlay drawer; character views also appear as compact chips for one-tap switching at the table.

## Other commands

```bash
npm run build     # type-check and build a production bundle to dist/
npm run preview   # serve the production build locally
npm test          # run the Vitest unit test suite
npm run lint      # run ESLint
npm run cap:sync  # build web assets and sync into the Android project
npm run android   # cap:sync, then run on a connected device or emulator
```

## Android sideload APK

The same Vite app ships inside a Capacitor Android wrapper (`appId`: `app.playertoolset.sheet`). Phase 2 stops at a **signed release APK** for sideloading to friends — not a Play Store listing.

### Prerequisites

- Android Studio (SDK, platform-tools) or the standalone Android SDK
- JDK compatible with the Android Gradle Plugin in `android/`
- `android/local.properties` with `sdk.dir=...` (machine-specific; gitignored)

### Debug build (development)

```bash
npm run android
```

Or open the `android/` folder in Android Studio and Run.

### Release keystore and signed APK

1. Generate a release keystore (once; keep backups):

   ```bash
   keytool -genkeypair -v \
     -keystore release.keystore.jks \
     -alias playertoolset \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Copy `android/keystore.properties.example` to `android/keystore.properties` and set paths/passwords. Place the `.jks` file where `storeFile` points (for example next to `android/keystore.properties`).

3. Build a release APK:

   ```bash
   npm run cap:sync
   cd android && ./gradlew assembleRelease
   ```

   Output: `android/app/build/outputs/apk/release/app-release.apk`

**Never commit** `*.jks`, `keystore.properties`, or `android/local.properties` (all gitignored).

### Install on a device

- Enable **Install unknown apps** for the file manager or browser you use.
- **USB:** `adb install android/app/build/outputs/apk/release/app-release.apk`
- **Copy to phone:** transfer the APK (email, Drive, cable) and open it on the device.

### On-device data

- Character and campaign roster autosave **on the device only** (IndexedDB on web; Capacitor Preferences on Android). Nothing is uploaded to a server.
- Both PDF sheet templates (`en` and `pt-BR`, ~28 MB total) are bundled in the APK so filled PDF export works offline at the table.

### Sideload vs Play Store

A sideload APK and a future Play Store install are **different signing channels**. Android will not upgrade one into the other in place — uninstall the sideload build before installing from Play (when that exists).

### Manual device verification (Phase 2)

After installing a release or debug APK:

1. Kill the app from recents → reopen → last character **and** last campaign roster restore independently.
2. Character **Load** (replace confirm) vs Campaign **Add Character** (multi-file append).
3. **Save** / **Download Markdown** / **Download PDF** open the Android Share sheet.
4. Hardware **Back**: close an open dialog → close the nav drawer → minimize the app (does not walk routes).
5. Combat → **Keep screen on** toggle: screen stays awake while Combat is visible; releases on tab change or app pause.
6. Notch / gesture nav: toasts sit above the system bar (safe-area padding).

## Project structure

- `src/data/` — static rules data (generated JSON + types) and lookup helpers
- `src/domain/` — pure calculation functions (modifiers, skills, saving throws, HP, spellcasting, Markdown export)
- `src/state/` — character state (reducer) and React context
- `src/components/form/` — the input form (class/background/species/alignment, ability scores, skills, weapons, armor, backstory)
- `src/components/sheet/` — the live character sheet and Markdown export
- `scripts/` — the Open5e data ingest script and its per-entity adapters (dev-time only, not part of the app bundle)
- `src/i18n/` — locale context; messages load from Supabase `catalog_strings` via `get_catalog()`
- `src/testSupport/uiStrings.fixture.json` — snapshot of UI strings for unit tests (generated from **dnd55-data**)

## Internationalization

On-screen copy and catalog display strings live in Supabase **`catalog_strings`**, authored in the **dnd55-data** repo (`ui-locales/` for UI chrome, seeds for entity names and glossary). The app calls `get_catalog()` at boot; `t("app.tab.party")` resolves to rows with `entity_type = ui`.

To change UI wording: edit `dnd55-data/ui-locales/{en|pt-BR}/*.md`, run `python3 scripts/catalog_strings/generate_ui_strings.py`, apply `supabase/seed/044_ui_strings.sql` (see `scripts/catalog_strings/apply_ui_strings_seed.sh`).

### Fallback and defaults

- Missing keys fall back to English, then to an explicit fallback passed to `t()`, then to the key string.
- Default language: saved preference in `localStorage`, else `navigator.language`, else `en`. Supported locales: `en`, `pt-BR`.

## Known limitations (v1 draft)

- Level 1 only — no level advancement or multiclassing.
- Spell selection and slot tracking live on the Spells tab (cantrips and 1st-level spells only). Overview still shows a compact spellcasting summary.
- Feats are limited to what Open5e's free 2024 SRD slice includes (17 feats); some well-known PHB feats (e.g. Tough) aren't available.
