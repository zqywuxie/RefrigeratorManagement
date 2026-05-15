import React from 'react';
import { motion } from 'motion/react';
import { useDrag } from 'react-dnd';
import { FlaskConical, GripVertical, User } from 'lucide-react';
import { SampleRecord } from '../types';

interface DraggableSampleProps {
  sample: SampleRecord;
  onClick: () => void;
}

function DraggableSample({ sample, onClick }: DraggableSampleProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'PENDING_SAMPLE',
    item: { sample_id: sample.id, patient_name: sample.patient_name, sample_code: sample.sample_code, group_color: sample.group_color },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <motion.div
      ref={drag}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing"
      style={{
        background: sample.group_color + '18',
        border: `1px solid ${sample.group_color}40`,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <GripVertical size={14} style={{ color: sample.group_color }} />
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: sample.group_color }}
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
  samples: SampleRecord[];
  onSelectSample: (sampleId: string) => void;
  onClear: () => void;
}

export function PendingSamplesPanel({ samples, onSelectSample, onClear }: PendingSamplesPanelProps) {
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
            {samples.length}
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
      <p className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
        拖拽样本到左侧孔位进行分配
      </p>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {samples.map((s) => (
          <DraggableSample
            key={s.id}
            sample={s}
            onClick={() => onSelectSample(s.id)}
          />
        ))}
      </div>
    </div>
  );
}
