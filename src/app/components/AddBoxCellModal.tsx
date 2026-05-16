import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Box, BoxCell, SampleStatus, STATUS_CONFIG, cellPositionToLabel } from '../types';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from './ui/responsive-dialog';

interface AddBoxCellModalProps {
  isOpen: boolean;
  box: Box | null;
  cell?: BoxCell | null;
  position: number | null;
  onClose: () => void;
  onSave: (data: Partial<BoxCell>) => void;
  onDelete: (cellId: string) => void;
}

export function AddBoxCellModal({
  isOpen,
  box,
  cell,
  position,
  onClose,
  onSave,
  onDelete,
}: AddBoxCellModalProps) {
  const [barcode, setBarcode] = useState('');
  const [sampleName, setSampleName] = useState('');
  const [sampleVolume, setSampleVolume] = useState('');
  const [sampleStatus, setSampleStatus] = useState<SampleStatus>('normal');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setBarcode(cell?.barcode || '');
    setSampleName(cell?.sample_name || '');
    setSampleVolume(cell?.sample_volume || '');
    setSampleStatus(cell?.sample_status || 'normal');
    setNote(cell?.note || '');
  }, [isOpen, cell]);

  const cols = box?.grid_cols || 10;
  const positionLabel = position == null ? '—' : cellPositionToLabel(position, cols);
  const fieldStyle: React.CSSProperties = {
    background: 'var(--app-input-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-text)',
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (position == null) return;
    onSave({
      id: cell?.id,
      position,
      barcode: barcode || null,
      sample_name: sampleName || null,
      sample_volume: sampleVolume || null,
      sample_status: sampleStatus,
      note: note || null,
    });
  };

  const title = cell ? '编辑格位信息' : '添加格位信息';
  const subtitle = `${box?.name || '盒子'} · 格位 ${positionLabel}`;

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ResponsiveDialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{subtitle}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="条码（选填）"
            className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
            style={fieldStyle}
          />
          <input
            value={sampleName}
            onChange={(e) => setSampleName(e.target.value)}
            placeholder="样本名称"
            className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
            style={fieldStyle}
          />
          <input
            value={sampleVolume}
            onChange={(e) => setSampleVolume(e.target.value)}
            placeholder="样本量（例：2ml / 500ul）"
            className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
            style={fieldStyle}
          />
          <select
            value={sampleStatus}
            onChange={(e) => setSampleStatus(e.target.value as SampleStatus)}
            className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
            style={fieldStyle}
          >
            {(Object.keys(STATUS_CONFIG) as SampleStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_CONFIG[status].label}
              </option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="备注（选填）"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none resize-none"
            style={fieldStyle}
          />

          <ResponsiveDialogFooter>
            <div className="flex items-center justify-between gap-2 w-full">
              {cell ? (
                <button
                  type="button"
                  onClick={() => onDelete(cell.id)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] min-h-[44px]"
                  style={{ color: '#dc2626', background: '#fee2e2' }}
                >
                  <Trash2 size={14} />清空格位
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-[14px] min-h-[44px]"
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
                  className="px-4 py-2 rounded-lg text-[14px] min-h-[44px]"
                  style={{ background: '#2563eb', color: '#fff' }}
                >
                  保存
                </button>
              </div>
            </div>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
