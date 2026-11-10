ALTER TABLE `cms_units`
  ADD COLUMN `sort_order` INTEGER UNSIGNED NOT NULL DEFAULT 0 AFTER `short_name`,
  DROP INDEX `cms_units_status_name_idx`,
  ADD INDEX `cms_units_status_sort_order_name_idx` (`status`, `sort_order`, `name`);
