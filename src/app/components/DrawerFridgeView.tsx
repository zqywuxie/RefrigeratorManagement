import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Refrigerator, UpperItem, Drawer, Box, BoxCell, DRAWER_LAYER1, DRAWER_LAYER2 } from '../types';
import {
  fetchUpperItems, createUpperItem, updateUpperItem, deleteUpperItem,
  fetchDrawers,
  fetchBoxes, createBox, updateBox, deleteBox,
  fetchBoxCells, createBoxCell, updateBoxCell, deleteBoxCell,
} from '../api';
import { BreadcrumbNav, BreadcrumbNode } from './BreadcrumbNav';
import { UpperOpenStorage } from './UpperOpenStorage';
import { DrawerLayer } from './DrawerLayer';
import { BoxView } from './BoxView';
import { BoxGrid } from './BoxGrid';
import { AddItemModal } from './AddItemModal';
import { AddBoxModal } from './AddBoxModal';

type ViewLevel = 'fridge' | 'drawer' | 'box';

interface DrawerFridgeViewProps {
  fridge: Refrigerator;
  currentUser: string;
}

export function DrawerFridgeView({ fridge }: DrawerFridgeViewProps) {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('fridge');
  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null);
  const [selectedDrawerLabel, setSelectedDrawerLabel] = useState('');
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);

  const [upperItems, setUpperItems] = useState<UpperItem[]>([]);
  const [drawers, setDrawers] = useState<Drawer[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [cells, setCells] = useState<BoxCell[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCellQuery, setSearchCellQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<UpperItem | null>(null);
  const [defaultItemRow, setDefaultItemRow] = useState(1);
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [editBox, setEditBox] = useState<Box | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchUpperItems(fridge.id).catch(() => [] as UpperItem[]),
      fetchDrawers(fridge.id).catch(() => [] as Drawer[]),
    ]).then(([items, drawerData]) => {
      setUpperItems(items);
      setDrawers(drawerData);
      setLoading(false);
    });
  }, [fridge.id]);

  useEffect(() => {
    if (!selectedDrawerId) return;
    setLoading(true);
    fetchBoxes(selectedDrawerId)
      .then(setBoxes)
      .catch(() => setBoxes([]))
      .finally(() => setLoading(false));
  }, [selectedDrawerId]);

  useEffect(() => {
    if (!selectedBox || selectedBox.mode !== 'precise') {
      setCells([]);
      return;
    }
    fetchBoxCells(selectedBox.id)
      .then(setCells)
      .catch(() => setCells([]));
  }, [selectedBox]);

  const matchedCellIds = React.useMemo(() => {
    if (!searchCellQuery.trim()) return new Set<string>();
    const q = searchCellQuery.toLowerCase();
    return new Set(
      cells
        .filter((c) =>
          (c.barcode || '').toLowerCase().includes(q) ||
          (c.sample_name || '').toLowerCase().includes(q) ||
          (c.note || '').toLowerCase().includes(q)
        )
        .map((c) => c.id)
    );
  }, [cells, searchCellQuery]);

  const handleDrawerClick = useCallback((drawerId: string) => {
    const drawer = drawers.find((d) => d.id === drawerId);
    setSelectedDrawerId(drawerId);
    setSelectedDrawerLabel(drawer?.label || '');
    setSelectedBoxId(null);
    setSelectedBox(null);
    setViewLevel('drawer');
    setSearchCellQuery('');
  }, [drawers]);

  const handleBoxClick = useCallback((boxId: string) => {
    const box = boxes.find((b) => b.id === boxId) || null;
    setSelectedBoxId(boxId);
    setSelectedBox(box);
    setViewLevel('box');
  }, [boxes]);

  const handleBackToFridge = useCallback(() => {
    setViewLevel('fridge');
    setSelectedDrawerId(null);
    setSelectedBoxId(null);
    setSelectedBox(null);
    setSearchCellQuery('');
  }, []);

  const handleBackToDrawer = useCallback(() => {
    setViewLevel('drawer');
    setSelectedBoxId(null);
    setSelectedBox(null);
    setSearchCellQuery('');
  }, []);

  const breadcrumbNodes: BreadcrumbNode[] = [{ label: fridge.name }];
  if (viewLevel === 'drawer' || viewLevel === 'box') {
    breadcrumbNodes.push({ label: `抽屉 ${selectedDrawerLabel}`, onClick: handleBackToDrawer });
  }
  if (viewLevel === 'box' && selectedBox) {
    breadcrumbNodes.push({ label: selectedBox.name });
  }

  const handleSaveItem = useCallback(async (data: Partial<UpperItem>) => {
    try {
      if (data.id && editItem) {
        await updateUpperItem(data.id, data);
      } else {
        await createUpperItem(fridge.id, data);
      }
      const items = await fetchUpperItems(fridge.id);
      setUpperItems(items);
    } catch (err) {
      console.error('Failed to save item:', err);
    }
  }, [fridge.id, editItem]);

  const handleItemClick = useCallback((itemId: string) => {
    const item = upperItems.find((i) => i.id === itemId) || null;
    setEditItem(item);
    setDefaultItemRow(item?.row_number || 1);
    setShowItemModal(true);
  }, [upperItems]);

  const handleSaveBox = useCallback(async (data: Partial<Box>) => {
    if (!selectedDrawerId) return;
    try {
      if (data.id && editBox) {
        await updateBox(data.id, data);
      } else {
        await createBox(selectedDrawerId, data);
      }
      const updatedBoxes = await fetchBoxes(selectedDrawerId);
      setBoxes(updatedBoxes);
    } catch (err) {
      console.error('Failed to save box:', err);
    }
  }, [selectedDrawerId, editBox]);

  const handleDeleteBox = useCallback(async (boxId: string) => {
    try {
      await deleteBox(boxId);
      setBoxes((prev) => prev.filter((b) => b.id !== boxId));
    } catch (err) {
      console.error('Failed to delete box:', err);
    }
  }, []);

  const handleCellClick = useCallback(async (position: number) => {
    if (!selectedBox || selectedBox.mode !== 'precise') return;
    const existing = cells.find((c) => c.position === position);
    if (existing) {
      const nextStatus = existing.sample_status === 'used' ? 'normal' : 'used';
      try {
        await updateBoxCell(existing.id, { sample_status: nextStatus });
        setCells((prev) => prev.map((c) => c.id === existing.id ? { ...c, sample_status: nextStatus } : c));
      } catch (err) {
        console.error('Failed to update cell:', err);
      }
    } else {
      try {
        await createBoxCell(selectedBox.id, { position, sample_name: `样本 ${position + 1}`, sample_status: 'normal' });
        const updated = await fetchBoxCells(selectedBox.id);
        setCells(updated);
      } catch (err) {
        console.error('Failed to create cell:', err);
      }
    }
  }, [selectedBox, cells]);

  const layer1Drawers = drawers.filter((d) => d.layer === 1);
  const layer2Drawers = drawers.filter((d) => d.layer === 2);

  if (loading && !selectedDrawerId && upperItems.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <span style={{ color: 'var(--app-muted)' }}>加载中...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-[680px]">
      <BreadcrumbNav nodes={breadcrumbNodes} />

      <AnimatePresence mode="wait">
        {viewLevel === 'fridge' && (
          <motion.div
            key="fridge"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <UpperOpenStorage
              items={upperItems}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onItemClick={handleItemClick}
              onAddItem={(row) => { setEditItem(null); setDefaultItemRow(row); setShowItemModal(true); }}
            />

            <div
              className="h-4 mx-2 rounded flex items-center justify-center"
              style={{
                background: 'var(--fridge-shelf-bg)',
                boxShadow: 'var(--fridge-shelf-shadow)',
              }}
            />

            <DrawerLayer
              layer={1}
              label="第一层抽屉区"
              rows={DRAWER_LAYER1.rows}
              cols={DRAWER_LAYER1.cols}
              drawers={layer1Drawers}
              onDrawerClick={handleDrawerClick}
            />

            <DrawerLayer
              layer={2}
              label="第二层抽屉区"
              rows={DRAWER_LAYER2.rows}
              cols={DRAWER_LAYER2.cols}
              drawers={layer2Drawers}
              onDrawerClick={handleDrawerClick}
            />
          </motion.div>
        )}

        {viewLevel === 'drawer' && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BoxView
              drawerLabel={selectedDrawerLabel}
              boxes={boxes}
              onBack={handleBackToFridge}
              onBoxClick={handleBoxClick}
              onAddBox={() => { setEditBox(null); setShowBoxModal(true); }}
              onDeleteBox={handleDeleteBox}
            />
          </motion.div>
        )}

        {viewLevel === 'box' && selectedBox && (
          <motion.div
            key="box"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {selectedBox.mode === 'precise' ? (
              <div className="flex flex-col gap-3">
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{
                    background: 'var(--app-input-bg)',
                    border: '1px solid var(--app-input-border)',
                  }}
                >
                  <input
                    type="text"
                    placeholder="搜索样本条码、名称..."
                    value={searchCellQuery}
                    onChange={(e) => setSearchCellQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[14px]"
                    style={{ color: 'var(--app-text)' }}
                  />
                  {searchCellQuery && (
                    <span className="text-[12px]" style={{ color: '#2563eb' }}>
                      {matchedCellIds.size} 匹配
                    </span>
                  )}
                </div>
                <BoxGrid
                  box={selectedBox}
                  cells={cells}
                  matchedCellIds={matchedCellIds}
                  onBack={handleBackToDrawer}
                  onCellClick={handleCellClick}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleBackToDrawer}
                    className="flex items-center gap-1 text-[14px] hover:opacity-80"
                    style={{ color: '#60a5fa' }}
                  >
                    返回盒子列表
                  </button>
                </div>
                <div
                  className="rounded-xl p-6"
                  style={{
                    background: 'var(--app-card-bg)',
                    border: '1px solid var(--app-border)',
                    boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
                  }}
                >
                  <h3 className="text-[20px] font-medium mb-4" style={{ color: 'var(--app-text)' }}>
                    {selectedBox.name}
                  </h3>
                  <div className="space-y-2 text-[14px]" style={{ color: 'var(--app-muted)' }}>
                    {selectedBox.sample_type && <p>样本类型: {selectedBox.sample_type}</p>}
                    {selectedBox.project_name && <p>项目: {selectedBox.project_name}</p>}
                    <p>数量: {selectedBox.quantity}</p>
                    {selectedBox.owner && <p>负责人: {selectedBox.owner}</p>}
                    {selectedBox.note && <p>备注: {selectedBox.note}</p>}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AddItemModal
        isOpen={showItemModal}
        editItem={editItem}
        defaultRow={defaultItemRow}
        onClose={() => { setShowItemModal(false); setEditItem(null); }}
        onSave={handleSaveItem}
      />
      <AddBoxModal
        isOpen={showBoxModal}
        editBox={editBox}
        onClose={() => { setShowBoxModal(false); setEditBox(null); }}
        onSave={handleSaveBox}
      />
    </div>
  );
}
