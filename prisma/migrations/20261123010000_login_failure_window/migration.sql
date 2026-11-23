ALTER TABLE `cms_users`
  ADD COLUMN `failed_login_window_started_at` DATETIME(3) NULL;

-- Old failures had no window. Reset their counter but preserve existing locks.
UPDATE `cms_users` SET `failed_login_attempts` = 0;
