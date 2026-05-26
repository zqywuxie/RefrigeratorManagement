# 上层物品图片上传 + 拖拽上传 实施计划

> **给执行者：** 推荐使用 superpowers:subagent-driven-development 或 superpowers:executing-plans 按任务逐步实施。步骤使用 `- [ ]` 追踪。

**目标：** 为上层物品新增图片上传功能（参照盒子图片系统），并为盒子和上层物品的图片上传区域都增加拖拽上传支持。

**架构：** 完全参照已有盒子图片模式 —— 新增 `upper_item_images` 表、multer 磁盘存储的 API、前端 API 封装函数、AddItemModal 中的图片区域、ItemCard 中的缩略图展示。拖拽通过原生 DOM 事件内联实现。

**技术栈：** React, TypeScript, Express, multer, MySQL (mysql2)

---

### 任务 1：新增 `upper_item_images` 表迁移

**涉及文件：**
- 修改：`server/schemaMigrations.js`

- [ ] **步骤 1：添加建表迁移**

在 `runSchemaMigrations` 函数中，`box_images` 建表代码块之后（约第309行后）插入：

```js
  // ── 上层物品图片表 ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS upper_item_images (
      id VARCHAR(36) PRIMARY KEY,
      item_id VARCHAR(36) NOT NULL,
      image_path VARCHAR(500) NOT NULL,
      original_name VARCHAR(255),
      mime_type VARCHAR(50),
      file_size INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES upper_items(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
```

- [ ] **步骤 2：验证迁移**

```bash
node -e "import('./server/schemaMigrations.js').then(m => m.runSchemaMigrations().then(async () => { const p = await import('./server/db.js'); const [rows] = await p.default.query('SHOW CREATE TABLE upper_item_images'); console.log('表已创建:', rows[0]['Create Table'].substring(0, 100)); process.exit(0); }).catch(e => { console.error(e); process.exit(1); }))"
```

预期输出：`表已创建:` 及建表语句。

- [ ] **步骤 3：提交**

```bash
git add server/schemaMigrations.js
git commit -m "feat: 添加上层物品图片表迁移"
```

---

### 任务 2：在上层物品路由中新增图片上传 API

**涉及文件：**
- 修改：`server/routes/upperItems.js`

- [ ] **步骤 1：替换文件头部的 import 并添加 multer 配置**

将第1-5行替换为：

```js
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import fs from 'fs';
import pool from '../db.js';
import { authenticate, requireResourceOwner } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ── 上层物品图片 Multer 磁盘存储 ──
const uploadDir = path.join(__dirname, '..', 'uploads', 'upper-item-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dateDir = path.join(uploadDir, new Date().toISOString().slice(0, 10));
    if (!fs.existsSync(dateDir)) fs.mkdirSync(dateDir, { recursive: true });
    cb(null, dateDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  },
});
```

- [ ] **步骤 2：在 `export default router;` 之前添加图片路由**

```js
// ── 上层物品图片接口 ──

// POST /api/upper-items/:itemId/images — 上传图片
router.post('/:itemId/images', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const [[item]] = await pool.query('SELECT id FROM upper_items WHERE id = ? AND deleted_at IS NULL', [req.params.itemId]);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const imageId = randomUUID();
    const relativePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');

    await pool.query(
      `INSERT INTO upper_item_images (id, item_id, image_path, original_name, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [imageId, req.params.itemId, relativePath, req.file.originalname, req.file.mimetype, req.file.size]
    );

    const [[img]] = await pool.query('SELECT * FROM upper_item_images WHERE id = ?', [imageId]);
    res.status(201).json(img);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/upper-items/:itemId/images — 获取物品图片列表
router.get('/:itemId/images', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM upper_item_images WHERE item_id = ? ORDER BY created_at ASC',
      [req.params.itemId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/upper-items/images/:imageId — 删除图片
router.delete('/images/:imageId', authenticate, async (req, res) => {
  try {
    const [[img]] = await pool.query('SELECT * FROM upper_item_images WHERE id = ?', [req.params.imageId]);
    if (!img) return res.status(404).json({ error: 'Image not found' });

    const filePath = path.join(__dirname, '..', img.image_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM upper_item_images WHERE id = ?', [req.params.imageId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Multer 错误处理中间件 ──
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message?.includes('图片') || err.message?.includes('image')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || '服务器错误' });
});
```

- [ ] **步骤 3：提交**

```bash
git add server/routes/upperItems.js
git commit -m "feat: 添加上层物品图片上传API"
```

---

### 任务 3：添加 `UpperItemImage` 类型和 API 函数

**涉及文件：**
- 修改：`src/app/types.ts`
- 修改：`src/app/api.ts`

- [ ] **步骤 1：在 types.ts 中添加 UpperItemImage 接口**

在 `BoxImage` 接口之后（约第150行后）添加：

```ts
export interface UpperItemImage {
  id: string;
  item_id: string;
  image_path: string;
  original_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}
```

- [ ] **步骤 2：更新 api.ts 的 import**

将 `api.ts` 第2行：

```ts
import type { UpperItem, Drawer, Box, BoxImage, BoxCell, SampleRecord, Tube } from './types';
```

改为：

```ts
import type { UpperItem, Drawer, Box, BoxImage, UpperItemImage, BoxCell, SampleRecord, Tube } from './types';
```

- [ ] **步骤 3：在 `deleteUpperItem` 之后（约第353行后）添加 API 函数**

```ts
// ── 上层物品图片 ──

export async function fetchUpperItemImages(itemId: string): Promise<UpperItemImage[]> {
  return fetchJSON(`${BASE}/upper-items/${encodeURIComponent(itemId)}/images`);
}

export async function uploadUpperItemImage(itemId: string, file: File): Promise<UpperItemImage> {
  const formData = new FormData();
  formData.append('image', file);
  const token = localStorage.getItem('biofridge_token');
  const res = await fetch(`${BASE}/upper-items/${encodeURIComponent(itemId)}/images`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteUpperItemImage(imageId: string): Promise<void> {
  await fetchJSON(`${BASE}/upper-items/images/${encodeURIComponent(imageId)}`, { method: 'DELETE' });
}
```

- [ ] **步骤 4：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -40
```

预期：无新增类型错误。

- [ ] **步骤 5：提交**

```bash
git add src/app/types.ts src/app/api.ts
git commit -m "feat: 添加 UpperItemImage 类型和上层物品图片 API 函数"
```

---

### 任务 4：在 AddItemModal 中添加图片区域（含拖拽）

**涉及文件：**
- 修改：`src/app/components/AddItemModal.tsx`
- 修改：`src/app/components/DrawerFridgeView.tsx:1460-1468`
- 修改：`src/app/components/ShelfFridgeView.tsx:218-227`
- 修改：`src/app/components/RootAdminPanel.tsx:1418-1434`

- [ ] **步骤 1：更新 import 和辅助类型**

替换 `AddItemModal.tsx` 的第1-11行：

```tsx
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
```

- [ ] **步骤 2：将 onSave 属性改为 async 并返回保存后的数据**

将第22行：

```tsx
  onSave: (data: Partial<UpperItem>) => void;
```

改为：

```tsx
  onSave: (data: Partial<UpperItem>) => Promise<UpperItem | undefined>;
```

- [ ] **步骤 3：在现有 state 声明后（第47行后）添加图片相关状态**

```tsx
  const [images, setImages] = useState<UpperItemImage[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingItemImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
```

- [ ] **步骤 4：在现有 useEffect 之后添加加载图片的 useEffect**

```tsx
  useEffect(() => {
    if (isOpen && editItem?.id) {
      fetchUpperItemImages(editItem.id).then(setImages).catch(() => setImages([]));
    } else {
      setImages([]);
      setPendingImages([]);
    }
  }, [isOpen, editItem?.id]);
```

- [ ] **步骤 5：在 handleSubmit 之前（约第65行前）添加图片处理函数**

```tsx
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
    const itemId = editItem?.id;
    if (!itemId) {
      setPendingImages((prev) => [
        ...prev,
        ...files.map((file) => ({
          id: generateTempId(`${file.name}-${file.lastModified}`),
          file,
          previewUrl: URL.createObjectURL(file),
          originalName: file.name,
        })),
      ]);
      return;
    }

    setUploading(true);
    Promise.all(files.map((file) => uploadUpperItemImage(itemId, file)))
      .then((uploaded) => setImages((prev) => [...prev, ...uploaded]))
      .catch((err: any) => setError(err.message || '图片上传失败'))
      .finally(() => setUploading(false));
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
```

- [ ] **步骤 6：将 handleSubmit 改为 async，保存后上传待处理图片**

替换原来的 handleSubmit（第65-90行）：

```tsx
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

    if (!editItem?.id && saved?.id && pendingImages.length > 0) {
      try {
        await Promise.all(pendingImages.map((img) => uploadUpperItemImage(saved.id, img.file)));
      } catch (err: any) {
        console.error('上层物品图片保存后上传失败:', err);
      }
    }
    clearPendingImages();
    handleClose();
  };
```

- [ ] **步骤 7：在备注 textarea 之后（约第227行后）插入图片区域 JSX**

```tsx
          <div className="space-y-2 rounded-xl p-3" style={{ background: 'var(--app-input-bg)', border: '1px solid var(--app-input-border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>物品图片</span>
              <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] min-h-[36px]"
                style={{ background: '#2563eb', color: '#fff' }}>
                <Upload size={14} />
                {uploading ? '上传中...' : '上传图片'}
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} className="hidden" />
              </label>
              {!editItem?.id && pendingImages.length > 0 && (
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
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--app-card-bg)', border: '1px dashed var(--app-border)', color: 'var(--app-muted)' }}>
                  <ImageIcon size={16} />
                  <span className="text-[12px]">{editItem?.id ? '可上传或拖拽图片到此处' : '可先选择或拖拽图片，保存后自动上传'}</span>
                </div>
              )}
            </div>
          </div>
```

- [ ] **步骤 8：在 Dialog 关闭前添加图片预览遮罩层**

在 `</form>` 之后、`</ResponsiveDialogContent>` 之前添加：

```tsx
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
```

- [ ] **步骤 9：将原有 `onClose` 调用替换为 `handleClose`**

第99行 dialog 的 onOpenChange：

```tsx
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => { if (!open) { setError(''); handleClose(); } }}>
```

取消按钮（第287-288行）：

```tsx
              type="button"
              onClick={handleClose}
```

- [ ] **步骤 10：更新三个调用方，让 onSave 返回保存后的数据**

`DrawerFridgeView.tsx` 中修改 `handleSaveItem`（约第425-435行）：

```tsx
  const handleSaveItem = useCallback(async (data: Partial<UpperItem>): Promise<UpperItem | undefined> => {
    try {
      let saved: UpperItem | undefined;
      if (data.id && editItem) {
        await updateUpperItem(data.id, data);
        saved = { ...editItem, ...data };
      } else {
        saved = await createUpperItem(fridge.id, data);
      }
      const items = await fetchUpperItems(fridge.id);
      setUpperItems(items);
      onDataChanged?.();
      return saved;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }, [fridge.id, editItem, onDataChanged]);
```

`ShelfFridgeView.tsx` 中修改 `handleSaveItem`（约第123-133行）：

```tsx
  const handleSaveItem = useCallback(
    async (data: Partial<UpperItem>): Promise<UpperItem | undefined> => {
      try {
        let saved: UpperItem | undefined;
        if (data.id && editItem) {
          await updateUpperItem(data.id, data);
          saved = { ...editItem, ...data };
        } else {
          saved = await createUpperItem(fridge.id, data);
        }
        const nextItems = await fetchUpperItems(fridge.id);
        setItems(nextItems);
        onItemsChange?.(nextItems);
        return saved;
      } catch (err: any) {
        console.error(err);
        return undefined;
      }
    },
    [editItem, fridge.id, setItems, onItemsChange],
  );
```

`RootAdminPanel.tsx` 中修改内联 `onSave`（约第1429-1434行）：

```tsx
          onSave={async (data) => {
            if (!editingUpperItem) return undefined;
            try {
              await updateAdminUpperItem(editingUpperItem.id, data);
              setAdminUpperItems((prev) => prev.map((i) => i.id === editingUpperItem.id ? { ...i, ...data } : i));
              onNotify('物品已更新', 'success');
              return { ...editingUpperItem, ...data } as UpperItem;
            } catch (err: any) {
              console.error(err);
              return undefined;
            }
          }}
```

- [ ] **步骤 11：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -40
```

预期：无新增类型错误。

- [ ] **步骤 12：提交**

```bash
git add src/app/components/AddItemModal.tsx src/app/components/DrawerFridgeView.tsx src/app/components/ShelfFridgeView.tsx src/app/components/RootAdminPanel.tsx
git commit -m "feat: AddItemModal 支持图片上传和拖拽上传"
```

---

### 任务 5：ItemCard 中展示首张图片缩略图

**涉及文件：**
- 修改：`src/app/components/ItemCard.tsx`

- [ ] **步骤 1：更新 import**

```tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useDrag } from 'react-dnd';
import { Package, User, Grid3X3, Trash2 } from 'lucide-react';
import { UpperItem, getItemTypeConfig, UpperItemImage } from '../types';
import { fetchUpperItemImages } from '../api';
```

- [ ] **步骤 2：添加图片加载逻辑**

在 `const typeConfig = ...` 之后添加：

```tsx
  const [firstImage, setFirstImage] = useState<UpperItemImage | null>(null);

  useEffect(() => {
    if (item.id) {
      fetchUpperItemImages(item.id)
        .then((imgs) => setFirstImage(imgs.length > 0 ? imgs[0] : null))
        .catch(() => setFirstImage(null));
    }
  }, [item.id]);
```

- [ ] **步骤 3：在数量和负责人之间插入缩略图**

在数量展示 `<div>` 之后、负责人 `<div>` 之前（约第77行后）插入：

```tsx
      {firstImage && (
        <div className="mt-2 mb-1 w-full h-24 rounded-lg overflow-hidden" style={{ border: '1px solid var(--app-border)' }}>
          <img src={`/${firstImage.image_path}`} alt={firstImage.original_name || item.name} className="w-full h-full object-cover" />
        </div>
      )}
```

- [ ] **步骤 4：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **步骤 5：提交**

```bash
git add src/app/components/ItemCard.tsx
git commit -m "feat: ItemCard 展示上层物品首张图片缩略图"
```

---

### 任务 6：为 AddBoxModal 添加拖拽上传

**涉及文件：**
- 修改：`src/app/components/AddBoxModal.tsx`

- [ ] **步骤 1：添加 dragOver 状态**

在 `const [previewImage, setPreviewImage] = ...` 之后（第74行后）添加：

```tsx
  const [dragOver, setDragOver] = useState(false);
```

- [ ] **步骤 2：在 handleSubmit 之前添加拖拽处理函数**

```tsx
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
    if (files.length === 0) return;

    const boxId = editBox?.id;
    if (!boxId) {
      setPendingImages((prev) => [
        ...prev,
        ...files.map((file) => ({
          id: generateTempId(`${file.name}-${file.lastModified}`),
          file,
          previewUrl: URL.createObjectURL(file),
          originalName: file.name,
        })),
      ]);
      return;
    }

    setUploading(true);
    Promise.all(files.map((file) => uploadBoxImage(boxId, file)))
      .then((uploaded) => {
        setImages((prev) => [...prev, ...uploaded]);
        onImagesChanged?.(boxId);
      })
      .catch((err: any) => setError(err.message || '图片上传失败'))
      .finally(() => setUploading(false));
  };
```

- [ ] **步骤 3：在图片缩略图区域外包裹拖拽容器**

在图片区域的 header 行和缩略图/空状态之间插入拖拽容器。将原有的条件渲染（约第427-493行）从：

```tsx
            {images.length > 0 || pendingImages.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                ...缩略图（不变）...
              </div>
            ) : (
              <div ...>空状态</div>
            )}
```

改为：

```tsx
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
                  ...缩略图（不变）...
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--app-card-bg)', border: '1px dashed var(--app-border)', color: 'var(--app-muted)' }}>
                  <ImageIcon size={16} />
                  <span className="text-[12px]">{editBox?.id ? '可上传或拖拽图片到此处' : '可先选择或拖拽图片，保存盒子后自动上传'}</span>
                </div>
              )}
            </div>
```

- [ ] **步骤 4：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **步骤 5：提交**

```bash
git add src/app/components/AddBoxModal.tsx
git commit -m "feat: AddBoxModal 图片区域支持拖拽上传"
```

---

### 最终验证

- [ ] 启动服务端并测试：
  1. 新建上层物品 → 选择/拖拽图片 → 保存 → 确认 ItemCard 中显示缩略图
  2. 编辑已有上层物品 → 直接上传图片 → 确认实时显示
  3. 删除上层物品图片
  4. AddBoxModal 中拖拽图片到图片区域 → 确认上传成功
  5. AddItemModal 中拖拽图片到图片区域 → 确认上传成功
