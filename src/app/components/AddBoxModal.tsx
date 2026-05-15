import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { Box, BoxMode, BOX_GRID_PRESETS, boxPositionToLabel } from '../types';

interface AddBoxModalProps {
  isOpen: boolean;
  editBox?: Box | null;
  drawerLabel?: string;
  targetPosition?: number | null;
  sampleTypes: string[];
  onClose: () => void;
  onAddSampleType: (name: string) => void;
  onSave: (data: Partial<Box>) => void;
}

export function AddBoxModal({
  isOpen,
  editBox,
  drawerLabel,
  targetPosition,
  sampleTypes,
  onClose,
  onAddSampleType,
  onSave,
}: AddBoxModalProps) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<BoxMode>('simple');
  const [gridPreset, setGridPreset] = useState(0);
  const [customRows, setCustomRows] = useState(10);
  const [customCols, setCustomCols] = useState(10);
  const [sampleType, setSampleType] = useState('');
  const [projectName, setProjectName] = useState('');
  const [owner, setOwner] = useState('');
  const [note, setNote] = useState('');
  const [dataPath, setDataPath] = useState('');
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(editBox?.name || '');
    setMode(editBox?.mode || 'simple');
    setCustomRows(editBox?.grid_rows || 10);
    setCustomCols(editBox?.grid_cols || 10);
    setSampleType(editBox?.sample_type || sampleTypes[0] || '');
    setProjectName(editBox?.project_name || '');
    setOwner(editBox?.owner || '');
    setNote(editBox?.note || '');
    setDataPath(editBox?.data_path || '');
    setShowNewType(false);
    setNewTypeName('');
    const presetIndex = BOX_GRID_PRESETS.findIndex(
      (preset) => preset.rows === editBox?.grid_rows && preset.cols === editBox?.grid_cols,
    );
    setGridPreset(presetIndex >= 0 ? presetIndex : 0);
  }, [isOpen, editBox, sampleTypes]);

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
      position: targetPosition ?? editBox?.position ?? null,
      sample_type: sampleType || null,
      project_name: projectName || null,
      quantity: 0,
      owner: owner || null,
      note: note || null,
      data_path: dataPath || null,
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
              <div>
                <h3 className="text-[18px]" style={{ color: 'var(--app-text)' }}>
                  {editBox ? '编辑盒子' : '添加盒子'}
                </h3>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--app-muted)' }}>
                  抽屉外部：{drawerLabel || '—'} · 抽屉内部：
                  {targetPosition != null ? boxPositionToLabel(targetPosition) : '—'}
                </p>
              </div>
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
              <div>
                {showNewType ? (
                  <div className="flex gap-1">
                    <input
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="新样本类型"
                      autoFocus
                      className="min-w-0 flex-1 px-3 py-2 rounded-lg text-[14px] outline-none"
                      style={fieldStyle}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nextType = newTypeName.trim();
                        if (!nextType) return;
                        onAddSampleType(nextType);
                        setSampleType(nextType);
                        setNewTypeName('');
                        setShowNewType(false);
                      }}
                      className="px-2 rounded-lg text-[12px]"
                      style={{ background: '#2563eb', color: '#fff' }}
                    >
                      添加
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <select
                      value={sampleType}
                      onChange={(e) => setSampleType(e.target.value)}
                      className="min-w-0 flex-1 px-3 py-2 rounded-lg text-[14px] outline-none"
                      style={fieldStyle}
                    >
                      {sampleTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewType(true)}
                      className="px-2 rounded-lg"
                      title="添加样本类型"
                      style={{
                        background: 'var(--app-panel-bg)',
                        border: '1px solid var(--app-border)',
                        color: '#2563eb',
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                )}
              </div>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="项目名称"
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              />
            </div>

            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="负责人"
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
              style={fieldStyle}
            />

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="备注（选填）"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none resize-none"
              style={fieldStyle}
            />

            <input
              value={dataPath}
              onChange={(e) => setDataPath(e.target.value)}
              placeholder="数据路径（选填，如 /data/project/sample/、s3://bucket/）"
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
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
