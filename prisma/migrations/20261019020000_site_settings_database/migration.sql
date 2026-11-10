CREATE TABLE `cms_site_settings` (
  `id` INTEGER UNSIGNED NOT NULL DEFAULT 1,
  `name` VARCHAR(160) NOT NULL,
  `english_name` VARCHAR(160) NOT NULL,
  `logo_media_id` VARCHAR(191) NULL,
  `homepage_id` VARCHAR(100) NULL,
  `address` TEXT NOT NULL,
  `phone` VARCHAR(40) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `theme` JSON NOT NULL,
  `revision` INTEGER UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `cms_site_settings_logo_media_id_idx`(`logo_media_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `cms_site_settings_singleton` CHECK (`id` = 1),
  CONSTRAINT `cms_site_settings_logo_media_id_fkey`
    FOREIGN KEY (`logo_media_id`) REFERENCES `cms_media_assets`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `cms_site_settings` (
  `id`, `name`, `english_name`, `logo_media_id`, `homepage_id`,
  `address`, `phone`, `email`, `theme`, `revision`
) VALUES (
  1,
  'โรงพยาบาลคลองหลวง',
  'Klong Luang Hospital',
  NULL,
  'home',
  '30 หมู่ 7 ต.คลองหก อ.คลองหลวง จ.ปทุมธานี',
  '02 904 6446',
  'contact@klongluanghospital.go.th',
  JSON_OBJECT(
    'primary', '#176B5B',
    'secondary', '#45AFA3',
    'accent', '#E2A13B',
    'emergency', '#C83E3E',
    'background', '#FFFDF7',
    'text', '#2C332F'
  ),
  1
);
