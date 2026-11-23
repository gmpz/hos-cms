# Hospital CMS — domain schema v1

This is a domain contract, not a complete database migration or runtime validator.
Authentication, categories, posts, units, documents, pages, media metadata, navigation,
and site settings use MySQL through Prisma; remaining prototype modules must not be
treated as production data sources.

## Product decisions

One hospital website and one administrator manage all content. Units are content
owners, not tenants or separate logins. Public pages and CMS live in one Next.js
application. Publication is draft → published → archived; no approval workflow.
Public reads must select only published content.

News and unit achievements share one post model. Each post has one news category
and one content owner (hospital or unit); there is no separate post-type selector.
“ผลงานกลุ่มงาน” is a category. Category IDs remain stable when names or ordering
change. The category catalog now has a MySQL/Prisma table with separate post and
document scopes, unique names per scope, ordering, active state, and timestamps.
The category manager and category choices now read and write the MySQL catalog
through `/api/categories`; obsolete category browser-storage snapshots are discarded.
The catalog can be initialized with basic production categories using UUIDs; administrators can then add or edit categories.
Posts now live in `cms_posts`: title, excerpt, owner, publication state, category and unit FKs,
cover media ID and timestamps are columns; ordered article blocks are JSON. New posts may
use the fixed news form (`editor_mode = form`) or the existing freeform block editor
(`blocks`). Existing posts default to `blocks`. Form posts retain a versioned
`form_payload`; the server validates its limited rich text and media fields and
generates ordered display blocks. The editor mode cannot change after the first save.
Public reads continue to render published blocks, and the post excerpt for form posts
is derived from the beginning of the body. Cover display mode, focal point, and zoom
have separate draft and published columns so card
previews can change without affecting public cards. Saved edits to a published
post remain in draft fields and set `has_unpublished_changes`; the
published snapshot and public-list fields remain unchanged until the administrator
publishes again. Public reads use only the published snapshot and published-list fields.
The admin editor compares each block with the published snapshot, marks changed or new
blocks, and can discard the saved draft to restore the entire published snapshot.
The migration backfills snapshots for already-published posts. The
post API enforces category and owner existence, published-only public reads, stable slugs,
and optimistic revision checks. The fixed `hospital` unit ID is the default owner;
department units live in `cms_units` and the browser's old demo-unit list is discarded.
Posts support duplicate-to-draft, unpublish-to-draft, and soft deletion. Documents now live in
`cms_documents`, with category and unit foreign keys, one media ID, and published-only public reads.
Documents can be unpublished to a draft or soft-deleted into a recoverable trash. Restoring a document returns it as a draft; deleted documents never appear in public reads or the public file route.
Modal announcements and Splash Screens use their existing `deleted_at` field for recoverable trash. Each admin list separates active items from trash, restores items as drafts, and permits permanent deletion only from trash. Public reads exclude deleted items; permanent deletion keeps media files in the library.
Published document links record explicit open and download clicks separately in `cms_documents.open_count` and `download_count`; the administrator list displays both counters. PDF viewer re-requests do not add another open count. These are click counts, not unique visitors; actions inside a browser's built-in PDF viewer are outside the site's controls. Draft or trashed file previews are not counted.
The admin document list uses database-side search, filters, and 10-item pagination; its trash list is fetched only when selected. Public document reads keep their separate published-only contract.
The admin and public document index pages filter fiscal years from existing rows; the public index defaults to the latest year with published documents and uses database-side pagination. The default fiscal year on new documents follows Thailand's October 1 boundary in Asia/Bangkok.
The prior browser-storage document list is not imported automatically.
Media metadata lives in `cms_media_assets`; the database stores media IDs, not file bytes.
All server writes and deletes use the media storage abstraction. Development defaults to
`public/uploads`; production uses `/var/lib/hos-cms/uploads`, served read-only by Nginx at
`/uploads/`. The old server manifest can be imported idempotently, and browser storage is
not a media catalog.
Page Builder pages now live in `cms_pages`. Each page has a stable ID, unique path,
draft and published JSON block snapshots, revision, publication state, and access
level. The public site reads only the published snapshot. Page access follows the
page ID when its slug changes. Units keep editable `payload`, `slug`, `access_level`,
and `draft_access_grants` separately from `published_payload`, `published_slug`,
`published_access_level`, and live access grants. Saving a unit draft does not
change its public page, URL, or access; publishing atomically replaces the live
snapshot and grants. `has_unpublished_changes` marks a saved draft newer than the
published snapshot. Unit landing access remains attached to the unit ID. The
`deleted_at` field moves a unit to recoverable trash. Deleted units are excluded
from public reads and active admin lists; restoration returns them as drafts at
the end of the active order. Units still referenced by posts, documents, or
access grants cannot be moved to trash until those references are resolved. The
administrator may permanently delete a trashed unit after typing a confirmation
code; the server repeats the reference checks and rejects active units. The
unit editor summarizes saved draft changes by section against the current
published snapshot, including access-level and grant changes. This summary is
not an audit log or a history of every save. Unit vision may use a structured
statement of up to 220 characters; structured mission has at most six ordered
items, each with a title up to 40 characters and description up to 120.
Legacy rich-text values remain readable until explicitly replaced in the editor. The
legacy path-based `cms_page_access` table has been
retired. Old browser page snapshots are intentionally not imported. Pages also keep
separate draft and published page-header settings. A page header may use the system
presentation, custom eyebrow/title/description/image, or be hidden. Existing pages read as
hidden so publication does not change unexpectedly; newly created pages default to
the system header. A content Banner block remains independent from this page header.
Page deletion is soft deletion into a recoverable trash. Restoring a page returns it
as a draft and does not republish its former published snapshot. The admin page list
keeps the fixed home page first, then orders remaining active pages from oldest to newest.
Administrators may permanently delete a page from the trash; this also deletes its page
access grants through the database relation and cannot be undone.
For a published unit with pending draft changes, discarding the draft restores
the editable payload, slug, access level, and draft grants from the published
snapshot and live grants; it does not delete the unit or alter the public page.
Navigation now lives in the singleton `cms_navigation` JSON document with a revision
counter. Main links and dropdown groups may store an optional allowlisted Lucide icon name;
older navigation documents without icons remain valid. The migration seeds only basic menu
links; old browser menus are not imported.
Hospital identity, contact information (including an optional Google Maps URL), optional official Facebook, YouTube, and LINE links, logo reference, homepage selection, and semantic
theme tokens now live in the singleton `cms_site_settings` row with optimistic revision
checks. Public and administration shells load these settings through `/api/site-settings`;
the former site-settings localStorage snapshot is discarded.
Authenticated users have optional personnel profiles backed by `cms_users`, reusable
profile master values, and unit memberships. A user can belong to several units but
has at most one primary unit. Phone and email publication are independent opt-ins.
Pages and unit landings may use `CUSTOM` access, granted directly to active users or
indirectly through unit membership. Administrators retain access to all CMS-managed
pages and unit landings.

## Models and relationships

| Model | Relationship / purpose |
| --- | --- |
| Page | Unique normalized path; empty path is homepage; ordered PageBlock array |
| Unit | Unique slug; its own landing blocks, contact information and publication |
| Post | Hospital or one unit owner; news, activities, achievements and announcements share a format |
| MediaAsset | Stored file metadata; referenced by ID, not copied file URLs |
| Document | Category, owner, fiscal year, document number and one referenced file |
| MoitYear | Unique Buddhist Era fiscal year |
| MoitTopic | Belongs to year; optional parent in same year; ordered criteria |
| MoitEvidence | Topic → document or external link |
| ProcurementProject | Project number, fiscal year, method, budget and optional unit |
| ProcurementNotice | Optional project; one or more documents; includes monthly/yearly summaries |
| Navigation | Required Home plus links/dropdowns; array order determines menu order |
| SiteSettings | Singleton site profile, logo and semantic theme tokens |
| AuditEvent | Append-only event produced by future server mutations |
| UserProfile | Authentication account plus personnel, contact, privacy and unit membership data |
| ProfileMaster | Administrator-managed person type, position or level option |
| AccessGrant | A page/unit-landing grant to exactly one user or one unit |

## Required persistence and validation rules

Enforce these in server validators and database constraints when persistence is chosen.
TypeScript alone does not enforce input validation or referential integrity.

- IDs and revision numbers are server-generated; revisions start at 1. Compare
  revisions on writes to prevent lost updates. Dates are valid ISO dates/timestamps.
- Page paths are unique after normalization, have no leading/trailing slash, query,
  fragment, empty segment, dot segments or traversal. Reserve only root segments
  implemented by the application: admin, api, news, units, documents, search,
  login, change-password, profile, privacy-policy and cookie-policy. Planned modules
  such as moit are available to Page Builder until a dedicated route is implemented.
- Post slugs are generated on first save, unique site-wide and stable on title edits.
  Unit, document and procurement notice slugs are unique within their own modules.
- Content references must exist. Block IDs are unique within each document.
  Referenced unpublished content must never leak through public dynamic blocks.
- Pages, unit landings and posts share the versioned block format. Posts exclude
  recursive post lists. Changes require sequential per-type migrations.
  Blocks with a primary display heading share an optional semantic heading size
  (small, standard or large) at block level. Legacy snapshots without this field
  use the standard size, while older per-type heading sizes remain readable.
  The downloads block v2 adds an optional display heading above its file list;
  v3 adds a semantic heading size (small, standard, large), defaulting to the
  original standard size. Earlier snapshots migrate on read.
  The gallery block v6 adds the same heading sizes, defaulting to its original
  standard size. Earlier gallery snapshots migrate on read.
  The video block v2 adds a visible heading, description above the embed and
  heading size. Version 3 adds video-only and video-with-text layouts, 40/60,
  50/50 and 60/40 splits, media side and vertical text alignment. Earlier video
  snapshots migrate on read and retain the video-only layout.
  The PDF Viewer block v3 removes the open/download control and button; older
  snapshots migrate on read.
  The banner-slider block v9 unifies the former single banner and banner slider,
  and stores a 100–300% zoom value with each slide's focal point.
  The service-groups block v3 adds an optional plain-text description beneath
  the block title; older snapshots migrate with an empty description.
  Version 4 uses the same allowlisted icon catalog as the primary navigation;
  legacy service-group icon names migrate to their matching shared icons.
  Version 5 fixes the layout at three columns on wide screens. Older blocks
  with a two-column setting migrate to three columns when read.
  Version 6 allows each service group to omit its icon; earlier groups keep
  their selected icons.
  The contact-info block v2 stores an optional numeric phone extension separately
  from the main phone number; version 1 blocks migrate with an empty extension.
  The news-tabs block v3 stores its block description as plain text; older rich-text
  descriptions are converted to readable plain text during migration.
  Version 4 adds an owner filter to every tab. Owner and category filters are combined;
  older tabs migrate to all owners so their existing results remain available.
  Version 5 limits the tab navigation to six items; older snapshots retain their
  first six tabs during migration.
  The image block v6 combines image-only and image-with-text presentation modes.
  Legacy `imageText` blocks migrate to the canonical image block while preserving
  their media, title, body, layout, and optional action.
  Version 7 renders image-only blocks at the source image's natural aspect ratio and
  stores semantic image size and alignment choices. Existing image blocks migrate to
  full-width, centered images; image-with-text framing remains unchanged.
  Block positions are constrained by their semantic width: full-width blocks are
  centered; wide blocks align to center or either full edge; standard blocks align
  to center, wide guides, or full edges; narrow blocks may use every guide.
  Incompatible legacy pairs normalize on read.
  The statistics block v3 stores its block description as plain text; earlier rich
  descriptions are converted to readable text during migration.
  Statistics block v4 uses the shared navigation icon catalog; legacy statistic
  icons migrate to their closest matching shared icon.
  Version 8 stores the image-only description as plain text; image-with-text content
  retains its rich-text behavior. Earlier image-only descriptions migrate to readable
  plain text.
  Version 9 lets image-with-text blocks either preserve the source image's natural
  ratio or crop it to a selected frame, and stores semantic 40/60, 50/50, or 60/40
  image-to-text column proportions. Existing blocks migrate to natural ratio and an
  even split.
  It stores an explicit single/slider mode; legacy hero and banner-slider v7
  snapshots migrate to the canonical banner-slider shape on read.
  The structured document-list block v4 adds the same heading sizes, defaulting
  to the previous 24px standard heading. Earlier snapshots migrate on read.
  The FAQ block v2 adds an optional heading and plain-text description above its
  questions. Version 1 snapshots migrate with both fields empty, preserving their
  existing public display.
  The unified documents block v4 limits its category tabs to six; older snapshots
  retain their first six tabs during migration. Version 5 adds an owner filter to
  each document tab and combines it with the selected document category, matching
  the owner-then-category query behavior of news tabs. Version 6 adds a per-tab
  fiscal-year filter (all years or a specific year); older
  tabs migrate to all years. The public block queries one page of published
  documents at a time. The documents block offers 10, 15, or 20 items per page
  for new settings and accepts legacy page sizes up to 20.
  Render Markdown safely; no arbitrary HTML, classes or scripts from content.
- The Page Builder and post editor share block defaults, settings UI, and renderer;
  the post editor only controls which block types can be inserted.
- Semantic block spacing supports none, small, standard, and large. On desktop
  these map to 0, 32, 48, and 64px; colored block surfaces use large spacing
  automatically. Narrow screens use the corresponding responsive scale.
- Dynamic blocks store queries, not copied records. Limit must be a positive bounded
  integer. Table rows must match header width.
  Table block v5 stores optional fixed column widths as an empty array for automatic
  sizing or one 80–2000px integer per header. Earlier blocks migrate to automatic
  sizing; when fixed widths exceed the available space, the table scrolls horizontally.
- A published document requires at least one valid file. Public evidence/notices
  must reference published documents. Check this again on public reads.
- MOIT parent and child belong to the same year; reject cycles. Codes are unique
  within a year. Evidence count is not proof that an assessment is complete.
- Procurement project number is unique per fiscal year. Related notices use the
  project's fiscal year. monthlyReport requires reportMonth 1–12; all other kinds
  require null. Budget is a non-negative safe integer in satang.
- Home is always present. Navigation allows one submenu level; internal links use
  typed references. Only external links store URLs; allow https/http only.
- Theme colors must be validated six-digit hex colors; verify readable foreground/
  background pairs before publication. Blocks store semantic surfaces only.
- featuredOnHomepage requires showInHospitalFeed. Unit ownership does not imply
  separate permissions. Keep references valid on archive/delete; prefer archive.
- A custom access grant targets exactly one principal: either one active user or one
  unit. Empty custom grant sets are invalid. Direct grants and membership grants are
  additive; disabling a user prevents session access even if a grant remains.
- Profile master references must match their declared kind. Profile media must be an
  image. A primary unit must also be one of that user's memberships. Phone numbers use
  9–10 digits and keep an optional extension of up to 6 digits separately. Contact details
  are private unless the corresponding publication flag is enabled. Profile image
  focus is stored as bounded X/Y percentages and follows the linked user into unit
  personnel rendering.
- Unit personnel entries may link to a user ID. Linked entries resolve the active
  user's display name, position, level and profile image at read time; the level is
  display-only and is not stored in the unit snapshot. Phone and email are
  exposed publicly only when their profile publication flags are enabled. Disabled
  linked users are omitted from public unit pages. Unlinked entries remain manual.
- Unit cover framing stores X/Y focus percentages (0–100) and an optional zoom
  factor (1–2) in the unit payload. Older units without zoom render at 1×.
- News cover framing stores integer X/Y focus percentages (0–100) and zoom
  (100–300%). Zoom applies only to full-frame (`cover`) mode; existing news defaults
  to 100%. Draft save, publish, duplicate, and discard preserve the appropriate framing.
- Enforce allowed file types and sizes server-side; sanitize filenames and never
  expose storage credentials. Before deleting a media asset, check direct references
  and media IDs embedded in page, post, and unit JSON; reject deletion and report all
  usages while any reference remains. Download counts are derived analytics, not editable.
- Audit is server-generated. Future revisions/snapshots are separate immutable
  records; revision counter alone is not undo history.

## Planned routes (not implemented)

Public: /, /news, /news/[slug], /units/[unitSlug], /documents, /moit,
/procurement, /services, /contact, /search, /[...pagePath].
Post canonical URLs remain /news/[slug] regardless of owner; unit pages filter by ID.

CMS: /admin with pages, posts, units, documents, moit, procurement, media,
navigation and settings. Use (public) and (admin) route groups under one root layout.
Route groups do not protect routes; implement server authentication separately.

## Website visit analytics

Public website visits are counted as sessions, not distinct people or page views.
The `hos_site_visit` HttpOnly, SameSite=Lax cookie identifies a 30-minute sliding
inactivity window. A new visit increments `cms_site_visit_daily` for the current
Asia/Bangkok calendar day and creates a `cms_site_visit_sessions` row containing
only start/last activity timestamps, landing path, broad source and device category,
and a hash of a random cookie token. No raw IP, referrer URL, or named visitor is
stored for these statistics. Admin activity and known bots are excluded. Old session
rows are removed after 90 days on subsequent visit writes; aggregate daily totals
remain. The admin dashboard shows today's count and its retrieval timestamp.

## Folder boundaries

src/features/<feature>/types.ts contains domain contracts.
src/features/pages/blocks/config contains semantic versioned block configuration.
src/types/content.ts contains genuinely shared primitives only.
Add renderers, editors, server repositories and runtime validators with their first
implementation. Do not fill the project with empty placeholder folders.

Heading blocks use schema version 2. They store the heading text plus an optional
plain-text description; version 1 snapshots migrate with an empty description.

Spacer blocks are retired in favor of Divider blocks using the `space` style.
Existing spacer snapshots migrate to that representation when read.
## Website announcements

`cms_announcements` stores administrator-managed entry announcements. A `MODAL` is a dismissible announcement shown on the first eligible public content route the visitor opens (including direct entry to `/news`), ordered by its display number: positive numbers ascend and `0` comes last. It has no scheduling UI or automatic activation. Authentication pages (`/login`, `/change-password`, `/profile`), admin pages and `/welcome` do not show modals. A `SPLASH` is a separate `/welcome` page checked only from the home route; it has no scheduling. Both can contain text or an image linked to `cms_media_assets`. Publishing a splash automatically unpublishes the previous splash. Splash and modal frequencies are independently set to `ALWAYS`, `SESSION`, `INTERVAL` (positive integer hours), or `ONCE_PER_CAMPAIGN` (the default for new records). Dismissing a modal records a per-announcement cookie for all modes except `ALWAYS`; content changes advance its `modal_cookie_version`, making the edited announcement visible again. Existing modals migrate to a 12-hour interval to preserve their previous default behavior. Eligible modals are displayed one after another in the same page without navigation; dismissing one advances to the next. The splash ID and cookie version identify its campaign; splash content edits keep its seen state, while frequency changes increment the splash cookie version.

Splash draft fields are separate from the JSON published snapshot. Saving an edit to a published splash changes only its draft fields and marks `has_unpublished_changes`; the public welcome page keeps reading the published snapshot until another publish. The editor identifies saved changes by field and can discard the draft to restore the published values. Publishing updates the snapshot atomically and advances the cookie version only when the published frequency or interval changes. The migration backfills snapshots for existing published splash screens.

Modal drafts also use `published_snapshot`. Saving a published modal changes only draft fields and records `has_unpublished_changes`; public reads use the snapshot. Publishing copies the draft to the snapshot atomically, and discarding a saved draft restores the published values. The modal migration backfills existing published rows. Image announcements require a meaningful image text alternative and do not render stale text content.


## Login failure window

`cms_users.failed_login_window_started_at` starts a fixed 15-minute window at
its first failed login. Five failures within that window lock new logins for
15 minutes. Expired windows restart at one failure; successful login, password
change/reset, and administrator unlock clear the counter and window. Attempts
during a lock do not extend it. Login updates serialize on the user row to avoid
losing concurrent failures. Administrator unlock is audited as `user.login.unlock`;
it does not enable a disabled account, change passwords, or revoke sessions.
The users table shows unexpired locks and exposes unlock through its existing
confirmation dialog. Login responses continue using the generic error message.
