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
  await ensureColumn('refrigerators', 'upper_temperature', '`upper_temperature` DECIMAL(5,1) NOT NULL DEFAULT -80.0');
  await ensureColumn('refrigerators', 'lower_temperature', '`lower_temperature` DECIMAL(5,1) NOT NULL DEFAULT -80.0');
  // Update existing fridges to -80°C
  await pool.query("UPDATE refrigerators SET upper_temperature = -80 WHERE upper_temperature IS NULL OR upper_temperature > 0");
  await pool.query("UPDATE refrigerators SET lower_temperature = -80 WHERE lower_temperature IS NULL OR lower_temperature > 0");
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
    CREATE TABLE IF NOT EXISTS item_types (
      name VARCHAR(100) PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sample_types (
      name VARCHAR(100) PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  for (const name of ['试剂', '样本', '耗材', '临时物品']) {
    await pool.query('INSERT IGNORE INTO item_types (name) VALUES (?)', [name]);
  }

  for (const name of ['血清', '血浆', '尿液', 'DNA', '组织', '全血']) {
    await pool.query('INSERT IGNORE INTO sample_types (name) VALUES (?)', [name]);
  }

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
  try {
    await pool.query("ALTER TABLE upper_items MODIFY COLUMN item_type VARCHAR(100) NOT NULL DEFAULT '样本'");
  } catch (err) {
    console.warn('Skip upper_items.item_type migration:', err.message);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS drawers (
      id VARCHAR(36) PRIMARY KEY,
      refrigerator_id VARCHAR(36) NOT NULL,
      layer INT NOT NULL,
      row_pos INT NOT NULL,
      col_pos INT NOT NULL,
      label VARCHAR(50),
      max_boxes INT DEFAULT 5,
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
      position INT DEFAULT NULL,
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
  await ensureColumn('boxes', 'position', '`position` INT NULL AFTER `grid_cols`');
  await ensureIndex('boxes', 'idx_boxes_drawer_position', '`drawer_id`, `deleted_at`, `position`');
  try {
    await pool.query('ALTER TABLE drawers ALTER COLUMN max_boxes SET DEFAULT 5');
  } catch (err) {
    console.warn('Skip max_boxes default update:', err.message);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS box_cells (
      id VARCHAR(36) PRIMARY KEY,
      box_id VARCHAR(36) NOT NULL,
      position INT NOT NULL,
      barcode VARCHAR(100),
      sample_name VARCHAR(200),
      sample_volume VARCHAR(50),
      sample_status ENUM('normal','warning','critical','used','pending') DEFAULT 'normal',
      note TEXT,
      FOREIGN KEY (box_id) REFERENCES boxes(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_box_position (box_id, position)
    ) ENGINE=InnoDB
  `);
  await ensureColumn('box_cells', 'sample_volume', '`sample_volume` VARCHAR(50) NULL AFTER `sample_name`');

  // ── Sample Records & Tubes (grouped sample system) ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sample_records (
      id VARCHAR(36) PRIMARY KEY,
      patient_name VARCHAR(200) NOT NULL,
      sample_code VARCHAR(200) NOT NULL,
      source VARCHAR(200),
      sample_type VARCHAR(100),
      collection_stage VARCHAR(100),
      collected_at DATETIME,
      tags JSON,
      note TEXT,
      group_color VARCHAR(20),
      uploader VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      deleted_by VARCHAR(50)
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tubes (
      id VARCHAR(36) PRIMARY KEY,
      sample_id VARCHAR(36) NOT NULL,
      tube_label VARCHAR(50),
      box_id VARCHAR(36) NOT NULL,
      position INT NOT NULL,
      barcode VARCHAR(100),
      volume VARCHAR(50),
      status ENUM('normal','warning','critical','used','pending') DEFAULT 'normal',
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (sample_id) REFERENCES sample_records(id) ON DELETE CASCADE,
      FOREIGN KEY (box_id) REFERENCES boxes(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_box_position (box_id, position)
    ) ENGINE=InnoDB
  `);

  await ensureColumn('boxes', 'data_path', '`data_path` TEXT NULL AFTER `note`');
  await ensureColumn('upper_items', 'box_mode', "`box_mode` ENUM('simple','precise') DEFAULT 'simple' AFTER `item_type`");
  await ensureColumn('upper_items', 'grid_rows', '`grid_rows` INT NULL AFTER `box_mode`');
  await ensureColumn('upper_items', 'grid_cols', '`grid_cols` INT NULL AFTER `grid_rows`');
  // Allow boxes without drawer (for upper item boxes)
  try {
    await pool.query("ALTER TABLE boxes MODIFY COLUMN drawer_id VARCHAR(36) NULL");
  } catch (err) {
    console.warn('Skip boxes.drawer_id nullable migration:', err.message);
  }
  // Auto-create boxes for upper items with box_mode='precise'
  try {
    const [items] = await pool.query(
      "SELECT id, refrigerator_id, name, grid_rows, grid_cols, item_type FROM upper_items WHERE box_mode = 'precise' AND deleted_at IS NULL"
    );
    for (const item of items) {
      const [[existing]] = await pool.query('SELECT id FROM boxes WHERE id = ?', [item.id]);
      if (!existing) {
        await pool.query(
          `INSERT INTO boxes (id, drawer_id, name, mode, grid_rows, grid_cols, sample_type, quantity)
           VALUES (?, NULL, ?, 'precise', ?, ?, ?, 0)`,
          [item.id, item.name, item.grid_rows, item.grid_cols, item.item_type]
        );
      }
    }
  } catch (err) {
    console.warn('Skip upper items to boxes migration:', err.message);
  }

  // Migrate existing box_cells → sample_records + tubes
  const [cellRows] = await pool.query(
    "SELECT * FROM box_cells WHERE NOT EXISTS (SELECT 1 FROM tubes WHERE tubes.box_id = box_cells.box_id AND tubes.position = box_cells.position)"
  );
  if (cellRows.length > 0) {
    const GROUP_COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#14b8a6','#e11d48','#6366f1'];
    let colorIdx = 0;
    for (const cell of cellRows) {
      const sampleId = `sr-${cell.box_id}-${cell.position}`;
      const tubeId = `tube-${cell.box_id}-${cell.position}`;
      const color = GROUP_COLORS[colorIdx % GROUP_COLORS.length];
      colorIdx++;
      await pool.query(
        `INSERT IGNORE INTO sample_records (id, patient_name, sample_code, sample_type, note, group_color, uploader)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sampleId, cell.sample_name || '未知', cell.barcode || sampleId, null, cell.note, color, null]
      );
      await pool.query(
        `INSERT IGNORE INTO tubes (id, sample_id, tube_label, box_id, position, barcode, volume, status, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tubeId, sampleId, 'Tube1', cell.box_id, cell.position, cell.barcode, cell.sample_volume, cell.sample_status, cell.note]
      );
    }
  }

  // Backfill existing fridges to 'drawer' type if not set
  await pool.query(
    "UPDATE refrigerators SET fridge_type = 'drawer' WHERE fridge_type IS NULL"
  );

  // Auto-generate drawers for existing drawer-type fridges that have none
  const [fridgeRows] = await pool.query(
    "SELECT id FROM refrigerators WHERE fridge_type = 'drawer' AND deleted_at IS NULL"
  );
  for (const fridge of fridgeRows) {
    const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM drawers WHERE refrigerator_id = ?', [fridge.id]);
    if (existing[0].cnt === 0) {
      const LAYOUTS = [
        { layer: 1, rows: 2, cols: 3, labels: [['A1','A2','A3'], ['B1','B2','B3']] },
        { layer: 2, rows: 5, cols: 3, labels: [['C1','C2','C3'], ['D1','D2','D3'], ['E1','E2','E3'], ['F1','F2','F3'], ['G1','G2','G3']] },
      ];
      for (const layout of LAYOUTS) {
        for (let r = 0; r < layout.rows; r++) {
          for (let c = 0; c < layout.cols; c++) {
            const id = `drawer-${fridge.id}-L${layout.layer}-R${r}C${c}`;
            await pool.query(
              `INSERT IGNORE INTO drawers (id, refrigerator_id, layer, row_pos, col_pos, label)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [id, fridge.id, layout.layer, r, c, layout.labels[r][c]]
            );
          }
        }
      }
    }
  }

  // Backfill existing boxes into visible internal positions and keep each drawer at
  // least five positions without hiding already-created boxes.
  const [drawerRows] = await pool.query('SELECT id, max_boxes FROM drawers');
  for (const drawer of drawerRows) {
    const [boxRows] = await pool.query(
      'SELECT id, position FROM boxes WHERE drawer_id = ? AND deleted_at IS NULL ORDER BY created_at ASC, id ASC',
      [drawer.id],
    );
    let nextPosition = 0;
    const usedPositions = new Set();
    for (const box of boxRows) {
      const currentPosition = Number(box.position);
      const needsPosition =
        box.position == null ||
        !Number.isInteger(currentPosition) ||
        currentPosition < 0 ||
        usedPositions.has(currentPosition);
      if (needsPosition) {
        while (usedPositions.has(nextPosition)) nextPosition++;
        await pool.query('UPDATE boxes SET position = ? WHERE id = ?', [nextPosition, box.id]);
        box.position = nextPosition;
      } else {
        usedPositions.add(currentPosition);
      }
      usedPositions.add(Number(box.position));
      nextPosition = Math.max(nextPosition, Number(box.position) + 1);
    }
    const currentMaxBoxes = Number(drawer.max_boxes || 0);
    const baselinePositions = currentMaxBoxes === 10 || currentMaxBoxes < 5 ? 5 : currentMaxBoxes;
    const visiblePositions = Math.max(5, nextPosition, baselinePositions);
    if (currentMaxBoxes !== visiblePositions) {
      await pool.query('UPDATE drawers SET max_boxes = ? WHERE id = ?', [visiblePositions, drawer.id]);
    }
  }

  const [[root]] = await pool.query('SELECT username FROM users WHERE username = ?', ['root']);
  if (!root) {
    await pool.query(
      'INSERT INTO users (id, username, password_hash, role) VALUES (UUID(), ?, ?, ?)',
      ['root', hashPassword('root123'), 'root'],
    );
  }
}
