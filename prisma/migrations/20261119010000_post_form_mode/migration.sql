ALTER TABLE `cms_posts`
  ADD COLUMN `editor_mode` VARCHAR(16) NOT NULL DEFAULT 'blocks',
  ADD COLUMN `form_payload` JSON NULL;
