CREATE TABLE `refrigerators` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `upper_rows` int NOT NULL DEFAULT '2',
  `upper_cols` int NOT NULL DEFAULT '3',
  `lower_rows` int NOT NULL DEFAULT '2',
  `lower_cols` int NOT NULL DEFAULT '2',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `upper_temperature` decimal(5,1) NOT NULL DEFAULT '-20.0',
  `lower_temperature` decimal(5,1) NOT NULL DEFAULT '4.0',
  `fridge_type` enum('drawer','shelf') COLLATE utf8mb4_unicode_ci DEFAULT 'drawer',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
