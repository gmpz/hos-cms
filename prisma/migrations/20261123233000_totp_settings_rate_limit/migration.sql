-- AlterTable
ALTER TABLE `cms_user_totp` ADD COLUMN `failed_verification_attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN `failed_verification_window_started_at` DATETIME(3) NULL,
    ADD COLUMN `verification_blocked_until` DATETIME(3) NULL;
