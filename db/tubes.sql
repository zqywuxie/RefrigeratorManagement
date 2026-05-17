-- 试管表(新)：样本记录下的试管，每个试管占据盒子一个孔位(box_id+position唯一)，支持拖拽移动
CREATE TABLE `tubes` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sample_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tube_label` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `box_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int NOT NULL,
  `barcode` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `volume` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('normal','warning','critical','used','pending') COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_box_position` (`box_id`,`position`),
  KEY `sample_id` (`sample_id`),
  CONSTRAINT `tubes_ibfk_1` FOREIGN KEY (`sample_id`) REFERENCES `sample_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tubes_ibfk_2` FOREIGN KEY (`box_id`) REFERENCES `boxes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
