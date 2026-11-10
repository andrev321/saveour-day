# ADR-0003: Server-Side Variant Projection

- **Status:** Accepted
- **Date:** 2026-11-10

## Context
A single **Site** can define multiple audience **Variants** (e.g., ceremony-only guests vs. full wedding + reception guests). Sending the entire **Release** configuration to the browser and hiding sections via CSS leaks private event times, venues, contacts, and photos in the network payload.

## Decision
Perform **Variant Projection** exclusively on the server (`packages/domain` projection functions invoked by `apps/site` server routes) before delivering content to the client. Strip hidden **Sections** and unreferenced **Events**, **Venues**, **Contacts**, and **Media Assets**. Enforce the same variant manifest check on authorized media API routes.

## Consequences
- Unauthorized guests never receive data or **Media Assets** belonging to hidden **Sections** or unpermitted **Events**.
- Event RSVP eligibility is checked independently in SQL and server routes against the **Invitation**'s assigned **Variant**.
