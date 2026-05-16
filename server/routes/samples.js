import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireOwner } from '../middleware/auth.js';

const router = Router();

function rowToSample(row) {
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
    compartment: row.compartment,
    position: row.position,
    note: row.note || undefined,
    volume: row.volume || undefined,
    gridRows: row.grid_rows,
    gridCols: row.grid_cols,
    subSamples: [],
  };
}

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

// GET all samples for a fridge (with nested sub-samples)
router.get('/:fridgeId/samples', async (req, res) => {
  try {
    const [[fridge]] = await pool.query(
      'SELECT id FROM refrigerators WHERE id = ? AND deleted_at IS NULL',
      [req.params.fridgeId],
    );
    if (!fridge) return res.status(404).json({ error: 'Refrigerator not found' });

    const [sampleRows] = await pool.query(
      'SELECT * FROM samples WHERE refrigerator_id = ? AND deleted_at IS NULL ORDER BY compartment, position',
      [req.params.fridgeId],
    );
    const [subRows] = await pool.query(
      `SELECT sub_samples.* FROM sub_samples
       JOIN samples ON samples.id = sub_samples.sample_id
       WHERE samples.refrigerator_id = ?
         AND samples.deleted_at IS NULL
         AND sub_samples.deleted_at IS NULL
       ORDER BY sub_samples.position`,
      [req.params.fridgeId],
    );

    const subMap = {};
    for (const sub of subRows) {
      if (!subMap[sub.sample_id]) subMap[sub.sample_id] = [];
      subMap[sub.sample_id].push(rowToSubSample(sub));
    }
    const samples = sampleRows.map((s) => {
      const sample = rowToSample(s);
      sample.subSamples = subMap[s.id] || [];
      return sample;
    });
    res.json(samples);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single sample
router.get('/:fridgeId/samples/:id', async (req, res) => {
  try {
    const [[row]] = await pool.query(
      'SELECT * FROM samples WHERE id = ? AND refrigerator_id = ? AND deleted_at IS NULL',
      [req.params.id, req.params.fridgeId],
    );
    if (!row) return res.status(404).json({ error: 'Sample not found' });
    const sample = rowToSample(row);
    const [subs] = await pool.query(
      'SELECT * FROM sub_samples WHERE sample_id = ? AND deleted_at IS NULL ORDER BY position',
      [row.id],
    );
    sample.subSamples = subs.map(rowToSubSample);
    res.json(sample);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create sample
router.post('/:fridgeId/samples', authenticate, async (req, res) => {
  let conn;
  try {
    const {
      id, name, type, status = 'normal', temperature,
      collectedAt, patientId, tags, compartment, position,
      note, volume, uploader, gridRows = 2, gridCols = 2,
    } = req.body;

    if (!id || !name || !type || temperature == null || !compartment || position == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [[fridge]] = await conn.query(
      'SELECT id FROM refrigerators WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
      [fridgeId],
    );
    if (!fridge) {
      await conn.rollback();
      return res.status(404).json({ error: 'Refrigerator not found' });
    }

    const [[existing]] = await conn.query(
      'SELECT id FROM samples WHERE refrigerator_id = ? AND deleted_at IS NULL AND compartment = ? AND position = ?',
      [fridgeId, compartment, position],
    );
    if (existing) {
      await conn.rollback();
      return res.status(409).json({ error: 'Position already occupied' });
    }

    await conn.query(
      `INSERT INTO samples (id, refrigerator_id, name, type, status, temperature, collected_at, patient_id, uploader, created_by, tags, compartment, position, note, volume, grid_rows, grid_cols)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, fridgeId, name, type, status, temperature, collectedAt || null, patientId || null, uploader || null, req.user.username, JSON.stringify(tags || []), compartment, position, note || null, volume || null, gridRows, gridCols],
    );
    const [[row]] = await conn.query('SELECT * FROM samples WHERE id = ?', [id]);
    await conn.commit();
    const sample = rowToSample(row);
    sample.subSamples = [];
    res.status(201).json(sample);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' && conn) {
      const message = String(err.sqlMessage || '');
      if (message.includes('uniq_samples_fridge_compartment_position')) {
        await conn.rollback();
        return res.status(409).json({ error: 'Position already occupied' });
      }
      // Check if colliding record is soft-deleted — if so, reactivate it
      // Use req.body fields since destructured vars are scoped to try block
      const body = req.body;
      const [[deletedRec]] = await conn.query(
        'SELECT id FROM samples WHERE id = ? AND deleted_at IS NOT NULL',
        [body.id],
      );
      if (deletedRec) {
        try {
          await conn.query(
            `UPDATE samples SET name=?, type=?, status=?, temperature=?,
             collected_at=?, patient_id=?, uploader=?, created_by=?,
             tags=?, compartment=?, position=?, note=?, volume=?,
             grid_rows=?, grid_cols=?, refrigerator_id=?,
             deleted_at=NULL, deleted_by=NULL, updated_at=CURRENT_TIMESTAMP
             WHERE id=?`,
            [body.name, body.type, body.status || 'normal', body.temperature,
             body.collectedAt || null, body.patientId || null,
             body.uploader || null, req.user.username,
             JSON.stringify(body.tags || []), body.compartment, body.position,
             body.note || null, body.volume || null,
             body.gridRows ?? 2, body.gridCols ?? 2,
             req.params.fridgeId, body.id],
          );
          await conn.commit();
          const [[row]] = await conn.query('SELECT * FROM samples WHERE id = ?', [body.id]);
          const sample = rowToSample(row);
          sample.subSamples = [];
          return res.status(201).json(sample);
        } catch (updateErr) {
          await conn.rollback();
          return res.status(500).json({ error: updateErr.message });
        }
      }
      await conn.rollback();
      return res.status(409).json({ error: 'Sample ID already exists' });
    }
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// PUT update sample
router.put('/:fridgeId/samples/:id', authenticate, requireOwner('samples', 'id'), async (req, res) => {
  try {
    const { fridgeId, id } = req.params;
    const [[existing]] = await pool.query(
      'SELECT * FROM samples WHERE id = ? AND refrigerator_id = ? AND deleted_at IS NULL', [id, fridgeId],
    );
    if (!existing) return res.status(404).json({ error: 'Sample not found' });

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
    if (updates.compartment !== undefined) { fields.push('compartment = ?'); values.push(updates.compartment); }
    if (updates.position !== undefined) { fields.push('position = ?'); values.push(updates.position); }
    if (updates.note !== undefined) { fields.push('note = ?'); values.push(updates.note); }
    if (updates.volume !== undefined) { fields.push('volume = ?'); values.push(updates.volume); }
    if (updates.gridRows !== undefined) { fields.push('grid_rows = ?'); values.push(updates.gridRows); }
    if (updates.gridCols !== undefined) { fields.push('grid_cols = ?'); values.push(updates.gridCols); }

    if (fields.length === 0) {
      const [[row]] = await pool.query('SELECT * FROM samples WHERE id = ? AND deleted_at IS NULL', [id]);
      const s = rowToSample(row);
      const [subs] = await pool.query('SELECT * FROM sub_samples WHERE sample_id = ? AND deleted_at IS NULL ORDER BY position', [id]);
      s.subSamples = subs.map(rowToSubSample);
      return res.json(s);
    }

    // If position changed, check conflict
    const newCompartment = updates.compartment ?? existing.compartment;
    const newPosition = updates.position !== undefined ? updates.position : existing.position;
    if (updates.compartment !== undefined || updates.position !== undefined) {
      const [[conflict]] = await pool.query(
        'SELECT id FROM samples WHERE refrigerator_id = ? AND deleted_at IS NULL AND compartment = ? AND position = ? AND id != ?',
        [fridgeId, newCompartment, newPosition, id],
      );
      if (conflict) {
        return res.status(409).json({ error: 'Position conflicted', conflictSampleId: conflict.id });
      }
    }

    values.push(id);
    await pool.query(`UPDATE samples SET ${fields.join(', ')} WHERE id = ?`, values);

    const [[row]] = await pool.query('SELECT * FROM samples WHERE id = ? AND deleted_at IS NULL', [id]);
    const sample = rowToSample(row);
    const [subs] = await pool.query('SELECT * FROM sub_samples WHERE sample_id = ? AND deleted_at IS NULL ORDER BY position', [id]);
    sample.subSamples = subs.map(rowToSubSample);
    res.json(sample);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE sample
router.delete('/:fridgeId/samples/:id', authenticate, requireOwner('samples', 'id'), async (req, res) => {
  try {
    const [[existing]] = await pool.query(
      'SELECT * FROM samples WHERE id = ? AND refrigerator_id = ? AND deleted_at IS NULL',
      [req.params.id, req.params.fridgeId],
    );
    if (!existing) return res.status(404).json({ error: 'Sample not found' });
    await pool.query(
      'UPDATE samples SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ?',
      [req.user.username, req.params.id],
    );
    await pool.query(
      'UPDATE sub_samples SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE sample_id = ? AND deleted_at IS NULL',
      [req.user.username, req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
