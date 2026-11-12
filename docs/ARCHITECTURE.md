# Architecture

This document describes the repository implementation, not proof of a production rollout. For setup, see [Deployment](PLATFORM-DEPLOYMENT.md); for recorded environment checks, see [Staging status](STAGING-STATUS.md).

## Applications and shared packages

Each environment uses two Next.js projects and one Supabase project. All organizers share the application runtime; publishing an invitation does not create a deployment.

| Module | Responsibility |
| --- | --- |
| `apps/admin` | Organizer accounts, drafts, preview, media, publishing, guests, access settings, and RSVP management |
| `apps/site` | Published invitations, guest authentication, authorized content and media, RSVP, and calendar downloads |
| `packages/domain` | Zod schemas, content projection, templates, themes, and shared validation |
| `packages/renderer` | Shared React/Mantine rendering for preview and published invitations |
| `packages/ui` | Branding and the styled-components SSR/streaming registry |
| `supabase/migrations` | Tables, RLS, column permissions, transactional writes, sessions, rate limits, and retention |

The repository uses Next.js 16, React 19, TypeScript, Zod 4, Mantine 9, styled-components, Supabase, and Sharp. Use Node.js 24; `package-lock.json` is the source of exact dependency versions. Vite is no longer the application runtime.

## Core concepts

- A **site** is an organizer's event project: draft, releases, access settings, and stable public address.
- A **variant** defines its own ordered section placements, visibility, and permitted events.
- An **invitation** assigns an individual or household to a variant, with guests, allowed email addresses, revocation state, and an RSVP revision.
- A **release** stores published configuration and media paths separately from the editable draft.

| Guest route | Purpose |
| --- | --- |
| `/s/<public_slug>` | General site entry point |
| `/i/<token>` | Individual or household link |
| `/v/<invitation_id>` | Invitation selection after OTP; always requires the correct session |
| `/demo/glowna`, `/demo/pelna`, `/demo/ograniczona` | Explicit demos without client data |

A site's slug combines its name with a UUID. Invitation tokens are random; only their hashes are stored. The original link is available when created or rotated, not recoverable later from the stored hash.

## Configuration and editor

The application accepts **schema v3 only**. Typed sections reference events, venues, contacts, or media. Every variant, including the default, has independent section order and visibility. Event permissions are separate from section visibility: hiding a timeline does not remove RSVP eligibility.

Hero and gallery crops belong to each use of an image, with desktop/tablet/mobile positions. Guest projection removes hidden sections and unrelated contacts, venues, and media before sending content to the browser. See [Content editor](CONTENT-EDITOR.md).

There are ten populated starter templates plus a blank template, in Polish, English, and German. Templates provide initial data, not separate application types. Visual themes and audience variants are independent. Resetting a template checks revisions and variant dependencies, saves the previous persisted draft, and assigns new event IDs. Existing invitations, RSVP history, access settings, and library files remain. See [Starter templates](STARTER-TEMPLATES.md).

The editor autosaves valid changes, provides undo/redo and recovery, and handles revision conflicts. Publishing is always separate. See [Editing and guest workflows](product-review-improvements.md).

## Publishing and rollback

Draft writes use revision checks. Publishing validates configuration and media, then `publish_content` checks permissions and revision, records a release, and updates `sites.published_release_id` in one transaction.

Publishing does not call Vercel or build code. Guests receive the active release on their next authorized read. Draft changes do not alter published content.

Restoring a previous publication creates another release. It does not roll back RSVP answers, access settings, or the draft. Missing variants referenced by active invitations or the general page can block restoration. Unpublishing clears the active-release pointer and invalidates site sessions.

A code deployment changes the shared renderer for every site; content releases do not pin an application version. The earlier v1/v2 runtime adapters have been removed. The one-time v3 migration converted drafts, releases, and snapshots, including archived sites. Migration history is retained; ordinary publication does not rewrite historical releases.

## Authentication and access

Organizers use Supabase email/password or Google OAuth authentication and must have a confirmed email before creating a site. `site_members` and `platform_admins` control access; a signed-in account is not automatically authorized for another site's data.

| Site access mode | General entry | Household link |
| --- | --- | --- |
| `public` | General variant | Household variant and RSVP |
| `code` | Shared site code | Invitation token plus the same code |
| `email` | OTP for an allowed address, then invitation selection | OTP for an address allowed on that invitation |

Codes use scrypt with a random salt. Guest sessions use random tokens in HttpOnly, SameSite=Lax cookies, Secure in production, with a seven-day lifetime. The database stores hashes and access versions. Guest browsers do not receive Supabase Auth tokens.

Changing site access, editing an invitation, rotating its link, or revoking it invalidates the relevant sessions. The `/v/` route remains session-protected even in public mode. Code attempts, OTP delivery, and OTP verification have database limits plus an IP limit. Mutations validate the request origin.

Guest APIs use a server-only privileged key, so handlers must enforce authorization themselves. SQL also checks site, household, guest, event, and session when saving RSVP. Guest content and private media use `private, no-store`; pages use `noindex`. Revocation blocks future requests but cannot erase copies already downloaded.

## Media

Uploads are a single authenticated request to the admin API. The server accepts non-animated JPEG, PNG, or WebP up to **8 MiB and 20 million pixels**, converts them with Sharp, and stores only processed WebP variants.

The upload uses the organizer's Storage client and a narrowly checked INSERT policy; privileged access must not bypass that policy. The library limit is 100 records, including unfinished uploads; at most five uploads may be in progress. Configuration references at most 30 images.

Admin and guest image reads go through authorized API routes. The current application does not issue signed Storage read/upload URLs. Guest reads also check the selected variant and published manifest. Bundled sample images are public, versioned assets accepted only through exact allowlisted manifests; they are distinct from private uploads.

Deletion reserves a terminal `deleting` state, removes Storage objects, and only then removes metadata. References from saved drafts, releases, or snapshots block deletion. See [Site deletion and media lifecycle](SITE-DELETION.md).

## RSVP and integrity

RSVP answers belong to a guest/event pair within an invitation. An allowed email address represents the entire household. Invitations support up to 20 guests, configuration up to 50 events, and notes up to 2,000 characters. No response is different from declining.

Revision checks reject stale submissions. Guest deadlines use Europe/Warsaw in the interface and `timestamptz` in the database. Organizers may correct answers after the deadline, but an active publication is still required. Removed events retain historical answers.

Composite foreign keys include `site_id` to prevent cross-site relationships. Secret columns are unavailable to browser clients; sensitive writes use backend-only SQL functions and audit events.

Guest management supports CSV import/export, archiving members, optional RSVP questions, and invitation-scoped calendar downloads. Optional reminders require explicit recipient selection and sending; there is no automatic campaign.

## Boundaries and verification

Per-site custom domains, payments, and automatic initial invitation distribution are not implemented.

Automated checks cover domain behavior, SQL/RLS in PGlite, PostgreSQL concurrency, real API handlers with controlled external responses, and Playwright UI flows. They do not prove live SMTP delivery or operational readiness. See [Testing](TESTING.md) and the dated [publication review](PUBLICATION-SELF-REVIEW.md).
