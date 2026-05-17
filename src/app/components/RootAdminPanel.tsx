import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Database,
  Download,
  Eye,
  FlaskConical,
  KeyRound,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Snowflake,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import type { AuthUser } from '../AuthContext';
import {
  AdminSummary,
  AdminSampleItem,
  AdminUser,
  AdminBox,
  createAdminUser,
  createSampleType,
  deleteAdminUser,
  deleteSample,
  deleteSubSample,
  fetchAdminSamples,
  fetchAdminSummary,
  fetchAdminUsers,
  fetchAdminBoxes,
  fetchAdminSampleRecords,
  fetchAdminUpperItems,
  deleteAdminUpperItem,
  fetchSampleRecords,
  fetchSampleTypes,
  updateAdminUser,
  updateSample,
  updateSubSample,
  updateBox,
  deleteBox,
  updateSampleRecord,
  deleteSampleRecord,
  downloadAdminExport,
  updateAdminUpperItem,
  fetchItemTypes,
  createItemType,
} from '../api';
import { AddSampleModal } from './AddSampleModal';
import { Compartment, Sample, SampleStatus, SubSample, SampleRecord, formatChineseShortDate } from '../types';
import type { UpperItem } from '../types';
import { useIsMobile } from './ui/use-mobile';
import { AddItemModal } from './AddItemModal';
import { DEFAULT_ITEM_TYPES } from '../types';

type NotifyType = 'info' | 'warn' | 'success' | 'error';

interface RootAdminPanelProps {
  currentUsername: string;
  onNotify: (message: string, type?: NotifyType) => void;
}

const STATUS_LABELS: Record<string, string> = {
  normal: '正常',
  warning: '温度异常',
  critical: '严重异常',
  used: '已使用',
  pending: '待处理',
};

const STATUS_COLORS: Record<string, string> = {
  normal: '#2563eb',
  warning: '#d97706',
  critical: '#dc2626',
  used: '#64748b',
  pending: '#7c3aed',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--app-card-bg)',
  border: '1px solid var(--app-border)',
  color: 'var(--app-text)',
};

export function RootAdminPanel({ currentUsername, onNotify }: RootAdminPanelProps) {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [samples, setSamples] = useState<AdminSampleItem[]>([]);
  const [sampleTypes, setSampleTypes] = useState<string[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [sampleQuery, setSampleQuery] = useState('');
  const [sampleTypeFilter, setSampleTypeFilter] = useState('__all__');
  const [editingSample, setEditingSample] = useState<AdminSampleItem | null>(null);
  const [adminBoxes, setAdminBoxes] = useState<AdminBox[]>([]);
  const [adminSampleRecords, setAdminSampleRecords] = useState<SampleRecord[]>([]);
  const [adminUpperItems, setAdminUpperItems] = useState<UpperItem[]>([]);
  const [editingUpperItem, setEditingUpperItem] = useState<UpperItem | null>(null);
  const [itemTypes, setItemTypes] = useState<string[]>([]);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [editBoxName, setEditBoxName] = useState('');
  const [editBoxOwner, setEditBoxOwner] = useState('');
  const [editBoxNote, setEditBoxNote] = useState('');
  const [busyBoxId, setBusyBoxId] = useState<string | null>(null);
  const [selectedAdminSR, setSelectedAdminSR] = useState<SampleRecord | null>(null);
  const [editingSR, setEditingSR] = useState(false);
  const [editSRName, setEditSRName] = useState('');
  const [editSRCode, setEditSRCode] = useState('');
  const [editSRType, setEditSRType] = useState('');
  const [editSRSource, setEditSRSource] = useState('');
  const [editSRStage, setEditSRStage] = useState('');
  const [editSRDate, setEditSRDate] = useState('');
  const [busySRId, setBusySRId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [busySampleId, setBusySampleId] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AuthUser['role']>('user');
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});

  const rootCount = useMemo(() => users.filter((user) => user.role === 'root').length, [users]);
  const availableSampleTypes = useMemo(() => {
    const merged = new Set<string>(sampleTypes);
    samples.forEach((sample) => {
      if (sample.type) merged.add(sample.type);
    });
    return Array.from(merged).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [sampleTypes, samples]);
  const filteredSamples = useMemo(() => {
    const query = sampleQuery.trim().toLowerCase();
    return samples.filter((sample) => {
      if (sampleTypeFilter !== '__all__' && sample.type !== sampleTypeFilter) return false;
      if (!query) return true;
      return [
        sample.id,
        sample.name,
        sample.type,
        sample.patientId,
        sample.uploader,
        sample.createdBy || '',
        sample.refrigeratorName,
        sample.parentId || '',
        sample.parentName || '',
        STATUS_LABELS[sample.status] || sample.status,
        ...sample.tags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [sampleQuery, sampleTypeFilter, samples]);
  const selectedSample = useMemo(
    () => filteredSamples.find((sample) => sample.id === selectedSampleId) ?? filteredSamples[0] ?? null,
    [filteredSamples, selectedSampleId],
  );
  const editSampleData = useMemo(
    () => (editingSample?.kind === 'sample' ? toEditableSample(editingSample) : null),
    [editingSample],
  );
  const editSubSampleData = useMemo(
    () => (editingSample?.kind === 'subsample' ? toEditableSubSample(editingSample) : null),
    [editingSample],
  );

  const [srSearchQuery, setSrSearchQuery] = useState('');
  const [selectedSRIde, setSelectedSRIde] = useState<Set<string>>(new Set());
  const [srBoxId, setSrBoxId] = useState<string>('__all__');

  const filteredAdminSR = React.useMemo(() => {
    if (!srSearchQuery.trim()) return adminSampleRecords;
    const q = srSearchQuery.toLowerCase();
    return adminSampleRecords.filter((sr) =>
      sr.patient_name.toLowerCase().includes(q) ||
      sr.sample_code.toLowerCase().includes(q) ||
      (sr.sample_type || '').toLowerCase().includes(q) ||
      (sr.uploader || '').toLowerCase().includes(q)
    );
  }, [adminSampleRecords, srSearchQuery]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, userData, sampleData, sampleTypeData, boxData] = await Promise.all([
        fetchAdminSummary(),
        fetchAdminUsers(),
        fetchAdminSamples(),
        fetchSampleTypes().catch(() => []),
        fetchAdminBoxes().catch(() => []),
      ]);
      setSummary(summaryData);
      setUsers(userData);
      setSamples(sampleData);
      setAdminBoxes(boxData);
      setSampleTypes(() => {
        const merged = new Set<string>([
          ...sampleTypeData,
          ...sampleData.map((sample) => sample.type),
        ]);
        return Array.from(merged).sort((a, b) => a.localeCompare(b, 'zh-CN'));
      });
      setSelectedSampleId((current) => {
        if (current && sampleData.some((sample) => sample.id === current)) return current;
        return sampleData[0]?.id ?? null;
      });
    } catch (err: any) {
      onNotify(err.message || '加载管理数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (srBoxId === '__all__') {
      fetchSampleRecords({}).then(setAdminSampleRecords).catch(() => {});
    } else if (srBoxId) {
      fetchSampleRecords({ box_id: srBoxId }).then(setAdminSampleRecords).catch(() => {});
    }
    setSelectedSRIde(new Set());
  }, [srBoxId]);

  useEffect(() => {
    fetchAdminUpperItems().then(setAdminUpperItems).catch(() => {});
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = newUsername.trim();
    if (!username || !newPassword) {
      onNotify('请填写用户名和密码', 'warn');
      return;
    }
    try {
      setBusyUser('__new__');
      await createAdminUser(username, newPassword, newRole);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      await loadAdminData();
      onNotify(`用户 ${username} 已创建`, 'success');
    } catch (err: any) {
      onNotify(err.message || '创建用户失败', 'error');
    } finally {
      setBusyUser(null);
    }
  };

  const handleRoleChange = async (user: AdminUser, role: AuthUser['role']) => {
    if (user.role === role) return;
    try {
      setBusyUser(user.username);
      await updateAdminUser(user.username, { role });
      await loadAdminData();
      onNotify(`用户 ${user.username} 角色已更新`, 'success');
    } catch (err: any) {
      onNotify(err.message || '更新角色失败', 'error');
    } finally {
      setBusyUser(null);
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    const password = resetPasswords[user.username]?.trim();
    if (!password) {
      onNotify('请输入新密码', 'warn');
      return;
    }
    try {
      setBusyUser(user.username);
      await updateAdminUser(user.username, { password });
      setResetPasswords((prev) => ({ ...prev, [user.username]: '' }));
      onNotify(`用户 ${user.username} 密码已重置`, 'success');
    } catch (err: any) {
      onNotify(err.message || '重置密码失败', 'error');
    } finally {
      setBusyUser(null);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`删除用户 ${user.username}？样本记录会保留。`)) return;
    try {
      setBusyUser(user.username);
      await deleteAdminUser(user.username);
      await loadAdminData();
      onNotify(`用户 ${user.username} 已删除`, 'warn');
    } catch (err: any) {
      onNotify(err.message || '删除用户失败', 'error');
    } finally {
      setBusyUser(null);
    }
  };

  const handleSampleTypeCreate = useCallback(async (name: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    setSampleTypes((prev) =>
      prev.includes(normalized)
        ? prev
        : [...prev, normalized].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    );
    try {
      await createSampleType(normalized);
    } catch {
      // ignore duplicate or unavailable endpoint
    }
  }, []);

  const handleEditOpen = useCallback((sample: AdminSampleItem) => {
    setEditingSample(sample);
  }, []);

  const handleEditClose = useCallback(() => {
    setEditingSample(null);
  }, []);

  const handleUpdateSample = useCallback(async (sample: Sample) => {
    if (!editingSample || editingSample.kind !== 'sample') return;
    try {
      setBusySampleId(editingSample.id);
      await updateSample(editingSample.refrigeratorId, editingSample.id, {
        name: sample.name,
        type: sample.type,
        status: sample.status,
        collectedAt: sample.collectedAt,
        patientId: sample.patientId,
        uploader: sample.uploader,
        tags: sample.tags,
        note: sample.note,
        volume: sample.volume,
      });
      await loadAdminData();
      setSelectedSampleId(editingSample.id);
      setEditingSample(null);
      onNotify(`样本 ${editingSample.id} 已更新`, 'success');
    } catch (err: any) {
      onNotify(err.message || '更新样本失败', 'error');
    } finally {
      setBusySampleId(null);
    }
  }, [editingSample, loadAdminData, onNotify]);

  const handleUpdateSubSample = useCallback(async (containerId: string, subSample: SubSample) => {
    if (!editingSample || editingSample.kind !== 'subsample') return;
    try {
      setBusySampleId(editingSample.id);
      await updateSubSample(containerId, editingSample.id, {
        name: subSample.name,
        type: subSample.type,
        status: subSample.status,
        collectedAt: subSample.collectedAt,
        patientId: subSample.patientId,
        uploader: subSample.uploader,
        tags: subSample.tags,
        note: subSample.note,
        volume: subSample.volume,
      });
      await loadAdminData();
      setSelectedSampleId(editingSample.id);
      setEditingSample(null);
      onNotify(`旧副样本 ${editingSample.id} 已更新`, 'success');
    } catch (err: any) {
      onNotify(err.message || '更新旧副样本失败', 'error');
    } finally {
      setBusySampleId(null);
    }
  }, [editingSample, loadAdminData, onNotify]);

  const handleDeleteSelectedSample = useCallback(async (sample: AdminSampleItem) => {
    const label = sample.kind === 'sample' ? '样本' : '旧副样本';
    if (!window.confirm(`删除${label} ${sample.id}？`)) return;
    try {
      setBusySampleId(sample.id);
      if (sample.kind === 'sample') {
        await deleteSample(sample.refrigeratorId, sample.id);
      } else if (sample.parentId) {
        await deleteSubSample(sample.parentId, sample.id);
      } else {
        throw new Error('缺少父容器信息，无法删除旧副样本');
      }
      await loadAdminData();
      setEditingSample((current) => (current?.id === sample.id ? null : current));
      onNotify(`${label} ${sample.id} 已删除`, 'warn');
    } catch (err: any) {
      onNotify(err.message || `删除${label}失败`, 'error');
    } finally {
      setBusySampleId(null);
    }
  }, [loadAdminData, onNotify]);

  const handleSampleStatusChange = useCallback(async (sample: AdminSampleItem, status: SampleStatus) => {
    if (sample.status === status) return;
    try {
      setBusySampleId(sample.id);
      if (sample.kind === 'sample') {
        await updateSample(sample.refrigeratorId, sample.id, { status });
      } else if (sample.parentId) {
        await updateSubSample(sample.parentId, sample.id, { status });
      } else {
        throw new Error('缺少父容器信息，无法更新旧副样本状态');
      }
      await loadAdminData();
      setSelectedSampleId(sample.id);
      onNotify(`${sample.kind === 'sample' ? '样本' : '旧副样本'} ${sample.id} 状态已更新`, 'success');
    } catch (err: any) {
      onNotify(err.message || '更新状态失败', 'error');
    } finally {
      setBusySampleId(null);
    }
  }, [loadAdminData, onNotify]);

  // ── Box handlers ──

  const handleStartEditBox = useCallback((box: AdminBox) => {
    setEditingBoxId(box.id);
    setEditBoxName(box.name);
    setEditBoxOwner(box.owner || '');
    setEditBoxNote(box.note || '');
  }, []);

  const handleCancelEditBox = useCallback(() => {
    setEditingBoxId(null);
  }, []);

  const handleSaveBox = useCallback(async (boxId: string) => {
    if (!editBoxName.trim()) return;
    setBusyBoxId(boxId);
    try {
      await updateBox(boxId, { name: editBoxName.trim(), owner: editBoxOwner || null, note: editBoxNote || null });
      setAdminBoxes((prev) => prev.map((b) => b.id === boxId ? { ...b, name: editBoxName.trim(), owner: editBoxOwner || null, note: editBoxNote || null } : b));
      setEditingBoxId(null);
      onNotify('盒子已更新', 'success');
    } catch (err: any) {
      onNotify(err.message || '更新盒子失败', 'error');
    } finally {
      setBusyBoxId(null);
    }
  }, [editBoxName, editBoxOwner, editBoxNote, onNotify]);

  const handleDeleteBox = useCallback(async (box: AdminBox) => {
    if (!window.confirm(`确定删除盒子 "${box.name}"（${box.fridge_name} / 抽屉${box.drawer_label}）？关联试管不会被删除。`)) return;
    setBusyBoxId(box.id);
    try {
      await deleteBox(box.id);
      setAdminBoxes((prev) => prev.filter((b) => b.id !== box.id));
      onNotify(`盒子 "${box.name}" 已删除`, 'warn');
    } catch (err: any) {
      onNotify(err.message || '删除盒子失败', 'error');
    } finally {
      setBusyBoxId(null);
    }
  }, [onNotify]);

  // ── Sample Record handlers ──
  const handleSelectSR = useCallback((sr: SampleRecord) => {
    setSelectedAdminSR(sr);
    setEditingSR(false);
  }, []);

  const handleStartEditSR = useCallback(() => {
    if (!selectedAdminSR) return;
    setEditSRName(selectedAdminSR.patient_name);
    setEditSRCode(selectedAdminSR.sample_code);
    setEditSRType(selectedAdminSR.sample_type || '');
    setEditSRSource(selectedAdminSR.source || '');
    setEditSRStage(selectedAdminSR.collection_stage || '');
    setEditSRDate(selectedAdminSR.collected_at ? selectedAdminSR.collected_at.slice(0, 10) : '');
    setEditingSR(true);
  }, [selectedAdminSR]);

  const handleSaveSR = useCallback(async () => {
    if (!selectedAdminSR || !editSRName.trim() || !editSRCode.trim()) return;
    setBusySRId(selectedAdminSR.id);
    try {
      await updateSampleRecord(selectedAdminSR.id, {
        patient_name: editSRName.trim(),
        sample_code: editSRCode.trim(),
        sample_type: editSRType || null,
        source: editSRSource || null,
        collection_stage: editSRStage || null,
        collected_at: editSRDate || null,
      } as any);
      setAdminSampleRecords((prev) => prev.map((r) =>
        r.id === selectedAdminSR.id ? { ...r, patient_name: editSRName.trim(), sample_code: editSRCode.trim(), sample_type: editSRType || null, source: editSRSource || null, collection_stage: editSRStage || null, collected_at: editSRDate || null } : r
      ));
      setSelectedAdminSR((prev) => prev ? { ...prev, patient_name: editSRName.trim(), sample_code: editSRCode.trim(), sample_type: editSRType || null, source: editSRSource || null, collection_stage: editSRStage || null, collected_at: editSRDate || null } : null);
      setEditingSR(false);
      onNotify('样本记录已更新', 'success');
    } catch (err: any) {
      onNotify(err.message || '更新失败', 'error');
    } finally { setBusySRId(null); }
  }, [selectedAdminSR, editSRName, editSRCode, editSRType, editSRSource, editSRStage, editSRDate, onNotify]);

  const handleDeleteSR = useCallback(async () => {
    if (!selectedAdminSR) return;
    if (!window.confirm(`确定删除样本记录 "${selectedAdminSR.patient_name}" (${selectedAdminSR.sample_code})？关联试管也会被删除。`)) return;
    setBusySRId(selectedAdminSR.id);
    try {
      await deleteSampleRecord(selectedAdminSR.id);
      setAdminSampleRecords((prev) => prev.filter((r) => r.id !== selectedAdminSR.id));
      setSelectedAdminSR(null);
      onNotify('样本记录已删除', 'warn');
    } catch (err: any) {
      onNotify(err.message || '删除失败', 'error');
    } finally { setBusySRId(null); }
  }, [selectedAdminSR, onNotify]);

  const handleBatchDeleteSR = useCallback(async () => {
    if (selectedSRIde.size === 0) return;
    if (!window.confirm(`确定删除 ${selectedSRIde.size} 条样本记录？关联试管也会被删除。`)) return;
    let deleted = 0;
    for (const id of selectedSRIde) {
      try { await deleteSampleRecord(id); deleted++; } catch {}
    }
    setAdminSampleRecords((prev) => prev.filter((r) => !selectedSRIde.has(r.id)));
    setSelectedSRIde(new Set());
    setSelectedAdminSR(null);
    onNotify(`已删除 ${deleted} 条`, 'warn');
  }, [selectedSRIde, onNotify]);

  const totalSamplesText = summary
    ? `${summary.totals.usedSlots} / ${summary.totals.totalCapacity}`
    : '--';

  const handleExport = useCallback(async (type: 'sample-records' | 'boxes' | 'upper-items') => {
    try {
      await downloadAdminExport(type);
      const label = type === 'sample-records' ? '样本记录' : type === 'upper-items' ? '上层物品' : '盒子数据';
      onNotify(`${label}已导出`, 'success');
    } catch (err: any) {
      onNotify(err.message || '导出失败', 'error');
    }
  }, [onNotify]);

  return (
    <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
      <div className="mx-auto flex w-full max-w-full lg:max-w-7xl flex-col gap-3 sm:gap-5">
        <section
          className="rounded-xl p-5"
          style={{
            background: 'var(--app-card-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 18px 52px rgba(15,23,42,0.08)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[13px]" style={{ color: '#2563eb' }}>
                <Shield size={16} />
                ROOT CONTROL
              </div>
              <h2 className="mt-2 text-[26px] font-semibold" style={{ color: 'var(--app-text)' }}>
                全局管理
              </h2>
              <div className="mt-1 text-[13px]" style={{ color: 'var(--app-muted)' }}>
                用户、冰箱容量和样本记录的统一视图
              </div>
            </div>
            <button
              type="button"
              onClick={loadAdminData}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] min-h-[44px]"
              style={{
                background: 'var(--app-panel-bg)',
                border: '1px solid var(--app-border)',
                color: 'var(--app-text)',
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>

          <div className="mt-5 grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            <AdminMetric icon={<Snowflake size={18} />} label="冰箱" value={summary?.totals.refrigerators ?? '--'} color="#2563eb" />
            <AdminMetric
              icon={<FlaskConical size={18} />}
              label="样本记录"
              value={summary ? (summary.totals.sampleRecords ?? adminSampleRecords.length) : '--'}
              color="#06b6d4"
            />
            <AdminMetric
              icon={<Database size={18} />}
              label="占用 / 容量"
              value={totalSamplesText}
              color="#0f766e"
            />
            <AdminMetric icon={<Package size={18} />} label="上层物品" value={summary ? summary.totals.upperItems : (adminUpperItems.length || '--')} color="#7c3aed" />
            <AdminMetric icon={<Database size={18} />} label="盒子 / 试管" value={summary ? `${summary.totals.boxes} · ${summary.totals.tubes}管` : '--'} color="#0f766e" />
            <AdminMetric icon={<AlertTriangle size={18} />} label="异常" value={summary?.totals.abnormal ?? '--'} color="#dc2626" />
            <AdminMetric icon={<Users size={18} />} label="用户" value={users.length || '--'} color="#7c3aed" />
            <AdminMetric icon={<Activity size={18} />} label="总占用率" value={summary ? `${summary.totals.usageRate}%` : '--'} color="#2563eb" />
          </div>
        </section>

        <section
          className="rounded-xl p-4"
          style={{
            background: 'var(--app-card-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
          }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[17px] font-semibold" style={{ color: 'var(--app-text)' }}>
                用户管理
              </h3>
              <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                root {rootCount} 人 · 当前 {currentUsername}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                  <th className="px-3 py-1 font-medium">用户</th>
                  <th className="px-3 py-1 font-medium">角色</th>
                  <th className="px-3 py-1 font-medium">数据</th>
                  <th className="px-3 py-1 font-medium">创建时间</th>
                  <th className="px-3 py-1 font-medium">重置密码</th>
                  <th className="px-3 py-1 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const busy = busyUser === user.username;
                  const isCurrent = user.username === currentUsername;
                  const canDemote = !(isCurrent && user.role === 'root') && !(user.role === 'root' && rootCount <= 1);
                  return (
                    <tr key={user.username}>
                      <td
                        className="rounded-l-lg px-3 py-3"
                        style={{ background: 'var(--app-panel-bg)', color: 'var(--app-text)' }}
                      >
                        <div className="flex items-center gap-2">
                          <UserCog size={16} color={user.role === 'root' ? '#2563eb' : 'var(--app-muted)'} />
                          <span className="font-medium">{user.username}</span>
                          {isCurrent && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px]"
                              style={{
                                background: 'var(--app-info-bg)',
                                border: '1px solid var(--app-info-border)',
                                color: 'var(--app-info-text)',
                              }}
                            >
                              当前
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3" style={{ background: 'var(--app-panel-bg)' }}>
                        <select
                          value={user.role}
                          disabled={busy || (user.role === 'root' && !canDemote)}
                          onChange={(e) => handleRoleChange(user, e.target.value as AuthUser['role'])}
                          className="rounded-md px-2 py-1.5 text-[13px] outline-none min-h-[44px]"
                          style={inputStyle}
                        >
                          <option value="user">普通用户</option>
                          <option value="root">管理员 root</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-[13px]" style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)' }}>
                        样本 {user.sampleCount} · 旧副样本 {user.subSampleCount}
                      </td>
                      <td className="px-3 py-3 text-[12px]" style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)' }}>
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-3 py-3" style={{ background: 'var(--app-panel-bg)' }}>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={resetPasswords[user.username] || ''}
                            onChange={(e) =>
                              setResetPasswords((prev) => ({ ...prev, [user.username]: e.target.value }))
                            }
                            placeholder="新密码"
                            className="w-full sm:w-28 rounded-md px-2 py-1.5 text-[16px] sm:text-[13px] outline-none min-h-[44px]"
                            style={inputStyle}
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleResetPassword(user)}
                            className="rounded-md p-2 min-h-[44px] min-w-[44px]"
                            style={{ background: 'var(--app-info-soft-bg)', color: 'var(--app-info-soft-text)' }}
                            title="重置密码"
                          >
                            <KeyRound size={14} />
                          </button>
                        </div>
                      </td>
                      <td
                        className="rounded-r-lg px-3 py-3 text-right"
                        style={{ background: 'var(--app-panel-bg)' }}
                      >
                        <button
                          type="button"
                          disabled={busy || isCurrent || (user.role === 'root' && rootCount <= 1)}
                          onClick={() => handleDeleteUser(user)}
                          className="rounded-md p-2 disabled:opacity-35 min-h-[44px] min-w-[44px]"
                          style={{ background: 'var(--app-danger-soft-bg)', color: 'var(--app-danger-soft-text)' }}
                          title="删除用户"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="rounded-lg px-3 py-8 text-center text-[13px]" style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)' }}>
                      暂无用户
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid items-start gap-3 sm:gap-5 grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)]">
          <form
            onSubmit={handleCreateUser}
            className="rounded-xl p-4"
            style={{
              background: 'var(--app-card-bg)',
              border: '1px solid var(--app-border)',
              boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
            }}
          >
            <h3 className="mb-3 text-[17px] font-semibold" style={{ color: 'var(--app-text)' }}>
              创建用户
            </h3>
            <div className="space-y-3">
              <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="用户名"
                className="w-full rounded-lg px-3 py-2 text-[16px] sm:text-[14px] outline-none min-h-[44px]" style={inputStyle} />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="密码"
                className="w-full rounded-lg px-3 py-2 text-[16px] sm:text-[14px] outline-none min-h-[44px]" style={inputStyle} />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as AuthUser['role'])}
                className="w-full rounded-lg px-3 py-2 text-[16px] sm:text-[14px] outline-none min-h-[44px]" style={inputStyle}>
                <option value="user">普通用户</option>
                <option value="root">管理员 root</option>
              </select>
              <button type="submit" disabled={busyUser === '__new__'}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[14px] min-h-[44px]"
                style={{ background: '#2563eb', color: '#ffffff' }}>
                <Plus size={16} />{busyUser === '__new__' ? '创建中...' : '创建'}
              </button>
            </div>
          </form>

          {/* Dashboard: status & type distribution */}
          <div className="space-y-4">
            {/* Sample type distribution */}
            <div className="rounded-xl p-4" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)', boxShadow: '0 14px 40px rgba(15,23,42,0.06)' }}>
              <h3 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--app-text)' }}>样本类型分布</h3>
              {(summary?.typeCounts || []).length === 0 ? (
                <div className="py-4 text-center text-[13px]" style={{ color: 'var(--app-muted)' }}>暂无数据</div>
              ) : (
                <div className="space-y-2">
                  {(summary?.typeCounts || []).slice(0, 8).map((item) => {
                    const total = (summary?.typeCounts || []).reduce((s, i) => s + i.count, 0) || 1;
                    const pct = Math.round((item.count / total) * 100);
                    return (
                      <div key={item.type}>
                        <div className="flex justify-between text-[12px] mb-0.5">
                          <span style={{ color: 'var(--app-text)' }}>{item.type}</span>
                          <span className="font-mono" style={{ color: 'var(--app-muted)' }}>{item.count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: 'var(--app-progress-track)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%`, background: '#06b6d4' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status distribution */}
            <div className="rounded-xl p-4" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)', boxShadow: '0 14px 40px rgba(15,23,42,0.06)' }}>
              <h3 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--app-text)' }}>状态分布</h3>
              {(summary?.statusCounts || []).length === 0 ? (
                <div className="py-4 text-center text-[13px]" style={{ color: 'var(--app-muted)' }}>暂无数据</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(summary?.statusCounts || []).map((item) => {
                    const color = STATUS_COLORS[item.status] || '#64748b';
                    return (
                      <div key={item.status} className="rounded-full px-3 py-1.5 text-[12px]"
                        style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
                        {STATUS_LABELS[item.status] || item.status} · {item.count}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fridge overview */}
        <section className="rounded-xl p-4" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)', boxShadow: '0 14px 40px rgba(15,23,42,0.06)' }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[17px] font-semibold" style={{ color: 'var(--app-text)' }}>冰箱概览</h3>
              <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                汇总容量、样本记录、盒子、试管与上层物品
              </div>
            </div>
            <span className="rounded-full px-3 py-1 text-[12px]" style={{ background: 'var(--app-panel-bg)', border: '1px solid var(--app-border)', color: 'var(--app-muted)' }}>
              {summary?.refrigerators.length ?? 0} 台
            </span>
          </div>
          <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {summary?.refrigerators.map((fridge) => {
              const used = fridge.sampleCount + (fridge.tubeCount || 0) + (fridge.upperItemCount || 0);
              const usage = fridge.usageRate ?? (fridge.capacity > 0 ? Math.round((used / fridge.capacity) * 100) : 0);
              const abnormal = fridge.criticalCount + fridge.warningCount;
              return (
                <div key={fridge.id} className="rounded-xl p-4" style={{ background: 'var(--app-panel-bg)', border: abnormal > 0 ? '1px solid rgba(239,68,68,0.28)' : '1px solid var(--app-border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium" style={{ color: 'var(--app-text)' }}>{fridge.name}</div>
                      <div className="mt-1 text-[12px]" style={{ color: 'var(--app-muted)' }}>{fridge.id}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[15px] font-mono" style={{ color: usage > 80 ? '#ef4444' : usage > 50 ? '#f59e0b' : '#22c55e' }}>{usage}%</span>
                      <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>占用率</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--app-progress-track)' }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(usage, 100)}%`,
                      background: usage > 80 ? '#ef4444' : usage > 50 ? '#f59e0b' : '#22c55e',
                    }} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                    <AdminMiniStat label="占用" value={`${used}/${fridge.capacity}`} />
                    <AdminMiniStat label="上层物品" value={fridge.upperItemCount || 0} />
                    <AdminMiniStat label="盒子 / 试管" value={`${fridge.boxCount || 0} / ${fridge.tubeCount || 0}`} />
                    <AdminMiniStat label="旧系统样本" value={`${fridge.sampleCount} / ${fridge.subSampleCount}`} />
                    <AdminMiniStat label="样本记录" value={fridge.sampleRecordCount || 0} />
                    <AdminMiniStat label="异常" value={abnormal} color={abnormal > 0 ? '#ef4444' : undefined} />
                  </div>
                </div>
              );
            })}
            {summary && summary.refrigerators.length === 0 && (
              <div className="rounded-lg px-3 py-8 text-center text-[13px]" style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)' }}>暂无冰箱</div>
            )}
          </div>
        </section>

        {/* Box Management */}
        <section
          className="rounded-xl p-4"
          style={{
            background: 'var(--app-card-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[17px] font-semibold" style={{ color: 'var(--app-text)' }}>
                盒子管理
              </h3>
              <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                {adminBoxes.length} 个盒子 · {adminBoxes.reduce((s, b) => s + (b.tube_count || 0), 0)} 个试管
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleExport('boxes')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] min-h-[44px]"
              style={{ background: 'var(--app-panel-bg)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
            >
              <Download size={14} />导出Excel
            </button>
          </div>
          {adminBoxes.length === 0 ? (
            <div className="text-center py-8 text-[13px]" style={{ color: 'var(--app-muted)' }}>
              暂无盒子数据
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-separate border-spacing-y-1.5 text-left">
                <thead>
                  <tr className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                    <th className="px-2 py-1 font-medium">冰箱</th>
                    <th className="px-2 py-1 font-medium">抽屉</th>
                    <th className="px-2 py-1 font-medium">盒子名称</th>
                    <th className="px-2 py-1 font-medium">模式</th>
                    <th className="px-2 py-1 font-medium">网格</th>
                    <th className="px-2 py-1 font-medium">试管数</th>
                    <th className="px-2 py-1 font-medium">负责人</th>
                    <th className="px-2 py-1 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {adminBoxes.map((box) => {
                    const isEditing = editingBoxId === box.id;
                    const busy = busyBoxId === box.id;
                    const rowBg = { background: 'var(--app-panel-bg)' };
                    const cellText = { color: 'var(--app-text)' };
                    const cellMuted = { color: 'var(--app-muted)' };
                    return (
                    <tr key={box.id}>
                      <td className="rounded-l-lg px-2 py-2 text-[13px]" style={{ ...rowBg, ...cellText }}>
                        {box.fridge_name}
                      </td>
                      <td className="px-2 py-2 text-[13px]" style={{ ...rowBg, ...cellText }}>
                        第{box.layer}层 {box.drawer_label}
                      </td>
                      <td className="px-2 py-2 text-[13px] font-medium" style={{ ...rowBg, ...cellText }}>
                        {isEditing ? (
                          <input value={editBoxName} onChange={(e) => setEditBoxName(e.target.value)}
                            className="w-full rounded px-2 py-1 text-[16px] sm:text-[13px] outline-none min-h-[44px]"
                            style={{ background: 'var(--app-input-bg)', border: '1px solid var(--app-input-border)', color: 'var(--app-text)' }} />
                        ) : box.name}
                      </td>
                      <td className="px-2 py-2 text-[12px]" style={rowBg}>
                        <span className="rounded px-1.5 py-0.5" style={{
                          background: box.mode === 'precise' ? '#dbeafe' : '#f1f5f9',
                          color: box.mode === 'precise' ? '#1d4ed8' : '#64748b',
                        }}>
                          {box.mode === 'precise' ? '精细' : '简略'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-[12px]" style={{ ...rowBg, ...cellMuted }}>
                        {box.grid_rows && box.grid_cols ? `${box.grid_rows}×${box.grid_cols}` : '—'}
                      </td>
                      <td className="px-2 py-2 text-[13px] font-mono" style={{ ...rowBg, color: '#2563eb' }}>
                        {box.tube_count || 0}
                      </td>
                      <td className="px-2 py-2 text-[12px]" style={{ ...rowBg, ...cellMuted }}>
                        {isEditing ? (
                          <input value={editBoxOwner} onChange={(e) => setEditBoxOwner(e.target.value)}
                            className="w-full rounded px-2 py-1 text-[16px] sm:text-[12px] outline-none min-h-[44px]"
                            style={{ background: 'var(--app-input-bg)', border: '1px solid var(--app-input-border)', color: 'var(--app-text)' }} />
                        ) : (box.owner || '—')}
                      </td>
                      <td className="rounded-r-lg px-2 py-2 text-right" style={rowBg}>
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleSaveBox(box.id)} disabled={busy}
                              className="text-[11px] px-2 py-1 rounded min-h-[44px]" style={{ background: '#2563eb', color: '#fff' }}>
                              {busy ? '...' : '保存'}
                            </button>
                            <button onClick={handleCancelEditBox}
                              className="text-[11px] px-2 py-1 rounded min-h-[44px]" style={{ background: 'var(--app-input-bg)', color: 'var(--app-muted)' }}>
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleStartEditBox(box)}
                              className="text-[11px] px-2 py-1 rounded hover:opacity-80 min-h-[44px]" style={{ color: '#2563eb' }}>
                              编辑
                            </button>
                            <button onClick={() => handleDeleteBox(box)} disabled={busy}
                              className="text-[11px] px-2 py-1 rounded hover:opacity-80 min-h-[44px]" style={{ color: '#ef4444' }}>
                              删除
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Upper Items */}
        <section className="rounded-xl p-4" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)", boxShadow: "0 14px 40px rgba(15,23,42,0.06)" }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>上层物品</h3>
              <div className="text-[12px]" style={{ color: "var(--app-muted)" }}>{adminUpperItems.length} 件</div>
            </div>
            <button
              type="button"
              onClick={() => handleExport('upper-items')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] min-h-[44px]"
              style={{ background: 'var(--app-panel-bg)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
            >
              <Download size={14} />导出Excel
            </button>
          </div>
          {adminUpperItems.length === 0 ? <div className="py-8 text-center text-[13px]" style={{ color: "var(--app-muted)" }}>暂无物品</div> : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full min-w-[600px] border-separate border-spacing-y-1 text-left">
                <thead><tr className="text-[12px]" style={{ color: "var(--app-muted)" }}>
                  <th className="px-2 py-1">冰箱</th><th className="px-2 py-1">名称</th><th className="px-2 py-1">类型</th><th className="px-2 py-1">行</th><th className="px-2 py-1">数量</th><th className="px-2 py-1">负责人</th><th className="px-2 py-1 text-right">操作</th>
                </tr></thead>
                <tbody>{adminUpperItems.map((item: any) => (
                  <tr key={item.id}>
                    <td className="rounded-l-lg px-2 py-2 text-[13px]" style={{ background: "var(--app-panel-bg)", color: "var(--app-text)" }}>{item.fridge_name}</td>
                    <td className="px-2 py-2 text-[13px] font-medium" style={{ background: "var(--app-panel-bg)", color: "var(--app-text)" }}>{item.name}</td>
                    <td className="px-2 py-2 text-[12px]" style={{ background: "var(--app-panel-bg)", color: "var(--app-muted)" }}>{item.item_type}</td>
                    <td className="px-2 py-2 text-[12px]" style={{ background: "var(--app-panel-bg)", color: "var(--app-muted)" }}>{item.row_number}</td>
                    <td className="px-2 py-2 text-[13px] font-mono" style={{ background: "var(--app-panel-bg)", color: "#2563eb" }}>{item.quantity}</td>
                    <td className="px-2 py-2 text-[12px]" style={{ background: "var(--app-panel-bg)", color: "var(--app-muted)" }}>{item.owner || "—"}</td>
                    <td className="rounded-r-lg px-2 py-2 text-right" style={{ background: "var(--app-panel-bg)" }}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingUpperItem(item)}
                          className="rounded-md p-2 min-h-[44px] min-w-[44px]"
                          style={{ background: 'var(--app-info-soft-bg)', color: 'var(--app-info-soft-text)' }}
                          title="编辑"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`确定删除物品 "${item.name}"？`)) return;
                            deleteAdminUpperItem(item.id).then(() => {
                              setAdminUpperItems((prev) => prev.filter((i) => i.id !== item.id));
                              onNotify('物品已删除', 'warn');
                            }).catch((err) => onNotify(err.message || '删除失败', 'error'));
                          }}
                          className="rounded-md p-2 min-h-[44px] min-w-[44px]"
                          style={{ background: 'var(--app-danger-soft-bg)', color: 'var(--app-danger-soft-text)' }}
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody></table></div>
          )}
        </section>

        <AddItemModal
          isOpen={!!editingUpperItem}
          editItem={editingUpperItem}
          defaultRow={editingUpperItem?.row_number || 1}
          currentUsername={currentUsername}
          itemTypes={itemTypes.length > 0 ? itemTypes : DEFAULT_ITEM_TYPES}
          onAddItemType={async (name) => {
            try { await createItemType(name); } catch {}
            setItemTypes((prev) => prev.includes(name) ? prev : [...prev, name]);
          }}
          onClose={() => setEditingUpperItem(null)}
          onSave={async (data) => {
            if (!editingUpperItem) return;
            try {
              await updateAdminUpperItem(editingUpperItem.id, data);
              setAdminUpperItems((prev) => prev.map((i) => i.id === editingUpperItem.id ? { ...i, ...data } : i));
              onNotify('物品已更新', 'success');
            } catch (err: any) {
              onNotify(err.message || '更新失败', 'error');
            }
          }}
        />

        {/* Sample Records by Box */}
        <section className="rounded-xl p-4" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)", boxShadow: "0 14px 40px rgba(15,23,42,0.06)" }}>
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>样本记录</h3>
              <div className="text-[12px]" style={{ color: "var(--app-muted)" }}>
                {adminSampleRecords.length} 条
                {selectedSRIde.size > 0 && ` · 已选 ${selectedSRIde.size} 条`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={srBoxId}
                onChange={(e) => setSrBoxId(e.target.value)}
                className="rounded-lg px-3 py-1.5 text-[13px] outline-none min-h-[44px]"
                style={inputStyle}
              >
                <option value="__all__">全部盒子 ({adminBoxes.reduce((s, b) => s + (b.tube_count || 0), 0)}管)</option>
                {adminBoxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.fridge_name} · {box.drawer_label} · {box.name} ({box.tube_count || 0}管)
                  </option>
                ))}
              </select>
              {selectedSRIde.size > 0 && (
                <button onClick={handleBatchDeleteSR} className="rounded-lg px-3 py-1.5 text-[12px] min-h-[44px]" style={{ background: "#ef4444", color: "#fff" }}>
                  批量删除 {selectedSRIde.size} 条
                </button>
              )}
              <button
                type="button"
                onClick={() => handleExport('sample-records')}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] min-h-[44px]"
                style={{ background: 'var(--app-panel-bg)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
              >
                <Download size={14} />导出Excel
              </button>
              <input
                value={srSearchQuery}
                onChange={(e) => setSrSearchQuery(e.target.value)}
                placeholder="搜索姓名 / 编号..."
                className="rounded-lg px-3 py-1.5 text-[16px] sm:text-[13px] outline-none w-full sm:w-44 min-h-[44px]"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-1 min-w-0">
              {filteredAdminSR.length === 0 ? (
                <div className="py-8 text-center text-[13px]" style={{ color: "var(--app-muted)" }}>
                  {srSearchQuery ? '无匹配结果' : srBoxId === '__all__' ? '暂无样本记录' : '该盒子暂无样本'}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full min-w-[500px] border-separate border-spacing-y-1 text-left">
                    <thead><tr className="text-[12px]" style={{ color: "var(--app-muted)" }}>
                      <th className="px-2 py-1 w-8"></th>
                      <th className="px-2 py-1 font-medium">姓名</th>
                      <th className="px-2 py-1 font-medium">编号</th>
                      <th className="px-2 py-1 font-medium">类型</th>
                      <th className="px-2 py-1 font-medium">上传者</th>
                      <th className="px-2 py-1 font-medium">试管</th>
                    </tr></thead>
                    <tbody>
                    {filteredAdminSR.map((sr) => {
                      const sel = selectedAdminSR?.id === sr.id;
                      const checked = selectedSRIde.has(sr.id);
                      return (
                      <tr key={sr.id} className="cursor-pointer" style={{ background: sel ? "rgba(37,99,235,0.06)" : "var(--app-panel-bg)" }}>
                        <td className="rounded-l-lg px-2 py-2" onClick={(e) => { e.stopPropagation(); setSelectedSRIde((prev) => { const next = new Set(prev); if (next.has(sr.id)) next.delete(sr.id); else next.add(sr.id); return next; }); }}>
                          <input type="checkbox" checked={checked} onChange={() => {}} className="cursor-pointer" />
                        </td>
                        <td className="px-2 py-2 text-[13px] font-medium" onClick={() => { handleSelectSR(sr); setSelectedSRIde(new Set()); }} style={{ color: "var(--app-text)" }}>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sr.group_color }} />
                            {sr.patient_name}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-[13px]" onClick={() => handleSelectSR(sr)} style={{ color: "var(--app-text)" }}>{sr.sample_code}</td>
                        <td className="px-2 py-2 text-[12px]" onClick={() => handleSelectSR(sr)} style={{ color: "var(--app-muted)" }}>{sr.sample_type || "—"}</td>
                        <td className="px-2 py-2 text-[12px]" onClick={() => handleSelectSR(sr)} style={{ color: "var(--app-muted)" }}>{sr.uploader || "—"}</td>
                        <td className="rounded-r-lg px-2 py-2 text-[13px] font-mono" onClick={() => handleSelectSR(sr)} style={{ color: "#2563eb" }}>{sr.tube_count || 0}</td>
                      </tr>)})}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {selectedAdminSR && (
              <div className="w-full lg:w-80 flex-shrink-0 rounded-xl p-4 space-y-3" style={{ background: "var(--app-panel-bg)", border: "1px solid var(--app-border)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: selectedAdminSR.group_color }} />
                    <span className="text-[15px] font-medium" style={{ color: "var(--app-text)" }}>{selectedAdminSR.patient_name}</span>
                  </div>
                  <button onClick={() => { setSelectedAdminSR(null); setEditingSR(false); }} className="text-[13px]" style={{ color: "var(--app-muted)" }}>✕</button>
                </div>
                {editingSR ? (
                  <div className="space-y-2">
                    {([
                      ["姓名", editSRName, setEditSRName],
                      ["编号", editSRCode, setEditSRCode],
                      ["类型", editSRType, setEditSRType],
                      ["来源", editSRSource, setEditSRSource],
                      ["阶段", editSRStage, setEditSRStage],
                    ] as const).map(([label, val, setter]) => (
                      <div key={label}>
                        <label className="text-[11px]" style={{ color: "var(--app-muted)" }}>{label}</label>
                        <input value={val} onChange={e => setter(e.target.value)} className="w-full rounded px-2 py-1.5 text-[16px] sm:text-[13px] outline-none mt-0.5 min-h-[44px]" style={inputStyle} />
                      </div>
                    ))}
                    <div>
                      <label className="text-[11px]" style={{ color: "var(--app-muted)" }}>采集日期</label>
                      <input type="date" value={editSRDate} onChange={e => setEditSRDate(e.target.value)} className="w-full rounded px-2 py-1.5 text-[16px] sm:text-[13px] outline-none mt-0.5 min-h-[44px]" style={inputStyle} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleSaveSR} disabled={busySRId === selectedAdminSR.id} className="flex-1 rounded py-1.5 text-[12px] min-h-[44px]" style={{ background: "#2563eb", color: "#fff" }}>保存</button>
                      <button onClick={() => setEditingSR(false)} className="flex-1 rounded py-1.5 text-[12px] min-h-[44px]" style={{ background: "var(--app-input-bg)", color: "var(--app-muted)" }}>取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-[13px]">
                    {[
                      ["编号", selectedAdminSR.sample_code],
                      ["类型", selectedAdminSR.sample_type || "—"],
                      ["来源", selectedAdminSR.source || "—"],
                      ["阶段", selectedAdminSR.collection_stage || "—"],
                      ["采集时间", selectedAdminSR.collected_at ? selectedAdminSR.collected_at.slice(0, 10) : "—"],
                      ["上传者", selectedAdminSR.uploader || "—"],
                      ["试管数", String(selectedAdminSR.tube_count || 0)],
                      ["标签", (selectedAdminSR.tags || []).join(", ") || "—"],
                      ["备注", selectedAdminSR.note || "—"],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between gap-2">
                        <span style={{ color: "var(--app-muted)" }}>{l}</span>
                        <span className="truncate max-w-[160px] text-right" title={v} style={{ color: "var(--app-text)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "var(--app-border)" }}>
                  <button onClick={handleStartEditSR} className="flex-1 rounded py-1.5 text-[12px] min-h-[44px]" style={{ background: "#2563eb", color: "#fff" }}>编辑</button>
                  <button onClick={handleDeleteSR} disabled={busySRId === selectedAdminSR.id} className="flex-1 rounded py-1.5 text-[12px] min-h-[44px]" style={{ background: "#ef4444", color: "#fff" }}>删除</button>
                </div>
              </div>
            )}
          </div>
        </section>




      </div>

      {editingSample && (
        <AddSampleModal
          isOpen
          targetCompartment={editingSample.compartment as Compartment}
          targetPosition={editingSample.position}
          onClose={handleEditClose}
          onAdd={() => {}}
          existingIds={samples.map((sample) => sample.id)}
          containers={[]}
          upperTemperature={editingSample.temperature}
          lowerTemperature={editingSample.temperature}
          currentUsername={currentUsername}
          isSubSampleMode={editingSample.kind === 'subsample'}
          parentContainerId={editingSample.parentId}
          editSample={editSampleData}
          editSubSample={editSubSampleData}
          onEditSample={handleUpdateSample}
          onEditSubSample={handleUpdateSubSample}
          sampleTypes={availableSampleTypes}
          onAddSampleType={handleSampleTypeCreate}
        />
      )}
    </main>
  );
}

function SampleDetailCard({
  sample,
  busy,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  sample: AdminSampleItem | null;
  busy: boolean;
  onEdit: (sample: AdminSampleItem) => void;
  onDelete: (sample: AdminSampleItem) => void;
  onStatusChange: (sample: AdminSampleItem, status: SampleStatus) => void;
}) {
  if (!sample) {
    return (
      <div
        className="rounded-xl p-6 text-center text-[13px]"
        style={{ background: 'var(--app-panel-bg)', border: '1px solid var(--app-border)', color: 'var(--app-muted)' }}
      >
        暂无样本详情
      </div>
    );
  }

  const statusColor = STATUS_COLORS[sample.status] || '#2563eb';
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--app-panel-bg)',
        border: '1px solid var(--app-border)',
        color: 'var(--app-text)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px]" style={{ color: statusColor }}>
            <Eye size={14} />
            {sample.kind === 'sample' ? '旧样本' : '旧副样本'}
          </div>
          <h4 className="mt-1 truncate text-[20px] font-semibold">{sample.name}</h4>
          <div className="mt-1 text-[13px] font-mono" style={{ color: 'var(--app-muted)' }}>
            {sample.id}
          </div>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: `${statusColor}18`, color: statusColor }}
        >
          <FlaskConical size={19} />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onEdit(sample)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] disabled:opacity-50"
          style={{ background: 'var(--app-info-soft-bg)', color: 'var(--app-info-soft-text)' }}
        >
          <Pencil size={14} />
          修改
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(sample)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] disabled:opacity-50"
          style={{ background: 'var(--app-danger-soft-bg)', color: 'var(--app-danger-soft-text)' }}
        >
          <Trash2 size={14} />
          删除
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <DetailChip label="状态" value={STATUS_LABELS[sample.status] || sample.status} color={statusColor} />
        <DetailChip label="类型" value={sample.type} />
        <DetailChip label="温度" value={`${sample.temperature}°C`} />
        <DetailChip label="采集日期" value={formatChineseShortDate(sample.collectedAt)} />
        <DetailChip label="患者编号" value={sample.patientId || '-'} />
        <DetailChip label="容量" value={sample.volume || '-'} />
        <DetailChip label="上传者" value={sample.uploader || '-'} />
        <DetailChip label="创建用户" value={sample.createdBy || 'legacy'} />
      </div>

      <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}>
        <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
          快速改状态
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABELS) as SampleStatus[]).map((status) => {
            const active = sample.status === status;
            const color = STATUS_COLORS[status] || '#2563eb';
            return (
              <button
                key={status}
                type="button"
                disabled={busy || active}
                onClick={() => onStatusChange(sample, status)}
                className="rounded-full px-3 py-1.5 text-[12px] disabled:opacity-50"
                style={{
                  background: active ? `${color}20` : 'var(--app-subtle-bg)',
                  border: `1px solid ${active ? color : 'var(--app-subtle-border)'}`,
                  color: active ? color : 'var(--app-subtle-text)',
                }}
              >
                {STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}>
        <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
          存放位置
        </div>
        <div className="mt-1 text-[14px]">
          {sample.refrigeratorName} · {formatLocation(sample)}
        </div>
        {sample.parentId && (
          <div className="mt-1 text-[12px]" style={{ color: 'var(--app-muted)' }}>
            父容器：{sample.parentId} · {sample.parentName}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}>
        <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
          标签
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {sample.tags.length > 0 ? (
            sample.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-1 text-[12px]"
                style={{
                  background: 'var(--app-info-bg)',
                  border: '1px solid var(--app-info-border)',
                  color: 'var(--app-info-text)',
                }}
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>
              无标签
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}>
        <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
          备注
        </div>
        <div className="mt-1 whitespace-pre-wrap text-[13px]" style={{ color: sample.note ? 'var(--app-text)' : 'var(--app-muted)' }}>
          {sample.note || '无备注'}
        </div>
      </div>
    </div>
  );
}

function DetailChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}>
      <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
        {label}
      </div>
      <div className="mt-1 truncate text-[13px]" style={{ color: color || 'var(--app-text)' }} title={value}>
        {value}
      </div>
    </div>
  );
}

function AdminMetric({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--app-panel-bg)', border: '1px solid var(--app-border)' }}>
      <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--app-muted)' }}>
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-[24px] font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function AdminMiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="rounded-lg px-2 py-2" style={{ background: 'var(--app-card-bg)', border: '1px solid var(--app-border)' }}>
      <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-medium" style={{ color: color || 'var(--app-text)' }}>{value}</div>
    </div>
  );
}

function DistributionRow({ label, count, total }: { label: string; count: number; total: number }) {
  const percent = Math.round((count / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
        <span style={{ color: 'var(--app-text)' }}>{label}</span>
        <span className="font-mono" style={{ color: 'var(--app-muted)' }}>
          {count}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--app-progress-track)' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(percent, 100)}%`, background: '#2563eb' }} />
      </div>
    </div>
  );
}

function DistributionPanel({
  title,
  items,
  total,
  emptyMessage,
}: {
  title: string;
  items: Array<{ key: string; label: string; count: number }>;
  total: number;
  emptyMessage: string;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: 'var(--app-panel-bg)', border: '1px solid var(--app-border)' }}
    >
      <div className="mb-3 text-[12px] font-medium" style={{ color: 'var(--app-muted)' }}>
        {title}
      </div>
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <DistributionRow
              key={item.key}
              label={item.label}
              count={item.count}
              total={total}
            />
          ))
        ) : (
          <DistributionEmpty message={emptyMessage} />
        )}
      </div>
    </div>
  );
}

function DistributionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[12px] font-medium" style={{ color: 'var(--app-muted)' }}>
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DistributionEmpty({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg px-3 py-5 text-center text-[13px]"
      style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)' }}
    >
      {message}
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('zh-CN');
}

function formatLocation(sample: AdminSampleItem) {
  const compartment = sample.compartment === 'upper' ? '上层' : '下层';
  if (sample.kind === 'subsample') return `${compartment} · 子格 ${sample.position + 1}`;
  return `${compartment} · 格位 ${sample.position + 1}`;
}

function toEditableSample(item: AdminSampleItem): Sample {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    status: item.status as SampleStatus,
    temperature: item.temperature,
    collectedAt: item.collectedAt,
    patientId: item.patientId,
    uploader: item.uploader,
    createdBy: item.createdBy,
    tags: item.tags,
    compartment: item.compartment,
    position: item.position,
    note: item.note || undefined,
    volume: item.volume || undefined,
    gridRows: 2,
    gridCols: 2,
    subSamples: [],
  };
}

function toEditableSubSample(item: AdminSampleItem): SubSample {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    status: item.status as SampleStatus,
    temperature: item.temperature,
    collectedAt: item.collectedAt,
    patientId: item.patientId,
    uploader: item.uploader,
    createdBy: item.createdBy,
    tags: item.tags,
    position: item.position,
    note: item.note || undefined,
    volume: item.volume || undefined,
  };
}
