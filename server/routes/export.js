import { Router } from 'express';
import XLSX from 'xlsx';
import pool from '../db.js';
import { authenticate, requireRoot } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRoot);

router.get('/sample-records', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT patient_name, sample_code, source, sample_type, collection_stage, collected_at, tags, note, uploader, created_at FROM sample_records WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    const data = rows.map((r) => ({
      '患者姓名': r.patient_name,
      '样本编号': r.sample_code,
      '样本来源': r.source || '',
      '样本类型': r.sample_type || '',
      '采集阶段': r.collection_stage || '',
      '采集时间': r.collected_at,
      '标签': Array.isArray(r.tags) ? r.tags.join(', ') : (r.tags || ''),
      '备注': r.note || '',
      '上传者': r.uploader || '',
      '创建时间': r.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '样本记录');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', 'attachment; filename=sample-records.xlsx');
    res.send(buf);
  } catch (err) {
    console.error('Export sample-records error:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

router.get('/boxes', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        r.name AS fridge_name,
        d.layer,
        d.label AS drawer_label,
        b.name,
        b.mode,
        b.grid_rows,
        b.grid_cols,
        b.sample_type,
        b.project_name,
        b.quantity,
        b.owner,
        b.data_path,
        b.note,
        (SELECT COUNT(*) FROM tubes t WHERE t.box_id = b.id) AS tube_count
      FROM boxes b
      JOIN drawers d ON d.id = b.drawer_id
      JOIN refrigerators r ON r.id = d.refrigerator_id
      WHERE b.deleted_at IS NULL
      ORDER BY r.name, d.layer, d.label, b.position`
    );
    const data = rows.map((r) => ({
      '冰箱名称': r.fridge_name,
      '层级': `第${r.layer}层`,
      '抽屉': r.drawer_label,
      '盒子名称': r.name,
      '模式': r.mode === 'precise' ? '精细' : '简略',
      '网格': r.grid_rows && r.grid_cols ? `${r.grid_rows}×${r.grid_cols}` : '—',
      '样本类型': r.sample_type || '',
      '项目名称': r.project_name || '',
      '数量': r.quantity || '',
      '试管数': r.tube_count || 0,
      '负责人': r.owner || '',
      '数据路径': r.data_path || '',
      '备注': r.note || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '盒子管理');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', 'attachment; filename=boxes.xlsx');
    res.send(buf);
  } catch (err) {
    console.error('Export boxes error:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

router.get('/upper-items', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ui.*, r.name as fridge_name
       FROM upper_items ui
       JOIN refrigerators r ON r.id = ui.refrigerator_id
       WHERE ui.deleted_at IS NULL AND r.deleted_at IS NULL
       ORDER BY r.name, ui.row_number, ui.sort_order`
    );
    const data = rows.map((r) => ({
      '冰箱': r.fridge_name,
      '行号': r.row_number,
      '名称': r.name,
      '类型': r.item_type || '',
      '数量': r.quantity || 0,
      '负责人': r.owner || '',
      '备注': r.note || '',
      '创建时间': r.created_at,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '上层物品');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', 'attachment; filename=upper-items.xlsx');
    res.send(buf);
  } catch (err) {
    console.error('Export upper-items error:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

export default router;
