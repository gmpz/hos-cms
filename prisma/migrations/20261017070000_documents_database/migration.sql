CREATE TABLE `cms_documents` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(300) NOT NULL,
  `description` TEXT NOT NULL,
  `category_id` CHAR(36) NOT NULL,
  `unit_id` VARCHAR(100) NOT NULL DEFAULT 'hospital',
  `owner` VARCHAR(160) NOT NULL,
  `fiscal_year` INTEGER UNSIGNED NOT NULL,
  `document_number` VARCHAR(160) NOT NULL,
  `issued_on` DATE NULL,
  `media_id` VARCHAR(191) NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `published_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `cms_documents_status_published_at_idx`(`status`, `published_at`),
  INDEX `cms_documents_category_id_status_idx`(`category_id`, `status`),
  INDEX `cms_documents_unit_id_status_idx`(`unit_id`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cms_documents` ADD CONSTRAINT `cms_documents_category_id_fkey`
  FOREIGN KEY (`category_id`) REFERENCES `cms_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `cms_documents` ADD CONSTRAINT `cms_documents_unit_id_fkey`
  FOREIGN KEY (`unit_id`) REFERENCES `cms_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
