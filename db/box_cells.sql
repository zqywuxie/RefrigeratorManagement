CREATE TABLE `box_cells` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `box_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int NOT NULL,
  `barcode` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sample_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sample_volume` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sample_status` enum('normal','warning','critical','used','pending') COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `note` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_box_position` (`box_id`,`position`),
  CONSTRAINT `box_cells_ibfk_1` FOREIGN KEY (`box_id`) REFERENCES `boxes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
