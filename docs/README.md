# Documentation

## Start here

| Task | Guide |
| --- | --- |
| Install and run locally | [Root README](../README.md) |
| Understand the system | [Architecture](ARCHITECTURE.md) |
| Understand design choices | [Technical decisions](TECHNICAL-DECISIONS.md) |
| Configure a new environment | [Deployment checklist](DEPLOYMENT-CHECKLIST.md) |
| Migrate or validate a release | [Deployment](PLATFORM-DEPLOYMENT.md) |
| Run checks and staging smoke | [Testing](TESTING.md) |
| Provision production and release manually | [Production operations](PRODUCTION-OPERATIONS.md) |
| Manage staging addresses/deploys | [Staging operations](STAGING-OPERATIONS.md) |

## Product behavior

- [Content editor and schema v3](CONTENT-EDITOR.md)
- [Editor interface and accessibility](CONFIGURATOR-INTERFACE.md)
- [Autosave, guests, RSVP, and reminders](product-review-improvements.md)
- [Starter templates and sample photos](STARTER-TEMPLATES.md)
- [Themes and palettes](THEMES-AND-PALETTES.md)
- [Site deletion, retention, and media lifecycle](SITE-DELETION.md)
- [Brand kit](../assets/brand/README.md)

## Verification records and design history

- [Where to keep staging verification records](STAGING-STATUS.md)
- [Publication self-review — 2026-09-22](PUBLICATION-SELF-REVIEW.md)
- [Earlier theme previews](../assets/theme-previews/README.md)
- [Theme design exploration](../assets/theme-redesign/README.md)
- [Starter-image prompts](../assets/starter-media/PROMPTS.md)
- [Concept-image prompts](../assets/theme-redesign/media/PROMPTS.md)

Historical reports record dates and verification limits. Keep real environment inventories and deployment identifiers in private operator records. The current runtime uses v3 and authorized media APIs.

## Maintenance rules

Keep setup variables in the deployment checklist, test commands/details in Testing, and actual environment evidence in Staging status. Link to those sources instead of copying long checklists.

Preserve exact commands, schema/API identifiers, template placeholders, CSV headers, and migration filenames when editing prose. Write documentation in English and preserve localized product strings.

Document verified behavior separately from planned work or untested operational steps. Record the date, commit, environment, and scope of any new acceptance result. Never include credentials or authenticated browser storage state.
