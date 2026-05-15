import React from 'react';
import { motion } from 'motion/react';
import { BoxCell, Tube, STATUS_CONFIG, cellPositionToLabel, getGroupColorStyle } from '../types';

interface CellSlotProps {
  cell?: BoxCell;
  tube?: Tube;
  position: number;
  cols: number;
  isHighlighted: boolean;
  isGrouped?: boolean;
  groupColor?: string;
  isSelected?: boolean;
  onClick: () => void;
}

export function CellSlot({
  cell,
  tube,
  position,
  cols,
  isHighlighted,
  isGrouped,
  groupColor,
  isSelected,
  onClick,
}: CellSlotProps) {
  const label = cellPositionToLabel(position, cols);
  const entity = tube || cell;
  const status = tube ? tube.status : cell?.sample_status;
  const config = entity && status ? STATUS_CONFIG[status] : null;
  const groupStyle = groupColor ? getGroupColorStyle(groupColor) : null;

  const isOccupied = !!entity;

  let border: string;
  let background: string;
  let boxShadow: string | undefined;

  if (isSelected) {
    border = '2px solid #22d3ee';
    background = 'rgba(34,211,238,0.15)';
    boxShadow = '0 0 12px rgba(34,211,238,0.4)';
  } else if (isHighlighted) {
    border = '2px solid #3b82f6';
    background = 'rgba(59,130,246,0.12)';
    boxShadow = '0 0 8px rgba(59,130,246,0.4)';
  } else if (isGrouped && groupStyle) {
    border = `2px solid ${groupStyle.border}`;
    background = groupStyle.bg;
    boxShadow = `0 0 8px ${groupStyle.glow}`;
  } else if (isOccupied && config) {
    border = `1.5px solid ${config.borderColor}60`;
    background = groupStyle ? groupStyle.bg : config.bgColor;
  } else {
    border = '1.5px dashed var(--slot-empty-border)';
    background = 'var(--slot-empty-bg)';
  }

  const displayName = tube
    ? (tube.patient_name || tube.sample_code || tube.tube_label)
    : cell?.sample_name;

  return (
    <motion.button
      whileHover={{ scale: isOccupied ? 1.1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative w-full flex flex-col items-center justify-center gap-0.5 cursor-pointer overflow-hidden"
      style={{
        aspectRatio: '1 / 1',
        borderRadius: '6px',
        border,
        background,
        boxShadow,
      }}
      animate={isHighlighted ? { boxShadow: ['0 0 4px rgba(59,130,246,0.2)', '0 0 14px rgba(59,130,246,0.5)', '0 0 4px rgba(59,130,246,0.2)'] } : isGrouped ? { boxShadow: [`0 0 4px ${groupStyle?.glow || 'transparent'}`, `0 0 10px ${groupStyle?.glow || 'transparent'}`, `0 0 4px ${groupStyle?.glow || 'transparent'}`] } : {}}
      transition={isHighlighted || isGrouped ? { repeat: Infinity, duration: 1.2 } : {}}
    >
      {/* Group color left accent bar */}
      {groupColor && (
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{ width: '3px', background: groupColor, borderRadius: '3px 0 0 3px' }}
        />
      )}

      {isOccupied && (
        <>
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: groupColor || config?.borderColor || '#94a3b8' }}
          />
          <span className="text-[9px] font-mono leading-none" style={{ color: groupColor || config?.color || 'var(--app-text)' }}>
            {label}
          </span>
          {displayName && (
            <span className="text-[7px] truncate max-w-full px-0.5 leading-tight" style={{ color: 'var(--app-muted)' }}>
              {displayName}
            </span>
          )}
        </>
      )}
      {!isOccupied && (
        <span className="text-[9px]" style={{ color: 'var(--app-muted)' }}>
          {label}
        </span>
      )}
    </motion.button>
  );
}
