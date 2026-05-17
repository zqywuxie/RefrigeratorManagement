import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRoot } from '../middleware/auth.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM sample_types ORDER BY name');
    res.json(rows.map((r) => r.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    await pool.query('INSERT INTO sample_types (name) VALUES (?)', [name.trim()]);
    res.status(201).json({ name: name.trim() });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Type already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:name', authenticate, requireRoot, async (req, res) => {
  const oldName = decodeURIComponent(req.params.name);
  const { newName } = req.body;

  if (!newName || !newName.trim()) return res.status(400).json({ error: 'newName is required' });
  const trimmedNew = newName.trim();
  if (oldName === trimmedNew) return res.json({ oldName, newName: trimmedNew });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('INSERT INTO sample_types (name) VALUES (?)', [trimmedNew]);

    await conn.query('UPDATE sample_records SET sample_type = ? WHERE sample_type = ?', [trimmedNew, oldName]);
    await conn.query('UPDATE boxes SET sample_type = ? WHERE sample_type = ?', [trimmedNew, oldName]);

    await conn.query('DELETE FROM sample_types WHERE name = ?', [oldName]);

    await conn.commit();
    res.json({ oldName, newName: trimmedNew });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: `Type "${trimmedNew}" already exists` });
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.delete('/:name', authenticate, requireRoot, async (req, res) => {
  const name = decodeURIComponent(req.params.name);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('UPDATE sample_records SET sample_type = NULL WHERE sample_type = ?', [name]);
    await conn.query('UPDATE boxes SET sample_type = NULL WHERE sample_type = ?', [name]);

    await conn.query('DELETE FROM sample_types WHERE name = ?', [name]);

    await conn.commit();
    res.json({ name });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

export default router;
