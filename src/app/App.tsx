import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
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
} from 'lucide-react';

import {
  Sample,
  SubSample,
  SampleStatus,
  Compartment,
  CompartmentGridConfig,
  Refrigerator,
  STATUS_CONFIG,
  DEFAULT_COMPARTMENT_GRIDS,
  compartmentCapacity,
  FridgeType,
  DEFAULT_ITEM_TYPES,
  SampleRecord,
} from './types';
import {
  fetchRefrigerators,
  createRefrigerator as apiCreateRefrigerator,
  deleteRefrigerator as apiDeleteRefrigerator,
  updateRefrigerator as apiUpdateRefrigerator,
  fetchSamples,
  createSample,
  updateSample,
  deleteSample,
  createSubSample,
  updateSubSample,
  deleteSubSample,
  fetchSampleTypes,
  createSampleType,
  fetchItemTypes,
  createItemType,
  fetchSampleRecord,
} from './api';
import { FridgeUnit } from './components/FridgeUnit';
import { FridgeSelector } from './components/FridgeSelector';
import { DetailPanel, DetailItem } from './components/DetailPanel';
import { AddSampleModal } from './components/AddSampleModal';
import { RootAdminPanel } from './components/RootAdminPanel';
import { AuthProvider, useAuth } from './AuthContext';
import { DrawerFridgeView } from './components/DrawerFridgeView';
import { ShelfFridgeView } from './components/ShelfFridgeView';
import { FridgeSideMap } from './components/FridgeSideMap';
import { PendingSamplesPanel } from './components/PendingSamplesPanel';
import { LoginPage } from './components/LoginPage';

type UploadedSampleItem = {
  id: string;
  name: string;
  type: string;
  status: SampleStatus;
  temperature: number;
  collectedAt: string;
  kind: 'sample' | 'subsample';
  compartment?: Compartment;
  position: number;
  parentId?: string;
  parentName?: string;
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
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'fridge' | 'admin'>('fridge');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTarget, setAddTarget] = useState<{
    compartment: Compartment;
    position: number;
    isSubSample?: boolean;
    containerId?: string;
  } | null>(null);
  const [notification, setNotification] = useState<{
    msg: string;
    type: 'info' | 'warn' | 'success' | 'error';
  } | null>(null);
  const [tick, setTick] = useState(0);

  const [viewingContainerId, setViewingContainerId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<DetailItem | null>(null);
  const [sampleTypes, setSampleTypes] = useState<string[]>(['血清', '血浆', '尿液', 'DNA', '组织', '全血']);
  const [itemTypes, setItemTypes] = useState<string[]>(DEFAULT_ITEM_TYPES);
  const [sampleRecords, setSampleRecords] = useState<SampleRecord[]>([]);

  // Side map state
  const [showSideMap, setShowSideMap] = useState(true);
  const [sideMapNavTarget, setSideMapNavTarget] = useState<{ drawerId: string; drawerLabel: string } | null>(null);
  const [sideMapRefreshKey, setSideMapRefreshKey] = useState(0);

  // Pending imported samples (shared with DrawerFridgeView)
  const [pendingSamples, setPendingSamples] = useState<SampleRecord[]>([]);

  // Global sample search
  const [globalSampleQuery, setGlobalSampleQuery] = useState('');

  const globalFilteredRecords = React.useMemo(() => {
    if (!globalSampleQuery.trim()) return [];
    const q = globalSampleQuery.toLowerCase();
    return sampleRecords.filter((sr) =>
      sr.patient_name.toLowerCase().includes(q) ||
      sr.sample_code.toLowerCase().includes(q) ||
      (sr.sample_type || '').toLowerCase().includes(q) ||
      (sr.collection_stage || '').toLowerCase().includes(q) ||
      (sr.source || '').toLowerCase().includes(q)
    );
  }, [sampleRecords, globalSampleQuery]);

  const handleImportComplete = useCallback(async (sampleIds: string[]) => {
    if (sampleIds.length === 0) return;
    try {
      const all = await Promise.all(
        sampleIds.map((id) => fetchSampleRecord(id).catch(() => null))
      );
      const valid = all.filter(Boolean) as SampleRecord[];
      setPendingSamples((prev) => [...prev, ...valid]);
    } catch (err) {
      console.error('Failed to fetch imported samples:', err);
    }
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
            upperTemperature: Number(r.upper_temperature ?? -80),
            lowerTemperature: Number(r.lower_temperature ?? -80),
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
  }, []);

  // Load samples when fridge changes
  useEffect(() => {
    if (!selectedFridgeId) return;
    setLoading(true);
    Promise.all([
      fetchSamples(selectedFridgeId).catch(() => []),
      fetchSampleRecords({}).catch(() => []),
    ]).then(([sampleData, srData]) => {
      setSamples(sampleData);
      setSampleRecords(srData);
      setLoading(false);
    }).catch((err) => {
      setLoading(false);
      showNotif('加载样本数据失败', 'error');
      console.error(err);
    });
  }, [selectedFridgeId]);

  const selectedFridge = refrigerators.find((r) => r.id === selectedFridgeId) ?? null;
  const compartmentGrids: Record<Compartment, CompartmentGridConfig> = selectedFridge
    ? {
        upper: { rows: selectedFridge.upperRows, cols: selectedFridge.upperCols },
        lower: { rows: selectedFridge.lowerRows, cols: selectedFridge.lowerCols },
      }
    : DEFAULT_COMPARTMENT_GRIDS;

  const showNotif = useCallback((
    msg: string,
    type: 'info' | 'warn' | 'success' | 'error' = 'info',
  ) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const upperCapacity = compartmentGrids.upper.rows * compartmentGrids.upper.cols;
  const lowerCapacity = compartmentGrids.lower.rows * compartmentGrids.lower.cols;
  const totalCapacity = upperCapacity + lowerCapacity;

  const viewingContainer = viewingContainerId
    ? samples.find((s) => s.id === viewingContainerId) ?? null
    : null;

  const matchedIds = React.useMemo<Set<string>>(() => {
    if (!searchQuery.trim()) return new Set();
    const q = searchQuery.toLowerCase();
    const ids = new Set<string>();
    for (const s of samples) {
      if (
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.type.includes(q) ||
        s.patientId.toLowerCase().includes(q) ||
        (s.uploader || '').toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        STATUS_CONFIG[s.status].label.includes(q)
      ) {
        ids.add(s.id);
      }
      for (const ss of s.subSamples) {
        if (
          ss.id.toLowerCase().includes(q) ||
          ss.name.toLowerCase().includes(q) ||
          ss.type.includes(q) ||
          ss.patientId.toLowerCase().includes(q) ||
          (ss.uploader || '').toLowerCase().includes(q) ||
          ss.tags.some((t) => t.toLowerCase().includes(q)) ||
          STATUS_CONFIG[ss.status].label.includes(q)
        ) {
          ids.add(ss.id);
        }
      }
    }
    return ids;
  }, [samples, searchQuery]);

  const selectedDetailItem: DetailItem | null = React.useMemo(() => {
    if (!selectedSampleId) return null;
    if (viewingContainer) {
      const ss = viewingContainer.subSamples.find((s) => s.id === selectedSampleId);
      if (ss) return { kind: 'subsample', data: ss, containerId: viewingContainer.id };
    }
    const sample = samples.find((s) => s.id === selectedSampleId);
    if (sample) return { kind: 'sample', data: sample };
    for (const s of samples) {
      const ss = s.subSamples.find((sub) => sub.id === selectedSampleId);
      if (ss) return { kind: 'subsample', data: ss, containerId: s.id };
    }
    return null;
  }, [selectedSampleId, samples, viewingContainer]);

  const myUploadedItems = React.useMemo<UploadedSampleItem[]>(() => {
    const username = user!.username;
    const isMine = (item: { createdBy?: string; uploader?: string }) =>
      item.createdBy ? item.createdBy === username : (item.uploader || '').trim() === username;

    return samples
      .flatMap<UploadedSampleItem>((sample) => {
        const items: UploadedSampleItem[] = [];
        if (isMine(sample)) {
          items.push({
            id: sample.id,
            name: sample.name,
            type: sample.type,
            status: sample.status,
            temperature: sample.temperature,
            collectedAt: sample.collectedAt,
            kind: 'sample',
            compartment: sample.compartment,
            position: sample.position,
          });
        }
        sample.subSamples.forEach((subSample) => {
          if (isMine(subSample)) {
            items.push({
              id: subSample.id,
              name: subSample.name,
              type: subSample.type,
              status: subSample.status,
              temperature: subSample.temperature,
              collectedAt: subSample.collectedAt,
              kind: 'subsample',
              position: subSample.position,
              parentId: sample.id,
              parentName: sample.name,
            });
          }
        });
        return items;
      })
      .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
  }, [samples, user]);

  const handleOpenUploadedItem = useCallback((item: UploadedSampleItem) => {
    setSelectedSampleId(item.id);
    setViewingContainerId(item.kind === 'subsample' ? item.parentId ?? null : null);
  }, []);

  // ── Fridge handlers ──

  const handleAddFridge = useCallback(
    async (
      name: string,
      description?: string,
      upperTemperature = -80,
      lowerTemperature = -80,
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
          upperTemperature,
          lowerTemperature,
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
          upperTemperature: Number(data.upper_temperature ?? upperTemperature),
          lowerTemperature: Number(data.lower_temperature ?? lowerTemperature),
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
      upperTemperature?: number,
      lowerTemperature?: number,
    ) => {
      try {
        const data = await apiUpdateRefrigerator(id, {
          name,
          description,
          upperTemperature,
          lowerTemperature,
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

  // ── Container handlers ──

  const handleDrop = useCallback(
    async (sampleId: string, toCompartment: Compartment, toPosition: number) => {
      if (!selectedFridgeId) return;
      const prev = [...samples];
      const moving = prev.find((s) => s.id === sampleId);
      if (!moving) return;
      const targetCapacity = toCompartment === 'upper' ? upperCapacity : lowerCapacity;
      if (toPosition >= targetCapacity) return;
      const occupying = prev.find(
        (s) =>
          s.compartment === toCompartment &&
          s.position === toPosition &&
          s.id !== sampleId,
      );

      const next = prev.map((s) => {
        if (s.id === sampleId) return { ...s, compartment: toCompartment, position: toPosition };
        if (occupying && s.id === occupying.id)
          return { ...s, compartment: moving.compartment, position: moving.position };
        return s;
      });
      setSamples(next);

      try {
        await updateSample(selectedFridgeId, sampleId, { compartment: toCompartment, position: toPosition });
        if (occupying) {
          await updateSample(selectedFridgeId, occupying.id, {
            compartment: moving.compartment,
            position: moving.position,
          });
        }
        showNotif('样本已移动', 'success');
      } catch {
        setSamples(prev);
        showNotif('移动失败', 'error');
      }
    },
    [selectedFridgeId, samples, upperCapacity, lowerCapacity],
  );

  const handleDeleteSample = useCallback(
    async (id: string) => {
      if (!selectedFridgeId) return;
      const prev = [...samples];
      setSamples((s) => s.filter((s) => s.id !== id));
      setSelectedSampleId((sel) => (sel === id ? null : sel));
      setViewingContainerId((vid) => (vid === id ? null : vid));
      try {
        await deleteSample(selectedFridgeId, id);
        showNotif('样本已删除', 'warn');
      } catch {
        setSamples(prev);
        showNotif('删除失败', 'error');
      }
    },
    [selectedFridgeId, samples],
  );

  const handleAddSample = useCallback(
    async (sample: Sample) => {
      if (!selectedFridgeId) return;
      try {
        await createSample(selectedFridgeId, { ...sample, subSamples: undefined as any });
        const data = await fetchSamples(selectedFridgeId);
        setSamples(data);
        showNotif(`样本 ${sample.id} 已添加`, 'success');
      } catch (err: any) {
        showNotif(`添加失败: ${err.message}`, 'error');
      }
    },
    [selectedFridgeId],
  );

  const handleStatusChange = useCallback(
    async (id: string, status: SampleStatus, containerId?: string) => {
      if (!selectedFridgeId) return;
      try {
        if (containerId) {
          await updateSubSample(containerId, id, { status });
        } else {
          await updateSample(selectedFridgeId, id, { status });
        }
        const data = await fetchSamples(selectedFridgeId);
        setSamples(data);
        showNotif('状态已更新', 'info');
      } catch (err: any) {
        showNotif(`更新失败: ${err.message}`, 'error');
      }
    },
    [selectedFridgeId],
  );

  const handleSlotClick = useCallback(
    (compartment: Compartment, position: number, containerId?: string) => {
      setAddTarget({ compartment, position, isSubSample: !!containerId, containerId });
      setEditItem(null);
      setShowAddModal(true);
    },
    [],
  );

  const handleOpenAddSubSample = useCallback(
    (containerId: string, position: number) => {
      const container = samples.find((sample) => sample.id === containerId);
      if (!container) return;
      setAddTarget({
        compartment: container.compartment,
        position,
        isSubSample: true,
        containerId,
      });
      setEditItem(null);
      setShowAddModal(true);
    },
    [samples],
  );

  const handleAddButtonClick = () => {
    if (viewingContainer) {
      const capacity = viewingContainer.gridRows * viewingContainer.gridCols;
      for (let i = 0; i < capacity; i++) {
        if (!viewingContainer.subSamples.some((ss) => ss.position === i)) {
          setAddTarget({
            compartment: viewingContainer.compartment,
            position: i,
            isSubSample: true,
            containerId: viewingContainer.id,
          });
          setShowAddModal(true);
          return;
        }
      }
      showNotif('容器已满，无法添加更多副样本', 'error');
    } else {
      const allSlots: { compartment: Compartment; position: number }[] = [
        ...Array.from({ length: upperCapacity }, (_, i) => ({
          compartment: 'upper' as Compartment,
          position: i,
        })),
        ...Array.from({ length: lowerCapacity }, (_, i) => ({
          compartment: 'lower' as Compartment,
          position: i,
        })),
      ];
      const firstEmpty = allSlots.find(
        ({ compartment, position }) =>
          !samples.some(
            (s) => s.compartment === compartment && s.position === position,
          ),
      );
      if (firstEmpty) {
        setAddTarget(firstEmpty);
        setShowAddModal(true);
      } else {
        showNotif('冰箱已满，无法添加更多样本', 'error');
      }
    }
  };

  // ── Grid resize handlers ──

  const handleUpdateCompartmentGrid = useCallback(
    async (compartment: Compartment, grid: CompartmentGridConfig) => {
      const newCapacity = grid.rows * grid.cols;
      const hasOverflow = samples.some(
        (s) => s.compartment === compartment && s.position >= newCapacity,
      );
      if (hasOverflow) {
        showNotif(
          `无法缩小 ${
            compartment === 'upper' ? '上层' : '下层'
          } 网格：超出位置的样本仍存在，请先移除或移动`,
          'error',
        );
        return;
      }
      if (selectedFridgeId) {
        const updateData =
          compartment === 'upper'
            ? { upperRows: grid.rows, upperCols: grid.cols }
            : { lowerRows: grid.rows, lowerCols: grid.cols };
        try {
          const data = await apiUpdateRefrigerator(selectedFridgeId, updateData);
          setRefrigerators((prev) =>
            prev.map((r) =>
              r.id === selectedFridgeId
                ? {
                    ...r,
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
          showNotif(
            `${compartment === 'upper' ? '上层' : '下层'} 网格 → ${grid.rows}×${grid.cols}`,
            'success',
          );
        } catch (err: any) {
          showNotif(`更新网格失败: ${err.message}`, 'error');
        }
      }
    },
    [samples, selectedFridgeId],
  );

  const handleUpdateContainerGrid = useCallback(
    async (containerId: string, gridRows: number, gridCols: number) => {
      if (!selectedFridgeId) return;
      const container = samples.find((s) => s.id === containerId);
      if (!container) return;
      const newCapacity = gridRows * gridCols;
      const hasOverflow = container.subSamples.some((ss) => ss.position >= newCapacity);
      if (hasOverflow) {
        showNotif(`无法缩小容器 ${containerId} 网格：超出位置的副样本仍存在`, 'error');
        return;
      }
      try {
        await updateSample(selectedFridgeId, containerId, { gridRows, gridCols });
        const data = await fetchSamples(selectedFridgeId);
        setSamples(data);
        showNotif(`容器 ${containerId} 网格已更新`, 'success');
      } catch (err: any) {
        showNotif(`更新失败: ${err.message}`, 'error');
      }
    },
    [samples, selectedFridgeId],
  );

  // ── Container navigation ──

  const handleEnterContainer = useCallback((containerId: string) => {
    setViewingContainerId(containerId);
    setSelectedSampleId(null);
  }, []);

  const handleExitContainer = useCallback(() => {
    setViewingContainerId(null);
    setSelectedSampleId(null);
  }, []);

  // ── Sub-sample handlers ──

  const handleDropSubSample = useCallback(
    async (subSampleId: string, containerId: string, toPosition: number) => {
      const prev = [...samples];
      const container = prev.find((s) => s.id === containerId);
      if (!container) return;
      const moving = container.subSamples.find((ss) => ss.id === subSampleId);
      if (!moving) return;
      const totalSlots = container.gridRows * container.gridCols;
      if (toPosition >= totalSlots) return;
      const occupying = container.subSamples.find(
        (ss) => ss.position === toPosition && ss.id !== subSampleId,
      );

      const next = prev.map((s) => {
        if (s.id !== containerId) return s;
        return {
          ...s,
          subSamples: s.subSamples.map((ss) => {
            if (ss.id === subSampleId) return { ...ss, position: toPosition };
            if (occupying && ss.id === occupying.id) return { ...ss, position: moving.position };
            return ss;
          }),
        };
      });
      setSamples(next);

      try {
        await updateSubSample(containerId, subSampleId, { position: toPosition });
        if (occupying) {
          await updateSubSample(containerId, occupying.id, { position: moving.position });
        }
        showNotif('副样本已移动', 'success');
      } catch {
        setSamples(prev);
        showNotif('移动失败', 'error');
      }
    },
    [samples],
  );

  const handleDeleteSubSample = useCallback(
    async (containerId: string, subSampleId: string) => {
      const prev = [...samples];
      setSamples((ps) =>
        ps.map((s) =>
          s.id === containerId
            ? { ...s, subSamples: s.subSamples.filter((ss) => ss.id !== subSampleId) }
            : s,
        ),
      );
      setSelectedSampleId((sel) => (sel === subSampleId ? null : sel));
      try {
        await deleteSubSample(containerId, subSampleId);
        showNotif('副样本已删除', 'warn');
      } catch {
        setSamples(prev);
        showNotif('删除失败', 'error');
      }
    },
    [samples],
  );

  const handleAddSubSample = useCallback(
    async (containerId: string, subSample: SubSample) => {
      try {
        await createSubSample(containerId, subSample);
        if (selectedFridgeId) {
          const data = await fetchSamples(selectedFridgeId);
          setSamples(data);
        }
        showNotif(`副样本 ${subSample.id} 已添加`, 'success');
      } catch (err: any) {
        showNotif(`添加失败: ${err.message}`, 'error');
      }
    },
    [selectedFridgeId],
  );

  // ── Edit handlers ──

  const handleEditSample = useCallback(
    async (sample: Sample) => {
      if (!selectedFridgeId) return;
      try {
        await updateSample(selectedFridgeId, sample.id, sample);
        const data = await fetchSamples(selectedFridgeId);
        setSamples(data);
        setSelectedSampleId(sample.id);
        setEditItem(null);
        setShowAddModal(false);
        showNotif(`样本 ${sample.id} 已更新`, 'success');
      } catch (err: any) {
        showNotif(`更新失败: ${err.message}`, 'error');
      }
    },
    [selectedFridgeId],
  );

  const handleEditSubSample = useCallback(
    async (containerId: string, subSample: SubSample) => {
      if (!selectedFridgeId) return;
      try {
        await updateSubSample(containerId, subSample.id, subSample);
        const data = await fetchSamples(selectedFridgeId);
        setSamples(data);
        setSelectedSampleId(subSample.id);
        setEditItem(null);
        setShowAddModal(false);
        showNotif(`副样本 ${subSample.id} 已更新`, 'success');
      } catch (err: any) {
        showNotif(`更新失败: ${err.message}`, 'error');
      }
    },
    [selectedFridgeId],
  );

  const handleOpenEdit = useCallback((item: DetailItem) => {
    setAddTarget(null);
    setEditItem(item);
    setShowAddModal(true);
  }, []);

  const handleAddSampleType = useCallback(
    async (name: string) => {
      setSampleTypes((prev) => (prev.includes(name) ? prev : [...prev, name]));
      try {
        await createSampleType(name);
      } catch {
        // type may already exist, ignore error
      }
    },
    [],
  );

  const handleAddItemType = useCallback(
    async (name: string) => {
      setItemTypes((prev) => (prev.includes(name) ? prev : [...prev, name]));
      try {
        await createItemType(name);
      } catch {
        // type may already exist, ignore error
      }
    },
    [],
  );

  // ── Stats ──

  const usedSlots = samples.length;
  const criticalCount = samples.filter((s) => s.status === 'critical').length;
  const warningCount = samples.filter((s) => s.status === 'warning').length;

  const totalSubSamples = samples.reduce((sum, s) => sum + s.subSamples.length, 0);
  const criticalSubCount = samples.reduce(
    (sum, s) => sum + s.subSamples.filter((ss) => ss.status === 'critical').length,
    0,
  );
  const warningSubCount = samples.reduce(
    (sum, s) => sum + s.subSamples.filter((ss) => ss.status === 'warning').length,
    0,
  );
  const typeStats = React.useMemo(() => {
    const counts = new Map<string, number>();

    samples.forEach((sample) => {
      const t = sample.type?.trim();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
      sample.subSamples.forEach((ss) => {
        const st = ss.type?.trim();
        if (st) counts.set(st, (counts.get(st) ?? 0) + 1);
      });
    });

    sampleRecords.forEach((sr) => {
      const t = sr.sample_type?.trim();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    });

    return Array.from(counts, ([type, count]) => ({ type, count })).sort(
      (a, b) => b.count - a.count || a.type.localeCompare(b.type, 'zh-CN'),
    );
  }, [samples, sampleRecords]);
  const displayedTypeStats = typeStats.slice(0, 8);
  const remainingTypeCount = Math.max(typeStats.length - displayedTypeStats.length, 0);

  const notifColors = {
    info: { bg: 'rgba(29,78,216,0.85)', border: '#3b82f6', text: '#93c5fd' },
    warn: { bg: 'rgba(180,83,9,0.85)', border: '#f59e0b', text: '#fcd34d' },
    success: { bg: 'rgba(21,128,61,0.85)', border: '#22c55e', text: '#86efac' },
    error: { bg: 'rgba(153,27,27,0.85)', border: '#ef4444', text: '#fca5a5' },
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="min-h-screen flex flex-col"
        style={{
          background: 'var(--app-bg)',
          fontFamily: "'SF Mono', 'Consolas', monospace",
          color: 'var(--app-text)',
        }}
      >
        {/* ── HEADER ── */}
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
              onOpenSample={handleOpenUploadedItem}
              onLogout={logout}
            />
            <div className="flex items-center gap-5">
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
              {totalSubSamples > 0 && (
                <StatChip
                  icon={<Layers size={16} />}
                  label="副样本"
                  value={`${totalSubSamples}`}
                  color="#a78bfa"
                />
              )}
              {criticalCount + criticalSubCount > 0 && (
                <StatChip
                  icon={<AlertTriangle size={16} />}
                  label="严重警报"
                  value={`${criticalCount + criticalSubCount} 个`}
                  color="#ef4444"
                />
              )}
            </div>
          </div>
        </header>

        {activeView === 'admin' && isRoot ? (
          <RootAdminPanel currentUsername={user!.username} onNotify={showNotif} />
        ) : (
    <main className="flex-1 flex gap-3 lg:gap-6 p-3 lg:p-6 overflow-auto items-start">
          {/* ── Far Left: 2D Fridge Map + Pending Samples ── */}
          {selectedFridge && selectedFridge.fridge_type === 'drawer' && showSideMap && (
            <div className="flex flex-col gap-3 flex-shrink-0">
              <FridgeSideMap
                fridgeId={selectedFridge.id}
                fridgeName={selectedFridge.name}
                upperTemperature={selectedFridge.upperTemperature}
                lowerTemperature={selectedFridge.lowerTemperature}
                onDrawerClick={(drawerId, drawerLabel) => {
                  setSideMapNavTarget({ drawerId, drawerLabel });
                }}
                refreshKey={sideMapRefreshKey}
              />
              <PendingSamplesPanel
                samples={pendingSamples}
                onSelectSample={() => {}}
                onClear={() => setPendingSamples([])}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-5 items-start justify-center min-w-0">
          {/* Detail panel — left of fridge */}
          <DetailPanel
            item={selectedDetailItem}
            onClose={() => setSelectedSampleId(null)}
            onStatusChange={handleStatusChange}
            onDelete={(id, containerId) => {
              if (containerId) {
                handleDeleteSubSample(containerId, id);
              } else {
                handleDeleteSample(id);
              }
            }}
            onEdit={handleOpenEdit}
            currentUser={user!.username}
            isRoot={isRoot}
          />

          {/* Center: Fridge */}
          <div className="flex w-full w-full max-w-full lg:max-w-[860px] flex-col gap-5">
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
                placeholder="搜索样本 ID、类型、患者编号、上传者、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[16px] placeholder:text-slate-600"
                style={{ color: 'var(--app-text)' }}
              />
              {searchQuery && (
                <div className="flex items-center gap-1">
                  <span className="text-[14px]" style={{ color: '#2563eb' }}>
                    {matchedIds.size} 个匹配
                  </span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[14px] px-2 py-1 rounded"
                    style={{ color: 'var(--app-muted)' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Loading state */}
            {loading && !viewingContainer && (
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
            {(!loading || viewingContainer) && selectedFridgeId && selectedFridge && (
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
                  pendingSamples={pendingSamples}
                  onPendingSamplesChange={setPendingSamples}
                  onImportComplete={handleImportComplete}
                  onDataChanged={() => setSideMapRefreshKey((k) => k + 1)}
                />
              ) : selectedFridge.fridge_type === 'shelf' && !viewingContainer ? (
                <ShelfFridgeView
                  fridge={selectedFridge}
                  currentUsername={user!.username}
                  itemTypes={itemTypes}
                  onAddItemType={handleAddItemType}
                />
              ) : (
                <FridgeUnit
                  samples={samples}
                  selectedSampleId={selectedSampleId}
                  matchedIds={matchedIds}
                  searchQuery={searchQuery}
                  compartmentGrids={compartmentGrids}
                  upperTemperature={selectedFridge?.upperTemperature ?? -80}
                  lowerTemperature={selectedFridge?.lowerTemperature ?? -80}
                  canManageFridge={isRoot}
                  viewingContainer={viewingContainer}
                  onDropSample={handleDrop}
                  onSelectSample={setSelectedSampleId}
                  onDeleteSample={handleDeleteSample}
                  onSlotClick={handleSlotClick}
                  onEnterContainer={handleEnterContainer}
                  onExitContainer={handleExitContainer}
                  onDropSubSample={handleDropSubSample}
                  onAddSubSample={handleOpenAddSubSample}
                  onDeleteSubSample={handleDeleteSubSample}
                  onUpdateCompartmentGrid={handleUpdateCompartmentGrid}
                  onUpdateContainerGrid={handleUpdateContainerGrid}
                />
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
                    onClick={() => handleAddFridge('主冰箱', '默认冰箱')}
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
            {/* Global sample search */}
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3"
              style={{
                background: 'var(--app-card-bg)',
                border: `1px solid ${globalSampleQuery ? 'rgba(37,99,235,0.35)' : 'var(--app-border)'}`,
                boxShadow: globalSampleQuery ? '0 12px 34px rgba(37,99,235,0.08)' : '0 12px 34px rgba(15,23,42,0.06)',
              }}
            >
              <Search size={18} color={globalSampleQuery ? '#2563eb' : 'var(--app-muted)'} />
              <input
                type="text"
                placeholder="全局搜索样本（姓名、编号、类型）..."
                value={globalSampleQuery}
                onChange={(e) => setGlobalSampleQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[13px]"
                style={{ color: 'var(--app-text)' }}
              />
              {globalSampleQuery && (
                <button onClick={() => setGlobalSampleQuery('')} className="text-[13px]" style={{ color: 'var(--app-muted)' }}>
                  ✕
                </button>
              )}
            </div>

            {/* Global search results */}
            {globalSampleQuery.trim() && (
              <div
                className="rounded-xl p-3 space-y-1 max-h-60 overflow-y-auto"
                style={{
                  background: 'var(--app-card-bg)',
                  border: '1px solid var(--app-border)',
                  boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
                }}
              >
                {globalFilteredRecords.length === 0 ? (
                  <div className="text-center py-3 text-[12px]" style={{ color: 'var(--app-muted)' }}>无匹配结果</div>
                ) : (
                  globalFilteredRecords.slice(0, 20).map((sr) => (
                    <div
                      key={sr.id}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:brightness-95"
                      style={{
                        background: sr.group_color + '12',
                        border: `1px solid ${sr.group_color}20`,
                      }}
                      onClick={() => {
                        setGlobalSampleQuery('');
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
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--app-muted)' }}>{sr.tube_count || 0} 管</span>
                    </div>
                  ))
                )}
                {globalFilteredRecords.length > 20 && (
                  <div className="text-center pt-1 text-[11px]" style={{ color: 'var(--app-muted)' }}>
                    显示前 20 条，另有 {globalFilteredRecords.length - 20} 条
                  </div>
                )}
              </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatsCard
                label="总容量"
                value={`${usedSlots}/${totalCapacity}`}
                sub={`使用率 ${Math.round((usedSlots / totalCapacity) * 100)}%`}
                color="#60a5fa"
              />
              <StatsCard
                label="上层"
                value={`${samples.filter((s) => s.compartment === 'upper').length}/${upperCapacity}`}
                sub={`${selectedFridge?.upperTemperature ?? -80}°C 参考`}
                color="#818cf8"
              />
              <StatsCard
                label="下层"
                value={`${samples.filter((s) => s.compartment === 'lower').length}/${lowerCapacity}`}
                sub={`${selectedFridge?.lowerTemperature ?? -80}°C 参考`}
                color="#34d399"
              />
              <StatsCard
                label="异常警报"
                value={`${criticalCount + warningCount + criticalSubCount + warningSubCount}`}
                sub={`${criticalCount + criticalSubCount}严重 ${warningCount + warningSubCount}警告`}
                color={
                  criticalCount + criticalSubCount > 0
                    ? '#f87171'
                    : warningCount + warningSubCount > 0
                      ? '#fbbf24'
                      : '#22c55e'
                }
                pulse={criticalCount + criticalSubCount > 0}
              />
            </div>

            {/* Sub-sample stats */}
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--app-card-bg)',
                border: '1px solid var(--app-border)',
                boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
              }}
            >
              <div className="text-[14px] mb-2" style={{ color: 'var(--app-muted)' }}>
                副样本统计
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Layers size={16} color="#a78bfa" />
                  <span className="text-[14px] flex-1" style={{ color: 'var(--app-text)' }}>
                    副样本总数
                  </span>
                  <span className="text-[14px] font-mono" style={{ color: '#a78bfa' }}>
                    {totalSubSamples}
                  </span>
                </div>
                {criticalSubCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: '#ef4444',
                        boxShadow: '0 0 2px #ef4444',
                      }}
                    />
                    <span className="text-[14px] flex-1" style={{ color: '#f87171' }}>
                      严重异常副样本
                    </span>
                    <span className="text-[14px] font-mono" style={{ color: '#f87171' }}>
                      {criticalSubCount}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tag stats */}
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
                  {typeStats.length} 类
                </span>
              </div>
              {displayedTypeStats.length > 0 ? (
                <div className="space-y-2">
                  {displayedTypeStats.map(({ type, count }, index) => (
                    <div key={type} className="flex items-center gap-2">
                      <span
                        className="w-6 text-[12px] font-mono text-right flex-shrink-0"
                        style={{ color: index < 3 ? '#2563eb' : 'var(--app-muted)' }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-[13px]"
                        title={type}
                        style={{
                          background: 'var(--app-info-bg)',
                          border: '1px solid var(--app-info-border)',
                          color: 'var(--app-info-text)',
                        }}
                      >
                        {type}
                      </span>
                      <span
                        className="min-w-8 text-right text-[14px] font-mono"
                        style={{ color: '#2563eb' }}
                      >
                        {count}
                      </span>
                    </div>
                  ))}
                  {remainingTypeCount > 0 && (
                    <div className="pt-1 text-right text-[12px]" style={{ color: 'var(--app-muted)' }}>
                      另有 {remainingTypeCount} 类样本类型
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

        {/* ── ADD / EDIT MODAL ── */}
        {activeView === 'fridge' && (
        <AddSampleModal
          isOpen={showAddModal}
          targetCompartment={addTarget?.compartment ?? null}
          targetPosition={addTarget?.position ?? null}
          onClose={() => {
            setShowAddModal(false);
            setEditItem(null);
            setAddTarget(null);
          }}
          onAdd={handleAddSample}
          onAddSubSample={handleAddSubSample}
          existingIds={samples.map((s) => s.id)}
          containers={samples}
          upperTemperature={selectedFridge?.upperTemperature ?? -80}
          lowerTemperature={selectedFridge?.lowerTemperature ?? -80}
          currentUsername={user!.username}
          isSubSampleMode={addTarget?.isSubSample ?? false}
          parentContainerId={
            editItem?.kind === 'subsample'
              ? editItem.containerId
              : addTarget?.containerId ?? undefined
          }
          parentContainer={
            editItem?.kind === 'subsample'
              ? samples.find((s) => s.id === editItem.containerId) ?? undefined
              : addTarget?.containerId
                ? samples.find((s) => s.id === addTarget.containerId) ?? undefined
                : undefined
          }
          editSample={
            editItem?.kind === 'sample' ? editItem.data as Sample : null
          }
          editSubSample={
            editItem?.kind === 'subsample' ? editItem.data as SubSample : null
          }
          onEditSample={handleEditSample}
          onEditSubSample={handleEditSubSample}
          sampleTypes={sampleTypes}
          onAddSampleType={handleAddSampleType}
        />
        )}
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
  onOpenSample,
  onLogout,
}: {
  username: string;
  role: string;
  uploadedItems: UploadedSampleItem[];
  onOpenSample: (item: UploadedSampleItem) => void;
  onLogout: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const { register, isRoot } = useAuth();
  const isDark = theme === 'dark';
  const [showRegister, setShowRegister] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'root'>('user');
  const [message, setMessage] = useState('');
  const [registering, setRegistering] = useState(false);
  const [showUploads, setShowUploads] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUploads && !showRegister) return;

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
  }, [showRegister, showUploads]);

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
    } catch (err: any) {
      setMessage(err.message || '创建失败');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div
      className={`relative flex items-center gap-2 ${showUploads || showRegister ? 'z-50' : 'z-10'}`}
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
        <span className="text-[13px]">{username}</span>
        <span className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
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
        onClick={onLogout}
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
      {showUploads && (
        <div
          className="absolute right-0 top-11 z-50 w-80 rounded-xl p-3"
          style={{
            background: 'var(--app-header-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 18px 52px rgba(15,23,42,0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px]" style={{ color: 'var(--app-text)' }}>
                我的上传样本
              </div>
              <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                当前冰箱 · {uploadedItems.length} 个
              </div>
            </div>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'var(--app-card-bg)',
                border: '1px solid var(--app-border)',
                color: '#2563eb',
              }}
            >
              <FlaskConical size={16} />
            </div>
          </div>

          {uploadedItems.length === 0 ? (
            <div
              className="rounded-lg px-3 py-5 text-center text-[13px]"
              style={{
                background: 'var(--app-card-bg)',
                border: '1px solid var(--app-border)',
                color: 'var(--app-muted)',
              }}
            >
              当前冰箱暂无你上传的样本
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto pr-1 space-y-2">
              {uploadedItems.map((item) => {
                const config = STATUS_CONFIG[item.status];
                const location =
                  item.kind === 'subsample'
                    ? `${item.parentId} · 子格 ${item.position + 1}`
                    : `${item.compartment === 'upper' ? '上层' : '下层'} · 格位 ${item.position + 1}`;
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    onClick={() => {
                      onOpenSample(item);
                      setShowUploads(false);
                    }}
                    className="w-full rounded-lg px-3 py-2.5 text-left transition-all hover:brightness-95"
                    style={{
                      background: 'var(--app-card-bg)',
                      border: '1px solid var(--app-border)',
                      color: 'var(--app-text)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: config.borderColor }}
                          />
                          <span className="text-[13px] truncate">
                            {item.id} · {item.name}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] truncate" style={{ color: 'var(--app-muted)' }}>
                          {item.type} · {location}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[11px]" style={{ color: config.color }}>
                          {config.label}
                        </div>
                        <div className="text-[11px] mt-1" style={{ color: 'var(--app-muted)' }}>
                          {item.temperature}°C
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {showRegister && (
        <form
          onSubmit={handleRegister}
          className="absolute right-0 top-11 z-50 w-64 space-y-2 rounded-xl p-3"
          style={{
            background: 'var(--app-header-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 16px 48px rgba(15,23,42,0.18)',
          }}
        >
          <div className="text-[13px]" style={{ color: 'var(--app-text)' }}>
            创建用户
          </div>
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="用户名"
            className="w-full rounded-md px-2 py-1.5 text-[13px] outline-none"
            style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="密码"
            type="password"
            className="w-full rounded-md px-2 py-1.5 text-[13px] outline-none"
            style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="确认密码"
            type="password"
            className="w-full rounded-md px-2 py-1.5 text-[13px] outline-none"
            style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as 'user' | 'root')}
            className="w-full rounded-md px-2 py-1.5 text-[13px] outline-none"
            style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}
          >
            <option value="user">普通用户</option>
            <option value="root">管理员 root</option>
          </select>
          <button
            disabled={registering}
            className="w-full rounded-md py-1.5 text-[13px]"
            style={{ background: registering ? '#94a3b8' : '#2563eb', color: '#fff' }}
          >
            {registering ? '创建中...' : '创建'}
          </button>
          {message && <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>{message}</div>}
        </form>
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
