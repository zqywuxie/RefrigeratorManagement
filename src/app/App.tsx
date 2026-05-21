import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeProvider, useTheme } from 'next-themes';
import {
  Search,
  Plus,
  Database,
  Activity,
  AlertTriangle,
  Layers,
  Tags,
  LogOut,
  Moon,
  Sun,
  UserCircle,
  UserPlus,
  ChevronDown,
  FlaskConical,
  Shield,
  PanelLeftClose,
  PanelLeft,
  Menu,
  Map as MapIcon,
  BarChart3,
  Eye,
  EyeOff,
  Package,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
} from 'lucide-react';

import {
  Refrigerator,
  FridgeType,
  DEFAULT_ITEM_TYPES,
  UpperItem,
  Tube,
  SampleRecord,
  PendingImportSample,
  STATUS_CONFIG,
  getItemTypeConfig,
  getSampleTypeColor,
  formatChineseShortDate,
} from './types';
import {
  fetchRefrigerators,
  createRefrigerator as apiCreateRefrigerator,
  deleteRefrigerator as apiDeleteRefrigerator,
  updateRefrigerator as apiUpdateRefrigerator,
  fetchItemTypes,
  createItemType,
  fetchSampleRecords,
  fetchFridgeBoxes,
  fetchSampleTypes,
  createSampleType,
  fetchDrawers,
  fetchUpperItems,
} from './api';
import type { FridgeBoxInfo } from './api';
import { FridgeSelector } from './components/FridgeSelector';
import { RootAdminPanel } from './components/RootAdminPanel';
import { AuthProvider, useAuth } from './AuthContext';
import { DrawerFridgeView } from './components/DrawerFridgeView';
import { ShelfFridgeView } from './components/ShelfFridgeView';
import { FridgeSideMap } from './components/FridgeSideMap';
import { PendingSamplesPanel } from './components/PendingSamplesPanel';
import { SampleListPanel } from './components/SampleListPanel';
import { LoginPage } from './components/LoginPage';
import { useIsMobile } from './components/ui/use-mobile';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from './components/ui/sheet';
import { Drawer, DrawerContent } from './components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';

type UploadedRecordItem = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  uploader: string;
};

type UploadedUpperItem = {
  kind: 'upper-item';
  id: string;
  name: string;
  type: string;
  rowNumber: number;
  quantity: number;
  owner: string | null;
  note: string | null;
  boxMode: 'precise' | 'simple' | null;
  refrigeratorId: string;
  updatedAt: string;
};

type UploadedPanelItem = UploadedRecordItem | UploadedUpperItem;

type BoxSamplePanelState = {
  tubes: Tube[];
  onTubeHover: (sampleId: string | null) => void;
  onBatchEdit: (sampleIds: string[]) => void;
  onSelectSample: (sampleId: string) => void;
};

type DrawerSampleNavTarget = {
  fridgeId: string;
  drawerId: string;
  drawerLabel: string;
  boxId: string;
  sampleId: string;
};

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--app-bg)', color: 'var(--app-muted)' }}
      >
        正在恢复登录状态...
      </div>
    );
  }
  if (!user) return <LoginPage />;
  return <AppContent />;
}

function AppContent() {
  const { user, logout, isRoot } = useAuth();
  const [refrigerators, setRefrigerators] = useState<Refrigerator[]>([]);
  const [selectedFridgeId, setSelectedFridgeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'fridge' | 'admin'>('fridge');
  const [notification, setNotification] = useState<{
    msg: string;
    type: 'info' | 'warn' | 'success' | 'error';
  } | null>(null);
  const [tick, setTick] = useState(0);

  const [itemTypes, setItemTypes] = useState<string[]>(DEFAULT_ITEM_TYPES);
  const [sampleTypes, setSampleTypes] = useState<string[]>([]);
  const [sampleRecords, setSampleRecords] = useState<SampleRecord[]>([]);
  const [fridgeBoxes, setFridgeBoxes] = useState<FridgeBoxInfo[]>([]);
  const [drawerCount, setDrawerCount] = useState(0);
  const [drawerBoxCount, setDrawerBoxCount] = useState(0);
  const [drawerMaxBoxes, setDrawerMaxBoxes] = useState(0);
  const [drawerLayers, setDrawerLayers] = useState<number[]>([]);
  const [drawerLayerCounts, setDrawerLayerCounts] = useState<Record<number, number>>({});
  const [upperItemsCount, setUpperItemsCount] = useState(0);
  const [upperItems, setUpperItems] = useState<UpperItem[]>([]);

  // Side map state
  const [showSideMap, setShowSideMap] = useState(false);
  const [sideMapNavTarget, setSideMapNavTarget] = useState<{ drawerId: string; drawerLabel: string } | null>(null);
  const [sideMapRefreshKey, setSideMapRefreshKey] = useState(0);
  const [boxViewTubes, setBoxViewTubes] = useState<Tube[]>([]);
  const [fridgeItems, setFridgeItems] = useState<UpperItem[]>([]);
  const [boxSamplePanel, setBoxSamplePanel] = useState<BoxSamplePanelState | null>(null);
  const [drawerSampleNavTarget, setDrawerSampleNavTarget] = useState<DrawerSampleNavTarget | null>(null);
  const [upperItemNavTarget, setUpperItemNavTarget] = useState<{ fridgeId: string; itemId: string } | null>(null);
  const [activeDrawerId, setActiveDrawerId] = useState<string | null>(null);
  const [highlightedBoxId, setHighlightedBoxId] = useState<string | null>(null);

  // Pending imported samples (shared with DrawerFridgeView)
  const [pendingSamples, setPendingSamples] = useState<PendingImportSample[]>([]);

  // Mobile state
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);
  const [mobileSideMapOpen, setMobileSideMapOpen] = useState(false);

  // Range-aware box name matching: "MLP 12" matches box "MLP 11-20"
  const matchesBoxName = (query: string, boxName: string): boolean => {
    if (!boxName) return false;
    if (boxName.toLowerCase().includes(query.toLowerCase())) return true;
    const searchMatch = query.match(/^(.+?)\s+(\d+)$/i);
    if (!searchMatch) return false;
    const searchPrefix = searchMatch[1].toLowerCase();
    const searchNum = parseInt(searchMatch[2], 10);
    const boxMatch = boxName.match(/^(.+?)\s+(\d+)\s*-\s*(\d+)$/i);
    if (!boxMatch) return false;
    const boxPrefix = boxMatch[1].toLowerCase();
    const boxStart = parseInt(boxMatch[2], 10);
    const boxEnd = parseInt(boxMatch[3], 10);
    return searchPrefix === boxPrefix && searchNum >= boxStart && searchNum <= boxEnd;
  };

  // Find first tube whose box_name matched the search query, for box highlighting
  const getMatchedBoxId = (sr: SampleRecord): string | null => {
    if (!sr.tubes?.length) return null;
    const q = searchQuery.trim();
    if (!q) return null;
    const matchedTube = sr.tubes.find(t => t.box_name && matchesBoxName(q, t.box_name));
    return matchedTube?.box_id || null;
  };

  const getMatchedBoxName = (sr: SampleRecord): string | null => {
    if (!sr.tubes?.length) return null;
    const q = searchQuery.trim();
    if (!q) return null;
    const matchedTube = sr.tubes.find(t => t.box_name && matchesBoxName(q, t.box_name));
    return matchedTube?.box_name || null;
  };

  // Global sample records filtered by searchQuery (for dropdown below search bar)
  const globalFilteredRecords = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return sampleRecords.filter((sr) =>
      sr.patient_name.toLowerCase().includes(q) ||
      sr.sample_code.toLowerCase().includes(q) ||
      (sr.sample_type || '').toLowerCase().includes(q) ||
      (sr.tubes && sr.tubes.some(t => matchesBoxName(searchQuery.trim(), t.box_name || '')))
    );
  }, [sampleRecords, searchQuery]);

  // Global boxes filtered by searchQuery (for dropdown below search bar)
  const globalFilteredBoxes = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim();
    return fridgeBoxes.filter((b) => b.name && matchesBoxName(q, b.name));
  }, [fridgeBoxes, searchQuery]);

  const handleImportComplete = useCallback((newSamples: PendingImportSample[]) => {
    setPendingSamples((prev) => [...prev, ...newSamples]);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);


  // Load refrigerators and sample types on mount
  useEffect(() => {
    fetchRefrigerators()
      .then((data) => {
        setRefrigerators(
          data.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description || undefined,
            upperRows: r.upper_rows,
            upperCols: r.upper_cols,
            lowerRows: r.lower_rows,
            lowerCols: r.lower_cols,
            fridge_type: (r.fridge_type as FridgeType) || 'drawer',
            upperTemperature: Number(r.upper_temperature ?? -20),
            lowerTemperature: Number(r.lower_temperature ?? 4),
          })),
        );
        setLoading(false);
        if (data.length > 0 && !selectedFridgeId) {
          setSelectedFridgeId(data[0].id);
        }
      })
      .catch((err) => {
        setLoading(false);
        showNotif('无法连接服务器，请确认后端已启动', 'error');
        console.error(err);
      });
    fetchSampleTypes()
      .then((data) => setSampleTypes(data))
      .catch(() => {}); // use defaults if server unavailable
    fetchItemTypes()
      .then((data) => setItemTypes(data.length > 0 ? data : DEFAULT_ITEM_TYPES))
      .catch(() => {});
    // Load all sample records and boxes globally for search
    fetchSampleRecords({}).then(setSampleRecords).catch(() => {});
    fetchFridgeBoxes().then(setFridgeBoxes).catch(() => {});
  }, []);

  // Load sample records, drawers, upper items when fridge changes
  useEffect(() => {
    if (!selectedFridgeId) return;
    setLoading(true);
    Promise.all([
      fetchSampleRecords({}).catch(() => []),
      fetchDrawers(selectedFridgeId).catch(() => []),
      fetchUpperItems(selectedFridgeId).catch(() => []),
      fetchFridgeBoxes(selectedFridgeId).catch(() => []),
    ]).then(([srData, drawerData, upperItemsData, boxData]) => {
      setSampleRecords(srData);
      setFridgeBoxes(boxData);
      setDrawerCount(drawerData.length);
      setDrawerBoxCount(drawerData.reduce((s: number, d: any) => s + (d.box_count ?? 0), 0));
      setDrawerMaxBoxes(drawerData.reduce((s: number, d: any) => s + (d.max_boxes ?? 5), 0));
      setDrawerLayers([...new Set(drawerData.map((d: any) => d.layer))].sort());
      const layerCounts: Record<number, number> = {};
      for (const d of drawerData) { layerCounts[d.layer] = (layerCounts[d.layer] || 0) + 1; }
      setDrawerLayerCounts(layerCounts);
      setUpperItemsCount(upperItemsData.length);
      setUpperItems(upperItemsData);
      setLoading(false);
    }).catch((err) => {
      setLoading(false);
      showNotif('加载样本数据失败', 'error');
      console.error(err);
    });
  }, [selectedFridgeId]);

  const selectedFridge = refrigerators.find((r) => r.id === selectedFridgeId) ?? null;

  const showNotif = useCallback((
    msg: string,
    type: 'info' | 'warn' | 'success' | 'error' = 'info',
  ) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const isDrawerFridge = selectedFridge?.fridge_type === 'drawer';
  const totalCapacity = drawerCount + upperItemsCount;

  const myUploadedItems = React.useMemo<UploadedRecordItem[]>(() => {
    const username = user!.username;
    const results: UploadedRecordItem[] = [];

    sampleRecords.filter((sr) =>
      sr.uploader === username &&
      (!selectedFridgeId || sr.tubes.some((tube) => tube.fridge_id === selectedFridgeId))
    ).forEach((sr) => {
      results.push({
        id: sr.id,
        name: sr.patient_name,
        type: sr.sample_type || '—',
        createdAt: sr.created_at || '',
        uploader: sr.uploader || '',
      });
    });

    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [sampleRecords, selectedFridgeId, user]);

  const myUploadedUpperItems = React.useMemo<UploadedUpperItem[]>(() => {
    const username = user!.username;
    return upperItems
      .filter((item) => (item.owner || '').trim() === username)
      .map((item) => ({
        kind: 'upper-item' as const,
        id: item.id,
        name: item.name,
        type: item.item_type || '未分类',
        rowNumber: item.row_number,
        quantity: item.quantity,
        owner: item.owner,
        note: item.note,
        boxMode: item.box_mode,
        refrigeratorId: item.refrigerator_id,
        updatedAt: item.updated_at || item.created_at || '',
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [upperItems, user]);

  const handleUpperItemsChange = useCallback((items: UpperItem[]) => {
    setUpperItems(items);
    setUpperItemsCount(items.length);
    setFridgeItems(items);
  }, []);

  const handleOpenUploadedItem = useCallback((item: UploadedPanelItem) => {
    if (item.kind === 'upper-item') {
      setActiveView('fridge');
      setSelectedSampleId(null);
      if (selectedFridgeId !== item.refrigeratorId) {
        setSelectedFridgeId(item.refrigeratorId);
      }
      setUpperItemNavTarget({ fridgeId: item.refrigeratorId, itemId: item.id });
      return;
    }

    const sampleRecord = sampleRecords.find((record) => record.id === item.id);
    const locTube = sampleRecord?.tubes.find((tube) => tube.fridge_id && tube.drawer_id && tube.box_id);
    if (sampleRecord && locTube?.fridge_id && locTube.drawer_id && locTube.box_id) {
      setActiveView('fridge');
      setSelectedSampleId(null);
      if (selectedFridgeId !== locTube.fridge_id) {
        setSelectedFridgeId(locTube.fridge_id);
      }
      setDrawerSampleNavTarget({
        fridgeId: locTube.fridge_id,
        drawerId: locTube.drawer_id,
        drawerLabel: '',
        boxId: locTube.box_id,
        sampleId: sampleRecord.id,
      });
      return;
    }

    setSelectedSampleId(item.id);
  }, [sampleRecords, selectedFridgeId]);

  // ── Fridge handlers ──

  const handleAddFridge = useCallback(
    async (
      name: string,
      description?: string,
      fridgeType: FridgeType = 'drawer',
    ) => {
      try {
        const isShelf = fridgeType === 'shelf';
        const data = await apiCreateRefrigerator({
          name,
          description,
          upperRows: isShelf ? 2 : 2,
          upperCols: isShelf ? 1 : 3,
          lowerRows: isShelf ? 2 : 2,
          lowerCols: isShelf ? 1 : 2,
          fridgeType,
        });
        const newFridge: Refrigerator = {
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          upperRows: data.upper_rows,
          upperCols: data.upper_cols,
          lowerRows: data.lower_rows,
          lowerCols: data.lower_cols,
          upperTemperature: Number(data.upper_temperature ?? -20),
          lowerTemperature: Number(data.lower_temperature ?? 4),
          fridge_type: (data.fridge_type as FridgeType) || fridgeType,
        };
        setRefrigerators((prev) => [...prev, newFridge]);
        setSelectedFridgeId(newFridge.id);
        showNotif(`冰箱 "${newFridge.name}" 已创建`, 'success');
      } catch (err: any) {
        showNotif(`创建冰箱失败: ${err.message}`, 'error');
      }
    },
    [],
  );

  const handleEditFridge = useCallback(
    async (
      id: string,
      name: string,
      description?: string,
    ) => {
      try {
        const data = await apiUpdateRefrigerator(id, {
          name,
          description,
        });
        setRefrigerators((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  name: data.name,
                  description: data.description || undefined,
                  upperRows: data.upper_rows,
                  upperCols: data.upper_cols,
                  lowerRows: data.lower_rows,
                  lowerCols: data.lower_cols,
                  upperTemperature: Number(data.upper_temperature ?? r.upperTemperature),
                  lowerTemperature: Number(data.lower_temperature ?? r.lowerTemperature),
                }
              : r,
          ),
        );
        showNotif(`冰箱已更新`, 'success');
      } catch (err: any) {
        showNotif(`更新冰箱失败: ${err.message}`, 'error');
      }
    },
    [],
  );

  const handleDeleteFridge = useCallback(
    async (id: string) => {
      if (!window.confirm(`确定删除此冰箱？此操作不可撤销。`)) return;
      try {
        await apiDeleteRefrigerator(id);
        setRefrigerators((prev) => prev.filter((r) => r.id !== id));
        if (selectedFridgeId === id) {
          setRefrigerators((prev) => {
            setSelectedFridgeId(prev[0]?.id ?? null);
            return prev;
          });
        }
        showNotif('冰箱已删除', 'warn');
      } catch (err: any) {
        showNotif(`删除冰箱失败: ${err.message}`, 'error');
      }
    },
    [selectedFridgeId],
  );

  const handleAddSampleType = useCallback(
    async (name: string) => {
      setSampleTypes((prev) => (prev.includes(name) ? prev : [...prev, name]));
      try {
        await createSampleType(name);
      } catch (err: any) {
        if (err?.message === 'Type already exists') return;
        setSampleTypes((prev) => prev.filter((t) => t !== name));
        showNotif(`创建样本类型「${name}」失败: ${err?.message || '未知错误'}`, 'error');
      }
    },
    [showNotif],
  );

  const handleAddItemType = useCallback(
    async (name: string) => {
      setItemTypes((prev) => (prev.includes(name) ? prev : [...prev, name]));
      try {
        await createItemType(name);
      } catch (err: any) {
        if (err?.message === 'Type already exists') return;
        setItemTypes((prev) => prev.filter((t) => t !== name));
        showNotif(`创建物品类型「${name}」失败: ${err?.message || '未知错误'}`, 'error');
      }
    },
    [showNotif],
  );

  // ── Stats ──

  const usedSlots = isDrawerFridge ? drawerBoxCount : upperItemsCount;

  // Compute tube stats from sample records for the current fridge
  const fridgeTubes = React.useMemo(() => {
    if (!selectedFridgeId) return [];
    return sampleRecords.flatMap((sr) =>
      (sr.tubes || []).filter((t) => t.fridge_id === selectedFridgeId)
    );
  }, [sampleRecords, selectedFridgeId]);

  const totalTubes = fridgeTubes.length;
  const criticalCount = fridgeTubes.filter((t) => t.status === 'critical').length;
  const warningCount = fridgeTubes.filter((t) => t.status === 'warning').length;
  const upperItemTypeStats = React.useMemo(() => {
    const counts = new Map<string, number>();

    upperItems.forEach((item) => {
      const t = item.item_type?.trim();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    });

    return Array.from(counts, ([type, count]) => ({ type, count })).sort(
      (a, b) => b.count - a.count || a.type.localeCompare(b.type, 'zh-CN'),
    );
  }, [upperItems]);

  const sampleTypeStats = React.useMemo(() => {
    const counts = new Map<string, number>();

    sampleRecords.forEach((sr) => {
      const t = sr.sample_type?.trim();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    });

    return Array.from(counts, ([type, count]) => ({ type, count })).sort(
      (a, b) => b.count - a.count || a.type.localeCompare(b.type, 'zh-CN'),
    );
  }, [sampleRecords]);

  const displayedUpperItemTypeStats = upperItemTypeStats.slice(0, 8);
  const displayedSampleTypeStats = sampleTypeStats.slice(0, 8);
  const shelfStatsCards = React.useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => {
        const layer = index + 1;
        const count = upperItems.filter((item) => item.row_number === layer).length;
        const colors = ['#818cf8', '#38bdf8', '#34d399', '#f59e0b'];
        return {
          label: `第${layer}层`,
          value: `${count} 件`,
          sub: '物品',
          color: colors[index],
        };
      }),
    [upperItems],
  );
  const drawerStatsCards = React.useMemo(
    () => [
      {
        label: '上层',
        value: `${upperItemsCount} 件`,
        sub: '物品',
        color: '#818cf8',
      },
      {
        label: '下层',
        value: `${drawerBoxCount}/${drawerMaxBoxes} 盒`,
        sub: `${drawerLayers.map((l) => `${drawerLayerCounts[l] || 0}屉`).join(' + ')} · ${drawerCount}总计`,
        color: '#34d399',
      },
    ],
    [upperItemsCount, drawerBoxCount, drawerMaxBoxes, drawerLayers, drawerLayerCounts, drawerCount],
  );
  const homepageStatsCards = isDrawerFridge ? drawerStatsCards : shelfStatsCards;
  const upperItemTypeTitle = isDrawerFridge ? '上层物品类型' : '物品类型';
  const upperItemTypeOverflowText = isDrawerFridge ? '上层物品类型' : '物品类型';

  const itemTypeStats = React.useMemo(() => {
    const counts = new Map<string, number>();
    fridgeItems.forEach((item) => {
      const t = item.item_type?.trim();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    });
    return Array.from(counts, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [fridgeItems]);

  const boxTypeStats = React.useMemo(() => {
    const counts = new Map<string, number>();
    boxViewTubes.forEach((t) => {
      const st = t.sample_type?.trim();
      if (st) counts.set(st, (counts.get(st) ?? 0) + 1);
    });
    return Array.from(counts, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [boxViewTubes]);
  const remainingUpperItemTypeCount = Math.max(upperItemTypeStats.length - displayedUpperItemTypeStats.length, 0);
  const remainingSampleTypeCount = Math.max(sampleTypeStats.length - displayedSampleTypeStats.length, 0);

  const notifColors = {
    info: { bg: 'rgba(29,78,216,0.85)', border: '#3b82f6', text: '#93c5fd' },
    warn: { bg: 'rgba(180,83,9,0.85)', border: '#f59e0b', text: '#fcd34d' },
    success: { bg: 'rgba(21,128,61,0.85)', border: '#22c55e', text: '#86efac' },
    error: { bg: 'rgba(153,27,27,0.85)', border: '#ef4444', text: '#fca5a5' },
  };

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <div
        className="min-h-screen flex flex-col"
        style={{
          background: 'var(--app-bg)',
          fontFamily: "'SF Mono', 'Consolas', monospace",
          color: 'var(--app-text)',
        }}
      >
        {/* ── HEADER ── */}
        {isMobile ? (
          <header
            className="relative z-40 flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{
              background: 'var(--app-header-bg)',
              borderBottom: '1px solid var(--app-border)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--app-logo-bg)',
                  border: '1px solid var(--app-logo-border)',
                  boxShadow: '0 10px 22px rgba(37,99,235,0.12)',
                }}
              >
                <Database size={20} color="var(--app-logo-icon)" />
              </div>
              <h1 className="text-[16px] truncate" style={{ color: 'var(--app-text)' }}>
                冰箱管理系统
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {criticalCount + warningCount > 0 && (
                <div
                  className="min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: '#ef4444', color: '#fff' }}
                >
                  {criticalCount + warningCount}
                </div>
              )}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px] rounded-lg"
                    style={{
                      background: 'var(--app-panel-bg)',
                      border: '1px solid var(--app-border)',
                    }}
                  >
                    <Menu size={20} color="var(--app-text)" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-0">
                  <SheetHeader className="px-4 py-3 border-b" style={{ borderColor: 'var(--app-border)' }}>
                    <SheetTitle className="text-[15px]" style={{ color: 'var(--app-text)' }}>菜单</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 p-4 overflow-y-auto">
                    <FridgeSelector
                      refrigerators={refrigerators}
                      selectedId={selectedFridgeId}
                      canManage={isRoot}
                      onSelect={(id) => { setSelectedFridgeId(id); setMobileMenuOpen(false); }}
                      onAdd={handleAddFridge}
                      onDelete={handleDeleteFridge}
                      onEdit={handleEditFridge}
                    />
                    <button
                      type="button"
                      onClick={() => { setShowSideMap((v) => !v); setMobileMenuOpen(false); }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-[14px] min-h-[44px]"
                      style={{
                        background: showSideMap ? '#2563eb15' : 'var(--app-panel-bg)',
                        border: showSideMap ? '1px solid #3b82f680' : '1px solid var(--app-border)',
                        color: showSideMap ? '#2563eb' : 'var(--app-text)',
                      }}
                    >
                      <PanelLeft size={16} />
                      {showSideMap ? '隐藏冰箱图' : '显示冰箱图'}
                    </button>
                    {isRoot && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveView((view) => (view === 'admin' ? 'fridge' : 'admin'));
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-[14px] min-h-[44px]"
                        style={{
                          background: activeView === 'admin' ? '#2563eb' : 'var(--app-panel-bg)',
                          border: activeView === 'admin' ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                          color: activeView === 'admin' ? '#ffffff' : 'var(--app-text)',
                        }}
                      >
                        <Shield size={15} />
                        {activeView === 'admin' ? '返回冰箱' : '全局管理'}
                      </button>
                    )}
                    <div className="border-t my-1" style={{ borderColor: 'var(--app-border)' }} />
                    <UserMenu
                      username={user!.username}
                      role={user!.role}
                      uploadedItems={myUploadedItems}
                      uploadedUpperItems={myUploadedUpperItems}
                      hasBoxViewTubes={boxViewTubes.length > 0}
                      onOpenSample={(item) => { handleOpenUploadedItem(item); setMobileMenuOpen(false); }}
                      onLogout={logout}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>
        ) : (
        <header
          className="relative z-40 flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{
            background: 'var(--app-header-bg)',
            borderBottom: '1px solid var(--app-border)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: 'var(--app-logo-bg)',
                border: '1px solid var(--app-logo-border)',
                boxShadow: '0 10px 22px rgba(37,99,235,0.12)',
              }}
            >
              <Database size={22} color="var(--app-logo-icon)" />
            </div>
            <div>
              <h1 className="text-[20px]" style={{ color: 'var(--app-text)' }}>
                冰箱管理系统
              </h1>
              <div className="text-[13px]" style={{ color: '#334155' }}>
                Refrigerator Management · v2.0.{tick % 10}
              </div>
            </div>
            <FridgeSelector
              refrigerators={refrigerators}
              selectedId={selectedFridgeId}
              canManage={isRoot}
              onSelect={setSelectedFridgeId}
              onAdd={handleAddFridge}
              onDelete={handleDeleteFridge}
              onEdit={handleEditFridge}
            />
            <button
              type="button"
              onClick={() => setShowSideMap((v) => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
              style={{
                background: showSideMap ? '#2563eb15' : 'var(--app-panel-bg)',
                border: showSideMap ? '1px solid #3b82f680' : '1px solid var(--app-border)',
                color: showSideMap ? '#2563eb' : 'var(--app-muted)',
              }}
              title={showSideMap ? '隐藏冰箱图' : '显示冰箱图'}
            >
              <PanelLeft size={16} />
            </button>
          </div>

          <div className="flex items-center gap-6">
            {isRoot && (
              <button
                type="button"
                onClick={() => setActiveView((view) => (view === 'admin' ? 'fridge' : 'admin'))}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px]"
                style={{
                  background: activeView === 'admin' ? '#2563eb' : 'var(--app-panel-bg)',
                  border: activeView === 'admin' ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                  color: activeView === 'admin' ? '#ffffff' : 'var(--app-text)',
                }}
              >
                <Shield size={15} />
                {activeView === 'admin' ? '返回冰箱' : '全局管理'}
              </button>
            )}
            <UserMenu
              username={user!.username}
              role={user!.role}
              uploadedItems={myUploadedItems}
              uploadedUpperItems={myUploadedUpperItems}
              hasBoxViewTubes={boxViewTubes.length > 0}
              onOpenSample={handleOpenUploadedItem}
              onLogout={logout}
            />
            <div className="hidden lg:flex items-center gap-5">
              <StatChip
                icon={<Activity size={16} />}
                label="在线"
                value="实时监控"
                color="#22c55e"
              />
              <StatChip
                icon={<Database size={16} />}
                label="容器总数"
                value={`${usedSlots}/${totalCapacity}`}
                color="#60a5fa"
              />
              {totalTubes > 0 && (
                <StatChip
                  icon={<Layers size={16} />}
                  label="副样本"
                  value={`${totalTubes}`}
                  color="#a78bfa"
                />
              )}
              {criticalCount + warningCount > 0 && (
                <StatChip
                  icon={<AlertTriangle size={16} />}
                  label="严重警报"
                  value={`${criticalCount + warningCount} 个`}
                  color="#ef4444"
                />
              )}
            </div>
          </div>
        </header>
        )}

        {activeView === 'admin' && isRoot ? (
          <RootAdminPanel currentUsername={user!.username} onNotify={showNotif} />
        ) : isMobile ? (
    <main className="flex-1 flex flex-col gap-3 p-3 overflow-auto pb-28">
          {/* Search bar */}
          <div className="sticky top-0 z-30 -mx-3 -mt-3 px-3 pt-3 pb-3" style={{ background: 'var(--app-bg)', backdropFilter: 'blur(10px)' }}>
          <div
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3"
            style={{
              background: 'var(--app-card-bg)',
              border: `1px solid ${searchQuery ? 'rgba(37,99,235,0.35)' : 'var(--app-border)'}`,
              boxShadow: searchQuery ? '0 12px 34px rgba(37,99,235,0.08)' : '0 12px 34px rgba(15,23,42,0.06)',
            }}
          >
            <Search size={20} color={searchQuery ? '#2563eb' : 'var(--app-muted)'} />
            <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setHighlightedBoxId(null); }}
              className="flex-1 bg-transparent outline-none text-[16px] placeholder:text-slate-600"
              style={{ color: 'var(--app-text)' }}
            />
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                  style={{ color: 'var(--app-muted)' }}
                  title="搜索帮助"
                >
                  <CircleHelp size={16} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-4 text-[13px] leading-relaxed" style={{ background: 'var(--app-header-bg)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}>
                <div className="font-medium text-[14px] mb-2">搜索规则</div>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li>搜索范围：<b>患者姓名</b>、<b>样本编号</b>、<b>样本类型</b>、<b>盒子名称</b></li>
                  <li>盒子范围匹配：搜索 <code className="px-1 rounded text-[11px]" style={{ background: 'var(--app-input-bg)', color: '#2563eb' }}>MLP 12</code> 可匹配盒子 <code className="px-1 rounded text-[11px]" style={{ background: 'var(--app-input-bg)', color: '#2563eb' }}>MLP 11-20</code></li>
                  <li>结果排序：<b>样本记录优先</b>，盒子其次</li>
                </ul>
              </PopoverContent>
            </Popover>
            {searchQuery && (
              <div className="flex items-center gap-1">
                <span className="text-[14px]" style={{ color: '#2563eb' }}>
                  {globalFilteredRecords.length + globalFilteredBoxes.length} 个
                </span>
                <button
                  onClick={() => { setSearchQuery(''); setHighlightedBoxId(null); }}
                  className="text-[14px] px-2 py-1 rounded"
                  style={{ color: 'var(--app-muted)' }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Global search results dropdown */}
          {searchQuery.trim() && (globalFilteredRecords.length > 0 || globalFilteredBoxes.length > 0) && (
            <div
              className="rounded-xl p-3 space-y-1 max-h-56 overflow-y-auto"
              style={{
                background: 'var(--app-card-bg)',
                border: '1px solid var(--app-border)',
                boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
              }}
            >
              {globalFilteredRecords.length > 0 && (
                <>
                  <div className="text-[11px] px-1 mb-1" style={{ color: 'var(--app-muted)' }}>
                    全局匹配 · {globalFilteredRecords.length} 条
                  </div>
                  {globalFilteredRecords.slice(0, 15).map((sr) => (
                    <div
                      key={sr.id}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:brightness-95"
                      style={{
                        background: sr.group_color + '12',
                        border: `1px solid ${sr.group_color}20`,
                      }}
                      onClick={() => {
                        const matchedBoxId = getMatchedBoxId(sr);
                        setSearchQuery('');
                        if (matchedBoxId) setHighlightedBoxId(matchedBoxId);
                        if (sr.tubes && sr.tubes.length > 0) {
                          const matchedTube = matchedBoxId ? sr.tubes.find(t => t.box_id === matchedBoxId) : null;
                          const locTube = matchedTube || sr.tubes.find(t => t.fridge_id && t.drawer_id);
                          if (locTube?.fridge_id) {
                            setSelectedFridgeId(locTube.fridge_id);
                            if (locTube.drawer_id) {
                              setSideMapNavTarget({ drawerId: locTube.drawer_id, drawerLabel: '' });
                            }
                          }
                        }
                      }}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sr.group_color }} />
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] font-medium" style={{ color: 'var(--app-text)' }}>{sr.patient_name}</span>
                        <span className="text-[11px] ml-2" style={{ color: 'var(--app-muted)' }}>{sr.sample_code}</span>
                      </div>
                      {sr.sample_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--app-subtle-bg)', color: 'var(--app-subtle-text)' }}>
                          {sr.sample_type}
                        </span>
                      )}
                      {getMatchedBoxName(sr) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(34,211,238,0.15)', color: '#0891b2', border: '1px solid rgba(34,211,238,0.3)' }}>
                          {getMatchedBoxName(sr)}
                        </span>
                      )}
                    </div>
                  ))}
                </>
              )}
              {globalFilteredBoxes.length > 0 && (
                <>
                  <div className="text-[11px] px-1 mb-1 mt-1" style={{ color: 'var(--app-muted)' }}>
                    盒子匹配 · {globalFilteredBoxes.length} 个
                  </div>
                  {globalFilteredBoxes.slice(0, 8).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:brightness-95"
                      style={{
                        background: 'rgba(34,211,238,0.08)',
                        border: '1px solid rgba(34,211,238,0.2)',
                      }}
                      onClick={() => {
                        setSearchQuery('');
                        setHighlightedBoxId(b.id);
                        if (b.fridge_id) setSelectedFridgeId(b.fridge_id);
                        if (b.drawer_id) {
                          setSideMapNavTarget({ drawerId: b.drawer_id, drawerLabel: b.drawer_label || '' });
                        }
                      }}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] font-medium" style={{ color: 'var(--app-text)' }}>{b.name}</span>
                        <span className="text-[11px] ml-2" style={{ color: 'var(--app-muted)' }}>{b.drawer_label}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(34,211,238,0.15)', color: '#0891b2', border: '1px solid rgba(34,211,238,0.3)' }}>
                        盒子
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          </div>

          {/* Loading state */}
          {loading && (
            <div
              className="flex h-[200px] w-full items-center justify-center rounded-2xl"
              style={{
                background: 'var(--app-card-bg)',
                border: '1px solid var(--app-border)',
              }}
            >
              <span style={{ color: 'var(--app-muted)' }}>加载中...</span>
            </div>
          )}

          {/* The fridge */}
          {!loading && selectedFridgeId && selectedFridge && (
            selectedFridge.fridge_type === 'drawer' ? (
              <DrawerFridgeView
                fridge={selectedFridge}
                currentUser={user!.username}
                sampleTypes={sampleTypes}
                onAddSampleType={handleAddSampleType}
                itemTypes={itemTypes}
                onAddItemType={handleAddItemType}
                navigateToDrawer={sideMapNavTarget}
                onNavigated={() => setSideMapNavTarget(null)}
                navigateToSampleRecord={
                  drawerSampleNavTarget?.fridgeId === selectedFridge.id ? drawerSampleNavTarget : null
                }
                onSampleRecordNavigated={() => setDrawerSampleNavTarget(null)}
                navigateToUpperItem={
                  upperItemNavTarget?.fridgeId === selectedFridge.id
                    ? { itemId: upperItemNavTarget.itemId }
                    : null
                }
                onUpperItemNavigated={() => setUpperItemNavTarget(null)}
                pendingSamples={pendingSamples}
                onPendingSamplesChange={setPendingSamples}
                onImportComplete={handleImportComplete}
                onBoxViewChange={setBoxViewTubes}
                onBoxSamplePanelChange={setBoxSamplePanel}
                onFridgeDataChange={setFridgeItems}
                onActiveDrawerChange={setActiveDrawerId}
                highlightedBoxId={highlightedBoxId}
                onClearBoxHighlight={() => setHighlightedBoxId(null)}
                onDataChanged={() => {
                  setSideMapRefreshKey((k) => k + 1);
                  Promise.all([
                    fetchSampleRecords({}).catch(() => []),
                    fetchDrawers(selectedFridge!.id).catch(() => []),
                    fetchUpperItems(selectedFridge!.id).catch(() => []),
                    fetchFridgeBoxes(selectedFridge!.id).catch(() => []),
                  ]).then(([srData, drawerData, upperItemsData, boxData]) => {
                    setSampleRecords(srData);
                    setFridgeBoxes(boxData);
                    setDrawerCount(drawerData.length);
                    setDrawerBoxCount(drawerData.reduce((s: number, d: any) => s + (d.box_count ?? 0), 0));
                    setDrawerMaxBoxes(drawerData.reduce((s: number, d: any) => s + (d.max_boxes ?? 5), 0));
                    setDrawerLayers([...new Set(drawerData.map((d: any) => d.layer))].sort());
                    const layerCounts: Record<number, number> = {};
                    for (const d of drawerData) { layerCounts[d.layer] = (layerCounts[d.layer] || 0) + 1; }
                    setDrawerLayerCounts(layerCounts);
                    setUpperItemsCount(upperItemsData.length);
                    setUpperItems(upperItemsData);
                    setFridgeItems(upperItemsData);
                  });
                }}
              />
            ) : selectedFridge.fridge_type === 'shelf' ? (
              <ShelfFridgeView
                fridge={selectedFridge}
                currentUsername={user!.username}
                itemTypes={itemTypes}
                onAddItemType={handleAddItemType}
                navigateToItem={
                  upperItemNavTarget?.fridgeId === selectedFridge.id
                    ? { itemId: upperItemNavTarget.itemId }
                    : null
                }
                onItemNavigated={() => setUpperItemNavTarget(null)}
                onItemsChange={handleUpperItemsChange}
              />
            ) : (
              <div
                className="flex h-[200px] w-full items-center justify-center rounded-2xl"
                style={{
                  background: 'var(--app-card-bg)',
                  border: '1px solid var(--app-border)',
                }}
              >
                <span style={{ color: 'var(--app-muted)' }}>不支持的冰箱类型</span>
              </div>
            )
          )}

          {/* No fridge state */}
          {!loading && !selectedFridgeId && (
            <div
              className="flex h-[200px] w-full flex-col items-center justify-center gap-4 rounded-2xl"
              style={{
                background: 'var(--app-card-bg)',
                border: '1px solid var(--app-border)',
              }}
            >
              <span style={{ color: 'var(--app-muted)' }}>
                {isRoot ? '没有冰箱，请先创建一个' : '暂无可用冰箱，请联系 root 创建'}
              </span>
              {isRoot && (
                <button
                  onClick={async () => { await handleAddFridge('主冰箱', '默认冰箱', 'drawer'); await handleAddFridge('四层大空间冰箱', '四层固定大空间存储冰箱', 'shelf'); }}
                  className="px-4 py-2 rounded-lg text-[14px]"
                  style={{
                    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                    border: '1px solid #3b82f6',
                    color: '#fff',
                  }}
                >
                  创建默认冰箱
                </button>
              )}
            </div>
          )}

          {/* ── MOBILE: Floating action buttons ── */}
          <div className="fixed bottom-6 right-4 flex flex-col gap-3 z-40">
            {selectedFridge && selectedFridge.fridge_type === 'drawer' && (
              <button
                onClick={() => setMobileSideMapOpen(true)}
                className="rounded-full flex items-center justify-center shadow-lg"
                style={{
                  width: '48px',
                  height: '48px',
                  background: 'var(--app-card-bg)',
                  border: '1px solid var(--app-border)',
                  color: 'var(--app-text)',
                }}
              >
                <MapIcon size={20} />
              </button>
            )}
            <button
              onClick={() => setMobileStatsOpen(true)}
              className="rounded-full flex items-center justify-center shadow-lg"
              style={{
                width: '48px',
                height: '48px',
                background: 'var(--app-card-bg)',
                border: '1px solid var(--app-border)',
                color: 'var(--app-text)',
              }}
            >
              <BarChart3 size={20} />
            </button>
          </div>

          {/* ── MOBILE: SideMap Sheet (left) ── */}
          {selectedFridge && selectedFridge.fridge_type === 'drawer' && (
            <Sheet open={mobileSideMapOpen} onOpenChange={setMobileSideMapOpen}>
              <SheetContent side="left" className="w-[85vw] max-w-[360px] p-0 overflow-y-auto">
                <SheetHeader className="px-4 py-3 border-b" style={{ borderColor: 'var(--app-border)' }}>
                  <SheetTitle className="text-[15px]" style={{ color: 'var(--app-text)' }}>冰箱图</SheetTitle>
                </SheetHeader>
                <div className="p-3">
                  <FridgeSideMap
                    fridgeId={selectedFridge.id}
                    fridgeName={selectedFridge.name}
                    selectedDrawerId={activeDrawerId}
                    onDrawerClick={(drawerId, drawerLabel) => {
                      setSideMapNavTarget({ drawerId, drawerLabel });
                      setMobileSideMapOpen(false);
                    }}
                    refreshKey={sideMapRefreshKey}
                  />
                  <div className="mt-3">
                    <PendingSamplesPanel
                      samples={pendingSamples}
                      onClear={() => setPendingSamples([])}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* ── MOBILE: Stats Drawer (bottom) ── */}
          <Drawer open={mobileStatsOpen} onOpenChange={setMobileStatsOpen}>
            <DrawerContent className="max-h-[85vh]">
              <div className="px-4 pb-8 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {homepageStatsCards.map((card) => (
                    <StatsCard
                      key={card.label}
                      label={card.label}
                      value={card.value}
                      sub={card.sub}
                      color={card.color}
                    />
                  ))}
                </div>

                {boxViewTubes.length === 0 ? (
                  <>
                    <div
                      className="rounded-xl p-4 mb-3"
                      style={{
                        background: 'var(--app-card-bg)',
                        border: '1px solid var(--app-border)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Tags size={15} color="#38bdf8" />
                          <span className="text-[14px]" style={{ color: 'var(--app-text)' }}>{upperItemTypeTitle}</span>
                        </div>
                        <span className="text-[12px] font-mono" style={{ color: 'var(--app-muted)' }}>{upperItemTypeStats.length} 类</span>
                      </div>
                      {displayedUpperItemTypeStats.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:space-y-2 lg:overflow-visible">
                          {displayedUpperItemTypeStats.slice(0, isMobile ? 4 : 8).map(({ type, count }) => {
                            const cfg = getItemTypeConfig(type);
                            return (
                              <div key={type} className="flex items-center gap-2 flex-shrink-0 lg:flex-shrink">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                                <span
                                  className="min-w-0 truncate rounded-md px-2 py-1 text-[13px]"
                                  title={type}
                                  style={{
                                    background: cfg.bgColor,
                                    border: '1px solid ' + cfg.color + '30',
                                    color: cfg.color,
                                  }}
                                >{cfg.label}&nbsp;<span className="font-semibold tabular-nums">×{count}</span></span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-lg px-3 py-4 text-center text-[13px]" style={{ background: 'var(--app-subtle-bg)', border: '1px dashed var(--app-subtle-border)', color: 'var(--app-muted)' }}>暂无物品</div>
                      )}
                    </div>
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: 'var(--app-card-bg)',
                        border: '1px solid var(--app-border)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Tags size={15} color="#38bdf8" />
                          <span className="text-[14px]" style={{ color: 'var(--app-text)' }}>样本类型</span>
                        </div>
                        <span className="text-[12px] font-mono" style={{ color: 'var(--app-muted)' }}>{sampleTypeStats.length} 类</span>
                      </div>
                      {displayedSampleTypeStats.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:space-y-2 lg:overflow-visible">
                          {displayedSampleTypeStats.slice(0, isMobile ? 4 : 8).map(({ type, count }) => {
                            const typeColor = getSampleTypeColor(type);
                            return (
                              <div key={type} className="flex items-center gap-2 flex-shrink-0 lg:flex-shrink">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: typeColor }} />
                                <span
                                  className="min-w-0 truncate rounded-md px-2 py-1 text-[13px]"
                                  title={type}
                                  style={{
                                    background: typeColor + '18',
                                    border: `1px solid ${typeColor}30`,
                                    color: 'var(--app-text)',
                                  }}
                                >{type}&nbsp;<span className="font-semibold tabular-nums" style={{ color: typeColor }}>×{count}</span></span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-lg px-3 py-4 text-center text-[13px]" style={{ background: 'var(--app-subtle-bg)', border: '1px dashed var(--app-subtle-border)', color: 'var(--app-muted)' }}>暂无标签数据</div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="rounded-xl p-4 mb-3"
                      style={{
                        background: 'var(--app-card-bg)',
                        border: '1px solid var(--app-border)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Tags size={15} color="#38bdf8" />
                          <span className="text-[14px]" style={{ color: 'var(--app-text)' }}>当前盒子的样本类型</span>
                        </div>
                        <span className="text-[12px] font-mono" style={{ color: 'var(--app-muted)' }}>{boxTypeStats.length} 类</span>
                      </div>
                      {boxTypeStats.length > 0 ? (
                        <div className="space-y-2">
                          {boxTypeStats.slice(0, 8).map(({ type, count }) => {
                            const typeColor = getSampleTypeColor(type);
                            return (
                              <div key={type} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: typeColor }} />
                                <span
                                  className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-[13px]"
                                  title={type}
                                  style={{
                                    background: typeColor + '18',
                                    border: `1px solid ${typeColor}30`,
                                    color: 'var(--app-text)',
                                  }}
                                >{type}</span>
                                <span className="min-w-8 text-right text-[14px] font-mono" style={{ color: '#2563eb' }}>{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-lg px-3 py-4 text-center text-[13px]" style={{ background: 'var(--app-subtle-bg)', border: '1px dashed var(--app-subtle-border)', color: 'var(--app-muted)' }}>暂无标签数据</div>
                      )}
                    </div>
                    {boxSamplePanel && boxSamplePanel.tubes.length > 0 && (
                      <SampleListPanel
                        tubes={boxSamplePanel.tubes}
                        onTubeHover={boxSamplePanel.onTubeHover}
                        onBatchEdit={boxSamplePanel.onBatchEdit}
                        onSelectSample={boxSamplePanel.onSelectSample}
                      />
                    )}
                  </>
                )}
              </div>
            </DrawerContent>
          </Drawer>

        </main>
        ) : (
    <main className="flex-1 flex gap-3 lg:gap-6 p-3 lg:p-6 overflow-auto items-start">{/* DESKTOP LAYOUT — UNCHANGED */}
          {/* ── Far Left: 2D Fridge Map + Pending Samples ── */}
          {selectedFridge && selectedFridge.fridge_type === 'drawer' && showSideMap && (
            <div className="flex flex-col gap-3 flex-shrink-0">
              <FridgeSideMap
                fridgeId={selectedFridge.id}
                fridgeName={selectedFridge.name}
                selectedDrawerId={activeDrawerId}
                onDrawerClick={(drawerId, drawerLabel) => {
                  setSideMapNavTarget({ drawerId, drawerLabel });
                }}
                refreshKey={sideMapRefreshKey}
              />
              <PendingSamplesPanel
                samples={pendingSamples}

                onClear={() => setPendingSamples([])}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-5 items-start justify-center min-w-0">
          {/* Center: Fridge */}
          <div className="flex flex-1 w-full max-w-full lg:max-w-[860px] flex-col gap-5">
            {/* Search bar */}
              <div
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3"
                style={{
                  background: 'var(--app-card-bg)',
                  border: `1px solid ${searchQuery ? 'rgba(37,99,235,0.35)' : 'var(--app-border)'}`,
                  boxShadow: searchQuery ? '0 12px 34px rgba(37,99,235,0.08)' : '0 12px 34px rgba(15,23,42,0.06)',
                }}
              >
              <Search size={20} color={searchQuery ? '#2563eb' : 'var(--app-muted)'} />
              <input
                type="text"
                placeholder="搜索样本、类型、患者、盒子..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setHighlightedBoxId(null); }}
                className="flex-1 bg-transparent outline-none text-[16px] placeholder:text-slate-600"
                style={{ color: 'var(--app-text)' }}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                    style={{ color: 'var(--app-muted)' }}
                    title="搜索帮助"
                  >
                    <CircleHelp size={16} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-4 text-[13px] leading-relaxed" style={{ background: 'var(--app-header-bg)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}>
                  <div className="font-medium text-[14px] mb-2">搜索规则</div>
                  <ul className="space-y-1.5 list-disc list-inside">
                    <li>搜索范围：<b>患者姓名</b>、<b>样本编号</b>、<b>样本类型</b>、<b>盒子名称</b></li>
                    <li>盒子范围匹配：搜索 <code className="px-1 rounded text-[11px]" style={{ background: 'var(--app-input-bg)', color: '#2563eb' }}>MLP 12</code> 可匹配盒子 <code className="px-1 rounded text-[11px]" style={{ background: 'var(--app-input-bg)', color: '#2563eb' }}>MLP 11-20</code></li>
                    <li>结果排序：<b>样本记录优先</b>，盒子其次</li>
                  </ul>
                </PopoverContent>
              </Popover>
              {searchQuery && (
                <div className="flex items-center gap-1">
                  <span className="text-[14px]" style={{ color: '#2563eb' }}>
                    {globalFilteredRecords.length + globalFilteredBoxes.length} 个匹配
                  </span>
                  <button
                    onClick={() => { setSearchQuery(''); setHighlightedBoxId(null); }}
                    className="text-[14px] px-2 py-1 rounded"
                    style={{ color: 'var(--app-muted)' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Global search results dropdown */}
            {searchQuery.trim() && (globalFilteredRecords.length > 0 || globalFilteredBoxes.length > 0) && (
              <div
                className="rounded-xl p-3 space-y-1 max-h-56 overflow-y-auto"
                style={{
                  background: 'var(--app-card-bg)',
                  border: boxViewTubes.length > 0 ? '1px solid #22d3ee40' : '1px solid var(--app-border)',
                  boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
                }}
              >
                {globalFilteredRecords.length > 0 && (
                  <>
                    <div className="text-[11px] px-1 mb-1" style={{ color: 'var(--app-muted)' }}>
                      全局样本记录匹配 · {globalFilteredRecords.length} 条
                    </div>
                    {globalFilteredRecords.slice(0, 15).map((sr) => (
                      <div
                        key={sr.id}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:brightness-95"
                        style={{
                          background: sr.group_color + '12',
                          border: `1px solid ${sr.group_color}20`,
                        }}
                        onClick={() => {
                          const matchedBoxId = getMatchedBoxId(sr);
                          setSearchQuery('');
                          if (matchedBoxId) setHighlightedBoxId(matchedBoxId);
                          if (sr.tubes && sr.tubes.length > 0) {
                            const matchedTube = matchedBoxId ? sr.tubes.find(t => t.box_id === matchedBoxId) : null;
                            const locTube = matchedTube || sr.tubes.find(t => t.fridge_id && t.drawer_id);
                            if (locTube?.fridge_id) {
                              setSelectedFridgeId(locTube.fridge_id);
                              if (locTube.drawer_id) {
                                setSideMapNavTarget({ drawerId: locTube.drawer_id, drawerLabel: '' });
                              }
                            }
                          }
                        }}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sr.group_color }} />
                        <div className="min-w-0 flex-1">
                          <span className="text-[13px] font-medium" style={{ color: 'var(--app-text)' }}>{sr.patient_name}</span>
                          <span className="text-[11px] ml-2" style={{ color: 'var(--app-muted)' }}>{sr.sample_code}</span>
                        </div>
                        {sr.sample_type && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--app-subtle-bg)', color: 'var(--app-subtle-text)' }}>
                            {sr.sample_type}
                          </span>
                        )}
                        {getMatchedBoxName(sr) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(34,211,238,0.15)', color: '#0891b2', border: '1px solid rgba(34,211,238,0.3)' }}>
                            {getMatchedBoxName(sr)}
                          </span>
                        )}
                        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--app-muted)' }}>{sr.tube_count || 0} 管</span>
                      </div>
                    ))}
                    {globalFilteredRecords.length > 15 && (
                      <div className="text-center pt-1 text-[11px]" style={{ color: 'var(--app-muted)' }}>
                        还有 {globalFilteredRecords.length - 15} 条...
                      </div>
                    )}
                  </>
                )}
                {globalFilteredBoxes.length > 0 && (
                  <>
                    <div className="text-[11px] px-1 mb-1 mt-1" style={{ color: 'var(--app-muted)' }}>
                      盒子匹配 · {globalFilteredBoxes.length} 个
                    </div>
                    {globalFilteredBoxes.slice(0, 8).map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:brightness-95"
                        style={{
                          background: 'rgba(34,211,238,0.08)',
                          border: '1px solid rgba(34,211,238,0.2)',
                        }}
                        onClick={() => {
                          setSearchQuery('');
                          setHighlightedBoxId(b.id);
                          if (b.fridge_id) setSelectedFridgeId(b.fridge_id);
                          if (b.drawer_id) {
                            setSideMapNavTarget({ drawerId: b.drawer_id, drawerLabel: b.drawer_label || '' });
                          }
                        }}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
                        <div className="min-w-0 flex-1">
                          <span className="text-[13px] font-medium" style={{ color: 'var(--app-text)' }}>{b.name}</span>
                          <span className="text-[11px] ml-2" style={{ color: 'var(--app-muted)' }}>{b.drawer_label}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(34,211,238,0.15)', color: '#0891b2', border: '1px solid rgba(34,211,238,0.3)' }}>
                          盒子
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div
                className="flex h-[200px] w-full items-center justify-center rounded-2xl"
                style={{
                  background: 'var(--app-card-bg)',
                  border: boxViewTubes.length > 0 ? '1px solid #22d3ee40' : '1px solid var(--app-border)',
                }}
              >
                <span style={{ color: 'var(--app-muted)' }}>加载中...</span>
              </div>
            )}

            {/* The fridge */}
            {!loading && selectedFridgeId && selectedFridge && (
              selectedFridge.fridge_type === 'drawer' ? (
                <DrawerFridgeView
                  fridge={selectedFridge}
                  currentUser={user!.username}
                  sampleTypes={sampleTypes}
                  onAddSampleType={handleAddSampleType}
                  itemTypes={itemTypes}
                  onAddItemType={handleAddItemType}
                  navigateToDrawer={sideMapNavTarget}
                  onNavigated={() => setSideMapNavTarget(null)}
                  navigateToSampleRecord={
                    drawerSampleNavTarget?.fridgeId === selectedFridge.id ? drawerSampleNavTarget : null
                  }
                  onSampleRecordNavigated={() => setDrawerSampleNavTarget(null)}
                  navigateToUpperItem={
                    upperItemNavTarget?.fridgeId === selectedFridge.id
                      ? { itemId: upperItemNavTarget.itemId }
                      : null
                  }
                  onUpperItemNavigated={() => setUpperItemNavTarget(null)}
                  pendingSamples={pendingSamples}
                  onPendingSamplesChange={setPendingSamples}
                  onImportComplete={handleImportComplete}
                  onBoxViewChange={setBoxViewTubes}
                  onBoxSamplePanelChange={setBoxSamplePanel}
                  onFridgeDataChange={setFridgeItems}
                  onActiveDrawerChange={setActiveDrawerId}
                  highlightedBoxId={highlightedBoxId}
                  onClearBoxHighlight={() => setHighlightedBoxId(null)}
                  onDataChanged={() => {
                    setSideMapRefreshKey((k) => k + 1);
                    Promise.all([
                      fetchSampleRecords({}).catch(() => []),
                      fetchDrawers(selectedFridge.id).catch(() => []),
                      fetchUpperItems(selectedFridge.id).catch(() => []),
                      fetchFridgeBoxes(selectedFridge.id).catch(() => []),
                    ]).then(([srData, drawerData, upperItemsData, boxData]) => {
                      setSampleRecords(srData);
                      setFridgeBoxes(boxData);
                      setDrawerCount(drawerData.length);
                      setDrawerBoxCount(drawerData.reduce((s: number, d: any) => s + (d.box_count ?? 0), 0));
                      setDrawerMaxBoxes(drawerData.reduce((s: number, d: any) => s + (d.max_boxes ?? 5), 0));
                      setDrawerLayers([...new Set(drawerData.map((d: any) => d.layer))].sort());
                      const layerCounts: Record<number, number> = {};
                      for (const d of drawerData) {
                        layerCounts[d.layer] = (layerCounts[d.layer] || 0) + 1;
                      }
                      setDrawerLayerCounts(layerCounts);
                      setUpperItemsCount(upperItemsData.length);
                      setUpperItems(upperItemsData);
                      setFridgeItems(upperItemsData);
                    });
                  }}
                />
              ) : selectedFridge.fridge_type === 'shelf' ? (
                <ShelfFridgeView
                  fridge={selectedFridge}
                  currentUsername={user!.username}
                  itemTypes={itemTypes}
                  onAddItemType={handleAddItemType}
                  navigateToItem={
                    upperItemNavTarget?.fridgeId === selectedFridge.id
                      ? { itemId: upperItemNavTarget.itemId }
                      : null
                  }
                  onItemNavigated={() => setUpperItemNavTarget(null)}
                  onItemsChange={handleUpperItemsChange}
                />
              ) : (
                <div
                  className="flex h-[200px] w-full items-center justify-center rounded-2xl"
                  style={{
                    background: 'var(--app-card-bg)',
                    border: '1px solid var(--app-border)',
                  }}
                >
                  <span style={{ color: 'var(--app-muted)' }}>不支持的冰箱类型</span>
                </div>
              )
            )}

            {/* No fridge state */}
            {!loading && !selectedFridgeId && (
              <div
                className="flex h-[200px] w-full flex-col items-center justify-center gap-4 rounded-2xl"
                style={{
                  background: 'var(--app-card-bg)',
                  border: boxViewTubes.length > 0 ? '1px solid #22d3ee40' : '1px solid var(--app-border)',
                }}
              >
                <span style={{ color: 'var(--app-muted)' }}>
                  {isRoot ? '没有冰箱，请先创建一个' : '暂无可用冰箱，请联系 root 创建'}
                </span>
                {isRoot && (
                  <button
                    onClick={async () => { await handleAddFridge('主冰箱', '默认冰箱', 'drawer'); await handleAddFridge('四层大空间冰箱', '四层固定大空间存储冰箱', 'shelf'); }}
                    className="px-4 py-2 rounded-lg text-[14px]"
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                      border: '1px solid #3b82f6',
                      color: '#fff',
                    }}
                  >
                    创建默认冰箱
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Control Panel */}
          <div
            className="flex w-full flex-col gap-4"
            style={{ maxWidth: '400px' }}
          >
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3">
              {homepageStatsCards.map((card) => (
                <StatsCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  sub={card.sub}
                  color={card.color}
                />
              ))}
            </div>

            {boxViewTubes.length === 0 ? (
              <>
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: 'var(--app-card-bg)',
                    border: '1px solid var(--app-border)',
                    boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Tags size={15} color="#38bdf8" />
                      <span className="text-[14px]" style={{ color: 'var(--app-text)' }}>
                        {upperItemTypeTitle}
                      </span>
                    </div>
                    <span className="text-[12px] font-mono" style={{ color: 'var(--app-muted)' }}>
                      {upperItemTypeStats.length} 类
                    </span>
                  </div>
                  {displayedUpperItemTypeStats.length > 0 ? (
                    <div className="space-y-2">
                      {displayedUpperItemTypeStats.map(({ type, count }) => {
                        const cfg = getItemTypeConfig(type);
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                            <span
                              className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-[13px]"
                              title={type}
                              style={{
                                background: cfg.bgColor,
                                border: '1px solid ' + cfg.color + '30',
                                color: cfg.color,
                              }}
                            >
                              {cfg.label}
                            </span>
                            <span className="min-w-8 text-right text-[14px] font-mono" style={{ color: '#2563eb' }}>
                              {count}
                            </span>
                          </div>
                        );
                      })}
                      {remainingUpperItemTypeCount > 0 && (
                        <div className="pt-1 text-right text-[12px]" style={{ color: 'var(--app-muted)' }}>
                          另有 {remainingUpperItemTypeCount} 类{upperItemTypeOverflowText}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="rounded-lg px-3 py-4 text-center text-[13px]"
                      style={{
                        background: 'var(--app-subtle-bg)',
                        border: '1px dashed var(--app-subtle-border)',
                        color: 'var(--app-muted)',
                      }}
                    >
                      暂无物品
                    </div>
                  )}
                </div>

                <div
                  className="rounded-xl p-4"
                  style={{
                    background: 'var(--app-card-bg)',
                    border: '1px solid var(--app-border)',
                    boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Tags size={15} color="#38bdf8" />
                      <span className="text-[14px]" style={{ color: 'var(--app-text)' }}>
                        样本类型
                      </span>
                    </div>
                    <span className="text-[12px] font-mono" style={{ color: 'var(--app-muted)' }}>
                      {sampleTypeStats.length} 类
                    </span>
                  </div>
                  {displayedSampleTypeStats.length > 0 ? (
                    <div className="space-y-2">
                      {displayedSampleTypeStats.map(({ type, count }) => {
                        const typeColor = getSampleTypeColor(type);
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: typeColor }} />
                            <span
                              className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-[13px]"
                              title={type}
                              style={{
                                background: typeColor + '18',
                                border: `1px solid ${typeColor}30`,
                                color: 'var(--app-text)',
                              }}
                            >
                              {type}
                            </span>
                            <span className="min-w-8 text-right text-[14px] font-mono" style={{ color: '#2563eb' }}>
                              {count}
                            </span>
                          </div>
                        );
                      })}
                      {remainingSampleTypeCount > 0 && (
                        <div className="pt-1 text-right text-[12px]" style={{ color: 'var(--app-muted)' }}>
                          另有 {remainingSampleTypeCount} 类样本类型
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="rounded-lg px-3 py-4 text-center text-[13px]"
                      style={{
                        background: 'var(--app-subtle-bg)',
                        border: '1px dashed var(--app-subtle-border)',
                        color: 'var(--app-muted)',
                      }}
                    >
                      暂无标签数据
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: 'var(--app-card-bg)',
                    border: '1px solid var(--app-border)',
                    boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Tags size={15} color="#38bdf8" />
                      <span className="text-[14px]" style={{ color: 'var(--app-text)' }}>
                        当前盒子的样本类型
                      </span>
                    </div>
                    <span className="text-[12px] font-mono" style={{ color: 'var(--app-muted)' }}>
                      {boxTypeStats.length} 类
                    </span>
                  </div>
                  {boxTypeStats.length > 0 ? (
                    <div className="space-y-2">
                      {boxTypeStats.slice(0, 8).map(({ type, count }) => {
                        const typeColor = getSampleTypeColor(type);
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: typeColor }} />
                            <span
                              className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-[13px]"
                              title={type}
                              style={{
                                background: typeColor + '18',
                                border: `1px solid ${typeColor}30`,
                                color: 'var(--app-text)',
                              }}
                            >
                              {type}
                            </span>
                            <span className="min-w-8 text-right text-[14px] font-mono" style={{ color: '#2563eb' }}>
                              {count}
                            </span>
                          </div>
                        );
                      })}
                      {boxTypeStats.length > 8 && (
                        <div className="pt-1 text-right text-[12px]" style={{ color: 'var(--app-muted)' }}>
                          另有 {boxTypeStats.length - 8} 类当前盒子样本类型
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="rounded-lg px-3 py-4 text-center text-[13px]"
                      style={{
                        background: 'var(--app-subtle-bg)',
                        border: '1px dashed var(--app-subtle-border)',
                        color: 'var(--app-muted)',
                      }}
                    >
                      暂无标签数据
                    </div>
                  )}
                </div>
                {boxSamplePanel && boxSamplePanel.tubes.length > 0 && (
                  <SampleListPanel
                    tubes={boxSamplePanel.tubes}
                    onTubeHover={boxSamplePanel.onTubeHover}
                    onBatchEdit={boxSamplePanel.onBatchEdit}
                    onSelectSample={boxSamplePanel.onSelectSample}
                  />
                )}
              </>
            )}

          </div>
          </div>
        </main>
        )}

        {/* ── NOTIFICATION TOAST ── */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-xl text-[16px] z-50"
              style={{
                background: notifColors[notification.type].bg,
                border: `1px solid ${notifColors[notification.type].border}`,
                color: notifColors[notification.type].text,
                boxShadow: `0 0 8px ${notifColors[notification.type].border}30`,
                backdropFilter: 'blur(8px)',
              }}
            >
              {notification.msg}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DndProvider>
  );
}

function StatChip({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color }}>{icon}</span>
      <div>
        <div className="text-[12px]" style={{ color: 'var(--app-subtle-text)' }}>
          {label}
        </div>
        <div className="text-[14px] font-mono" style={{ color }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function UserMenu({
  username,
  role,
  uploadedItems,
  uploadedUpperItems,
  hasBoxViewTubes,
  onOpenSample,
  onLogout,
}: {
  username: string;
  role: string;
  uploadedItems: UploadedRecordItem[];
  uploadedUpperItems: UploadedUpperItem[];
  hasBoxViewTubes: boolean;
  onOpenSample: (item: UploadedPanelItem) => void;
  onLogout: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const { register, isRoot } = useAuth();
  const isMobile = useIsMobile();
  const isDark = theme === 'dark';
  const [showRegister, setShowRegister] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'root'>('user');
  const [message, setMessage] = useState('');
  const [registering, setRegistering] = useState(false);
  const [showUploads, setShowUploads] = useState(false);
  const [uploadTab, setUploadTab] = useState<'samples' | 'items'>('samples');
  const [uploadPages, setUploadPages] = useState({ samples: 0, items: 0 });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const uploadPageSize = 4;
  const samplePageCount = Math.max(1, Math.ceil(uploadedItems.length / uploadPageSize));
  const itemPageCount = Math.max(1, Math.ceil(uploadedUpperItems.length / uploadPageSize));
  const currentSampleUploadPage = Math.min(uploadPages.samples, samplePageCount - 1);
  const currentItemUploadPage = Math.min(uploadPages.items, itemPageCount - 1);
  const pagedUploadedSamples = uploadedItems.slice(
    currentSampleUploadPage * uploadPageSize,
    currentSampleUploadPage * uploadPageSize + uploadPageSize,
  );
  const pagedUploadedUpperItems = uploadedUpperItems.slice(
    currentItemUploadPage * uploadPageSize,
    currentItemUploadPage * uploadPageSize + uploadPageSize,
  );

  useEffect(() => {
    setUploadPages((prev) => ({
      samples: Math.min(prev.samples, samplePageCount - 1),
      items: Math.min(prev.items, itemPageCount - 1),
    }));
  }, [samplePageCount, itemPageCount]);

  useEffect(() => {
    if (isMobile || (!showUploads && !showRegister)) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUploads(false);
        setShowRegister(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowUploads(false);
        setShowRegister(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobile, showRegister, showUploads]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUsername = newUsername.trim();
    if (!normalizedUsername || !newPassword) {
      setMessage('请填写用户名和密码');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('两次密码不一致');
      return;
    }
    setRegistering(true);
    setMessage('');
    try {
      await register(normalizedUsername, newPassword, newRole);
      setMessage(`已创建 ${normalizedUsername}`);
      setNewUsername('');
      setNewPassword('');
      setConfirmPassword('');
      setNewRole('user');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      setMessage(err.message || '创建失败');
    } finally {
      setRegistering(false);
    }
  };

  const renderUploadPager = (tab: 'samples' | 'items', total: number) => {
    const pageCount = tab === 'samples' ? samplePageCount : itemPageCount;
    const page = tab === 'samples' ? Math.min(uploadPages.samples, pageCount - 1) : Math.min(uploadPages.items, pageCount - 1);
    if (total <= uploadPageSize) return null;

    return (
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setUploadPages((prev) => ({ ...prev, [tab]: Math.max(0, page - 1) }))}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] disabled:opacity-35"
          style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)', color: 'var(--app-muted)' }}
        >
          <ChevronLeft size={13} />上一页
        </button>
        <span className="text-[11px] font-mono" style={{ color: 'var(--app-muted)' }}>
          {page + 1}/{pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount - 1}
          onClick={() => setUploadPages((prev) => ({ ...prev, [tab]: Math.min(pageCount - 1, page + 1) }))}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] disabled:opacity-35"
          style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)', color: 'var(--app-muted)' }}
        >
          下一页<ChevronRight size={13} />
        </button>
      </div>
    );
  };

  const renderUploadedSampleList = () => {
    if (uploadedItems.length === 0) {
      return (
        <div className="rounded-lg px-3 py-5 text-center text-[13px]" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)', color: 'var(--app-muted)' }}>
          当前冰箱暂无你上传的样本
        </div>
      );
    }

    return (
      <>
        <div className="space-y-2">
          {pagedUploadedSamples.map((item) => {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onOpenSample(item);
                  setShowUploads(false);
                }}
                className="w-full rounded-lg px-3 py-2.5 text-left transition-all hover:brightness-95"
                style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[13px] truncate">{item.name}</span>
                    <div className="mt-1 text-[11px] truncate" style={{ color: 'var(--app-muted)' }}>
                      {item.type} · {item.uploader}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>{formatChineseShortDate(item.createdAt)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {renderUploadPager('samples', uploadedItems.length)}
      </>
    );
  };

  const renderUploadedItemList = () => {
    if (uploadedUpperItems.length === 0) {
      return (
        <div className="rounded-lg px-3 py-5 text-center text-[13px]" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)', color: 'var(--app-muted)' }}>
          当前冰箱暂无你上传的物品
        </div>
      );
    }

    return (
      <>
        <div className="space-y-2">
          {pagedUploadedUpperItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onOpenSample(item);
                setShowUploads(false);
              }}
              className="w-full rounded-lg px-3 py-2.5 text-left transition-all hover:brightness-95"
              style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#2563eb' }} />
                    <span className="text-[13px] truncate">{item.name}</span>
                  </div>
                  <div className="mt-1 text-[11px] truncate" style={{ color: 'var(--app-muted)' }}>
                    {item.type} · 第 {item.rowNumber} 行 · {item.boxMode === 'precise' ? '孔位盒' : '普通物品'}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[11px]" style={{ color: '#2563eb' }}>×{item.quantity}</div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--app-muted)' }}>定位</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        {renderUploadPager('items', uploadedUpperItems.length)}
      </>
    );
  };

  const uploadsPanelContent = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <div className="text-[13px]" style={{ color: 'var(--app-text)' }}>我的上传</div>
          <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
            当前冰箱 · 样本 {uploadedItems.length} · 物品 {uploadedUpperItems.length}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)', color: '#2563eb' }}>
          {uploadTab === 'samples' ? <FlaskConical size={16} /> : <Package size={16} />}
        </div>
      </div>

      <Tabs value={uploadTab} onValueChange={(value) => setUploadTab(value as 'samples' | 'items')} className="w-full">
        <TabsList className="mb-3 grid w-full grid-cols-2">
          <TabsTrigger value="samples">样本 {uploadedItems.length}</TabsTrigger>
          <TabsTrigger value="items">物品 {uploadedUpperItems.length}</TabsTrigger>
        </TabsList>
        <TabsContent value="samples" className="mt-0 outline-none">
          {renderUploadedSampleList()}
        </TabsContent>
        <TabsContent value="items" className="mt-0 outline-none">
          {renderUploadedItemList()}
        </TabsContent>
      </Tabs>
    </>
  );

  const registerPanelContent = (
    <form onSubmit={handleRegister} className="space-y-2">
      <div className="text-[13px]" style={{ color: 'var(--app-text)' }}>
        创建用户
      </div>
      <input
        value={newUsername}
        onChange={(e) => setNewUsername(e.target.value)}
        placeholder="用户名"
        className="w-full rounded-md px-2 py-2 text-[13px] outline-none"
        style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}
      />
      <div
        className="flex items-center rounded-md"
        style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}
      >
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="密码"
          type={showNewPassword ? 'text' : 'password'}
          className="w-full bg-transparent px-2 py-2 text-[13px] outline-none"
        />
        <button
          type="button"
          onClick={() => setShowNewPassword((value) => !value)}
          className="flex h-9 w-9 items-center justify-center"
          style={{ color: 'var(--app-muted)' }}
          aria-label={showNewPassword ? '隐藏密码' : '显示密码'}
        >
          {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <div
        className="flex items-center rounded-md"
        style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}
      >
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="确认密码"
          type={showConfirmPassword ? 'text' : 'password'}
          className="w-full bg-transparent px-2 py-2 text-[13px] outline-none"
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword((value) => !value)}
          className="flex h-9 w-9 items-center justify-center"
          style={{ color: 'var(--app-muted)' }}
          aria-label={showConfirmPassword ? '隐藏确认密码' : '显示确认密码'}
        >
          {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <select
        value={newRole}
        onChange={(e) => setNewRole(e.target.value as 'user' | 'root')}
        className="w-full rounded-md px-2 py-2 text-[13px] outline-none"
        style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}
      >
        <option value="user">普通用户</option>
        <option value="root">管理员 root</option>
      </select>
      <button
        disabled={registering}
        className="w-full rounded-md py-2 text-[13px]"
        style={{ background: registering ? '#94a3b8' : '#2563eb', color: '#fff' }}
      >
        {registering ? '创建中...' : '创建'}
      </button>
      {message && <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>{message}</div>}
    </form>
  );

  return (
    <div
      className={`relative flex min-w-0 items-center gap-2 ${showUploads || showRegister ? 'z-50' : 'z-10'}`}
      ref={menuRef}
    >
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{
          background: 'var(--app-panel-bg)',
          border: '1px solid var(--app-border)',
          color: 'var(--app-muted)',
        }}
        title={isDark ? '切换浅色模式' : '切换深色模式'}
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <button
        type="button"
        onClick={() => {
          setShowUploads((v) => !v);
          setShowRegister(false);
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          background: 'var(--app-panel-bg)',
          border: '1px solid var(--app-border)',
          color: 'var(--app-text)',
        }}
      >
        <UserCircle size={16} />
        <span className="max-w-[88px] truncate text-[13px] sm:max-w-[140px]">{username}</span>
        <span className="hidden text-[11px] sm:inline" style={{ color: 'var(--app-muted)' }}>
          {role}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--app-muted)',
            transform: showUploads ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 160ms ease',
          }}
        />
      </button>
      {isRoot && (
        <button
          onClick={() => {
            setShowRegister((v) => !v);
            setShowUploads(false);
          }}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: 'var(--app-panel-bg)',
            border: '1px solid var(--app-border)',
            color: '#2563eb',
          }}
          title="创建用户"
        >
          <UserPlus size={16} />
        </button>
      )}
      <button
        onClick={() => {
          if (!window.confirm('确定退出登录？')) return;
          onLogout();
        }}
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{
          background: 'var(--app-panel-bg)',
          border: '1px solid var(--app-border)',
          color: '#ef4444',
        }}
        title="退出登录"
      >
        <LogOut size={16} />
      </button>
      {!isMobile && showUploads && (
        <div
          className="absolute right-0 top-11 z-50 w-80 rounded-xl p-3"
          style={{
            background: 'var(--app-header-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 18px 52px rgba(15,23,42,0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {uploadsPanelContent}
        </div>
      )}
      {!isMobile && showRegister && (
        <div
          className="absolute right-0 top-11 z-50 w-64 rounded-xl p-3"
          style={{
            background: 'var(--app-header-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 16px 48px rgba(15,23,42,0.18)',
          }}
        >
          {registerPanelContent}
        </div>
      )}
      {isMobile && (
        <>
          <Drawer open={showUploads} onOpenChange={setShowUploads}>
            <DrawerContent className="max-h-[85vh] px-0">
              <div className="px-4 pb-5 pt-2">
                {uploadsPanelContent}
              </div>
            </DrawerContent>
          </Drawer>
          <Drawer open={showRegister} onOpenChange={setShowRegister}>
            <DrawerContent className="max-h-[75vh] px-0">
              <div className="px-4 pb-5 pt-2">
                {registerPanelContent}
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}
    </div>
  );
}

function StatsCard({
  label,
  value,
  sub,
  color,
  pulse = false,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--app-card-bg)',
        border: pulse
          ? `1px solid ${color}50`
          : `1px solid ${color}20`,
        boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
      }}
    >
      <div className="text-[13px] mb-1" style={{ color: 'var(--app-muted)' }}>
        {label}
      </div>
      <div className="text-[22px] font-mono" style={{ color }}>
        {value}
      </div>
      <div className="text-[12px] mt-1" style={{ color: 'var(--app-muted)' }}>
        {sub}
      </div>
    </div>
  );
}
