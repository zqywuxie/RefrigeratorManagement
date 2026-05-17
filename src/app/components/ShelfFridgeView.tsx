import React, { useCallback, useEffect, useState } from 'react';
import { createUpperItem, deleteUpperItem, fetchUpperItems, updateUpperItem } from '../api';
import { Refrigerator, UpperItem } from '../types';
import { AddItemModal } from './AddItemModal';
import { UpperOpenStorage } from './UpperOpenStorage';

interface ShelfFridgeViewProps {
  fridge: Refrigerator;
  currentUsername: string;
  itemTypes: string[];
  onAddItemType: (name: string) => void;
  navigateToItem?: { itemId: string } | null;
  onItemNavigated?: () => void;
  onItemsChange?: (items: UpperItem[]) => void;
}

const SHELF_ROWS = 4;

export function ShelfFridgeView({
  fridge,
  currentUsername,
  itemTypes,
  onAddItemType,
  navigateToItem,
  onItemNavigated,
  onItemsChange,
}: ShelfFridgeViewProps) {
  const [items, setItems] = useState<UpperItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<UpperItem | null>(null);
  const [defaultRow, setDefaultRow] = useState(1);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchUpperItems(fridge.id)
      .then((nextItems) => {
        setItems(nextItems);
        onItemsChange?.(nextItems);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [fridge.id]);

  useEffect(() => {
    if (!navigateToItem) return;
    setHighlightedItemId(navigateToItem.itemId);
    onItemNavigated?.();
  }, [navigateToItem, onItemNavigated]);

  useEffect(() => {
    if (!highlightedItemId) return;
    const timer = window.setTimeout(() => setHighlightedItemId(null), 4500);
    return () => window.clearTimeout(timer);
  }, [highlightedItemId]);

  const handleOpenAdd = useCallback((row: number) => {
    setEditItem(null);
    setDefaultRow(row);
    setShowItemModal(true);
  }, []);

  const handleItemClick = useCallback((id: string) => {
    const item = items.find((candidate) => candidate.id === id) || null;
    setEditItem(item);
    setDefaultRow(item?.row_number || 1);
    setShowItemModal(true);
  }, [items]);

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
        onItemsChange?.(nextItems);
      } catch (err) {
        console.error('Failed to save shelf item:', err);
      }
    },
    [fridge.id, editItem, onItemsChange],
  );

  const handleDeleteItem = useCallback(async (id: string) => {
    if (!window.confirm('确定删除此物品？')) return;
    try {
      await deleteUpperItem(id);
      const nextItems = items.filter((item) => item.id !== id);
      setItems(nextItems);
      onItemsChange?.(nextItems);
    } catch (err) {
      console.error('Failed to delete shelf item:', err);
    }
  }, [items, onItemsChange]);

  return (
    <div className="flex w-full max-w-full lg:max-w-[680px] flex-col gap-4">
      {loading && items.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center">
          <span style={{ color: 'var(--app-muted)' }}>加载中...</span>
        </div>
      ) : (
        <UpperOpenStorage
          items={items}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onItemClick={handleItemClick}
          onAddItem={handleOpenAdd}
          onDeleteItem={handleDeleteItem}
          itemTypes={itemTypes}
          currentUser={currentUsername}
          highlightedItemId={highlightedItemId}
          rowCount={SHELF_ROWS}
          title="四层大空间冰箱"
        />
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
