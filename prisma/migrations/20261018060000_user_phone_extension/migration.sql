ALTER TABLE `cms_users`
  ADD COLUMN `phone_extension` VARCHAR(6) NOT NULL DEFAULT '' AFTER `phone`;
