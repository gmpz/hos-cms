CREATE TABLE `cms_pages` (
  `id` VARCHAR(100) NOT NULL,
  `path` VARCHAR(500) NOT NULL,
  `name` VARCHAR(300) NOT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  `access_level` ENUM('PUBLIC', 'AUTHENTICATED') NOT NULL DEFAULT 'PUBLIC',
  `draft_blocks` JSON NOT NULL,
  `published_blocks` JSON NULL,
  `revision` INTEGER UNSIGNED NOT NULL DEFAULT 1,
  `published_at` DATETIME(3) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `cms_pages_path_key`(`path`),
  INDEX `cms_pages_status_updated_at_idx`(`status`, `updated_at`),
  INDEX `cms_pages_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
