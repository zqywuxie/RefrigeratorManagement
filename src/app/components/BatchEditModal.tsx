import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Edit3 } from 'lucide-react';

interface BatchEditModalProps {
  isOpen: boolean;
  count: number;
  onClose: () => void;
  onApply: (updates: {
    source?: string;
    sample_type?: string;
    collection_stage?: string;
    collected_at?: string;
  }) => void;
}

export function BatchEditModal({ isOpen, count, onClose, onApply }: BatchEditModalProps) {
  const [source, setSource] = useState('');
  const [sampleType, setSampleType] = useState('');
  const [collectionStage, setCollectionStage] = useState('');
  const [collectedAt, setCollectedAt] = useState('');

  const fieldStyle: React.CSSProperties = {
    background: 'var(--app-input-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-text)',
  };

  const handleApply = () => {
    const updates: any = {};
    if (source.trim()) updates.source = source.trim();
    if (sampleType.trim()) updates.sample_type = sampleType.trim();
    if (collectionStage.trim()) updates.collection_stage = collectionStage.trim();
    if (collectedAt) updates.collected_at = collectedAt;
    if (Object.keys(updates).length === 0) return;
    onApply(updates);
    setSource('');
    setSampleType('');
    setCollectionStage('');
    setCollectedAt('');
  };

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
            className="relative z-10 w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{
              background: 'var(--app-header-bg)',
              border: '1px solid var(--app-border)',
              boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[18px]" style={{ color: 'var(--app-text)' }}>
                  批量编辑
                </h3>
                <p className="text-[12px] mt-1" style={{ color: 'var(--app-muted)' }}>
                  将修改 {count} 个样本的字段（留空 = 保持不变）
                </p>
              </div>
              <button type="button" onClick={onClose}>
                <X size={18} color="var(--app-muted)" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>样本来源</label>
                <input value={source} onChange={(e) => setSource(e.target.value)}
                  placeholder="如: 门诊" className="w-full px-3 py-2 rounded-lg text-[14px] outline-none" style={fieldStyle} />
              </div>
              <div>
                <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>样本类型</label>
                <input value={sampleType} onChange={(e) => setSampleType(e.target.value)}
                  placeholder="如: 外周血" className="w-full px-3 py-2 rounded-lg text-[14px] outline-none" style={fieldStyle} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>采集阶段</label>
                <input value={collectionStage} onChange={(e) => setCollectionStage(e.target.value)}
                  placeholder="如: 中孕期" className="w-full px-3 py-2 rounded-lg text-[14px] outline-none" style={fieldStyle} />
              </div>
              <div>
                <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>采集时间</label>
                <input type="date" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[14px] outline-none" style={fieldStyle} />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg text-[14px]"
                style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)', border: '1px solid var(--app-border)' }}>
                取消
              </button>
              <button type="button" onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px]"
                style={{ background: '#2563eb', color: '#fff' }}>
                <Edit3 size={14} />应用到 {count} 个样本
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
