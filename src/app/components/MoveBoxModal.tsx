import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { Box, Drawer, boxPositionToLabel } from '../types';
import { fetchBoxes } from '../api';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from './ui/responsive-dialog';

interface MoveBoxModalProps {
  isOpen: boolean;
  box: Box | null;
  drawers: Drawer[];
  currentDrawerId: string | null;
  onClose: () => void;
  onMove: (boxId: string, targetDrawerId: string, targetPosition: number) => Promise<void>;
}

export function MoveBoxModal({
  isOpen,
  box,
  drawers,
  currentDrawerId,
  onClose,
  onMove,
}: MoveBoxModalProps) {
  const [targetDrawerId, setTargetDrawerId] = useState('');
  const [targetPosition, setTargetPosition] = useState<number | null>(null);
  const [targetBoxes, setTargetBoxes] = useState<Box[]>([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');
  const positionsScrollRef = useRef<HTMLDivElement | null>(null);
  const dragScrollRef = useRef({
    active: false,
    moved: false,
    startY: 0,
    startScrollTop: 0,
  });

  useEffect(() => {
    if (!isOpen || !box) return;
    setTargetDrawerId(currentDrawerId || box.drawer_id || drawers[0]?.id || '');
    setTargetPosition(box.position ?? null);
    setError('');
  }, [isOpen, box, currentDrawerId, drawers]);

  useEffect(() => {
    if (!isOpen || !targetDrawerId) {
      setTargetBoxes([]);
      return;
    }

    let alive = true;
    setLoadingBoxes(true);
    fetchBoxes(targetDrawerId)
      .then((items) => {
        if (alive) setTargetBoxes(items);
      })
      .catch((err) => {
        if (alive) {
          setTargetBoxes([]);
          setError(err.message || '加载目标抽屉失败');
        }
      })
      .finally(() => {
        if (alive) setLoadingBoxes(false);
      });

    return () => {
      alive = false;
    };
  }, [isOpen, targetDrawerId]);

  const targetDrawer = useMemo(
    () => drawers.find((drawer) => drawer.id === targetDrawerId) || null,
    [drawers, targetDrawerId],
  );

  const sortedDrawers = useMemo(
    () => [...drawers].sort((a, b) => a.layer - b.layer || a.row_pos - b.row_pos || a.col_pos - b.col_pos),
    [drawers],
  );

  const layerMaps = useMemo(() => {
    const layers = Array.from(new Set(sortedDrawers.map((drawer) => drawer.layer))).sort((a, b) => a - b);
    return layers.map((layer) => {
      const layerDrawers = sortedDrawers.filter((drawer) => drawer.layer === layer);
      const rows = Math.max(1, ...layerDrawers.map((drawer) => drawer.row_pos + 1));
      const cols = Math.max(1, ...layerDrawers.map((drawer) => drawer.col_pos + 1));
      return { layer, drawers: layerDrawers, rows, cols };
    });
  }, [sortedDrawers]);

  const occupiedByPosition = useMemo(() => {
    const map = new Map<number, Box>();
    for (const item of targetBoxes) {
      if (item.position != null && item.id !== box?.id) map.set(item.position, item);
    }
    return map;
  }, [box?.id, targetBoxes]);

  const capacity = Math.max(5, targetDrawer?.max_boxes || 5);
  const targetOccupyingBox = targetPosition == null ? null : occupiedByPosition.get(targetPosition) || null;
  const isSameLocation =
    !!box &&
    targetDrawerId === box.drawer_id &&
    targetPosition != null &&
    targetPosition === box.position;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!box || !targetDrawerId || targetPosition == null) return;
    setMoving(true);
    setError('');
    try {
      await onMove(box.id, targetDrawerId, targetPosition);
      onClose();
    } catch (err: any) {
      setError(err.message || '移动盒子失败');
    } finally {
      setMoving(false);
    }
  };

  const handlePositionScrollPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = positionsScrollRef.current;
    if (!target) return;
    dragScrollRef.current = {
      active: true,
      moved: false,
      startY: event.clientY,
      startScrollTop: target.scrollTop,
    };
  };

  const handlePositionScrollPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = positionsScrollRef.current;
    const drag = dragScrollRef.current;
    if (!target || !drag.active) return;

    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.abs(deltaY) <= 12) return;
    drag.moved = true;
    target.scrollTop = drag.startScrollTop - deltaY;
    event.preventDefault();
  };

  const handlePositionScrollPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    dragScrollRef.current.active = false;
    window.setTimeout(() => {
      dragScrollRef.current.moved = false;
    }, 120);
  };

  const panelStyle: React.CSSProperties = {
    background: 'var(--app-input-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-text)',
  };

  if (!box) return null;

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => { if (!open && !moving) onClose(); }}>
      <ResponsiveDialogContent className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>移动盒子</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {box.name} · 选择目标抽屉和精确内部位置
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                  目标抽屉
                </label>
                <span className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                  {targetDrawer ? `抽屉 ${targetDrawer.label}` : '请选择'}
                </span>
              </div>
              <div className="space-y-2 rounded-xl p-2" style={panelStyle}>
                {layerMaps.map(({ layer, drawers: layerDrawers, rows, cols }) => (
                  <div key={layer} className="space-y-1">
                    <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                      {layer === 1 ? '下层第一层' : '下层第二层'}
                    </div>
                    <div
                      className="grid gap-1"
                      style={{
                        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: rows * cols }, (_, index) => {
                        const row = Math.floor(index / cols);
                        const col = index % cols;
                        const drawer = layerDrawers.find((item) => item.row_pos === row && item.col_pos === col);
                        if (!drawer) {
                          return <div key={`empty-${layer}-${index}`} className="min-h-[34px]" />;
                        }

                        const used = drawer.box_count ?? 0;
                        const max = Math.max(5, drawer.max_boxes || 5);
                        const isSelected = drawer.id === targetDrawerId;
                        const isCurrentDrawer = drawer.id === box.drawer_id;
                        const isFull = used >= max && !isCurrentDrawer;

                        return (
                          <button
                            key={drawer.id}
                            type="button"
                            disabled={moving}
                            onClick={() => {
                              setTargetDrawerId(drawer.id);
                              setTargetPosition(null);
                              setError('');
                            }}
                            className="flex min-h-[34px] items-center justify-center rounded-md px-2 py-1 text-center transition-all disabled:opacity-55"
                            style={{
                              background: isSelected ? '#dbeafe' : isCurrentDrawer ? 'var(--app-subtle-bg)' : isFull ? '#fef2f2' : 'var(--app-card-bg)',
                              border: isSelected ? '1.5px solid #2563eb' : isFull ? '1px solid #fecaca' : '1px solid var(--app-border)',
                              color: isSelected ? '#1d4ed8' : isCurrentDrawer ? 'var(--app-subtle-text)' : 'var(--app-text)',
                            }}
                            title={`${layer === 1 ? '下层第一层' : '下层第二层'} · 抽屉 ${drawer.label}${isCurrentDrawer ? ' · 当前抽屉' : ''}${isFull ? ' · 已满' : ''}`}
                            aria-label={`选择抽屉 ${drawer.label}`}
                          >
                            <span className="font-mono text-[13px] font-semibold leading-none">{drawer.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between">
                <label className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                  目标内部位置
                </label>
                <span className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                  {loadingBoxes ? '加载中...' : `${targetBoxes.length}/${capacity}`}
                </span>
              </div>
              <div
                ref={positionsScrollRef}
                onPointerDown={handlePositionScrollPointerDown}
                onPointerMove={handlePositionScrollPointerMove}
                onPointerUp={handlePositionScrollPointerEnd}
                onPointerCancel={handlePositionScrollPointerEnd}
                className="grid max-h-[360px] touch-pan-y select-none grid-cols-1 gap-2 overflow-y-auto rounded-xl p-2"
                style={panelStyle}
              >
                {Array.from({ length: capacity }, (_, position) => {
                  const occupying = occupiedByPosition.get(position) || null;
                  const isSelected = targetPosition === position;
                  const isCurrent = targetDrawerId === box.drawer_id && position === box.position;

                  return (
                    <button
                      key={position}
                      type="button"
                      data-testid="move-box-position-option"
                      data-position={position}
                      disabled={loadingBoxes || moving}
                      onClick={() => {
                        if (dragScrollRef.current.moved) return;
                        setTargetPosition(position);
                        setError('');
                      }}
                      className="flex min-h-[52px] items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-all disabled:cursor-not-allowed disabled:opacity-45"
                      style={{
                        background: isSelected ? '#dbeafe' : 'var(--app-card-bg)',
                        border: isSelected ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                        color: isSelected ? '#1d4ed8' : 'var(--app-text)',
                      }}
                    >
                      <span>{boxPositionToLabel(position)}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={{
                          background: isCurrent ? '#e2e8f0' : occupying ? '#fef3c7' : '#dcfce7',
                          color: isCurrent ? '#64748b' : occupying ? '#92400e' : '#15803d',
                        }}
                      >
                        {isCurrent ? '当前位置' : occupying ? '交换' : '空位'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="rounded-lg px-3 py-2 text-[12px]"
            style={{
              background: targetOccupyingBox ? '#fffbeb' : 'var(--app-input-bg)',
              border: targetOccupyingBox ? '1px solid #fde68a' : '1px solid var(--app-input-border)',
              color: targetOccupyingBox ? '#92400e' : 'var(--app-muted)',
            }}
          >
            {targetPosition == null
              ? '请选择一个目标内部位置。'
              : targetOccupyingBox
                ? `目标位置已有「${targetOccupyingBox.name}」，确认后两个盒子会交换位置。`
                : '目标位置为空，确认后盒子会移动到该位置。'}
          </div>

          {error && (
            <div
              className="rounded-lg px-3 py-2 text-[13px]"
              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
            >
              {error}
            </div>
          )}

          <ResponsiveDialogFooter
            className="sticky bottom-0 z-10 -mx-4 mt-2 border-t px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:static md:mx-0 md:mt-0 md:border-t-0 md:p-0"
            style={{ background: 'var(--app-card-bg)', borderColor: 'var(--app-border)' }}
          >
            <button
              type="button"
              disabled={moving}
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-[14px] min-h-[44px] disabled:opacity-50"
              style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)', border: '1px solid var(--app-border)' }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={moving || loadingBoxes || targetPosition == null || isSameLocation}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-[14px] disabled:opacity-50"
              style={{ background: '#2563eb', color: '#fff' }}
            >
              {moving ? <Loader2 size={15} className="animate-spin" /> : <ArrowRightLeft size={15} />}
              确认移动
            </button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
