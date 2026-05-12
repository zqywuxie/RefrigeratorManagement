import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { authenticate, requireRoot } from '../middleware/auth.js';

const router = Router();

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
    } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO refrigerators (id, name, description, upper_rows, upper_cols, lower_rows, lower_cols, upper_temperature, lower_temperature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description || null, upperRows, upperCols, lowerRows, lowerCols, upperTemperature, lowerTemperature],
    );
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
