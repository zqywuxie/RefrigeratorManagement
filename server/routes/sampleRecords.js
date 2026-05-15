import { Router } from 'express';
import pool from '../db.js';

const router = Router();

const GROUP_COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#14b8a6','#e11d48','#6366f1'];

function nextGroupColor(conn) {
  return conn.query('SELECT COUNT(*) as cnt FROM sample_records WHERE deleted_at IS NULL')
    .then(([[{ cnt }]]) => GROUP_COLORS[Number(cnt) % GROUP_COLORS.length]);
}

// GET /api/sample-records?box_id=&search=
router.get('/', async (req, res) => {
  try {
    let query = `SELECT sr.*, COUNT(t.id) as tube_count
      FROM sample_records sr
      LEFT JOIN tubes t ON t.sample_id = sr.id
      WHERE sr.deleted_at IS NULL`;
    const params = [];

    if (req.query.box_id) {
      query += ' AND sr.id IN (SELECT sample_id FROM tubes WHERE box_id = ?)';
      params.push(req.query.box_id);
    }
    if (req.query.search) {
      query += ' AND (sr.patient_name LIKE ? OR sr.sample_code LIKE ? OR sr.sample_type LIKE ?)';
      const q = `%${req.query.search}%`;
      params.push(q, q, q);
    }

    query += ' GROUP BY sr.id ORDER BY sr.created_at DESC';
    const [rows] = await pool.query(query, params);

    // Attach tubes for each sample
    for (const row of rows) {
      const [tubes] = await pool.query(
        `SELECT t.*, b.name as box_name, b.grid_cols
         FROM tubes t
         LEFT JOIN boxes b ON b.id = t.box_id
         WHERE t.sample_id = ?
         ORDER BY t.tube_label`,
        [row.id]
      );
      row.tubes = tubes;
      row.tags = typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []);
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sample-records/:id
router.get('/:id', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT * FROM sample_records WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Sample record not found' });

    const [tubes] = await pool.query(
      `SELECT t.*, b.name as box_name, b.grid_cols
       FROM tubes t
       LEFT JOIN boxes b ON b.id = t.box_id
       WHERE t.sample_id = ?
       ORDER BY t.tube_label`,
      [row.id]
    );
    row.tubes = tubes;
    row.tags = typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []);

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sample-records
router.post('/', async (req, res) => {
  try {
    const {
      patient_name, sample_code, source, sample_type, collection_stage,
      collected_at, tags, note, uploader,
      tubes: tubeInputs, // [{ box_id, position, volume, barcode, status }]
    } = req.body;

    if (!patient_name || !sample_code) {
      return res.status(400).json({ error: 'patient_name and sample_code are required' });
    }

    const sampleId = `sr-${Date.now()}`;
    const color = await nextGroupColor(pool);

    await pool.query(
      `INSERT INTO sample_records (id, patient_name, sample_code, source, sample_type, collection_stage, collected_at, tags, note, group_color, uploader)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sampleId, patient_name, sample_code, source || null, sample_type || null,
       collection_stage || null, collected_at || null, JSON.stringify(tags || []),
       note || null, color, uploader || null]
    );

    const createdTubes = [];
    if (Array.isArray(tubeInputs) && tubeInputs.length > 0) {
      for (let i = 0; i < tubeInputs.length; i++) {
        const t = tubeInputs[i];
        const tubeId = `tube-${Date.now()}-${i}`;
        const tubeLabel = `Tube${i + 1}`;
        await pool.query(
          `INSERT INTO tubes (id, sample_id, tube_label, box_id, position, barcode, volume, status, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tubeId, sampleId, tubeLabel, t.box_id, t.position, t.barcode || null,
           t.volume || null, t.status || 'normal', t.note || null]
        );
        const [[tube]] = await pool.query('SELECT * FROM tubes WHERE id = ?', [tubeId]);
        createdTubes.push(tube);
      }
    }

    const [[record]] = await pool.query('SELECT * FROM sample_records WHERE id = ?', [sampleId]);
    record.tubes = createdTubes;
    record.tags = tags || [];

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sample-records/:id
router.put('/:id', async (req, res) => {
  try {
    const [[existing]] = await pool.query('SELECT * FROM sample_records WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Sample record not found' });

    const { patient_name, sample_code, source, sample_type, collection_stage, collected_at, tags, note } = req.body;
    await pool.query(
      `UPDATE sample_records SET patient_name=?, sample_code=?, source=?, sample_type=?, collection_stage=?, collected_at=?, tags=?, note=? WHERE id=?`,
      [
        patient_name ?? existing.patient_name,
        sample_code ?? existing.sample_code,
        source ?? existing.source,
        sample_type ?? existing.sample_type,
        collection_stage ?? existing.collection_stage,
        collected_at ?? existing.collected_at,
        tags != null ? JSON.stringify(tags) : existing.tags,
        note ?? existing.note,
        req.params.id,
      ]
    );

    const [[row]] = await pool.query('SELECT * FROM sample_records WHERE id = ?', [req.params.id]);
    const [tubes] = await pool.query(
      `SELECT t.*, b.name as box_name, b.grid_cols FROM tubes t LEFT JOIN boxes b ON b.id = t.box_id WHERE t.sample_id = ? ORDER BY t.tube_label`,
      [row.id]
    );
    row.tubes = tubes;
    row.tags = typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []);

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sample-records/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE sample_records SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
    await pool.query('DELETE FROM tubes WHERE sample_id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sample-records/:id/tubes — add tubes to existing sample
router.post('/:id/tubes', async (req, res) => {
  try {
    const [[sample]] = await pool.query('SELECT * FROM sample_records WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!sample) return res.status(404).json({ error: 'Sample record not found' });

    const { tubes: tubeInputs } = req.body; // [{ box_id, position, volume, barcode, status }]
    if (!Array.isArray(tubeInputs) || tubeInputs.length === 0) {
      return res.status(400).json({ error: 'tubes array is required' });
    }

    // Get current tube count for label numbering
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) as cnt FROM tubes WHERE sample_id = ?', [req.params.id]);

    const createdTubes = [];
    for (let i = 0; i < tubeInputs.length; i++) {
      const t = tubeInputs[i];
      const tubeId = `tube-${Date.now()}-${i}`;
      const tubeLabel = `Tube${Number(cnt) + i + 1}`;
      await pool.query(
        `INSERT INTO tubes (id, sample_id, tube_label, box_id, position, barcode, volume, status, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tubeId, req.params.id, tubeLabel, t.box_id, t.position, t.barcode || null,
         t.volume || null, t.status || 'normal', t.note || null]
      );
      const [[tube]] = await pool.query('SELECT * FROM tubes WHERE id = ?', [tubeId]);
      createdTubes.push(tube);
    }

    res.status(201).json({ tubes: createdTubes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sample-records/batch — batch update fields
router.put('/batch', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !updates) {
      return res.status(400).json({ error: 'ids array and updates object required' });
    }

    const fields = [];
    const values = [];
    if (updates.source !== undefined) { fields.push('source = ?'); values.push(updates.source); }
    if (updates.sample_type !== undefined) { fields.push('sample_type = ?'); values.push(updates.sample_type); }
    if (updates.collection_stage !== undefined) { fields.push('collection_stage = ?'); values.push(updates.collection_stage); }
    if (updates.collected_at !== undefined) { fields.push('collected_at = ?'); values.push(updates.collected_at); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    values.push(ids);
    await pool.query(
      `UPDATE sample_records SET ${fields.join(', ')} WHERE id IN (?) AND deleted_at IS NULL`,
      values
    );
    res.json({ ok: true, updated: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
