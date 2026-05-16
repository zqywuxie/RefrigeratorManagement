import React from 'react';
import { useDrop } from 'react-dnd';
import { ArrowLeft, Grid3X3 } from 'lucide-react';
import { Box, BoxCell, Tube, STATUS_CONFIG } from '../types';
import { CellSlot } from './CellSlot';

interface BoxGridProps {
  box: Box;
  cells?: BoxCell[];
  tubes?: Tube[];
  matchedIds: Set<string>;
  multiSelect?: boolean;
  selectedPositions?: Set<number>;
  hoveredSampleId?: string | null;
  visibleRowStart?: number;
  visibleRowEnd?: number;
  onBack: () => void;
  onCellClick: (position: number) => void;
  onMultiSelectToggle?: (position: number) => void;
  onMultiSelectConfirm?: (positions: number[]) => void;
  onTubeHover?: (sampleId: string | null) => void;
  onPendingSampleDrop?: (importData: any, position: number) => void;
  onTubeMove?: (tubeId: string, fromPosition: number, toPosition: number) => void;
}

function DropCellWrapper({
  position,
  isOccupied,
  children,
  onDrop,
  onTubeDrop,
}: {
  position: number;
  isOccupied: boolean;
  children: React.ReactNode;
  onDrop: (importData: any, position: number) => void;
  onTubeDrop?: (tubeId: string, fromPosition: number, toPosition: number) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['PENDING_SAMPLE', 'TUBE'],
    drop: (item: any) => {
      if (item.tube_id) {
        onTubeDrop?.(item.tube_id, item.position, position);
      } else {
        onDrop(item, position);
      }
    },
    canDrop: (item: any) => {
      if (item.tube_id) {
        return item.position !== position; // Can drop on any position except own
      }
      return !isOccupied;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={drop}
      className="relative"
      style={{
        outline: isOver && canDrop ? '2px dashed #06b6d4' : 'none',
        outlineOffset: 1,
        borderRadius: '6px',
        background: isOver && canDrop ? 'rgba(6,182,212,0.1)' : 'transparent',
      }}
    >
      {children}
    </div>
  );
}

export function BoxGrid({
  box,
  cells,
  tubes,
  matchedIds,
  multiSelect = false,
  selectedPositions = new Set(),
  hoveredSampleId,
  visibleRowStart,
  visibleRowEnd,
  onBack,
  onCellClick,
  onMultiSelectToggle,
  onMultiSelectConfirm,
  onTubeHover,
  onPendingSampleDrop,
  onTubeMove,
}: BoxGridProps) {
  const rows = box.grid_rows || 10;
  const cols = box.grid_cols || 10;
  const capacity = rows * cols;
  const startRow = Math.max(0, Math.min(visibleRowStart ?? 0, rows - 1));
  const endRow = Math.max(startRow, Math.min(visibleRowEnd ?? rows - 1, rows - 1));
  const visibleRowCount = endRow - startRow + 1;
  const visiblePositions = React.useMemo(
    () => Array.from({ length: visibleRowCount * cols }, (_, index) => startRow * cols + index),
    [cols, startRow, visibleRowCount],
  );

  // Build tube or cell lookup by position
  const tubeByPosition = React.useMemo(() => {
    if (!tubes) return new Map();
    const map = new Map<number, Tube>();
    for (const t of tubes) map.set(t.position, t);
    return map;
  }, [tubes]);

  const cellByPosition = React.useMemo(() => {
    if (!cells) return new Map();
    const map = new Map<number, BoxCell>();
    for (const c of cells) map.set(c.position, c);
    return map;
  }, [cells]);

  const entities = tubes || cells || [];
  const filledCount = tubes
    ? new Set(tubes.map((t) => t.position)).size
    : cells
      ? cells.length
      : 0;

  // Group tubes by sample_id for highlighting
  const tubeSampleMap = React.useMemo(() => {
    if (!tubes) return new Map<string, Set<number>>();
    const map = new Map<string, Set<number>>();
    for (const t of tubes) {
      if (!map.has(t.sample_id)) map.set(t.sample_id, new Set());
      map.get(t.sample_id)!.add(t.position);
    }
    return map;
  }, [tubes]);

  // Positions that should be highlighted as part of hovered sample group
  const groupedPositions = React.useMemo(() => {
    if (!hoveredSampleId || !tubeSampleMap.has(hoveredSampleId)) return new Set<number>();
    return tubeSampleMap.get(hoveredSampleId)!;
  }, [hoveredSampleId, tubeSampleMap]);

  const statusCounts = entities.reduce((acc, e) => {
    const s = 'status' in e ? (e as Tube).status : (e as BoxCell).sample_status;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[14px] hover:opacity-80 min-h-[44px]"
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
          const sconfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          return (
            <span
              key={status}
              className="text-[12px] px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: sconfig.bgColor, color: sconfig.color, border: `1px solid ${sconfig.borderColor}60` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sconfig.borderColor }} />
              {sconfig.label} ×{count}
            </span>
          );
        })}
        <span className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
          {filledCount}/{capacity} 占用
        </span>
      </div>

      <div
        className="rounded-xl p-4 overflow-x-auto"
        style={{
          background: 'var(--app-card-bg)',
          border: '1px solid var(--app-border)',
          boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
        }}
      >
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(28px, 1fr))`,
            gridTemplateRows: `repeat(${visibleRowCount}, minmax(28px, auto))`,
          }}
        >
          {visiblePositions.map((position) => {
            const tube = tubeByPosition.get(position);
            const cell = cellByPosition.get(position);
            const isCellHighlighted = cell ? matchedIds.has(cell.id) : false;
            const isTubeHighlighted = tube ? matchedIds.has(tube.id) : false;
            const isGrouped = tube ? groupedPositions.has(position) : false;
            const isSelected = selectedPositions.has(position);
            const isOccupied = !!tube || !!cell;

            const cellElement = (
              <CellSlot
                key={`cell-${position}`}
                cell={cell}
                tube={tube}
                position={position}
                cols={cols}
                isHighlighted={isCellHighlighted || isTubeHighlighted}
                isGrouped={isGrouped}
                groupColor={tube?.group_color}
                isSelected={isSelected}
                onClick={() => {
                  if (multiSelect && onMultiSelectToggle) {
                    onMultiSelectToggle(position);
                  } else {
                    onCellClick(position);
                  }
                }}
              />
            );

            if (onPendingSampleDrop || onTubeMove) {
              return (
                <DropCellWrapper
                  key={`cell-${position}`}
                  position={position}
                  isOccupied={isOccupied}
                  onDrop={onPendingSampleDrop || (() => {})}
                  onTubeDrop={onTubeMove}
                >
                  {cellElement}
                </DropCellWrapper>
              );
            }

            return cellElement;
          })}
        </div>
      </div>
    </div>
  );
}
