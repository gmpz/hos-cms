ALTER TABLE `cms_pages` MODIFY `access_level` ENUM('PUBLIC', 'AUTHENTICATED', 'CUSTOM') NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE `cms_units` MODIFY `access_level` ENUM('PUBLIC', 'AUTHENTICATED', 'CUSTOM') NOT NULL DEFAULT 'PUBLIC';

CREATE TABLE `cms_page_access_grants` (
  `id` CHAR(36) NOT NULL,
  `page_id` VARCHAR(100) NOT NULL,
  `unit_id` VARCHAR(100) NULL,
  `user_id` CHAR(36) NULL,
  UNIQUE INDEX `cms_page_access_grants_page_id_unit_id_key`(`page_id`, `unit_id`),
  UNIQUE INDEX `cms_page_access_grants_page_id_user_id_key`(`page_id`, `user_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `cms_page_access_grants_one_principal` CHECK ((`unit_id` IS NULL) <> (`user_id` IS NULL))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cms_page_access_grants` ADD CONSTRAINT `cms_page_access_grants_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `cms_pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- MySQL prohibits referential actions on columns used by a CHECK constraint.
-- Keep principal rows immutable/deletion-restricted so the one-principal CHECK
-- can enforce that every grant targets exactly one unit or one user.
ALTER TABLE `cms_page_access_grants` ADD CONSTRAINT `cms_page_access_grants_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `cms_units`(`id`);
ALTER TABLE `cms_page_access_grants` ADD CONSTRAINT `cms_page_access_grants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `cms_users`(`id`);

CREATE TABLE `cms_unit_access_grants` (
  `id` CHAR(36) NOT NULL,
  `resource_unit_id` VARCHAR(100) NOT NULL,
  `unit_id` VARCHAR(100) NULL,
  `user_id` CHAR(36) NULL,
  UNIQUE INDEX `cms_unit_access_grants_resource_unit_id_unit_id_key`(`resource_unit_id`, `unit_id`),
  UNIQUE INDEX `cms_unit_access_grants_resource_unit_id_user_id_key`(`resource_unit_id`, `user_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `cms_unit_access_grants_one_principal` CHECK ((`unit_id` IS NULL) <> (`user_id` IS NULL))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cms_unit_access_grants` ADD CONSTRAINT `cms_unit_access_grants_resource_unit_id_fkey` FOREIGN KEY (`resource_unit_id`) REFERENCES `cms_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cms_unit_access_grants` ADD CONSTRAINT `cms_unit_access_grants_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `cms_units`(`id`);
ALTER TABLE `cms_unit_access_grants` ADD CONSTRAINT `cms_unit_access_grants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `cms_users`(`id`);
