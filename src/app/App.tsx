import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  Database,
  Activity,
  AlertTriangle,
  Layers,
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
} from './api';
import { FridgeUnit } from './components/FridgeUnit';
import { FridgeSelector } from './components/FridgeSelector';
import { DetailPanel, DetailItem } from './components/DetailPanel';
import { AddSampleModal } from './components/AddSampleModal';

export default function App() {
  const [refrigerators, setRefrigerators] = useState<Refrigerator[]>([]);
  const [selectedFridgeId, setSelectedFridgeId] = useState<string | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
  }, []);

  // Load samples when fridge changes
  useEffect(() => {
    if (!selectedFridgeId) return;
    setLoading(true);
    fetchSamples(selectedFridgeId)
      .then((data) => {
        setSamples(data);
        setLoading(false);
      })
      .catch((err) => {
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

  const showNotif = (
    msg: string,
    type: 'info' | 'warn' | 'success' | 'error' = 'info',
  ) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

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

  // ── Fridge handlers ──

  const handleAddFridge = useCallback(
    async (name: string, description?: string) => {
      try {
        const data = await apiCreateRefrigerator({
          name,
          description,
          upperRows: 2,
          upperCols: 3,
          lowerRows: 2,
          lowerCols: 2,
        });
        const newFridge: Refrigerator = {
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          upperRows: data.upper_rows,
          upperCols: data.upper_cols,
          lowerRows: data.lower_rows,
          lowerCols: data.lower_cols,
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
    async (id: string, name: string, description?: string) => {
      try {
        const data = await apiUpdateRefrigerator(id, { name, description });
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
      setShowAddModal(true);
    },
    [],
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
            compartment === 'upper' ? '冷冻层' : '冷藏层'
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
                  }
                : r,
            ),
          );
          showNotif(
            `${compartment === 'upper' ? '冷冻层' : '冷藏层'} 网格 → ${grid.rows}×${grid.cols}`,
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
          background:
            'radial-gradient(ellipse at top left, #0a0e14 0%, #080c12 40%, #060a10 100%)',
          fontFamily: "'SF Mono', 'Consolas', monospace",
        }}
      >
        {/* ── HEADER ── */}
        <header
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{
            background: 'rgba(8,16,32,0.9)',
            borderBottom: '1px solid rgba(30,58,100,0.5)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: 'rgba(29,78,216,0.3)',
                border: '1px solid rgba(59,130,246,0.4)',
              }}
            >
              <Database size={22} color="#60a5fa" />
            </div>
            <div>
              <h1 className="text-[20px]" style={{ color: '#e2e8f0' }}>
                冷链样本管理系统
              </h1>
              <div className="text-[13px]" style={{ color: '#334155' }}>
                BioFridge™ Lab Management · v2.0.{tick % 10}
              </div>
            </div>
            <FridgeSelector
              refrigerators={refrigerators}
              selectedId={selectedFridgeId}
              onSelect={setSelectedFridgeId}
              onAdd={handleAddFridge}
              onDelete={handleDeleteFridge}
              onEdit={handleEditFridge}
            />
          </div>

          <div className="flex items-center gap-6">
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

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 flex gap-6 p-6 overflow-auto items-start justify-center flex-wrap">
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
          />

          {/* Left: Fridge */}
          <div className="flex flex-col gap-5">
            {/* Search bar */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: 'rgba(10,20,40,0.8)',
                border: `1px solid ${searchQuery ? 'rgba(34,211,238,0.4)' : 'rgba(30,58,100,0.5)'}`,
                boxShadow: searchQuery ? '0 0 4px rgba(34,211,238,0.08)' : 'none',
                width: '560px',
              }}
            >
              <Search size={20} color={searchQuery ? '#22d3ee' : '#475569'} />
              <input
                type="text"
                placeholder="搜索样本 ID、类型、患者编号、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[16px] placeholder:text-slate-600"
                style={{ color: '#94a3b8' }}
              />
              {searchQuery && (
                <div className="flex items-center gap-1">
                  <span className="text-[14px]" style={{ color: '#22d3ee' }}>
                    {matchedIds.size} 个匹配
                  </span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[14px] px-2 py-1 rounded"
                    style={{ color: '#64748b' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Loading state */}
            {loading && !viewingContainer && (
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{
                  width: '560px',
                  height: '200px',
                  background: 'rgba(5,12,25,0.7)',
                  border: '1px solid rgba(30,58,100,0.4)',
                }}
              >
                <span style={{ color: '#475569' }}>加载中...</span>
              </div>
            )}

            {/* The fridge */}
            {(!loading || viewingContainer) && selectedFridgeId && (
              <FridgeUnit
                samples={samples}
                selectedSampleId={selectedSampleId}
                matchedIds={matchedIds}
                searchQuery={searchQuery}
                compartmentGrids={compartmentGrids}
                viewingContainer={viewingContainer}
                onDropSample={handleDrop}
                onSelectSample={setSelectedSampleId}
                onDeleteSample={handleDeleteSample}
                onSlotClick={handleSlotClick}
                onEnterContainer={handleEnterContainer}
                onExitContainer={handleExitContainer}
                onDropSubSample={handleDropSubSample}
                onAddSubSample={handleAddSubSample}
                onDeleteSubSample={handleDeleteSubSample}
                onUpdateCompartmentGrid={handleUpdateCompartmentGrid}
                onUpdateContainerGrid={handleUpdateContainerGrid}
              />
            )}

            {/* No fridge state */}
            {!loading && !selectedFridgeId && (
              <div
                className="flex flex-col items-center justify-center gap-4 rounded-2xl"
                style={{
                  width: '560px',
                  height: '200px',
                  background: 'rgba(5,12,25,0.7)',
                  border: '1px solid rgba(30,58,100,0.4)',
                }}
              >
                <span style={{ color: '#475569' }}>没有冰箱，请先创建一个</span>
                <button
                  onClick={() => handleAddFridge('主冰箱', '默认冰箱')}
                  className="px-4 py-2 rounded-lg text-[14px]"
                  style={{
                    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                    border: '1px solid #3b82f6',
                    color: '#bfdbfe',
                  }}
                >
                  创建默认冰箱
                </button>
              </div>
            )}
          </div>

          {/* Right: Control Panel */}
          <div
            className="flex flex-col gap-4"
            style={{ minWidth: '340px', maxWidth: '400px' }}
          >
            {/* Add button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddButtonClick}
              disabled={!selectedFridgeId}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[18px] transition-all"
              style={{
                background: selectedFridgeId
                  ? 'linear-gradient(135deg, #1d4ed8, #2563eb)'
                  : 'rgba(255,255,255,0.05)',
                border: selectedFridgeId
                  ? '1px solid #3b82f6'
                  : '1px solid rgba(255,255,255,0.1)',
                color: selectedFridgeId ? '#bfdbfe' : '#475569',
                boxShadow: selectedFridgeId ? '0 0 6px rgba(59,130,246,0.15)' : 'none',
              }}
            >
              <Plus size={22} />
              {viewingContainer ? '添加副样本' : '添加新样本'}
            </motion.button>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatsCard
                label="总容量"
                value={`${usedSlots}/${totalCapacity}`}
                sub={`使用率 ${Math.round((usedSlots / totalCapacity) * 100)}%`}
                color="#60a5fa"
              />
              <StatsCard
                label="冷冻层"
                value={`${samples.filter((s) => s.compartment === 'upper').length}/${upperCapacity}`}
                sub="-20°C 冷冻"
                color="#818cf8"
              />
              <StatsCard
                label="冷藏层"
                value={`${samples.filter((s) => s.compartment === 'lower').length}/${lowerCapacity}`}
                sub="+4°C 冷藏"
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
                background: 'rgba(10,18,35,0.7)',
                border: '1px solid rgba(30,58,100,0.4)',
              }}
            >
              <div className="text-[14px] mb-2" style={{ color: '#475569' }}>
                副样本统计
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Layers size={16} color="#a78bfa" />
                  <span className="text-[14px] flex-1" style={{ color: '#94a3b8' }}>
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

            {/* Status legend */}
            <div
              className="rounded-xl p-4"
              style={{
                background: 'rgba(10,18,35,0.7)',
                border: '1px solid rgba(30,58,100,0.4)',
              }}
            >
              <div className="text-[14px] mb-2" style={{ color: '#475569' }}>
                状态图例
              </div>
              <div className="space-y-2">
                {(Object.keys(STATUS_CONFIG) as SampleStatus[]).map((status) => {
                  const count = samples.filter((s) => s.status === status).length;
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        style={{
                          background: STATUS_CONFIG[status].bgColor,
                          border: `1px solid ${STATUS_CONFIG[status].borderColor}`,
                          boxShadow: `0 0 2px ${STATUS_CONFIG[status].glowColor}`,
                        }}
                      />
                      <span
                        className="text-[14px] flex-1"
                        style={{ color: STATUS_CONFIG[status].color }}
                      >
                        {STATUS_CONFIG[status].label}
                      </span>
                      <span className="text-[14px] font-mono" style={{ color: '#334155' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </main>

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
        <AddSampleModal
          isOpen={showAddModal}
          targetCompartment={addTarget?.compartment ?? null}
          targetPosition={addTarget?.position ?? null}
          onClose={() => { setShowAddModal(false); setEditItem(null); }}
          onAdd={handleAddSample}
          onAddSubSample={handleAddSubSample}
          existingIds={samples.map((s) => s.id)}
          containers={samples}
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
        <div className="text-[12px]" style={{ color: '#475569' }}>
          {label}
        </div>
        <div className="text-[14px] font-mono" style={{ color }}>
          {value}
        </div>
      </div>
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
        background: 'rgba(10,18,35,0.7)',
        border: pulse
          ? `1px solid ${color}50`
          : `1px solid ${color}20`,
      }}
    >
      <div className="text-[13px] mb-1" style={{ color: '#475569' }}>
        {label}
      </div>
      <div className="text-[22px] font-mono" style={{ color }}>
        {value}
      </div>
      <div className="text-[12px] mt-1" style={{ color: '#334155' }}>
        {sub}
      </div>
    </div>
  );
}
