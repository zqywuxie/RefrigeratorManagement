import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';
import pool from './db.js';
import { hashPassword } from './authUtils.js';

if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_DATA !== 'true') {
  console.log('Seed skipped in production. Set SEED_DEMO_DATA=true only for demo/test environments.');
  process.exit(0);
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('root','user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS refrigerators (
    id          VARCHAR(36)  PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    upper_rows  INT NOT NULL DEFAULT 2,
    upper_cols  INT NOT NULL DEFAULT 3,
    lower_rows  INT NOT NULL DEFAULT 2,
    lower_cols  INT NOT NULL DEFAULT 2,
    upper_temperature DECIMAL(5,1) NOT NULL DEFAULT -20.0,
    lower_temperature DECIMAL(5,1) NOT NULL DEFAULT 4.0,
    fridge_type ENUM('drawer','shelf') DEFAULT 'drawer',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP NULL,
    deleted_by  VARCHAR(50)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS samples (
    id              VARCHAR(20) PRIMARY KEY,
    refrigerator_id VARCHAR(36) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    type            ENUM('血清','血浆','尿液','DNA','组织','全血') NOT NULL,
    status          ENUM('normal','warning','critical','used','pending') NOT NULL DEFAULT 'normal',
    temperature     DECIMAL(5,1) NOT NULL,
    collected_at    DATE NOT NULL,
    patient_id      VARCHAR(50),
    uploader        VARCHAR(100),
    created_by      VARCHAR(50),
    tags            JSON,
    compartment     ENUM('upper','lower') NOT NULL,
    position        INT NOT NULL,
    note            TEXT,
    volume          VARCHAR(20),
    grid_rows       INT NOT NULL DEFAULT 2,
    grid_cols       INT NOT NULL DEFAULT 2,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL,
    deleted_by      VARCHAR(50),
    FOREIGN KEY (refrigerator_id) REFERENCES refrigerators(id) ON DELETE CASCADE,
    INDEX idx_fridge (refrigerator_id),
    INDEX idx_samples_active_position (refrigerator_id, deleted_at, compartment, position)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS item_types (
    name VARCHAR(100) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS upper_items (
    id VARCHAR(36) PRIMARY KEY,
    refrigerator_id VARCHAR(36) NOT NULL,
    \`row_number\` INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    item_type VARCHAR(100) NOT NULL DEFAULT '样本',
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
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS sub_samples (
    id            VARCHAR(20) PRIMARY KEY,
    sample_id     VARCHAR(20) NOT NULL,
    name          VARCHAR(200) NOT NULL,
    type          ENUM('血清','血浆','尿液','DNA','组织','全血') NOT NULL,
    status        ENUM('normal','warning','critical','used','pending') NOT NULL DEFAULT 'normal',
    temperature   DECIMAL(5,1) NOT NULL,
    collected_at  DATE NOT NULL,
    patient_id    VARCHAR(50),
    uploader      VARCHAR(100),
    created_by    VARCHAR(50),
    tags          JSON,
    position      INT NOT NULL,
    note          TEXT,
    volume        VARCHAR(20),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP NULL,
    deleted_by    VARCHAR(50),
    FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
    INDEX idx_sample (sample_id),
    INDEX idx_sub_samples_active_position (sample_id, deleted_at, position)
  ) ENGINE=InnoDB`,
];

const FRIDGE_ID = 'fridge-default-001';
const SHELF_FRIDGE_ID = 'fridge-shelf-4space-001';

const FRIDGE = {
  id: FRIDGE_ID,
  name: '主冰箱',
  description: '默认生物样本存储冰箱',
  upper_rows: 2,
  upper_cols: 3,
  lower_rows: 2,
  lower_cols: 2,
  upper_temperature: -80,
  lower_temperature: -80,
  fridge_type: 'drawer',
};

const SHELF_FRIDGE = {
  id: SHELF_FRIDGE_ID,
  name: '四层大空间冰箱',
  description: '四层固定大空间存储冰箱',
  upper_rows: 2,
  upper_cols: 1,
  lower_rows: 2,
  lower_cols: 1,
  upper_temperature: -20,
  lower_temperature: 4,
  fridge_type: 'shelf',
};

const SAMPLES = [];
const SUB_SAMPLES = [];

async function ensureColumn(conn, table, column, definition) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (rows.length === 0) {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
    console.log(`Added ${table}.${column}`);
  }
}

async function main() {
  const conn = await pool.getConnection();
  try {
    console.log('Creating tables...');
    for (const stmt of SCHEMA_STATEMENTS) {
      await conn.query(stmt);
    }
    await ensureColumn(conn, 'refrigerators', 'upper_temperature', '`upper_temperature` DECIMAL(5,1) NOT NULL DEFAULT -20.0');
    await ensureColumn(conn, 'refrigerators', 'lower_temperature', '`lower_temperature` DECIMAL(5,1) NOT NULL DEFAULT 4.0');
    await ensureColumn(conn, 'refrigerators', 'fridge_type', "`fridge_type` ENUM('drawer','shelf') DEFAULT 'drawer' AFTER `lower_temperature`");
    await ensureColumn(conn, 'samples', 'uploader', '`uploader` VARCHAR(100) NULL AFTER `patient_id`');
    await ensureColumn(conn, 'sub_samples', 'uploader', '`uploader` VARCHAR(100) NULL AFTER `patient_id`');
    await ensureColumn(conn, 'samples', 'created_by', '`created_by` VARCHAR(50) NULL AFTER `uploader`');
    await ensureColumn(conn, 'sub_samples', 'created_by', '`created_by` VARCHAR(50) NULL AFTER `uploader`');
    await ensureColumn(conn, 'refrigerators', 'deleted_at', '`deleted_at` TIMESTAMP NULL AFTER `updated_at`');
    await ensureColumn(conn, 'refrigerators', 'deleted_by', '`deleted_by` VARCHAR(50) NULL AFTER `deleted_at`');
    await ensureColumn(conn, 'samples', 'deleted_at', '`deleted_at` TIMESTAMP NULL AFTER `updated_at`');
    await ensureColumn(conn, 'samples', 'deleted_by', '`deleted_by` VARCHAR(50) NULL AFTER `deleted_at`');
    await ensureColumn(conn, 'sub_samples', 'deleted_at', '`deleted_at` TIMESTAMP NULL AFTER `updated_at`');
    await ensureColumn(conn, 'sub_samples', 'deleted_by', '`deleted_by` VARCHAR(50) NULL AFTER `deleted_at`');
    await conn.query("ALTER TABLE upper_items MODIFY COLUMN item_type VARCHAR(100) NOT NULL DEFAULT '样本'");
    for (const name of ['试剂', '样本', '耗材', '临时物品']) {
      await conn.query('INSERT IGNORE INTO item_types (name) VALUES (?)', [name]);
    }
    console.log('Tables created.');

    const [rootRows] = await conn.query('SELECT username FROM users WHERE username = ?', ['root']);
    if (rootRows.length === 0) {
      await conn.query(
        'INSERT INTO users (id, username, password_hash, role) VALUES (UUID(), ?, ?, ?)',
        ['root', hashPassword('root123'), 'root'],
      );
      console.log('Root user inserted.');
    }

    // Insert required fridges if not exists.
    for (const fridge of [FRIDGE, SHELF_FRIDGE]) {
      const [existing] = await conn.query('SELECT id FROM refrigerators WHERE id = ?', [fridge.id]);
      if (existing.length === 0) {
        await conn.query(
          `INSERT INTO refrigerators (id, name, description, upper_rows, upper_cols, lower_rows, lower_cols, upper_temperature, lower_temperature, fridge_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fridge.id,
            fridge.name,
            fridge.description,
            fridge.upper_rows,
            fridge.upper_cols,
            fridge.lower_rows,
            fridge.lower_cols,
            fridge.upper_temperature,
            fridge.lower_temperature,
            fridge.fridge_type,
          ],
        );
        console.log(`${fridge.name} inserted.`);
      } else {
        await conn.query(
          `UPDATE refrigerators
           SET name = ?, description = ?, upper_rows = ?, upper_cols = ?, lower_rows = ?, lower_cols = ?,
               upper_temperature = ?, lower_temperature = ?, fridge_type = ?
           WHERE id = ?`,
          [
            fridge.name,
            fridge.description,
            fridge.upper_rows,
            fridge.upper_cols,
            fridge.lower_rows,
            fridge.lower_cols,
            fridge.upper_temperature,
            fridge.lower_temperature,
            fridge.fridge_type,
            fridge.id,
          ],
        );
        console.log(`${fridge.name} already exists; metadata updated.`);
      }
    }

    // Remove old demo samples created by previous seed versions.
    await conn.query(
      `DELETE sub_samples FROM sub_samples
       JOIN samples ON samples.id = sub_samples.sample_id
       WHERE samples.id IN ('S-001','S-002','S-003','S-004','S-005','S-006')`,
    );
    await conn.query(
      `DELETE FROM samples WHERE id IN ('S-001','S-002','S-003','S-004','S-005','S-006')`,
    );
    await conn.query(
      `DELETE FROM users WHERE username = 'testuser' OR username LIKE 'gridtest\\_%' OR username LIKE 'admintest\\_%'`,
    );
    console.log('Old demo samples and known test users removed.');

    // Insert samples (ignore duplicates)
    for (const s of SAMPLES) {
      await conn.query(
        `INSERT IGNORE INTO samples (id, refrigerator_id, name, type, status, temperature, collected_at, patient_id, uploader, tags, compartment, position, note, volume, grid_rows, grid_cols)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.refrigerator_id, s.name, s.type, s.status, s.temperature, s.collected_at, s.patient_id, s.uploader || '系统导入', s.tags, s.compartment, s.position, s.note || null, s.volume || null, s.grid_rows, s.grid_cols],
      );
    }
    console.log(`${SAMPLES.length} samples seeded.`);

    // Insert sub-samples (ignore duplicates)
    for (const ss of SUB_SAMPLES) {
      await conn.query(
        `INSERT IGNORE INTO sub_samples (id, sample_id, name, type, status, temperature, collected_at, patient_id, uploader, tags, position, note, volume)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ss.id, ss.sample_id, ss.name, ss.type, ss.status, ss.temperature, ss.collected_at, ss.patient_id, ss.uploader || '系统导入', ss.tags, ss.position, ss.note || null, ss.volume || null],
      );
    }
    console.log(`${SUB_SAMPLES.length} sub-samples seeded.`);
    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
