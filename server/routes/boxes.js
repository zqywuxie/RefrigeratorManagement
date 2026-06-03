import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import fs from 'fs';
import pool from '../db.js';
import { authenticate, requireResourceOwner } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ── Multer disk storage for box images ──
const uploadDir = path.join(__dirname, '..', 'uploads', 'box-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dateDir = path.join(uploadDir, new Date().toISOString().slice(0, 10));
    if (!fs.existsSync(dateDir)) fs.mkdirSync(dateDir, { recursive: true });
    cb(null, dateDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  },
});

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
      rootAdmin,
      root_admin,
      createdBy,
      created_by,
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
    const finalOwner = owner ?? existing.owner ?? null;
    const finalRootAdmin = rootAdmin ?? root_admin ?? existing.root_admin ?? null;
    const finalCreatedBy = createdBy ?? created_by ?? existing.created_by ?? finalOwner ?? null;
    await pool.query(
      `UPDATE boxes SET name=?, mode=?, grid_rows=?, grid_cols=?, position=?, sample_type=?, project_name=?, quantity=?, owner=?, tags=?, note=?, data_path=?, root_admin=?, created_by=? WHERE id=?`,
      [
        name,
        mode,
        finalGridRows || null,
        finalGridCols || null,
        finalPosition,
        finalSampleType || null,
        finalProjectName || null,
        quantity,
        finalOwner,
        JSON.stringify(tags || []),
        note || null,
        finalDataPath,
        finalRootAdmin,
        finalCreatedBy,
        req.params.boxId,
      ]
    );
    const [[box]] = await pool.query('SELECT * FROM boxes WHERE id = ?', [req.params.boxId]);
    res.json(box);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/boxes/:boxId/location — move a drawer box to an exact drawer position.
// If the target position is occupied, swap the two boxes.
router.patch('/:boxId/location', authenticate, requireResourceOwner('boxes', 'boxId', 'owner'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { targetDrawerId, target_drawer_id, targetPosition, target_position } = req.body;
    const finalDrawerId = targetDrawerId ?? target_drawer_id;
    const finalPosition = Number(targetPosition ?? target_position);

    if (!finalDrawerId) return res.status(400).json({ error: 'targetDrawerId is required' });
    if (!Number.isInteger(finalPosition) || finalPosition < 0) {
      return res.status(400).json({ error: 'targetPosition must be a non-negative integer' });
    }

    await conn.beginTransaction();

    const [[moving]] = await conn.query(
      `SELECT b.*, d.refrigerator_id AS fridge_id
       FROM boxes b
       LEFT JOIN drawers d ON d.id = b.drawer_id
       WHERE b.id = ? AND b.deleted_at IS NULL
       FOR UPDATE`,
      [req.params.boxId],
    );
    if (!moving) {
      await conn.rollback();
      return res.status(404).json({ error: 'Box not found' });
    }
    if (!moving.drawer_id) {
      await conn.rollback();
      return res.status(409).json({ error: 'upper item boxes cannot be moved to drawers' });
    }

    const [[targetDrawer]] = await conn.query(
      `SELECT id, refrigerator_id, max_boxes
       FROM drawers
       WHERE id = ? AND deleted_at IS NULL
       FOR UPDATE`,
      [finalDrawerId],
    );
    if (!targetDrawer) {
      await conn.rollback();
      return res.status(404).json({ error: 'Target drawer not found' });
    }
    if (targetDrawer.refrigerator_id !== moving.fridge_id) {
      await conn.rollback();
      return res.status(409).json({ error: 'boxes can only move within the same refrigerator' });
    }
    if (finalPosition >= Number(targetDrawer.max_boxes || 0)) {
      await conn.rollback();
      return res.status(409).json({ error: 'target position is outside drawer capacity' });
    }
    if (moving.drawer_id === finalDrawerId && Number(moving.position) === finalPosition) {
      await conn.commit();
      return res.json(moving);
    }

    const [[occupying]] = await conn.query(
      `SELECT *
       FROM boxes
       WHERE drawer_id = ? AND position = ? AND deleted_at IS NULL AND id <> ?
       FOR UPDATE`,
      [finalDrawerId, finalPosition, req.params.boxId],
    );

    if (occupying) {
      if (req.user?.role !== 'root' && occupying.owner && occupying.owner !== req.user?.username) {
        await conn.rollback();
        return res.status(403).json({ error: '只有目标盒子的创建者可以交换此位置' });
      }
      await conn.query(
        'UPDATE boxes SET drawer_id = ?, position = ? WHERE id = ?',
        [moving.drawer_id, moving.position, occupying.id],
      );
    }
    await conn.query(
      'UPDATE boxes SET drawer_id = ?, position = ? WHERE id = ?',
      [finalDrawerId, finalPosition, moving.id],
    );

    await conn.commit();
    const [[box]] = await pool.query('SELECT * FROM boxes WHERE id = ?', [moving.id]);
    res.json(box);
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
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

// ── Box image endpoints ──

// POST /api/boxes/:boxId/images — upload an image
router.post('/:boxId/images', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const [[box]] = await pool.query('SELECT id FROM boxes WHERE id = ? AND deleted_at IS NULL', [req.params.boxId]);
    if (!box) return res.status(404).json({ error: 'Box not found' });

    const imageId = randomUUID();
    const relativePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');

    await pool.query(
      `INSERT INTO box_images (id, box_id, image_path, original_name, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [imageId, req.params.boxId, relativePath, req.file.originalname, req.file.mimetype, req.file.size]
    );

    const [[img]] = await pool.query('SELECT * FROM box_images WHERE id = ?', [imageId]);
    res.status(201).json(img);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/boxes/:boxId/images — list images metadata (with full URLs)
router.get('/:boxId/images', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM box_images WHERE box_id = ? ORDER BY created_at ASC',
      [req.params.boxId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Multer error handling middleware ──
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message?.includes('图片') || err.message?.includes('image')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || '服务器错误' });
});

// DELETE /api/box-images/:imageId — delete an image
router.delete('/images/:imageId', authenticate, async (req, res) => {
  try {
    const [[img]] = await pool.query('SELECT * FROM box_images WHERE id = ?', [req.params.imageId]);
    if (!img) return res.status(404).json({ error: 'Image not found' });

    // Delete file from disk
    const filePath = path.join(__dirname, '..', img.image_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM box_images WHERE id = ?', [req.params.imageId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
