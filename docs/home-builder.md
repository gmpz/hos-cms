# Homepage builder persistence

- Public: /; CMS: /admin; editor: /admin/pages/home/builder.
- Supported blocks include the unified banner, plain text, posts and documents. The
  banner uses one canonical block with a single/slider mode; older hero and slider
  snapshots are migrated on read. These are a validated
  subset of the existing PageBlock union, not a new persisted block format.
- Editor preview and public homepage use the same BlockRenderer.
- Draft and published snapshots are stored separately in `cms_pages` JSON columns.
  Saving a draft does not publish; publishing updates the server-rendered public page.
- The default homepage is initialized in the database when first needed. Existing
  browser-local page snapshots are not imported, by product decision.
- Page access is stored on the page record, so changing the slug does not reset it.
- Demo posts and documents are isolated in features/pages/demo/data.ts.
  No real uploads, authentication or database writes exist.
- Four block editors are implemented. Remaining block types, unit lists, quick
  links, additional pages, menu management and system module pages are future work.
- Test manually: edit heading, save draft, reload editor; public remains unchanged.
  Publish, refresh public; heading updates. Change slug on an authenticated page
  and verify the new URL is protected. Hide/reorder blocks and check both previews.
- Content models distinguish editable pages from system module LinkTarget values.
  No new system routes are generated from navigation.
