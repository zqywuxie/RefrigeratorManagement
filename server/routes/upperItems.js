import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireResourceOwner } from '../middleware/auth.js';

const router = Router();

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

export default router;
