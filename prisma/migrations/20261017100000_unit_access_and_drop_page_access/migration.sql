ALTER TABLE `cms_units`
  ADD COLUMN `access_level` ENUM('PUBLIC', 'AUTHENTICATED') NOT NULL DEFAULT 'PUBLIC';

-- Preserve existing unit restrictions before removing path-based access.
UPDATE `cms_units` AS unit
INNER JOIN `cms_page_access` AS access
  ON access.`page_path` = CONCAT('units/', unit.`slug`)
SET unit.`access_level` = access.`access_level`;

DROP TABLE `cms_page_access`;
