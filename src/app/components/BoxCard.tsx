import React from 'react';
import { motion } from 'motion/react';
import { Box as BoxIcon, User, Calendar, Grid3X3 } from 'lucide-react';
import { Box, formatChineseShortDate } from '../types';

interface BoxCardProps {
  box: Box;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export function BoxCard({ box, onClick, onDelete }: BoxCardProps) {
  const isPrecise = box.mode === 'precise';
  const gridLabel = isPrecise && box.grid_rows && box.grid_cols
    ? `${box.grid_rows}×${box.grid_cols}`
    : null;

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative w-full rounded-xl px-4 py-3.5 text-left cursor-pointer"
      style={{
        background: 'var(--app-card-bg)',
        border: '1.5px solid var(--app-border)',
        boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <BoxIcon size={18} color={isPrecise ? '#2563eb' : '#94a3b8'} />
            <span className="text-[15px] font-medium truncate" style={{ color: 'var(--app-text)' }}>
              {box.name}
            </span>
            {isPrecise && gridLabel && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded"
                style={{ background: '#dbeafe', color: '#1d4ed8' }}
              >
                <Grid3X3 size={11} className="inline mr-0.5" />
                {gridLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[12px]" style={{ color: 'var(--app-muted)' }}>
            {box.sample_type && <span>{box.sample_type}</span>}
            {box.project_name && <span>{box.project_name}</span>}
            <span>×{box.quantity}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: 'var(--app-muted)' }}>
            {box.owner && (
              <span className="flex items-center gap-1">
                <User size={11} />{box.owner}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={11} />{formatChineseShortDate(box.created_at)}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(box.id); }}
          className="flex-shrink-0 px-2 py-1 rounded text-[11px] hover:bg-red-500/10"
          style={{ color: '#f87171' }}
        >
          删除
        </button>
      </div>

      {box.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {box.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--app-subtle-bg)',
                color: 'var(--app-subtle-text)',
                border: '1px solid var(--app-subtle-border)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {box.note && (
        <p className="mt-1.5 text-[12px] truncate" style={{ color: 'var(--app-muted)' }}>
          {box.note}
        </p>
      )}
    </motion.button>
  );
}
