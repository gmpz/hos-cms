CREATE TABLE `cms_users` (
  `id` CHAR(36) NOT NULL,
  `username` VARCHAR(80) NOT NULL,
  `display_name` VARCHAR(160) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
  `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `must_change_password` BOOLEAN NOT NULL DEFAULT true,
  `failed_login_attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` DATETIME(3) NULL,
  `last_login_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `cms_users_username_key`(`username`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cms_sessions` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `cms_sessions_token_hash_key`(`token_hash`),
  INDEX `cms_sessions_expires_at_idx`(`expires_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cms_page_access` (
  `page_path` VARCHAR(500) NOT NULL,
  `access_level` ENUM('PUBLIC', 'AUTHENTICATED') NOT NULL DEFAULT 'PUBLIC',
  `updated_by` CHAR(36) NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`page_path`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cms_sessions` ADD CONSTRAINT `cms_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `cms_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cms_page_access` ADD CONSTRAINT `cms_page_access_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `cms_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
