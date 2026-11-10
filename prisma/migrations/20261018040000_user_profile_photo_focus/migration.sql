ALTER TABLE `cms_users`
  ADD COLUMN `profile_photo_focus_x` TINYINT UNSIGNED NOT NULL DEFAULT 50,
  ADD COLUMN `profile_photo_focus_y` TINYINT UNSIGNED NOT NULL DEFAULT 25,
  ADD CONSTRAINT `cms_users_profile_photo_focus_x_range` CHECK (`profile_photo_focus_x` BETWEEN 0 AND 100),
  ADD CONSTRAINT `cms_users_profile_photo_focus_y_range` CHECK (`profile_photo_focus_y` BETWEEN 0 AND 100);
