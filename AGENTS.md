# Agent Instructions (`saveour-day`)

## Navigation Pointers

- **Domain Glossary**: Read [`GLOSSARY.md`](./GLOSSARY.md) first for canonical terminology (**Site**, **Draft**, **Release**, **Variant**, **Variant Projection**, **Invitation**, **Guest**, **Media Asset**, **Crop**).
- **Architecture & Decisions**: See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/TECHNICAL-DECISIONS.md`](./docs/TECHNICAL-DECISIONS.md), and structured ADRs in [`docs/adr/`](./docs/adr/).
- **Coding Standards**: See [`CODING_STANDARDS.md`](./CODING_STANDARDS.md) during review and refactoring.
- **Package Boundaries**: Packages are deep modules—see [`packages/README.md`](./packages/README.md) before adding or importing across packages.

## Agent Skills

### Issue tracker

Issues and implementation slices are tracked in `.scratch/tickets/` (local markdown) or GitHub Issues. See [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md).

### Domain docs

Single-context domain model at [`GLOSSARY.md`](./GLOSSARY.md) and [`docs/adr/`](./docs/adr/). See [`docs/agents/domain.md`](./docs/agents/domain.md).

## Verification Commands

- Iterate with targeted runs: `npm test`, `npx playwright test <spec> --project=chromium`, `npm run typecheck`.
- Fast full check (parallel, cached format/typecheck/lint/boundaries/unit tests): `npm run check`. Its ESLint cache can miss type-aware errors in unchanged callers; `lint` (uncached) is what CI runs.
- Before pushing, mirror CI: `npm run check:ci` = `check:static:ci` (audit, uncached lint, Deno check) + `test:e2e:ci` (production builds, `next start`, Chromium + WebKit, `CI=1`). Stop any local `next dev` first. For a quick WebKit pass: `npm run test:e2e:ci -- --project=webkit`.
- On Windows, run any Playwright command outside the sandbox (`BypassSandbox: true`): the sandbox blocks loopback connections to `127.0.0.1` needed by Playwright's `webServer`.
- `tests/media-concurrency.test.ts` is skipped unless `TEST_DATABASE_URL` points at Postgres 17 (CI sets it up as a service).

## Environment (Windows)

- Search with `git grep` (`rg` is not installed).
- Git network and `.git/` write operations (`git pull`, `git commit`, `git push`) require `BypassSandbox: true`; keep `git commit` and `git push` sequential because `.githooks/pre-commit` runs `typecheck` and `lint:boundaries`.
- For Vercel operations (deployments, logs, env, projects, domains), use the `vercel` CLI with `BypassSandbox: true` (it reads `%APPDATA%\com.vercel.cli` and accesses the network).
