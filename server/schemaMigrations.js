import pool from './db.js';
import { hashPassword } from './authUtils.js';

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
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

  const [[root]] = await pool.query('SELECT username FROM users WHERE username = ?', ['root']);
  if (!root) {
    await pool.query(
      'INSERT INTO users (id, username, password_hash, role) VALUES (UUID(), ?, ?, ?)',
      ['root', hashPassword('root123'), 'root'],
    );
  }
}
