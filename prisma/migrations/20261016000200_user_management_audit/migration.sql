CREATE TABLE `cms_audit_logs` (
  `id` CHAR(36) NOT NULL,
  `actor_id` CHAR(36) NULL,
  `action` VARCHAR(80) NOT NULL,
  `entity_type` VARCHAR(80) NOT NULL,
  `entity_id` VARCHAR(191) NOT NULL,
  `summary` VARCHAR(500) NOT NULL,
  `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `cms_audit_logs_occurred_at_idx`(`occurred_at`),
  INDEX `cms_audit_logs_actor_id_idx`(`actor_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cms_audit_logs`
  ADD CONSTRAINT `cms_audit_logs_actor_id_fkey`
  FOREIGN KEY (`actor_id`) REFERENCES `cms_users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
