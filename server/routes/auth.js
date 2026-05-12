import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { authenticate, requireRoot } from '../middleware/auth.js';
import { hashPassword, signToken, verifyPassword } from '../authUtils.js';

const router = Router();

function normalizeUsername(username) {
  return String(username || '').trim();
}

function validateCredentials(username, password) {
  if (!username || !password) return '用户名和密码不能为空';
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
    return '用户名需为 3-32 位字母、数字、下划线或短横线';
  }
  if (String(password).length < 6 || String(password).length > 72) {
    return '密码长度需为 6-72 位';
  }
  return '';
}

router.post('/login', async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const { password } = req.body;
    const validationError = validateCredentials(username, password);
    if (validationError) return res.status(400).json({ error: validationError });

    const [[user]] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const safeUser = { username: user.username, role: user.role };
    res.json({ token: signToken(safeUser), user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', authenticate, requireRoot, async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const { password, role = 'user' } = req.body;
    const validationError = validateCredentials(username, password);
    if (validationError) return res.status(400).json({ error: validationError });
    if (!['root', 'user'].includes(role)) {
      return res.status(400).json({ error: '角色必须是 root 或 user' });
    }

    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [id, username, hashPassword(password), role],
    );
    res.status(201).json({ username, role });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '用户已存在' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
