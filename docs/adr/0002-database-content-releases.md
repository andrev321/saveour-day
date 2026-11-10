# ADR-0002: Database Content Releases Instead of Per-Site Builds

- **Status:** Accepted
- **Date:** 2026-11-10

## Context
Organizers frequently update their **Draft** configuration while guests are actively viewing invitations and submitting **RSVP Answers**. Tying publication to static site builds or per-customer deployments caused latency, webhook complexity, and coupled code versions to content edits.

## Decision
Store published content as immutable **Release** records (`site_releases`) in PostgreSQL. The `publish_content` SQL function atomically validates permissions and draft revision, inserts a new **Release** snapshot with its media manifest, and updates `sites.published_release_id`.

## Consequences
- **Draft** autosaves never mutate what guests see until explicit publication.
- Restoring a historical publication creates a new **Release** record without rolling back **RSVP Answers**, **Access Mode**, or the current **Draft**.
- **RSVP Answers** live outside **Releases** so guest responses survive content republishing and **Template** resets.
