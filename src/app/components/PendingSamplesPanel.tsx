import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useDrag } from 'react-dnd';
import { FlaskConical, GripVertical, Search } from 'lucide-react';
import { PendingImportSample } from '../types';

interface DraggableSampleProps {
  sample: PendingImportSample;
}

function DraggableSample({ sample }: DraggableSampleProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'PENDING_SAMPLE',
    item: () => ({ ...sample }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <motion.div
      ref={drag}
      whileHover={{ scale: 1.02 }}
      className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing"
      style={{
        background: sample._groupColor + '18',
        border: `1px solid ${sample._groupColor}40`,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <GripVertical size={14} style={{ color: sample._groupColor }} />
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: sample._groupColor }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--app-text)' }}>
          {sample.patient_name}
        </div>
        <div className="text-[11px] truncate" style={{ color: 'var(--app-muted)' }}>
          {sample.sample_code}
        </div>
      </div>
    </motion.div>
  );
}

interface PendingSamplesPanelProps {
  samples: PendingImportSample[];
  onClear: () => void;
}

export function PendingSamplesPanel({ samples, onClear }: PendingSamplesPanelProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return samples;
    const q = query.toLowerCase();
    return samples.filter((s) =>
      s.patient_name.toLowerCase().includes(q) ||
      s.sample_code.toLowerCase().includes(q) ||
      (s.sample_type || '').toLowerCase().includes(q) ||
      (s.source || '').toLowerCase().includes(q) ||
      (s.collection_stage || '').toLowerCase().includes(q)
    );
  }, [samples, query]);

  if (samples.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{
        background: 'var(--app-card-bg)',
        border: '1px solid #22d3ee40',
        boxShadow: '0 12px 34px rgba(6,182,212,0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={14} color="#06b6d4" />
          <span className="text-[14px] font-medium" style={{ color: 'var(--app-text)' }}>
            待分配样本
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: '#ecfeff', color: '#0891b2' }}>
            {filtered.length}{query ? `/${samples.length}` : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] px-2 py-1 rounded hover:opacity-80"
          style={{ color: 'var(--app-muted)' }}
        >
          清除列表
        </button>
      </div>

      <div
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
        style={{
          background: 'var(--app-input-bg)',
          border: '1px solid var(--app-input-border)',
        }}
      >
        <Search size={12} color="var(--app-muted)" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索姓名、编号、类型..."
          className="flex-1 bg-transparent outline-none text-[11px]"
          style={{ color: 'var(--app-text)' }}
        />
      </div>

      <p className="text-[10px]" style={{ color: 'var(--app-muted)' }}>
        拖拽到左侧孔位分配（仅放入孔位时才入库）
      </p>
      <div className="space-y-1 max-h-56 overflow-y-auto">
        {filtered.map((s) => (
          <DraggableSample key={s._importId} sample={s} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-3 text-[11px]" style={{ color: 'var(--app-muted)' }}>
            无匹配结果
          </div>
        )}
      </div>
    </div>
  );
}
