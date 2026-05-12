import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';
import pool from './db.js';
import { hashPassword } from './authUtils.js';

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
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    FOREIGN KEY (refrigerator_id) REFERENCES refrigerators(id) ON DELETE CASCADE,
    INDEX idx_fridge (refrigerator_id),
    INDEX idx_fridge_comp_pos (refrigerator_id, compartment, position)
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
    FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
    INDEX idx_sample (sample_id)
  ) ENGINE=InnoDB`,
];

const FRIDGE_ID = 'fridge-default-001';

const FRIDGE = {
  id: FRIDGE_ID,
  name: '主冰箱',
  description: '默认生物样本存储冰箱',
  upper_rows: 2,
  upper_cols: 3,
  lower_rows: 2,
  lower_cols: 2,
  upper_temperature: -20,
  lower_temperature: 4,
};

const SAMPLES = [
  {
    id: 'S-001', refrigerator_id: FRIDGE_ID, name: '全血样本容器 001', type: '全血',
    status: 'normal', temperature: -20, collected_at: '2026-04-15', patient_id: 'P-2024-001',
    tags: JSON.stringify(['紧急', 'A型']), compartment: 'upper', position: 0,
    volume: '5ml', note: '手术前采集，状态良好', grid_rows: 2, grid_cols: 2,
  },
  {
    id: 'S-002', refrigerator_id: FRIDGE_ID, name: '血清样本容器 002', type: '血清',
    status: 'warning', temperature: -18, collected_at: '2026-04-20', patient_id: 'P-2024-015',
    tags: JSON.stringify(['常规']), compartment: 'upper', position: 1,
    volume: '3ml', note: '温度偏高，需持续关注', grid_rows: 2, grid_cols: 2,
  },
  {
    id: 'S-003', refrigerator_id: FRIDGE_ID, name: 'DNA样本容器 003', type: 'DNA',
    status: 'critical', temperature: -15, collected_at: '2026-04-22', patient_id: 'P-2024-032',
    tags: JSON.stringify(['基因检测', '紧急']), compartment: 'upper', position: 3,
    volume: '2ml', note: '温度严重偏高！需立即处理', grid_rows: 2, grid_cols: 2,
  },
  {
    id: 'S-004', refrigerator_id: FRIDGE_ID, name: '尿液样本容器 004', type: '尿液',
    status: 'used', temperature: 4, collected_at: '2026-04-18', patient_id: 'P-2024-008',
    tags: JSON.stringify(['常规检查']), compartment: 'lower', position: 0,
    volume: '10ml', note: '已完成常规检测', grid_rows: 2, grid_cols: 2,
  },
  {
    id: 'S-005', refrigerator_id: FRIDGE_ID, name: '血浆样本容器 005', type: '血浆',
    status: 'pending', temperature: 4, collected_at: '2026-05-01', patient_id: 'P-2024-088',
    tags: JSON.stringify(['待检测']), compartment: 'lower', position: 2,
    volume: '4ml', note: '等待科室处理指令', grid_rows: 2, grid_cols: 2,
  },
  {
    id: 'S-006', refrigerator_id: FRIDGE_ID, name: '组织样本容器 006', type: '组织',
    status: 'normal', temperature: -20, collected_at: '2026-05-03', patient_id: 'P-2024-099',
    tags: JSON.stringify(['活检', '肿瘤科']), compartment: 'upper', position: 4,
    volume: '0.5g', note: '活检组织，保存完好', grid_rows: 2, grid_cols: 2,
  },
];

const SUB_SAMPLES = [
  { id: 'SS-001', sample_id: 'S-001', name: '全血副样本 001-A', type: '全血', status: 'normal', temperature: -20, collected_at: '2026-04-15', patient_id: 'P-2024-001', tags: JSON.stringify(['原液']), position: 0, volume: '3ml' },
  { id: 'SS-002', sample_id: 'S-001', name: '全血副样本 001-B', type: '全血', status: 'warning', temperature: -18, collected_at: '2026-04-15', patient_id: 'P-2024-001', tags: JSON.stringify(['稀释']), position: 1, volume: '2ml', note: '轻微溶血' },
  { id: 'SS-003', sample_id: 'S-002', name: '血清副样本 002-A', type: '血清', status: 'normal', temperature: -20, collected_at: '2026-04-20', patient_id: 'P-2024-015', tags: JSON.stringify(['常规']), position: 0, volume: '1.5ml' },
  { id: 'SS-004', sample_id: 'S-003', name: 'DNA副样本 003-A', type: 'DNA', status: 'critical', temperature: -15, collected_at: '2026-04-22', patient_id: 'P-2024-032', tags: JSON.stringify(['基因检测']), position: 0, volume: '1ml', note: '温度异常' },
  { id: 'SS-005', sample_id: 'S-003', name: 'DNA副样本 003-B', type: 'DNA', status: 'warning', temperature: -17, collected_at: '2026-04-22', patient_id: 'P-2024-032', tags: JSON.stringify(['备份']), position: 1, volume: '1ml' },
  { id: 'SS-006', sample_id: 'S-004', name: '尿液副样本 004-A', type: '尿液', status: 'used', temperature: 4, collected_at: '2026-04-18', patient_id: 'P-2024-008', tags: JSON.stringify(['已检测']), position: 0, volume: '5ml' },
  { id: 'SS-007', sample_id: 'S-006', name: '组织副样本 006-A', type: '组织', status: 'normal', temperature: -20, collected_at: '2026-05-03', patient_id: 'P-2024-099', tags: JSON.stringify(['切片A']), position: 0, volume: '0.2g' },
  { id: 'SS-008', sample_id: 'S-006', name: '组织副样本 006-B', type: '组织', status: 'normal', temperature: -20, collected_at: '2026-05-03', patient_id: 'P-2024-099', tags: JSON.stringify(['切片B']), position: 1, volume: '0.3g' },
];

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
    await ensureColumn(conn, 'samples', 'uploader', '`uploader` VARCHAR(100) NULL AFTER `patient_id`');
    await ensureColumn(conn, 'sub_samples', 'uploader', '`uploader` VARCHAR(100) NULL AFTER `patient_id`');
    await ensureColumn(conn, 'samples', 'created_by', '`created_by` VARCHAR(50) NULL AFTER `uploader`');
    await ensureColumn(conn, 'sub_samples', 'created_by', '`created_by` VARCHAR(50) NULL AFTER `uploader`');
    console.log('Tables created.');

    const [rootRows] = await conn.query('SELECT username FROM users WHERE username = ?', ['root']);
    if (rootRows.length === 0) {
      await conn.query(
        'INSERT INTO users (id, username, password_hash, role) VALUES (UUID(), ?, ?, ?)',
        ['root', hashPassword('root123'), 'root'],
      );
      console.log('Root user inserted.');
    }

    // Insert default fridge if not exists
    const [existing] = await conn.query('SELECT id FROM refrigerators WHERE id = ?', [FRIDGE_ID]);
    if (existing.length === 0) {
      await conn.query(
        `INSERT INTO refrigerators (id, name, description, upper_rows, upper_cols, lower_rows, lower_cols, upper_temperature, lower_temperature)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          FRIDGE.id,
          FRIDGE.name,
          FRIDGE.description,
          FRIDGE.upper_rows,
          FRIDGE.upper_cols,
          FRIDGE.lower_rows,
          FRIDGE.lower_cols,
          FRIDGE.upper_temperature,
          FRIDGE.lower_temperature,
        ],
      );
      console.log('Default refrigerator inserted.');
    } else {
      console.log('Default refrigerator already exists.');
    }

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
