CREATE TABLE `cms_site_visit_sessions` (
  `id` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_activity_at` DATETIME(3) NOT NULL,
  `landing_path` VARCHAR(300) NOT NULL,
  `source` VARCHAR(20) NOT NULL,
  `device` VARCHAR(20) NOT NULL,
  UNIQUE INDEX `cms_site_visit_sessions_token_hash_key` (`token_hash`),
  INDEX `cms_site_visit_sessions_started_at_idx` (`started_at`),
  INDEX `cms_site_visit_sessions_last_activity_at_idx` (`last_activity_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cms_site_visit_daily` (
  `day` DATE NOT NULL,
  `visits` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
