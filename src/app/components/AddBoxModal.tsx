import React, { useEffect, useState } from 'react';
import { Plus, Upload, X, ImageIcon, Maximize2 } from 'lucide-react';
import { Box, BoxMode, BoxImage, BOX_GRID_PRESETS, boxPositionToLabel } from '../types';
import { fetchBoxImages, uploadBoxImage, deleteBoxImage } from '../api';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from './ui/responsive-dialog';

interface AddBoxModalProps {
  isOpen: boolean;
  editBox?: Box | null;
  drawerLabel?: string;
  targetPosition?: number | null;
  sampleTypes: string[];
  currentUsername: string;
  onClose: () => void;
  onAddSampleType: (name: string) => void;
  onSave: (data: Partial<Box>) => Promise<Box | undefined>;
  onImagesChanged?: (boxId: string) => void;
}

type PendingBoxImage = {
  id: string;
  file: File;
  previewUrl: string;
  originalName: string;
};

type PreviewImage = {
  src: string;
  alt: string;
};

const generateTempId = (prefix: string) => {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  const uuid = cryptoObj?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export function AddBoxModal({
  isOpen,
  editBox,
  drawerLabel,
  targetPosition,
  sampleTypes,
  currentUsername,
  onClose,
  onAddSampleType,
  onSave,
  onImagesChanged,
}: AddBoxModalProps) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<BoxMode>('simple');
  const [gridPreset, setGridPreset] = useState(0);
  const [customRows, setCustomRows] = useState(10);
  const [customCols, setCustomCols] = useState(10);
  const [sampleType, setSampleType] = useState('');
  const [projectName, setProjectName] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [note, setNote] = useState('');
  const [dataPath, setDataPath] = useState('');
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [error, setError] = useState('');
  const [images, setImages] = useState<BoxImage[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingBoxImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const clearPendingImages = () => {
    setPendingImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return [];
    });
  };

  const handleClose = () => {
    setError('');
    setPreviewImage(null);
    clearPendingImages();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    clearPendingImages();
    setName(editBox?.name || '');
    setMode(editBox?.mode || 'simple');
    setCustomRows(editBox?.grid_rows || 10);
    setCustomCols(editBox?.grid_cols || 10);
    setSampleType(editBox?.sample_type || sampleTypes[0] || '');
    setProjectName(editBox?.project_name || '');
    setCreatedBy(editBox?.created_by || editBox?.owner || currentUsername);
    setNote(editBox?.note || '');
    setDataPath(editBox?.data_path || '');
    setShowNewType(false);
    setNewTypeName('');
    setPreviewImage(null);
    const presetIndex = BOX_GRID_PRESETS.findIndex(
      (preset) => preset.rows === editBox?.grid_rows && preset.cols === editBox?.grid_cols,
    );
    setGridPreset(presetIndex >= 0 ? presetIndex : 0);
    // Load images when editing
    if (editBox?.id) {
      fetchBoxImages(editBox.id).then(setImages).catch(() => setImages([]));
    } else {
      setImages([]);
    }
  }, [isOpen, editBox]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) {
      setPendingImages((prev) => [
        ...prev,
        ...files.map((file) => ({
          id: generateTempId(`${file.name}-${file.lastModified}`),
          file,
          previewUrl: URL.createObjectURL(file),
          originalName: file.name,
        })),
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入盒子名称');
      return;
    }
    setError('');
    const isPrecise = mode === 'precise';
    const preset = BOX_GRID_PRESETS[gridPreset];
    const finalRows = isPrecise ? (preset.rows || customRows) : null;
    const finalCols = isPrecise ? (preset.cols || customCols) : null;
    const finalCreator = (createdBy || currentUsername).trim() || currentUsername;
    const saved = await onSave({
      id: editBox?.id,
      name: name.trim(),
      mode,
      grid_rows: finalRows,
      grid_cols: finalCols,
      position: targetPosition ?? editBox?.position ?? null,
      sample_type: sampleType || null,
      project_name: projectName || null,
      quantity: 0,
      owner: finalCreator,
      created_by: finalCreator,
      note: note || null,
      data_path: dataPath || null,
      tags: editBox?.tags || [],
    });
    if (saved?.id || editBox?.id) {
      const targetId = saved?.id || editBox?.id!;
      handleClose();
      if (pendingImages.length > 0) {
        void (async () => {
          try {
            await Promise.all(pendingImages.map((img) => uploadBoxImage(targetId, img.file)));
            onImagesChanged?.(targetId);
          } catch (err: any) {
            console.error('Box image upload failed after save:', err);
          }
        })();
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    setPendingImages((prev) => [
      ...prev,
      ...selectedFiles.map((file) => ({
        id: generateTempId(`${file.name}-${file.lastModified}`),
        file,
        previewUrl: URL.createObjectURL(file),
        originalName: file.name,
      })),
    ]);
    e.target.value = '';
  };

  const handleImageDelete = async (imageId: string) => {
    if (!window.confirm('确认删除这张图片吗？')) return;
    try {
      await deleteBoxImage(imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      if (editBox?.id) onImagesChanged?.(editBox.id);
    } catch (err: any) {
      setError(err.message || '图片删除失败');
    }
  };

  const handlePendingImageDelete = (imageId: string) => {
    if (!window.confirm('确认删除这张待上传图片吗？')) return;
    setPendingImages((prev) => {
      const target = prev.find((img) => img.id === imageId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== imageId);
    });
  };

  const fieldStyle: React.CSSProperties = {
    background: 'var(--app-input-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-text)',
  };

  const title = editBox ? '编辑盒子' : '添加盒子';
  const subtitle = `抽屉外部：${drawerLabel || '—'} · 抽屉内部：${targetPosition != null ? boxPositionToLabel(targetPosition) : '—'}`;

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <ResponsiveDialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{subtitle}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="盒子名称"
            autoFocus
            className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
            style={fieldStyle}
          />
          <p className="text-[11px] -mt-2" style={{ color: 'var(--app-muted)' }}>
            命名建议：MLP 12-23 / TLP 23-33（使用 / 分割不同编号范围），支持多样本混合存储
          </p>

          <div className="flex gap-2">
            {(['simple', 'precise'] as BoxMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-lg text-[14px] transition-all min-h-[44px]"
                style={{
                  background: mode === m ? '#2563eb' : 'var(--app-panel-bg)',
                  color: mode === m ? '#fff' : 'var(--app-muted)',
                  border: mode === m ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                }}
              >
                {m === 'precise' ? '精细样本' : '简略模式'}
              </button>
            ))}
          </div>

          {mode === 'precise' && (
            <div className="flex gap-2 flex-wrap">
              {BOX_GRID_PRESETS.map((preset, i) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setGridPreset(i)}
                  className="text-[12px] px-3 py-1 rounded-lg transition-all min-h-[44px]"
                  style={{
                    background: gridPreset === i ? '#dbeafe' : 'var(--app-panel-bg)',
                    color: gridPreset === i ? '#1d4ed8' : 'var(--app-muted)',
                    border: gridPreset === i ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {mode === 'precise' && BOX_GRID_PRESETS[gridPreset].label === '自定义' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="number"
                min={1} max={20}
                value={customRows}
                onChange={(e) => setCustomRows(Number(e.target.value))}
                placeholder="行数"
                className="px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
                style={fieldStyle}
              />
              <input
                type="number"
                min={1} max={20}
                value={customCols}
                onChange={(e) => setCustomCols(Number(e.target.value))}
                placeholder="列数"
                className="px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
                style={fieldStyle}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              {showNewType ? (
                <div className="flex gap-1">
                  <input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const nextType = newTypeName.trim();
                        if (!nextType) return;
                        onAddSampleType(nextType);
                        setSampleType(nextType);
                        setNewTypeName('');
                        setShowNewType(false);
                      }
                    }}
                    placeholder="新样本类型"
                    autoFocus
                    className="min-w-0 flex-1 px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
                    style={fieldStyle}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextType = newTypeName.trim();
                      if (!nextType) return;
                      onAddSampleType(nextType);
                      setSampleType(nextType);
                      setNewTypeName('');
                      setShowNewType(false);
                    }}
                    className="px-2 rounded-lg text-[12px] min-h-[44px]"
                    style={{ background: '#2563eb', color: '#fff' }}
                  >添加</button>
                  <button
                    type="button"
                    onClick={() => { setShowNewType(false); setNewTypeName(''); }}
                    className="px-2 rounded-lg text-[12px] min-h-[44px]"
                    style={{
                      background: 'var(--app-subtle-bg)',
                      border: '1px solid var(--app-subtle-border)',
                      color: 'var(--app-subtle-text)',
                    }}
                  >取消</button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <select
                    value={sampleType}
                    onChange={(e) => setSampleType(e.target.value)}
                    className="min-w-0 flex-1 px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
                    style={fieldStyle}
                  >
                    {sampleTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewType(true)}
                    className="px-2 rounded-lg min-h-[44px]"
                    title="添加样本类型"
                    style={{
                      background: 'var(--app-panel-bg)',
                      border: '1px solid var(--app-border)',
                      color: '#2563eb',
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              )}
            </div>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="项目名称（选填）"
              className="px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
              style={fieldStyle}
            />
          </div>

          <input
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            placeholder="创建者"
            className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
            style={fieldStyle}
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="备注（选填）"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none resize-none"
            style={fieldStyle}
          />
          <input
            value={dataPath}
            onChange={(e) => setDataPath(e.target.value)}
            placeholder="数据路径（选填，如 /data/project/sample/、s3://bucket/）"
            className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
            style={fieldStyle}
          />

          <div className="space-y-2 rounded-xl p-3" style={{ background: 'var(--app-input-bg)', border: '1px solid var(--app-input-border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>盒子图片</span>
              <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] min-h-[36px]"
                style={{ background: '#2563eb', color: '#fff' }}>
                <Upload size={14} />
                {uploading ? '上传中...' : '上传图片'}
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} className="hidden" />
              </label>
              {pendingImages.length > 0 && (
                <span className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                  保存后自动上传
                </span>
              )}
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="rounded-lg transition-colors"
              style={{
                border: dragOver ? '2px dashed #3b82f6' : '2px dashed transparent',
                background: dragOver ? 'rgba(59,130,246,0.06)' : 'transparent',
              }}
            >
              {images.length > 0 || pendingImages.length > 0 ? (
                <div className="flex gap-2 flex-wrap p-1">
                  {pendingImages.map((img) => (
                    <div
                      key={img.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setPreviewImage({ src: img.previewUrl, alt: img.originalName })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPreviewImage({ src: img.previewUrl, alt: img.originalName });
                        }
                      }}
                      className="relative group w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                      style={{ border: '1px solid var(--app-border)' }}>
                      <img src={img.previewUrl} alt={img.originalName} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-center text-[10px] text-white" style={{ background: 'rgba(15,23,42,0.72)' }}>
                        待上传
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                        <Maximize2 size={18} />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handlePendingImageDelete(img.id); }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {images.map((img) => (
                    <div
                      key={img.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setPreviewImage({ src: `/${img.image_path}`, alt: img.original_name || '盒子图片' })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPreviewImage({ src: `/${img.image_path}`, alt: img.original_name || '盒子图片' });
                        }
                      }}
                      className="relative group w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                      style={{ border: '1px solid var(--app-border)' }}>
                      <img src={`/${img.image_path}`} alt={img.original_name || ''} className="w-full h-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                        <Maximize2 size={18} />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleImageDelete(img.id); }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-6 min-h-[100px]" style={{ background: 'var(--app-card-bg)', border: '2px dashed var(--app-border)', color: 'var(--app-muted)' }}>
                  <ImageIcon size={22} />
                  <span className="text-[13px]">拖拽图片到此处，或点击上方按钮选择</span>
                  <span className="text-[11px]">保存后自动上传</span>
                </div>
              )}
            </div>
          </div>
          {error && (
            <div className="text-[13px] px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}
          <ResponsiveDialogFooter className="sticky bottom-0 z-10 -mx-4 mt-2 border-t px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:static md:mx-0 md:mt-0 md:border-t-0 md:p-0" style={{
            background: 'var(--app-card-bg)',
            borderColor: 'var(--app-border)',
          }}>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-[14px] min-h-[44px]"
              style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)', border: '1px solid var(--app-border)' }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 rounded-lg text-[14px] min-h-[44px]"
              style={{ background: uploading ? '#94a3b8' : '#2563eb', color: '#fff' }}
            >
              {uploading ? '处理中...' : editBox ? '更新信息' : '保存'}
            </button>
          </ResponsiveDialogFooter>
        </form>
        {previewImage && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <button
              type="button"
              aria-label="关闭图片预览"
              className="absolute right-4 top-4 rounded-full p-2 text-white"
              style={{ background: 'rgba(15,23,42,0.72)' }}
              onClick={() => setPreviewImage(null)}
            >
              <X size={20} />
            </button>
            <img
              src={previewImage.src}
              alt={previewImage.alt}
              className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
