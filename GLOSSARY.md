# Glossary

This glossary defines the canonical domain language for the **SaveOur-Day** (`invitation-platform`) project. All code symbols, documentation, specs, tickets, and agent interactions must use these exact terms.

---

## Core Domain Concepts

### Site
An organizer's complete event project. A **Site** owns a single editable **Draft**, zero or more immutable **Releases**, site-wide **Access Mode** settings, a stable public **Site Slug** (`/s/<public_slug>`), a **Media Library**, and all associated **Invitations** and **Guests**.
- *Avoid*: "project", "wedding", "event page", "tenant" (unless referring specifically to UI copy in the starter wizard).

### Draft
The mutable, autosaved working configuration (`schema v3`) edited by an **Organizer** inside the admin workspace. Changes to a **Draft** never alter what guests see until a **Release** is published. Supports optimistic concurrency via revision numbers and automatic conflict recovery.

### Release
An immutable, versioned snapshot of a **Site**'s configuration and published media manifest stored in the database (`site_releases`). Created atomically by `publish_content`, which updates `sites.published_release_id`. Restoring a historical publication creates a *new* **Release** rather than mutating history.
- *Avoid*: "deployment", "build", "bundle" (publishing is a database operation, not a Vercel build).

### Variant
An audience-specific view configuration defined within a **Site** (`schema v3`). Every **Variant** (including the default `general` variant) defines its own ordered **Section Placements**, visibility rules, and permitted **Events**. Visual **Themes** and **Variants** are independent.
- *Avoid*: "template", "view mode", "role".

### Variant Projection
The server-side filtering process that strips hidden **Sections** and unreferenced **Contacts**, **Venues**, **Events**, and **Media Assets** from a **Release** before sending the payload to a guest browser. Crucial security boundary: CSS hiding is never used for access control.

### Section
A typed content block inside a **Site** configuration (`hero`, `story`, `timeline`, `venues`, `accommodation`, `rsvp`, `faq`, `gifts`, `contacts`, `gallery`, `custom`). Sections reference domain entities (such as **Events**, **Venues**, **Contacts**, or **Media Assets**) by ID.

### Invitation
A record assigning an individual or household to a specific **Variant** within a **Site**. Holds a hashed random **Invitation Token** (`/i/<token>`), a list of **Guests** (up to 20), allowed email addresses for OTP, revocation state, and an RSVP revision counter.
- *Avoid*: "guest group", "household account", "ticket".

### Guest
An individual person belonging to an **Invitation**. **RSVP Answers** are recorded per **Guest** and per **Event** pair (`(guest_id, event_id)`), whereas an **Invitation** represents the household unit.

### Event
A distinct scheduled part of an occasion (e.g., Ceremony, Reception, Poprawiny) defined in the **Site** configuration (up to 50 events). **Variant** event permissions control which **Events** a household can RSVP to, independently of whether the timeline **Section** is visible.

### RSVP Answer
A guest's attendance response (`attending`, `declined`, or no response) for a specific `(guest_id, event_id)` pair within an **Invitation**, along with optional dietary/custom notes and revision tracking. Stored outside **Releases** so answers survive new publications and **Template** resets.

---

## Access & Security Concepts

### Access Mode
The site-wide guest authentication rule configured by the **Organizer**:
- `public`: Open access to `/s/<public_slug>` (renders default **Variant**) and `/i/<token>` (renders household **Variant** + RSVP).
- `code`: Requires a shared, scrypt-hashed **Site Code** for both general and household links.
- `email`: Requires an email One-Time Password (**OTP**) sent to an address allowlisted on an **Invitation**.

### Guest Session
A versioned, 7-day `HttpOnly` cookie session issued after successful **Site Code** or **OTP** verification. Validated against `sites.access_version` and `invitations.access_version` so rotating a code, revoking an **Invitation**, or changing **Access Mode** immediately invalidates affected sessions.

---

## Media & Visual Concepts

### Media Asset
A photo uploaded by an **Organizer** to a **Site**'s library (max 100 assets per site, max 30 referenced in configuration). Uploaded via a single authenticated request, validated (max 8 MiB server / 4 MiB transport, 20 MP), and converted by Sharp into responsive WebP variants (`640w`, `1280w`, `1920w`). Served exclusively through authorized API routes—never via public or signed Storage URLs.

### Sample Media
Public, versioned example WebP images (`640w`, `1280w`, `1536w`) bundled with the repository and allowlisted by manifest. Distinct from private **Media Assets**.

### Crop
Per-use focal point and zoom coordinates (`desktop`, `tablet`, `mobile`) attached to a specific placement of a **Media Asset** inside a `hero` or `gallery` **Section** (not mutated on the asset itself).

### Template
Starter configuration data (10 populated templates + 1 blank, in PL/EN/DE) used to initialize or reset a **Draft**. Once applied, a **Template** becomes ordinary **Draft** configuration. Resetting a **Template** backs up the previous **Draft**, generates fresh **Event** IDs to prevent accidental RSVP reassignment, and preserves **Invitations** and **Media Assets**.

### Theme
A visual styling preset (typography, color palette, surface tokens, motion style) applied to the shared renderer independently of **Template** content and **Variants**.

---

## Architecture Vocabulary (`codebase-design`)

- **Module**: Any unit with an **Interface** and an **Implementation** (function, class, package, or subsystem).
- **Interface**: Everything a caller must know to use a **Module** correctly (types, invariants, error modes).
- **Depth**: Leverage at the **Interface**—a large amount of behaviour hidden behind a small, simple **Interface**.
- **Seam**: A location where behaviour can be varied or tested without modifying the surrounding code.
- **Adapter**: A concrete implementation that satisfies an **Interface** at a **Seam**.
- **Leverage**: Capability gained by callers per unit of **Interface** learned.
- **Locality**: Concentration of change, bugs, and verification inside a single **Module**.
