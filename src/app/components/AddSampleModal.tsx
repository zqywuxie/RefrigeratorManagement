import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FlaskConical, Plus } from 'lucide-react';
import {
  Sample,
  SubSample,
  SampleStatus,
  SampleType,
  Compartment,
  STATUS_CONFIG,
} from '../types';

interface AddSampleModalProps {
  isOpen: boolean;
  targetCompartment: Compartment | null;
  targetPosition: number | null;
  onClose: () => void;
  onAdd: (sample: Sample) => void;
  onAddSubSample?: (containerId: string, subSample: SubSample) => void;
  existingIds: string[];
  containers: Sample[];
  isSubSampleMode?: boolean;
  parentContainerId?: string;
  parentContainer?: Sample;
  editSample?: Sample | null;
  editSubSample?: SubSample | null;
  onEditSample?: (sample: Sample) => void;
  onEditSubSample?: (containerId: string, subSample: SubSample) => void;
  sampleTypes: string[];
  onAddSampleType: (name: string) => void;
}

const DEFAULT_FORM = {
  type: '血清' as SampleType,
  status: 'normal' as SampleStatus,
  name: '',
  patientId: '',
  volume: '',
  note: '',
  tags: '',
  collectedAt: new Date().toISOString().split('T')[0],
};

export function AddSampleModal({
  isOpen,
  targetCompartment,
  targetPosition,
  onClose,
  onAdd,
  onAddSubSample,
  existingIds,
  containers,
  isSubSampleMode = false,
  parentContainerId,
  parentContainer,
  editSample,
  editSubSample,
  onEditSample,
  onEditSubSample,
  sampleTypes,
  onAddSampleType,
}: AddSampleModalProps) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const isEdit = !!(editSample || editSubSample);
  const editData = editSample || editSubSample;

  useEffect(() => {
    if (!isOpen) return;
    setShowNewType(false);
    if (editSample) {
      setForm({
        type: editSample.type,
        status: editSample.status,
        name: editSample.name,
        patientId: editSample.patientId,
        volume: editSample.volume || '',
        note: editSample.note || '',
        tags: editSample.tags.join(', '),
        collectedAt: editSample.collectedAt || new Date().toISOString().split('T')[0],
      });
    } else if (editSubSample) {
      setForm({
        type: editSubSample.type,
        status: editSubSample.status,
        name: editSubSample.name,
        patientId: editSubSample.patientId,
        volume: editSubSample.volume || '',
        note: editSubSample.note || '',
        tags: editSubSample.tags.join(', '),
        collectedAt: editSubSample.collectedAt || new Date().toISOString().split('T')[0],
      });
    } else {
      setForm({ ...DEFAULT_FORM, name: '' });
    }
  }, [isOpen, editSample, editSubSample]);

  const generateId = () => {
    let num = existingIds.length + 1;
    while (existingIds.includes(`S-${String(num).padStart(3, '0')}`)) num++;
    return `S-${String(num).padStart(3, '0')}`;
  };

  const generateSubSampleId = () => {
    const allSubIds = new Set<string>();
    for (const c of containers) {
      for (const ss of c.subSamples) {
        allSubIds.add(ss.id);
      }
    }
    let num = allSubIds.size + 1;
    while (allSubIds.has(`SS-${String(num).padStart(3, '0')}`)) num++;
    return `SS-${String(num).padStart(3, '0')}`;
  };

  const parseTags = () =>
    form.tags
      ? form.tags
          .split(/[,，\s]+/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Edit sample
    if (editSample && onEditSample) {
      const updated: Sample = {
        ...editSample,
        name: form.name || editSample.name,
        type: form.type,
        status: form.status,
        patientId: form.patientId || editSample.patientId,
        collectedAt: form.collectedAt,
        tags: parseTags(),
        volume: form.volume || undefined,
        note: form.note || undefined,
      };
      onEditSample(updated);
      onClose();
      return;
    }

    // Edit sub-sample
    if (editSubSample && parentContainerId && onEditSubSample) {
      const updated: SubSample = {
        ...editSubSample,
        name: form.name || editSubSample.name,
        type: form.type,
        status: form.status,
        patientId: form.patientId || editSubSample.patientId,
        collectedAt: form.collectedAt,
        tags: parseTags(),
        volume: form.volume || undefined,
        note: form.note || undefined,
      };
      onEditSubSample(parentContainerId, updated);
      onClose();
      return;
    }

    // Create sub-sample
    if (isSubSampleMode && parentContainerId && onAddSubSample) {
      const newId = generateSubSampleId();
      const newSub: SubSample = {
        id: newId,
        name: form.name || `${form.type}副样本 ${newId.slice(3)}`,
        type: form.type,
        status: form.status,
        temperature:
          parentContainer?.temperature ??
          (targetCompartment === 'upper' ? -20 : 4),
        collectedAt: form.collectedAt,
        patientId: form.patientId || `P-${Date.now().toString().slice(-6)}`,
        tags: parseTags(),
        position: targetPosition ?? 0,
        volume: form.volume || undefined,
        note: form.note || undefined,
      };
      onAddSubSample(parentContainerId, newSub);
    } else if (!isEdit) {
      // Create sample
      const newId = generateId();
      const newSample: Sample = {
        id: newId,
        name: form.name || `${form.type}样本 ${newId.slice(2)}`,
        type: form.type,
        status: form.status,
        temperature: targetCompartment === 'upper' ? -20 : 4,
        collectedAt: form.collectedAt,
        patientId: form.patientId || `P-${Date.now().toString().slice(-6)}`,
        tags: parseTags(),
        compartment: targetCompartment || 'upper',
        position: targetPosition ?? 0,
        volume: form.volume || undefined,
        note: form.note || undefined,
        gridRows: 2,
        gridCols: 2,
        subSamples: [],
      };
      onAdd(newSample);
    }
    onClose();
  };

  const tempValue =
    isSubSampleMode && parentContainer
      ? parentContainer.temperature
      : targetCompartment === 'upper'
        ? -20
        : 4;

  const accentColor = isSubSampleMode || editSubSample ? '#a78bfa' : '#60a5fa';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="rounded-2xl overflow-hidden w-full max-w-md flex flex-col"
              style={{
                maxHeight: '90vh',
                background: 'rgba(8,15,30,0.98)',
                border: isEdit
                  ? `1.5px solid ${accentColor}40`
                  : isSubSampleMode
                    ? '1.5px solid rgba(167,139,250,0.3)'
                    : '1.5px solid rgba(59,130,246,0.3)',
                boxShadow: '0 0 10px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.8)',
                pointerEvents: 'all',
              }}
            >
              {/* Modal header */}
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{
                  background: isEdit
                    ? `linear-gradient(135deg, ${accentColor}30, rgba(8,15,30,0.6))`
                    : isSubSampleMode
                      ? 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(8,15,30,0.6))'
                      : 'linear-gradient(135deg, rgba(29,78,216,0.4), rgba(8,15,30,0.6))',
                  borderBottom: isEdit
                    ? `1px solid ${accentColor}20`
                    : isSubSampleMode
                      ? '1px solid rgba(167,139,250,0.2)'
                      : '1px solid rgba(59,130,246,0.2)',
                }}
              >
                <div className="flex items-center gap-2">
                  <FlaskConical size={24} color={accentColor} />
                  <div>
                    <div className="text-[20px]" style={{ color: accentColor }}>
                      {isEdit
                        ? editSample
                          ? '编辑样本'
                          : '编辑副样本'
                        : isSubSampleMode
                          ? '添加副样本'
                          : '添加新样本'}
                    </div>
                    <div className="text-[14px]" style={{ color: '#475569' }}>
                      {isEdit
                        ? `${editData!.id}`
                        : isSubSampleMode && parentContainer
                          ? `${parentContainer.id} 容器内 · 格位 ${targetPosition != null ? targetPosition + 1 : '—'}`
                          : `${targetCompartment === 'upper' ? '冷冻层' : '冷藏层'} · 格位 ${targetPosition != null ? targetPosition + 1 : '—'}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X size={20} color="#64748b" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
                {/* Name (only for edit mode) */}
                {isEdit && (
                  <div>
                    <label className="block text-[14px] mb-1" style={{ color: '#64748b' }}>
                      名称
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded text-[16px] outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8',
                      }}
                    />
                  </div>
                )}

                {/* Type + Status row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block text-[14px] mb-1"
                      style={{ color: '#64748b' }}
                    >
                      样本类型
                    </label>
                    {showNewType ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          placeholder="新类型名称"
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          autoFocus
                          className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                          }}
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (newTypeName.trim()) {
                                onAddSampleType(newTypeName.trim());
                                setForm((f) => ({ ...f, type: newTypeName.trim() }));
                                setNewTypeName('');
                                setShowNewType(false);
                              }
                            }}
                            className="flex-1 py-1 rounded text-[12px]"
                            style={{
                              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                              color: '#bfdbfe',
                            }}
                          >
                            添加
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNewType(false)}
                            className="flex-1 py-1 rounded text-[12px]"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              color: '#64748b',
                            }}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <select
                          value={form.type}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              type: e.target.value as SampleType,
                            }))
                          }
                          className="flex-1 px-3 py-2 rounded text-[16px] outline-none"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#93c5fd',
                          }}
                        >
                          {sampleTypes.map((t) => (
                            <option key={t} value={t} style={{ background: '#0f172a' }}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowNewType(true)}
                          className="px-2 py-2 rounded text-[14px] flex items-center justify-center"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#64748b',
                          }}
                          title="添加新类型"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label
                      className="block text-[14px] mb-1"
                      style={{ color: '#64748b' }}
                    >
                      状态
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          status: e.target.value as SampleStatus,
                        }))
                      }
                      className="w-full px-3 py-2 rounded text-[16px] outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: STATUS_CONFIG[form.status].color,
                      }}
                    >
                      {(Object.keys(STATUS_CONFIG) as SampleStatus[]).map((s) => (
                        <option key={s} value={s} style={{ background: '#0f172a' }}>
                          {STATUS_CONFIG[s].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Temperature (read-only for non-edit) */}
                {!isEdit && (
                  <div>
                    <label
                      className="block text-[14px] mb-1"
                      style={{ color: '#64748b' }}
                    >
                      {isSubSampleMode ? '存储温度（继承自容器）' : '存储温度'}
                    </label>
                    <input
                      type="text"
                      value={`${tempValue}°C`}
                      readOnly
                      className="w-full px-3 py-2 rounded text-[16px] outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: '#64748b',
                      }}
                    />
                  </div>
                )}

                {/* Collected date */}
                <div>
                  <label
                    className="block text-[14px] mb-1"
                    style={{ color: '#64748b' }}
                  >
                    采集日期
                  </label>
                  <input
                    type="date"
                    value={form.collectedAt}
                    onChange={(e) => setForm((f) => ({ ...f, collectedAt: e.target.value }))}
                    className="w-full px-3 py-2 rounded text-[16px] outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8',
                    }}
                  />
                </div>

                {/* Patient ID */}
                <div>
                  <label
                    className="block text-[14px] mb-1"
                    style={{ color: '#64748b' }}
                  >
                    患者编号（选填）
                  </label>
                  <input
                    type="text"
                    placeholder="例：P-2024-001"
                    value={form.patientId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, patientId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded text-[16px] outline-none placeholder:text-slate-600"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8',
                    }}
                  />
                </div>

                {/* Volume + Tags row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block text-[14px] mb-1"
                      style={{ color: '#64748b' }}
                    >
                      样本量（选填）
                    </label>
                    <input
                      type="text"
                      placeholder="例：5ml"
                      value={form.volume}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, volume: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded text-[16px] outline-none placeholder:text-slate-600"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[14px] mb-1"
                      style={{ color: '#64748b' }}
                    >
                      标签（逗号分隔）
                    </label>
                    <input
                      type="text"
                      placeholder="紧急, A型"
                      value={form.tags}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tags: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded text-[16px] outline-none placeholder:text-slate-600"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8',
                      }}
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label
                    className="block text-[14px] mb-1"
                    style={{ color: '#64748b' }}
                  >
                    备注（选填）
                  </label>
                  <textarea
                    rows={2}
                    placeholder="输入备注信息..."
                    value={form.note}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, note: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded text-[16px] outline-none resize-none"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8',
                    }}
                  />
                </div>

                {/* Status preview */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded"
                  style={{
                    background: STATUS_CONFIG[form.status].bgColor,
                    border: `1px solid ${STATUS_CONFIG[form.status].borderColor}50`,
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: STATUS_CONFIG[form.status].borderColor,
                    }}
                  />
                  <span
                    className="text-[14px]"
                    style={{ color: STATUS_CONFIG[form.status].color }}
                  >
                    {isEdit
                      ? `保存后状态更新为「${STATUS_CONFIG[form.status].label}」`
                      : isSubSampleMode
                        ? `将创建为「${STATUS_CONFIG[form.status].label}」状态副样本，存入容器 ${parentContainer?.id ?? '—'} 格位 ${targetPosition != null ? targetPosition + 1 : '—'}`
                        : `将创建为「${STATUS_CONFIG[form.status].label}」状态样本，存入 ${targetCompartment === 'upper' ? '冷冻层' : '冷藏层'} 格位 ${targetPosition != null ? targetPosition + 1 : '—'}`}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded text-[16px] transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#64748b',
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded text-[16px] transition-all hover:brightness-110"
                    style={{
                      background: isEdit
                        ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
                        : isSubSampleMode
                          ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
                          : 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                      border: isEdit
                        ? `1px solid ${accentColor}`
                        : isSubSampleMode
                          ? '1px solid #8b5cf6'
                          : '1px solid #3b82f6',
                      color: '#bfdbfe',
                      boxShadow: '0 0 4px rgba(59,130,246,0.15)',
                    }}
                  >
                    {isEdit
                      ? '保存修改'
                      : isSubSampleMode
                        ? '添加副样本'
                        : '确认添加'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
