CREATE TABLE `cms_navigation` (
  `id` INTEGER NOT NULL,
  `document` JSON NOT NULL,
  `revision` INTEGER UNSIGNED NOT NULL DEFAULT 1,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Start with basic site navigation. No browser data is imported.
INSERT INTO `cms_navigation` (`id`, `document`, `revision`) VALUES (
  1,
  '{"home":{"label":"หน้าแรก"},"items":[{"id":"nav-news","kind":"link","label":"ข่าวสาร","target":{"kind":"module","module":"news"},"visible":true,"openInNewTab":false,"hideWhenLoggedOut":false},{"id":"nav-units","kind":"link","label":"หน่วยงาน","target":{"kind":"module","module":"units"},"visible":true,"openInNewTab":false,"hideWhenLoggedOut":false},{"id":"nav-documents","kind":"link","label":"เอกสาร","target":{"kind":"module","module":"documents"},"visible":true,"openInNewTab":false,"hideWhenLoggedOut":false},{"id":"nav-contact","kind":"link","label":"ติดต่อเรา","target":{"kind":"module","module":"contact"},"visible":true,"openInNewTab":false,"hideWhenLoggedOut":false}]}',
  1
);
