CREATE TABLE `cms_media_assets` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `kind` ENUM('IMAGE', 'DOCUMENT') NOT NULL,
  `mime_type` VARCHAR(191) NOT NULL,
  `size_bytes` INTEGER UNSIGNED NOT NULL,
  `alt` VARCHAR(500) NOT NULL,
  `file_name` VARCHAR(191) NOT NULL,
  `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `cms_media_assets_file_name_key`(`file_name`),
  INDEX `cms_media_assets_kind_uploaded_at_idx`(`kind`, `uploaded_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
