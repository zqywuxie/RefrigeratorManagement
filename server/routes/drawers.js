import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/:fridgeId/drawers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, COUNT(b.id) as box_count
       FROM drawers d
       LEFT JOIN boxes b ON b.drawer_id = d.id AND b.deleted_at IS NULL
       WHERE d.refrigerator_id = ?
       GROUP BY d.id
       ORDER BY d.layer, d.row_pos, d.col_pos`,
      [req.params.fridgeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:drawerId/boxes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM boxes WHERE drawer_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [req.params.drawerId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:drawerId/boxes', async (req, res) => {
  try {
    const { id, name, mode = 'simple', gridRows, gridCols, sampleType, projectName, quantity = 0, owner, tags, note } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const boxId = id || `box-${Date.now()}`;
    await pool.query(
      `INSERT INTO boxes (id, drawer_id, name, mode, grid_rows, grid_cols, sample_type, project_name, quantity, owner, tags, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [boxId, req.params.drawerId, name, mode, gridRows || null, gridCols || null, sampleType || null, projectName || null, quantity, owner || null, JSON.stringify(tags || []), note || null]
    );
    const [[box]] = await pool.query('SELECT * FROM boxes WHERE id = ?', [boxId]);
    res.status(201).json(box);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
