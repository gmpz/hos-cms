-- CreateTable
CREATE TABLE `cms_categories` (
    `id` CHAR(36) NOT NULL,
    `scope` ENUM('POSTS', 'DOCUMENTS') NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `sort_order` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cms_categories_scope_sort_order_idx`(`scope`, `sort_order`),
    UNIQUE INDEX `cms_categories_scope_name_key`(`scope`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
