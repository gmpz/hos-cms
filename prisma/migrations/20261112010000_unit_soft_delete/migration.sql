ALTER TABLE `cms_units` ADD COLUMN `deleted_at` DATETIME(3) NULL;

CREATE INDEX `cms_units_deleted_at_idx` ON `cms_units`(`deleted_at`);
