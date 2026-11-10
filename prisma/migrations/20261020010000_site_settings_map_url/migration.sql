ALTER TABLE `cms_site_settings`
  ADD COLUMN `map_url` VARCHAR(2048) NOT NULL DEFAULT '' AFTER `address`;
