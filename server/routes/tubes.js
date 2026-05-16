import { Router } from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/boxes/:boxId/tubes
router.get('/boxes/:boxId/tubes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, sr.patient_name, sr.sample_code, sr.sample_type,
              sr.group_color, b.drawer_id, d.refrigerator_id as fridge_id
       FROM tubes t
       JOIN sample_records sr ON sr.id = t.sample_id AND sr.deleted_at IS NULL
       LEFT JOIN boxes b ON b.id = t.box_id
       LEFT JOIN drawers d ON d.id = b.drawer_id
       WHERE t.box_id = ?
       ORDER BY t.position`,
      [req.params.boxId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tubes/:id
router.put('/tubes/:id', authenticate, async (req, res) => {
  try {
    const [[existing]] = await pool.query('SELECT * FROM tubes WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Tube not found' });

    const { barcode, volume, status, note, position, box_id } = req.body;
    await pool.query(
      `UPDATE tubes SET barcode=?, volume=?, status=?, note=?, position=?, box_id=? WHERE id=?`,
      [
        barcode ?? existing.barcode,
        volume ?? existing.volume,
        status ?? existing.status,
        note ?? existing.note,
        position ?? existing.position,
        box_id ?? existing.box_id,
        req.params.id,
      ]
    );
    const [[tube]] = await pool.query('SELECT * FROM tubes WHERE id = ?', [req.params.id]);
    res.json(tube);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tubes/:id
router.delete('/tubes/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM tubes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
