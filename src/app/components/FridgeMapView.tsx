import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Layers, Package, Map as MapIcon, Thermometer, Grid3X3, ChevronRight,
} from 'lucide-react';
import {
  UpperItem, Drawer, Box, getOccupancyRate, getOccupancyColor,
  DRAWER_LAYER1, DRAWER_LAYER2, getItemTypeConfig,
} from '../types';

interface FridgeMapViewProps {
  fridgeName: string;
  upperItems: UpperItem[];
  layer1Drawers: Drawer[];
  layer2Drawers: Drawer[];
  upperTemperature: number;
  lowerTemperature: number;
  onDrawerClick: (drawerId: string) => void;
  onUpperItemClick?: (itemId: string) => void;
  onViewFridge?: () => void;
}

function DrawerBlock({
  drawer,
  onClick,
}: {
  drawer: Drawer;
  onClick: () => void;
}) {
  const boxCount = drawer.box_count ?? 0;
  const rate = getOccupancyRate(boxCount, drawer.max_boxes);
  const oc = getOccupancyColor(rate);
  const statusLabel =
    rate > 80 ? '满载' : rate > 50 ? '过半' : rate > 25 ? '使用中' : boxCount > 0 ? '少量' : '空闲';
  const statusColor =
    rate > 80 ? '#ef4444' : rate > 50 ? '#f59e0b' : rate > 25 ? '#3b82f6' : boxCount > 0 ? '#22c55e' : '#94a3b8';

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-xl flex flex-col items-center justify-center gap-1 p-3 cursor-pointer overflow-hidden"
      style={{
        aspectRatio: '1 / 1',
        background: oc.bg,
        border: `1.5px solid ${oc.border}`,
        boxShadow: '0 4px 12px rgba(15,23,42,0.05)',
      }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-500"
        style={{
          height: `${rate}%`,
          background: `linear-gradient(0deg, ${oc.border}30, transparent)`,
        }}
      />
      <span className="relative z-10 text-[18px] font-mono font-bold" style={{ color: 'var(--app-text)' }}>
        {drawer.label}
      </span>
      <div className="relative z-10 flex items-center gap-1">
        <Package size={11} color={statusColor} />
        <span className="text-[12px] font-mono" style={{ color: statusColor }}>
          {boxCount}/{drawer.max_boxes}
        </span>
      </div>
      <span className="relative z-10 text-[10px]" style={{ color: statusColor }}>
        {statusLabel} · {rate}%
      </span>
    </motion.button>
  );
}

export function FridgeMapView({
  fridgeName,
  upperItems,
  layer1Drawers,
  layer2Drawers,
  upperTemperature,
  lowerTemperature,
  onDrawerClick,
  onUpperItemClick,
  onViewFridge,
}: FridgeMapViewProps) {
  const [selectedZone, setSelectedZone] = useState<string>('upper');

  const zoneInfo = () => {
    if (selectedZone === 'upper') {
      return { name: '上层开放存储', count: upperItems.length, subtitle: `${upperTemperature}°C`, subtitleColor: '#2563eb' };
    } else if (selectedZone === 'layer1') {
      return { name: '下层-上层抽屉区', count: layer1Drawers.length, subtitle: `${lowerTemperature}°C`, subtitleColor: '#15803d' };
    } else {
      return { name: '下层-下层抽屉区', count: layer2Drawers.length, subtitle: `${lowerTemperature}°C`, subtitleColor: '#15803d' };
    }
  };

  const info = zoneInfo();
  const totalBoxes = [...layer1Drawers, ...layer2Drawers].reduce((s, d) => s + (d.box_count ?? 0), 0);
  const totalCapacity = [...layer1Drawers, ...layer2Drawers].reduce((s, d) => s + (d.max_boxes || 5), 0);

  return (
    <div className="flex gap-6 w-full" style={{ maxWidth: '1100px' }}>
      {/* Left: 2D Fridge Map */}
      <div className="flex-1 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[20px] font-medium" style={{ color: 'var(--app-text)' }}>
              {fridgeName} · 二维映射
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--app-muted)' }}>
              鸟瞰视图 · 全部区域一览
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--app-muted)' }}>
              <Thermometer size={14} />
              <span style={{ color: '#2563eb' }}>{upperTemperature}°C</span>
              <span>/</span>
              <span style={{ color: '#15803d' }}>{lowerTemperature}°C</span>
            </div>
            <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--app-muted)' }}>
              <Package size={14} />
              <span>{totalBoxes}/{totalCapacity} 盒</span>
            </div>
          </div>
        </div>

        {/* Fridge zones */}
        <div
          className="rounded-2xl p-5 space-y-5"
          style={{
            background: 'var(--app-card-bg)',
            border: '2px solid var(--app-border)',
            boxShadow: '0 16px 48px rgba(15,23,42,0.08)',
          }}
        >
          {/* Zone selector tabs */}
          <div
            className="grid grid-cols-3 gap-2 rounded-xl p-1"
            style={{
              background: 'var(--app-input-bg)',
              border: '1px solid var(--app-input-border)',
            }}
          >
            {[
              { key: 'upper', label: '上层存储' },
              { key: 'layer1', label: '抽屉区 1' },
              { key: 'layer2', label: '抽屉区 2' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedZone(tab.key)}
                className="rounded-lg px-3 py-2 text-[13px] transition-all"
                style={{
                  background: selectedZone === tab.key ? '#2563eb' : 'transparent',
                  color: selectedZone === tab.key ? '#fff' : 'var(--app-muted)',
                  boxShadow: selectedZone === tab.key ? '0 8px 20px rgba(37,99,235,0.18)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Upper storage zone */}
          {selectedZone === 'upper' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-medium" style={{ color: 'var(--app-text)' }}>
                    上层开放存储 {upperTemperature}°C
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                    2 行 · {upperItems.length} 件物品
                  </div>
                </div>
                <div className="flex gap-2">
                  {['试剂', '样本', '耗材', '临时物品'].map((type) => {
                    const cfg = getItemTypeConfig(type);
                    const count = upperItems.filter((i) => i.item_type === type).length;
                    if (count === 0) return null;
                    return (
                      <span key={type} className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: cfg.bgColor, color: cfg.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                        {cfg.label} ×{count}
                      </span>
                    );
                  })}
                </div>
              </div>
              {/* Row visualization */}
              {[1, 2].map((row) => {
                const rowItems = upperItems.filter((i) => i.row_number === row);
                return (
                  <div key={row} className="flex flex-col gap-1.5">
                    <span className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                      第 {row} 行 · {rowItems.length} 件
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {rowItems.map((item) => {
                        const cfg = getItemTypeConfig(item.item_type);
                        return (
                          <motion.button
                            key={item.id}
                            whileHover={{ scale: 1.03 }}
                            onClick={() => onUpperItemClick?.(item.id)}
                            className="text-[12px] px-3 py-1.5 rounded-lg truncate max-w-[180px]"
                            style={{
                              background: cfg.bgColor,
                              border: `1px solid ${cfg.color}40`,
                              color: cfg.color,
                            }}
                            title={item.name}
                          >
                            {item.name}
                            {item.box_mode === 'precise' && ' 🗂'}
                          </motion.button>
                        );
                      })}
                      <div
                        className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed flex items-center"
                        style={{
                          borderColor: 'var(--slot-empty-border)',
                          color: 'var(--app-muted)',
                        }}
                      >
                        + 空位
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Layer 1 drawers */}
          {selectedZone === 'layer1' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-medium" style={{ color: 'var(--app-text)' }}>
                    第一层抽屉区 {lowerTemperature}°C
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                    {DRAWER_LAYER1.rows}×{DRAWER_LAYER1.cols} · {layer1Drawers.length} 个抽屉
                  </div>
                </div>
              </div>
              <div
                className="grid gap-2.5"
                style={{
                  gridTemplateColumns: `repeat(${DRAWER_LAYER1.cols}, minmax(0, 1fr))`,
                }}
              >
                {layer1Drawers.map((drawer) => (
                  <DrawerBlock
                    key={drawer.id}
                    drawer={drawer}
                    onClick={() => onDrawerClick(drawer.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Layer 2 drawers */}
          {selectedZone === 'layer2' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-medium" style={{ color: 'var(--app-text)' }}>
                    第二层抽屉区 {lowerTemperature}°C
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                    {DRAWER_LAYER2.rows}×{DRAWER_LAYER2.cols} · {layer2Drawers.length} 个抽屉
                  </div>
                </div>
              </div>
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${DRAWER_LAYER2.cols}, minmax(0, 1fr))`,
                }}
              >
                {layer2Drawers.map((drawer) => (
                  <DrawerBlock
                    key={drawer.id}
                    drawer={drawer}
                    onClick={() => onDrawerClick(drawer.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Dynamic Info Panel */}
      <div
        className="w-72 flex-shrink-0 flex flex-col gap-4"
      >
        {/* Zone info card */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: 'var(--app-card-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: info.subtitleColor + '20' }}
            >
              <MapIcon size={16} color={info.subtitleColor} />
            </div>
            <div>
              <div className="text-[14px] font-medium" style={{ color: 'var(--app-text)' }}>
                {info.name}
              </div>
              <div className="text-[11px]" style={{ color: info.subtitleColor }}>
                {info.subtitle}
              </div>
            </div>
          </div>
          <div className="text-[13px]" style={{ color: 'var(--app-muted)' }}>
            共 {info.count} 个{selectedZone === 'upper' ? '物品' : '抽屉'}
            {selectedZone !== 'upper' && (
              <span> · {[...layer1Drawers, ...layer2Drawers].filter((d) => (selectedZone === 'layer1' ? d.layer === 1 : d.layer === 2)).reduce((s, d) => s + (d.box_count ?? 0), 0)} 盒</span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: 'var(--app-card-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
          }}
        >
          <div className="flex items-center gap-2">
            <Grid3X3 size={15} color="var(--app-muted)" />
            <span className="text-[14px]" style={{ color: 'var(--app-text)' }}>
              快速统计
            </span>
          </div>
          <div className="space-y-2">
            {[
              ['上层物品', upperItems.length],
              ['抽屉总数', layer1Drawers.length + layer2Drawers.length],
              ['盒子总数', totalBoxes],
              ['盒子容量', totalCapacity],
              ['总占用率', totalCapacity > 0 ? Math.round((totalBoxes / totalCapacity) * 100) : 0],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-[13px]">
                <span style={{ color: 'var(--app-muted)' }}>{label}</span>
                <span className="font-mono" style={{ color: 'var(--app-text)' }}>
                  {typeof value === 'number' && label === '总占用率' ? `${value}%` : value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tip */}
        <div
          className="rounded-xl px-4 py-3 text-[12px]"
          style={{
            background: 'var(--app-input-bg)',
            border: '1px solid var(--app-input-border)',
            color: 'var(--app-muted)',
          }}
        >
          点击抽屉可查看盒子列表 · 使用上方标签切换区域
        </div>
      </div>
    </div>
  );
}
