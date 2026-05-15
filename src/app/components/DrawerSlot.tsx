import React from 'react';
import { motion } from 'motion/react';
import { Package } from 'lucide-react';
import { Drawer, getOccupancyRate, getOccupancyColor } from '../types';

interface DrawerSlotProps {
  drawer: Drawer;
  onClick: () => void;
  variant?: 'standard' | 'compact';
}

export function DrawerSlot({ drawer, onClick, variant = 'standard' }: DrawerSlotProps) {
  const boxCount = drawer.box_count ?? 0;
  const rate = getOccupancyRate(boxCount, drawer.max_boxes);
  const oc = getOccupancyColor(rate);
  const isCompact = variant === 'compact';

  const statusLabel =
    rate > 80 ? '满载' : rate > 50 ? '过半' : rate > 25 ? '使用中' : boxCount > 0 ? '少量' : '空闲';
  const statusColor =
    rate > 80 ? '#ef4444' : rate > 50 ? '#f59e0b' : rate > 25 ? '#3b82f6' : boxCount > 0 ? '#22c55e' : 'var(--app-muted)';

  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="relative rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer overflow-hidden"
      style={{
        aspectRatio: isCompact ? '2.35 / 1' : '1 / 1',
        background: oc.bg,
        border: `1.5px solid ${oc.border}`,
        boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
        minHeight: isCompact ? 54 : 92,
      }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-500"
        style={{
          height: `${rate}%`,
          background: `linear-gradient(0deg, ${oc.border}40, transparent)`,
        }}
      />
      <span
        className="relative z-10 font-mono font-bold"
        style={{ color: 'var(--app-text)', fontSize: isCompact ? 16 : 20 }}
      >
        {drawer.label}
      </span>
      <div className="relative z-10 flex items-center gap-1">
        <Package size={isCompact ? 11 : 13} color={statusColor} />
        <span className="font-mono" style={{ color: statusColor, fontSize: isCompact ? 11 : 13 }}>
          {boxCount}/{drawer.max_boxes}
        </span>
      </div>
      <span className="relative z-10" style={{ color: statusColor, fontSize: isCompact ? 10 : 11 }}>
        {statusLabel}
      </span>
    </motion.button>
  );
}
