import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogFooter, ResponsiveDialogTitle, ResponsiveDialogDescription } from './ui/responsive-dialog';
import { SampleRecord, Tube, cellPositionToLabel } from '../types';

interface AddSampleRecordModalProps {
  isOpen: boolean;
  editRecord?: SampleRecord | null;
  currentUser: string;
  boxId: string;
  boxName: string;
  gridCols: number;
  preSelectedPositions?: number[];
  onClose: () => void;
  onSave: (data: {
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
  }) => void;
  onDelete?: (id: string) => void;
  onAddTubes?: (sampleId: string, tubes: Array<{ box_id: string; position: number; volume?: string; barcode?: string; status?: string; note?: string }>) => void;
  onDeleteTube?: (tubeId: string) => void;
}

export function AddSampleRecordModal({
  isOpen,
  editRecord,
  currentUser,
  boxId,
  boxName,
  gridCols,
  preSelectedPositions = [],
  onClose,
  onSave,
  onDelete,
  onAddTubes,
  onDeleteTube,
}: AddSampleRecordModalProps) {
  const [patientName, setPatientName] = useState('');
  const [sampleCode, setSampleCode] = useState('');
  const [source, setSource] = useState('');
  const [sampleType, setSampleType] = useState('');
  const [collectionStage, setCollectionStage] = useState('');
  const [collectedAt, setCollectedAt] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [note, setNote] = useState('');

  // For new positions to add to existing sample
  const [newPositions, setNewPositions] = useState<number[]>([]);
  const [positionInput, setPositionInput] = useState('');

  const isEdit = !!editRecord;

  useEffect(() => {
    if (!isOpen) return;
    setPatientName(editRecord?.patient_name || '');
    setSampleCode(editRecord?.sample_code || '');
    setSource(editRecord?.source || '');
    setSampleType(editRecord?.sample_type || '');
    setCollectionStage(editRecord?.collection_stage || '');
    setCollectedAt(editRecord?.collected_at ? editRecord.collected_at.slice(0, 10) : '');
    setTagsStr((editRecord?.tags || []).join(', '));
    setNote(editRecord?.note || '');
    setNewPositions([]);
    setPositionInput('');
  }, [isOpen, editRecord]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !sampleCode.trim()) return;

    const tags = tagsStr
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (isEdit && editRecord) {
      onSave({
        patient_name: patientName.trim(),
        sample_code: sampleCode.trim(),
        source: source || undefined,
        sample_type: sampleType || undefined,
        collection_stage: collectionStage || undefined,
        collected_at: collectedAt || undefined,
        tags,
        note: note || undefined,
      });
    } else {
      const tubes = preSelectedPositions.map((pos) => ({
        box_id: boxId,
        position: pos,
      }));
      onSave({
        patient_name: patientName.trim(),
        sample_code: sampleCode.trim(),
        source: source || undefined,
        sample_type: sampleType || undefined,
        collection_stage: collectionStage || undefined,
        collected_at: collectedAt || undefined,
        tags,
        note: note || undefined,
        uploader: currentUser,
        tubes,
      });
    }
  };

  const handleAddPosition = () => {
    const pos = parseInt(positionInput, 10);
    if (isNaN(pos) || pos < 0 || newPositions.includes(pos)) return;
    // Check that position isn't already in editRecord tubes
    if (editRecord?.tubes?.some((t) => t.position === pos)) return;
    setNewPositions((prev) => [...prev, pos]);
    setPositionInput('');
  };

  const handleAddTubes = () => {
    if (newPositions.length === 0 || !editRecord || !onAddTubes) return;
    onAddTubes(
      editRecord.id,
      newPositions.map((pos) => ({ box_id: boxId, position: pos })),
    );
    setNewPositions([]);
  };

  const fieldStyle: React.CSSProperties = {
    background: 'var(--app-input-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-text)',
  };

  const positionLabel = (pos: number) => cellPositionToLabel(pos, gridCols || 10);

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ResponsiveDialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          <ResponsiveDialogHeader className="space-y-1 pb-2">
            <ResponsiveDialogTitle>
              {isEdit ? '编辑样本信息' : '添加样本'}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="leading-5">
              {boxName}
              {preSelectedPositions.length > 0 &&
                ` · 已选格位: ${preSelectedPositions.map(positionLabel).join(', ')}`}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-1 pb-2 sm:px-0">
            <section
              className="space-y-4 rounded-xl p-4 sm:p-5"
              style={{
                background: 'var(--app-card-bg)',
                border: '1px solid var(--app-border)',
                boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
              }}
            >
              <div>
                <div className="text-[14px] font-medium" style={{ color: 'var(--app-text)' }}>
                  基础信息
                </div>
                <div className="mt-1 text-[12px]" style={{ color: 'var(--app-muted)' }}>
                  姓名和编号为必填项。
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px]" style={{ color: 'var(--app-muted)' }}>
                    姓名 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="患者姓名"
                    className="w-full rounded-lg px-3 py-2 text-[16px] outline-none sm:text-[14px] min-h-[44px]"
                    style={fieldStyle}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px]" style={{ color: 'var(--app-muted)' }}>
                    编号 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    value={sampleCode}
                    onChange={(e) => setSampleCode(e.target.value)}
                    placeholder="样本编号"
                    className="w-full rounded-lg px-3 py-2 text-[16px] outline-none sm:text-[14px] min-h-[44px]"
                    style={fieldStyle}
                    required
                  />
                </div>
              </div>
            </section>

            <section
              className="space-y-4 rounded-xl p-4 sm:p-5"
              style={{
                background: 'var(--app-card-bg)',
                border: '1px solid var(--app-border)',
                boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
              }}
            >
              <div>
                <div className="text-[14px] font-medium" style={{ color: 'var(--app-text)' }}>
                  扩展信息
                </div>
                <div className="mt-1 text-[12px]" style={{ color: 'var(--app-muted)' }}>
                  用于补充来源、类型和采集信息。
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px]" style={{ color: 'var(--app-muted)' }}>样本来源</label>
                  <input
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="如: 门诊、住院"
                    className="w-full rounded-lg px-3 py-2 text-[16px] outline-none sm:text-[14px] min-h-[44px]"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px]" style={{ color: 'var(--app-muted)' }}>样本类型</label>
                  <input
                    value={sampleType}
                    onChange={(e) => setSampleType(e.target.value)}
                    placeholder="如: 外周血、脐血"
                    className="w-full rounded-lg px-3 py-2 text-[16px] outline-none sm:text-[14px] min-h-[44px]"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px]" style={{ color: 'var(--app-muted)' }}>采集阶段</label>
                  <input
                    value={collectionStage}
                    onChange={(e) => setCollectionStage(e.target.value)}
                    placeholder="如: 中孕期"
                    className="w-full rounded-lg px-3 py-2 text-[16px] outline-none sm:text-[14px] min-h-[44px]"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px]" style={{ color: 'var(--app-muted)' }}>采集时间</label>
                  <input
                    type="date"
                    value={collectedAt}
                    onChange={(e) => setCollectedAt(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-[16px] outline-none sm:text-[14px] min-h-[44px]"
                    style={fieldStyle}
                  />
                </div>
              </div>
            </section>

            <section
              className="space-y-4 rounded-xl p-4 sm:p-5"
              style={{
                background: 'var(--app-card-bg)',
                border: '1px solid var(--app-border)',
                boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
              }}
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <label className="mb-1 block text-[12px]" style={{ color: 'var(--app-muted)' }}>标签</label>
                  <input
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    placeholder="逗号分隔，如: 紧急, 需复查"
                    className="w-full rounded-lg px-3 py-2 text-[16px] outline-none sm:text-[14px] min-h-[44px]"
                    style={fieldStyle}
                  />
                </div>
                <div
                  className="rounded-lg px-3 py-2"
                  style={{ background: 'var(--app-input-bg)', border: '1px solid var(--app-input-border)' }}
                >
                  <div className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                    上传者
                  </div>
                  <div className="mt-1 text-[14px]" style={{ color: 'var(--app-text)' }}>
                    {currentUser}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[12px]" style={{ color: 'var(--app-muted)' }}>备注</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="备注（选填）"
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-[16px] outline-none resize-none sm:text-[14px] min-h-[88px]"
                  style={fieldStyle}
                />
              </div>
            </section>

            {isEdit && editRecord && editRecord.tubes && editRecord.tubes.length > 0 && (
              <section
                className="space-y-4 rounded-xl p-4 sm:p-5"
                style={{
                  background: 'var(--app-card-bg)',
                  border: '1px solid var(--app-border)',
                  boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-medium" style={{ color: 'var(--app-text)' }}>
                      关联试管
                    </div>
                    <div className="mt-1 text-[12px]" style={{ color: 'var(--app-muted)' }}>
                      当前样本已绑定 {editRecord.tubes.length} 个试管位置。
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editRecord.tubes.map((tube) => (
                    <div
                      key={tube.id}
                      className="flex flex-col gap-2 rounded-lg px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      style={{ background: 'var(--app-input-bg)', border: '1px solid var(--app-input-border)' }}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ background: editRecord.group_color }}
                        />
                        <span className="min-w-0 text-[13px] break-all" style={{ color: 'var(--app-text)' }}>
                          {tube.tube_label} · {tube.box_name || boxName} · {positionLabel(tube.position)}
                        </span>
                      </div>
                      {onDeleteTube && (
                        <button
                          type="button"
                          onClick={() => onDeleteTube(tube.id)}
                          className="self-start text-[12px] sm:self-auto"
                          style={{ color: '#f87171' }}
                        >
                          移除
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {onAddTubes && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      type="number"
                      min={0}
                      value={positionInput}
                      onChange={(e) => setPositionInput(e.target.value)}
                      placeholder="添加格位编号"
                      className="w-full rounded-lg px-3 py-2 text-[14px] outline-none min-h-[44px]"
                      style={fieldStyle}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPosition(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleAddPosition}
                      className="flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-[13px] min-h-[44px]"
                      style={{ background: '#2563eb', color: '#fff' }}
                    >
                      <Plus size={14} />添加格位
                    </button>
                  </div>
                )}

                {newPositions.length > 0 && (
                  <div
                    className="flex flex-col gap-3 rounded-lg px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    style={{ background: 'var(--app-input-bg)', border: '1px solid var(--app-input-border)' }}
                  >
                    <span className="text-[12px] break-all" style={{ color: 'var(--app-muted)' }}>
                      待添加: {newPositions.map(positionLabel).join(', ')}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddTubes}
                      className="rounded-lg px-4 py-2 text-[12px] min-h-[44px]"
                      style={{ background: '#22c55e', color: '#fff' }}
                    >
                      确认添加试管
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>

          <ResponsiveDialogFooter className="pt-3">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {isEdit && onDelete && editRecord && (
                <button
                  type="button"
                  onClick={() => onDelete(editRecord.id)}
                  className="flex min-h-[44px] items-center justify-center gap-1 rounded-lg px-3 py-2 text-[13px] sm:justify-start"
                  style={{ color: '#dc2626', background: '#fee2e2' }}
                >
                  <Trash2 size={14} />删除样本
                </button>
              )}
              <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] rounded-lg px-4 py-2 text-[14px]"
                  style={{
                    background: 'var(--app-panel-bg)',
                    color: 'var(--app-muted)',
                    border: '1px solid var(--app-border)',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-lg px-4 py-2 text-[14px]"
                  style={{ background: '#2563eb', color: '#fff' }}
                >
                  {isEdit ? '更新' : '保存'}
                </button>
              </div>
            </div>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
