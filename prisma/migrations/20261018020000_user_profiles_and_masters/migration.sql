CREATE TABLE `cms_profile_masters` (
  `id` CHAR(36) NOT NULL,
  `kind` ENUM('PERSON_TYPE', 'POSITION', 'LEVEL') NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `sort_order` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `cms_profile_masters_kind_name_key`(`kind`, `name`),
  INDEX `cms_profile_masters_kind_sort_order_idx`(`kind`, `sort_order`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cms_users`
  ADD COLUMN `person_type_id` CHAR(36) NULL,
  ADD COLUMN `position_id` CHAR(36) NULL,
  ADD COLUMN `level_id` CHAR(36) NULL,
  ADD COLUMN `profile_media_id` VARCHAR(191) NULL,
  ADD COLUMN `phone` VARCHAR(40) NOT NULL DEFAULT '',
  ADD COLUMN `email` VARCHAR(254) NOT NULL DEFAULT '',
  ADD COLUMN `publish_phone` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `publish_email` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `cms_users` ADD CONSTRAINT `cms_users_person_type_id_fkey` FOREIGN KEY (`person_type_id`) REFERENCES `cms_profile_masters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `cms_users` ADD CONSTRAINT `cms_users_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `cms_profile_masters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `cms_users` ADD CONSTRAINT `cms_users_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `cms_profile_masters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `cms_users` ADD CONSTRAINT `cms_users_profile_media_id_fkey` FOREIGN KEY (`profile_media_id`) REFERENCES `cms_media_assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `cms_user_units` (
  `user_id` CHAR(36) NOT NULL,
  `unit_id` VARCHAR(100) NOT NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT false,
  INDEX `cms_user_units_unit_id_user_id_idx`(`unit_id`, `user_id`),
  PRIMARY KEY (`user_id`, `unit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cms_user_units` ADD CONSTRAINT `cms_user_units_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `cms_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cms_user_units` ADD CONSTRAINT `cms_user_units_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `cms_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
