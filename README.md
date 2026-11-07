# saveour.day

Brand identity: [logo variants and usage guidelines](assets/brand/README.md),
[preview of light and dark versions and animations](assets/brand/index.html).
You can regenerate the files with `npm run build:brand`.

A platform for creating and managing invitations for different types of events. Clients choose a starter template (such as a wedding, birthday, or company event) or a blank draft, then create invitations for individuals or families. The template can be changed later after confirming a reset; a backup of the previous saved draft is available for restoration. Publishing commits a version to the database without a separate build. Access can be public, protected by a code, or authenticated through an email OTP; the dashboard collects RSVPs for individual guests and events.

For an overview of the dashboard and the new data structure, see [Content editor](docs/EDYTOR-TRESCI.md).

## Applications

- `apps/site` — a Next.js application serving all client sites, guest authentication, protected media, and RSVPs.
- `apps/admin` — a Next.js dashboard for administrators and clients.
- `packages/domain` — the Zod schema, data validation, and demo data.
- `packages/renderer` — a shared React/Mantine renderer used by the site and the dashboard preview.
- `supabase/migrations` — the database, RLS policies, and versioning procedures.

Use Node.js 24 (as in CI) and npm 11 for development. `npm ci` installs the versions recorded in the lockfile.

## Running locally

```powershell
npm.cmd ci
Copy-Item apps/admin/.env.example apps/admin/.env.local
Copy-Item apps/site/.env.example apps/site/.env.local
npm.cmd run dev
```

To run the dashboard separately, use `npm.cmd run dev:admin`. The guest application runs at `http://127.0.0.1:5173`, and the dashboard at `http://127.0.0.1:3000`. Fill in the `.env.local` files according to the [deployment guide](docs/WDROZENIE-PLATFORMY.md).

Without configuring Supabase, you can try the dashboard at `http://127.0.0.1:3000/demo` and invitations at `http://127.0.0.1:5173/demo/glowna`, `/demo/pelna`, and `/demo/ograniczona`. The dashboard demo simulates publishing locally; it does not save anything to the database.

To convert data from the previous site into local JSON, run:

```powershell
npm.cmd run import:legacy -- "Imię 1" "Imię 2"
```

The script reads the legacy `VITE_CONFIG_*` variables from the root `.env.local` file and creates a local `.local/legacy` directory ignored by Git. It does not save client sites to Supabase. The dashboard supports JSON export but has no import form: the output is intended as a source for transferring content or for a separate data migration. The photo must be added through the media library and assigned in the configuration. The current runtime does not use `SITE_CONFIG`; the legacy importer's message about this variable is not an instruction for running the application.

## Quality checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run build:admin
npm.cmd run test:e2e
```

Tests cover SQL/RLS in PGlite, variant isolation, guest access and RSVPs, dashboard interfaces, and viewports from 320 to 1920 px. Browser form tests use controlled HTTP responses; actual SMTP and Storage require verification in staging.

CI also tests the actual API handlers using controlled Supabase HTTP responses and a cookie store. The `build:demo` script name is retained for CI compatibility — the script now builds the full `apps/site` Next.js application.

`npm.cmd run build` builds the shared Next.js application without client data. Configuration is fetched only at runtime after authorization. Demos are publicly available at `/demo/glowna`, `/demo/pelna`, and `/demo/ograniczona`. Missing service configuration does not cause a demo site to be served at a client's URL.

Before entering secrets in Vercel, you can check that they are complete without displaying their values:

```powershell
npm.cmd run check:production-env -- apps/admin/.env.production.local
npm.cmd run check:production-env -- --site apps/site/.env.production.local
```

## Deployment

All Supabase migrations from the repository and your own SMTP service are required. Repository changes and local tests do not mean that remote migrations have been applied or that a production deployment has taken place.

## Documentation

- [Configurator interface](docs/KONFIGURATOR-INTERFEJS.md) — Focus × Paper, mobile layout, preview scaling, and view preferences.

- [Starter templates](docs/SZABLONY-STARTOWE.md) — selection, reset, draft backups, and compatibility with older invitations.

- [Self-hosted deployment checklist](docs/CHECKLISTA-WDROZENIA.md) — what to prepare, where to enter settings, and how to verify the deployment.

- [Architecture](docs/ARCHITEKTURA.md) — modules, data model, publishing, permissions, and limitations.
- [Technical decisions](docs/DECYZJE-TECHNICZNE.md) — adopted solutions, their rationale, and consequences.
- [Platform deployment](docs/WDROZENIE-PLATFORMY.md) — service configuration, migration of legacy client sites, and staging verification.
- [Product review improvements](docs/product-review-improvements.md) — autosave, guest management, RSVP questions, reminders, and staging testing.
- [Publishing self-review](docs/SELF-REVIEW-PUBLIKACJI.md) — a dated record of the completed review and its limitations.

