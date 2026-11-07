# saveour.day

Create and manage event invitations with customizable templates, guest management, and RSVP tracking.

Organizers start with an event template or a blank draft, customize content and appearance, and publish invitations for individuals or households. Access can be public, protected by a shared code, or verified by email OTP. Content publication updates the database without rebuilding the application.

## Staging

| Application | URL |
| --- | --- |
| Admin panel | https://example-admin-staging.example.com |
| Guest invitations | https://example-site-staging.example.com |

Staging may require Vercel authentication. See [staging operations](docs/STAGING-OPERATIONS.md) for deployment checks and URL configuration, and [staging history](docs/STAGING-STATUS.md) for recorded acceptance limits.

## Run locally

Use **Node.js 24 and npm 11**. Install from the repository root:

```sh
npm ci
```

Copy `apps/admin/.env.example` to `apps/admin/.env.local` and `apps/site/.env.example` to `apps/site/.env.local`. Configure services using the [deployment checklist](docs/CHECKLISTA-WDROZENIA.md). Start each app in its own terminal:

```sh
npm run dev
npm run dev:admin
```

- Guest application: http://127.0.0.1:5173
- Admin panel: http://127.0.0.1:3000

In Windows PowerShell, use `npm.cmd` if execution policy blocks `npm`; use `Copy-Item` to copy the example files.

Without Supabase, try the local admin at `http://127.0.0.1:3000/demo` and guest demos at `http://127.0.0.1:5173/demo/glowna`, `/demo/pelna`, and `/demo/ograniczona`. Admin demo data is temporary; simulated publication does not write to the database. Missing service settings never replace a real client's route with demo data.

## Repository map

| Path | Purpose |
| --- | --- |
| `apps/admin` | Organizer panel |
| `apps/site` | Guest invitations, authentication, media, and RSVP |
| `packages/domain` | Schema v3, validation, templates, themes, and guest projection |
| `packages/renderer` | Shared invitation renderer |
| `packages/ui` | Branding and shared UI infrastructure |
| `supabase/migrations` | Database schema, permissions, and lifecycle operations |
| `tests` | Unit, integration, browser, and staging checks |

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run build:admin
npm run test:e2e
```

See [Testing](docs/TESTING.md) for browser installation, isolated PostgreSQL checks, CI, and staging smoke tests. Automated mocks do not verify real email delivery.

## Documentation

Start with the [documentation index](docs/README.md), or go directly to:

- [Architecture](docs/ARCHITEKTURA.md) and [technical decisions](docs/DECYZJE-TECHNICZNE.md)
- [Content editor](docs/EDYTOR-TRESCI.md), [interface](docs/KONFIGURATOR-INTERFEJS.md), and [editing/guest workflows](docs/product-review-improvements.md)
- [Starter templates](docs/SZABLONY-STARTOWE.md) and [themes/palettes](docs/MOTYWY-I-PALETY.md)
- [Deployment checklist](docs/CHECKLISTA-WDROZENIA.md), [migration/acceptance guide](docs/WDROZENIE-PLATFORMY.md), and [retention/media lifecycle](docs/USUWANIE-REALIZACJI.md)

Existing document filenames are retained so older links keep working; their content is in English.

## Brand assets

[Brand kit and usage](assets/brand/README.md) · [light/dark/animation preview](assets/brand/index.html)

Regenerate with `npm run build:brand`.

## Legacy data conversion

```sh
npm run import:legacy -- "Name 1" "Name 2"
```

This reads legacy `VITE_CONFIG_*` values from the root `.env.local` and creates local JSON in Git-ignored `.local/legacy`. It does not write to Supabase. The panel exports JSON but has no JSON import form; use the output as a migration source. Add photos through the media library and assign them in the configuration. The current runtime does not use `SITE_CONFIG`; legacy importer messages mentioning it are not startup instructions.
