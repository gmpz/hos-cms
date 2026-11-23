ALTER TABLE `cms_announcements`
  ADD COLUMN `published_snapshot` JSON NULL,
  ADD COLUMN `has_unpublished_changes` BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE `cms_announcements`
SET `published_snapshot` = JSON_OBJECT(
  'title', `title`,
  'description', `description`,
  'contentMode', `content_mode`,
  'imageMediaId', `image_media_id`,
  'imageAlt', `image_alt`,
  'buttonLabel', `button_label`,
  'buttonUrl', `button_url`,
  'openInNewTab', JSON_EXTRACT(IF(`open_in_new_tab`, 'true', 'false'), '$'),
  'allowSuppression', JSON_EXTRACT(IF(`allow_suppression`, 'true', 'false'), '$'),
  'repeatAfterDays', `repeat_after_days`,
  'priority', `priority`
), `has_unpublished_changes` = FALSE
WHERE `display_mode` = 'MODAL' AND `status` = 'PUBLISHED' AND `published_snapshot` IS NULL;

UPDATE `cms_announcements`
SET `published_snapshot` = JSON_OBJECT(
  'title', `title`,
  'description', `description`,
  'contentMode', `content_mode`,
  'imageMediaId', `image_media_id`,
  'imageAlt', `image_alt`,
  'buttonLabel', `button_label`,
  'splashFrequency', `splash_frequency`,
  'splashIntervalHours', `splash_interval_hours`
)
WHERE `display_mode` = 'SPLASH' AND `status` = 'PUBLISHED';
