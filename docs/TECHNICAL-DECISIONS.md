# Technical decisions

These decisions describe the current design. Details are in [Architecture](ARCHITECTURE.md); operational steps are in [Deployment](PLATFORM-DEPLOYMENT.md).

| Decision | Reason | Consequence |
| --- | --- | --- |
| Two Next.js applications | Separate organizer and guest origins while sharing code | Two application configurations per environment; no deployment per customer |
| Stable `/s/` routes and random `/i/` tokens | Avoid domains/builds for each household | A slug identifies a site but does not authorize access |
| Database content releases | Atomic publication and independent drafts | Content rollback does not restore old code, access settings, or RSVP |
| Supabase Postgres, Auth, and private Storage | Shared infrastructure and transactional checks | Privileged server clients must explicitly enforce authorization |
| Shared Zod schema and renderer | Preview and publication use the same contract | Schema/renderer changes affect every site and need compatibility checks |
| Schema v3 only | Explicit typed sections, independent variants, and per-use crops | No runtime v1/v2 adapters |
| Server-side variant projection | Do not deliver hidden content to unauthorized recipients | CSS hiding is insufficient; media authorization must follow the projection |
| Site-wide `public` / `code` access | Predictable rules for all invitations | Household differences come from token, `short_code`, and variant |
| Hybrid RSVP (links + guest self-lookup with `short_code`); Supabase Auth for organizers | Guests need no accounts or email OTP; organizers share links/codes directly | No Resend dependency or guest email tables; see ADR 0008 |
| Separate versioned guest sessions | Revoke access without exposing Supabase tokens | Protected requests check session/access versions; lifetime is seven days |
| Authorized media API and no private-content cache | Enforce access on direct image requests | Runtime/Storage costs must be considered without weakening isolation |
| Scoped Storage INSERT for uploads | Prevent privileged uploads from bypassing lifecycle checks | Uploads use the organizer's JWT; read/delete/finalize remain server-controlled |
| RSVP stored outside releases | Preserve answers across publication and template changes | Separate revisions, guest/event checks, per-invitation `+1`, `rsvp_enabled`, and deadlines |
| Manual link/code sharing & collision alerts | Organizers choose their own messaging channel (WhatsApp, SMS, print) | 1-click copy (`link + code` or personal `/i/` link); no outbound email campaigns |
| Node.js 24 and lockfile installs | Match local work and CI, including module mocks | Use `npm ci` and keep the lockfile authoritative |

## Template and styling rules

Templates initialize ordinary configuration. Updating the catalog does not update existing sites. Template language and panel language are independent.

A template reset requires confirmation, a server-side backup, revision checks, and valid variant dependencies. It does not publish or erase RSVP history. New event IDs prevent answers from being accidentally reassigned. Blank drafts may be saved; publication has separate readiness validation.

The interface primarily uses styled-components and a shared SSR/streaming registry. Mantine styles, local font packages, and panel color CSS remain part of the implementation. UI tests prefer accessible roles and stable attributes rather than generated class hashes.

## Superseded approaches

- A shared Next.js runtime replaced per-client Vite builds.
- Database releases replaced separate Vercel projects/builds/domains for each site.
- Authorized projections replaced public bundles containing every variant.
- SQL publication replaced build-completion webhooks and manifest tokens.
- Schema v3 replaced v1/v2 runtime adapters.
- Authorized media routes replaced signed Storage links issued to clients.
- Hybrid RSVP (link-first + self-lookup with `short_code`) replaced `email` access mode, guest OTP, and Resend invitation/reminder mailing (see ADR 0008).

Apply the complete migration chain for a fresh environment. Existing environments must reconcile migration history first.
