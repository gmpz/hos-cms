# Browser storage audit

Audit date: 2026-10-19

The production CMS does not use browser storage as a content or media data source.
There are no IndexedDB usages in the application. Legacy localStorage cleanup code
for categories, posts, documents, units, and site settings has been removed.

The only remaining localStorage value is `hos-cms:admin-sidebar-collapsed`. It stores
one user's visual sidebar preference and is safe to lose, clear, or differ between
browsers. It does not contain CMS content, authentication state, permissions, or
publication data.

Any future browser-storage usage must be limited to disposable UI preferences. New
content, configuration, authentication, media metadata, and workflow state must be
persisted through server APIs and MySQL.
