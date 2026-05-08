import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM refrigerators ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM refrigerators WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Refrigerator not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, upperRows = 2, upperCols = 3, lowerRows = 2, lowerCols = 2 } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO refrigerators (id, name, description, upper_rows, upper_cols, lower_rows, lower_cols)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description || null, upperRows, upperCols, lowerRows, lowerCols],
    );
    const [[row]] = await pool.query('SELECT * FROM refrigerators WHERE id = ?', [id]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await pool.query('SELECT * FROM refrigerators WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Refrigerator not found' });

    const { name, description, upperRows, upperCols, lowerRows, lowerCols } = req.body;
    const newUpperRows = upperRows ?? existing.upper_rows;
    const newUpperCols = upperCols ?? existing.upper_cols;
    const newLowerRows = lowerRows ?? existing.lower_rows;
    const newLowerCols = lowerCols ?? existing.lower_cols;

    // Validate: no samples at positions >= new capacity
    const upperCap = newUpperRows * newUpperCols;
    const lowerCap = newLowerRows * newLowerCols;
    const [[{ cnt: upperOverflow }]] = await pool.query(
      'SELECT COUNT(*) as cnt FROM samples WHERE refrigerator_id = ? AND compartment = ? AND position >= ?',
      [id, 'upper', upperCap],
    );
    const [[{ cnt: lowerOverflow }]] = await pool.query(
      'SELECT COUNT(*) as cnt FROM samples WHERE refrigerator_id = ? AND compartment = ? AND position >= ?',
      [id, 'lower', lowerCap],
    );
    if (upperOverflow > 0 || lowerOverflow > 0) {
      return res.status(409).json({ error: '无法缩小网格：部分样本位置超出新网格范围' });
    }

    await pool.query(
      `UPDATE refrigerators SET name = ?, description = ?, upper_rows = ?, upper_cols = ?, lower_rows = ?, lower_cols = ?
       WHERE id = ?`,
      [name ?? existing.name, description ?? existing.description, newUpperRows, newUpperCols, newLowerRows, newLowerCols, id],
    );
    const [[row]] = await pool.query('SELECT * FROM refrigerators WHERE id = ?', [id]);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [[existing]] = await pool.query('SELECT * FROM refrigerators WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Refrigerator not found' });
    await pool.query('DELETE FROM refrigerators WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
