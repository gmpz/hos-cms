ALTER TABLE `cms_announcements` ADD COLUMN `splash_slot` TINYINT UNSIGNED NULL;

-- Keep the most recently published splash if older data contains duplicates.
UPDATE `cms_announcements`
SET `status` = 'DRAFT', `revision` = `revision` + 1
WHERE `display_mode` = 'SPLASH' AND `status` = 'PUBLISHED' AND `deleted_at` IS NULL
  AND `id` <> COALESCE((
    SELECT `id` FROM (
      SELECT `id` FROM `cms_announcements`
      WHERE `display_mode` = 'SPLASH' AND `status` = 'PUBLISHED' AND `deleted_at` IS NULL
      ORDER BY `published_at` DESC, `updated_at` DESC, `id` DESC LIMIT 1
    ) AS `newest_splash`
  ), '');

UPDATE `cms_announcements` SET `splash_slot` = 1
WHERE `display_mode` = 'SPLASH' AND `status` = 'PUBLISHED' AND `deleted_at` IS NULL;

CREATE UNIQUE INDEX `cms_announcements_splash_slot_key` ON `cms_announcements` (`splash_slot`);
