# ADR-0005: Versioned HttpOnly Guest Sessions

- **Status:** Accepted
- **Date:** 2026-11-10

## Context
Guests access invitations via shared **Site Codes** or household email **OTP** without creating permanent password accounts. However, organizers must be able to immediately revoke an **Invitation**, rotate a link, or change the **Access Mode** (`public`, `code`, `email`).

## Decision
Issue random session tokens stored in `HttpOnly`, `SameSite=Lax` (`Secure` in production) cookies with a 7-day lifetime. Store only token hashes in the database alongside `sites.access_version` and `invitations.access_version`. Never expose Supabase Auth tokens to guest browsers.

## Consequences
- Rotating an **Invitation** link, revoking an **Invitation**, or changing **Access Mode** increments the version counter and immediately invalidates existing **Guest Sessions**.
- Guest API handlers use a privileged server client and must explicitly verify session validity and version alignment on every request.
