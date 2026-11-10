CREATE TABLE `cms_posts` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `excerpt` TEXT NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `unit_id` VARCHAR(100) NULL,
    `owner` VARCHAR(160) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `cover_media_id` VARCHAR(191) NULL,
    `show_cover_in_content` BOOLEAN NOT NULL DEFAULT true,
    `blocks` JSON NOT NULL,
    `view_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `revision` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cms_posts_slug_key`(`slug`),
    INDEX `cms_posts_status_published_at_idx`(`status`, `published_at`),
    INDEX `cms_posts_category_id_status_idx`(`category_id`, `status`),
    INDEX `cms_posts_unit_id_status_idx`(`unit_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cms_posts` ADD CONSTRAINT `cms_posts_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `cms_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
