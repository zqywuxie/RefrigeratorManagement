CREATE TABLE `drawers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refrigerator_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `layer` int NOT NULL,
  `row_pos` int NOT NULL,
  `col_pos` int NOT NULL,
  `label` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_boxes` int DEFAULT '5',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `refrigerator_id` (`refrigerator_id`),
  CONSTRAINT `drawers_ibfk_1` FOREIGN KEY (`refrigerator_id`) REFERENCES `refrigerators` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
