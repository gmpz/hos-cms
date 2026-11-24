-- CreateTable
CREATE TABLE `cms_user_totp` (
    `user_id` CHAR(36) NOT NULL,
    `encrypted_secret` VARCHAR(255) NOT NULL,
    `enabled_at` DATETIME(3) NULL,
    `last_used_step` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_user_recovery_codes` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `code_hash` CHAR(64) NOT NULL,
    `used_at` DATETIME(3) NULL,

    UNIQUE INDEX `cms_user_recovery_codes_code_hash_key`(`code_hash`),
    INDEX `cms_user_recovery_codes_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_login_challenges` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `return_to` VARCHAR(1000) NOT NULL,
    `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cms_login_challenges_token_hash_key`(`token_hash`),
    INDEX `cms_login_challenges_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cms_user_totp` ADD CONSTRAINT `cms_user_totp_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `cms_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cms_user_recovery_codes` ADD CONSTRAINT `cms_user_recovery_codes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `cms_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cms_login_challenges` ADD CONSTRAINT `cms_login_challenges_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `cms_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
