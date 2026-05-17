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
  upper_temperature: -20,
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
    await ensureColumn(conn, 'refrigerators', 'deleted_at', '`deleted_at` TIMESTAMP NULL AFTER `updated_at`');
    await ensureColumn(conn, 'refrigerators', 'deleted_by', '`deleted_by` VARCHAR(50) NULL AFTER `deleted_at`');
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

    await conn.query(
      `DELETE FROM users WHERE username = 'testuser' OR username LIKE 'gridtest\\_%' OR username LIKE 'admintest\\_%'`,
    );
    console.log('Known test users removed.');
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
