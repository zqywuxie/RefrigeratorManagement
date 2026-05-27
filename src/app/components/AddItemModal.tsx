import React, { useEffect, useState } from 'react';
import { Plus, Upload, X, ImageIcon, Maximize2 } from 'lucide-react';
import { UpperItem, ItemType, BoxMode, BOX_GRID_PRESETS, UpperItemImage } from '../types';
import { fetchUpperItemImages, uploadUpperItemImage, deleteUpperItemImage } from '../api';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from './ui/responsive-dialog';

type PendingItemImage = {
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

interface AddItemModalProps {
  isOpen: boolean;
  editItem?: UpperItem | null;
  defaultRow: number;
  maxRows?: number;
  currentUsername: string;
  itemTypes: string[];
  onAddItemType: (name: string) => void;
  onClose: () => void;
  onSave: (data: Partial<UpperItem>) => Promise<UpperItem | undefined>;
  onImagesChanged?: (itemId: string) => void;
}

export function AddItemModal({
  isOpen,
  editItem,
  defaultRow,
  currentUsername,
  itemTypes,
  onAddItemType,
  onClose,
  onSave,
  onImagesChanged,
}: AddItemModalProps) {
  const [name, setName] = useState('');
  const [itemType, setItemType] = useState<ItemType>('样本');
  const [quantity, setQuantity] = useState(1);
  const [owner, setOwner] = useState('');
  const [note, setNote] = useState('');
  const [rowNumber, setRowNumber] = useState(defaultRow);
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [boxMode, setBoxMode] = useState<BoxMode>('simple');
  const [gridPreset, setGridPreset] = useState(0);
  const [customRows, setCustomRows] = useState(10);
  const [customCols, setCustomCols] = useState(10);
  const [error, setError] = useState('');
  const [images, setImages] = useState<UpperItemImage[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingItemImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(editItem?.name || '');
    setItemType(editItem?.item_type || itemTypes[0] || '样本');
    setQuantity(editItem?.quantity || 1);
    setOwner(editItem?.owner || currentUsername);
    setNote(editItem?.note || '');
    setRowNumber(editItem?.row_number || defaultRow);
    setShowNewType(false);
    setNewTypeName('');
    setBoxMode(editItem?.box_mode || 'simple');
    setGridPreset(0);
    setCustomRows(editItem?.grid_rows || 10);
    setCustomCols(editItem?.grid_cols || 10);
  }, [isOpen, editItem, defaultRow, currentUsername]);

  useEffect(() => {
    if (isOpen && editItem?.id) {
      fetchUpperItemImages(editItem.id).then(setImages).catch(() => setImages([]));
    } else {
      setImages([]);
      setPendingImages([]);
    }
  }, [isOpen, editItem?.id]);

  const clearPendingImages = () => {
    setPendingImages((prev) => {
      for (const img of prev) URL.revokeObjectURL(img.previewUrl);
      return [];
    });
  };

  const handleClose = () => {
    setError('');
    setPreviewImage(null);
    clearPendingImages();
    onClose();
  };

  const handleImageFiles = (files: File[]) => {
    setPendingImages((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: generateTempId(`${file.name}-${file.lastModified}`),
        file,
        previewUrl: URL.createObjectURL(file),
        originalName: file.name,
      })),
    ]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) handleImageFiles(selectedFiles);
    e.target.value = '';
  };

  const handleImageDelete = async (imageId: string) => {
    if (!window.confirm('确认删除这张图片吗？')) return;
    try {
      await deleteUpperItemImage(imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      if (editItem?.id) onImagesChanged?.(editItem.id);
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
    if (files.length > 0) handleImageFiles(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入物品名称');
      return;
    }
    setError('');
    const isBox = boxMode === 'precise';
    const preset = BOX_GRID_PRESETS[gridPreset];
    const finalRows = isBox ? (preset.rows || customRows) : null;
    const finalCols = isBox ? (preset.cols || customCols) : null;
    const data: Partial<UpperItem> = {
      id: editItem?.id,
      name: name.trim(),
      item_type: itemType,
      box_mode: boxMode,
      grid_rows: finalRows,
      grid_cols: finalCols,
      quantity,
      owner: owner || null,
      note: note || null,
      row_number: rowNumber,
      tags: editItem?.tags || [],
    };

    const saved = await onSave(data);

    const targetId = saved?.id || editItem?.id;
    if (targetId && pendingImages.length > 0) {
      try {
        await Promise.all(pendingImages.map((img) => uploadUpperItemImage(targetId, img.file)));
        onImagesChanged?.(targetId);
      } catch (err: any) {
        console.error('上层物品图片保存后上传失败:', err);
      }
    }
    clearPendingImages();
    handleClose();
  };

  const fieldStyle: React.CSSProperties = {
    background: 'var(--app-input-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-text)',
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => { if (!open) { setError(''); handleClose(); } }}>
      <ResponsiveDialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {editItem ? '编辑物品' : '添加物品'}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="物品名称"
            autoFocus
            className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
            style={fieldStyle}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      onAddItemType(nextType);
                      setItemType(nextType);
                      setNewTypeName('');
                      setShowNewType(false);
                    }
                  }}
                  placeholder="新物品类型"
                  autoFocus
                  className="min-w-0 flex-1 px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
                  style={fieldStyle}
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextType = newTypeName.trim();
                    if (!nextType) return;
                    onAddItemType(nextType);
                    setItemType(nextType);
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
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as ItemType)}
                  className="min-w-0 flex-1 px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
                  style={fieldStyle}
                >
                  {itemTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewType(true)}
                  className="px-2 rounded-lg min-h-[44px]"
                  title="添加物品类型"
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
            <div
              className="px-3 py-2 rounded-lg text-[14px] min-h-[44px] flex items-center"
              style={{
                background: 'var(--app-input-muted-bg)',
                border: '1px solid var(--app-input-border)',
                color: 'var(--app-subtle-text)',
              }}
            >
              第 {rowNumber} 行
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="number" min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="数量"
              className="px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
              style={fieldStyle}
            />
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="负责人"
              className="px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none min-h-[44px]"
              style={fieldStyle}
            />
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="备注（选填）"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-[16px] sm:text-[14px] outline-none resize-none"
            style={fieldStyle}
          />

          <div className="space-y-2 rounded-xl p-3" style={{ background: 'var(--app-input-bg)', border: '1px solid var(--app-input-border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>物品图片</span>
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
                      onClick={() => setPreviewImage({ src: `/${img.image_path}`, alt: img.original_name || '物品图片' })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPreviewImage({ src: `/${img.image_path}`, alt: img.original_name || '物品图片' });
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

          <div className="border-t pt-3" style={{ borderColor: 'var(--app-border)' }}>
            <label className="text-[12px] block mb-2" style={{ color: 'var(--app-muted)' }}>
              盒模式（可选）— 启用后可在上层大空间中使用盒子孔位管理
            </label>
            <div className="flex gap-2 mb-2">
              {(['simple', 'precise'] as BoxMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBoxMode(m)}
                  className="flex-1 py-2 rounded-lg text-[13px] transition-all min-h-[44px]"
                  style={{
                    background: boxMode === m ? '#2563eb' : 'var(--app-panel-bg)',
                    color: boxMode === m ? '#fff' : 'var(--app-muted)',
                    border: boxMode === m ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                  }}
                >
                  {m === 'precise' ? '孔位模式' : '普通模式'}
                </button>
              ))}
            </div>
            {boxMode === 'precise' && (
              <div className="flex gap-2 flex-wrap">
                {BOX_GRID_PRESETS.map((preset, i) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setGridPreset(i)}
                    className="text-[11px] px-3 py-1 rounded-lg transition-all min-h-[44px]"
                    style={{
                      background: gridPreset === i ? '#dbeafe' : 'var(--app-panel-bg)',
                      color: gridPreset === i ? '#1d4ed8' : 'var(--app-muted)',
                      border: gridPreset === i ? '1px solid #3b82f6' : '1px solid var(--app-border)',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
                {BOX_GRID_PRESETS[gridPreset].label === '自定义' && (
                  <div className="flex gap-2 w-full mt-1">
                    <input type="number" min={1} max={20} value={customRows} onChange={(e) => setCustomRows(Number(e.target.value))}
                      placeholder="行" className="flex-1 px-2 py-1 rounded text-[13px] outline-none min-h-[44px]" style={fieldStyle} />
                    <input type="number" min={1} max={20} value={customCols} onChange={(e) => setCustomCols(Number(e.target.value))}
                      placeholder="列" className="flex-1 px-2 py-1 rounded text-[13px] outline-none min-h-[44px]" style={fieldStyle} />
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="text-[13px] px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}
          <ResponsiveDialogFooter>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-[14px] min-h-[44px]"
              style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)', border: '1px solid var(--app-border)' }}
            >取消</button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-[14px] min-h-[44px]"
              style={{ background: '#2563eb', color: '#fff' }}
            >保存</button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
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
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
    </ResponsiveDialog>
  );
}
