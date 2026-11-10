ALTER TABLE `cms_posts` ADD COLUMN `deleted_at` DATETIME(3) NULL;
CREATE INDEX `cms_posts_deleted_at_idx` ON `cms_posts`(`deleted_at`);
