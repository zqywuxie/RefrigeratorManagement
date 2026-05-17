import React, { useCallback, useEffect, useState } from 'react';
import { createUpperItem, deleteUpperItem, fetchUpperItems, updateUpperItem, createStandaloneBox, fetchBoxCells, fetchBoxTubes } from '../api';
import { Refrigerator, UpperItem, Box, BoxCell, Tube } from '../types';
import { AddItemModal } from './AddItemModal';
import { UpperOpenStorage } from './UpperOpenStorage';
import { BoxGrid } from './BoxGrid';
import { ChevronLeft } from 'lucide-react';

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

  // Box grid view state (precise mode)
  const [viewingBox, setViewingBox] = useState<Box | null>(null);
  const [viewingCells, setViewingCells] = useState<BoxCell[]>([]);
  const [viewingTubes, setViewingTubes] = useState<Tube[]>([]);

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
    if (!viewingBox) return;
    Promise.all([
      fetchBoxCells(viewingBox.id).catch(() => []),
      fetchBoxTubes(viewingBox.id).catch(() => []),
    ]).then(([cells, tubes]) => {
      setViewingCells(cells);
      setViewingTubes(tubes);
    });
  }, [viewingBox]);

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

  const handleItemClick = useCallback(async (itemId: string) => {
    const item = items.find((i) => i.id === itemId) || null;
    if (item && item.box_mode === 'precise' && item.grid_rows && item.grid_cols) {
      try {
        await createStandaloneBox({
          id: item.id,
          name: item.name,
          mode: 'precise',
          grid_rows: item.grid_rows,
          grid_cols: item.grid_cols,
          sample_type: item.item_type,
          owner: item.owner,
        } as any);
      } catch { /* box may already exist */ }

      setViewingBox({
        id: item.id,
        drawer_id: '',
        name: item.name,
        mode: 'precise',
        grid_rows: item.grid_rows,
        grid_cols: item.grid_cols,
        position: null,
        sample_type: item.item_type,
        project_name: null,
        quantity: item.quantity,
        owner: item.owner,
        tags: item.tags,
        note: item.note,
        data_path: null,
        created_at: item.created_at,
        updated_at: item.updated_at,
      });
      return;
    }
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

  // Refresh box data after cell/tube changes
  const handleBoxDataChanged = useCallback(async () => {
    if (!viewingBox) return;
    const [cells, tubes] = await Promise.all([
      fetchBoxCells(viewingBox.id).catch(() => []),
      fetchBoxTubes(viewingBox.id).catch(() => []),
    ]);
    setViewingCells(cells);
    setViewingTubes(tubes);
  }, [viewingBox]);

  if (viewingBox) {
    return (
      <div className="flex w-full max-w-full flex-col gap-4">
        <button
          type="button"
          onClick={() => { setViewingBox(null); setViewingCells([]); setViewingTubes([]); }}
          className="flex items-center gap-1 text-[14px] hover:opacity-80 min-h-[44px]"
          style={{ color: 'var(--app-muted)' }}
        >
          <ChevronLeft size={16} />
          返回物品列表
        </button>
        <div className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
          {viewingBox.name}
        </div>
        <BoxGrid
          box={viewingBox}
          cells={viewingCells}
          tubes={viewingTubes}
          matchedIds={new Set()}
          onBack={() => { setViewingBox(null); setViewingCells([]); setViewingTubes([]); }}
          onCellClick={() => {}}
          onTubeHover={() => {}}
        />
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex w-full max-w-full lg:max-w-[680px] flex-col gap-4">
        <div className="flex h-[180px] items-center justify-center">
          <span style={{ color: 'var(--app-muted)' }}>加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-4">
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
