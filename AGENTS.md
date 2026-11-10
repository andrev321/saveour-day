# Agent Instructions (`saveour-day`)

## Navigation Pointers
- **Domain Glossary**: Read [`GLOSSARY.md`](./GLOSSARY.md) first for canonical terminology (**Site**, **Draft**, **Release**, **Variant**, **Variant Projection**, **Invitation**, **Guest**, **Media Asset**, **Crop**).
- **Architecture & Decisions**: See [`docs/ARCHITEKTURA.md`](./docs/ARCHITEKTURA.md), [`docs/DECYZJE-TECHNICZNE.md`](./docs/DECYZJE-TECHNICZNE.md), and structured ADRs in [`docs/adr/`](./docs/adr/).
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
