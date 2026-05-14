import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { UpperItem, ItemType, ITEM_TYPE_CONFIG } from '../types';

interface AddItemModalProps {
  isOpen: boolean;
  editItem?: UpperItem | null;
  defaultRow: number;
  onClose: () => void;
  onSave: (data: Partial<UpperItem>) => void;
}

export function AddItemModal({ isOpen, editItem, defaultRow, onClose, onSave }: AddItemModalProps) {
  const [name, setName] = useState(editItem?.name || '');
  const [itemType, setItemType] = useState<ItemType>(editItem?.item_type || '样本');
  const [quantity, setQuantity] = useState(editItem?.quantity || 1);
  const [owner, setOwner] = useState(editItem?.owner || '');
  const [note, setNote] = useState(editItem?.note || '');
  const [rowNumber, setRowNumber] = useState(editItem?.row_number || defaultRow);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: editItem?.id, name: name.trim(), item_type: itemType, quantity, owner: owner || null, note: note || null, row_number: rowNumber, tags: editItem?.tags || [] });
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
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as ItemType)}
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              >
                {Object.entries(ITEM_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <select
                value={rowNumber}
                onChange={(e) => setRowNumber(Number(e.target.value))}
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              >
                <option value={1}>第 1 行</option>
                <option value={2}>第 2 行</option>
              </select>
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
