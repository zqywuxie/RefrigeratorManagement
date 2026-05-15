import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Thermometer, Package, Loader2 } from 'lucide-react';
import {
  UpperItem, Drawer, getOccupancyRate, getOccupancyColor,
  DRAWER_LAYER1, DRAWER_LAYER2, getItemTypeConfig,
} from '../types';
import { fetchUpperItems, fetchDrawers } from '../api';

interface FridgeSideMapProps {
  fridgeId: string;
  fridgeName: string;
  upperTemperature: number;
  lowerTemperature: number;
  selectedDrawerId?: string | null;
  onDrawerClick: (drawerId: string, drawerLabel: string) => void;
  onUpperItemClick?: (itemId: string) => void;
}

function MiniDrawerBlock({
  drawer,
  isSelected,
  onClick,
}: {
  drawer: Drawer;
  isSelected: boolean;
  onClick: () => void;
}) {
  const boxCount = drawer.box_count ?? 0;
  const rate = getOccupancyRate(boxCount, drawer.max_boxes);
  const oc = getOccupancyColor(rate);

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative rounded cursor-pointer"
      style={{
        aspectRatio: '1 / 1',
        background: oc.bg,
        border: isSelected ? '2px solid #22d3ee' : `1px solid ${oc.border}`,
        boxShadow: isSelected ? `0 0 8px ${oc.border}60` : 'none',
      }}
      title={`${drawer.label} · ${boxCount}/${drawer.max_boxes} 盒 · ${rate}%`}
    >
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${Math.max(rate, boxCount > 0 ? 8 : 0)}%`,
          background: oc.border + '40',
        }}
      />
      <span
        className="relative z-10 text-[8px] font-mono font-bold flex items-center justify-center h-full"
        style={{ color: isSelected ? '#0891b2' : 'var(--app-text)' }}
      >
        {drawer.label}
      </span>
    </motion.button>
  );
}

export function FridgeSideMap({
  fridgeId,
  fridgeName,
  upperTemperature,
  lowerTemperature,
  selectedDrawerId,
  onDrawerClick,
  onUpperItemClick,
}: FridgeSideMapProps) {
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
  }, [fridgeId]);

  const totalBoxes = [...layer1Drawers, ...layer2Drawers].reduce((s, d) => s + (d.box_count ?? 0), 0);
  const totalCapacity = [...layer1Drawers, ...layer2Drawers].reduce((s, d) => s + (d.max_boxes || 5), 0);
  const overallRate = totalCapacity > 0 ? Math.round((totalBoxes / totalCapacity) * 100) : 0;

  const row1Items = upperItems.filter((i) => i.row_number === 1);
  const row2Items = upperItems.filter((i) => i.row_number === 2);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0" style={{ width: '200px', minHeight: '400px' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--app-muted)' }} />
        <span className="text-[11px]" style={{ color: 'var(--app-muted)' }}>加载冰箱...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 flex-shrink-0" style={{ width: '200px' }}>
      {/* Fridge outline */}
      <div
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: '#f8fafc',
          border: '2px solid #cbd5e1',
          boxShadow: '0 8px 32px rgba(15,23,42,0.08)',
          minHeight: '600px',
        }}
      >
        {/* Fridge header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: '#1e293b',
            color: '#f1f5f9',
          }}
        >
          <span className="text-[11px] font-medium truncate flex-1">{fridgeName}</span>
          <span className="text-[10px] font-mono">{overallRate}%</span>
        </div>

        {/* Upper storage zone — freezer area */}
        <div
          className="px-2 py-2 flex flex-col gap-1.5"
          style={{
            background: '#e0f2fe',
            borderBottom: '2px solid #bae6fd',
          }}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-medium" style={{ color: '#0369a1' }}>
              上层 · {upperTemperature}°C
            </span>
            <span className="text-[9px] font-mono" style={{ color: '#0284c7' }}>
              {upperItems.length} 件
            </span>
          </div>
          {/* Row items as colored dots */}
          {[row1Items, row2Items].map((rowItems, ri) => (
            <div key={ri} className="flex items-center gap-1 flex-wrap px-1">
              <span className="text-[8px]" style={{ color: '#94a3b8' }}>R{ri + 1}</span>
              {rowItems.slice(0, 6).map((item) => {
                const cfg = getItemTypeConfig(item.item_type);
                return (
                  <button
                    key={item.id}
                    onClick={() => onUpperItemClick?.(item.id)}
                    className="w-3.5 h-3.5 rounded-full cursor-pointer"
                    style={{ background: cfg.color }}
                    title={item.name}
                  />
                );
              })}
              {rowItems.length > 6 && (
                <span className="text-[7px]" style={{ color: '#94a3b8' }}>+{rowItems.length - 6}</span>
              )}
              {rowItems.length === 0 && (
                <span className="text-[7px]" style={{ color: '#cbd5e1' }}>空</span>
              )}
            </div>
          ))}
        </div>

        {/* Shelf divider */}
        <div className="h-1.5" style={{ background: '#cbd5e1', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }} />

        {/* Drawer Layer 1 */}
        <div
          className="px-2 py-2 flex flex-col gap-1"
          style={{
            background: '#f0fdf4',
            borderBottom: '2px solid #bbf7d0',
          }}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-medium" style={{ color: '#15803d' }}>
              第一层 · {lowerTemperature}°C
            </span>
            <span className="text-[9px] font-mono" style={{ color: '#16a34a' }}>
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
                onClick={() => onDrawerClick(d.id)}
              />
            ))}
          </div>
        </div>

        {/* Shelf divider */}
        <div className="h-1.5" style={{ background: '#cbd5e1', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }} />

        {/* Drawer Layer 2 */}
        <div
          className="px-2 py-2 flex flex-col gap-1 flex-1"
          style={{
            background: '#f0fdf4',
          }}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-medium" style={{ color: '#15803d' }}>
              第二层 · {lowerTemperature}°C
            </span>
            <span className="text-[9px] font-mono" style={{ color: '#16a34a' }}>
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
                onClick={() => onDrawerClick(d.id)}
              />
            ))}
          </div>
        </div>
      </div>

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
