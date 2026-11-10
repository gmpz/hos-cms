CREATE INDEX `cms_documents_deleted_at_fiscal_year_idx` ON `cms_documents`(`deleted_at`, `fiscal_year`);
CREATE INDEX `cms_documents_status_deleted_at_fiscal_year_idx` ON `cms_documents`(`status`, `deleted_at`, `fiscal_year`);
