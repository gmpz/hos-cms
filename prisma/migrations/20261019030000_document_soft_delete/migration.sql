ALTER TABLE `cms_documents` ADD COLUMN `deleted_at` DATETIME(3) NULL;

CREATE INDEX `cms_documents_deleted_at_idx` ON `cms_documents`(`deleted_at`);
