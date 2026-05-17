import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import {
  UpperItem, Drawer, getOccupancyRate, getOccupancyColor,
  DRAWER_LAYER1, DRAWER_LAYER2, getItemTypeConfig,
} from '../types';
import { fetchUpperItems, fetchDrawers, fetchBoxes } from '../api';
import { useIsMobile } from './ui/use-mobile';

interface FridgeSideMapProps {
  fridgeId: string;
  fridgeName: string;
  selectedDrawerId?: string | null;
  refreshKey?: number;
  onDrawerClick: (drawerId: string, drawerLabel: string) => void;
  onUpperItemClick?: (itemId: string) => void;
}

function MiniDrawerBlock({
  drawer,
  isSelected,
  onClick,
  aspectRatio = '1 / 1',
  minHeight,
}: {
  drawer: Drawer;
  isSelected: boolean;
  onClick: () => void;
  aspectRatio?: string;
  minHeight?: number;
}) {
  const boxCount = drawer.box_count ?? 0;
  const rate = getOccupancyRate(boxCount, drawer.max_boxes);
  const oc = getOccupancyColor(rate);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverBoxes, setHoverBoxes] = useState<{ name: string; sample_type: string | null }[]>([]);

  const handleMouseEnter = useCallback(async () => {
    setIsHovered(true);
    if (boxCount > 0 && hoverBoxes.length === 0) {
      try {
        const boxes = await fetchBoxes(drawer.id);
        setHoverBoxes(boxes.map((b: any) => ({ name: b.name, sample_type: b.sample_type })));
      } catch { setHoverBoxes([]); }
    }
  }, [drawer.id, boxCount, hoverBoxes.length]);

  // Aggregate sample types from hoverBoxes
  const typeCounts: Record<string, number> = {};
  for (const b of hoverBoxes) {
    const t = b.sample_type || '未分类';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        className="relative rounded cursor-pointer overflow-hidden w-full"
        style={{
          aspectRatio,
          ...(minHeight ? { minHeight: `${minHeight}px` } : {}),
          background: isSelected ? oc.bg.replace(/0\.\d+/, '0.30') : oc.bg,
          border: isSelected ? '2px solid #22d3ee' : `1px solid ${oc.border}`,
          boxShadow: isSelected ? '0 0 12px rgba(34,211,238,0.35)' : 'none',
        }}
      >
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: `${Math.max(rate, boxCount > 0 ? 8 : 0)}%`,
            background: oc.border + '40',
          }}
        />
        <span
          className="relative z-10 font-mono font-bold flex items-center justify-center h-full"
          style={{ color: isSelected ? '#0891b2' : 'var(--app-text)', fontSize: "12px" }}
        >
          {drawer.label}
        </span>
      </motion.button>

      {/* Hover tooltip */}
      {isHovered && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 rounded-lg px-3 py-2 pointer-events-none whitespace-nowrap"
          style={{
            background: 'var(--app-header-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 12px 36px rgba(15,23,42,0.2)',
            backdropFilter: 'blur(8px)',
            minWidth: '160px',
          }}
        >
          <div className="text-[12px] font-medium mb-1" style={{ color: 'var(--app-text)' }}>
            抽屉 {drawer.label} · {boxCount}/{drawer.max_boxes} 盒
          </div>
          {hoverBoxes.length > 0 ? (
            <div className="text-[10px] space-y-0.5" style={{ color: 'var(--app-muted)' }}>
              {Object.entries(typeCounts).map(([type, cnt]) => (
                <div key={type} className="flex items-center justify-between gap-3">
                  <span>{type}</span>
                  <span className="font-mono" style={{ color: '#2563eb' }}>×{cnt}</span>
                </div>
              ))}
            </div>
          ) : boxCount > 0 ? (
            <div className="text-[10px]" style={{ color: 'var(--app-muted)' }}>加载中...</div>
          ) : (
            <div className="text-[10px]" style={{ color: 'var(--app-muted)' }}>空抽屉</div>
          )}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full -mt-1 w-2 h-2 rotate-45"
            style={{ background: 'var(--app-header-bg)', borderRight: '1px solid var(--app-border)', borderBottom: '1px solid var(--app-border)' }}
          />
        </div>
      )}
    </div>
  );
}

export function FridgeSideMap({
  fridgeId,
  fridgeName,
  selectedDrawerId,
  refreshKey = 0,
  onDrawerClick,
  onUpperItemClick,
}: FridgeSideMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const colors = useMemo(() => ({
    fridgeBg: isDark ? 'var(--app-card-bg)' : '#f8fafc',
    fridgeBorder: isDark ? 'var(--app-border)' : '#cbd5e1',
    headerBg: isDark ? '#0f172a' : '#1e293b',
    headerText: isDark ? '#e2e8f0' : '#f1f5f9',
    freezerBg: isDark ? 'rgba(14,165,233,0.06)' : '#e0f2fe',
    freezerBorder: isDark ? 'rgba(14,165,233,0.18)' : '#bae6fd',
    freezerTitle: isDark ? '#7dd3fc' : '#0369a1',
    freezerCount: isDark ? '#38bdf8' : '#0284c7',
    fridgeZoneBg: isDark ? 'rgba(34,197,94,0.04)' : '#f0fdf4',
    fridgeZoneBorder: isDark ? 'rgba(34,197,94,0.16)' : '#bbf7d0',
    fridgeTitle: isDark ? '#86efac' : '#15803d',
    fridgeCount: isDark ? '#4ade80' : '#16a34a',
    dividerBg: isDark ? 'rgba(100,116,139,0.3)' : '#cbd5e1',
    rowLabel: isDark ? '#64748b' : '#94a3b8',
    emptyText: isDark ? '#475569' : '#cbd5e1',
  }), [isDark]);

  const [upperItems, setUpperItems] = useState<UpperItem[]>([]);
  const [layer1Drawers, setLayer1Drawers] = useState<Drawer[]>([]);
  const [layer2Drawers, setLayer2Drawers] = useState<Drawer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchUpperItems(fridgeId).catch(() => [] as UpperItem[]),
      fetchDrawers(fridgeId).catch(() => [] as Drawer[]),
    ]).then(([items, drawerData]) => {
      setUpperItems(items);
      setLayer1Drawers(drawerData.filter((d: Drawer) => d.layer === 1));
      setLayer2Drawers(drawerData.filter((d: Drawer) => d.layer === 2));
      setLoading(false);
    });
  }, [fridgeId, refreshKey]);

  const totalBoxes = [...layer1Drawers, ...layer2Drawers].reduce((s, d) => s + (d.box_count ?? 0), 0);
  const totalCapacity = [...layer1Drawers, ...layer2Drawers].reduce((s, d) => s + (d.max_boxes || 5), 0);
  const overallRate = totalCapacity > 0 ? Math.round((totalBoxes / totalCapacity) * 100) : 0;

  const [width, setWidth] = useState(240);
  const isMobile = useIsMobile();
  const resizeRef = React.useRef<HTMLDivElement>(null);
  const isResizing = React.useRef(false);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = ev.clientX - startX;
      const newWidth = Math.max(180, Math.min(420, startWidth + delta));
      setWidth(newWidth);
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const row1Items = upperItems.filter((i) => i.row_number === 1);
  const row2Items = upperItems.filter((i) => i.row_number === 2);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0" style={{ width: isMobile ? '100%' : `${width}px`, minHeight: isMobile ? undefined : '400px' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--app-muted)' }} />
        <span className="text-[11px]" style={{ color: 'var(--app-muted)' }}>加载冰箱...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 flex-shrink-0 relative group/sidemap" style={{ width: isMobile ? '100%' : `${width}px` }}>
      {/* Fridge outline */}
      <div
        className="rounded-2xl flex flex-col"
        style={{
          background: colors.fridgeBg,
          border: `2px solid ${colors.fridgeBorder}`,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(15,23,42,0.08)',
          minHeight: '600px',
        }}
      >
        {/* Fridge header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: colors.headerBg,
            color: colors.headerText,
          }}
        >
          <span className="text-[13px] font-medium truncate flex-1">{fridgeName}</span>
          <span className="text-[12px] font-mono">{overallRate}%</span>
        </div>

        {/* Upper storage zone — freezer area */}
        <div
          className="px-2 py-2 flex flex-col gap-1.5"
          style={{
            background: colors.freezerBg,
            borderBottom: `2px solid ${colors.freezerBorder}`,
          }}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-medium" style={{ color: colors.freezerTitle }}>
              上层
            </span>
            <span className="text-[11px] font-mono" style={{ color: colors.freezerCount }}>
              {upperItems.length} 件
            </span>
          </div>
          {/* Row items as colored dots */}
          {[row1Items, row2Items].map((rowItems, ri) => (
            <div key={ri} className="flex items-center gap-1 flex-wrap px-1">
              <span className="text-[10px]" style={{ color: colors.rowLabel }}>R{ri + 1}</span>
              {rowItems.slice(0, 6).map((item) => {
                const cfg = getItemTypeConfig(item.item_type);
                return (
                  <button
                    key={item.id}
                    onClick={() => onUpperItemClick?.(item.id)}
                    className="w-4 h-4 rounded-full cursor-pointer"
                    style={{ background: cfg.color }}
                    title={item.name}
                  />
                );
              })}
              {rowItems.length > 6 && (
                <span className="text-[9px]" style={{ color: colors.rowLabel }}>+{rowItems.length - 6}</span>
              )}
              {rowItems.length === 0 && (
                <span className="text-[9px]" style={{ color: colors.emptyText }}>空</span>
              )}
            </div>
          ))}
        </div>

        {/* Shelf divider */}
        <div className="h-1.5" style={{ background: colors.dividerBg, boxShadow: isDark ? 'inset 0 1px 3px rgba(0,0,0,0.3)' : 'inset 0 1px 3px rgba(0,0,0,0.1)' }} />

        {/* Drawer Layer 1 */}
        <div
          className="px-2 py-2 flex flex-col gap-1"
          style={{
            background: colors.fridgeZoneBg,
            borderBottom: `2px solid ${colors.fridgeZoneBorder}`,
          }}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-medium" style={{ color: colors.fridgeTitle }}>
              第一层
            </span>
            <span className="text-[11px] font-mono" style={{ color: colors.fridgeCount }}>
              {layer1Drawers.length} 抽屉
            </span>
          </div>
          <div
            className="grid gap-0.5 px-1"
            style={{
              gridTemplateColumns: `repeat(${DRAWER_LAYER1.cols}, minmax(0, 1fr))`,
            }}
          >
            {layer1Drawers.map((d) => (
              <MiniDrawerBlock
                key={d.id}
                drawer={d}
                isSelected={selectedDrawerId === d.id}
                onClick={() => onDrawerClick(d.id, d.label)}
              />
            ))}
          </div>
        </div>

        {/* Shelf divider */}
        <div className="h-1.5" style={{ background: colors.dividerBg, boxShadow: isDark ? 'inset 0 1px 3px rgba(0,0,0,0.3)' : 'inset 0 1px 3px rgba(0,0,0,0.1)' }} />

        {/* Drawer Layer 2 */}
        <div
          className="px-2 py-2 flex flex-col gap-1 flex-1"
          style={{
            background: colors.fridgeZoneBg,
          }}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-medium" style={{ color: colors.fridgeTitle }}>
              第二层
            </span>
            <span className="text-[11px] font-mono" style={{ color: colors.fridgeCount }}>
              {layer2Drawers.length} 抽屉
            </span>
          </div>
          <div
            className="grid gap-0.5 px-1"
            style={{
              gridTemplateColumns: `repeat(${DRAWER_LAYER2.cols}, minmax(0, 1fr))`,
            }}
          >
            {layer2Drawers.map((d) => (
              <MiniDrawerBlock
                key={d.id}
                drawer={d}
                isSelected={selectedDrawerId === d.id}
                onClick={() => onDrawerClick(d.id, d.label)}
                aspectRatio="1.2 / 1"
                minHeight={44}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Resize handle — desktop only */}
      {!isMobile && (
        <div
          ref={resizeRef}
          onMouseDown={handleResizeStart}
          className="absolute top-0 bottom-0 right-0 w-2 cursor-col-resize opacity-0 group-hover/sidemap:opacity-100 transition-opacity z-10"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.3))',
            transform: 'translateX(50%)',
          }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-0.5 h-12 rounded" style={{ background: '#2563eb60' }} />
        </div>
      )}

      {/* Legend */}
      <div
        className="rounded-xl px-3 py-2 space-y-1"
        style={{
          background: 'var(--app-card-bg)',
          border: '1px solid var(--app-border)',
        }}
      >
        <div className="text-[10px]" style={{ color: 'var(--app-muted)' }}>占用率</div>
        <div className="flex items-center gap-2">
          {[
            { label: '空', color: '#22c55e' },
            { label: '低', color: '#3b82f6' },
            { label: '中', color: '#f59e0b' },
            { label: '满', color: '#ef4444' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-0.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: color + '30', border: `1px solid ${color}60` }} />
              <span className="text-[9px]" style={{ color: 'var(--app-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
