# Content editor and schema v3

The panel has four areas: **Content, Appearance, Photos, and Guests**. Project settings and history are separate tools. One variant selection controls both editing and preview.

## Editing in context

Content lists the selected variant's section order and visibility, invitation opening, and footer. Clicking a heading expands its form in place; clicking again collapses it. Selecting a section in the preview opens and scrolls to its form.

Sections, timeline events, contacts, and gallery images are reordered using a dedicated drag handle, not up/down buttons. Use a mouse, touch, or keyboard (Space, arrows, Space). The 44 px handle prevents native scrolling during touch dragging; the rest of the list scrolls normally. Reordering an item affects only its section.

The timeline manages events and venues; contact sections manage contacts; galleries manage images and per-use crops. The photo library manages uploads, descriptions, and file deletion.

Entities are shared. The editor shows usage counts and can create independent copies. Removing an item from a section disconnects that reference; deleting shared data removes it from the draft and cleans its references. Published releases and historical RSVP remain separate.

## Data contract

- `schemaVersion: 3` is the only accepted runtime version.
- Sections are typed: `timeline.eventIds`, `contact.contactIds`, `venue.venueId`, `gallery.mediaIds`/`gallery.crops`, or `text`.
- `variant.sections` is an ordered list of `{sectionId, visible}`. Every variant, including the default, has independent placement and visibility.
- `variant.eventIds` controls event access and RSVP. Hiding a section does not change permissions. A timeline renders the intersection of its events and the variant's allowed events.
- `hero.crops` and `gallery.crops[mediaId]` contain independent desktop/tablet/mobile `{x,y}` positions from 0 to 100. Missing device crops fall back to desktop, then center.
- Guest projection includes only visible sections and related contacts, images, and venues. Allowed RSVP events can exist without a visible timeline.

## One-time migration

`20260930204955_contextual_editor_v3.sql` converts drafts, releases, and draft snapshots while preserving IDs and media paths. It moves global crops to their uses, converts old default-variant/hidden-reference rules to explicit lists, removes the older adapter, and increments draft revisions to reject stale editors. Historical `ivory` becomes `classic`; saved colors are preserved. Appearance defaults are filled consistently for snapshot comparisons.

Conversion includes archived, soft-deleted sites. Exclusive table locks last until transaction end. Required triggers are restored before commit; a failure rolls the transaction back.

Coordinate the database migration and both application deployments. Do not run old clients against the migrated schema. Existing staging has different remote migration version numbers: reconcile history before applying missing migrations. Do not replay the entire local history. See [Staging status](STAGING-STATUS.md).

## Verification

Domain and PGlite tests cover migration, references, independent variants, RSVP authorization, contact isolation, and history. E2E cover contextual editing, preview selection, device crops, variants, and viewports from 320 to 2560 px. PostgreSQL concurrency checks require a disposable `TEST_DATABASE_URL`; CI supplies PostgreSQL 17. See [Testing](TESTING.md).
