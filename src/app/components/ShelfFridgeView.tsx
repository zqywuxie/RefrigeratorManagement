import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Thermometer } from 'lucide-react';
import { createUpperItem, deleteUpperItem, fetchUpperItems, updateUpperItem } from '../api';
import { Refrigerator, UpperItem } from '../types';
import { AddItemModal } from './AddItemModal';
import { ItemCard } from './ItemCard';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';

interface ShelfFridgeViewProps {
  fridge: Refrigerator;
  currentUsername: string;
  itemTypes: string[];
  onAddItemType: (name: string) => void;
}

const SHELF_ROWS = 4;

export function ShelfFridgeView({ fridge, currentUsername, itemTypes, onAddItemType }: ShelfFridgeViewProps) {
  const [items, setItems] = useState<UpperItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<UpperItem | null>(null);
  const [defaultRow, setDefaultRow] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetchUpperItems(fridge.id)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [fridge.id]);

  const rows = useMemo(
    () =>
      Array.from({ length: SHELF_ROWS }, (_, index) => {
        const row = index + 1;
        return {
          row,
          label: `第 ${row} 层大空间`,
          items: items.filter((item) => item.row_number === row),
          temperature: row <= 2 ? fridge.upperTemperature : fridge.lowerTemperature,
        };
      }),
    [items, fridge.upperTemperature, fridge.lowerTemperature],
  );

  const handleOpenAdd = useCallback((row: number) => {
    setEditItem(null);
    setDefaultRow(row);
    setShowItemModal(true);
  }, []);

  const handleSaveItem = useCallback(
    async (data: Partial<UpperItem>) => {
      try {
        if (data.id && editItem) {
          await updateUpperItem(data.id, data);
        } else {
          await createUpperItem(fridge.id, data);
        }
        const nextItems = await fetchUpperItems(fridge.id);
        setItems(nextItems);
      } catch (err) {
        console.error('Failed to save shelf item:', err);
      }
    },
    [fridge.id, editItem],
  );

  const handleItemClick = useCallback((id: string) => {
    const item = items.find((candidate) => candidate.id === id) || null;
    setEditItem(item);
    setDefaultRow(item?.row_number || 1);
    setShowItemModal(true);
  }, [items]);

  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      await deleteUpperItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete shelf item:', err);
    }
  }, []);

  return (
    <div className="flex w-full max-w-[680px] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
            四层大空间冰箱
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--app-muted)' }}>
            与主冰箱上层一致的开放式物品存储
          </div>
        </div>
        <div className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--app-muted)' }}>
          <Thermometer size={14} />
          {fridge.upperTemperature}° / {fridge.lowerTemperature}°
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center">
          <span style={{ color: 'var(--app-muted)' }}>加载中...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(({ row, label, items: rowItems, temperature }) => (
            <section key={row} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>
                    第 {row} 行 · {rowItems.length} 件
                  </span>
                  <span className="text-[11px] font-mono" style={{ color: row <= 2 ? '#2563eb' : '#15803d' }}>
                    {temperature}°C
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAdd(row)}
                  className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-lg hover:opacity-80"
                  style={{ color: '#2563eb' }}
                >
                  <Plus size={14} />添加
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {rowItems.map((item) => (
                  <div key={item.id} className="relative group">
                    <ItemCard
                      item={item}
                      isHighlighted={false}
                      onClick={() => handleItemClick(item.id)}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] text-white shadow-lg group-hover:flex"
                      title="删除物品"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  onClick={() => handleOpenAdd(row)}
                  className="flex-shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    width: '200px',
                    height: '88px',
                    borderColor: 'var(--slot-empty-border)',
                    background: 'var(--slot-empty-bg)',
                    color: 'var(--app-muted)',
                  }}
                >
                  <Plus size={18} />
                  <span className="text-[13px]">添加物品</span>
                </motion.button>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                {label}
              </div>
            </section>
          ))}
        </div>
      )}

      <AddItemModal
        isOpen={showItemModal}
        editItem={editItem}
        defaultRow={defaultRow}
        currentUsername={currentUsername}
        itemTypes={itemTypes}
        onAddItemType={onAddItemType}
        onClose={() => { setShowItemModal(false); setEditItem(null); }}
        onSave={handleSaveItem}
      />
    </div>
  );
}
