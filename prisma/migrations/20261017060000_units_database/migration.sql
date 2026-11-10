CREATE TABLE `cms_units` (
  `id` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `short_name` VARCHAR(160) NOT NULL,
  `status` ENUM('DRAFT','PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  `payload` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `cms_units_slug_key`(`slug`),
  INDEX `cms_units_status_name_idx`(`status`, `name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `cms_units` (`id`, `slug`, `name`, `short_name`, `status`, `payload`)
VALUES ('hospital', 'hospital', 'โรงพยาบาลคลองหลวง', 'โรงพยาบาล', 'PUBLISHED', '{}');

-- The only legacy department-owned post was explicitly retired before this migration.
-- Existing hospital news and retired news both keep valid ownership references.
UPDATE `cms_posts` SET `unit_id` = 'hospital' WHERE `unit_id` IS NULL OR `deleted_at` IS NOT NULL;
ALTER TABLE `cms_posts` MODIFY `unit_id` VARCHAR(100) NOT NULL DEFAULT 'hospital';
ALTER TABLE `cms_posts` ADD CONSTRAINT `cms_posts_unit_id_fkey`
  FOREIGN KEY (`unit_id`) REFERENCES `cms_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
