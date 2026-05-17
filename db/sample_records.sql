-- 样本记录表(新)：患者样本核心数据，必填姓名+编号，可选来源/类型/阶段/时间/标签/备注
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
