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
  'splashFrequency', `splash_frequency`,
  'splashIntervalHours', `splash_interval_hours`
)
WHERE `display_mode` = 'SPLASH' AND `status` = 'PUBLISHED';
