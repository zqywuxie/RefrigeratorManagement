-- 样本类型表：样本的分类标签（血清/血浆/尿液/DNA/组织/全血等）
CREATE TABLE `sample_types` (
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
