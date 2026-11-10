ALTER TABLE `cms_announcements`
  ADD COLUMN `modal_frequency` VARCHAR(32) NOT NULL DEFAULT 'ONCE_PER_CAMPAIGN',
  ADD COLUMN `modal_interval_hours` SMALLINT UNSIGNED NOT NULL DEFAULT 24;

-- Existing modal announcements previously reappeared 12 hours after dismissal.
UPDATE `cms_announcements`
SET `modal_frequency` = 'INTERVAL', `modal_interval_hours` = 12
WHERE `display_mode` = 'MODAL';

UPDATE `cms_announcements`
SET `published_snapshot` = JSON_SET(`published_snapshot`,
  '$.modalFrequency', 'INTERVAL', '$.modalIntervalHours', 12)
WHERE `display_mode` = 'MODAL' AND `published_snapshot` IS NOT NULL;
