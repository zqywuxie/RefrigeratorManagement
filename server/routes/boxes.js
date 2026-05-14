import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// PUT /api/boxes/:boxId
router.put('/:boxId', async (req, res) => {
  try {
    const { name, mode, gridRows, gridCols, sampleType, projectName, quantity, owner, tags, note } = req.body;
    await pool.query(
      `UPDATE boxes SET name=?, mode=?, grid_rows=?, grid_cols=?, sample_type=?, project_name=?, quantity=?, owner=?, tags=?, note=? WHERE id=?`,
      [name, mode, gridRows || null, gridCols || null, sampleType || null, projectName || null, quantity, owner || null, JSON.stringify(tags || []), note || null, req.params.boxId]
    );
    const [[box]] = await pool.query('SELECT * FROM boxes WHERE id = ?', [req.params.boxId]);
    res.json(box);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/boxes/:boxId (soft delete)
router.delete('/:boxId', async (req, res) => {
  try {
    await pool.query('UPDATE boxes SET deleted_at = NOW() WHERE id = ?', [req.params.boxId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/boxes/:boxId/cells
router.get('/:boxId/cells', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM box_cells WHERE box_id = ? ORDER BY position`,
      [req.params.boxId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/boxes/:boxId/cells
router.post('/:boxId/cells', async (req, res) => {
  try {
    const { id, position, barcode, sampleName, sampleStatus = 'normal', note } = req.body;
    const cellId = id || `cell-${Date.now()}`;
    await pool.query(
      `INSERT INTO box_cells (id, box_id, position, barcode, sample_name, sample_status, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cellId, req.params.boxId, position, barcode || null, sampleName || null, sampleStatus, note || null]
    );
    const [[cell]] = await pool.query('SELECT * FROM box_cells WHERE id = ?', [cellId]);
    res.status(201).json(cell);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cells/:cellId
router.put('/cells/:cellId', async (req, res) => {
  try {
    const { barcode, sampleName, sampleStatus, note } = req.body;
    await pool.query(
      `UPDATE box_cells SET barcode=?, sample_name=?, sample_status=?, note=? WHERE id=?`,
      [barcode || null, sampleName || null, sampleStatus, note || null, req.params.cellId]
    );
    const [[cell]] = await pool.query('SELECT * FROM box_cells WHERE id = ?', [req.params.cellId]);
    res.json(cell);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cells/:cellId
router.delete('/cells/:cellId', async (req, res) => {
  try {
    await pool.query('DELETE FROM box_cells WHERE id = ?', [req.params.cellId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
