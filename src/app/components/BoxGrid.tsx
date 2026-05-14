import React from 'react';
import { ArrowLeft, Grid3X3 } from 'lucide-react';
import { Box, BoxCell, STATUS_CONFIG } from '../types';
import { CellSlot } from './CellSlot';

interface BoxGridProps {
  box: Box;
  cells: BoxCell[];
  matchedCellIds: Set<string>;
  onBack: () => void;
  onCellClick: (position: number) => void;
}

export function BoxGrid({ box, cells, matchedCellIds, onBack, onCellClick }: BoxGridProps) {
  const rows = box.grid_rows || 10;
  const cols = box.grid_cols || 10;
  const capacity = rows * cols;
  const filledCount = cells.length;

  const getCellAt = (pos: number) => cells.find((c) => c.position === pos);

  const statusCounts = cells.reduce((acc, c) => {
    acc[c.sample_status] = (acc[c.sample_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[14px] hover:opacity-80"
          style={{ color: '#60a5fa' }}
        >
          <ArrowLeft size={18} />
          返回盒子列表
        </button>
        <span className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
          {box.name}
        </span>
        <div className="flex items-center gap-1">
          <Grid3X3 size={14} color="var(--app-muted)" />
          <span className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
            {rows}×{cols}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {Object.keys(STATUS_CONFIG).map((status) => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          return (
            <span
              key={status}
              className="text-[12px] px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: config.bgColor, color: config.color, border: `1px solid ${config.borderColor}60` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.borderColor }} />
              {config.label} ×{count}
            </span>
          );
        })}
        <span className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
          {filledCount}/{capacity} 占用
        </span>
      </div>

      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--app-card-bg)',
          border: '1px solid var(--app-border)',
          boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
        }}
      >
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, auto)`,
          }}
        >
          {Array.from({ length: capacity }, (_, i) => {
            const cell = getCellAt(i);
            return (
              <CellSlot
                key={`cell-${i}`}
                cell={cell}
                position={i}
                cols={cols}
                isHighlighted={cell ? matchedCellIds.has(cell.id) : false}
                onClick={() => onCellClick(i)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
