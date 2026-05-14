import React from 'react';
import { motion } from 'motion/react';
import { BoxCell, STATUS_CONFIG, cellPositionToLabel } from '../types';

interface CellSlotProps {
  cell?: BoxCell;
  position: number;
  cols: number;
  isHighlighted: boolean;
  onClick: () => void;
}

export function CellSlot({ cell, position, cols, isHighlighted, onClick }: CellSlotProps) {
  const label = cellPositionToLabel(position, cols);
  const config = cell ? STATUS_CONFIG[cell.sample_status] : null;

  return (
    <motion.button
      whileHover={{ scale: cell ? 1.1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative w-full flex flex-col items-center justify-center gap-0.5 cursor-pointer"
      style={{
        aspectRatio: '1 / 1',
        borderRadius: '6px',
        border: isHighlighted
          ? '2px solid #3b82f6'
          : cell
            ? `1.5px solid ${config!.borderColor}60`
            : '1.5px dashed var(--slot-empty-border)',
        background: cell
          ? config!.bgColor
          : 'var(--slot-empty-bg)',
        boxShadow: isHighlighted ? '0 0 8px rgba(59,130,246,0.4)' : 'none',
      }}
      animate={isHighlighted ? { boxShadow: ['0 0 4px rgba(59,130,246,0.2)', '0 0 14px rgba(59,130,246,0.5)', '0 0 4px rgba(59,130,246,0.2)'] } : {}}
      transition={isHighlighted ? { repeat: Infinity, duration: 1.2 } : {}}
    >
      {cell && (
        <>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: config!.borderColor }} />
          <span className="text-[9px] font-mono" style={{ color: config!.color }}>
            {label}
          </span>
        </>
      )}
      {!cell && (
        <span className="text-[9px]" style={{ color: 'var(--app-muted)' }}>
          {label}
        </span>
      )}
    </motion.button>
  );
}
