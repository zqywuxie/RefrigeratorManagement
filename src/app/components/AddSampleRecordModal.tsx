import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Plus, Trash2 } from 'lucide-react';
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
    tubes?: Array<{ box_id: string; position: number; volume?: string; barcode?: string; status?: string }>;
  }) => void;
  onDelete?: (id: string) => void;
  onAddTubes?: (sampleId: string, tubes: Array<{ box_id: string; position: number; volume?: string }>) => void;
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.form
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4"
            style={{
              background: 'var(--app-header-bg)',
              border: '1px solid var(--app-border)',
              boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[18px]" style={{ color: 'var(--app-text)' }}>
                  {isEdit ? '编辑样本信息' : '添加样本'}
                </h3>
                <p className="text-[12px] mt-1" style={{ color: 'var(--app-muted)' }}>
                  {boxName}
                  {preSelectedPositions.length > 0 &&
                    ` · 已选格位: ${preSelectedPositions.map(positionLabel).join(', ')}`}
                </p>
              </div>
              <button type="button" onClick={onClose}>
                <X size={18} color="var(--app-muted)" />
              </button>
            </div>

            {/* Required fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>
                  姓名 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="患者姓名"
                  className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                  style={fieldStyle}
                  required
                />
              </div>
              <div>
                <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>
                  编号 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  value={sampleCode}
                  onChange={(e) => setSampleCode(e.target.value)}
                  placeholder="样本编号"
                  className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                  style={fieldStyle}
                  required
                />
              </div>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>样本来源</label>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="如: 门诊、住院"
                  className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>样本类型</label>
                <input
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  placeholder="如: 外周血、脐血"
                  className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                  style={fieldStyle}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>采集阶段</label>
                <input
                  value={collectionStage}
                  onChange={(e) => setCollectionStage(e.target.value)}
                  placeholder="如: 中孕期"
                  className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>采集时间</label>
                <input
                  type="date"
                  value={collectedAt}
                  onChange={(e) => setCollectedAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                  style={fieldStyle}
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] block mb-1" style={{ color: 'var(--app-muted)' }}>标签</label>
              <input
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="逗号分隔，如: 紧急, 需复查"
                className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              />
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="备注（选填）"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none resize-none"
              style={fieldStyle}
            />

            {/* Existing tubes display (edit mode) */}
            {isEdit && editRecord && editRecord.tubes && editRecord.tubes.length > 0 && (
              <div>
                <label className="text-[12px] block mb-2" style={{ color: 'var(--app-muted)' }}>
                  已有关联试管 ({editRecord.tubes.length})
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {editRecord.tubes.map((tube) => (
                    <div
                      key={tube.id}
                      className="flex items-center justify-between rounded-lg px-3 py-1.5 text-[13px]"
                      style={{ background: 'var(--app-input-bg)', border: '1px solid var(--app-input-border)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: editRecord.group_color }}
                        />
                        <span style={{ color: 'var(--app-text)' }}>
                          {tube.tube_label} · {tube.box_name || boxName} · {positionLabel(tube.position)}
                        </span>
                      </div>
                      {onDeleteTube && (
                        <button
                          type="button"
                          onClick={() => onDeleteTube(tube.id)}
                          className="text-[11px]"
                          style={{ color: '#f87171' }}
                        >
                          移除
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add more positions to existing sample */}
                {onAddTubes && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min={0}
                      value={positionInput}
                      onChange={(e) => setPositionInput(e.target.value)}
                      placeholder="添加格位编号"
                      className="flex-1 px-3 py-1.5 rounded-lg text-[13px] outline-none"
                      style={fieldStyle}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPosition(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleAddPosition}
                      className="px-3 py-1.5 rounded-lg text-[13px] flex items-center gap-1"
                      style={{ background: '#2563eb', color: '#fff' }}
                    >
                      <Plus size={14} />添加
                    </button>
                  </div>
                )}
                {newPositions.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
                      待添加: {newPositions.map(positionLabel).join(', ')}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddTubes}
                      className="px-3 py-1.5 rounded-lg text-[12px]"
                      style={{ background: '#22c55e', color: '#fff' }}
                    >
                      确认添加试管
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              {isEdit && onDelete && editRecord && (
                <button
                  type="button"
                  onClick={() => onDelete(editRecord.id)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-[13px]"
                  style={{ color: '#dc2626', background: '#fee2e2' }}
                >
                  <Trash2 size={14} />删除样本
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-[14px]"
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
                  className="px-4 py-2 rounded-lg text-[14px]"
                  style={{ background: '#2563eb', color: '#fff' }}
                >
                  {isEdit ? '更新' : '保存'}
                </button>
              </div>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
