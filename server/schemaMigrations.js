import pool from './db.js';
import { hashPassword } from './authUtils.js';

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  }
}

async function ensureUniqueIndex(table, indexName, columnsSql, duplicateQuery) {
  const [indexes] = await pool.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [indexName]);
  if (indexes.length > 0) return;

  const [duplicates] = await pool.query(duplicateQuery);
  if (duplicates.length > 0) {
    console.warn(
      `Skip unique index ${indexName}: duplicate positions already exist in ${table}. Please clean them before enabling this constraint.`,
    );
    return;
  }

  await pool.query(`ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${indexName}\` (${columnsSql})`);
}

async function dropIndexIfExists(table, indexName) {
  const [indexes] = await pool.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [indexName]);
  if (indexes.length > 0) {
    await pool.query(`ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\``);
  }
}

async function ensureIndex(table, indexName, columnsSql) {
  const [indexes] = await pool.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [indexName]);
  if (indexes.length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columnsSql})`);
  }
}

export async function runSchemaMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('root','user') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  await ensureColumn('refrigerators', 'upper_temperature', '`upper_temperature` DECIMAL(5,1) NOT NULL DEFAULT -20.0');
  await ensureColumn('refrigerators', 'lower_temperature', '`lower_temperature` DECIMAL(5,1) NOT NULL DEFAULT 4.0');
  await ensureColumn('samples', 'uploader', '`uploader` VARCHAR(100) NULL AFTER `patient_id`');
  await ensureColumn('sub_samples', 'uploader', '`uploader` VARCHAR(100) NULL AFTER `patient_id`');
  await ensureColumn('samples', 'created_by', '`created_by` VARCHAR(50) NULL AFTER `uploader`');
  await ensureColumn('sub_samples', 'created_by', '`created_by` VARCHAR(50) NULL AFTER `uploader`');
  await ensureColumn('refrigerators', 'deleted_at', '`deleted_at` TIMESTAMP NULL AFTER `updated_at`');
  await ensureColumn('refrigerators', 'deleted_by', '`deleted_by` VARCHAR(50) NULL AFTER `deleted_at`');
  await ensureColumn('samples', 'deleted_at', '`deleted_at` TIMESTAMP NULL AFTER `updated_at`');
  await ensureColumn('samples', 'deleted_by', '`deleted_by` VARCHAR(50) NULL AFTER `deleted_at`');
  await ensureColumn('sub_samples', 'deleted_at', '`deleted_at` TIMESTAMP NULL AFTER `updated_at`');
  await ensureColumn('sub_samples', 'deleted_by', '`deleted_by` VARCHAR(50) NULL AFTER `deleted_at`');
  await dropIndexIfExists('samples', 'uniq_samples_fridge_compartment_position');
  await dropIndexIfExists('sub_samples', 'uniq_sub_samples_sample_position');
  await ensureIndex('samples', 'idx_samples_active_position', '`refrigerator_id`, `deleted_at`, `compartment`, `position`');
  await ensureIndex('sub_samples', 'idx_sub_samples_active_position', '`sample_id`, `deleted_at`, `position`');

  // Drawer Freezer support
  await ensureColumn('refrigerators', 'fridge_type', "`fridge_type` ENUM('drawer','shelf') DEFAULT 'drawer' AFTER `lower_temperature`");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS upper_items (
      id VARCHAR(36) PRIMARY KEY,
      refrigerator_id VARCHAR(36) NOT NULL,
      \`row_number\` INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      item_type ENUM('试剂','样本','耗材','临时物品') NOT NULL DEFAULT '样本',
      quantity INT DEFAULT 1,
      owner VARCHAR(100),
      tags JSON,
      note TEXT,
      image_url VARCHAR(500),
      qr_code VARCHAR(200),
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      FOREIGN KEY (refrigerator_id) REFERENCES refrigerators(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS drawers (
      id VARCHAR(36) PRIMARY KEY,
      refrigerator_id VARCHAR(36) NOT NULL,
      layer INT NOT NULL,
      row_pos INT NOT NULL,
      col_pos INT NOT NULL,
      label VARCHAR(50),
      max_boxes INT DEFAULT 10,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (refrigerator_id) REFERENCES refrigerators(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS boxes (
      id VARCHAR(36) PRIMARY KEY,
      drawer_id VARCHAR(36) NOT NULL,
      name VARCHAR(200) NOT NULL,
      mode ENUM('precise','simple') DEFAULT 'simple',
      grid_rows INT DEFAULT NULL,
      grid_cols INT DEFAULT NULL,
      sample_type VARCHAR(100),
      project_name VARCHAR(200),
      quantity INT DEFAULT 0,
      owner VARCHAR(100),
      tags JSON,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      FOREIGN KEY (drawer_id) REFERENCES drawers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS box_cells (
      id VARCHAR(36) PRIMARY KEY,
      box_id VARCHAR(36) NOT NULL,
      position INT NOT NULL,
      barcode VARCHAR(100),
      sample_name VARCHAR(200),
      sample_status ENUM('normal','warning','critical','used','pending') DEFAULT 'normal',
      note TEXT,
      FOREIGN KEY (box_id) REFERENCES boxes(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_box_position (box_id, position)
    ) ENGINE=InnoDB
  `);

  const [[root]] = await pool.query('SELECT username FROM users WHERE username = ?', ['root']);
  if (!root) {
    await pool.query(
      'INSERT INTO users (id, username, password_hash, role) VALUES (UUID(), ?, ?, ?)',
      ['root', hashPassword('root123'), 'root'],
    );
  }
}
