import React, { useState } from 'react';
import { Edit3 } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from './ui/responsive-dialog';

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
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ResponsiveDialogContent className="max-w-sm">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>批量编辑</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            将修改 {count} 个样本的字段（留空 = 保持不变）
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>样本来源</label>
            <input value={source} onChange={(e) => setSource(e.target.value)}
              placeholder="如: 门诊" className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]" style={fieldStyle} />
          </div>
          <div>
            <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>样本类型</label>
            <input value={sampleType} onChange={(e) => setSampleType(e.target.value)}
              placeholder="如: 外周血" className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]" style={fieldStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>采集阶段</label>
            <input value={collectionStage} onChange={(e) => setCollectionStage(e.target.value)}
              placeholder="如: 中孕期" className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]" style={fieldStyle} />
          </div>
          <div>
            <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>采集时间</label>
            <input type="date" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]" style={fieldStyle} />
          </div>
        </div>

        <ResponsiveDialogFooter>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-[14px] min-h-[44px]"
            style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)', border: '1px solid var(--app-border)' }}>
            取消
          </button>
          <button type="button" onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] min-h-[44px]"
            style={{ background: '#2563eb', color: '#fff' }}>
            <Edit3 size={14} />应用到 {count} 个样本
          </button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
