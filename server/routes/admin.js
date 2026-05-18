import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { authenticate, requireRoot } from '../middleware/auth.js';
import { hashPassword } from '../authUtils.js';

const router = Router();

router.use(authenticate, requireRoot);

function normalizeUsername(username) {
  return String(username || '').trim();
}

function validateCredentials(username, password, { passwordRequired = true } = {}) {
  if (!username) return '用户名不能为空';
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
    return '用户名需为 3-32 位字母、数字、下划线或短横线';
  }
  if (passwordRequired || password) {
    if (!password) return '密码不能为空';
    if (String(password).length < 6 || String(password).length > 72) {
      return '密码长度需为 6-72 位';
    }
  }
  return '';
}

async function getRootCount(excludingUsername) {
  const params = [];
  let where = "role = 'root'";
  if (excludingUsername) {
    where += ' AND username != ?';
    params.push(excludingUsername);
  }
  const [[row]] = await pool.query(`SELECT COUNT(*) AS cnt FROM users WHERE ${where}`, params);
  return Number(row.cnt || 0);
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (!tags) return [];
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

function formatDbDate(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

router.get('/summary', async (_req, res) => {
  try {
    const [
      [[refrigeratorTotals]],
      [[srTotals]],
      [[upperItemTotals]],
      [[boxTotals]],
      [[tubeTotals]],
      [srTypeRows],
      [fridgeRows],
      [ownerRows],
    ] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*) AS refrigerator_count,
          COALESCE(SUM(upper_rows * upper_cols + lower_rows * lower_cols), 0) AS total_capacity
         FROM refrigerators
         WHERE deleted_at IS NULL`,
      ),
      // Sample records totals
      pool.query(
        `SELECT COUNT(*) AS sr_count FROM sample_records WHERE deleted_at IS NULL`
      ),
      pool.query(
        `SELECT COUNT(*) AS upper_item_count
         FROM upper_items ui
         JOIN refrigerators r ON r.id = ui.refrigerator_id
         WHERE ui.deleted_at IS NULL AND r.deleted_at IS NULL`
      ),
      pool.query(
        `SELECT COUNT(*) AS box_count,
                COALESCE(SUM(COALESCE(b.grid_rows, 0) * COALESCE(b.grid_cols, 0)), 0) AS box_capacity
         FROM boxes b
         LEFT JOIN drawers d ON d.id = b.drawer_id AND d.deleted_at IS NULL
         LEFT JOIN upper_items ui ON ui.id = b.id AND ui.deleted_at IS NULL
         JOIN refrigerators r ON r.id = COALESCE(d.refrigerator_id, ui.refrigerator_id)
         WHERE b.deleted_at IS NULL
           AND r.deleted_at IS NULL`
      ),
      pool.query(
        `SELECT COUNT(*) AS tube_count
         FROM tubes t
         JOIN sample_records sr ON sr.id = t.sample_id AND sr.deleted_at IS NULL
         JOIN boxes b ON b.id = t.box_id AND b.deleted_at IS NULL
         LEFT JOIN drawers d ON d.id = b.drawer_id AND d.deleted_at IS NULL
         LEFT JOIN upper_items ui ON ui.id = b.id AND ui.deleted_at IS NULL
         JOIN refrigerators r ON r.id = COALESCE(d.refrigerator_id, ui.refrigerator_id)
         WHERE t.deleted_at IS NULL
           AND r.deleted_at IS NULL`
      ),
      // Sample records type counts
      pool.query(
        `SELECT sample_type as type, COUNT(*) as count FROM sample_records
         WHERE deleted_at IS NULL AND sample_type IS NOT NULL
         GROUP BY sample_type ORDER BY count DESC`
      ),
      pool.query(
        `SELECT
          r.id,
          r.name,
          (r.upper_rows * r.upper_cols + r.lower_rows * r.lower_cols + COALESCE(b.box_capacity, 0)) AS capacity,
          COALESCE(sr.sample_record_count, 0) AS sample_record_count,
          COALESCE(ui.upper_item_count, 0) AS upper_item_count,
          COALESCE(b.box_count, 0) AS box_count,
          COALESCE(t.tube_count, 0) AS tube_count
         FROM refrigerators r
         LEFT JOIN (
           SELECT
             COALESCE(d.refrigerator_id, ui.refrigerator_id) AS refrigerator_id,
             COUNT(DISTINCT t.sample_id) AS sample_record_count
           FROM tubes t
           JOIN sample_records sr ON sr.id = t.sample_id AND sr.deleted_at IS NULL
           JOIN boxes b ON b.id = t.box_id AND b.deleted_at IS NULL
           LEFT JOIN drawers d ON d.id = b.drawer_id AND d.deleted_at IS NULL
           LEFT JOIN upper_items ui ON ui.id = b.id AND ui.deleted_at IS NULL
           WHERE t.deleted_at IS NULL
             AND COALESCE(d.refrigerator_id, ui.refrigerator_id) IS NOT NULL
           GROUP BY COALESCE(d.refrigerator_id, ui.refrigerator_id)
         ) sr ON sr.refrigerator_id = r.id
         LEFT JOIN (
           SELECT refrigerator_id, COUNT(*) AS upper_item_count
           FROM upper_items
           WHERE deleted_at IS NULL
           GROUP BY refrigerator_id
         ) ui ON ui.refrigerator_id = r.id
         LEFT JOIN (
           SELECT
             COALESCE(drawers.refrigerator_id, upper_items.refrigerator_id) AS refrigerator_id,
             COUNT(boxes.id) AS box_count,
             COALESCE(SUM(COALESCE(boxes.grid_rows, 0) * COALESCE(boxes.grid_cols, 0)), 0) AS box_capacity
           FROM boxes
           LEFT JOIN drawers ON drawers.id = boxes.drawer_id
           LEFT JOIN upper_items ON upper_items.id = boxes.id AND upper_items.deleted_at IS NULL
           WHERE boxes.deleted_at IS NULL
             AND (drawers.deleted_at IS NULL OR drawers.id IS NULL)
             AND COALESCE(drawers.refrigerator_id, upper_items.refrigerator_id) IS NOT NULL
           GROUP BY COALESCE(drawers.refrigerator_id, upper_items.refrigerator_id)
         ) b ON b.refrigerator_id = r.id
         LEFT JOIN (
           SELECT
             COALESCE(d.refrigerator_id, ui.refrigerator_id) AS refrigerator_id,
             COUNT(*) AS tube_count
           FROM tubes t
           JOIN sample_records sr ON sr.id = t.sample_id AND sr.deleted_at IS NULL
           JOIN boxes b ON b.id = t.box_id AND b.deleted_at IS NULL
           LEFT JOIN drawers d ON d.id = b.drawer_id AND d.deleted_at IS NULL
           LEFT JOIN upper_items ui ON ui.id = b.id AND ui.deleted_at IS NULL
           WHERE t.deleted_at IS NULL
             AND COALESCE(d.refrigerator_id, ui.refrigerator_id) IS NOT NULL
           GROUP BY COALESCE(d.refrigerator_id, ui.refrigerator_id)
         ) t ON t.refrigerator_id = r.id
         WHERE r.deleted_at IS NULL
         ORDER BY r.created_at ASC`,
      ),
      pool.query(
        `SELECT COALESCE(uploader, '历史数据') AS owner,
                COUNT(*) AS count
         FROM sample_records
         WHERE deleted_at IS NULL
         GROUP BY COALESCE(uploader, '历史数据')
         ORDER BY count DESC, owner ASC`,
      ),
    ]);

    const srCount = Number(srTotals.sr_count || 0);
    const upperItemCount = Number(upperItemTotals.upper_item_count || 0);
    const boxCount = Number(boxTotals.box_count || 0);
    const tubeCount = Number(tubeTotals.tube_count || 0);
    const totalCapacity = Number(refrigeratorTotals.total_capacity || 0) + Number(boxTotals.box_capacity || 0);
    const usedSlots = tubeCount + upperItemCount;
    const mergedTypes = new Map();
    for (const row of srTypeRows) mergedTypes.set(row.type || '未分类', (mergedTypes.get(row.type || '未分类') || 0) + Number(row.count || 0));

    // Per-fridge sample type distribution from sample_records via tubes
    const [fridgeTypeRows] = await pool.query(
      `SELECT COALESCE(d.refrigerator_id, ui.refrigerator_id) AS fridge_id, sr.sample_type AS type, COUNT(*) AS cnt
       FROM tubes t JOIN sample_records sr ON sr.id = t.sample_id AND sr.deleted_at IS NULL
       LEFT JOIN boxes b ON b.id = t.box_id
       LEFT JOIN drawers d ON d.id = b.drawer_id
       LEFT JOIN upper_items ui ON ui.id = b.id AND ui.deleted_at IS NULL
       WHERE COALESCE(d.refrigerator_id, ui.refrigerator_id) IS NOT NULL AND sr.sample_type IS NOT NULL
       GROUP BY fridge_id, type ORDER BY fridge_id, cnt DESC`
    );
    const fridgeTypeMap = new Map();
    for (const row of fridgeTypeRows) {
      if (!fridgeTypeMap.has(row.fridge_id)) fridgeTypeMap.set(row.fridge_id, []);
      fridgeTypeMap.get(row.fridge_id).push({ type: row.type, count: Number(row.cnt) });
    }

    res.json({
      totals: {
        refrigerators: Number(refrigeratorTotals.refrigerator_count || 0),
        sampleRecords: srCount,
        upperItems: upperItemCount,
        boxes: boxCount,
        tubes: tubeCount,
        totalItems: srCount + upperItemCount,
        totalCapacity,
        usedSlots,
        usageRate: totalCapacity > 0 ? Math.round((usedSlots / totalCapacity) * 100) : 0,
      },
      typeCounts: Array.from(mergedTypes, ([type, count]) => ({ type, count })),
      refrigerators: fridgeRows.map((row) => ({
        id: row.id,
        name: row.name,
        capacity: Number(row.capacity || 0),
        sampleRecordCount: Number(row.sample_record_count || 0),
        upperItemCount: Number(row.upper_item_count || 0),
        boxCount: Number(row.box_count || 0),
        tubeCount: Number(row.tube_count || 0),
        typeDistribution: fridgeTypeMap.get(row.id) || [],
        usageRate: Number(row.capacity || 0) > 0
          ? Math.round(((Number(row.tube_count || 0) + Number(row.upper_item_count || 0)) / Number(row.capacity || 0)) * 100)
          : 0,
      })),
      owners: ownerRows.map((row) => ({
        username: row.owner,
        recordCount: Number(row.count || 0),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         u.username,
         u.role,
         u.created_at,
         COALESCE(sr.record_count, 0) AS record_count,
         COALESCE(t.tube_count, 0) AS tube_count
       FROM users u
       LEFT JOIN (
         SELECT uploader, COUNT(*) AS record_count
         FROM sample_records
         WHERE deleted_at IS NULL
         GROUP BY uploader
       ) sr ON sr.uploader = u.username
       LEFT JOIN (
         SELECT sr.uploader, COUNT(t.id) AS tube_count
         FROM sample_records sr
         LEFT JOIN tubes t ON t.sample_id = sr.id AND t.deleted_at IS NULL
         WHERE sr.deleted_at IS NULL
         GROUP BY sr.uploader
       ) t ON t.uploader = u.username
       ORDER BY CASE WHEN u.role = 'root' THEN 0 ELSE 1 END, u.username ASC`,
    );
    res.json(
      rows.map((row) => ({
        username: row.username,
        role: row.role,
        createdAt: row.created_at,
        recordCount: Number(row.record_count || 0),
        tubeCount: Number(row.tube_count || 0),
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const { password } = req.body;
    const role = req.body.role || 'user';
    const validationError = validateCredentials(username, password);
    if (validationError) return res.status(400).json({ error: validationError });
    if (!['root', 'user'].includes(role)) {
      return res.status(400).json({ error: '角色必须是 root 或 user' });
    }

    await pool.query(
      'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), username, hashPassword(password), role],
    );
    res.status(201).json({
      username,
      role,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '用户已存在' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:username', async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username);
    const { role, password } = req.body;
    const validationError = validateCredentials(username, password, { passwordRequired: false });
    if (validationError) return res.status(400).json({ error: validationError });
    if (role !== undefined && !['root', 'user'].includes(role)) {
      return res.status(400).json({ error: '角色必须是 root 或 user' });
    }

    const [[existing]] = await pool.query('SELECT username, role FROM users WHERE username = ?', [username]);
    if (!existing) return res.status(404).json({ error: '用户不存在' });

    if (role === 'user' && existing.role === 'root') {
      const remainingRoots = await getRootCount(username);
      if (remainingRoots === 0) {
        return res.status(409).json({ error: '不能降级最后一个 root 用户' });
      }
      if (req.user.username === username) {
        return res.status(400).json({ error: '不能修改当前登录用户的 root 角色' });
      }
    }

    const fields = [];
    const values = [];
    if (role !== undefined) {
      fields.push('role = ?');
      values.push(role);
    }
    if (password) {
      fields.push('password_hash = ?');
      values.push(hashPassword(password));
    }
    if (fields.length === 0) {
      return res.json({ username: existing.username, role: existing.role });
    }

    values.push(username);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE username = ?`, values);
    const [[updated]] = await pool.query('SELECT username, role, created_at FROM users WHERE username = ?', [
      username,
    ]);
    res.json({
      username: updated.username,
      role: updated.role,
      createdAt: updated.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:username', async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username);
    if (req.user.username === username) {
      return res.status(400).json({ error: '不能删除当前登录用户' });
    }

    const [[existing]] = await pool.query('SELECT username, role FROM users WHERE username = ?', [username]);
    if (!existing) return res.status(404).json({ error: '用户不存在' });
    if (existing.role === 'root') {
      const remainingRoots = await getRootCount(username);
      if (remainingRoots === 0) {
        return res.status(409).json({ error: '不能删除最后一个 root 用户' });
      }
    }

    await pool.query('DELETE FROM users WHERE username = ?', [username]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/boxes — list all boxes with drawer/fridge info
router.get('/boxes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, d.label as drawer_label, d.layer, d.row_pos, d.col_pos,
              r.name as fridge_name, r.id as fridge_id
       FROM boxes b
       JOIN drawers d ON d.id = b.drawer_id
       JOIN refrigerators r ON r.id = d.refrigerator_id
       WHERE b.deleted_at IS NULL AND r.deleted_at IS NULL
       ORDER BY r.name, d.layer, d.row_pos, d.col_pos, b.position`
    );
    // Get tube counts per box
    for (const box of rows) {
      const [[{ cnt }]] = await pool.query(
        'SELECT COUNT(*) as cnt FROM tubes WHERE box_id = ?', [box.id]
      );
      box.tube_count = cnt;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/boxes/:boxId — box detail with tubes and sample records
router.get('/boxes/:boxId', async (req, res) => {
  try {
    const [[box]] = await pool.query(
      `SELECT b.*, d.label as drawer_label, r.name as fridge_name
       FROM boxes b
       JOIN drawers d ON d.id = b.drawer_id
       JOIN refrigerators r ON r.id = d.refrigerator_id
       WHERE b.id = ? AND b.deleted_at IS NULL`,
      [req.params.boxId]
    );
    if (!box) return res.status(404).json({ error: 'Box not found' });

    const [tubes] = await pool.query(
      `SELECT t.*, sr.patient_name, sr.sample_code, sr.group_color
       FROM tubes t
       JOIN sample_records sr ON sr.id = t.sample_id AND sr.deleted_at IS NULL
       WHERE t.box_id = ?
       ORDER BY t.position`,
      [req.params.boxId]
    );
    box.tubes = tubes;
    res.json(box);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/sample-records — list all sample records
router.get('/sample-records', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sr.*, COUNT(t.id) as tube_count
       FROM sample_records sr
       LEFT JOIN tubes t ON t.sample_id = sr.id
       WHERE sr.deleted_at IS NULL
       GROUP BY sr.id
       ORDER BY sr.created_at DESC
       LIMIT 200`
    );
    for (const row of rows) {
      row.tags = typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/upper-items
router.get('/upper-items', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ui.*, r.name as fridge_name
       FROM upper_items ui
       JOIN refrigerators r ON r.id = ui.refrigerator_id
       WHERE ui.deleted_at IS NULL AND r.deleted_at IS NULL
       ORDER BY r.name, ui.row_number, ui.sort_order`
    );
    for (const row of rows) {
      row.tags = typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/upper-items/:id
router.delete('/upper-items/:id', async (req, res) => {
  try {
    await pool.query('UPDATE upper_items SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/upper-items/:id
router.put('/upper-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, item_type, quantity, owner, note, tags,
      row_number, box_mode, grid_rows, grid_cols, sort_order,
    } = req.body;
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (item_type !== undefined) { fields.push('item_type = ?'); values.push(item_type); }
    if (quantity !== undefined) { fields.push('quantity = ?'); values.push(quantity); }
    if (owner !== undefined) { fields.push('owner = ?'); values.push(owner ?? null); }
    if (note !== undefined) { fields.push('note = ?'); values.push(note ?? null); }
    if (tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(tags)); }
    if (row_number !== undefined) { fields.push('row_number = ?'); values.push(row_number); }
    if (box_mode !== undefined) { fields.push('box_mode = ?'); values.push(box_mode); }
    if (grid_rows !== undefined) { fields.push('grid_rows = ?'); values.push(grid_rows); }
    if (grid_cols !== undefined) { fields.push('grid_cols = ?'); values.push(grid_cols); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
    if (fields.length === 0) return res.json({ ok: true });
    fields.push('updated_at = NOW()');
    values.push(id);
    await pool.query(`UPDATE upper_items SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/sample-types — all sample types with per-table usage counts
router.get('/sample-types', async (_req, res) => {
  try {
    const [[typeRows], [recordCounts], [boxCounts]] = await Promise.all([
      pool.query('SELECT name FROM sample_types ORDER BY name'),
      pool.query('SELECT sample_type AS type, COUNT(*) AS cnt FROM sample_records WHERE deleted_at IS NULL AND sample_type IS NOT NULL GROUP BY sample_type'),
      pool.query('SELECT sample_type AS type, COUNT(*) AS cnt FROM boxes WHERE deleted_at IS NULL AND sample_type IS NOT NULL GROUP BY sample_type'),
    ]);

    const recordCountMap = new Map();
    for (const r of recordCounts) recordCountMap.set(r.type, Number(r.cnt));
    const boxCountMap = new Map();
    for (const r of boxCounts) boxCountMap.set(r.type, Number(r.cnt));

    const result = typeRows.map((t) => {
      const recordCount = recordCountMap.get(t.name) || 0;
      const boxCount = boxCountMap.get(t.name) || 0;
      return {
        name: t.name,
        sampleCount: 0,
        subSampleCount: 0,
        recordCount,
        boxCount,
        total: recordCount + boxCount,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/item-types — all item types with usage counts
router.get('/item-types', async (_req, res) => {
  try {
    const [[typeRows], [itemCounts]] = await Promise.all([
      pool.query('SELECT name FROM item_types ORDER BY name'),
      pool.query(
        `SELECT ui.item_type AS type, COUNT(*) AS cnt
         FROM upper_items ui
         JOIN refrigerators r ON r.id = ui.refrigerator_id AND r.deleted_at IS NULL
         WHERE ui.deleted_at IS NULL
         GROUP BY ui.item_type`,
      ),
    ]);

    const countMap = new Map();
    for (const r of itemCounts) countMap.set(r.type, Number(r.cnt));

    const result = typeRows.map((t) => ({
      name: t.name,
      upperItemCount: countMap.get(t.name) || 0,
      total: countMap.get(t.name) || 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
