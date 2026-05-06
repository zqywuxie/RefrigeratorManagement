import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Thermometer, Droplets, Zap } from 'lucide-react';
import {
  Sample,
  SubSample,
  Compartment,
  CompartmentGridConfig,
  STATUS_CONFIG,
  GRID_MIN,
  GRID_MAX_ROWS,
  GRID_MAX_COLS,
} from '../types';
import { SampleSlot } from './SampleSlot';
import { ContainerSubView } from './ContainerSubView';

interface FridgeUnitProps {
  samples: Sample[];
  selectedSampleId: string | null;
  matchedIds: Set<string>;
  searchQuery: string;
  compartmentGrids: Record<Compartment, CompartmentGridConfig>;
  viewingContainer: Sample | null;
  onDropSample: (
    sampleId: string,
    toCompartment: Compartment,
    toPosition: number,
  ) => void;
  onSelectSample: (id: string) => void;
  onDeleteSample: (id: string) => void;
  onSlotClick: (
    compartment: Compartment,
    position: number,
    containerId?: string,
  ) => void;
  onEnterContainer: (id: string) => void;
  onExitContainer: () => void;
  onDropSubSample: (
    subSampleId: string,
    containerId: string,
    toPosition: number,
  ) => void;
  onAddSubSample: (containerId: string, position: number) => void;
  onDeleteSubSample: (containerId: string, subSampleId: string) => void;
  onUpdateCompartmentGrid: (
    compartment: Compartment,
    grid: CompartmentGridConfig,
  ) => void;
  onUpdateContainerGrid: (
    containerId: string,
    gridRows: number,
    gridCols: number,
  ) => void;
}

function GridControls({
  rows,
  cols,
  onRowsChange,
  onColsChange,
  accentColor,
}: {
  rows: number;
  cols: number;
  onRowsChange: (r: number) => void;
  onColsChange: (c: number) => void;
  accentColor: string;
}) {
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    background: disabled ? 'rgba(255,255,255,0.03)' : `${accentColor}15`,
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : `${accentColor}40`}`,
    color: disabled ? '#334155' : accentColor,
    cursor: disabled ? 'default' : 'pointer',
    fontSize: '14px',
    lineHeight: '1',
    padding: 0,
  });

  return (
    <div className="flex items-center gap-4 mb-2">
      <div className="flex items-center gap-1">
        <span className="text-[12px]" style={{ color: '#475569' }}>
          Rows
        </span>
        <button
          onClick={() => onRowsChange(rows - 1)}
          disabled={rows <= GRID_MIN}
          style={btnStyle(rows <= GRID_MIN)}
        >
          −
        </button>
        <span
          className="text-[13px] font-mono w-5 text-center"
          style={{ color: accentColor }}
        >
          {rows}
        </span>
        <button
          onClick={() => onRowsChange(rows + 1)}
          disabled={rows >= GRID_MAX_ROWS}
          style={btnStyle(rows >= GRID_MAX_ROWS)}
        >
          +
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[12px]" style={{ color: '#475569' }}>
          Cols
        </span>
        <button
          onClick={() => onColsChange(cols - 1)}
          disabled={cols <= GRID_MIN}
          style={btnStyle(cols <= GRID_MIN)}
        >
          −
        </button>
        <span
          className="text-[13px] font-mono w-5 text-center"
          style={{ color: accentColor }}
        >
          {cols}
        </span>
        <button
          onClick={() => onColsChange(cols + 1)}
          disabled={cols >= GRID_MAX_COLS}
          style={btnStyle(cols >= GRID_MAX_COLS)}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function FridgeUnit({
  samples,
  selectedSampleId,
  matchedIds,
  searchQuery,
  compartmentGrids,
  viewingContainer,
  onDropSample,
  onSelectSample,
  onDeleteSample,
  onSlotClick,
  onEnterContainer,
  onExitContainer,
  onDropSubSample,
  onAddSubSample,
  onDeleteSubSample,
  onUpdateCompartmentGrid,
  onUpdateContainerGrid,
}: FridgeUnitProps) {
  // ── Container interior view ──
  if (viewingContainer) {
    return (
      <ContainerSubView
        container={viewingContainer}
        selectedSampleId={selectedSampleId}
        matchedIds={matchedIds}
        searchQuery={searchQuery}
        onBack={onExitContainer}
        onSelect={onSelectSample}
        onDropSubSample={onDropSubSample}
        onAddSubSample={onAddSubSample}
        onDeleteSubSample={onDeleteSubSample}
        onUpdateContainerGrid={onUpdateContainerGrid}
      />
    );
  }

  // ── Main fridge view ──
  const upperSamples = samples.filter((s) => s.compartment === 'upper');
  const lowerSamples = samples.filter((s) => s.compartment === 'lower');
  const hasCritical = samples.some((s) => s.status === 'critical');
  const hasWarning = samples.some(
    (s) => s.status === 'warning' || s.status === 'critical',
  );

  const upperTemp = hasCritical ? -15 : hasWarning ? -18 : -20;
  const lowerTemp = 4;

  const upperGrid = compartmentGrids.upper;
  const lowerGrid = compartmentGrids.lower;
  const upperCapacity = upperGrid.rows * upperGrid.cols;
  const lowerCapacity = lowerGrid.rows * lowerGrid.cols;

  const getSampleAt = (comp: Compartment, pos: number) =>
    samples.find((s) => s.compartment === comp && s.position === pos);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Fridge Outer Body */}
      <div
        className="relative rounded-3xl select-none"
        style={{
          width: '560px',
          background:
            'linear-gradient(145deg, #cfd9e0 0%, #e4ecf2 25%, #d0dce6 50%, #e8eef4 75%, #c8d5de 100%)',
          boxShadow:
            '8px 8px 24px rgba(0,0,0,0.45), -3px -3px 10px rgba(255,255,255,0.35), inset 1px 1px 3px rgba(255,255,255,0.6)',
          border: '1.5px solid #aebdca',
          padding: '24px 28px 28px 24px',
        }}
      >
        {/* Door Handle */}
        <div
          className="absolute right-5 top-1/2 -translate-y-1/2"
          style={{
            width: '14px',
            height: '120px',
            background:
              'linear-gradient(90deg, #7a8c9a, #b8c8d4, #9aaab8, #b8c8d4, #7a8c9a)',
            borderRadius: '7px',
            boxShadow:
              '3px 2px 6px rgba(0,0,0,0.35), inset 1px 0 2px rgba(255,255,255,0.3)',
          }}
        />

        {/* Brand Header */}
        <div className="flex items-center justify-between mb-5 pr-10">
          <div>
            <div
              className="text-[18px] font-mono uppercase tracking-[0.2em]"
              style={{ color: '#5a6e7f', letterSpacing: '0.2em' }}
            >
              BioFridge™
            </div>
            <div className="text-[13px] mt-0.5" style={{ color: '#8a9aa8' }}>
              样本存储管理系统 v2.0
            </div>
          </div>

          {/* Status LED cluster */}
          <div className="flex items-center gap-2">
            <motion.div
              animate={hasCritical ? { opacity: [1, 0.15, 1] } : { opacity: 1 }}
              transition={hasCritical ? { duration: 0.7, repeat: Infinity } : {}}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded"
              style={{
                background: hasCritical
                  ? 'rgba(153,27,27,0.7)'
                  : hasWarning
                    ? 'rgba(120,60,0,0.7)'
                    : 'rgba(10,50,20,0.7)',
                border: `1px solid ${hasCritical ? '#ef4444' : hasWarning ? '#f59e0b' : '#22c55e'}`,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: hasCritical
                    ? '#ef4444'
                    : hasWarning
                      ? '#f59e0b'
                      : '#22c55e',
                  boxShadow: `0 0 8px ${hasCritical ? '#ef4444' : hasWarning ? '#f59e0b' : '#22c55e'}`,
                }}
              />
              <span
                className="text-[13px] font-mono"
                style={{
                  color: hasCritical
                    ? '#fca5a5'
                    : hasWarning
                      ? '#fcd34d'
                      : '#86efac',
                }}
              >
                {hasCritical ? 'ALERT' : hasWarning ? 'WARN' : 'OK'}
              </span>
            </motion.div>
          </div>
        </div>

        {/* ── UPPER COMPARTMENT (Freezer) ── */}
        <div
          className="rounded-xl mb-2 p-4 relative overflow-hidden"
          style={{
            background:
              'linear-gradient(180deg, #060e1f 0%, #0a1830 60%, #0d2248 100%)',
            border: '1px solid #1a3a62',
            boxShadow: 'inset 0 3px 10px rgba(0,0,0,0.7)',
          }}
        >
          {/* Frost shimmer top */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(147,197,253,0.6) 50%, transparent 100%)',
            }}
          />

          {/* Compartment label row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full"
                style={{ background: '#60a5fa', boxShadow: '0 0 8px #60a5fa' }}
              />
              <span className="text-[16px]" style={{ color: '#93c5fd' }}>
                冷冻层 / Freezer
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Thermometer
                size={18}
                color={hasWarning ? '#f59e0b' : '#60a5fa'}
              />
              <motion.span
                animate={
                  hasWarning
                    ? { color: ['#f59e0b', '#ef4444', '#f59e0b'] }
                    : {}
                }
                transition={hasWarning ? { duration: 1.5, repeat: Infinity } : {}}
                className="text-[18px] font-mono tabular-nums"
                style={{ color: hasWarning ? '#f59e0b' : '#60a5fa' }}
              >
                {upperTemp}°C
              </motion.span>
              <span className="text-[13px]" style={{ color: '#475569' }}>
                {upperSamples.length}/{upperCapacity}
              </span>
            </div>
          </div>

          {/* Grid controls */}
          <GridControls
            rows={upperGrid.rows}
            cols={upperGrid.cols}
            onRowsChange={(r) =>
              onUpdateCompartmentGrid('upper', {
                rows: r,
                cols: upperGrid.cols,
              })
            }
            onColsChange={(c) =>
              onUpdateCompartmentGrid('upper', {
                rows: upperGrid.rows,
                cols: c,
              })
            }
            accentColor="#60a5fa"
          />

          {/* Upper Grid */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${upperGrid.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${upperGrid.rows}, auto)`,
              justifyItems: 'center',
            }}
          >
            {Array.from({ length: upperCapacity }, (_, i) => {
              const s = getSampleAt('upper', i);
              return (
                <SampleSlot
                  key={`upper-${i}`}
                  compartment="upper"
                  position={i}
                  sample={s}
                  isHighlighted={
                    s ? matchedIds.has(s.id) && searchQuery.length > 0 : false
                  }
                  isSelected={s ? s.id === selectedSampleId : false}
                  onSelect={onSelectSample}
                  onDelete={onDeleteSample}
                  onDrop={onDropSample}
                  onAddClick={onSlotClick}
                  onEnterContainer={onEnterContainer}
                />
              );
            })}
          </div>

          {/* Capacity bar */}
          <div className="mt-4 flex items-center gap-2">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    upperSamples.length / upperCapacity > 0.8
                      ? 'linear-gradient(90deg, #3b82f6, #ef4444)'
                      : 'linear-gradient(90deg, #1d4ed8, #3b82f6)',
                }}
                animate={{
                  width: `${(upperSamples.length / upperCapacity) * 100}%`,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[13px] font-mono" style={{ color: '#475569' }}>
              {Math.round((upperSamples.length / upperCapacity) * 100)}%
            </span>
          </div>
        </div>

        {/* ── SHELF DIVIDER ── */}
        <div
          className="h-5 mx-2 mb-2 rounded flex items-center justify-center overflow-hidden relative"
          style={{
            background:
              'linear-gradient(180deg, #7a8c9a 0%, #b0c2d0 40%, #a0b2c0 60%, #7a8c9a 100%)',
            boxShadow:
              '0 2px 5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          {[20, 50, 80].map((pct) => (
            <div
              key={pct}
              className="absolute w-2.5 h-2.5 rounded-full"
              style={{
                left: `${pct}%`,
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #8090a0, #c0d0de)',
                boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.3)',
                border: '0.5px solid #6080a0',
              }}
            />
          ))}
        </div>

        {/* ── LOWER COMPARTMENT (Refrigerator) ── */}
        <div
          className="rounded-xl p-4 relative overflow-hidden"
          style={{
            background:
              'linear-gradient(180deg, #060f09 0%, #091a0e 60%, #0c2212 100%)',
            border: '1px solid #1a4428',
            boxShadow: 'inset 0 3px 10px rgba(0,0,0,0.7)',
          }}
        >
          {/* LED light bar */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(134,239,172,0.6) 50%, transparent 100%)',
            }}
          />

          {/* Compartment label row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: 0.3,
                }}
                className="w-2 h-2 rounded-full"
                style={{
                  background: '#4ade80',
                  boxShadow: '0 0 8px #4ade80',
                }}
              />
              <span className="text-[16px]" style={{ color: '#86efac' }}>
                冷藏层 / Refrigerator
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Thermometer size={18} color="#4ade80" />
              <span
                className="text-[18px] font-mono"
                style={{ color: '#4ade80' }}
              >
                +{lowerTemp}°C
              </span>
              <span className="text-[13px]" style={{ color: '#475569' }}>
                {lowerSamples.length}/{lowerCapacity}
              </span>
            </div>
          </div>

          {/* Grid controls */}
          <GridControls
            rows={lowerGrid.rows}
            cols={lowerGrid.cols}
            onRowsChange={(r) =>
              onUpdateCompartmentGrid('lower', {
                rows: r,
                cols: lowerGrid.cols,
              })
            }
            onColsChange={(c) =>
              onUpdateCompartmentGrid('lower', {
                rows: lowerGrid.rows,
                cols: c,
              })
            }
            accentColor="#4ade80"
          />

          {/* Lower Grid */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${lowerGrid.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${lowerGrid.rows}, auto)`,
              justifyItems: 'center',
            }}
          >
            {Array.from({ length: lowerCapacity }, (_, i) => {
              const s = getSampleAt('lower', i);
              return (
                <SampleSlot
                  key={`lower-${i}`}
                  compartment="lower"
                  position={i}
                  sample={s}
                  isHighlighted={
                    s ? matchedIds.has(s.id) && searchQuery.length > 0 : false
                  }
                  isSelected={s ? s.id === selectedSampleId : false}
                  onSelect={onSelectSample}
                  onDelete={onDeleteSample}
                  onDrop={onDropSample}
                  onAddClick={onSlotClick}
                  onEnterContainer={onEnterContainer}
                />
              );
            })}
          </div>

          {/* Capacity bar */}
          <div className="mt-4 flex items-center gap-2">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    lowerSamples.length / lowerCapacity > 0.75
                      ? 'linear-gradient(90deg, #22c55e, #ef4444)'
                      : 'linear-gradient(90deg, #15803d, #22c55e)',
                }}
                animate={{
                  width: `${(lowerSamples.length / lowerCapacity) * 100}%`,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[13px] font-mono" style={{ color: '#475569' }}>
              {Math.round((lowerSamples.length / lowerCapacity) * 100)}%
            </span>
          </div>
        </div>

        {/* Bottom status strip */}
        <div className="flex items-center justify-between mt-4 pr-10">
          <div className="flex gap-3 flex-wrap">
            {(
              Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>
            ).map((status) => {
              const count = samples.filter((s) => s.status === status).length;
              if (count === 0) return null;
              return (
                <div key={status} className="flex items-center gap-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: STATUS_CONFIG[status].borderColor,
                      boxShadow: `0 0 5px ${STATUS_CONFIG[status].borderColor}`,
                    }}
                  />
                  <span className="text-[13px]" style={{ color: '#64748b' }}>
                    {STATUS_CONFIG[status].label} ×{count}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets size={14} color="#64748b" />
            <Zap size={14} color="#64748b" />
          </div>
        </div>
      </div>

      {/* JSON Schema hint */}
      <div
        className="rounded-lg p-4 w-full text-[13px] font-mono"
        style={{
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(30,58,100,0.5)',
          color: '#475569',
          maxWidth: '560px',
        }}
      >
        <div style={{ color: '#64748b' }} className="mb-1">
          // 容器数据结构 (JSON Schema)
        </div>
        <span style={{ color: '#7dd3fc' }}>{'{ '}</span>
        <span style={{ color: '#86efac' }}>"id"</span>
        <span style={{ color: '#94a3b8' }}>: </span>
        <span style={{ color: '#fcd34d' }}>"S-001"</span>
        <span style={{ color: '#94a3b8' }}>, </span>
        <span style={{ color: '#86efac' }}>"status"</span>
        <span style={{ color: '#94a3b8' }}>: </span>
        <span style={{ color: '#fcd34d' }}>"normal"</span>
        <span style={{ color: '#94a3b8' }}>, </span>
        <span style={{ color: '#86efac' }}>"subSamples"</span>
        <span style={{ color: '#94a3b8' }}>: </span>
        <span style={{ color: '#fcd34d' }}>"[...]"</span>
        <span style={{ color: '#7dd3fc' }}>{' }'}</span>
      </div>
    </div>
  );
}
