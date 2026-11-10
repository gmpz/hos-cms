ALTER TABLE `cms_users`
  ADD COLUMN `profile_photo_zoom` SMALLINT UNSIGNED NOT NULL DEFAULT 100;

ALTER TABLE `cms_users`
  ADD CONSTRAINT `cms_users_profile_photo_zoom_range`
  CHECK (`profile_photo_zoom` BETWEEN 100 AND 300);
