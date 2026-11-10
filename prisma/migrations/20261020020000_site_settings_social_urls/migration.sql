ALTER TABLE `cms_site_settings`
  ADD COLUMN `facebook_url` VARCHAR(2048) NOT NULL DEFAULT '' AFTER `map_url`,
  ADD COLUMN `youtube_url` VARCHAR(2048) NOT NULL DEFAULT '' AFTER `facebook_url`,
  ADD COLUMN `line_url` VARCHAR(2048) NOT NULL DEFAULT '' AFTER `youtube_url`;
