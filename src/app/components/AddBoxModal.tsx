import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Box, BoxMode, BOX_GRID_PRESETS } from '../types';

interface AddBoxModalProps {
  isOpen: boolean;
  editBox?: Box | null;
  onClose: () => void;
  onSave: (data: Partial<Box>) => void;
}

export function AddBoxModal({ isOpen, editBox, onClose, onSave }: AddBoxModalProps) {
  const [name, setName] = useState(editBox?.name || '');
  const [mode, setMode] = useState<BoxMode>(editBox?.mode || 'simple');
  const [gridPreset, setGridPreset] = useState(0);
  const [customRows, setCustomRows] = useState(editBox?.grid_rows || 10);
  const [customCols, setCustomCols] = useState(editBox?.grid_cols || 10);
  const [sampleType, setSampleType] = useState(editBox?.sample_type || '');
  const [projectName, setProjectName] = useState(editBox?.project_name || '');
  const [quantity, setQuantity] = useState(editBox?.quantity || 0);
  const [owner, setOwner] = useState(editBox?.owner || '');
  const [note, setNote] = useState(editBox?.note || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const isPrecise = mode === 'precise';
    const preset = BOX_GRID_PRESETS[gridPreset];
    const finalRows = isPrecise ? (preset.rows || customRows) : null;
    const finalCols = isPrecise ? (preset.cols || customCols) : null;
    onSave({
      id: editBox?.id,
      name: name.trim(),
      mode,
      grid_rows: finalRows,
      grid_cols: finalCols,
      sample_type: sampleType || null,
      project_name: projectName || null,
      quantity,
      owner: owner || null,
      note: note || null,
      tags: editBox?.tags || [],
    });
    onClose();
  };

  const fieldStyle: React.CSSProperties = {
    background: 'var(--app-input-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-text)',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.form
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{
              background: 'var(--app-header-bg)',
              border: '1px solid var(--app-border)',
              boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[18px]" style={{ color: 'var(--app-text)' }}>
                {editBox ? '编辑盒子' : '添加盒子'}
              </h3>
              <button type="button" onClick={onClose}>
                <X size={18} color="var(--app-muted)" />
              </button>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="盒子名称"
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
              style={fieldStyle}
            />

            <div className="flex gap-2">
              {(['simple', 'precise'] as BoxMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="flex-1 py-2 rounded-lg text-[14px] transition-all"
                  style={{
                    background: mode === m ? '#2563eb' : 'var(--app-panel-bg)',
                    color: mode === m ? '#fff' : 'var(--app-muted)',
                    border: mode === m ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                  }}
                >
                  {m === 'precise' ? '精细样本' : '简略模式'}
                </button>
              ))}
            </div>

            {mode === 'precise' && (
              <div className="flex gap-2 flex-wrap">
                {BOX_GRID_PRESETS.map((preset, i) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setGridPreset(i)}
                    className="text-[12px] px-3 py-1 rounded-lg transition-all"
                    style={{
                      background: gridPreset === i ? '#dbeafe' : 'var(--app-panel-bg)',
                      color: gridPreset === i ? '#1d4ed8' : 'var(--app-muted)',
                      border: gridPreset === i ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            {mode === 'precise' && BOX_GRID_PRESETS[gridPreset].label === '自定义' && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={customRows}
                  onChange={(e) => setCustomRows(Number(e.target.value))}
                  placeholder="行数"
                  className="px-3 py-2 rounded-lg text-[14px] outline-none"
                  style={fieldStyle}
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={customCols}
                  onChange={(e) => setCustomCols(Number(e.target.value))}
                  placeholder="列数"
                  className="px-3 py-2 rounded-lg text-[14px] outline-none"
                  style={fieldStyle}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <input
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
                placeholder="样本类型"
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              />
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="项目名称"
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="数量"
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              />
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="负责人"
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              />
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="备注（选填）"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none resize-none"
              style={fieldStyle}
            />

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-[14px]"
                style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)', border: '1px solid var(--app-border)' }}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-[14px]"
                style={{ background: '#2563eb', color: '#fff' }}
              >
                保存
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
