import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import pool from '../db.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const GROUP_COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#14b8a6','#e11d48','#6366f1'];

// Known field name mappings: Chinese and English variants → system field
const FIELD_PATTERNS = {
  patient_name: ['姓名', '姓名', 'patient_name', 'name', '患者姓名', '病人姓名', 'patient'],
  sample_code: ['编号', '編號', 'sample_code', 'sample_id', 'code', '样本编号', '樣本編號', 'id'],
  source: ['样本来源', '來源', 'source', '样本来源', 'origin', '来源'],
  sample_type: ['样本类型', '類型', 'sample_type', 'type', '样本类型', '标本类型', 'specimen_type'],
  collection_stage: ['采集阶段', '階段', 'collection_stage', 'stage', '采集阶段', '孕期', 'gestation'],
  collected_at: ['采集时间', '日期', 'collected_at', 'date', 'collection_date', '采集日期', '采样日期', '时间'],
  inpatient_no: ['住院号', '住院號', 'inpatient_no', 'admission_no', '病历号', 'hospital_no'],
  age: ['年龄', '年齡', 'age', '年龄'],
  note: ['备注', '備註', 'note', 'remark', '备注', '说明', '說明'],
  tags: ['标签', '標籤', 'tags', 'label', '标签'],
};

function suggestField(header) {
  const h = header.toLowerCase().trim();
  for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      if (h === pattern.toLowerCase() || h.includes(pattern.toLowerCase()) || pattern.toLowerCase().includes(h)) {
        return field;
      }
    }
  }
  return null;
}

// POST /api/import/parse-excel
router.post('/parse-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return res.status(400).json({ error: 'No sheets in workbook' });

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!data || data.length === 0) return res.status(400).json({ error: 'Empty sheet' });

    const headers = Object.keys(data[0]);
    const fieldSuggestions = {};
    for (const header of headers) {
      const suggested = suggestField(header);
      if (suggested) fieldSuggestions[header] = suggested;
    }

    res.json({
      headers,
      rows: data.slice(0, 500), // Limit to 500 rows
      total: data.length,
      fieldSuggestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/import/assign
router.post('/assign', async (req, res) => {
  try {
    const { box_id, samples } = req.body;
    // samples: [{ patient_name, sample_code, source, sample_type, collection_stage, collected_at, tags, note, uploader, positions: number[] }]
    if (!box_id || !Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ error: 'box_id and samples array required' });
    }

    const [[countRow]] = await pool.query('SELECT COUNT(*) as cnt FROM sample_records WHERE deleted_at IS NULL');
    let colorIdx = Number(countRow.cnt);

    const results = [];
    for (const sample of samples) {
      if (!sample.patient_name || !sample.sample_code) continue;

      const sampleId = `sr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const color = GROUP_COLORS[colorIdx % GROUP_COLORS.length];
      colorIdx++;

      await pool.query(
        `INSERT INTO sample_records (id, patient_name, sample_code, source, sample_type, collection_stage, collected_at, tags, note, group_color, uploader)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sampleId, sample.patient_name, sample.sample_code,
          sample.source || null, sample.sample_type || null,
          sample.collection_stage || null, sample.collected_at || null,
          JSON.stringify(sample.tags || []), sample.note || null,
          color, sample.uploader || null,
        ]
      );

      const positions = sample.positions || [];
      const createdTubes = [];
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const tubeId = `tube-${Date.now()}-${colorIdx}-${i}`;
        await pool.query(
          `INSERT INTO tubes (id, sample_id, tube_label, box_id, position, status)
           VALUES (?, ?, ?, ?, ?, 'normal')`,
          [tubeId, sampleId, `Tube${i + 1}`, box_id, pos]
        );
        createdTubes.push({ id: tubeId, position: pos, tube_label: `Tube${i + 1}` });
      }

      results.push({ sample_id: sampleId, tubes: createdTubes });
    }

    res.status(201).json({ assigned: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
