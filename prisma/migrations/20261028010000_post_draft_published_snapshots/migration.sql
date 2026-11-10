ALTER TABLE `cms_posts`
  ADD COLUMN `published_snapshot` JSON NULL,
  ADD COLUMN `published_title` VARCHAR(300) NULL,
  ADD COLUMN `published_excerpt` TEXT NULL,
  ADD COLUMN `published_category_id` CHAR(36) NULL,
  ADD COLUMN `published_unit_id` VARCHAR(100) NULL,
  ADD COLUMN `published_owner` VARCHAR(160) NULL,
  ADD COLUMN `published_cover_media_id` VARCHAR(191) NULL,
  ADD COLUMN `has_unpublished_changes` BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE `cms_posts`
SET `published_snapshot` = JSON_OBJECT(
      'title', `title`,
      'excerpt', `excerpt`,
      'categoryId', `category_id`,
      'unitId', `unit_id`,
      'owner', `owner`,
      'coverMediaId', `cover_media_id`,
      'showCoverInContent', JSON_EXTRACT(IF(`show_cover_in_content`, 'true', 'false'), '$'),
      'blocks', `blocks`
    ),
    `published_title` = `title`,
    `published_excerpt` = `excerpt`,
    `published_category_id` = `category_id`,
    `published_unit_id` = `unit_id`,
    `published_owner` = `owner`,
    `published_cover_media_id` = `cover_media_id`
WHERE `status` = 'PUBLISHED';

CREATE INDEX `cms_posts_published_category_id_status_idx` ON `cms_posts`(`published_category_id`, `status`);
CREATE INDEX `cms_posts_published_unit_id_status_idx` ON `cms_posts`(`published_unit_id`, `status`);
