# Starter templates

Templates provide initial values for the shared editor, not separate application types. The application uses schema v3; see [Content editor](CONTENT-EDITOR.md).

## Create an invitation

Choose Create invitation, enter a project name, select a starter template and its content language, then confirm. No template is selected automatically. The internal project name is separate from the heading guests see.

There are ten populated templates plus a blank option, each available in Polish, English, and German. Replace sample information before publishing. A blank invitation has no sample people, dates, events, sections, contacts, or photos. Changing the panel language does not translate existing content.

| Template | Default theme |
| --- | --- |
| Wedding ceremony | `classic` |
| Wedding reception | `evening` |
| Wedding and reception | `botanical` |
| Birthday | `celebration` |
| Company event | `editorial` |
| Anniversary | `classic` |
| Baptism / communion | `botanical` |
| Baby shower | `celebration` |
| Housewarming | `celebration` |
| Meeting / workshop | `editorial` |
| Blank invitation | `editorial` |

`packages/domain/src/templates.ts` is the source of template/theme assignments and initial styling. Avoid copying detailed palette defaults into multiple documents; see [Themes and palettes](THEMES-AND-PALETTES.md) for the current designs.

Any template can use any theme. Selecting another theme preserves content and section order while applying theme defaults. Replacing the entire template is the separate reset operation below.

## Replace a template

Use the Change starter template control in the editor toolbar. It opens the same selector with a reset warning. Select a template and language and explicitly confirm replacement. Opening or canceling the dialog does not change the draft.

Reset replaces text, events, sections, variants, appearance, and photo assignments. Unsaved changes are discarded. The server saves a copy of the last **persisted** draft, so save or export current work first.

Reset preserves the site ID/URL, internal name, owner, access settings, RSVP deadline, households, links, answers, and library files. Guests see the new content only after publication.

New events receive new IDs. Old RSVP answers remain historical rather than being assigned to new events. A reset that removes a variant used by an active invitation or the general page is blocked. Resolve those dependencies by assigning a retained variant or revoking the affected invitation first.

## Draft snapshots and blank drafts

In Settings → Draft snapshots, select one of the 20 latest copies and choose Restore draft snapshot. Restoration checks confirmation, revision, and variant dependencies and saves another snapshot before overwriting. It does not roll back the publication.

A blank draft can be saved without events or sections. Publication requires the main heading; a date or photo is not mandatory. An invitation without events tells guests there are no events to confirm.

## Sample photos

The ten populated templates include an occasion-specific, AI-generated scene without people. The blank template has no photo. Birthday images contain no numbers or age. The photo area offers three scenes per occasion; baby shower includes neutral (default), girl, and boy variants. Sources are `templatePhotos` and `sample-photo-options.ts`.

Selecting a scene updates the main image while preserving existing project images and separate phone/tablet assignments. It can be undone; guests see it after saving and publishing.

Sample images are labeled as AI-generated. They may remain in published invitations, receive descriptions/crops, be replaced by uploads, or be removed from the invitation. Removal clears references across the draft but does not delete the shared sample file from other projects.

Both applications ship identical, public, versioned WebP files under `/media/examples/` at 640, 1280, and 1536 px. `packages/domain/src/sample-media.ts` allows only exact bundled manifests. Private uploads retain their separate ownership/access checks. Do not overwrite or delete v1 sample files/manifests: published invitations may still use them.

Apply both `20261005123525_template_sample_media.sql` and `20261005200000_contextual_sample_media.sql` before deploying code that uses these manifests. They allow sample media in saves, creation, snapshots, and publication; they do not insert photos into existing sites. Samples appear on creation or confirmed template replacement.

Prompts are in [Starter media](../assets/starter-media/PROMPTS.md); historical image sources are in [Concept media](../assets/theme-redesign/media/PROMPTS.md).

## Appearance and previews

Themes use local font packages: Playfair Display/Inter, Cormorant Garamond/Inter, DM Sans, Bodoni Moda/Inter, and Fraunces/Nunito Sans. Browsers do not need a third-party font service. Without a hero image, the layout is typographic. Photo frames and galleries vary by theme.

Module icons and decoration levels (none/subtle/full) are independently configurable. Colors remain editable. Theme selection does not change template content or audience permissions.

The guest demo supports queries such as `/demo/glowna?theme=classic`. The local admin `/demo` supports creation, reset, and snapshots without Supabase; changes are temporary and disappear on refresh. Do not assume the admin demo is enabled on deployed environments.

## Verification

Tests cover template/language combinations, blank-draft validation, API creation, reset/snapshot SQL, user isolation, revision conflicts, variant dependencies, RSVP/publication preservation, and browser confirmation/cancellation.

Theme tests cover mobile/desktop layouts, no horizontal overflow, server-rendered output, optional photos, hero layouts, galleries, and decoration changes. Historical format conversions belong to migration tests; there are no v1/v2 runtime adapters.
