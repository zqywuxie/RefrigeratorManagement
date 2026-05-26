import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useDrag } from 'react-dnd';
import { Package, User, Grid3X3, Trash2, X } from 'lucide-react';
import { UpperItem, getItemTypeConfig, UpperItemImage } from '../types';
import { fetchUpperItemImages } from '../api';

interface ItemCardProps {
  item: UpperItem;
  isHighlighted: boolean;
  onClick: () => void;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

export function ItemCard({ item, isHighlighted, onClick, onDelete, canDelete = false }: ItemCardProps) {
  const typeConfig = getItemTypeConfig(item.item_type);
  const [firstImage, setFirstImage] = useState<UpperItemImage | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    if (item.id) {
      fetchUpperItemImages(item.id)
        .then((imgs) => setFirstImage(imgs.length > 0 ? imgs[0] : null))
        .catch(() => setFirstImage(null));
    }
  }, [item.id]);

  const [{ isDragging }, drag] = useDrag({
    type: 'UPPER_ITEM',
    item: { id: item.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <>
      <motion.button
        ref={drag}
        onClick={onClick}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
        animate={{ opacity: isDragging ? 0.4 : 1 }}
        className="relative w-full rounded-xl px-4 py-3 text-left cursor-pointer transition-shadow min-h-[88px]"
        style={{
          background: 'var(--app-card-bg)',
          border: isHighlighted
            ? '2px solid #3b82f6'
            : '1.5px solid var(--app-border)',
          boxShadow: isHighlighted ? '0 0 12px rgba(59,130,246,0.3)' : '0 4px 16px rgba(15,23,42,0.06)',
        }}
      >
        {canDelete && onDelete && (
          <span
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center hover:bg-red-50 transition-colors z-10 cursor-pointer"
            style={{ color: '#f87171' }}
            title="删除物品"
            role="button"
            tabIndex={0}
          >
            <Trash2 size={12} />
          </span>
        )}
        <div className="flex items-center gap-2 mb-2">
          <Package size={16} color={typeConfig.color} />
          <span className="text-[14px] font-medium truncate" style={{ color: 'var(--app-text)' }}>
            {item.name}
          </span>
          {item.box_mode === 'precise' && item.grid_rows && item.grid_cols && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0"
              style={{ background: '#dbeafe', color: '#1d4ed8' }}
            >
              <Grid3X3 size={10} />
              {item.grid_rows}×{item.grid_cols}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: typeConfig.bgColor, color: typeConfig.color }}
          >
            {typeConfig.label}
          </span>
          <span className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
            ×{item.quantity}
          </span>
        </div>
        {firstImage && (
          <div
            className="mt-2 mb-1 w-full h-24 rounded-lg overflow-hidden cursor-pointer"
            style={{ border: '1px solid var(--app-border)' }}
            onClick={(e) => { e.stopPropagation(); setPreviewSrc(`/${firstImage.image_path}`); }}
          >
            <img src={`/${firstImage.image_path}`} alt={firstImage.original_name || item.name} className="w-full h-full object-cover" />
          </div>
        )}
        {item.owner && (
          <div className="flex items-center gap-1 mt-1.5 text-[11px]" style={{ color: 'var(--app-muted)' }}>
            <User size={11} />
            <span>{item.owner}</span>
          </div>
        )}
      </motion.button>
      {previewSrc && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewSrc(null)}
        >
          <button
            type="button"
            aria-label="关闭图片预览"
            className="absolute right-4 top-4 rounded-full p-2 text-white"
            style={{ background: 'rgba(15,23,42,0.72)' }}
            onClick={() => setPreviewSrc(null)}
          >
            <X size={20} />
          </button>
          <img
            src={previewSrc}
            alt={firstImage?.original_name || item.name}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
