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

  const [[root]] = await pool.query('SELECT username FROM users WHERE username = ?', ['root']);
  if (!root) {
    await pool.query(
      'INSERT INTO users (id, username, password_hash, role) VALUES (UUID(), ?, ?, ?)',
      ['root', hashPassword('root123'), 'root'],
    );
  }
}
