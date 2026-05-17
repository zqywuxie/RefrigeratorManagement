import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { UpperItem, getItemTypeConfig, ItemType } from '../types';
import { ItemCard } from './ItemCard';

const ITEMS_PER_ROW_PAGE = 4;

interface UpperOpenStorageProps {
  items: UpperItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onItemClick: (id: string) => void;
  onAddItem: (rowNumber: number) => void;
  onDeleteItem?: (id: string) => void;
  itemTypes: string[];
  currentUser?: string;
  highlightedItemId?: string | null;
}

export function UpperOpenStorage({
  items,
  searchQuery,
  onSearchChange,
  onItemClick,
  onAddItem,
  onDeleteItem,
  itemTypes,
  currentUser,
  highlightedItemId,
}: UpperOpenStorageProps) {
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all');
  const [rowPages, setRowPages] = useState<Record<number, number>>({ 1: 0, 2: 0 });
  const visibleItemTypes = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.item_type).filter(Boolean))),
    [items],
  );

  const filtered = items.filter((item) => {
    if (filterType !== 'all' && item.item_type !== filterType) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.item_type.includes(q) ||
      (item.owner || '').toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const row1Items = filtered.filter((i) => i.row_number === 1);
  const row2Items = filtered.filter((i) => i.row_number === 2);

  const getPagedItems = (rowItems: UpperItem[], page: number) => {
    const start = page * ITEMS_PER_ROW_PAGE;
    return rowItems.slice(start, start + ITEMS_PER_ROW_PAGE);
  };

  useEffect(() => {
    setRowPages((prev) => ({
      1: Math.min(prev[1] || 0, Math.max(0, Math.ceil(row1Items.length / ITEMS_PER_ROW_PAGE) - 1)),
      2: Math.min(prev[2] || 0, Math.max(0, Math.ceil(row2Items.length / ITEMS_PER_ROW_PAGE) - 1)),
    }));
  }, [row1Items.length, row2Items.length]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
          上层开放存储
        </h3>
        <div className="flex items-center gap-2">
          {(['all', ...visibleItemTypes] as (ItemType | 'all')[]).map((t) => {
            const typeConfig = t === 'all' ? null : getItemTypeConfig(t);
            return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="text-[11px] px-2 py-1 rounded-full transition-all min-h-[44px] flex items-center"
              style={{
                background: filterType === t
                  ? t === 'all'
                    ? '#e2e8f0'
                    : typeConfig?.bgColor || '#e2e8f0'
                  : 'var(--app-subtle-bg)',
                border: filterType === t ? '1px solid var(--app-border)' : '1px solid transparent',
                color: filterType === t
                  ? t === 'all'
                    ? '#475569'
                    : typeConfig?.color
                  : 'var(--app-muted)',
              }}
            >
              {t === 'all' ? '全部' : typeConfig?.label || t}
            </button>
          )})}
        </div>
      </div>

      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 min-h-[44px]"
        style={{
          background: 'var(--app-input-bg)',
          border: '1px solid var(--app-input-border)',
        }}
      >
        <Search size={16} color="var(--app-muted)" />
        <input
          type="text"
          placeholder="搜索上层物品..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{ color: 'var(--app-text)' }}
        />
      </div>

      {[
        { row: 1, items: row1Items },
        { row: 2, items: row2Items },
      ].map(({ row, items: rowItems }) => (
        <div key={row} className="flex flex-col gap-2">
          {(() => {
            const totalPages = Math.max(1, Math.ceil(rowItems.length / ITEMS_PER_ROW_PAGE));
            const currentPage = Math.min(rowPages[row] || 0, totalPages - 1);
            const pagedItems = getPagedItems(rowItems, currentPage);

            return (
              <>
          <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>
                    第 {row} 行 · {rowItems.length} 件
                  </span>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRowPages((prev) => ({ ...prev, [row]: Math.max(0, currentPage - 1) }))}
                        disabled={currentPage === 0}
                        className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-35"
                        style={{
                          background: 'var(--app-subtle-bg)',
                          border: '1px solid var(--app-border)',
                          color: 'var(--app-muted)',
                        }}
                        aria-label={`第 ${row} 行上一页`}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[11px] font-mono" style={{ color: 'var(--app-muted)' }}>
                        {currentPage + 1}/{totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRowPages((prev) => ({ ...prev, [row]: Math.min(totalPages - 1, currentPage + 1) }))}
                        disabled={currentPage >= totalPages - 1}
                        className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-35"
                        style={{
                          background: 'var(--app-subtle-bg)',
                          border: '1px solid var(--app-border)',
                          color: 'var(--app-muted)',
                        }}
                        aria-label={`第 ${row} 行下一页`}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onAddItem(row)}
                  className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-lg hover:opacity-80 min-h-[44px]"
                  style={{ color: '#2563eb' }}
                >
                  <Plus size={14} />添加
                </button>
          </div>
                <div className="grid grid-cols-2 gap-3 pb-2 lg:grid-cols-4">
                  {pagedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      isHighlighted={item.id === highlightedItemId || searchQuery.length > 0}
                      onClick={() => onItemClick(item.id)}
                      onDelete={onDeleteItem}
                      canDelete={!item.owner || item.owner === currentUser}
                    />
                  ))}
                  {rowItems.length === 0 && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      onClick={() => onAddItem(row)}
                      className="rounded-xl border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer min-h-[88px]"
                      style={{
                        borderColor: 'var(--slot-empty-border)',
                        background: 'var(--slot-empty-bg)',
                        color: 'var(--app-muted)',
                      }}
                    >
                      <Plus size={18} />
                      <span className="text-[13px]">添加物品</span>
                    </motion.button>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      ))}
    </div>
  );
}
