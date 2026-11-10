# Documentation

## Start here

| Task | Guide |
| --- | --- |
| Install and run locally | [Root README](../README.md) |
| Understand the system | [Architecture](ARCHITEKTURA.md) |
| Understand design choices | [Technical decisions](DECYZJE-TECHNICZNE.md) |
| Configure a new environment | [Deployment checklist](CHECKLISTA-WDROZENIA.md) |
| Migrate or validate a release | [Deployment](WDROZENIE-PLATFORMY.md) |
| Run checks and staging smoke | [Testing](TESTING.md) |
| Provision production and release manually | [Production operations](PRODUCTION-OPERATIONS.md) |
| Manage staging addresses/deploys | [Staging operations](STAGING-OPERATIONS.md) |

## Product behavior

- [Content editor and schema v3](EDYTOR-TRESCI.md)
- [Editor interface and accessibility](KONFIGURATOR-INTERFEJS.md)
- [Autosave, guests, RSVP, and reminders](product-review-improvements.md)
- [Starter templates and sample photos](SZABLONY-STARTOWE.md)
- [Themes and palettes](MOTYWY-I-PALETY.md)
- [Site deletion, retention, and media lifecycle](USUWANIE-REALIZACJI.md)
- [Brand kit](../assets/brand/README.md)

## Verification records and design history

- [Where to keep staging verification records](STAGING-STATUS.md)
- [Publication self-review — 2026-09-22](SELF-REVIEW-PUBLIKACJI.md)
- [Earlier theme previews](../assets/theme-previews/README.md)
- [Theme design exploration](../assets/theme-redesign/README.md)
- [Starter-image prompts](../assets/starter-media/PROMPTS.md)
- [Concept-image prompts](../assets/theme-redesign/media/PROMPTS.md)

Historical reports record dates and verification limits. Keep real environment inventories and deployment identifiers in private operator records. The current runtime uses v3 and authorized media APIs.

## Maintenance rules

Keep setup variables in the deployment checklist, test commands/details in Testing, and actual environment evidence in Staging status. Link to those sources instead of copying long checklists.

Preserve exact commands, schema/API identifiers, template placeholders, CSV headers, and migration filenames when editing prose. Existing Polish filenames remain stable for old links. Write documentation in English and preserve localized product strings.

Document verified behavior separately from planned work or untested operational steps. Record the date, commit, environment, and scope of any new acceptance result. Never include credentials or authenticated browser storage state.
