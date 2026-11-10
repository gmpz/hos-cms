ALTER TABLE `cms_units`
  ADD COLUMN `draft_access_grants` JSON NULL,
  ADD COLUMN `published_payload` JSON NULL,
  ADD COLUMN `published_slug` VARCHAR(191) NULL,
  ADD COLUMN `published_access_level` ENUM('PUBLIC', 'AUTHENTICATED', 'CUSTOM') NULL,
  ADD COLUMN `published_at` DATETIME(3) NULL,
  ADD COLUMN `has_unpublished_changes` BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE `cms_units` AS unit
SET unit.`draft_access_grants` = JSON_OBJECT(
  'unitIds', COALESCE((SELECT JSON_ARRAYAGG(grant_unit.`unit_id`) FROM `cms_unit_access_grants` AS grant_unit WHERE grant_unit.`resource_unit_id` = unit.`id` AND grant_unit.`unit_id` IS NOT NULL), JSON_ARRAY()),
  'userIds', COALESCE((SELECT JSON_ARRAYAGG(grant_user.`user_id`) FROM `cms_unit_access_grants` AS grant_user WHERE grant_user.`resource_unit_id` = unit.`id` AND grant_user.`user_id` IS NOT NULL), JSON_ARRAY())
);

UPDATE `cms_units`
SET `published_payload` = `payload`,
    `published_slug` = `slug`,
    `published_access_level` = `access_level`,
    `published_at` = `updated_at`
WHERE `status` = 'PUBLISHED';

ALTER TABLE `cms_units`
  MODIFY COLUMN `draft_access_grants` JSON NOT NULL,
  ADD UNIQUE INDEX `cms_units_published_slug_key` (`published_slug`);
