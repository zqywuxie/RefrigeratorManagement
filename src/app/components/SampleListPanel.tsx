import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Square, Edit3, X, User, Calendar, FlaskConical } from 'lucide-react';
import { Tube, formatChineseShortDate } from '../types';

interface SampleListPanelProps {
  tubes: Tube[];
  onTubeHover: (sampleId: string | null) => void;
  onBatchEdit: (sampleIds: string[]) => void;
  onSelectSample: (sampleId: string) => void;
}

export function SampleListPanel({ tubes, onTubeHover, onBatchEdit, onSelectSample }: SampleListPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Group tubes by sample_id
  const sampleGroups = useMemo(() => {
    const map = new Map<string, { sampleId: string; patientName: string; sampleCode: string; groupColor: string; tubes: Tube[] }>();
    for (const t of tubes) {
      if (!map.has(t.sample_id)) {
        map.set(t.sample_id, {
          sampleId: t.sample_id,
          patientName: t.patient_name || '—',
          sampleCode: t.sample_code || '—',
          groupColor: t.group_color || '#94a3b8',
          tubes: [],
        });
      }
      map.get(t.sample_id)!.tubes.push(t);
    }
    return Array.from(map.values());
  }, [tubes]);

  const toggleSelect = (sampleId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sampleId)) next.delete(sampleId);
      else next.add(sampleId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === sampleGroups.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sampleGroups.map((g) => g.sampleId)));
    }
  };

  if (tubes.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{
        background: 'var(--app-card-bg)',
        border: '1px solid var(--app-border)',
        boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={15} color="var(--app-muted)" />
          <span className="text-[14px]" style={{ color: 'var(--app-text)' }}>
            已录入样本
          </span>
          <span className="text-[12px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--app-input-bg)', color: 'var(--app-muted)' }}>
            {sampleGroups.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => {
                onBatchEdit(Array.from(selectedIds));
                setSelectedIds(new Set());
              }}
              className="flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-lg"
              style={{ background: '#2563eb', color: '#fff' }}
            >
              <Edit3 size={12} />
              批量编辑 ({selectedIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={toggleAll}
            className="text-[12px] px-2 py-1 rounded flex items-center gap-1"
            style={{ color: 'var(--app-muted)' }}
          >
            {selectedIds.size === sampleGroups.length && sampleGroups.length > 0 ? <CheckSquare size={13} /> : <Square size={13} />}
            全选
          </button>
        </div>
      </div>

      <div className="space-y-1 max-h-60 overflow-y-auto">
        {sampleGroups.map((group) => (
          <div
            key={group.sampleId}
            onMouseEnter={() => onTubeHover(group.sampleId)}
            onMouseLeave={() => onTubeHover(null)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all hover:brightness-95"
            style={{
              background: selectedIds.has(group.sampleId) ? `${group.groupColor}20` : 'var(--app-input-bg)',
              border: `1px solid ${selectedIds.has(group.sampleId) ? group.groupColor : 'transparent'}`,
            }}
            onClick={() => onSelectSample(group.sampleId)}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleSelect(group.sampleId); }}
              style={{ color: group.groupColor }}
            >
              {selectedIds.has(group.sampleId) ? <CheckSquare size={15} /> : <Square size={15} />}
            </button>
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: group.groupColor }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium truncate" style={{ color: 'var(--app-text)' }}>
                  {group.patientName}
                </span>
                <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--app-muted)' }}>
                  {group.sampleCode}
                </span>
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--app-muted)' }}>
                {group.tubes.map((t) => t.tube_label).join(', ')}
                {group.tubes.length > 1 && ` · ${group.tubes.length} 管`}
              </div>
            </div>
            <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--app-muted)' }}>
              {group.tubes.length > 0 ? `${group.tubes.length} 位` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
