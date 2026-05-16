import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Plus } from 'lucide-react';
import { UpperItem, getItemTypeConfig, ItemType } from '../types';
import { ItemCard } from './ItemCard';

interface UpperOpenStorageProps {
  items: UpperItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onItemClick: (id: string) => void;
  onAddItem: (rowNumber: number) => void;
  onDeleteItem?: (id: string) => void;
  itemTypes: string[];
  currentUser?: string;
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
}: UpperOpenStorageProps) {
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all');
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
          <div className="flex items-center justify-between">
            <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>
              第 {row} 行 · {rowItems.length} 件
            </span>
            <button
              onClick={() => onAddItem(row)}
              className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-lg hover:opacity-80 min-h-[44px]"
              style={{ color: '#2563eb' }}
            >
              <Plus size={14} />添加
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-2">
            {rowItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isHighlighted={searchQuery.length > 0}
                  onClick={() => onItemClick(item.id)}
                  onDelete={onDeleteItem}
                  canDelete={!item.owner || item.owner === currentUser}
                />
            ))}
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
          </div>
        </div>
      ))}
    </div>
  );
}
