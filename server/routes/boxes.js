import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireResourceOwner } from '../middleware/auth.js';

const router = Router();

// GET /api/boxes?fridge_id=X — list boxes for a fridge with drawer info
router.get('/', async (req, res) => {
  try {
    let query = `SELECT b.*, d.label as drawer_label, d.refrigerator_id as fridge_id
     FROM boxes b
     JOIN drawers d ON d.id = b.drawer_id
     WHERE b.deleted_at IS NULL`;
    const params = [];

    if (req.query.fridge_id) {
      query += ' AND d.refrigerator_id = ?';
      params.push(req.query.fridge_id);
    }

    query += ' ORDER BY d.layer, d.row_pos, d.col_pos, b.position';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/boxes — create box without drawer (for upper item boxes)
router.post('/', authenticate, async (req, res) => {
  try {
    const { id, name, mode = 'precise', gridRows, grid_rows, gridCols, grid_cols, sampleType, sample_type, owner } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
    const finalGridRows = gridRows ?? grid_rows ?? null;
    const finalGridCols = gridCols ?? grid_cols ?? null;
    await pool.query(
      `INSERT INTO boxes (id, drawer_id, name, mode, grid_rows, grid_cols, sample_type, quantity, owner)
       VALUES (?, NULL, ?, ?, ?, ?, ?, 0, ?)`,
      [id, name, mode, finalGridRows, finalGridCols, sampleType ?? sample_type ?? null, owner || null]
    );
    const [[box]] = await pool.query('SELECT * FROM boxes WHERE id = ?', [id]);
    res.status(201).json(box);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const [[box]] = await pool.query('SELECT * FROM boxes WHERE id = ?', [req.body.id]);
      return res.json(box);
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/boxes/:boxId
router.put('/:boxId', authenticate, requireResourceOwner('boxes', 'boxId', 'owner'), async (req, res) => {
  try {
    const {
      name,
      mode,
      gridRows,
      grid_rows,
      gridCols,
      grid_cols,
      position,
      sampleType,
      sample_type,
      projectName,
      project_name,
      quantity = 0,
      owner,
      tags,
      note,
      dataPath,
      data_path,
    } = req.body;
    const [[existing]] = await pool.query('SELECT * FROM boxes WHERE id = ? AND deleted_at IS NULL', [req.params.boxId]);
    if (!existing) return res.status(404).json({ error: 'Box not found' });

    const finalPosition = position == null ? existing.position : Number(position);
    if (finalPosition != null && (!Number.isInteger(finalPosition) || finalPosition < 0)) {
      return res.status(400).json({ error: 'position must be a non-negative integer' });
    }
    if (finalPosition != null) {
      const [[drawer]] = await pool.query('SELECT max_boxes FROM drawers WHERE id = ?', [existing.drawer_id]);
      if (drawer && finalPosition >= Number(drawer.max_boxes || 0)) {
        return res.status(409).json({ error: 'position is outside drawer capacity' });
      }
    }

    const finalGridRows = gridRows ?? grid_rows ?? null;
    const finalGridCols = gridCols ?? grid_cols ?? null;
    const finalSampleType = sampleType ?? sample_type ?? null;
    const finalProjectName = projectName ?? project_name ?? null;
    const finalDataPath = dataPath ?? data_path ?? null;
    await pool.query(
      `UPDATE boxes SET name=?, mode=?, grid_rows=?, grid_cols=?, position=?, sample_type=?, project_name=?, quantity=?, owner=?, tags=?, note=?, data_path=? WHERE id=?`,
      [
        name,
        mode,
        finalGridRows || null,
        finalGridCols || null,
        finalPosition,
        finalSampleType || null,
        finalProjectName || null,
        quantity,
        owner || null,
        JSON.stringify(tags || []),
        note || null,
        finalDataPath,
        req.params.boxId,
      ]
    );
    const [[box]] = await pool.query('SELECT * FROM boxes WHERE id = ?', [req.params.boxId]);
    res.json(box);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/boxes/:boxId (soft delete)
router.delete('/:boxId', authenticate, requireResourceOwner('boxes', 'boxId', 'owner'), async (req, res) => {
  try {
    await pool.query('UPDATE boxes SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [req.user.username, req.params.boxId]);
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
    const {
      id,
      position,
      barcode,
      sampleName,
      sample_name,
      sampleVolume,
      sample_volume,
      sampleStatus = 'normal',
      sample_status,
      note,
    } = req.body;
    const cellId = id || `cell-${Date.now()}`;
    await pool.query(
      `INSERT INTO box_cells (id, box_id, position, barcode, sample_name, sample_volume, sample_status, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cellId,
        req.params.boxId,
        position,
        barcode || null,
        sampleName ?? sample_name ?? null,
        sampleVolume ?? sample_volume ?? null,
        sampleStatus ?? sample_status,
        note || null,
      ]
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
    const { barcode, sampleName, sample_name, sampleVolume, sample_volume, sampleStatus, sample_status, note } = req.body;
    await pool.query(
      `UPDATE box_cells SET barcode=?, sample_name=?, sample_volume=?, sample_status=?, note=? WHERE id=?`,
      [
        barcode || null,
        sampleName ?? sample_name ?? null,
        sampleVolume ?? sample_volume ?? null,
        sampleStatus ?? sample_status,
        note || null,
        req.params.cellId,
      ]
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
