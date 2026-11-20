# Glossary

This glossary defines the canonical domain language for the **SaveOur-Day** (`invitation-platform`) project. All code symbols, documentation, specs, tickets, and agent interactions must use these exact terms.

---

## Core Domain Concepts

### Site

An organizer's complete event project. A **Site** owns a single editable **Draft**, zero or more immutable **Releases**, site-wide **Access Mode** settings, a stable public **Site Slug** (`/s/<public_slug>`), a **Media Library**, and all associated **Invitations** and **Guests**.

- _Avoid_: "project", "wedding", "event page", "tenant" (unless referring specifically to UI copy in the starter wizard).

### Draft

The mutable, autosaved working configuration (`schema v3`) edited by an **Organizer** inside the admin workspace. Changes to a **Draft** never alter what guests see until a **Release** is published. Supports optimistic concurrency via revision numbers and automatic conflict recovery.

### Release

An immutable, versioned snapshot of a **Site**'s configuration and published media manifest stored in the database (`site_releases`). Created atomically by `publish_content`, which updates `sites.published_release_id`. Restoring a historical publication creates a _new_ **Release** rather than mutating history.

- _Avoid_: "deployment", "build", "bundle" (publishing is a database operation, not a Vercel build).

### Variant

An audience-specific view configuration defined within a **Site** (`schema v3`). Every **Variant** (including the default `general` variant) defines its own ordered **Section Placements**, visibility rules, and permitted **Events**. Visual **Themes** and **Variants** are independent.

- _Avoid_: "template", "view mode", "role".

### Variant Projection

The server-side filtering process that strips hidden **Sections** and unreferenced **Contacts**, **Venues**, **Events**, and **Media Assets** from a **Release** before sending the payload to a guest browser. Crucial security boundary: CSS hiding is never used for access control.

### Section

A typed content block inside a **Site** configuration (`hero`, `story`, `timeline`, `venues`, `accommodation`, `rsvp`, `faq`, `gifts`, `contacts`, `gallery`, `custom`). Sections reference domain entities (such as **Events**, **Venues**, **Contacts**, or **Media Assets**) by ID.

### Invitation

An invitation of one person or several people to a **Site**, seen through a single **Variant**. It is a list of one to twenty **Guests**, at least one of them a **Named Guest**, with an optional **Group Name**, its own **Short Code** and private link, and one shared **RSVP**.

- _Avoid_: "family", "household", "rodzina", "guest group", "ticket".

### Group Name

An optional display name for an **Invitation** with several **Guests** (e.g. "Rodzina Nowaków"). When absent, the name is derived from the **Guests**. "Group" is UI wording only, not a separate domain concept.

### Guest

One person (seat) on an **Invitation**: either a **Named Guest** or a **Companion**. Every **Guest** counts toward headcounts and has their own **Attendance**.

- _Avoid_: "member", "attendee" (for a not-yet-confirmed person).

### Named Guest

A **Guest** whose name is set by the **Organizer**. Only **Named Guests** can be used to find an **Invitation** by name, and only the **Organizer** can change their name.

### Companion

A **Guest** whose identity the **Organizer** does not know in advance (PL: "osoba towarzysząca"). The guest may optionally give their name in the **RSVP**. A **Companion** cannot attend an **Event** when every **Named Guest** of the **Invitation** declines that **Event**. The **Organizer** may convert a **Companion** into a **Named Guest**.

- _Avoid_: "Plus-One", "+1", "osoba dodatkowa".

### Event

A distinct scheduled part of an occasion (e.g., Ceremony, Reception, Poprawiny) defined in the **Site** configuration (up to 50 events). **Variant** event permissions control which **Events** an **Invitation** sees in the schedule and calendar (and which **Events** are eligible for per-event **RSVP**).

### RSVP

The whole response of an **Invitation**: the **Attendance** of each **Guest**, the **Question Answers**, and a free-text note. Kept outside **Releases**, so it survives new publications and **Template** resets.

### Attendance

Whether a **Guest** will attend the occasion as a whole (`overall` mode, default) or each selected **Event** from the schedule (`events` mode, intersected with the **Invitation**'s **Variant**): attending, declined, or no response yet. The **Invitation**'s response status depends on **Attendance** only.

- _Avoid_: "RSVP Answer", "answer" (ambiguous with **Question Answer**).

### RSVP Question

An **Organizer**-defined question asked in the **RSVP**, either per **Guest** or once per **Invitation**, with an open, single-choice, multiple-choice, or numeric answer. It may be required and limited to chosen **Variants**. It is shown only to attending **Guests** (or, for per-**Invitation** questions, when anyone attends). **RSVP Questions** belong to the **Site**, not to a **Release**.

- _Avoid_: "detail", "extra field", "survey".

### Question Preset

A ready-made **RSVP Question** (e.g. diet, allergies, lodging, parking) that an **Organizer** copies into the **Site** in one click. Once added, it is an ordinary **RSVP Question**.

### Question Answer

A **Guest**'s or **Invitation**'s answer to one **RSVP Question**.

### Short Code

An auto-generated, 6-character unambiguous alphanumeric code (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`) assigned to every **Invitation** for **Guest Lookup** disambiguation, name-collision verification, and unlocking already-answered invitations on a new device.

### Self-Registration

An optional **Site** setting (`allow_self_registration`, default `false`) that lets an unlisted guest (optionally with one **Companion**) submit an RSVP on `/s/<public_slug>` into a `pending_match` queue for the **Organizer** to approve or merge into an existing **Invitation**.

### Info-Only Mode

A **Site** state (`rsvp_enabled = false`) in which `/s/<public_slug>` and `/i/<token>` display event details and `.ics` calendar downloads without any RSVP lookup, form, or API write access.

---

## Access & Security Concepts

### Access Mode

The site-wide guest authentication rule configured by the **Organizer**:

- `public`: Open access to `/s/<public_slug>` (renders default **Variant** with optional **Guest Lookup**) and `/i/<token>` (renders the **Invitation**'s **Variant** + RSVP).
- `code`: Requires a shared, scrypt-hashed **Site Code** for both general and **Invitation** links.

### Guest Session

A versioned, 7-day `HttpOnly` cookie session issued after successful **Site Code**, `/i/<token>`, or **Guest Lookup** verification. Validated against `sites.access_version` and `invitations.access_version` so rotating a code, revoking an **Invitation**, or changing **Access Mode** immediately invalidates affected sessions.

---

## Media & Visual Concepts

### Media Asset

A photo uploaded by an **Organizer** to a **Site**'s library (max 100 assets per site, max 30 referenced in configuration). Uploaded via a single authenticated request, validated (max 8 MiB server / 4 MiB transport, 20 MP), and converted by Sharp into responsive WebP variants (`320w`, `640w`, `1280w`, `1920w`) plus an inline LQIP `blurDataUrl` preview. Served exclusively through authorized API routes—never via public or signed Storage URLs.

### Sample Media

Public, versioned example WebP images (`640w`, `1280w`, `1536w`) bundled with the repository and allowlisted by manifest. Distinct from private **Media Assets**.

### Crop

Per-use focal point and zoom coordinates (`desktop`, `tablet`, `mobile`) attached to a specific placement of a **Media Asset** inside a `hero` or `gallery` **Section** (not mutated on the asset itself).

### Template

Starter configuration data (10 populated templates + 1 blank, in PL/EN/DE) used to initialize or reset a **Draft**. Once applied, a **Template** becomes ordinary **Draft** configuration. Resetting a **Template** backs up the previous **Draft**, generates fresh **Event** IDs to prevent accidental **Attendance** reassignment, and preserves **Invitations**, **RSVP Questions**, **Question Answers**, and **Media Assets**.

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
