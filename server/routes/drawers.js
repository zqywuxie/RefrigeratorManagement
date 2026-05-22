import { Router } from 'express';
import pool from '../db.js';

const router = Router();

async function normalizeDrawerBoxes(drawerId) {
  const [[drawer]] = await pool.query('SELECT id, max_boxes FROM drawers WHERE id = ?', [drawerId]);
  if (!drawer) return null;

  const [boxRows] = await pool.query(
    'SELECT id, position FROM boxes WHERE drawer_id = ? AND deleted_at IS NULL ORDER BY created_at ASC, id ASC',
    [drawerId],
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
    }

    const assignedPosition = Number(box.position);
    usedPositions.add(assignedPosition);
    nextPosition = Math.max(nextPosition, assignedPosition + 1);
  }

  const currentMaxBoxes = Number(drawer.max_boxes || 0);
  const baselinePositions = currentMaxBoxes === 10 || currentMaxBoxes < 5 ? 5 : currentMaxBoxes;
  const visiblePositions = Math.max(5, nextPosition, baselinePositions);
  if (currentMaxBoxes !== visiblePositions) {
    await pool.query('UPDATE drawers SET max_boxes = ? WHERE id = ?', [visiblePositions, drawerId]);
    drawer.max_boxes = visiblePositions;
  }

  return drawer;
}

router.get('/:fridgeId/drawers', async (req, res) => {
  try {
    const [drawerIds] = await pool.query(
      `SELECT d.id FROM drawers d JOIN refrigerators r ON r.id = d.refrigerator_id WHERE d.refrigerator_id = ? AND r.deleted_at IS NULL`,
      [req.params.fridgeId]
    );
    for (const drawer of drawerIds) {
      await normalizeDrawerBoxes(drawer.id);
    }
    const [rows] = await pool.query(
      `SELECT d.*, COUNT(b.id) as box_count
       FROM drawers d
       JOIN refrigerators r ON r.id = d.refrigerator_id AND r.deleted_at IS NULL
       LEFT JOIN boxes b ON b.drawer_id = d.id AND b.deleted_at IS NULL
       WHERE d.refrigerator_id = ?
         AND d.deleted_at IS NULL
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
    await normalizeDrawerBoxes(req.params.drawerId);
    const [rows] = await pool.query(
      `SELECT * FROM boxes WHERE drawer_id = ? AND deleted_at IS NULL ORDER BY position IS NULL, position ASC, created_at ASC`,
      [req.params.drawerId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function updateDrawerCapacity(req, res) {
  try {
    const { maxBoxes, max_boxes } = req.body;
    const nextMaxBoxes = Number(maxBoxes ?? max_boxes);
    if (!Number.isInteger(nextMaxBoxes) || nextMaxBoxes < 1) {
      return res.status(400).json({ error: 'max_boxes must be a positive integer' });
    }
    const [[used]] = await pool.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS minimum
       FROM boxes
       WHERE drawer_id = ? AND deleted_at IS NULL AND position IS NOT NULL`,
      [req.params.drawerId],
    );
    if (nextMaxBoxes < Number(used.minimum || 0)) {
      return res.status(409).json({ error: 'max_boxes cannot hide existing boxes' });
    }
    await pool.query('UPDATE drawers SET max_boxes = ? WHERE id = ?', [nextMaxBoxes, req.params.drawerId]);
    const [[drawer]] = await pool.query('SELECT * FROM drawers WHERE id = ?', [req.params.drawerId]);
    if (!drawer) return res.status(404).json({ error: 'Drawer not found' });
    res.json(drawer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.patch('/:drawerId', updateDrawerCapacity);
router.put('/:drawerId', updateDrawerCapacity);

router.post('/:drawerId/boxes', async (req, res) => {
  try {
    const {
      id,
      name,
      mode = 'simple',
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
      rootAdmin,
      root_admin,
      createdBy,
      created_by,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const finalPosition = Number(position);
    if (!Number.isInteger(finalPosition) || finalPosition < 0) {
      return res.status(400).json({ error: 'position is required' });
    }
    const [[drawer]] = await pool.query('SELECT max_boxes FROM drawers WHERE id = ?', [req.params.drawerId]);
    if (!drawer) return res.status(404).json({ error: 'Drawer not found' });
    if (finalPosition >= Number(drawer.max_boxes || 0)) {
      return res.status(409).json({ error: 'position is outside drawer capacity' });
    }
    const [[occupying]] = await pool.query(
      'SELECT id FROM boxes WHERE drawer_id = ? AND position = ? AND deleted_at IS NULL LIMIT 1',
      [req.params.drawerId, finalPosition],
    );
    if (occupying) return res.status(409).json({ error: 'position is already occupied' });
    const boxId = id || `box-${Date.now()}`;
    const finalGridRows = gridRows ?? grid_rows ?? null;
    const finalGridCols = gridCols ?? grid_cols ?? null;
    const finalSampleType = sampleType ?? sample_type ?? null;
    const finalProjectName = projectName ?? project_name ?? null;
    const finalDataPath = dataPath ?? data_path ?? null;
    const finalRootAdmin = rootAdmin ?? root_admin ?? null;
    const finalCreatedBy = createdBy ?? created_by ?? null;
    await pool.query(
      `INSERT INTO boxes (id, drawer_id, name, mode, grid_rows, grid_cols, position, sample_type, project_name, quantity, owner, tags, note, data_path, root_admin, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        boxId,
        req.params.drawerId,
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
        finalRootAdmin,
        finalCreatedBy,
      ]
    );
    const [[box]] = await pool.query('SELECT * FROM boxes WHERE id = ?', [boxId]);
    res.status(201).json(box);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
