import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { authenticate, requireRoot } from '../middleware/auth.js';

const router = Router();

const DRAWER_LAYOUTS = [
  { layer: 1, rows: 2, cols: 3 },
  { layer: 2, rows: 5, cols: 3 },
];
const LAYER1_LABELS = [['A1','A2','A3'], ['B1','B2','B3']];
const LAYER2_LABELS = [
  ['C1','C2','C3'], ['D1','D2','D3'], ['E1','E2','E3'], ['F1','F2','F3'], ['G1','G2','G3']
];

async function createDrawersForFridge(conn, fridgeId) {
  for (const layout of DRAWER_LAYOUTS) {
    const labels = layout.layer === 1 ? LAYER1_LABELS : LAYER2_LABELS;
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const id = `drawer-${fridgeId}-L${layout.layer}-R${r}C${c}`;
        await conn.query(
          `INSERT INTO drawers (id, refrigerator_id, layer, row_pos, col_pos, label)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, fridgeId, layout.layer, r, c, labels[r][c]]
        );
      }
    }
  }
}

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM refrigerators WHERE deleted_at IS NULL ORDER BY created_at ASC',
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM refrigerators WHERE id = ? AND deleted_at IS NULL',
      [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Refrigerator not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, requireRoot, async (req, res) => {
  try {
    const {
      name,
      description,
      upperRows = 2,
      upperCols = 3,
      lowerRows = 2,
      lowerCols = 2,
      upperTemperature = -20,
      lowerTemperature = 4,
      fridgeType = 'drawer',
    } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO refrigerators (id, name, description, upper_rows, upper_cols, lower_rows, lower_cols, upper_temperature, lower_temperature, fridge_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description || null, upperRows, upperCols, lowerRows, lowerCols, upperTemperature, lowerTemperature, fridgeType],
    );
    if (fridgeType === 'drawer') {
      await createDrawersForFridge(pool, id);
    }
    const [[row]] = await pool.query('SELECT * FROM refrigerators WHERE id = ?', [id]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, requireRoot, async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await pool.query(
      'SELECT * FROM refrigerators WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    if (!existing) return res.status(404).json({ error: 'Refrigerator not found' });

    const { name, description, upperRows, upperCols, lowerRows, lowerCols, upperTemperature, lowerTemperature } = req.body;
    const newUpperRows = upperRows ?? existing.upper_rows;
    const newUpperCols = upperCols ?? existing.upper_cols;
    const newLowerRows = lowerRows ?? existing.lower_rows;
    const newLowerCols = lowerCols ?? existing.lower_cols;
    const newUpperTemperature = upperTemperature ?? existing.upper_temperature ?? -20;
    const newLowerTemperature = lowerTemperature ?? existing.lower_temperature ?? 4;

    // Validate: no samples at positions >= new capacity
    const upperCap = newUpperRows * newUpperCols;
    const lowerCap = newLowerRows * newLowerCols;
    const [[{ cnt: upperOverflow }]] = await pool.query(
      'SELECT COUNT(*) as cnt FROM samples WHERE refrigerator_id = ? AND deleted_at IS NULL AND compartment = ? AND position >= ?',
      [id, 'upper', upperCap],
    );
    const [[{ cnt: lowerOverflow }]] = await pool.query(
      'SELECT COUNT(*) as cnt FROM samples WHERE refrigerator_id = ? AND deleted_at IS NULL AND compartment = ? AND position >= ?',
      [id, 'lower', lowerCap],
    );
    if (upperOverflow > 0 || lowerOverflow > 0) {
      return res.status(409).json({ error: '无法缩小网格：部分样本位置超出新网格范围' });
    }

    await pool.query(
      `UPDATE refrigerators SET name = ?, description = ?, upper_rows = ?, upper_cols = ?, lower_rows = ?, lower_cols = ?, upper_temperature = ?, lower_temperature = ?
       WHERE id = ?`,
      [
        name ?? existing.name,
        description ?? existing.description,
        newUpperRows,
        newUpperCols,
        newLowerRows,
        newLowerCols,
        newUpperTemperature,
        newLowerTemperature,
        id,
      ],
    );
    const [[row]] = await pool.query('SELECT * FROM refrigerators WHERE id = ?', [id]);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, requireRoot, async (req, res) => {
  try {
    const [[existing]] = await pool.query(
      'SELECT * FROM refrigerators WHERE id = ? AND deleted_at IS NULL',
      [req.params.id],
    );
    if (!existing) return res.status(404).json({ error: 'Refrigerator not found' });
    await pool.query(
      'UPDATE refrigerators SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ?',
      [req.user.username, req.params.id],
    );
    await pool.query(
      'UPDATE samples SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE refrigerator_id = ? AND deleted_at IS NULL',
      [req.user.username, req.params.id],
    );
    await pool.query(
      `UPDATE sub_samples
       JOIN samples ON samples.id = sub_samples.sample_id
       SET sub_samples.deleted_at = CURRENT_TIMESTAMP, sub_samples.deleted_by = ?
       WHERE samples.refrigerator_id = ? AND sub_samples.deleted_at IS NULL`,
      [req.user.username, req.params.id],
    );
    await pool.query(
      'UPDATE upper_items SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE refrigerator_id = ? AND deleted_at IS NULL',
      [req.user.username, req.params.id],
    );
    await pool.query(
      `UPDATE boxes SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
       WHERE drawer_id IN (SELECT id FROM drawers WHERE refrigerator_id = ?) AND deleted_at IS NULL`,
      [req.user.username, req.params.id],
    );
    await pool.query(
      'UPDATE drawers SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE refrigerator_id = ? AND deleted_at IS NULL',
      [req.user.username, req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
