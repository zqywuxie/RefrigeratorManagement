import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM item_types ORDER BY name');
    res.json(rows.map((row) => row.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    const normalized = name.trim();
    await pool.query('INSERT INTO item_types (name) VALUES (?)', [normalized]);
    res.status(201).json({ name: normalized });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Type already exists' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
