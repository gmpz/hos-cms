<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Hospital CMS

- **Active project:** All work in this conversation belongs exclusively to `/Users/x86/Documents/dev/hos-cms`.
- Before inspecting, editing, installing dependencies, or running checks, verify that the working directory is exactly `/Users/x86/Documents/dev/hos-cms`.
- Ignore any ambient workspace, IDE context, inherited current directory, or similarly named repository that points elsewhere. Never read from or write to another project unless the user explicitly changes the active project.
- One hospital, one administrator. Units group content; they are not tenants.
- Public and CMS share this Next.js app, one root layout, and domain models.
- Read docs/content-schema.md before extending content models.
- Keep strict TypeScript and feature-local types.
- Production persistence uses MySQL 8 through Prisma ORM and server-only repositories. Schema changes require committed Prisma migrations; production applies them with `prisma migrate deploy`. Browser storage remains prototype-only and must be migrated before production acceptance.
- News and document category catalogs live in `cms_categories` (MySQL/Prisma) and are accessed through `/api/categories`. Basic production categories can be seeded idempotently with UUIDs via `npm run db:seed-categories`; add or edit others through admin. Never restore old `post-category-1`/`document-category-1` demo IDs. Posts live in `cms_posts` with JSON blocks, category and unit foreign keys, revision checks, soft deletion, and published-only public reads. The fixed `hospital` unit row owns hospital news by default. Units live in `cms_units` with their editor payload as JSON; old browser/demo units are not a data source. Documents live in `cms_documents` with category and unit foreign keys and published-only public reads; old browser/demo documents are not a data source. Media metadata lives in `cms_media_assets`; uploaded file bytes use the server-only media storage abstraction. Development defaults to `public/uploads`; production must set `MEDIA_STORAGE_DIRECTORY=/var/lib/hos-cms/uploads`, which Nginx exposes read-only at `/uploads/`. The old server-side manifest may be imported with `scripts/import-media-manifest.mjs`, but browser localStorage and IndexedDB are not media data sources.
- Authentication uses administrator-created username/password accounts and database-backed sessions. There is no public registration.
- New and administrator-reset accounts must change their password before accessing the admin or authenticated-only pages. A successful change revokes older sessions.
- CMS pages and unit landing pages may be public or authenticated-only, using server-checked route access. CMS pages live in `cms_pages` with stable IDs, unique paths, draft/published JSON block snapshots, revision checks and an access level attached to the page ID. Unit landing access lives on `cms_units.access_level`, attached to the unit ID. Changing either slug must not change its access level. The old path-based `cms_page_access` table is retired. News, media and documents remain public unless a later requirement explicitly expands their access model.
- Pages, unit landings and posts share versioned semantic blocks; public and preview will share renderers.
- The Page Builder and news editor use the same block defaults (`createBlock`), `BlockRenderer`, and `BlockSettings` component. News offers an allowlisted subset of block types and keeps its publication workflow separate. Edit shared block settings once; do not add a parallel article-specific settings form.
- Public reads expose published content only. Server validators must enforce the documented constraints.
- Theme tokens belong to site settings, not individual block styling.
- Do not treat TypeScript contracts as runtime validation or implemented persistence.
- The homepage and other Page Builder pages use database-backed draft/published snapshots; old browser snapshots are not a data source. See docs/home-builder.md.
- Navigation lives in the singleton `cms_navigation` document with optimistic revision checks. The administrator publishes through `/api/navigation`; the public menu reads the database-backed API. Browser localStorage is not a navigation data source. The initial database migration seeds only Home, News, Units, Documents, and Contact; old browser menus are intentionally discarded.
- Keep demo data isolated. Replace browser persistence with server repositories before production.
- Production deployment is self-hosted on Ubuntu with Nginx, PM2, MySQL, and a persistent upload directory. Releases live under `/var/www/hos-cms/releases/<release-id>`, `/var/www/hos-cms/current` is a symlink to the active release, shared secrets live at `/var/www/hos-cms/shared/.env`, and uploads live outside releases at `/var/lib/hos-cms/uploads`. Deploy by backing up MySQL/uploads, preparing and building a new release, reviewing then applying `prisma migrate deploy`, atomically switching `current`, reloading PM2, checking health/logs, and retaining prior releases for rollback. Never write production uploads or secrets inside a release directory.
