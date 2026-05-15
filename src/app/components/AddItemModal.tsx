import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { UpperItem, ItemType, BoxMode, BOX_GRID_PRESETS } from '../types';

interface AddItemModalProps {
  isOpen: boolean;
  editItem?: UpperItem | null;
  defaultRow: number;
  maxRows?: number;
  currentUsername: string;
  itemTypes: string[];
  onAddItemType: (name: string) => void;
  onClose: () => void;
  onSave: (data: Partial<UpperItem>) => void;
}

export function AddItemModal({
  isOpen,
  editItem,
  defaultRow,
  currentUsername,
  itemTypes,
  onAddItemType,
  onClose,
  onSave,
}: AddItemModalProps) {
  const [name, setName] = useState('');
  const [itemType, setItemType] = useState<ItemType>('样本');
  const [quantity, setQuantity] = useState(1);
  const [owner, setOwner] = useState('');
  const [note, setNote] = useState('');
  const [rowNumber, setRowNumber] = useState(defaultRow);
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [boxMode, setBoxMode] = useState<BoxMode>('simple');
  const [gridPreset, setGridPreset] = useState(0);
  const [customRows, setCustomRows] = useState(10);
  const [customCols, setCustomCols] = useState(10);

  useEffect(() => {
    if (!isOpen) return;
    setName(editItem?.name || '');
    setItemType(editItem?.item_type || itemTypes[0] || '样本');
    setQuantity(editItem?.quantity || 1);
    setOwner(editItem?.owner || currentUsername);
    setNote(editItem?.note || '');
    setRowNumber(editItem?.row_number || defaultRow);
    setShowNewType(false);
    setNewTypeName('');
    setBoxMode(editItem?.box_mode || 'simple');
    setGridPreset(0);
    setCustomRows(editItem?.grid_rows || 10);
    setCustomCols(editItem?.grid_cols || 10);
  }, [isOpen, editItem, defaultRow, currentUsername, itemTypes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const isBox = boxMode === 'precise';
    const preset = BOX_GRID_PRESETS[gridPreset];
    const finalRows = isBox ? (preset.rows || customRows) : null;
    const finalCols = isBox ? (preset.cols || customCols) : null;
    onSave({
      id: editItem?.id,
      name: name.trim(),
      item_type: itemType,
      box_mode: boxMode,
      grid_rows: finalRows,
      grid_cols: finalCols,
      quantity,
      owner: owner || null,
      note: note || null,
      row_number: rowNumber,
      tags: editItem?.tags || [],
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
                {editItem ? '编辑物品' : '添加物品'}
              </h3>
              <button type="button" onClick={onClose}>
                <X size={18} color="var(--app-muted)" />
              </button>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="物品名称"
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
              style={fieldStyle}
            />

            <div className="grid grid-cols-2 gap-3">
              {showNewType ? (
                <div className="flex gap-1">
                  <input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="新物品类型"
                    autoFocus
                    className="min-w-0 flex-1 px-3 py-2 rounded-lg text-[14px] outline-none"
                    style={fieldStyle}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextType = newTypeName.trim();
                      if (!nextType) return;
                      onAddItemType(nextType);
                      setItemType(nextType);
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
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value as ItemType)}
                    className="min-w-0 flex-1 px-3 py-2 rounded-lg text-[14px] outline-none"
                    style={fieldStyle}
                  >
                    {itemTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewType(true)}
                    className="px-2 rounded-lg"
                    title="添加物品类型"
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
              <div
                className="px-3 py-2 rounded-lg text-[14px]"
                style={{
                  background: 'var(--app-input-muted-bg)',
                  border: '1px solid var(--app-input-border)',
                  color: 'var(--app-subtle-text)',
                }}
              >
                第 {rowNumber} 行
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={1}
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

            {/* Box mode: option only for sample-type items */}
            <div className="border-t pt-3" style={{ borderColor: 'var(--app-border)' }}>
              <label className="text-[12px] block mb-2" style={{ color: 'var(--app-muted)' }}>
                盒模式（可选）— 启用后可在上层大空间中使用盒子孔位管理
              </label>
              <div className="flex gap-2 mb-2">
                {(['simple', 'precise'] as BoxMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBoxMode(m)}
                    className="flex-1 py-2 rounded-lg text-[13px] transition-all"
                    style={{
                      background: boxMode === m ? '#2563eb' : 'var(--app-panel-bg)',
                      color: boxMode === m ? '#fff' : 'var(--app-muted)',
                      border: boxMode === m ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                    }}
                  >
                    {m === 'precise' ? '孔位模式' : '普通模式'}
                  </button>
                ))}
              </div>
              {boxMode === 'precise' && (
                <div className="flex gap-2 flex-wrap">
                  {BOX_GRID_PRESETS.map((preset, i) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setGridPreset(i)}
                      className="text-[11px] px-3 py-1 rounded-lg transition-all"
                      style={{
                        background: gridPreset === i ? '#dbeafe' : 'var(--app-panel-bg)',
                        color: gridPreset === i ? '#1d4ed8' : 'var(--app-muted)',
                        border: gridPreset === i ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                  {BOX_GRID_PRESETS[gridPreset].label === '自定义' && (
                    <div className="flex gap-2 w-full mt-1">
                      <input type="number" min={1} max={20} value={customRows} onChange={(e) => setCustomRows(Number(e.target.value))}
                        placeholder="行" className="flex-1 px-2 py-1 rounded text-[13px] outline-none" style={fieldStyle} />
                      <input type="number" min={1} max={20} value={customCols} onChange={(e) => setCustomCols(Number(e.target.value))}
                        placeholder="列" className="flex-1 px-2 py-1 rounded text-[13px] outline-none" style={fieldStyle} />
                    </div>
                  )}
                </div>
              )}
            </div>

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
