import React from 'react';
import { motion } from 'motion/react';
import { useDrag } from 'react-dnd';
import { Box as BoxIcon, User, Calendar, Grid3X3, FolderOpen, Copy, Trash2, MapPinned } from 'lucide-react';
import { Box, boxPositionToLabel, formatChineseShortDate } from '../types';

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
  const tags = Array.isArray(box.tags) ? box.tags : [];
  const [{ isDragging }, drag] = useDrag({
    type: 'BOX',
    item: { id: box.id, position: box.position },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <motion.div
      ref={drag}
      role="button"
      tabIndex={0}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="relative w-full rounded-xl px-5 py-4 cursor-pointer"
      style={{
        background: 'var(--app-card-bg)',
        border: '1.5px solid var(--app-border)',
        boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      {/* Top row: name + badges + actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: isPrecise ? '#dbeafe' : '#f1f5f9',
              color: isPrecise ? '#2563eb' : '#94a3b8',
            }}
          >
            <BoxIcon size={16} />
          </div>
          <span className="text-[16px] font-medium truncate" style={{ color: 'var(--app-text)' }}>
            {box.name}
          </span>
          {isPrecise && gridLabel && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0"
              style={{ background: '#dbeafe', color: '#1d4ed8' }}
            >
              <Grid3X3 size={10} />
              {gridLabel}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(box.id); }}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
          style={{ color: '#f87171' }}
          title="删除盒子"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
        {box.sample_type && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] flex-shrink-0" style={{ color: '#94a3b8' }}>类型</span>
            <span className="text-[13px] truncate" style={{ color: 'var(--app-text)' }}>{box.sample_type}</span>
          </div>
        )}
        {box.project_name && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] flex-shrink-0" style={{ color: '#94a3b8' }}>项目</span>
            <span className="text-[13px] truncate" style={{ color: 'var(--app-text)' }}>{box.project_name}</span>
          </div>
        )}
        {box.owner && (
          <div className="flex items-center gap-1.5">
            <User size={11} style={{ color: '#94a3b8' }} />
            <span className="text-[13px] truncate" style={{ color: 'var(--app-text)' }}>{box.owner}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar size={11} style={{ color: '#94a3b8' }} />
          <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>{formatChineseShortDate(box.created_at)}</span>
        </div>
        {box.position != null && (
          <div className="flex items-center gap-1.5">
            <MapPinned size={11} style={{ color: '#94a3b8' }} />
            <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>{boxPositionToLabel(box.position)}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded"
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

      {/* Note */}
      {box.note && (
        <p className="mt-2 text-[12px] opacity-70 truncate" style={{ color: 'var(--app-muted)' }}>
          {box.note}
        </p>
      )}

      {/* Data path */}
      {box.data_path && (
        <div
          className="flex items-center gap-1.5 mt-2 text-[11px] rounded-md px-2.5 py-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            background: 'var(--app-input-bg)',
            border: '1px solid var(--app-input-border)',
            color: 'var(--app-muted)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(box.data_path!);
          }}
          title="点击复制路径"
        >
          <FolderOpen size={11} color="#60a5fa" />
          <span className="truncate flex-1">{box.data_path}</span>
          <Copy size={10} />
        </div>
      )}
    </motion.div>
  );
}
