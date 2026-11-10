ALTER TABLE `cms_pages`
  ADD COLUMN `draft_header` JSON NULL AFTER `published_blocks`,
  ADD COLUMN `published_header` JSON NULL AFTER `draft_header`;
