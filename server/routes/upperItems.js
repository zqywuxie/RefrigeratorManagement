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

// ── Multer disk storage for upper item images ──
const uploadDir = path.join(__dirname, '..', 'uploads', 'upper-item-images');
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
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  },
});

router.get('/:fridgeId/upper-items', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM upper_items WHERE refrigerator_id = ? AND deleted_at IS NULL ORDER BY \`row_number\`, sort_order`,
      [req.params.fridgeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:fridgeId/upper-items', async (req, res) => {
  try {
    const {
      id,
      rowNumber,
      row_number,
      name,
      itemType,
      item_type,
      quantity = 1,
      owner,
      tags,
      note,
      imageUrl,
      image_url,
      qrCode,
      qr_code,
      sortOrder,
      sort_order,
      boxMode,
      box_mode,
      gridRows,
      grid_rows,
      gridCols,
      grid_cols,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const itemId = id || `ui-${Date.now()}`;
    const finalRowNumber = rowNumber ?? row_number ?? 1;
    const finalItemType = itemType ?? item_type ?? '样本';
    const finalImageUrl = imageUrl ?? image_url ?? null;
    const finalQrCode = qrCode ?? qr_code ?? null;
    const finalSortOrder = sortOrder ?? sort_order ?? 0;
    const finalBoxMode = boxMode ?? box_mode ?? 'simple';
    const finalGridRows = gridRows ?? grid_rows ?? null;
    const finalGridCols = gridCols ?? grid_cols ?? null;
    await pool.query('INSERT IGNORE INTO item_types (name) VALUES (?)', [finalItemType]);
    await pool.query(
      `INSERT INTO upper_items (id, refrigerator_id, \`row_number\`, name, item_type, box_mode, grid_rows, grid_cols, quantity, owner, tags, note, image_url, qr_code, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        req.params.fridgeId,
        finalRowNumber,
        name,
        finalItemType,
        finalBoxMode,
        finalGridRows,
        finalGridCols,
        quantity,
        owner || null,
        JSON.stringify(tags || []),
        note || null,
        finalImageUrl,
        finalQrCode,
        finalSortOrder,
      ]
    );
    const [[item]] = await pool.query('SELECT * FROM upper_items WHERE id = ?', [itemId]);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:itemId', async (req, res) => {
  try {
    const {
      name,
      itemType,
      item_type,
      rowNumber,
      row_number,
      quantity,
      owner,
      tags,
      note,
      imageUrl,
      image_url,
      qrCode,
      qr_code,
      sortOrder,
      sort_order,
      boxMode,
      box_mode,
      gridRows,
      grid_rows,
      gridCols,
      grid_cols,
    } = req.body;
    const finalRowNumber = rowNumber ?? row_number;
    const finalItemType = itemType ?? item_type;
    const finalImageUrl = imageUrl ?? image_url ?? null;
    const finalQrCode = qrCode ?? qr_code ?? null;
    const finalSortOrder = sortOrder ?? sort_order ?? 0;
    const finalBoxMode = boxMode ?? box_mode;
    const finalGridRows = gridRows ?? grid_rows;
    const finalGridCols = gridCols ?? grid_cols;
    if (finalItemType) {
      await pool.query('INSERT IGNORE INTO item_types (name) VALUES (?)', [finalItemType]);
    }
    await pool.query(
      `UPDATE upper_items SET name=?, item_type=?, box_mode=COALESCE(?, box_mode), grid_rows=COALESCE(?, grid_rows), grid_cols=COALESCE(?, grid_cols), \`row_number\`=?, quantity=?, owner=?, tags=?, note=?, image_url=?, qr_code=?, sort_order=? WHERE id=? AND deleted_at IS NULL`,
      [
        name,
        finalItemType,
        finalBoxMode,
        finalGridRows,
        finalGridCols,
        finalRowNumber,
        quantity,
        owner || null,
        JSON.stringify(tags || []),
        note || null,
        finalImageUrl,
        finalQrCode,
        finalSortOrder,
        req.params.itemId,
      ]
    );
    const [[item]] = await pool.query('SELECT * FROM upper_items WHERE id = ?', [req.params.itemId]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:itemId', authenticate, requireResourceOwner('upper_items', 'itemId', 'owner'), async (req, res) => {
  try {
    await pool.query('UPDATE upper_items SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [req.user.username, req.params.itemId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Upper item image endpoints ──

// POST /api/upper-items/:itemId/images — upload an image
router.post('/:itemId/images', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const [[item]] = await pool.query('SELECT id FROM upper_items WHERE id = ? AND deleted_at IS NULL', [req.params.itemId]);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const imageId = randomUUID();
    const relativePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');

    await pool.query(
      `INSERT INTO upper_item_images (id, item_id, image_path, original_name, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [imageId, req.params.itemId, relativePath, req.file.originalname, req.file.mimetype, req.file.size]
    );

    const [[img]] = await pool.query('SELECT * FROM upper_item_images WHERE id = ?', [imageId]);
    res.status(201).json(img);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/upper-items/:itemId/images — list images for an item
router.get('/:itemId/images', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM upper_item_images WHERE item_id = ? ORDER BY created_at ASC',
      [req.params.itemId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/upper-items/images/:imageId — delete an image
router.delete('/images/:imageId', authenticate, async (req, res) => {
  try {
    const [[img]] = await pool.query('SELECT * FROM upper_item_images WHERE id = ?', [req.params.imageId]);
    if (!img) return res.status(404).json({ error: 'Image not found' });

    const filePath = path.join(__dirname, '..', img.image_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM upper_item_images WHERE id = ?', [req.params.imageId]);
    res.json({ ok: true });
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

export default router;
