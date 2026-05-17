-- 盒子表：抽屉内的样本盒，支持简略(simple)和精细(precise)两种模式，精细模式设置网格行列
CREATE TABLE `boxes` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `drawer_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mode` enum('precise','simple') COLLATE utf8mb4_unicode_ci DEFAULT 'simple',
  `grid_rows` int DEFAULT NULL,
  `grid_cols` int DEFAULT NULL,
  `position` int DEFAULT NULL,
  `sample_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `project_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int DEFAULT '0',
  `owner` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `data_path` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_boxes_drawer_position` (`drawer_id`,`deleted_at`,`position`),
  CONSTRAINT `boxes_ibfk_1` FOREIGN KEY (`drawer_id`) REFERENCES `drawers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
