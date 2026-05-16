import React, { useState, useEffect } from 'react';
import { FlaskConical, Plus } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from './ui/responsive-dialog';
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
  upperTemperature: number;
  lowerTemperature: number;
  currentUsername: string;
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
  uploader: '',
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
  upperTemperature,
  lowerTemperature,
  currentUsername,
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
        uploader: editSample.uploader || '',
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
        uploader: editSubSample.uploader || '',
        volume: editSubSample.volume || '',
        note: editSubSample.note || '',
        tags: editSubSample.tags.join(', '),
        collectedAt: editSubSample.collectedAt || new Date().toISOString().split('T')[0],
      });
    } else {
      setForm({ ...DEFAULT_FORM, name: '', uploader: currentUsername });
    }
  }, [isOpen, editSample, editSubSample, currentUsername]);

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
        uploader: form.uploader || editSample.uploader,
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
        uploader: form.uploader || editSubSample.uploader,
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
          (targetCompartment === 'upper' ? upperTemperature : lowerTemperature),
        collectedAt: form.collectedAt,
        patientId: form.patientId || `P-${Date.now().toString().slice(-6)}`,
        uploader: form.uploader || '未记录',
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
        temperature: targetCompartment === 'upper' ? upperTemperature : lowerTemperature,
        collectedAt: form.collectedAt,
        patientId: form.patientId || `P-${Date.now().toString().slice(-6)}`,
        uploader: form.uploader || '未记录',
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
        ? upperTemperature
        : lowerTemperature;

  const accentColor = isSubSampleMode || editSubSample ? '#a78bfa' : '#60a5fa';
  const fieldStyle: React.CSSProperties = {
    background: 'var(--app-input-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-text)',
  };
  const mutedFieldStyle: React.CSSProperties = {
    background: 'var(--app-input-muted-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-subtle-text)',
  };
  const labelStyle: React.CSSProperties = { color: 'var(--app-subtle-text)' };
  const optionStyle: React.CSSProperties = { background: 'var(--app-card-bg)', color: 'var(--app-text)' };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <div className="flex items-center gap-2">
              <FlaskConical size={24} color={accentColor} />
              <span style={{ color: accentColor }}>
                {isEdit
                  ? editSample
                    ? '编辑样本'
                    : '编辑副样本'
                  : isSubSampleMode
                    ? '添加副样本'
                    : '添加新样本'}
              </span>
            </div>
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {isEdit
              ? `${editData!.id}`
              : isSubSampleMode && parentContainer
                ? `${parentContainer.id} 容器内 · 格位 ${targetPosition != null ? targetPosition + 1 : '—'}`
                : `${targetCompartment === 'upper' ? '上层' : '下层'} · 格位 ${targetPosition != null ? targetPosition + 1 : '—'}`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
                {/* Name (only for edit mode) */}
                {isEdit && (
                  <div>
                    <label className="block text-[14px] mb-1" style={labelStyle}>
                      名称
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded text-[16px] sm:text-[14px] min-h-[44px] outline-none"
                      style={fieldStyle}
                    />
                  </div>
                )}

                {/* Type + Status row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block text-[14px] mb-1"
                      style={labelStyle}
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
                          className="w-full px-2 py-1.5 rounded text-[16px] sm:text-[14px] outline-none min-h-[44px]"
                          style={fieldStyle}
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
                            className="flex-1 py-1 rounded text-[12px] min-h-[44px]"
                            style={{
                              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                              color: '#ffffff',
                            }}
                          >
                            添加
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNewType(false)}
                            className="flex-1 py-1 rounded text-[12px] min-h-[44px]"
                            style={{
                              background: 'var(--app-subtle-bg)',
                              border: '1px solid var(--app-subtle-border)',
                              color: 'var(--app-subtle-text)',
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
                          className="flex-1 px-3 py-2 rounded text-[16px] sm:text-[14px] min-h-[44px] outline-none"
                          style={fieldStyle}
                        >
                          {sampleTypes.map((t) => (
                            <option key={t} value={t} style={optionStyle}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowNewType(true)}
                          className="px-2 py-2 rounded text-[14px] flex items-center justify-center min-h-[44px]"
                          style={{
                            background: 'var(--app-input-bg)',
                            border: '1px solid var(--app-input-border)',
                            color: 'var(--app-subtle-text)',
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
                      style={labelStyle}
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
                      className="w-full px-3 py-2 rounded text-[16px] sm:text-[14px] min-h-[44px] outline-none"
                      style={{
                        background: 'var(--app-input-bg)',
                        border: '1px solid var(--app-input-border)',
                        color: STATUS_CONFIG[form.status].color,
                      }}
                    >
                      {(Object.keys(STATUS_CONFIG) as SampleStatus[]).map((s) => (
                        <option key={s} value={s} style={optionStyle}>
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
                      style={labelStyle}
                    >
                      {isSubSampleMode ? '存储温度（继承自容器）' : '存储温度'}
                    </label>
                    <input
                      type="text"
                      value={`${tempValue}°C`}
                      readOnly
                      className="w-full px-3 py-2 rounded text-[16px] sm:text-[14px] min-h-[44px] outline-none"
                      style={mutedFieldStyle}
                    />
                  </div>
                )}

                {/* Collected date */}
                <div>
                  <label
                    className="block text-[14px] mb-1"
                    style={labelStyle}
                  >
                    采集日期
                  </label>
                  <input
                    type="date"
                    value={form.collectedAt}
                    onChange={(e) => setForm((f) => ({ ...f, collectedAt: e.target.value }))}
                    className="w-full px-3 py-2 rounded text-[16px] sm:text-[14px] min-h-[44px] outline-none"
                    style={fieldStyle}
                  />
                </div>

                {/* Patient ID */}
                <div>
                  <label
                    className="block text-[14px] mb-1"
                    style={labelStyle}
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
                    className="w-full px-3 py-2 rounded text-[16px] sm:text-[14px] min-h-[44px] outline-none placeholder:text-slate-500"
                    style={fieldStyle}
                  />
                </div>

                {/* Uploader */}
                <div>
                  <label
                    className="block text-[14px] mb-1"
                    style={labelStyle}
                  >
                    上传者（选填）
                  </label>
                  <input
                    type="text"
                    placeholder="例：张三 / 检验科"
                    value={form.uploader}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, uploader: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded text-[16px] sm:text-[14px] min-h-[44px] outline-none placeholder:text-slate-500"
                    style={fieldStyle}
                  />
                </div>

                {/* Volume + Tags row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block text-[14px] mb-1"
                      style={labelStyle}
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
                      className="w-full px-3 py-2 rounded text-[16px] sm:text-[14px] min-h-[44px] outline-none placeholder:text-slate-500"
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[14px] mb-1"
                      style={labelStyle}
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
                      className="w-full px-3 py-2 rounded text-[16px] sm:text-[14px] min-h-[44px] outline-none placeholder:text-slate-500"
                      style={fieldStyle}
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label
                    className="block text-[14px] mb-1"
                    style={labelStyle}
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
                    className="w-full px-3 py-2 rounded text-[16px] sm:text-[14px] min-h-[44px] outline-none resize-none placeholder:text-slate-500"
                    style={fieldStyle}
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
                        : `将创建为「${STATUS_CONFIG[form.status].label}」状态样本，存入 ${targetCompartment === 'upper' ? '上层' : '下层'} 格位 ${targetPosition != null ? targetPosition + 1 : '—'}`}
                  </span>
                </div>

                <ResponsiveDialogFooter className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded text-[16px] sm:text-[14px] min-h-[44px] transition-colors"
                    style={{
                      background: 'var(--app-subtle-bg)',
                      border: '1px solid var(--app-subtle-border)',
                      color: 'var(--app-subtle-text)',
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded text-[16px] sm:text-[14px] min-h-[44px] transition-all hover:brightness-110"
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
                      color: '#ffffff',
                      boxShadow: '0 12px 28px rgba(37,99,235,0.18)',
                    }}
                  >
                    {isEdit
                      ? '保存修改'
                      : isSubSampleMode
                        ? '添加副样本'
                        : '确认添加'}
                  </button>
                </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
