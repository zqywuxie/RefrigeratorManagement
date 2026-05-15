import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Database,
  Eye,
  FlaskConical,
  KeyRound,
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
  fetchSampleTypes,
  updateAdminUser,
  updateSample,
  updateSubSample,
  updateBox,
  deleteBox,
} from '../api';
import { AddSampleModal } from './AddSampleModal';
import { Compartment, Sample, SampleStatus, SubSample, SampleRecord, formatChineseShortDate } from '../types';

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
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [editBoxName, setEditBoxName] = useState('');
  const [editBoxOwner, setEditBoxOwner] = useState('');
  const [editBoxNote, setEditBoxNote] = useState('');
  const [busyBoxId, setBusyBoxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, userData, sampleData, sampleTypeData, boxData, srData] = await Promise.all([
        fetchAdminSummary(),
        fetchAdminUsers(),
        fetchAdminSamples(),
        fetchSampleTypes().catch(() => []),
        fetchAdminBoxes().catch(() => []),
        fetchAdminSampleRecords().catch(() => []),
      ]);
      setSummary(summaryData);
      setUsers(userData);
      setSamples(sampleData);
      setAdminBoxes(boxData);
      setAdminSampleRecords(srData);
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
      onNotify(`副样本 ${editingSample.id} 已更新`, 'success');
    } catch (err: any) {
      onNotify(err.message || '更新副样本失败', 'error');
    } finally {
      setBusySampleId(null);
    }
  }, [editingSample, loadAdminData, onNotify]);

  const handleDeleteSelectedSample = useCallback(async (sample: AdminSampleItem) => {
    const label = sample.kind === 'sample' ? '样本' : '副样本';
    if (!window.confirm(`删除${label} ${sample.id}？`)) return;
    try {
      setBusySampleId(sample.id);
      if (sample.kind === 'sample') {
        await deleteSample(sample.refrigeratorId, sample.id);
      } else if (sample.parentId) {
        await deleteSubSample(sample.parentId, sample.id);
      } else {
        throw new Error('缺少父容器信息，无法删除副样本');
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
        throw new Error('缺少父容器信息，无法更新副样本状态');
      }
      await loadAdminData();
      setSelectedSampleId(sample.id);
      onNotify(`${sample.kind === 'sample' ? '样本' : '副样本'} ${sample.id} 状态已更新`, 'success');
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

  const totalSamplesText = summary
    ? `${summary.totals.samples} / ${summary.totals.totalCapacity}`
    : '--';

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
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
                用户、冰箱容量和样本异常的统一视图
              </div>
            </div>
            <button
              type="button"
              onClick={loadAdminData}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px]"
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

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <AdminMetric icon={<Snowflake size={18} />} label="冰箱" value={summary?.totals.refrigerators ?? '--'} color="#2563eb" />
            <AdminMetric icon={<Database size={18} />} label="样本容量" value={totalSamplesText} color="#0f766e" />
            <AdminMetric icon={<Users size={18} />} label="用户" value={users.length || '--'} color="#7c3aed" />
            <AdminMetric icon={<AlertTriangle size={18} />} label="异常" value={summary?.totals.abnormal ?? '--'} color="#dc2626" />
            <AdminMetric icon={<Shield size={18} />} label="使用率" value={summary ? `${summary.totals.usageRate}%` : '--'} color="#ca8a04" />
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
                          className="rounded-md px-2 py-1.5 text-[13px] outline-none"
                          style={inputStyle}
                        >
                          <option value="user">普通用户</option>
                          <option value="root">管理员 root</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-[13px]" style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)' }}>
                        样本 {user.sampleCount} · 副样本 {user.subSampleCount}
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
                            className="w-28 rounded-md px-2 py-1.5 text-[13px] outline-none"
                            style={inputStyle}
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleResetPassword(user)}
                            className="rounded-md p-2"
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
                          className="rounded-md p-2 disabled:opacity-35"
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

        <div className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
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
              <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="用户名"
                className="w-full rounded-lg px-3 py-2 text-[14px] outline-none"
                style={inputStyle}
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="密码"
                className="w-full rounded-lg px-3 py-2 text-[14px] outline-none"
                style={inputStyle}
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AuthUser['role'])}
                className="w-full rounded-lg px-3 py-2 text-[14px] outline-none"
                style={inputStyle}
              >
                <option value="user">普通用户</option>
                <option value="root">管理员 root</option>
              </select>
              <button
                type="submit"
                disabled={busyUser === '__new__'}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[14px]"
                style={{ background: '#2563eb', color: '#ffffff' }}
              >
                <Plus size={16} />
                {busyUser === '__new__' ? '创建中...' : '创建'}
              </button>
            </div>
          </form>

          <section
            className="rounded-xl p-4"
            style={{
              background: 'var(--app-card-bg)',
              border: '1px solid var(--app-border)',
              boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
            }}
          >
            <div className="mb-4">
              <h3 className="text-[17px] font-semibold" style={{ color: 'var(--app-text)' }}>
                全局分布
              </h3>
              <div className="mt-1 text-[12px]" style={{ color: 'var(--app-muted)' }}>
                状态与类别的总体视图
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <DistributionPanel
                title="状态分布"
                items={(summary?.statusCounts || []).map((item) => ({
                  key: item.status,
                  label: STATUS_LABELS[item.status] || item.status,
                  count: item.count,
                }))}
                total={Math.max(summary?.totals.totalItems || 0, 1)}
                emptyMessage="暂无样本状态数据"
              />
              <DistributionPanel
                title="样本类别"
                items={(summary?.typeCounts || []).map((item) => ({
                  key: item.type,
                  label: item.type,
                  count: item.count,
                }))}
                total={Math.max(summary?.totals.totalItems || 0, 1)}
                emptyMessage="暂无样本类别数据"
              />
            </div>
          </section>
        </div>

        <section
          className="rounded-xl p-4"
          style={{
            background: 'var(--app-card-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
          }}
        >
          <h3 className="mb-3 text-[17px] font-semibold" style={{ color: 'var(--app-text)' }}>
            冰箱概览
          </h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summary?.refrigerators.map((fridge) => {
              const usage = fridge.capacity > 0 ? Math.round((fridge.sampleCount / fridge.capacity) * 100) : 0;
              return (
                <div key={fridge.id} className="rounded-lg p-3" style={{ background: 'var(--app-panel-bg)', border: '1px solid var(--app-border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium" style={{ color: 'var(--app-text)' }}>
                        {fridge.name}
                      </div>
                      <div className="mt-1 text-[12px]" style={{ color: 'var(--app-muted)' }}>
                        {fridge.id}
                      </div>
                    </div>
                    <span className="text-[13px] font-mono" style={{ color: '#2563eb' }}>
                      {usage}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--app-progress-track)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(usage, 100)}%`, background: '#2563eb' }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]" style={{ color: 'var(--app-muted)' }}>
                    <span>样本 {fridge.sampleCount}/{fridge.capacity}</span>
                    <span>副样本 {fridge.subSampleCount}</span>
                    <span>异常 {fridge.criticalCount + fridge.warningCount}</span>
                  </div>
                </div>
              );
            })}
            {summary && summary.refrigerators.length === 0 && (
              <div className="rounded-lg px-3 py-8 text-center text-[13px]" style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)' }}>
                暂无冰箱
              </div>
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
                            className="w-full rounded px-2 py-1 text-[13px] outline-none"
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
                            className="w-full rounded px-2 py-1 text-[12px] outline-none"
                            style={{ background: 'var(--app-input-bg)', border: '1px solid var(--app-input-border)', color: 'var(--app-text)' }} />
                        ) : (box.owner || '—')}
                      </td>
                      <td className="rounded-r-lg px-2 py-2 text-right" style={rowBg}>
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleSaveBox(box.id)} disabled={busy}
                              className="text-[11px] px-2 py-1 rounded" style={{ background: '#2563eb', color: '#fff' }}>
                              {busy ? '...' : '保存'}
                            </button>
                            <button onClick={handleCancelEditBox}
                              className="text-[11px] px-2 py-1 rounded" style={{ background: 'var(--app-input-bg)', color: 'var(--app-muted)' }}>
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleStartEditBox(box)}
                              className="text-[11px] px-2 py-1 rounded hover:opacity-80" style={{ color: '#2563eb' }}>
                              编辑
                            </button>
                            <button onClick={() => handleDeleteBox(box)} disabled={busy}
                              className="text-[11px] px-2 py-1 rounded hover:opacity-80" style={{ color: '#ef4444' }}>
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

        <section
          className="rounded-xl p-4"
          style={{
            background: 'var(--app-card-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[17px] font-semibold" style={{ color: 'var(--app-text)' }}>
                样本详情
              </h3>
              <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                全部冰箱 · {filteredSamples.length}/{samples.length} 条
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <select
                value={sampleTypeFilter}
                onChange={(e) => setSampleTypeFilter(e.target.value)}
                className="rounded-lg px-3 py-2 text-[13px] outline-none sm:w-44"
                style={inputStyle}
              >
                <option value="__all__">全部类别</option>
                {availableSampleTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                value={sampleQuery}
                onChange={(e) => setSampleQuery(e.target.value)}
                placeholder="搜索样本、患者、上传者、标签..."
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none sm:w-80"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(320px,0.92fr)_minmax(420px,1.08fr)]">
            <div
              className="order-2 rounded-xl p-2 xl:order-1"
              style={{ background: 'var(--app-panel-bg)', border: '1px solid var(--app-border)' }}
            >
              <div className="mb-2 flex items-center justify-between px-2 pt-2">
                <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                  样本列表
                </div>
                <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                  已筛选 {filteredSamples.length} 条
                </div>
              </div>
              <div className="max-h-[620px] overflow-y-auto pr-1 xl:max-h-[calc(100vh-250px)]">
                <div className="space-y-2">
                  {filteredSamples.map((sample) => {
                    const selected = selectedSample?.id === sample.id;
                    const statusColor = STATUS_COLORS[sample.status] || '#2563eb';
                    const busy = busySampleId === sample.id;
                    return (
                      <div
                        key={`${sample.kind}-${sample.id}`}
                        className="rounded-lg p-2 transition-all"
                        style={{
                          background: selected ? 'var(--app-selected-bg)' : 'var(--app-card-bg)',
                          border: selected ? '1px solid var(--app-selected-border)' : '1px solid var(--app-border)',
                          color: 'var(--app-text)',
                          boxShadow: selected ? '0 10px 28px rgba(37,99,235,0.12)' : 'none',
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedSampleId(sample.id)}
                            className="min-w-0 flex-1 rounded-md p-1 text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ background: statusColor }}
                                  />
                                  <span className="truncate text-[14px] font-medium">
                                    {sample.id} · {sample.name}
                                  </span>
                                </div>
                                <div className="mt-1 truncate text-[12px]" style={{ color: 'var(--app-muted)' }}>
                                  {sample.refrigeratorName} · {formatLocation(sample)} · {sample.type}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span
                                  className="rounded-full px-2 py-0.5 text-[11px]"
                                  style={{ background: `${statusColor}18`, color: statusColor }}
                                >
                                  {STATUS_LABELS[sample.status] || sample.status}
                                </span>
                                <span className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                                  {sample.kind === 'sample' ? `副样本 ${sample.subSampleCount}` : '副样本'}
                                </span>
                              </div>
                            </div>
                          </button>
                          <div className="flex flex-col gap-1 pt-1">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleEditOpen(sample)}
                              className="rounded-md p-2 disabled:opacity-50"
                              style={{ background: 'var(--app-info-soft-bg)', color: 'var(--app-info-soft-text)' }}
                              title="编辑样本"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDeleteSelectedSample(sample)}
                              className="rounded-md p-2 disabled:opacity-50"
                              style={{ background: 'var(--app-danger-soft-bg)', color: 'var(--app-danger-soft-text)' }}
                              title="删除样本"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!loading && filteredSamples.length === 0 && (
                    <div
                      className="rounded-lg px-3 py-8 text-center text-[13px]"
                      style={{ background: 'var(--app-card-bg)', color: 'var(--app-muted)' }}
                    >
                      暂无匹配样本
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              className="order-1 rounded-xl p-2 xl:order-2 xl:sticky xl:top-4"
              style={{ background: 'var(--app-panel-bg)', border: '1px solid var(--app-border)' }}
            >
              <div className="mb-2 flex items-center justify-between px-2 pt-2">
                <div className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                  当前详情
                </div>
                <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                  当前选中样本
                </div>
              </div>
              <div className="max-h-[620px] overflow-y-auto pr-1 xl:max-h-[calc(100vh-250px)]">
                <SampleDetailCard
                  sample={selectedSample}
                  busy={busySampleId === selectedSample?.id}
                  onEdit={handleEditOpen}
                  onDelete={handleDeleteSelectedSample}
                  onStatusChange={handleSampleStatusChange}
                />
              </div>
            </div>
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
            {sample.kind === 'sample' ? '主样本' : '副样本'}
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
