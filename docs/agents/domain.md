# Domain Documentation Configuration

This repository uses a **single-context** domain model layout:

- **Canonical Glossary**: [`GLOSSARY.md`](../../GLOSSARY.md) at the repository root.
- **Architecture Decision Records (ADRs)**: [`docs/adr/`](../adr/) (`0001` through `0006`).
- **Architecture Overview**: [`docs/ARCHITEKTURA.md`](../ARCHITEKTURA.md) and [`docs/DECYZJE-TECHNICZNE.md`](../DECYZJE-TECHNICZNE.md).

## Consumer Rules for Agents
1. Read `GLOSSARY.md` before designing modules, writing specs, or naming symbols.
2. Do not re-litigate decisions recorded in `docs/adr/` unless explicitly asked by the user.
3. Update `GLOSSARY.md` inline whenever a new domain concept is introduced or sharpened.
