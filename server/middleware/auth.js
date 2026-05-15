import pool from '../db.js';
import { verifyToken } from '../authUtils.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

export function requireRoot(req, res, next) {
  if (req.user?.role !== 'root') return res.status(403).json({ error: 'Root permission required' });
  next();
}

export function requireOwner(table, idParam) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'root') return next();
      const id = req.params[idParam];
      const [[row]] = await pool.query(`SELECT created_by FROM \`${table}\` WHERE id = ?`, [id]);
      if (!row) return res.status(404).json({ error: 'Record not found' });
      if (!row.created_by) {
        return res.status(403).json({ error: 'Legacy data can only be edited by root' });
      }
      if (row.created_by !== req.user?.username) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

// Flexible owner check: checks a specified column (owner_field) and/or uploader
export function requireResourceOwner(table, idParam, ownerColumn = 'owner') {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'root') return next();
      const id = req.params[idParam];
      const [[row]] = await pool.query(`SELECT ${ownerColumn} FROM \`${table}\` WHERE id = ?`, [id]);
      if (!row) return res.status(404).json({ error: 'Record not found' });
      const recordOwner = row[ownerColumn];
      if (!recordOwner) return next(); // unowned records: any logged-in user can modify
      if (recordOwner !== req.user?.username) {
        return res.status(403).json({ error: '只有创建者可以修改此记录' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}
