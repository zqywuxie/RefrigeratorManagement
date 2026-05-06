import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FlaskConical } from 'lucide-react';
import {
  Sample,
  SubSample,
  SampleStatus,
  SampleType,
  Compartment,
  STATUS_CONFIG,
  SAMPLE_TYPES,
} from '../types';

interface AddSampleModalProps {
  isOpen: boolean;
  targetCompartment: Compartment | null;
  targetPosition: number | null;
  onClose: () => void;
  onAdd: (sample: Sample) => void;
  onAddSubSample?: (subSample: SubSample, containerId: string) => void;
  existingIds: string[];
  containers: Sample[];
  isSubSampleMode?: boolean;
  parentContainerId?: string;
  parentContainer?: Sample;
}

const DEFAULT_FORM = {
  type: '血清' as SampleType,
  status: 'normal' as SampleStatus,
  patientId: '',
  volume: '',
  note: '',
  tags: '',
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
}: AddSampleModalProps) {
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (isOpen) setForm(DEFAULT_FORM);
  }, [isOpen]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubSampleMode && parentContainerId && onAddSubSample) {
      const newId = generateSubSampleId();
      const newSub: SubSample = {
        id: newId,
        name: `${form.type}副样本 ${newId.slice(3)}`,
        type: form.type,
        status: form.status,
        temperature:
          parentContainer?.temperature ??
          (targetCompartment === 'upper' ? -20 : 4),
        collectedAt: new Date().toISOString().split('T')[0],
        patientId: form.patientId || `P-${Date.now().toString().slice(-6)}`,
        tags: form.tags
          ? form.tags
              .split(/[,，\s]+/)
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        position: targetPosition ?? 0,
        volume: form.volume || undefined,
        note: form.note || undefined,
      };
      onAddSubSample(newSub, parentContainerId);
    } else {
      const newId = generateId();
      const newSample: Sample = {
        id: newId,
        name: `${form.type}样本 ${newId.slice(2)}`,
        type: form.type,
        status: form.status,
        temperature: targetCompartment === 'upper' ? -20 : 4,
        collectedAt: new Date().toISOString().split('T')[0],
        patientId: form.patientId || `P-${Date.now().toString().slice(-6)}`,
        tags: form.tags
          ? form.tags
              .split(/[,，\s]+/)
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
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
              className="rounded-2xl overflow-hidden w-full max-w-md"
              style={{
                background: 'rgba(8,15,30,0.98)',
                border: isSubSampleMode
                  ? '1.5px solid rgba(167,139,250,0.3)'
                  : '1.5px solid rgba(59,130,246,0.3)',
                boxShadow: isSubSampleMode
                  ? '0 0 40px rgba(167,139,250,0.2), 0 20px 60px rgba(0,0,0,0.8)'
                  : '0 0 40px rgba(59,130,246,0.2), 0 20px 60px rgba(0,0,0,0.8)',
                pointerEvents: 'all',
              }}
            >
              {/* Modal header */}
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{
                  background: isSubSampleMode
                    ? 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(8,15,30,0.6))'
                    : 'linear-gradient(135deg, rgba(29,78,216,0.4), rgba(8,15,30,0.6))',
                  borderBottom: isSubSampleMode
                    ? '1px solid rgba(167,139,250,0.2)'
                    : '1px solid rgba(59,130,246,0.2)',
                }}
              >
                <div className="flex items-center gap-2">
                  <FlaskConical
                    size={24}
                    color={isSubSampleMode ? '#a78bfa' : '#60a5fa'}
                  />
                  <div>
                    <div
                      className="text-[20px]"
                      style={{ color: isSubSampleMode ? '#c4b5fd' : '#93c5fd' }}
                    >
                      {isSubSampleMode ? '添加副样本' : '添加新样本'}
                    </div>
                    <div className="text-[14px]" style={{ color: '#475569' }}>
                      {isSubSampleMode && parentContainer
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
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                {/* Type + Status row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block text-[14px] mb-1"
                      style={{ color: '#64748b' }}
                    >
                      样本类型
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          type: e.target.value as SampleType,
                        }))
                      }
                      className="w-full px-3 py-2 rounded text-[16px] outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#93c5fd',
                      }}
                    >
                      {SAMPLE_TYPES.map((t) => (
                        <option key={t} value={t} style={{ background: '#0f172a' }}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="block text-[14px] mb-1"
                      style={{ color: '#64748b' }}
                    >
                      初始状态
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

                {/* Temperature (read-only for sub-samples) */}
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
                    placeholder="输入样本备注信息..."
                    value={form.note}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, note: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded text-[16px] outline-none resize-none placeholder:text-slate-600"
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
                    {isSubSampleMode
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
                      background: isSubSampleMode
                        ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
                        : 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                      border: isSubSampleMode
                        ? '1px solid #8b5cf6'
                        : '1px solid #3b82f6',
                      color: '#bfdbfe',
                      boxShadow: isSubSampleMode
                        ? '0 0 14px rgba(139,92,246,0.3)'
                        : '0 0 14px rgba(59,130,246,0.3)',
                    }}
                  >
                    {isSubSampleMode ? '添加副样本' : '确认添加'}
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
