-- Biofridge Database Schema
-- Generated: 2026-05-17T02:36:40.293Z

-- Table: box_cells
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

-- Table: boxes
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

-- Table: drawers
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

-- Table: item_types
CREATE TABLE `item_types` (
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: refrigerators
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

-- Table: sample_records
CREATE TABLE `sample_records` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sample_code` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sample_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collection_stage` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collected_at` datetime DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `group_color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploader` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: sample_types
CREATE TABLE `sample_types` (
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: samples
CREATE TABLE `samples` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refrigerator_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('normal','warning','critical','used','pending') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `temperature` decimal(5,1) NOT NULL,
  `collected_at` date DEFAULT NULL,
  `patient_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploader` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `compartment` enum('upper','lower') COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `volume` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grid_rows` int NOT NULL DEFAULT '2',
  `grid_cols` int NOT NULL DEFAULT '2',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fridge` (`refrigerator_id`),
  KEY `idx_fridge_comp_pos` (`refrigerator_id`,`compartment`,`position`),
  KEY `idx_samples_active_position` (`refrigerator_id`,`deleted_at`,`compartment`,`position`),
  CONSTRAINT `samples_ibfk_1` FOREIGN KEY (`refrigerator_id`) REFERENCES `refrigerators` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: sub_samples
CREATE TABLE `sub_samples` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sample_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('normal','warning','critical','used','pending') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `temperature` decimal(5,1) NOT NULL,
  `collected_at` date DEFAULT NULL,
  `patient_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploader` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `position` int NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `volume` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sample` (`sample_id`),
  KEY `idx_sub_samples_active_position` (`sample_id`,`deleted_at`,`position`),
  CONSTRAINT `sub_samples_ibfk_1` FOREIGN KEY (`sample_id`) REFERENCES `samples` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: tubes
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

-- Table: upper_items
CREATE TABLE `upper_items` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refrigerator_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `row_number` int NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '样本',
  `box_mode` enum('simple','precise') COLLATE utf8mb4_unicode_ci DEFAULT 'simple',
  `grid_rows` int DEFAULT NULL,
  `grid_cols` int DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `owner` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qr_code` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `refrigerator_id` (`refrigerator_id`),
  CONSTRAINT `upper_items_ibfk_1` FOREIGN KEY (`refrigerator_id`) REFERENCES `refrigerators` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: users
CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('root','user') COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

