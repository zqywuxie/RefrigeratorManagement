import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useDrag } from 'react-dnd';
import { toast } from 'sonner';
import { Box as BoxIcon, User, Calendar, Grid3X3, FolderOpen, Copy, Trash2, MapPinned, Maximize2, X, ArrowRightLeft } from 'lucide-react';
import { Box, BoxImage, boxPositionToLabel, formatChineseShortDate } from '../types';

interface BoxCardProps {
  box: Box;
  onClick: () => void;
  onDelete: (id: string) => void;
  onMove?: (box: Box) => void;
  canDelete?: boolean;
  canMove?: boolean;
  isHighlighted?: boolean;
  images?: BoxImage[];
}

export function BoxCard({ box, onClick, onDelete, onMove, canDelete = true, canMove = true, isHighlighted = false, images }: BoxCardProps) {
  const isPrecise = box.mode === 'precise';
  const gridLabel = isPrecise && box.grid_rows && box.grid_cols
    ? `${box.grid_rows}×${box.grid_cols}`
    : null;
  const tags = Array.isArray(box.tags) ? box.tags : [];
  const [previewImage, setPreviewImage] = React.useState<BoxImage | null>(null);
  const ignoreNextCardClickRef = React.useRef(false);
  const [{ isDragging }, drag] = useDrag({
    type: 'BOX',
    item: { id: box.id, position: box.position },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const copyText = React.useCallback(async (text: string) => {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
    return copied;
  }, []);

  return (
    <motion.div
      ref={drag}
      role="button"
      tabIndex={0}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        if (ignoreNextCardClickRef.current) {
          ignoreNextCardClickRef.current = false;
          return;
        }
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="relative w-full rounded-xl px-5 py-4 cursor-pointer"
      animate={isHighlighted ? { boxShadow: ['0 0 12px rgba(34,211,238,0.25)', '0 0 22px rgba(34,211,238,0.45)', '0 0 12px rgba(34,211,238,0.25)'] } : undefined}
      transition={isHighlighted ? { repeat: Infinity, duration: 1.2 } : undefined}
      style={{
        background: 'var(--app-card-bg)',
        border: isHighlighted ? '2px solid #22d3ee' : '1.5px solid var(--app-border)',
        boxShadow: isHighlighted ? '0 0 18px rgba(34,211,238,0.35)' : '0 4px 16px rgba(15,23,42,0.06)',
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      {/* Top row: name + badges + actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: isPrecise ? '#dbeafe' : '#f1f5f9',
              color: isPrecise ? '#2563eb' : '#94a3b8',
            }}
          >
            <BoxIcon size={16} />
          </div>
          <span className="text-[16px] font-medium truncate" style={{ color: 'var(--app-text)' }}>
            {box.name}
          </span>
          {isPrecise && gridLabel && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0"
              style={{ background: '#dbeafe', color: '#1d4ed8' }}
            >
              <Grid3X3 size={10} />
              {gridLabel}
            </span>
          )}
        </div>
        {(canMove || canDelete) && (
          <div className="flex gap-0.5 flex-shrink-0">
            {canMove && onMove && (
              <button
                onClick={(e) => { e.stopPropagation(); onMove(box); }}
                className="w-7 h-7 min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center transition-colors hover:bg-blue-50"
                style={{ color: '#2563eb' }}
                title="移动盒子"
                aria-label="移动盒子"
              >
                <ArrowRightLeft size={14} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(box.id); }}
                className="w-7 h-7 min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                style={{ color: '#f87171' }}
                title="删除盒子"
                aria-label="删除盒子"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
        {box.sample_type && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] flex-shrink-0" style={{ color: '#94a3b8' }}>类型</span>
            <span className="text-[13px] truncate" style={{ color: 'var(--app-text)' }}>{box.sample_type}</span>
          </div>
        )}
        {box.project_name && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] flex-shrink-0" style={{ color: '#94a3b8' }}>项目</span>
            <span className="text-[13px] truncate" style={{ color: 'var(--app-text)' }}>{box.project_name}</span>
          </div>
        )}
        {box.owner && (
          <div className="flex items-center gap-1.5">
            <User size={11} style={{ color: '#94a3b8' }} />
            <span className="text-[13px] truncate" style={{ color: 'var(--app-text)' }}>{box.owner}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar size={11} style={{ color: '#94a3b8' }} />
          <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>{formatChineseShortDate(box.created_at)}</span>
        </div>
        {box.position != null && (
          <div className="flex items-center gap-1.5">
            <MapPinned size={11} style={{ color: '#94a3b8' }} />
            <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>{boxPositionToLabel(box.position)}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded"
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
      )}

      {/* Note */}
      {box.note && (
        <p className="mt-2 text-[12px] opacity-70 truncate" style={{ color: 'var(--app-muted)' }}>
          {box.note}
        </p>
      )}

      {/* Data path */}
      {box.data_path && (
        <div
          className="flex items-center gap-1.5 mt-2 text-[11px] rounded-md px-2.5 py-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            background: 'var(--app-input-bg)',
            border: '1px solid var(--app-input-border)',
            color: 'var(--app-muted)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            void (async () => {
              try {
                const ok = await copyText(box.data_path!);
                toast.custom(
                  () => (
                    <div
                      data-testid="copy-toast"
                      className="min-w-[360px] max-w-[520px] rounded-xl px-5 py-4 shadow-2xl"
                      style={{
                        background: 'var(--popover)',
                        color: 'var(--popover-foreground)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div className="text-[16px] font-semibold">
                        {ok ? '数据路径已复制' : '复制失败'}
                      </div>
                      <div className="mt-1 text-[13px] leading-5 opacity-80 break-all">
                        {box.data_path}
                      </div>
                    </div>
                  ),
                  { duration: 1800 },
                );
              } catch {
                toast.custom(
                  () => (
                    <div
                      className="min-w-[360px] max-w-[520px] rounded-xl px-5 py-4 shadow-2xl"
                      style={{
                        background: 'var(--popover)',
                        color: 'var(--popover-foreground)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div className="text-[16px] font-semibold">复制失败</div>
                      <div className="mt-1 text-[13px] leading-5 opacity-80 break-all">
                        浏览器当前环境不支持自动复制，请手动选中路径
                      </div>
                    </div>
                  ),
                  { duration: 2200 },
                );
              }
            })();
          }}
          title="点击复制路径"
        >
          <FolderOpen size={11} color="#60a5fa" />
          <span className="truncate flex-1">{box.data_path}</span>
          <Copy size={10} />
        </div>
      )}

      {/* Image thumbnails */}
      {images && images.length > 0 && (
        <>
          <div className="mt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {images.slice(0, 6).map((img) => (
                <button
                  key={img.id}
                  type="button"
                  className="relative flex-shrink-0 w-14 h-14 rounded-md overflow-hidden text-left"
                  style={{ border: '1px solid var(--app-border)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(img);
                  }}
                  title="点击放大查看"
                >
                  <img src={`/${img.image_path}`} alt={img.original_name || ''} className="w-full h-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all hover:bg-black/25 hover:opacity-100">
                    <Maximize2 size={14} />
                  </span>
                </button>
              ))}
              {images.length > 6 && (
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-md flex items-center justify-center text-[11px] font-medium"
                  style={{
                    border: '1px solid var(--app-border)',
                    background: 'var(--app-input-bg)',
                    color: 'var(--app-muted)',
                  }}
                >
                  +{images.length - 6}
                </div>
              )}
            </div>
          </div>
          {previewImage && (
            createPortal(
              <div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
                onClick={(e) => {
                  e.stopPropagation();
                  ignoreNextCardClickRef.current = true;
                  window.setTimeout(() => {
                    ignoreNextCardClickRef.current = false;
                  }, 0);
                  setPreviewImage(null);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label="关闭图片预览"
                  className="absolute right-4 top-4 rounded-full p-2 text-white"
                  style={{ background: 'rgba(15,23,42,0.72)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    ignoreNextCardClickRef.current = true;
                    window.setTimeout(() => {
                      ignoreNextCardClickRef.current = false;
                    }, 0);
                    setPreviewImage(null);
                  }}
                >
                  <X size={20} />
                </button>
                <img
                  src={`/${previewImage.image_path}`}
                  alt={previewImage.original_name || '盒子图片'}
                  className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>,
              document.body,
            )
          )}
        </>
      )}
    </motion.div>
  );
}
