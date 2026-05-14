import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/:fridgeId/upper-items', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM upper_items WHERE refrigerator_id = ? AND deleted_at IS NULL ORDER BY row_number, sort_order`,
      [req.params.fridgeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:fridgeId/upper-items', async (req, res) => {
  try {
    const { id, rowNumber = 1, name, itemType = '样本', quantity = 1, owner, tags, note, imageUrl, qrCode, sortOrder = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const itemId = id || `ui-${Date.now()}`;
    await pool.query(
      `INSERT INTO upper_items (id, refrigerator_id, row_number, name, item_type, quantity, owner, tags, note, image_url, qr_code, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, req.params.fridgeId, rowNumber, name, itemType, quantity, owner || null, JSON.stringify(tags || []), note || null, imageUrl || null, qrCode || null, sortOrder]
    );
    const [[item]] = await pool.query('SELECT * FROM upper_items WHERE id = ?', [itemId]);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:itemId', async (req, res) => {
  try {
    const { name, itemType, rowNumber, quantity, owner, tags, note, imageUrl, qrCode, sortOrder } = req.body;
    await pool.query(
      `UPDATE upper_items SET name=?, item_type=?, row_number=?, quantity=?, owner=?, tags=?, note=?, image_url=?, qr_code=?, sort_order=? WHERE id=?`,
      [name, itemType, rowNumber, quantity, owner || null, JSON.stringify(tags || []), note || null, imageUrl || null, qrCode || null, sortOrder, req.params.itemId]
    );
    const [[item]] = await pool.query('SELECT * FROM upper_items WHERE id = ?', [req.params.itemId]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:itemId', async (req, res) => {
  try {
    await pool.query('UPDATE upper_items SET deleted_at = NOW() WHERE id = ?', [req.params.itemId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
