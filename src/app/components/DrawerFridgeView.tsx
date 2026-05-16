import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Refrigerator, UpperItem, Drawer, Box, BoxCell, Tube, SampleRecord, DRAWER_LAYER1, DRAWER_LAYER2, boxPositionToLabel, cellPositionToLabel } from '../types';
import {
  fetchUpperItems, createUpperItem, updateUpperItem, deleteUpperItem,
  fetchDrawers, updateDrawer,
  fetchBoxes, createBox, createStandaloneBox, updateBox, deleteBox,
  fetchBoxCells, createBoxCell, updateBoxCell, deleteBoxCell,
  fetchBoxTubes, createSampleRecord, updateSampleRecord, deleteSampleRecord,
  addTubesToSample, deleteTube, batchUpdateSampleRecords,
  fetchSampleRecord,
} from '../api';
import { FolderOpen, FileSpreadsheet } from 'lucide-react';
import { BreadcrumbNav, BreadcrumbNode } from './BreadcrumbNav';
import { UpperOpenStorage } from './UpperOpenStorage';
import { DrawerLayer } from './DrawerLayer';
import { BoxView } from './BoxView';
import { BoxGrid } from './BoxGrid';
import { AddItemModal } from './AddItemModal';
import { AddBoxModal } from './AddBoxModal';
import { AddBoxCellModal } from './AddBoxCellModal';
import { AddSampleRecordModal } from './AddSampleRecordModal';
import { ExcelImportModal } from './ExcelImportModal';
import { SampleListPanel } from './SampleListPanel';
import { PendingSamplesPanel } from './PendingSamplesPanel';
import { BatchEditModal } from './BatchEditModal';

type ViewLevel = 'fridge' | 'drawer' | 'box';
type MainTab = 'upper' | 'lowerTop' | 'lowerBottom';

interface DrawerFridgeViewProps {
  fridge: Refrigerator;
  currentUser: string;
  sampleTypes: string[];
  onAddSampleType: (name: string) => void;
  itemTypes: string[];
  onAddItemType: (name: string) => void;
  navigateToDrawer?: { drawerId: string; drawerLabel: string } | null;
  onNavigated?: () => void;
  pendingSamples?: SampleRecord[];
  onPendingSamplesChange?: (samples: SampleRecord[]) => void;
  onImportComplete?: (sampleIds: string[]) => void;
  onDataChanged?: () => void;
}

export function DrawerFridgeView({
  fridge,
  currentUser,
  sampleTypes,
  onAddSampleType,
  itemTypes,
  onAddItemType,
  navigateToDrawer,
  onNavigated,
  pendingSamples = [],
  onPendingSamplesChange,
  onImportComplete,
  onDataChanged,
}: DrawerFridgeViewProps) {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('fridge');
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('upper');
  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null);
  const [selectedDrawerLabel, setSelectedDrawerLabel] = useState('');
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);

  const [upperItems, setUpperItems] = useState<UpperItem[]>([]);
  const [drawers, setDrawers] = useState<Drawer[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [cells, setCells] = useState<BoxCell[]>([]);
  const [tubes, setTubes] = useState<Tube[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCellQuery, setSearchCellQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Multi-select mode
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<Set<number>>(new Set());
  const [hoveredSampleId, setHoveredSampleId] = useState<string | null>(null);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<UpperItem | null>(null);
  const [defaultItemRow, setDefaultItemRow] = useState(1);
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [editBox, setEditBox] = useState<Box | null>(null);
  const [targetBoxPosition, setTargetBoxPosition] = useState<number | null>(null);
  const [showCellModal, setShowCellModal] = useState(false);
  const [targetCellPosition, setTargetCellPosition] = useState<number | null>(null);
  const [editCell, setEditCell] = useState<BoxCell | null>(null);

  // Sample record modal
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [editSampleRecord, setEditSampleRecord] = useState<SampleRecord | null>(null);
  const [preselectedWells, setPreselectedWells] = useState<number[]>([]);

  // Excel import modal
  const [showImportModal, setShowImportModal] = useState(false);

  // Batch edit modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchSampleIds, setBatchSampleIds] = useState<string[]>([]);

  // Handle external navigation from side map
  useEffect(() => {
    if (!navigateToDrawer) return;
    const drawer = drawers.find((d) => d.id === navigateToDrawer.drawerId);
    if (drawer) {
      setSelectedDrawerId(navigateToDrawer.drawerId);
      setSelectedDrawerLabel(navigateToDrawer.drawerLabel);
      setSelectedBoxId(null);
      setSelectedBox(null);
      setViewLevel('drawer');
      setSearchCellQuery('');
      setTargetBoxPosition(null);
      // Switch to the correct tab
      const layer = drawer.layer;
      setActiveMainTab(layer === 1 ? 'lowerTop' : 'lowerBottom');
    }
    onNavigated?.();
  }, [navigateToDrawer, drawers, onNavigated]);

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
      setTubes([]);
      return;
    }
    // Load tubes for all boxes (upper item boxes now have FK-safe box records)
    fetchBoxTubes(selectedBox.id)
      .then((data) => {
        setTubes(data);
        if (data.length === 0) {
          fetchBoxCells(selectedBox.id)
            .then(setCells)
            .catch(() => setCells([]));
        } else {
          setCells([]);
        }
      })
      .catch(() => {
        fetchBoxCells(selectedBox.id)
          .then(setCells)
          .catch(() => setCells([]));
      });
    // Reset multi-select on box change
    setMultiSelectMode(false);
    setSelectedPositions(new Set());
    setHoveredSampleId(null);
  }, [selectedBox]);

  const matchedCellIds = React.useMemo(() => {
    if (!searchCellQuery.trim()) return new Set<string>();
    const q = searchCellQuery.toLowerCase();
    const ids = new Set<string>();
    // Search tubes
    for (const t of tubes) {
      if (
        (t.barcode || '').toLowerCase().includes(q) ||
        (t.patient_name || '').toLowerCase().includes(q) ||
        (t.sample_code || '').toLowerCase().includes(q) ||
        (t.note || '').toLowerCase().includes(q)
      ) {
        ids.add(t.id);
      }
    }
    // Search old cells
    for (const c of cells) {
      if (
        (c.barcode || '').toLowerCase().includes(q) ||
        (c.sample_name || '').toLowerCase().includes(q) ||
        (c.note || '').toLowerCase().includes(q)
      ) {
        ids.add(c.id);
      }
    }
    return ids;
  }, [cells, tubes, searchCellQuery]);

  const handleDrawerClick = useCallback((drawerId: string) => {
    const drawer = drawers.find((d) => d.id === drawerId);
    setSelectedDrawerId(drawerId);
    setSelectedDrawerLabel(drawer?.label || '');
    setSelectedBoxId(null);
    setSelectedBox(null);
    setViewLevel('drawer');
    setSearchCellQuery('');
    setTargetBoxPosition(null);
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
    setTargetBoxPosition(null);
    setMultiSelectMode(false);
    setSelectedPositions(new Set());
    setHoveredSampleId(null);
  }, []);

  const handleBackToDrawer = useCallback(() => {
    // If we came from an upper item box, go back to fridge level
    if (!selectedDrawerId) {
      handleBackToFridge();
      return;
    }
    setViewLevel('drawer');
    setSelectedBoxId(null);
    setSelectedBox(null);
    setSearchCellQuery('');
    setMultiSelectMode(false);
    setSelectedPositions(new Set());
    setHoveredSampleId(null);
  }, [selectedDrawerId, handleBackToFridge]);

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
      onDataChanged?.();
    } catch (err) {
      console.error('Failed to save item:', err);
    }
  }, [fridge.id, editItem]);

  const handleItemClick = useCallback(async (itemId: string) => {
    const item = upperItems.find((i) => i.id === itemId) || null;
    if (item && item.box_mode === 'precise' && item.grid_rows && item.grid_cols) {
      // Ensure a box record exists for this upper item (so tubes FK works)
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
      } catch { /* box may already exist, ignore */ }

      // Navigate to box grid view for upper box items
      const syntheticBox: Box = {
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
      };
      setSelectedBoxId(item.id);
      setSelectedBox(syntheticBox);
      setSelectedDrawerId(null);
      setSelectedDrawerLabel('');
      setViewLevel('box');
      setSearchCellQuery('');
      setMultiSelectMode(false);
      setSelectedPositions(new Set());
      setHoveredSampleId(null);
      return;
    }
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
      const drawerData = await fetchDrawers(fridge.id);
      setDrawers(drawerData);
      onDataChanged?.();
    } catch (err) {
      console.error('Failed to save box:', err);
    }
  }, [selectedDrawerId, editBox, fridge.id, onDataChanged]);

  const handleDeleteBox = useCallback(async (boxId: string) => {
    try {
      await deleteBox(boxId);
      setBoxes((prev) => prev.filter((b) => b.id !== boxId));
      const drawerData = await fetchDrawers(fridge.id);
      setDrawers(drawerData);
      onDataChanged?.();
    } catch (err) {
      console.error('Failed to delete box:', err);
    }
  }, [fridge.id, onDataChanged]);

  // Handle clicking a position in box grid
  const handleCellClick = useCallback((position: number) => {
    if (!selectedBox || selectedBox.mode !== 'precise') return;

    // If using tubes (new system), open sample record modal
    const tube = tubes.find((t) => t.position === position);
    if (tube) {
      // Fetch full sample record and open edit modal
      fetchSampleRecord(tube.sample_id).then((record) => {
        setEditSampleRecord(record);
        setPreselectedWells([]);
        setShowSampleModal(true);
      }).catch(console.error);
      return;
    }

    // Check if there are any tubes at all; if so, we're in tube mode
    if (tubes.length > 0 || cells.length === 0) {
      // Tube mode: open sample modal for new sample at this position
      setEditSampleRecord(null);
      setPreselectedWells([position]);
      setShowSampleModal(true);
      return;
    }

    // Old cell mode fallback
    const existing = cells.find((c) => c.position === position);
    setTargetCellPosition(position);
    setEditCell(existing || null);
    setShowCellModal(true);
  }, [selectedBox, cells, tubes]);

  const handleSaveCell = useCallback(async (data: Partial<BoxCell>) => {
    if (!selectedBox || targetCellPosition == null) return;
    try {
      if (data.id && editCell) {
        await updateBoxCell(data.id, data);
      } else {
        await createBoxCell(selectedBox.id, { ...data, position: targetCellPosition });
      }
      const updated = await fetchBoxCells(selectedBox.id);
      setCells(updated);
      setShowCellModal(false);
      setEditCell(null);
      setTargetCellPosition(null);
    } catch (err) {
      console.error('Failed to save cell:', err);
    }
  }, [selectedBox, targetCellPosition, editCell]);

  const handleDeleteCell = useCallback(async (cellId: string) => {
    if (!selectedBox) return;
    try {
      await deleteBoxCell(cellId);
      const updated = await fetchBoxCells(selectedBox.id);
      setCells(updated);
      setShowCellModal(false);
      setEditCell(null);
      setTargetCellPosition(null);
    } catch (err) {
      console.error('Failed to delete cell:', err);
    }
  }, [selectedBox]);

  // ── Multi-select handlers ──

  const handleMultiSelectToggle = useCallback((position: number) => {
    setSelectedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(position)) {
        next.delete(position);
      } else {
        next.add(position);
      }
      return next;
    });
  }, []);

  const handleMultiSelectConfirm = useCallback(() => {
    if (selectedPositions.size === 0) return;
    setPreselectedWells(Array.from(selectedPositions));
    setEditSampleRecord(null);
    setShowSampleModal(true);
    setMultiSelectMode(false);
  }, [selectedPositions]);

  // ── Sample record handlers ──

  const handleSaveSampleRecord = useCallback(async (data: {
    patient_name: string;
    sample_code: string;
    source?: string;
    sample_type?: string;
    collection_stage?: string;
    collected_at?: string;
    tags?: string[];
    note?: string;
    uploader?: string;
    tubes?: Array<{ box_id: string; position: number; volume?: string; barcode?: string; status?: string; note?: string }>;
  }) => {
    if (!selectedBox) return;
    try {
      if (editSampleRecord) {
        // Update existing sample record fields only
        await updateSampleRecord(editSampleRecord.id, data as any);
        setShowSampleModal(false);
        setEditSampleRecord(null);
        setPreselectedWells([]);
      } else {
        // Create new sample record with tubes
        await createSampleRecord(data);
        setShowSampleModal(false);
        setPreselectedWells([]);
        setSelectedPositions(new Set());
      }
      // Reload tubes
      const updated = await fetchBoxTubes(selectedBox.id);
      setTubes(updated);
    } catch (err) {
      console.error('Failed to save sample record:', err);
    }
  }, [selectedBox, editSampleRecord]);

  const handleDeleteSampleRecord = useCallback(async (id: string) => {
    if (!selectedBox) return;
    try {
      await deleteSampleRecord(id);
      setShowSampleModal(false);
      setEditSampleRecord(null);
      const updated = await fetchBoxTubes(selectedBox.id);
      setTubes(updated);
    } catch (err) {
      console.error('Failed to delete sample record:', err);
    }
  }, [selectedBox]);

  const handleAddTubesToSample = useCallback(async (sampleId: string, tubeInputs: Array<{ box_id: string; position: number; volume?: string }>) => {
    if (!selectedBox) return;
    try {
      await addTubesToSample(sampleId, tubeInputs);
      const updated = await fetchBoxTubes(selectedBox.id);
      setTubes(updated);
    } catch (err) {
      console.error('Failed to add tubes:', err);
    }
  }, [selectedBox]);

  const handleDeleteTube = useCallback(async (tubeId: string) => {
    if (!selectedBox) return;
    try {
      await deleteTube(tubeId);
      const updated = await fetchBoxTubes(selectedBox.id);
      setTubes(updated);
    } catch (err) {
      console.error('Failed to delete tube:', err);
    }
  }, [selectedBox]);

  const handleTubeHover = useCallback((sampleId: string | null) => {
    setHoveredSampleId(sampleId);
  }, []);

  // Handle drop from pending samples panel onto a grid position
  const handlePendingSampleDrop = useCallback(async (sampleId: string, position: number) => {
    if (!selectedBox) return;
    try {
      await addTubesToSample(sampleId, [{ box_id: selectedBox.id, position }]);
      const updated = await fetchBoxTubes(selectedBox.id);
      setTubes(updated);
      // Remove from pending list
      onPendingSamplesChange?.(pendingSamples.filter((s) => s.id !== sampleId));
    } catch (err) {
      console.error('Failed to drop sample:', err);
    }
  }, [selectedBox, pendingSamples, onPendingSamplesChange]);

  const handleBatchEdit = useCallback((sampleIds: string[]) => {
    setBatchSampleIds(sampleIds);
    setShowBatchModal(true);
  }, []);

  const handleBatchApply = useCallback(async (updates: {
    source?: string; sample_type?: string; collection_stage?: string; collected_at?: string;
  }) => {
    try {
      await batchUpdateSampleRecords(batchSampleIds, updates);
      if (selectedBox) {
        const updated = await fetchBoxTubes(selectedBox.id);
        setTubes(updated);
      }
      setShowBatchModal(false);
    } catch (err) {
      console.error('Batch edit failed:', err);
    }
  }, [batchSampleIds, selectedBox]);

  const handleSelectSampleFromList = useCallback((sampleId: string) => {
    const tube = tubes.find((t) => t.sample_id === sampleId);
    if (tube) {
      // Open sample record for editing
      fetchSampleRecord(sampleId).then((record) => {
        setEditSampleRecord(record);
        setPreselectedWells([]);
        setShowSampleModal(true);
      }).catch(console.error);
    }
  }, [tubes]);

  const handleAddBoxAtPosition = useCallback((position: number) => {
    setEditBox(null);
    setTargetBoxPosition(position);
    setShowBoxModal(true);
  }, []);

  const handleAddInternalPosition = useCallback(async (insertAt: number) => {
    const drawer = drawers.find((d) => d.id === selectedDrawerId);
    if (!drawer) return;
    const previousBoxes = boxes;
    const shiftedBoxes = boxes.map((box) =>
      box.position != null && box.position >= insertAt
        ? { ...box, position: box.position + 1 }
        : box,
    );
    try {
      setBoxes(shiftedBoxes);
      await Promise.all(
        shiftedBoxes
          .filter((box) => {
            const previous = previousBoxes.find((candidate) => candidate.id === box.id);
            return previous && previous.position !== box.position;
          })
          .map((box) => updateBox(box.id, box)),
      );
      const updated = await updateDrawer(drawer.id, { max_boxes: Math.max(5, drawer.max_boxes || 5) + 1 });
      setDrawers((prev) => prev.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
    } catch (err) {
      setBoxes(previousBoxes);
      console.error('Failed to add drawer position:', err);
    }
  }, [boxes, drawers, selectedDrawerId]);

  const handleMoveBox = useCallback(async (boxId: string, targetPosition: number) => {
    const moving = boxes.find((box) => box.id === boxId);
    if (!moving || moving.position === targetPosition) return;
    const target = boxes.find((box) => box.position === targetPosition && box.id !== boxId);
    const previousBoxes = boxes;
    const nextBoxes = boxes.map((box) => {
      if (box.id === boxId) return { ...box, position: targetPosition };
      if (target && box.id === target.id) return { ...box, position: moving.position };
      return box;
    });
    setBoxes(nextBoxes);
    try {
      if (target) {
        await Promise.all([
          updateBox(moving.id, { ...moving, position: targetPosition }),
          updateBox(target.id, { ...target, position: moving.position }),
        ]);
      } else {
        await updateBox(moving.id, { ...moving, position: targetPosition });
      }
      if (selectedDrawerId) {
        const updatedBoxes = await fetchBoxes(selectedDrawerId);
        setBoxes(updatedBoxes);
      }
    } catch (err) {
      setBoxes(previousBoxes);
      console.error('Failed to move box:', err);
    }
  }, [boxes, selectedDrawerId]);

  const layer1Drawers = drawers.filter((d) => d.layer === 1);
  const layer2Drawers = drawers.filter((d) => d.layer === 2);
  const selectedDrawer = drawers.find((d) => d.id === selectedDrawerId) || null;
  const selectedDrawerZoneLabel = selectedDrawer?.layer === 2 ? '下层第二层' : '下层第一层';
  const tabs: Array<{ key: MainTab; label: string }> = [
    { key: 'upper', label: '上层' },
    { key: 'lowerTop', label: '下层第一层' },
    { key: 'lowerBottom', label: '下层第二层' },
  ];

  if (loading && !selectedDrawerId && upperItems.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <span style={{ color: 'var(--app-muted)' }}>加载中...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full" style={{ maxWidth: '100%' }}>
      <BreadcrumbNav nodes={breadcrumbNodes} />

      <AnimatePresence mode="wait">
        {viewLevel === 'fridge' && (
          <motion.div
            key="fridge"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <div
              className="grid grid-cols-3 gap-2 rounded-xl p-1"
              style={{
                background: 'var(--app-input-bg)',
                border: '1px solid var(--app-input-border)',
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveMainTab(tab.key)}
                  className="rounded-lg px-3 py-2 text-[14px] transition-all"
                  style={{
                    background: activeMainTab === tab.key ? '#2563eb' : 'transparent',
                    color: activeMainTab === tab.key ? '#fff' : 'var(--app-muted)',
                    boxShadow: activeMainTab === tab.key ? '0 8px 20px rgba(37,99,235,0.18)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeMainTab === 'upper' && (
                <motion.div
                  key="upper"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <UpperOpenStorage
                    items={upperItems}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onItemClick={handleItemClick}
                    onAddItem={(row) => { setEditItem(null); setDefaultItemRow(row); setShowItemModal(true); }}
                    onDeleteItem={async (id) => {
                      try {
                        await deleteUpperItem(id);
                        setUpperItems((prev) => prev.filter((i) => i.id !== id));
                        onDataChanged?.();
                      } catch (err) { console.error('Delete item failed:', err); }
                    }}
                    itemTypes={itemTypes}
                    currentUser={currentUser}
                  />
                </motion.div>
              )}

              {activeMainTab === 'lowerTop' && (
                <motion.div
                  key="lowerTop"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <DrawerLayer
                    layer={1}
                    label="第一层抽屉区"
                    rows={DRAWER_LAYER1.rows}
                    cols={DRAWER_LAYER1.cols}
                    drawers={layer1Drawers}
                    onDrawerClick={handleDrawerClick}
                  />
                </motion.div>
              )}

              {activeMainTab === 'lowerBottom' && (
                <motion.div
                  key="lowerBottom"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <DrawerLayer
                    layer={2}
                    label="第二层抽屉区"
                    rows={DRAWER_LAYER2.rows}
                    cols={DRAWER_LAYER2.cols}
                    drawers={layer2Drawers}
                    onDrawerClick={handleDrawerClick}
                    variant="compact"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {viewLevel === 'drawer' && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {selectedDrawer && (
              <BoxView
                drawer={selectedDrawer}
                drawerZoneLabel={selectedDrawerZoneLabel}
                boxes={boxes}
                currentUser={currentUser}
                onBack={handleBackToFridge}
                onBoxClick={handleBoxClick}
                onAddBox={handleAddBoxAtPosition}
                onAddPosition={handleAddInternalPosition}
                onMoveBox={handleMoveBox}
                onDeleteBox={handleDeleteBox}
              />
            )}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-0"
                    style={{
                      background: 'var(--app-input-bg)',
                      border: '1px solid var(--app-input-border)',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="搜索样本条码、姓名、编号..."
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
                  <button
                    type="button"
                    onClick={() => {
                      if (multiSelectMode && selectedPositions.size > 0) {
                        handleMultiSelectConfirm();
                      } else {
                        setMultiSelectMode((v) => !v);
                        setSelectedPositions(new Set());
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] transition-all"
                    style={{
                      background: multiSelectMode ? '#2563eb' : 'var(--app-panel-bg)',
                      border: multiSelectMode ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                      color: multiSelectMode ? '#fff' : 'var(--app-muted)',
                    }}
                  >
                    {multiSelectMode
                      ? (selectedPositions.size > 0 ? `确认 ${selectedPositions.size} 孔位` : '多选模式')
                      : '多选绑定'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreselectedWells([]);
                      setEditSampleRecord(null);
                      setShowSampleModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px]"
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                      border: '1px solid #3b82f6',
                      color: '#fff',
                    }}
                  >
                    + 添加样本
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px]"
                    style={{
                      background: 'linear-gradient(135deg, #059669, #10b981)',
                      border: '1px solid #34d399',
                      color: '#fff',
                    }}
                  >
                    <FileSpreadsheet size={15} />
                    Excel 导入
                  </button>
                </div>
                {multiSelectMode && (
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
                    style={{
                      background: 'rgba(34,211,238,0.1)',
                      border: '1px solid rgba(34,211,238,0.3)',
                      color: '#0891b2',
                    }}
                  >
                    点击多个孔位以选中，再点击"确认"创建同一样本的多个试管
                  </div>
                )}
                <BoxGrid
                  box={selectedBox}
                  cells={cells}
                  tubes={tubes}
                  matchedIds={matchedCellIds}
                  multiSelect={multiSelectMode}
                  selectedPositions={selectedPositions}
                  hoveredSampleId={hoveredSampleId}
                  onBack={handleBackToDrawer}
                  onCellClick={handleCellClick}
                  onMultiSelectToggle={handleMultiSelectToggle}
                  onMultiSelectConfirm={handleMultiSelectConfirm}
                  onTubeHover={handleTubeHover}
                  onPendingSampleDrop={pendingSamples.length > 0 ? handlePendingSampleDrop : undefined}
                />
                {tubes.length > 0 && (
                  <SampleListPanel
                    tubes={tubes}
                    onTubeHover={handleTubeHover}
                    onBatchEdit={handleBatchEdit}
                    onSelectSample={handleSelectSampleFromList}
                  />
                )}
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
                  className="rounded-xl p-5"
                  style={{
                    background: 'var(--app-card-bg)',
                    border: '1px solid var(--app-border)',
                    boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-[20px] font-medium" style={{ color: 'var(--app-text)' }}>
                        {selectedBox.name}
                      </h3>
                      <p className="text-[12px] mt-1" style={{ color: 'var(--app-muted)' }}>
                        简略模式盒子
                      </p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-[12px]"
                      style={{
                        background: 'var(--app-subtle-bg)',
                        color: 'var(--app-subtle-text)',
                        border: '1px solid var(--app-subtle-border)',
                      }}
                    >
                      {selectedBox.position != null ? boxPositionToLabel(selectedBox.position) : '未定位'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ['样本类型', selectedBox.sample_type || '未填写'],
                      ['项目名称', selectedBox.project_name || '未填写'],
                      ['负责人', selectedBox.owner || '未填写'],
                      ['抽屉位置', selectedBox.position != null ? boxPositionToLabel(selectedBox.position) : '未定位'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg px-3 py-2"
                        style={{
                          background: 'var(--app-input-bg)',
                          border: '1px solid var(--app-input-border)',
                        }}
                      >
                        <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                          {label}
                        </div>
                        <div className="text-[14px] mt-1 truncate" style={{ color: 'var(--app-text)' }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedBox.note && (
                    <div
                      className="mt-3 rounded-lg px-3 py-2 min-h-[64px]"
                      style={{
                        background: 'var(--app-input-bg)',
                        border: '1px solid var(--app-input-border)',
                      }}
                    >
                      <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                        备注
                      </div>
                      <div className="text-[14px] mt-1 whitespace-pre-wrap" style={{ color: 'var(--app-text)' }}>
                        {selectedBox.note}
                      </div>
                    </div>
                  )}

                  {selectedBox.data_path && (
                    <div
                      className="mt-3 rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer hover:opacity-80"
                      style={{
                        background: 'var(--app-input-bg)',
                        border: '1px solid var(--app-input-border)',
                      }}
                      onClick={() => navigator.clipboard.writeText(selectedBox.data_path!)}
                      title="点击复制路径"
                    >
                      <FolderOpen size={14} color="#60a5fa" />
                      <span className="text-[13px] truncate flex-1" style={{ color: 'var(--app-text)' }}>
                        {selectedBox.data_path}
                      </span>
                      <span className="text-[11px]" style={{ color: '#2563eb' }}>复制</span>
                    </div>
                  )}
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
        currentUsername={currentUser}
        itemTypes={itemTypes}
        onAddItemType={onAddItemType}
        onClose={() => { setShowItemModal(false); setEditItem(null); }}
        onSave={handleSaveItem}
      />
      <AddBoxModal
        isOpen={showBoxModal}
        editBox={editBox}
        drawerLabel={selectedDrawerLabel}
        targetPosition={targetBoxPosition ?? editBox?.position ?? null}
        sampleTypes={sampleTypes}
        currentUsername={currentUser}
        onAddSampleType={onAddSampleType}
        onClose={() => { setShowBoxModal(false); setEditBox(null); setTargetBoxPosition(null); }}
        onSave={handleSaveBox}
      />
      <AddBoxCellModal
        isOpen={showCellModal}
        box={selectedBox}
        cell={editCell}
        position={targetCellPosition}
        onClose={() => { setShowCellModal(false); setEditCell(null); setTargetCellPosition(null); }}
        onSave={handleSaveCell}
        onDelete={handleDeleteCell}
      />
      {selectedBox && (
        <AddSampleRecordModal
          isOpen={showSampleModal}
          editRecord={editSampleRecord}
          currentUser={currentUser}
          boxId={selectedBox.id}
          boxName={selectedBox.name}
          gridCols={selectedBox.grid_cols || 10}
          preSelectedPositions={preselectedWells}
          onClose={() => {
            setShowSampleModal(false);
            setEditSampleRecord(null);
            setPreselectedWells([]);
            setSelectedPositions(new Set());
          }}
          onSave={handleSaveSampleRecord}
          onDelete={handleDeleteSampleRecord}
          onAddTubes={handleAddTubesToSample}
          onDeleteTube={handleDeleteTube}
        />
      )}
      {selectedBox && (
        <ExcelImportModal
          isOpen={showImportModal}
          boxId={selectedBox.id}
          boxName={selectedBox.name}
          gridCols={selectedBox.grid_cols || 10}
          capacity={(selectedBox.grid_rows || 10) * (selectedBox.grid_cols || 10)}
          occupiedPositions={new Set(tubes.map((t) => t.position))}
          currentUser={currentUser}
          onClose={() => setShowImportModal(false)}
          onImported={(ids) => onImportComplete?.(ids)}
        />
      )}
      <BatchEditModal
        isOpen={showBatchModal}
        count={batchSampleIds.length}
        onClose={() => setShowBatchModal(false)}
        onApply={handleBatchApply}
      />
    </div>
  );
}
