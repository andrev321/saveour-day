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

- Full check (typecheck + lint + boundaries + unit tests): `npm run check`
- Typecheck only: `npm run typecheck`
- Unit & integration tests: `npm test`
- Module boundary check: `npm run lint:boundaries`
- E2E tests (Chromium): `npm run test:e2e:chromium` (on Windows, run outside the sandbox / with `BypassSandbox: true`, because the sandbox blocks loopback connections to `127.0.0.1` needed by Playwright's `webServer`)

## Environment (Windows)

- Search with `git grep` (`rg` is not installed).
- Git network and `.git/` write operations (`git pull`, `git commit`, `git push`) require `BypassSandbox: true`; keep `git commit` and `git push` sequential because `.githooks/pre-commit` runs `typecheck` and `lint:boundaries`.
