import pool from './db.js';

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  }
}

export async function runSchemaMigrations() {
  await ensureColumn('refrigerators', 'upper_temperature', '`upper_temperature` DECIMAL(5,1) NOT NULL DEFAULT -20.0');
  await ensureColumn('refrigerators', 'lower_temperature', '`lower_temperature` DECIMAL(5,1) NOT NULL DEFAULT 4.0');
  await ensureColumn('samples', 'uploader', '`uploader` VARCHAR(100) NULL AFTER `patient_id`');
  await ensureColumn('sub_samples', 'uploader', '`uploader` VARCHAR(100) NULL AFTER `patient_id`');
}
