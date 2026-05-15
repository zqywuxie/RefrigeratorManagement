import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Upload, FileSpreadsheet, ArrowRight, Check, ChevronDown } from 'lucide-react';
import { parseExcel, assignImportedSamples, ParsedExcel, ImportAssignment } from '../api';

interface ExcelImportModalProps {
  isOpen: boolean;
  boxId: string;
  boxName: string;
  gridCols: number;
  capacity: number;
  occupiedPositions: Set<number>;
  currentUser: string;
  onClose: () => void;
  onImported: () => void;
}

const SYSTEM_FIELDS: { key: string; label: string }[] = [
  { key: 'patient_name', label: '姓名 (必填)' },
  { key: 'sample_code', label: '编号 (必填)' },
  { key: 'source', label: '样本来源' },
  { key: 'sample_type', label: '样本类型' },
  { key: 'collection_stage', label: '采集阶段' },
  { key: 'collected_at', label: '采集时间' },
  { key: 'note', label: '备注' },
  { key: 'tags', label: '标签' },
  { key: '', label: '— 忽略 —' },
];

export function ExcelImportModal({
  isOpen,
  boxId,
  boxName,
  gridCols,
  capacity,
  occupiedPositions,
  currentUser,
  onClose,
  onImported,
}: ExcelImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [parsed, setParsed] = useState<ParsedExcel | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    try {
      const result = await parseExcel(file);
      setParsed(result);
      // Auto-map fields
      const mapping: Record<string, string> = {};
      for (const header of result.headers) {
        mapping[header] = result.fieldSuggestions[header] || '';
      }
      setFieldMapping(mapping);
      setStep('mapping');
    } catch (err: any) {
      setError(err.message || '解析失败');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!parsed) return;
    setStep('importing');

    // Find empty positions to auto-assign
    const emptyPositions: number[] = [];
    for (let pos = 0; pos < capacity; pos++) {
      if (!occupiedPositions.has(pos)) emptyPositions.push(pos);
    }

    const samples: ImportAssignment[] = [];
    for (const row of parsed.rows) {
      const patientName = row[findMappedHeader('patient_name')]?.toString().trim();
      const sampleCode = row[findMappedHeader('sample_code')]?.toString().trim();
      if (!patientName || !sampleCode) continue;

      const source = row[findMappedHeader('source')]?.toString().trim() || undefined;
      const sampleType = row[findMappedHeader('sample_type')]?.toString().trim() || undefined;
      const collectionStage = row[findMappedHeader('collection_stage')]?.toString().trim() || undefined;
      const collectedAt = row[findMappedHeader('collected_at')]?.toString().trim() || undefined;
      const note = row[findMappedHeader('note')]?.toString().trim() || undefined;
      const tagsStr = row[findMappedHeader('tags')]?.toString().trim() || '';
      const tags = tagsStr ? tagsStr.split(/[,，;；\s]+/).filter(Boolean) : [];

      // Auto-assign one empty position per sample
      const position = emptyPositions.shift();

      samples.push({
        patient_name: patientName,
        sample_code: sampleCode,
        source,
        sample_type: sampleType,
        collection_stage: collectionStage,
        collected_at: collectedAt,
        tags,
        note,
        uploader: currentUser,
        positions: position != null ? [position] : [],
      });
    }

    if (samples.length === 0) {
      setError('没有可导入的样本（需要至少填写姓名和编号）');
      setStep('mapping');
      return;
    }

    try {
      await assignImportedSamples(boxId, samples);
      onImported();
      onClose();
      setStep('upload');
      setParsed(null);
      setFieldMapping({});
    } catch (err: any) {
      setError(err.message || '导入失败');
      setStep('preview');
    }
  }, [parsed, fieldMapping, boxId, currentUser, onImported, onClose]);

  const findMappedHeader = (field: string): string => {
    for (const [header, mapped] of Object.entries(fieldMapping)) {
      if (mapped === field) return header;
    }
    return '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      handleFile(file);
    } else {
      setError('请上传 .xlsx / .xls / .csv 文件');
    }
  };

  const fieldStyle: React.CSSProperties = {
    background: 'var(--app-input-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-text)',
  };

  const patientNameMapped = findMappedHeader('patient_name');
  const sampleCodeMapped = findMappedHeader('sample_code');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4"
            style={{
              background: 'var(--app-header-bg)',
              border: '1px solid var(--app-border)',
              boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[18px]" style={{ color: 'var(--app-text)' }}>
                  Excel 导入样本
                </h3>
                <p className="text-[12px] mt-1" style={{ color: 'var(--app-muted)' }}>
                  目标盒子: {boxName}
                  {step !== 'upload' && parsed && ` · ${parsed.total} 行数据`}
                </p>
              </div>
              <button type="button" onClick={onClose}>
                <X size={18} color="var(--app-muted)" />
              </button>
            </div>

            {error && (
              <div className="rounded-lg px-3 py-2 text-[13px]" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                {error}
              </div>
            )}

            {step === 'upload' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center gap-4 rounded-xl py-12 cursor-pointer transition-all"
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragOver ? '#3b82f6' : 'var(--app-border)'}`,
                  background: isDragOver ? 'rgba(37,99,235,0.06)' : 'var(--app-card-bg)',
                }}
              >
                <FileSpreadsheet size={48} color={isDragOver ? '#2563eb' : 'var(--app-muted)'} />
                <div className="text-center">
                  <p className="text-[16px]" style={{ color: 'var(--app-text)' }}>
                    拖放 Excel 文件到此处
                  </p>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--app-muted)' }}>
                    支持 .xlsx / .xls / .csv 格式
                  </p>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[14px]"
                  style={{ background: '#2563eb', color: '#fff' }}
                >
                  <Upload size={16} />
                  选择文件
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>
            )}

            {step === 'mapping' && parsed && (
              <div className="space-y-3">
                <p className="text-[13px]" style={{ color: 'var(--app-muted)' }}>
                  为每个系统字段选择对应的 Excel 列（已自动匹配）：
                </p>
                <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--app-border)' }}>
                  {/* Header */}
                  <div className="grid grid-cols-3 gap-3 px-4 py-2 text-[12px]" style={{ color: 'var(--app-muted)' }}>
                    <span>系统字段</span>
                    <span>对应 Excel 列</span>
                    <span>预览（首行）</span>
                  </div>
                  {/* Mapping rows: one per system field */}
                  {SYSTEM_FIELDS.filter((f) => f.key !== '').map((sysField) => {
                    // Find which Excel header maps to this system field
                    const mappedHeader = Object.entries(fieldMapping).find(([, v]) => v === sysField.key)?.[0] || '';
                    return (
                      <div key={sysField.key} className="grid grid-cols-3 gap-3 px-4 py-2 items-center">
                        <span className="text-[13px] font-medium truncate" style={{ color: 'var(--app-text)' }}>
                          {sysField.label.replace(' (必填)', '')}
                          {sysField.key === 'patient_name' || sysField.key === 'sample_code' ? (
                            <span style={{ color: '#ef4444' }}> *</span>
                          ) : null}
                        </span>
                        <select
                          value={mappedHeader}
                          onChange={(e) => {
                            const newHeader = e.target.value;
                            setFieldMapping((prev) => {
                              const next = { ...prev };
                              // Remove this system field from any previous header
                              for (const h of Object.keys(next)) {
                                if (next[h] === sysField.key) next[h] = '';
                              }
                              // Set new mapping
                              if (newHeader) next[newHeader] = sysField.key;
                              return next;
                            });
                          }}
                          className="px-2 py-1.5 rounded-lg text-[13px] outline-none"
                          style={fieldStyle}
                        >
                          <option value="">— 不映射 —</option>
                          {parsed.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="text-[12px] truncate" style={{ color: 'var(--app-muted)' }}>
                          {mappedHeader ? String(parsed.rows[0]?.[mappedHeader] ?? '') : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {(!patientNameMapped || !sampleCodeMapped) && (
                  <div className="rounded-lg px-3 py-2 text-[13px]" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                    请至少映射"姓名"和"编号"字段
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="px-4 py-2 rounded-lg text-[14px]"
                    style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)', border: '1px solid var(--app-border)' }}
                  >
                    返回
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('preview')}
                    disabled={!patientNameMapped || !sampleCodeMapped}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px]"
                    style={{
                      background: patientNameMapped && sampleCodeMapped ? '#2563eb' : '#94a3b8',
                      color: '#fff',
                    }}
                  >
                    预览 <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 'preview' && parsed && (
              <div className="space-y-3">
                <p className="text-[13px]" style={{ color: 'var(--app-muted)' }}>
                  预览前 5 行数据，确认无误后点击导入：
                </p>
                <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--app-border)' }}>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr style={{ background: 'var(--app-input-bg)' }}>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--app-muted)' }}>#</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--app-muted)' }}>姓名</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--app-muted)' }}>编号</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--app-muted)' }}>来源</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--app-muted)' }}>类型</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--app-muted)' }}>阶段</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--app-border)' }}>
                          <td className="px-3 py-2" style={{ color: 'var(--app-muted)' }}>{i + 1}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--app-text)' }}>{row[patientNameMapped] || '-'}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--app-text)' }}>{row[sampleCodeMapped] || '-'}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--app-muted)' }}>{row[findMappedHeader('source')] || '-'}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--app-muted)' }}>{row[findMappedHeader('sample_type')] || '-'}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--app-muted)' }}>{row[findMappedHeader('collection_stage')] || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {parsed.total > 5 && (
                  <p className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                    ... 另有 {parsed.total - 5} 行
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('mapping')}
                    className="px-4 py-2 rounded-lg text-[14px]"
                    style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)', border: '1px solid var(--app-border)' }}
                  >
                    返回修改映射
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px]"
                    style={{ background: '#22c55e', color: '#fff' }}
                  >
                    <Check size={14} />
                    导入 {parsed.rows.filter((r) => {
                      const n = r[patientNameMapped]?.toString().trim();
                      const c = r[sampleCodeMapped]?.toString().trim();
                      return n && c;
                    }).length} 条样本
                  </button>
                </div>
              </div>
            )}

            {step === 'importing' && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} />
                <p className="text-[14px]" style={{ color: 'var(--app-muted)' }}>导入中...</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
