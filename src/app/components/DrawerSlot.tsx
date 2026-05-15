import React, { useState } from 'react';
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
  const [isHovered, setIsHovered] = useState(false);

  const statusLabel =
    rate > 80 ? '满载' : rate > 50 ? '过半' : rate > 25 ? '使用中' : boxCount > 0 ? '少量' : '空闲';
  const statusColor =
    rate > 80 ? '#ef4444' : rate > 50 ? '#f59e0b' : rate > 25 ? '#3b82f6' : boxCount > 0 ? '#22c55e' : 'var(--app-muted)';

  const freeSlots = drawer.max_boxes - boxCount;

  return (
    <div className="relative group">
      <motion.button
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer overflow-hidden w-full"
        style={{
          aspectRatio: isCompact ? '2.35 / 1' : '1 / 1',
          background: oc.bg,
          border: `1.5px solid ${oc.border}`,
          boxShadow: isHovered ? `0 8px 24px ${oc.border}40` : '0 4px 16px rgba(15,23,42,0.06)',
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

      {/* Hover preview tooltip */}
      {isHovered && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 rounded-xl px-4 py-3 pointer-events-none whitespace-nowrap"
          style={{
            background: 'var(--app-header-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 16px 48px rgba(15,23,42,0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px] font-medium" style={{ color: 'var(--app-text)' }}>
              抽屉 {drawer.label}
            </span>
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-full"
              style={{ background: statusColor + '20', color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[12px]" style={{ color: 'var(--app-muted)' }}>
            <span>已用: {boxCount} 盒</span>
            <span>空闲: {freeSlots} 位</span>
            <span>占用率: {rate}%</span>
          </div>
          {rate > 0 && (
            <div className="mt-1.5 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--app-input-bg)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${rate}%`, background: `linear-gradient(90deg, ${statusColor}80, ${statusColor})` }}
              />
            </div>
          )}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full -mt-0.5 w-2.5 h-2.5 rotate-45"
            style={{
              background: 'var(--app-header-bg)',
              borderRight: '1px solid var(--app-border)',
              borderBottom: '1px solid var(--app-border)',
            }}
          />
        </div>
      )}
    </div>
  );
}
