import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireOwner } from '../middleware/auth.js';

const router = Router();

function rowToSubSample(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    temperature: Number(row.temperature),
    collectedAt: row.collected_at ? row.collected_at.toString().slice(0, 10) : '',
    patientId: row.patient_id || '',
    uploader: row.uploader || '',
    createdBy: row.created_by || undefined,
    tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags) : []),
    position: row.position,
    note: row.note || undefined,
    volume: row.volume || undefined,
  };
}

// GET all sub-samples for a sample
router.get('/:sampleId/sub-samples', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM sub_samples WHERE sample_id = ? AND deleted_at IS NULL ORDER BY position',
      [req.params.sampleId],
    );
    res.json(rows.map(rowToSubSample));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create sub-sample
router.post('/:sampleId/sub-samples', authenticate, async (req, res) => {
  let conn;
  try {
    const { sampleId } = req.params;
    const {
      id, name, type, status = 'normal', temperature,
      collectedAt, patientId, uploader, tags, position, note, volume,
    } = req.body;

    if (!id || !name || !type || temperature == null || position == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [[sample]] = await conn.query(
      'SELECT id FROM samples WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
      [sampleId],
    );
    if (!sample) {
      await conn.rollback();
      return res.status(404).json({ error: 'Sample not found' });
    }

    const [[existing]] = await conn.query(
      'SELECT id FROM sub_samples WHERE sample_id = ? AND deleted_at IS NULL AND position = ?',
      [sampleId, position],
    );
    if (existing) {
      await conn.rollback();
      return res.status(409).json({ error: 'Position already occupied' });
    }

    await conn.query(
      `INSERT INTO sub_samples (id, sample_id, name, type, status, temperature, collected_at, patient_id, uploader, created_by, tags, position, note, volume)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, sampleId, name, type, status, temperature, collectedAt || null, patientId || null, uploader || null, req.user.username, JSON.stringify(tags || []), position, note || null, volume || null],
    );
    const [[row]] = await conn.query('SELECT * FROM sub_samples WHERE id = ?', [id]);
    await conn.commit();
    res.status(201).json(rowToSubSample(row));
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      const message = String(err.sqlMessage || '');
      if (message.includes('uniq_sub_samples_sample_position')) {
        return res.status(409).json({ error: 'Position already occupied' });
      }
      return res.status(409).json({ error: 'Sub-sample ID already exists' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// PUT update sub-sample
router.put('/:sampleId/sub-samples/:id', authenticate, requireOwner('sub_samples', 'id'), async (req, res) => {
  try {
    const { sampleId, id } = req.params;
    const [[existing]] = await pool.query(
      'SELECT * FROM sub_samples WHERE id = ? AND sample_id = ? AND deleted_at IS NULL', [id, sampleId],
    );
    if (!existing) return res.status(404).json({ error: 'Sub-sample not found' });

    const updates = req.body;
    const fields = [];
    const values = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.temperature !== undefined) { fields.push('temperature = ?'); values.push(updates.temperature); }
    if (updates.collectedAt !== undefined) { fields.push('collected_at = ?'); values.push(updates.collectedAt); }
    if (updates.patientId !== undefined) { fields.push('patient_id = ?'); values.push(updates.patientId); }
    if (updates.uploader !== undefined) { fields.push('uploader = ?'); values.push(updates.uploader); }
    if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
    if (updates.position !== undefined) { fields.push('position = ?'); values.push(updates.position); }
    if (updates.note !== undefined) { fields.push('note = ?'); values.push(updates.note); }
    if (updates.volume !== undefined) { fields.push('volume = ?'); values.push(updates.volume); }

    if (fields.length === 0) {
      const [[row]] = await pool.query('SELECT * FROM sub_samples WHERE id = ? AND deleted_at IS NULL', [id]);
      return res.json(rowToSubSample(row));
    }

    // If position changed, check conflict
    if (updates.position !== undefined) {
      const [[conflict]] = await pool.query(
        'SELECT id FROM sub_samples WHERE sample_id = ? AND deleted_at IS NULL AND position = ? AND id != ?',
        [sampleId, updates.position, id],
      );
      if (conflict) {
        return res.status(409).json({ error: 'Position conflicted', conflictSubSampleId: conflict.id });
      }
    }

    values.push(id);
    await pool.query(`UPDATE sub_samples SET ${fields.join(', ')} WHERE id = ?`, values);

    const [[row]] = await pool.query('SELECT * FROM sub_samples WHERE id = ? AND deleted_at IS NULL', [id]);
    res.json(rowToSubSample(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE sub-sample
router.delete('/:sampleId/sub-samples/:id', authenticate, requireOwner('sub_samples', 'id'), async (req, res) => {
  try {
    const [[existing]] = await pool.query(
      'SELECT * FROM sub_samples WHERE id = ? AND sample_id = ? AND deleted_at IS NULL',
      [req.params.id, req.params.sampleId],
    );
    if (!existing) return res.status(404).json({ error: 'Sub-sample not found' });
    await pool.query(
      'UPDATE sub_samples SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ?',
      [req.user.username, req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
