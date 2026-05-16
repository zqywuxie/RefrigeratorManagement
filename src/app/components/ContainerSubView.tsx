import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Thermometer, FlaskConical } from 'lucide-react';
import {
  Sample,
  SubSample,
  STATUS_CONFIG,
  GRID_MIN,
  GRID_MAX_ROWS,
  GRID_MAX_COLS,
} from '../types';
import { SubSampleSlot } from './SubSampleSlot';

interface ContainerSubViewProps {
  container: Sample;
  selectedSampleId: string | null;
  matchedIds: Set<string>;
  searchQuery: string;
  onBack: () => void;
  onSelect: (id: string) => void;
  onDropSubSample: (
    subSampleId: string,
    containerId: string,
    toPosition: number,
  ) => void;
  onAddSubSample: (containerId: string, position: number) => void;
  onDeleteSubSample: (containerId: string, subSampleId: string) => void;
  onUpdateContainerGrid: (
    containerId: string,
    gridRows: number,
    gridCols: number,
  ) => void;
}

export function ContainerSubView({
  container,
  selectedSampleId,
  matchedIds,
  searchQuery,
  onBack,
  onSelect,
  onDropSubSample,
  onAddSubSample,
  onDeleteSubSample,
  onUpdateContainerGrid,
}: ContainerSubViewProps) {
  const config = STATUS_CONFIG[container.status];
  const capacity = container.gridRows * container.gridCols;
  const filledCount = container.subSamples.length;
  const isUpper = container.compartment === 'upper';
  const hasCritical = container.subSamples.some(
    (ss) => ss.status === 'critical',
  );
  const hasWarning =
    container.subSamples.some((ss) => ss.status === 'warning') || hasCritical;

  const containerTemp = isUpper
    ? hasCritical
      ? -15
      : hasWarning
        ? -18
        : -20
    : 4;

  const getSubAt = (pos: number) =>
    container.subSamples.find((ss) => ss.position === pos);

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    background: disabled ? 'rgba(148,163,184,0.08)' : `${config.color}15`,
    border: `1px solid ${disabled ? 'rgba(148,163,184,0.14)' : `${config.color}40`}`,
    color: disabled ? 'var(--app-muted)' : config.color,
    cursor: disabled ? 'default' : 'pointer',
    fontSize: '14px',
    lineHeight: '1',
    padding: 0,
  });

  return (
    <div className="flex w-full max-w-full lg:max-w-[560px] flex-col items-center gap-4">
      {/* Breadcrumb */}
      <div
        className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5"
        style={{
          background: 'var(--app-card-bg)',
          border: '1px solid var(--app-border)',
          boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[16px] hover:opacity-80 transition-opacity"
          style={{ color: '#60a5fa' }}
        >
          <ArrowLeft size={18} />
          冰箱
        </button>
        <span className="text-[13px]" style={{ color: 'var(--app-subtle-text)' }}>
          /
        </span>
        <span className="text-[14px]" style={{ color: 'var(--app-muted)' }}>
          {isUpper ? '上层' : '下层'}
        </span>
        <span className="text-[13px]" style={{ color: 'var(--app-subtle-text)' }}>
          /
        </span>
        <span className="text-[14px]" style={{ color: config.color }}>
          {container.id}
        </span>
      </div>

      {/* Container interior */}
      <div
        className="relative w-full rounded-2xl select-none p-3 sm:p-4 lg:p-[24px_28px_28px_24px]"
        style={{
          background: isUpper ? 'var(--container-body-upper)' : 'var(--container-body-lower)',
          boxShadow: `0 20px 58px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.82), 0 0 6px ${config.glowColor}22`,
          border: `1.5px solid ${config.borderColor}35`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FlaskConical size={22} color={config.color} />
            <div>
              <div className="text-[20px]" style={{ color: config.color }}>
                {container.name}
              </div>
              <div className="text-[13px]" style={{ color: 'var(--app-subtle-text)' }}>
                {container.type} · {container.volume || '未知量'}
              </div>
            </div>
          </div>

          {/* Status LED */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded"
              style={{
                background: hasCritical
                ? 'rgba(239,68,68,0.18)'
                : hasWarning
                  ? 'rgba(245,158,11,0.18)'
                  : 'rgba(34,197,94,0.18)',
                border: `1px solid ${hasCritical ? '#ef4444' : hasWarning ? '#f59e0b' : '#22c55e'}40`,
              }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: hasCritical
                  ? '#ef4444'
                  : hasWarning
                    ? '#f59e0b'
                    : '#22c55e',
                boxShadow: `0 0 2px ${hasCritical ? '#ef4444' : hasWarning ? '#f59e0b' : '#22c55e'}`,
              }}
            />
              <span
                className="text-[12px] font-mono"
                style={{
                  color: hasCritical ? '#fca5a5' : hasWarning ? '#fcd34d' : '#86efac',
                }}
              >
                {hasCritical ? 'ALERT' : hasWarning ? 'WARN' : 'OK'}
            </span>
          </div>
        </div>

        {/* Sub-grid */}
        <div
          className="rounded-xl p-4 relative overflow-hidden"
          style={{
            background: isUpper ? 'var(--container-grid-upper)' : 'var(--container-grid-lower)',
            border: `1px solid ${isUpper ? 'rgba(96,165,250,0.28)' : 'rgba(74,222,128,0.28)'}`,
            boxShadow: 'var(--container-grid-shadow)',
          }}
        >
          {/* Sub-header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: config.color,
                  boxShadow: `0 0 2px ${config.color}`,
                }}
              />
              <span className="text-[16px]" style={{ color: config.color }}>
                容器内部 · 副样本存储区
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Thermometer
                size={18}
                className="w-[15px] h-[15px] sm:w-[18px] sm:h-[18px]"
                color={hasWarning ? '#f59e0b' : config.color}
              />
              <span
                className="text-[14px] sm:text-[16px] font-mono tabular-nums"
                style={{ color: hasWarning ? '#f59e0b' : config.color }}
              >
                {containerTemp}°C
              </span>
              <span className="text-[13px]" style={{ color: 'var(--app-subtle-text)' }}>
                {filledCount}/{capacity}
              </span>
            </div>
          </div>

          {/* Grid controls */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1">
              <span className="text-[12px]" style={{ color: 'var(--app-subtle-text)' }}>
                Rows
              </span>
              <button
                onClick={() =>
                  onUpdateContainerGrid(
                    container.id,
                    container.gridRows - 1,
                    container.gridCols,
                  )
                }
                disabled={container.gridRows <= GRID_MIN}
                className="min-h-[44px] min-w-[44px] lg:min-h-[22px] lg:min-w-[22px]"
                style={btnStyle(container.gridRows <= GRID_MIN)}
              >
                −
              </button>
              <span
                className="text-[13px] font-mono w-5 text-center"
                style={{ color: config.color }}
              >
                {container.gridRows}
              </span>
              <button
                onClick={() =>
                  onUpdateContainerGrid(
                    container.id,
                    container.gridRows + 1,
                    container.gridCols,
                  )
                }
                disabled={container.gridRows >= GRID_MAX_ROWS}
                className="min-h-[44px] min-w-[44px] lg:min-h-[22px] lg:min-w-[22px]"
                style={btnStyle(container.gridRows >= GRID_MAX_ROWS)}
              >
                +
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[12px]" style={{ color: 'var(--app-subtle-text)' }}>
                Cols
              </span>
              <button
                onClick={() =>
                  onUpdateContainerGrid(
                    container.id,
                    container.gridRows,
                    container.gridCols - 1,
                  )
                }
                disabled={container.gridCols <= GRID_MIN}
                className="min-h-[44px] min-w-[44px] lg:min-h-[22px] lg:min-w-[22px]"
                style={btnStyle(container.gridCols <= GRID_MIN)}
              >
                −
              </button>
              <span
                className="text-[13px] font-mono w-5 text-center"
                style={{ color: config.color }}
              >
                {container.gridCols}
              </span>
              <button
                onClick={() =>
                  onUpdateContainerGrid(
                    container.id,
                    container.gridRows,
                    container.gridCols + 1,
                  )
                }
                disabled={container.gridCols >= GRID_MAX_COLS}
                className="min-h-[44px] min-w-[44px] lg:min-h-[22px] lg:min-w-[22px]"
                style={btnStyle(container.gridCols >= GRID_MAX_COLS)}
              >
                +
              </button>
            </div>
          </div>

          {/* Sub-sample grid */}
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${container.gridCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${container.gridRows}, auto)`,
              justifyItems: 'center',
            }}
          >
            {Array.from({ length: capacity }, (_, i) => {
              const ss = getSubAt(i);
              return (
                <SubSampleSlot
                  key={`sub-${container.id}-${i}`}
                  containerId={container.id}
                  position={i}
                  subSample={ss}
                  isHighlighted={
                    ss
                      ? matchedIds.has(ss.id) && searchQuery.length > 0
                      : false
                  }
                  isSelected={ss ? ss.id === selectedSampleId : false}
                  onSelect={onSelect}
                  onDelete={(id) => onDeleteSubSample(container.id, id)}
                  onDrop={onDropSubSample}
                  onAddClick={(pos) => onAddSubSample(container.id, pos)}
                />
              );
            })}
          </div>

          {/* Capacity bar */}
          <div className="mt-4 flex items-center gap-2">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--app-progress-track)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${config.bgColor.replace('0.9', '0.6')}, ${config.borderColor})`,
                }}
                animate={{ width: `${(filledCount / capacity) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[13px] font-mono" style={{ color: 'var(--app-subtle-text)' }}>
              {Math.round((filledCount / capacity) * 100)}%
            </span>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-[12px]" style={{ color: 'var(--app-subtle-text)' }}>
              标签:
            </span>
            {container.tags.map((tag) => (
              <span
                key={tag}
                className="text-[12px] px-2 py-0.5 rounded"
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
          {container.note && (
            <span className="text-[12px]" style={{ color: 'var(--app-subtle-text)' }}>
              {container.note.slice(0, 24)}
              {container.note.length > 24 ? '...' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
