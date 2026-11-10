ALTER TABLE `cms_site_settings`
  ADD COLUMN `logo_focus_x` TINYINT UNSIGNED NOT NULL DEFAULT 50,
  ADD COLUMN `logo_focus_y` TINYINT UNSIGNED NOT NULL DEFAULT 50,
  ADD COLUMN `logo_zoom` SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  ADD CONSTRAINT `cms_site_settings_logo_focus_x_range` CHECK (`logo_focus_x` BETWEEN 0 AND 100),
  ADD CONSTRAINT `cms_site_settings_logo_focus_y_range` CHECK (`logo_focus_y` BETWEEN 0 AND 100),
  ADD CONSTRAINT `cms_site_settings_logo_zoom_range` CHECK (`logo_zoom` BETWEEN 100 AND 300);
