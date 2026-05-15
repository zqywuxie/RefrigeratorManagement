# Drawer Freezer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement drawer freezer UI with upper open storage, two drawer layers (6+15), box management, and fine-grained cell grids.

**Architecture:** New database tables (upper_items, drawers, boxes, box_cells) power the new UI components. Backend API routes follow existing Express patterns. Frontend uses progressive breadcrumb navigation through fridge → drawer → box levels. Existing fridge/sample code preserved for backward compatibility.

**Tech Stack:** React 18, Tailwind CSS 4, shadcn/ui, react-dnd, motion, Express, MySQL

---

### Task 1: Database Schema Migration

**Files:**
- Modify: `server/schemaMigrations.js:1-74`

- [ ] **Step 1: Add migration logic for new tables + fridge_type column**

Add after the existing `ensureColumn` calls in `runSchemaMigrations` (before the root user insert):

```js
  // ── Drawer Freezer support ──
  await ensureColumn('refrigerators', 'fridge_type', "`fridge_type` ENUM('drawer','shelf') DEFAULT 'drawer' AFTER `lower_temperature`");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS upper_items (
      id VARCHAR(36) PRIMARY KEY,
      refrigerator_id VARCHAR(36) NOT NULL,
      row_number INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      item_type ENUM('试剂','样本','耗材','临时物品') NOT NULL DEFAULT '样本',
      quantity INT DEFAULT 1,
      owner VARCHAR(100),
      tags JSON,
      note TEXT,
      image_url VARCHAR(500),
      qr_code VARCHAR(200),
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      FOREIGN KEY (refrigerator_id) REFERENCES refrigerators(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS drawers (
      id VARCHAR(36) PRIMARY KEY,
      refrigerator_id VARCHAR(36) NOT NULL,
      layer INT NOT NULL,
      row_pos INT NOT NULL,
      col_pos INT NOT NULL,
      label VARCHAR(50),
      max_boxes INT DEFAULT 10,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (refrigerator_id) REFERENCES refrigerators(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS boxes (
      id VARCHAR(36) PRIMARY KEY,
      drawer_id VARCHAR(36) NOT NULL,
      name VARCHAR(200) NOT NULL,
      mode ENUM('precise','simple') DEFAULT 'simple',
      grid_rows INT DEFAULT NULL,
      grid_cols INT DEFAULT NULL,
      sample_type VARCHAR(100),
      project_name VARCHAR(200),
      quantity INT DEFAULT 0,
      owner VARCHAR(100),
      tags JSON,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      FOREIGN KEY (drawer_id) REFERENCES drawers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS box_cells (
      id VARCHAR(36) PRIMARY KEY,
      box_id VARCHAR(36) NOT NULL,
      position INT NOT NULL,
      barcode VARCHAR(100),
      sample_name VARCHAR(200),
      sample_status ENUM('normal','warning','critical','used','pending') DEFAULT 'normal',
      note TEXT,
      FOREIGN KEY (box_id) REFERENCES boxes(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_box_position (box_id, position)
    ) ENGINE=InnoDB
  `);
```

- [ ] **Step 2: Restart server to run migrations**

Run: `cd server && node -e "import('./schemaMigrations.js').then(m => m.runSchemaMigrations()).then(() => { console.log('Migrations complete'); process.exit(0); })"`

- [ ] **Step 3: Commit**

```bash
git add server/schemaMigrations.js
git commit -m "feat: add drawer freezer tables and fridge_type column"
```

---

### Task 2: Drawer Auto-Generation + API Routes

**Files:**
- Create: `server/routes/drawers.js`
- Modify: `server/routes/refrigerators.js`
- Modify: `server/index.js`

- [ ] **Step 1: Add drawer auto-generation on fridge create**

In `server/routes/refrigerators.js`, find the POST handler. After the `INSERT INTO refrigerators` call, add drawer bootstrap logic. Read the current file first to locate exact insertion point.

The drawer layout constants and generation function:

```js
const DRAWER_LAYOUTS = [
  { layer: 1, rows: 2, cols: 3 },
  { layer: 2, rows: 5, cols: 3 },
];
const LAYER1_LABELS = [['A1','A2','A3'], ['B1','B2','B3']];
const LAYER2_LABELS = [
  ['C1','C2','C3'], ['D1','D2','D3'], ['E1','E2','E3'], ['F1','F2','F3'], ['G1','G2','G3']
];

async function createDrawersForFridge(conn, fridgeId) {
  for (const layout of DRAWER_LAYOUTS) {
    const labels = layout.layer === 1 ? LAYER1_LABELS : LAYER2_LABELS;
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const id = `drawer-${fridgeId}-L${layout.layer}-R${r}C${c}`;
        await conn.query(
          `INSERT INTO drawers (id, refrigerator_id, layer, row_pos, col_pos, label)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, fridgeId, layout.layer, r, c, labels[r][c]]
        );
      }
    }
  }
}
```

Modify the POST handler to call `createDrawersForFridge` after fridge insert (only for `fridge_type='drawer'`). The fridge creation body should accept `fridgeType` (default `'drawer'`).

- [ ] **Step 2: Create drawers API router**

Create `server/routes/drawers.js`:

```js
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/refrigerators/:fridgeId/drawers
router.get('/:fridgeId/drawers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, COUNT(b.id) as box_count
       FROM drawers d
       LEFT JOIN boxes b ON b.drawer_id = d.id AND b.deleted_at IS NULL
       WHERE d.refrigerator_id = ?
       GROUP BY d.id
       ORDER BY d.layer, d.row_pos, d.col_pos`,
      [req.params.fridgeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drawers/:drawerId/boxes
router.get('/:drawerId/boxes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM boxes WHERE drawer_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [req.params.drawerId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drawers/:drawerId/boxes
router.post('/:drawerId/boxes', async (req, res) => {
  try {
    const { id, name, mode, gridRows, gridCols, sampleType, projectName, quantity, owner, tags, note } = req.body;
    const boxId = id || `box-${Date.now()}`;
    await pool.query(
      `INSERT INTO boxes (id, drawer_id, name, mode, grid_rows, grid_cols, sample_type, project_name, quantity, owner, tags, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [boxId, req.params.drawerId, name, mode || 'simple', gridRows || null, gridCols || null, sampleType, projectName, quantity || 0, owner, JSON.stringify(tags || []), note]
    );
    const [[box]] = await pool.query('SELECT * FROM boxes WHERE id = ?', [boxId]);
    res.status(201).json(box);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/boxes/:boxId
router.put('/boxes/:boxId', async (req, res) => {
  try {
    const { name, mode, gridRows, gridCols, sampleType, projectName, quantity, owner, tags, note } = req.body;
    await pool.query(
      `UPDATE boxes SET name=?, mode=?, grid_rows=?, grid_cols=?, sample_type=?, project_name=?, quantity=?, owner=?, tags=?, note=? WHERE id=?`,
      [name, mode, gridRows || null, gridCols || null, sampleType, projectName, quantity, owner, JSON.stringify(tags || []), note, req.params.boxId]
    );
    const [[box]] = await pool.query('SELECT * FROM boxes WHERE id = ?', [req.params.boxId]);
    res.json(box);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/boxes/:boxId (soft delete)
router.delete('/boxes/:boxId', async (req, res) => {
  try {
    await pool.query('UPDATE boxes SET deleted_at = NOW() WHERE id = ?', [req.params.boxId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/boxes/:boxId/cells
router.get('/boxes/:boxId/cells', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM box_cells WHERE box_id = ? ORDER BY position`,
      [req.params.boxId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/boxes/:boxId/cells
router.post('/boxes/:boxId/cells', async (req, res) => {
  try {
    const { id, position, barcode, sampleName, sampleStatus, note } = req.body;
    const cellId = id || `cell-${Date.now()}`;
    await pool.query(
      `INSERT INTO box_cells (id, box_id, position, barcode, sample_name, sample_status, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cellId, req.params.boxId, position, barcode, sampleName, sampleStatus || 'normal', note]
    );
    const [[cell]] = await pool.query('SELECT * FROM box_cells WHERE id = ?', [cellId]);
    res.status(201).json(cell);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cells/:cellId
router.put('/cells/:cellId', async (req, res) => {
  try {
    const { barcode, sampleName, sampleStatus, note } = req.body;
    await pool.query(
      `UPDATE box_cells SET barcode=?, sample_name=?, sample_status=?, note=? WHERE id=?`,
      [barcode, sampleName, sampleStatus, note, req.params.cellId]
    );
    const [[cell]] = await pool.query('SELECT * FROM box_cells WHERE id = ?', [req.params.cellId]);
    res.json(cell);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cells/:cellId
router.delete('/cells/:cellId', async (req, res) => {
  try {
    await pool.query('DELETE FROM box_cells WHERE id = ?', [req.params.cellId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 3: Wire routes in server/index.js**

Add after the existing route mounts:
```js
import drawersRouter from './routes/drawers.js';
// ...
app.use('/api/refrigerators', drawersRouter);
app.use('/api/drawers', drawersRouter);
app.use('/api/boxes', drawersRouter);
app.use('/api/cells', drawersRouter);
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/drawers.js server/routes/refrigerators.js server/index.js
git commit -m "feat: add drawer, box, cell API routes with drawer auto-generation"
```

---

### Task 3: Upper Items API Routes

**Files:**
- Create: `server/routes/upperItems.js`
- Modify: `server/index.js`

- [ ] **Step 1: Create upper items router**

Create `server/routes/upperItems.js`:

```js
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/refrigerators/:fridgeId/upper-items
router.get('/:fridgeId/upper-items', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM upper_items WHERE refrigerator_id = ? AND deleted_at IS NULL ORDER BY row_number, sort_order`,
      [req.params.fridgeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/refrigerators/:fridgeId/upper-items
router.post('/:fridgeId/upper-items', async (req, res) => {
  try {
    const { id, rowNumber, name, itemType, quantity, owner, tags, note, imageUrl, qrCode, sortOrder } = req.body;
    const itemId = id || `ui-${Date.now()}`;
    await pool.query(
      `INSERT INTO upper_items (id, refrigerator_id, row_number, name, item_type, quantity, owner, tags, note, image_url, qr_code, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, req.params.fridgeId, rowNumber || 1, name, itemType || '样本', quantity || 1, owner, JSON.stringify(tags || []), note, imageUrl || null, qrCode || null, sortOrder || 0]
    );
    const [[item]] = await pool.query('SELECT * FROM upper_items WHERE id = ?', [itemId]);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/upper-items/:itemId
router.put('/:itemId', async (req, res) => {
  try {
    const { name, itemType, rowNumber, quantity, owner, tags, note, imageUrl, qrCode, sortOrder } = req.body;
    await pool.query(
      `UPDATE upper_items SET name=?, item_type=?, row_number=?, quantity=?, owner=?, tags=?, note=?, image_url=?, qr_code=?, sort_order=? WHERE id=?`,
      [name, itemType, rowNumber, quantity, owner, JSON.stringify(tags || []), note, imageUrl, qrCode, sortOrder, req.params.itemId]
    );
    const [[item]] = await pool.query('SELECT * FROM upper_items WHERE id = ?', [req.params.itemId]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/upper-items/:itemId (soft delete)
router.delete('/:itemId', async (req, res) => {
  try {
    await pool.query('UPDATE upper_items SET deleted_at = NOW() WHERE id = ?', [req.params.itemId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: Wire in server/index.js**

```js
import upperItemsRouter from './routes/upperItems.js';
// ...
app.use('/api/refrigerators', upperItemsRouter);
app.use('/api/upper-items', upperItemsRouter);
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/upperItems.js server/index.js
git commit -m "feat: add upper items API routes"
```

---

### Task 4: Frontend Types Update

**Files:**
- Modify: `src/app/types.ts`

- [ ] **Step 1: Add new types**

Add after the existing type definitions in `src/app/types.ts`:

```ts
// ── Drawer Freezer Types ──

export type FridgeType = 'drawer' | 'shelf';
export type ItemType = '试剂' | '样本' | '耗材' | '临时物品';
export type BoxMode = 'precise' | 'simple';

export interface UpperItem {
  id: string;
  refrigerator_id: string;
  row_number: number;
  name: string;
  item_type: ItemType;
  quantity: number;
  owner: string | null;
  tags: string[];
  note: string | null;
  image_url: string | null;
  qr_code: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Drawer {
  id: string;
  refrigerator_id: string;
  layer: number;
  row_pos: number;
  col_pos: number;
  label: string;
  max_boxes: number;
  box_count?: number;
  created_at: string;
}

export interface Box {
  id: string;
  drawer_id: string;
  name: string;
  mode: BoxMode;
  grid_rows: number | null;
  grid_cols: number | null;
  sample_type: string | null;
  project_name: string | null;
  quantity: number;
  owner: string | null;
  tags: string[];
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoxCell {
  id: string;
  box_id: string;
  position: number;
  barcode: string | null;
  sample_name: string | null;
  sample_status: SampleStatus;
  note: string | null;
}

export const ITEM_TYPE_CONFIG: Record<ItemType, { label: string; color: string; bgColor: string }> = {
  '试剂': { label: '试剂', color: '#1d4ed8', bgColor: '#dbeafe' },
  '样本': { label: '样本', color: '#15803d', bgColor: '#dcfce7' },
  '耗材': { label: '耗材', color: '#92400e', bgColor: '#fef3c7' },
  '临时物品': { label: '临时', color: '#6d28d9', bgColor: '#ede9fe' },
};

export function getOccupancyRate(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

export function getOccupancyColor(rate: number): { bg: string; border: string } {
  if (rate <= 25) return { bg: 'rgba(34,197,94,0.12)', border: '#22c55e60' };
  if (rate <= 50) return { bg: 'rgba(59,130,246,0.12)', border: '#3b82f660' };
  if (rate <= 80) return { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b60' };
  return { bg: 'rgba(239,68,68,0.12)', border: '#ef444460' };
}

export const DRAWER_LAYER1 = { layer: 1, rows: 2, cols: 3 };
export const DRAWER_LAYER2 = { layer: 2, rows: 5, cols: 3 };
export const LAYER1_LABELS = [['A1','A2','A3'], ['B1','B2','B3']];
export const LAYER2_LABELS = [['C1','C2','C3'], ['D1','D2','D3'], ['E1','E2','E3'], ['F1','F2','F3'], ['G1','G2','G3']];

export const BOX_GRID_PRESETS = [
  { label: '10×10', rows: 10, cols: 10 },
  { label: '9×9', rows: 9, cols: 9 },
  { label: '8×12', rows: 8, cols: 12 },
  { label: '自定义', rows: 0, cols: 0 },
];

export function cellPositionToLabel(pos: number, cols: number): string {
  const row = Math.floor(pos / cols);
  const col = pos % cols;
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}
```

Also add `fridge_type` to the existing `Refrigerator` interface:
```ts
export interface Refrigerator {
  id: string;
  name: string;
  description?: string;
  fridge_type: FridgeType;
  upperRows: number;
  upperCols: number;
  lowerRows: number;
  lowerCols: number;
  upperTemperature: number;
  lowerTemperature: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/types.ts
git commit -m "feat: add drawer freezer TypeScript types"
```

---

### Task 5: Frontend API Layer

**Files:**
- Modify: `src/app/api.ts`

- [ ] **Step 1: Add API functions**

Add these functions after the existing exports in `src/app/api.ts`:

```ts
import type { UpperItem, Drawer, Box, BoxCell } from './types';

// ── Upper Items ──

export async function fetchUpperItems(fridgeId: string): Promise<UpperItem[]> {
  return fetchJSON(`${BASE}/refrigerators/${encodeURIComponent(fridgeId)}/upper-items`);
}

export async function createUpperItem(fridgeId: string, data: Partial<UpperItem>): Promise<UpperItem> {
  return fetchJSON(`${BASE}/refrigerators/${encodeURIComponent(fridgeId)}/upper-items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUpperItem(itemId: string, data: Partial<UpperItem>): Promise<UpperItem> {
  return fetchJSON(`${BASE}/upper-items/${encodeURIComponent(itemId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUpperItem(itemId: string): Promise<void> {
  await fetchJSON(`${BASE}/upper-items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}

// ── Drawers ──

export async function fetchDrawers(fridgeId: string): Promise<Drawer[]> {
  return fetchJSON(`${BASE}/refrigerators/${encodeURIComponent(fridgeId)}/drawers`);
}

// ── Boxes ──

export async function fetchBoxes(drawerId: string): Promise<Box[]> {
  return fetchJSON(`${BASE}/drawers/${encodeURIComponent(drawerId)}/boxes`);
}

export async function createBox(drawerId: string, data: Partial<Box>): Promise<Box> {
  return fetchJSON(`${BASE}/drawers/${encodeURIComponent(drawerId)}/boxes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBox(boxId: string, data: Partial<Box>): Promise<Box> {
  return fetchJSON(`${BASE}/boxes/${encodeURIComponent(boxId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBox(boxId: string): Promise<void> {
  await fetchJSON(`${BASE}/boxes/${encodeURIComponent(boxId)}`, { method: 'DELETE' });
}

// ── Box Cells ──

export async function fetchBoxCells(boxId: string): Promise<BoxCell[]> {
  return fetchJSON(`${BASE}/boxes/${encodeURIComponent(boxId)}/cells`);
}

export async function createBoxCell(boxId: string, data: Partial<BoxCell>): Promise<BoxCell> {
  return fetchJSON(`${BASE}/boxes/${encodeURIComponent(boxId)}/cells`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBoxCell(cellId: string, data: Partial<BoxCell>): Promise<BoxCell> {
  return fetchJSON(`${BASE}/cells/${encodeURIComponent(cellId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBoxCell(cellId: string): Promise<void> {
  await fetchJSON(`${BASE}/cells/${encodeURIComponent(cellId)}`, { method: 'DELETE' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api.ts
git commit -m "feat: add drawer freezer API client functions"
```

---

### Task 6: BreadcrumbNav Component

**Files:**
- Create: `src/app/components/BreadcrumbNav.tsx`

- [ ] **Step 1: Create BreadcrumbNav**

```tsx
import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbNode {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbNavProps {
  nodes: BreadcrumbNode[];
}

export function BreadcrumbNav({ nodes }: BreadcrumbNavProps) {
  return (
    <nav
      className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-[14px]"
      style={{
        background: 'var(--app-card-bg)',
        border: '1px solid var(--app-border)',
        boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
      }}
    >
      <Home size={16} color="var(--app-muted)" className="flex-shrink-0" />
      {nodes.map((node, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={14} color="var(--app-muted)" className="flex-shrink-0" />
          {node.onClick ? (
            <button
              onClick={node.onClick}
              className="hover:underline cursor-pointer truncate max-w-[200px]"
              style={{ color: '#60a5fa' }}
            >
              {node.label}
            </button>
          ) : (
            <span className="truncate max-w-[200px]" style={{ color: 'var(--app-text)' }}>
              {node.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/BreadcrumbNav.tsx
git commit -m "feat: add BreadcrumbNav component"
```

---

### Task 7: UpperOpenStorage + ItemCard Components

**Files:**
- Create: `src/app/components/UpperOpenStorage.tsx`
- Create: `src/app/components/ItemCard.tsx`

- [ ] **Step 1: Create ItemCard**

Create `src/app/components/ItemCard.tsx`:

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { useDrag } from 'react-dnd';
import { Package, User, Calendar } from 'lucide-react';
import { UpperItem, ITEM_TYPE_CONFIG } from '../types';

interface ItemCardProps {
  item: UpperItem;
  isHighlighted: boolean;
  onClick: () => void;
}

export function ItemCard({ item, isHighlighted, onClick }: ItemCardProps) {
  const typeConfig = ITEM_TYPE_CONFIG[item.item_type] || ITEM_TYPE_CONFIG['样本'];

  const [{ isDragging }, drag] = useDrag({
    type: 'UPPER_ITEM',
    item: { id: item.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <motion.button
      ref={drag}
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      animate={{ opacity: isDragging ? 0.4 : 1 }}
      className="flex-shrink-0 rounded-xl px-4 py-3 text-left cursor-pointer transition-shadow"
      style={{
        width: '200px',
        background: 'var(--app-card-bg)',
        border: isHighlighted
          ? '2px solid #3b82f6'
          : `1.5px solid var(--app-border)`,
        boxShadow: isHighlighted ? '0 0 12px rgba(59,130,246,0.3)' : '0 4px 16px rgba(15,23,42,0.06)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Package size={16} color={typeConfig.color} />
        <span className="text-[14px] font-medium truncate" style={{ color: 'var(--app-text)' }}>
          {item.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] px-2 py-0.5 rounded-full"
          style={{ background: typeConfig.bgColor, color: typeConfig.color }}
        >
          {typeConfig.label}
        </span>
        <span className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
          ×{item.quantity}
        </span>
      </div>
      {item.owner && (
        <div className="flex items-center gap-1 mt-1.5 text-[11px]" style={{ color: 'var(--app-muted)' }}>
          <User size={11} />
          <span>{item.owner}</span>
        </div>
      )}
    </motion.button>
  );
}
```

- [ ] **Step 2: Create UpperOpenStorage**

Create `src/app/components/UpperOpenStorage.tsx`:

```tsx
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Plus } from 'lucide-react';
import { UpperItem, ITEM_TYPE_CONFIG, ItemType } from '../types';
import { ItemCard } from './ItemCard';

interface UpperOpenStorageProps {
  items: UpperItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onItemClick: (id: string) => void;
  onAddItem: (rowNumber: number) => void;
}

const ALL_ITEM_TYPES: (ItemType | 'all')[] = ['all', '试剂', '样本', '耗材', '临时物品'];

export function UpperOpenStorage({
  items,
  searchQuery,
  onSearchChange,
  onItemClick,
  onAddItem,
}: UpperOpenStorageProps) {
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all');

  const filtered = items.filter((item) => {
    if (filterType !== 'all' && item.item_type !== filterType) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.item_type.includes(q) ||
      (item.owner || '').toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const row1Items = filtered.filter((i) => i.row_number === 1);
  const row2Items = filtered.filter((i) => i.row_number === 2);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
          上层开放存储
        </h3>
        <div className="flex items-center gap-2">
          {/* Type filter chips */}
          {ALL_ITEM_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="text-[11px] px-2 py-1 rounded-full transition-all"
              style={{
                background: filterType === t
                  ? t === 'all'
                    ? '#e2e8f0'
                    : ITEM_TYPE_CONFIG[t]?.bgColor || '#e2e8f0'
                  : 'var(--app-subtle-bg)',
                border: filterType === t ? '1px solid var(--app-border)' : '1px solid transparent',
                color: filterType === t
                  ? t === 'all'
                    ? '#475569'
                    : ITEM_TYPE_CONFIG[t]?.color
                  : 'var(--app-muted)',
              }}
            >
              {t === 'all' ? '全部' : ITEM_TYPE_CONFIG[t]?.label || t}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{
          background: 'var(--app-input-bg)',
          border: '1px solid var(--app-input-border)',
        }}
      >
        <Search size={16} color="var(--app-muted)" />
        <input
          type="text"
          placeholder="搜索上层物品..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{ color: 'var(--app-text)' }}
        />
      </div>

      {/* Row 1 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>第 1 行 · {row1Items.length} 件</span>
          <button
            onClick={() => onAddItem(1)}
            className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-lg hover:opacity-80"
            style={{ color: '#2563eb' }}
          >
            <Plus size={14} />添加
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {row1Items.length === 0 ? (
            <PlaceholderCard onClick={() => onAddItem(1)} />
          ) : (
            row1Items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isHighlighted={searchQuery.length > 0}
                onClick={() => onItemClick(item.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px]" style={{ color: 'var(--app-muted)' }}>第 2 行 · {row2Items.length} 件</span>
          <button
            onClick={() => onAddItem(2)}
            className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-lg hover:opacity-80"
            style={{ color: '#2563eb' }}
          >
            <Plus size={14} />添加
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {row2Items.length === 0 ? (
            <PlaceholderCard onClick={() => onAddItem(2)} />
          ) : (
            row2Items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isHighlighted={searchQuery.length > 0}
                onClick={() => onItemClick(item.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceholderCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className="flex-shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer"
      style={{
        width: '200px',
        height: '88px',
        borderColor: 'var(--slot-empty-border)',
        background: 'var(--slot-empty-bg)',
        color: 'var(--app-muted)',
      }}
    >
      <Plus size={18} />
      <span className="text-[13px]">添加物品</span>
    </motion.button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/ItemCard.tsx src/app/components/UpperOpenStorage.tsx
git commit -m "feat: add UpperOpenStorage and ItemCard components"
```

---

### Task 8: DrawerLayer + DrawerSlot Components

**Files:**
- Create: `src/app/components/DrawerLayer.tsx`
- Create: `src/app/components/DrawerSlot.tsx`

- [ ] **Step 1: Create DrawerSlot**

Create `src/app/components/DrawerSlot.tsx`:

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { Package, Clock } from 'lucide-react';
import { Drawer, getOccupancyRate, getOccupancyColor } from '../types';

interface DrawerSlotProps {
  drawer: Drawer;
  onClick: () => void;
}

export function DrawerSlot({ drawer, onClick }: DrawerSlotProps) {
  const boxCount = drawer.box_count ?? 0;
  const rate = getOccupancyRate(boxCount, drawer.max_boxes);
  const oc = getOccupancyColor(rate);

  const statusLabel =
    rate > 80 ? '满载' : rate > 50 ? '过半' : rate > 25 ? '使用中' : boxCount > 0 ? '少量' : '空闲';
  const statusColor =
    rate > 80 ? '#ef4444' : rate > 50 ? '#f59e0b' : rate > 25 ? '#3b82f6' : boxCount > 0 ? '#22c55e' : 'var(--app-muted)';

  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="relative rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer overflow-hidden"
      style={{
        aspectRatio: '1 / 1',
        background: oc.bg,
        border: `1.5px solid ${oc.border}`,
        boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
      }}
    >
      {/* Heatmap background fill from bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-500"
        style={{
          height: `${rate}%`,
          background: `linear-gradient(0deg, ${oc.border}40, transparent)`,
        }}
      />

      {/* Label */}
      <span className="relative z-10 text-[20px] font-mono font-bold" style={{ color: 'var(--app-text)' }}>
        {drawer.label}
      </span>

      {/* Box count */}
      <div className="relative z-10 flex items-center gap-1">
        <Package size={13} color={statusColor} />
        <span className="text-[13px] font-mono" style={{ color: statusColor }}>
          {boxCount}/{drawer.max_boxes}
        </span>
      </div>

      {/* Status label */}
      <span className="relative z-10 text-[11px]" style={{ color: statusColor }}>
        {statusLabel}
      </span>
    </motion.button>
  );
}
```

- [ ] **Step 2: Create DrawerLayer**

Create `src/app/components/DrawerLayer.tsx`:

```tsx
import React from 'react';
import { Drawer } from '../types';
import { DrawerSlot } from './DrawerSlot';

interface DrawerLayerProps {
  layer: number;
  label: string;
  rows: number;
  cols: number;
  drawers: Drawer[];
  onDrawerClick: (drawerId: string) => void;
}

export function DrawerLayer({ layer, label, rows, cols, drawers, onDrawerClick }: DrawerLayerProps) {
  const grid: (Drawer | undefined)[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = drawers.find((d) => d.row_pos === r && d.col_pos === c);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
        {label}
      </h3>
      <div
        className="grid gap-2.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, auto)`,
        }}
      >
        {grid.flat().map((drawer, i) =>
          drawer ? (
            <DrawerSlot
              key={drawer.id}
              drawer={drawer}
              onClick={() => onDrawerClick(drawer.id)}
            />
          ) : (
            <div key={`empty-${i}`} style={{ aspectRatio: '1/1' }} />
          ),
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/DrawerSlot.tsx src/app/components/DrawerLayer.tsx
git commit -m "feat: add DrawerLayer and DrawerSlot components"
```

---

### Task 9: BoxView + BoxCard Components

**Files:**
- Create: `src/app/components/BoxView.tsx`
- Create: `src/app/components/BoxCard.tsx`

- [ ] **Step 1: Create BoxCard**

Create `src/app/components/BoxCard.tsx`:

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { Box as BoxIcon, User, Calendar, Grid3X3 } from 'lucide-react';
import { Box, formatChineseShortDate } from '../types';

interface BoxCardProps {
  box: Box;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export function BoxCard({ box, onClick, onDelete }: BoxCardProps) {
  const isPrecise = box.mode === 'precise';
  const gridLabel = isPrecise && box.grid_rows && box.grid_cols
    ? `${box.grid_rows}×${box.grid_cols}`
    : null;

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative w-full rounded-xl px-4 py-3.5 text-left cursor-pointer"
      style={{
        background: 'var(--app-card-bg)',
        border: '1.5px solid var(--app-border)',
        boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <BoxIcon size={18} color={isPrecise ? '#2563eb' : '#94a3b8'} />
            <span className="text-[15px] font-medium truncate" style={{ color: 'var(--app-text)' }}>
              {box.name}
            </span>
            {isPrecise && gridLabel && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded"
                style={{ background: '#dbeafe', color: '#1d4ed8' }}
              >
                <Grid3X3 size={11} className="inline mr-0.5" />
                {gridLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[12px]" style={{ color: 'var(--app-muted)' }}>
            {box.sample_type && <span>{box.sample_type}</span>}
            {box.project_name && <span>{box.project_name}</span>}
            <span>×{box.quantity}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: 'var(--app-muted)' }}>
            {box.owner && (
              <span className="flex items-center gap-1">
                <User size={11} />{box.owner}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={11} />{formatChineseShortDate(box.created_at)}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(box.id); }}
          className="flex-shrink-0 px-2 py-1 rounded text-[11px] hover:bg-red-500/10"
          style={{ color: '#f87171' }}
        >
          删除
        </button>
      </div>

      {box.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {box.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--app-subtle-bg)',
                color: 'var(--app-subtle-text)',
                border: '1px solid var(--app-subtle-border)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {box.note && (
        <p className="mt-1.5 text-[12px] truncate" style={{ color: 'var(--app-muted)' }}>
          {box.note}
        </p>
      )}
    </motion.button>
  );
}
```

- [ ] **Step 2: Create BoxView**

Create `src/app/components/BoxView.tsx`:

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { Plus, ArrowLeft } from 'lucide-react';
import { Box } from '../types';
import { BoxCard } from './BoxCard';

interface BoxViewProps {
  drawerLabel: string;
  boxes: Box[];
  onBack: () => void;
  onBoxClick: (boxId: string) => void;
  onAddBox: () => void;
  onDeleteBox: (boxId: string) => void;
}

export function BoxView({ drawerLabel, boxes, onBack, onBoxClick, onAddBox, onDeleteBox }: BoxViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[14px] hover:opacity-80"
          style={{ color: '#60a5fa' }}
        >
          <ArrowLeft size={18} />
          返回抽屉列表
        </button>
        <span className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
          抽屉 {drawerLabel} · {boxes.length} 盒
        </span>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddBox}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[14px]"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            border: '1px solid #3b82f6',
            color: '#fff',
            boxShadow: '0 14px 32px rgba(37,99,235,0.2)',
          }}
        >
          <Plus size={18} />
          添加盒子
        </motion.button>
      </div>

      {boxes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl py-16"
          style={{
            background: 'var(--app-card-bg)',
            border: '2px dashed var(--slot-empty-border)',
          }}
        >
          <span style={{ color: 'var(--app-muted)' }}>此抽屉为空</span>
          <button
            onClick={onAddBox}
            className="text-[14px] px-4 py-2 rounded-lg"
            style={{ color: '#2563eb' }}
          >
            + 添加第一个盒子
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {boxes.map((box) => (
            <BoxCard
              key={box.id}
              box={box}
              onClick={() => onBoxClick(box.id)}
              onDelete={onDeleteBox}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/BoxCard.tsx src/app/components/BoxView.tsx
git commit -m "feat: add BoxView and BoxCard components"
```

---

### Task 10: BoxGrid + CellSlot Components

**Files:**
- Create: `src/app/components/BoxGrid.tsx`
- Create: `src/app/components/CellSlot.tsx`

- [ ] **Step 1: Create CellSlot**

Create `src/app/components/CellSlot.tsx`:

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { BoxCell, STATUS_CONFIG, cellPositionToLabel } from '../types';

interface CellSlotProps {
  cell?: BoxCell;
  position: number;
  cols: number;
  isHighlighted: boolean;
  onClick: () => void;
}

export function CellSlot({ cell, position, cols, isHighlighted, onClick }: CellSlotProps) {
  const label = cellPositionToLabel(position, cols);
  const config = cell ? STATUS_CONFIG[cell.sample_status] : null;

  return (
    <motion.button
      whileHover={{ scale: cell ? 1.1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative w-full flex flex-col items-center justify-center gap-0.5 cursor-pointer"
      style={{
        aspectRatio: '1 / 1',
        borderRadius: '6px',
        border: isHighlighted
          ? '2px solid #3b82f6'
          : cell
            ? `1.5px solid ${config!.borderColor}60`
            : '1.5px dashed var(--slot-empty-border)',
        background: cell
          ? config!.bgColor
          : 'var(--slot-empty-bg)',
        boxShadow: isHighlighted ? '0 0 8px rgba(59,130,246,0.4)' : 'none',
      }}
      animate={isHighlighted ? { boxShadow: ['0 0 4px rgba(59,130,246,0.2)', '0 0 14px rgba(59,130,246,0.5)', '0 0 4px rgba(59,130,246,0.2)'] } : {}}
      transition={isHighlighted ? { repeat: Infinity, duration: 1.2 } : {}}
    >
      {cell && (
        <>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: config!.borderColor }} />
          <span className="text-[9px] font-mono" style={{ color: config!.color }}>
            {label}
          </span>
        </>
      )}
      {!cell && (
        <span className="text-[9px]" style={{ color: 'var(--app-muted)' }}>
          {label}
        </span>
      )}
    </motion.button>
  );
}
```

- [ ] **Step 2: Create BoxGrid**

Create `src/app/components/BoxGrid.tsx`:

```tsx
import React from 'react';
import { ArrowLeft, FlaskConical, Thermometer, Grid3X3 } from 'lucide-react';
import { Box, BoxCell, STATUS_CONFIG } from '../types';
import { CellSlot } from './CellSlot';

interface BoxGridProps {
  box: Box;
  cells: BoxCell[];
  matchedCellIds: Set<string>;
  onBack: () => void;
  onCellClick: (position: number) => void;
}

export function BoxGrid({ box, cells, matchedCellIds, onBack, onCellClick }: BoxGridProps) {
  const rows = box.grid_rows || 10;
  const cols = box.grid_cols || 10;
  const capacity = rows * cols;
  const filledCount = cells.length;

  const getCellAt = (pos: number) => cells.find((c) => c.position === pos);

  const statusCounts = cells.reduce((acc, c) => {
    acc[c.sample_status] = (acc[c.sample_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[14px] hover:opacity-80"
          style={{ color: '#60a5fa' }}
        >
          <ArrowLeft size={18} />
          返回盒子列表
        </button>
        <span className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
          {box.name}
        </span>
        <div className="flex items-center gap-1">
          <Grid3X3 size={14} color="var(--app-muted)" />
          <span className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
            {rows}×{cols}
          </span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {Object.keys(STATUS_CONFIG).map((status) => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          return (
            <span
              key={status}
              className="text-[12px] px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: config.bgColor, color: config.color, border: `1px solid ${config.borderColor}60` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.borderColor }} />
              {config.label} ×{count}
            </span>
          );
        })}
        <span className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
          {filledCount}/{capacity} 占用
        </span>
      </div>

      {/* Grid */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--app-card-bg)',
          border: '1px solid var(--app-border)',
          boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
        }}
      >
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, auto)`,
          }}
        >
          {Array.from({ length: capacity }, (_, i) => {
            const cell = getCellAt(i);
            return (
              <CellSlot
                key={`cell-${i}`}
                cell={cell}
                position={i}
                cols={cols}
                isHighlighted={cell ? matchedCellIds.has(cell.id) : false}
                onClick={() => onCellClick(i)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/CellSlot.tsx src/app/components/BoxGrid.tsx
git commit -m "feat: add BoxGrid and CellSlot components"
```

---

### Task 11: AddItemModal + AddBoxModal

**Files:**
- Create: `src/app/components/AddItemModal.tsx`
- Create: `src/app/components/AddBoxModal.tsx`

- [ ] **Step 1: Create AddItemModal**

Create `src/app/components/AddItemModal.tsx`:

```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { UpperItem, ItemType, ITEM_TYPE_CONFIG } from '../types';

interface AddItemModalProps {
  isOpen: boolean;
  editItem?: UpperItem | null;
  defaultRow: number;
  onClose: () => void;
  onSave: (data: Partial<UpperItem>) => void;
}

export function AddItemModal({ isOpen, editItem, defaultRow, onClose, onSave }: AddItemModalProps) {
  const [name, setName] = useState(editItem?.name || '');
  const [itemType, setItemType] = useState<ItemType>(editItem?.item_type || '样本');
  const [quantity, setQuantity] = useState(editItem?.quantity || 1);
  const [owner, setOwner] = useState(editItem?.owner || '');
  const [note, setNote] = useState(editItem?.note || '');
  const [rowNumber, setRowNumber] = useState(editItem?.row_number || defaultRow);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: editItem?.id, name: name.trim(), item_type: itemType, quantity, owner: owner || null, note: note || null, row_number: rowNumber, tags: editItem?.tags || [] });
    onClose();
  };

  const fieldStyle: React.CSSProperties = {
    background: 'var(--app-input-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-text)',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.form
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{
              background: 'var(--app-header-bg)',
              border: '1px solid var(--app-border)',
              boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[18px]" style={{ color: 'var(--app-text)' }}>
                {editItem ? '编辑物品' : '添加物品'}
              </h3>
              <button type="button" onClick={onClose}>
                <X size={18} color="var(--app-muted)" />
              </button>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="物品名称"
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
              style={fieldStyle}
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as ItemType)}
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              >
                {Object.entries(ITEM_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <select
                value={rowNumber}
                onChange={(e) => setRowNumber(Number(e.target.value))}
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              >
                <option value={1}>第 1 行</option>
                <option value={2}>第 2 行</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="数量"
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              />
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="负责人"
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
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

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-[14px]"
                style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)', border: '1px solid var(--app-border)' }}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-[14px]"
                style={{ background: '#2563eb', color: '#fff' }}
              >
                保存
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Create AddBoxModal**

Create `src/app/components/AddBoxModal.tsx`:

```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Box, BoxMode, BOX_GRID_PRESETS } from '../types';

interface AddBoxModalProps {
  isOpen: boolean;
  editBox?: Box | null;
  onClose: () => void;
  onSave: (data: Partial<Box>) => void;
}

export function AddBoxModal({ isOpen, editBox, onClose, onSave }: AddBoxModalProps) {
  const [name, setName] = useState(editBox?.name || '');
  const [mode, setMode] = useState<BoxMode>(editBox?.mode || 'simple');
  const [gridPreset, setGridPreset] = useState(0);
  const [customRows, setCustomRows] = useState(editBox?.grid_rows || 10);
  const [customCols, setCustomCols] = useState(editBox?.grid_cols || 10);
  const [sampleType, setSampleType] = useState(editBox?.sample_type || '');
  const [projectName, setProjectName] = useState(editBox?.project_name || '');
  const [quantity, setQuantity] = useState(editBox?.quantity || 0);
  const [owner, setOwner] = useState(editBox?.owner || '');
  const [note, setNote] = useState(editBox?.note || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const isPrecise = mode === 'precise';
    const preset = BOX_GRID_PRESETS[gridPreset];
    const finalRows = isPrecise ? (preset.rows || customRows) : null;
    const finalCols = isPrecise ? (preset.cols || customCols) : null;
    onSave({
      id: editBox?.id,
      name: name.trim(),
      mode,
      grid_rows: finalRows,
      grid_cols: finalCols,
      sample_type: sampleType || null,
      project_name: projectName || null,
      quantity,
      owner: owner || null,
      note: note || null,
      tags: editBox?.tags || [],
    });
    onClose();
  };

  const fieldStyle: React.CSSProperties = {
    background: 'var(--app-input-bg)',
    border: '1px solid var(--app-input-border)',
    color: 'var(--app-text)',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.form
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{
              background: 'var(--app-header-bg)',
              border: '1px solid var(--app-border)',
              boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[18px]" style={{ color: 'var(--app-text)' }}>
                {editBox ? '编辑盒子' : '添加盒子'}
              </h3>
              <button type="button" onClick={onClose}>
                <X size={18} color="var(--app-muted)" />
              </button>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="盒子名称"
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
              style={fieldStyle}
            />

            {/* Mode selector */}
            <div className="flex gap-2">
              {(['simple', 'precise'] as BoxMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="flex-1 py-2 rounded-lg text-[14px] transition-all"
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

            {/* Grid presets (only for precise mode) */}
            {mode === 'precise' && (
              <div className="flex gap-2 flex-wrap">
                {BOX_GRID_PRESETS.map((preset, i) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setGridPreset(i)}
                    className="text-[12px] px-3 py-1 rounded-lg transition-all"
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
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={customRows}
                  onChange={(e) => setCustomRows(Number(e.target.value))}
                  placeholder="行数"
                  className="px-3 py-2 rounded-lg text-[14px] outline-none"
                  style={fieldStyle}
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={customCols}
                  onChange={(e) => setCustomCols(Number(e.target.value))}
                  placeholder="列数"
                  className="px-3 py-2 rounded-lg text-[14px] outline-none"
                  style={fieldStyle}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <input
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
                placeholder="样本类型"
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              />
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="项目名称"
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="数量"
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
                style={fieldStyle}
              />
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="负责人"
                className="px-3 py-2 rounded-lg text-[14px] outline-none"
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

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-[14px]"
                style={{ background: 'var(--app-panel-bg)', color: 'var(--app-muted)', border: '1px solid var(--app-border)' }}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-[14px]"
                style={{ background: '#2563eb', color: '#fff' }}
              >
                保存
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/AddItemModal.tsx src/app/components/AddBoxModal.tsx
git commit -m "feat: add AddItemModal and AddBoxModal components"
```

---

### Task 12: DrawerFridgeView — Main Integration Component

**Files:**
- Create: `src/app/components/DrawerFridgeView.tsx`

- [ ] **Step 1: Create DrawerFridgeView**

Create `src/app/components/DrawerFridgeView.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Refrigerator, UpperItem, Drawer, Box, BoxCell, DRAWER_LAYER1, DRAWER_LAYER2 } from '../types';
import {
  fetchUpperItems, createUpperItem, updateUpperItem, deleteUpperItem,
  fetchDrawers,
  fetchBoxes, createBox, updateBox, deleteBox,
  fetchBoxCells, createBoxCell, updateBoxCell, deleteBoxCell,
} from '../api';
import { BreadcrumbNav, BreadcrumbNode } from './BreadcrumbNav';
import { UpperOpenStorage } from './UpperOpenStorage';
import { DrawerLayer } from './DrawerLayer';
import { BoxView } from './BoxView';
import { BoxGrid } from './BoxGrid';
import { AddItemModal } from './AddItemModal';
import { AddBoxModal } from './AddBoxModal';

type ViewLevel = 'fridge' | 'drawer' | 'box';

interface DrawerFridgeViewProps {
  fridge: Refrigerator;
  currentUser: string;
}

export function DrawerFridgeView({ fridge, currentUser }: DrawerFridgeViewProps) {
  // ── View state ──
  const [viewLevel, setViewLevel] = useState<ViewLevel>('fridge');
  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null);
  const [selectedDrawerLabel, setSelectedDrawerLabel] = useState('');
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);

  // ── Data state ──
  const [upperItems, setUpperItems] = useState<UpperItem[]>([]);
  const [drawers, setDrawers] = useState<Drawer[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [cells, setCells] = useState<BoxCell[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCellQuery, setSearchCellQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Modal state ──
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<UpperItem | null>(null);
  const [defaultItemRow, setDefaultItemRow] = useState(1);
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [editBox, setEditBox] = useState<Box | null>(null);

  // ── Load upper items + drawers on mount ──
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchUpperItems(fridge.id).catch(() => [] as UpperItem[]),
      fetchDrawers(fridge.id).catch(() => [] as Drawer[]),
    ]).then(([items, drawerData]) => {
      setUpperItems(items);
      setDrawers(drawerData);
      setLoading(false);
    });
  }, [fridge.id]);

  // ── Load boxes when a drawer is selected ──
  useEffect(() => {
    if (!selectedDrawerId) return;
    setLoading(true);
    fetchBoxes(selectedDrawerId)
      .then(setBoxes)
      .catch(() => setBoxes([]))
      .finally(() => setLoading(false));
  }, [selectedDrawerId]);

  // ── Load cells when a box is selected (precise mode) ──
  useEffect(() => {
    if (!selectedBox || selectedBox.mode !== 'precise') {
      setCells([]);
      return;
    }
    fetchBoxCells(selectedBox.id)
      .then(setCells)
      .catch(() => setCells([]));
  }, [selectedBox]);

  // ── Matched cell IDs ──
  const matchedCellIds = React.useMemo(() => {
    if (!searchCellQuery.trim()) return new Set<string>();
    const q = searchCellQuery.toLowerCase();
    return new Set(
      cells
        .filter((c) =>
          (c.barcode || '').toLowerCase().includes(q) ||
          (c.sample_name || '').toLowerCase().includes(q) ||
          (c.note || '').toLowerCase().includes(q)
        )
        .map((c) => c.id)
    );
  }, [cells, searchCellQuery]);

  // ── Navigation ──
  const handleDrawerClick = useCallback((drawerId: string) => {
    const drawer = drawers.find((d) => d.id === drawerId);
    setSelectedDrawerId(drawerId);
    setSelectedDrawerLabel(drawer?.label || '');
    setSelectedBoxId(null);
    setSelectedBox(null);
    setViewLevel('drawer');
    setSearchCellQuery('');
  }, [drawers]);

  const handleBoxClick = useCallback((boxId: string) => {
    const box = boxes.find((b) => b.id === boxId) || null;
    setSelectedBoxId(boxId);
    setSelectedBox(box);
    setViewLevel('box');
  }, [boxes]);

  const handleBackToFridge = useCallback(() => {
    setViewLevel('fridge');
    setSelectedDrawerId(null);
    setSelectedBoxId(null);
    setSelectedBox(null);
    setSearchCellQuery('');
  }, []);

  const handleBackToDrawer = useCallback(() => {
    setViewLevel('drawer');
    setSelectedBoxId(null);
    setSelectedBox(null);
    setSearchCellQuery('');
  }, []);

  // ── Breadcrumb ──
  const breadcrumbNodes: BreadcrumbNode[] = [{ label: fridge.name }];
  if (viewLevel === 'drawer' || viewLevel === 'box') {
    breadcrumbNodes.push({ label: `抽屉 ${selectedDrawerLabel}`, onClick: handleBackToDrawer });
  }
  if (viewLevel === 'box' && selectedBox) {
    breadcrumbNodes.push({ label: selectedBox.name });
  }

  // ── Item handlers ──
  const handleSaveItem = useCallback(async (data: Partial<UpperItem>) => {
    try {
      if (data.id && editItem) {
        await updateUpperItem(data.id, data);
      } else {
        await createUpperItem(fridge.id, data);
      }
      const items = await fetchUpperItems(fridge.id);
      setUpperItems(items);
    } catch (err: any) {
      console.error('Failed to save item:', err);
    }
  }, [fridge.id, editItem]);

  const handleItemClick = useCallback((itemId: string) => {
    const item = upperItems.find((i) => i.id === itemId) || null;
    setEditItem(item);
    setDefaultItemRow(item?.row_number || 1);
    setShowItemModal(true);
  }, [upperItems]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    try {
      await deleteUpperItem(itemId);
      setUpperItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  }, []);

  // ── Box handlers ──
  const handleSaveBox = useCallback(async (data: Partial<Box>) => {
    if (!selectedDrawerId) return;
    try {
      if (data.id && editBox) {
        await updateBox(data.id, data);
      } else {
        await createBox(selectedDrawerId, data);
      }
      const updatedBoxes = await fetchBoxes(selectedDrawerId);
      setBoxes(updatedBoxes);
    } catch (err: any) {
      console.error('Failed to save box:', err);
    }
  }, [selectedDrawerId, editBox]);

  const handleDeleteBox = useCallback(async (boxId: string) => {
    try {
      await deleteBox(boxId);
      setBoxes((prev) => prev.filter((b) => b.id !== boxId));
    } catch (err) {
      console.error('Failed to delete box:', err);
    }
  }, []);

  // ── Cell handler ──
  const handleCellClick = useCallback(async (position: number) => {
    if (!selectedBox || selectedBox.mode !== 'precise') return;
    const existing = cells.find((c) => c.position === position);
    if (existing) {
      // Edit existing cell - toggle status
      const nextStatus = existing.sample_status === 'used' ? 'normal' : 'used';
      try {
        await updateBoxCell(existing.id, { sample_status: nextStatus });
        setCells((prev) => prev.map((c) => c.id === existing.id ? { ...c, sample_status: nextStatus } : c));
      } catch (err) {
        console.error('Failed to update cell:', err);
      }
    } else {
      // Add new cell
      try {
        await createBoxCell(selectedBox.id, { position, sample_name: `样本 ${position + 1}`, sample_status: 'normal' });
        const updated = await fetchBoxCells(selectedBox.id);
        setCells(updated);
      } catch (err) {
        console.error('Failed to create cell:', err);
      }
    }
  }, [selectedBox, cells]);

  // ── Layout ──
  const layer1Drawers = drawers.filter((d) => d.layer === 1);
  const layer2Drawers = drawers.filter((d) => d.layer === 2);

  if (loading && !selectedDrawerId && upperItems.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <span style={{ color: 'var(--app-muted)' }}>加载中...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-[680px]">
      <BreadcrumbNav nodes={breadcrumbNodes} />

      <AnimatePresence mode="wait">
        {viewLevel === 'fridge' && (
          <motion.div
            key="fridge"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            {/* Upper open storage */}
            <UpperOpenStorage
              items={upperItems}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onItemClick={handleItemClick}
              onAddItem={(row) => { setEditItem(null); setDefaultItemRow(row); setShowItemModal(true); }}
            />

            {/* Shelf divider */}
            <div
              className="h-4 mx-2 rounded flex items-center justify-center"
              style={{
                background: 'var(--fridge-shelf-bg)',
                boxShadow: 'var(--fridge-shelf-shadow)',
              }}
            />

            {/* Drawer layers */}
            <DrawerLayer
              layer={1}
              label="第一层抽屉区"
              rows={DRAWER_LAYER1.rows}
              cols={DRAWER_LAYER1.cols}
              drawers={layer1Drawers}
              onDrawerClick={handleDrawerClick}
            />

            <DrawerLayer
              layer={2}
              label="第二层抽屉区"
              rows={DRAWER_LAYER2.rows}
              cols={DRAWER_LAYER2.cols}
              drawers={layer2Drawers}
              onDrawerClick={handleDrawerClick}
            />
          </motion.div>
        )}

        {viewLevel === 'drawer' && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BoxView
              drawerLabel={selectedDrawerLabel}
              boxes={boxes}
              onBack={handleBackToFridge}
              onBoxClick={handleBoxClick}
              onAddBox={() => { setEditBox(null); setShowBoxModal(true); }}
              onDeleteBox={handleDeleteBox}
            />
          </motion.div>
        )}

        {viewLevel === 'box' && selectedBox && (
          <motion.div
            key="box"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {selectedBox.mode === 'precise' ? (
              <div className="flex flex-col gap-3">
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{
                    background: 'var(--app-input-bg)',
                    border: '1px solid var(--app-input-border)',
                  }}
                >
                  <input
                    type="text"
                    placeholder="搜索样本条码、名称..."
                    value={searchCellQuery}
                    onChange={(e) => setSearchCellQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[14px]"
                    style={{ color: 'var(--app-text)' }}
                  />
                  {searchCellQuery && (
                    <span className="text-[12px]" style={{ color: '#2563eb' }}>
                      {matchedCellIds.size} 匹配
                    </span>
                  )}
                </div>
                <BoxGrid
                  box={selectedBox}
                  cells={cells}
                  matchedCellIds={matchedCellIds}
                  onBack={handleBackToDrawer}
                  onCellClick={handleCellClick}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleBackToDrawer}
                    className="flex items-center gap-1 text-[14px] hover:opacity-80"
                    style={{ color: '#60a5fa' }}
                  >
                    返回盒子列表
                  </button>
                </div>
                {/* Simple mode box detail card */}
                <div
                  className="rounded-xl p-6"
                  style={{
                    background: 'var(--app-card-bg)',
                    border: '1px solid var(--app-border)',
                    boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
                  }}
                >
                  <h3 className="text-[20px] font-medium mb-4" style={{ color: 'var(--app-text)' }}>
                    {selectedBox.name}
                  </h3>
                  <div className="space-y-2 text-[14px]" style={{ color: 'var(--app-muted)' }}>
                    {selectedBox.sample_type && <p>样本类型: {selectedBox.sample_type}</p>}
                    {selectedBox.project_name && <p>项目: {selectedBox.project_name}</p>}
                    <p>数量: {selectedBox.quantity}</p>
                    {selectedBox.owner && <p>负责人: {selectedBox.owner}</p>}
                    {selectedBox.note && <p>备注: {selectedBox.note}</p>}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AddItemModal
        isOpen={showItemModal}
        editItem={editItem}
        defaultRow={defaultItemRow}
        onClose={() => { setShowItemModal(false); setEditItem(null); }}
        onSave={handleSaveItem}
      />
      <AddBoxModal
        isOpen={showBoxModal}
        editBox={editBox}
        onClose={() => { setShowBoxModal(false); setEditBox(null); }}
        onSave={handleSaveBox}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/DrawerFridgeView.tsx
git commit -m "feat: add DrawerFridgeView integration component"
```

---

### Task 13: Wire into App.tsx

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/components/FridgeSelector.tsx`

- [ ] **Step 1: Update FridgeSelector to show fridge type badge**

In `FridgeSelector`, in the dropdown item display, add a small badge showing type after the name. Add to the selected fridge button display too.

- [ ] **Step 2: Update App.tsx to route to DrawerFridgeView for drawer-type fridges**

In `App.tsx`, import `DrawerFridgeView`. In the fridge rendering section, check `selectedFridge?.fridge_type`. If `'drawer'`, render `<DrawerFridgeView fridge={selectedFridge} currentUser={user!.username} />` instead of the old `<FridgeUnit>`.

- [ ] **Step 3: Run dev server and test manually at each level**

Run: `npm run dev`
Test: Create a drawer-type fridge, verify upper items, drawers, boxes, cells work.

- [ ] **Step 4: Commit**

```bash
git add src/app/App.tsx src/app/components/FridgeSelector.tsx
git commit -m "feat: wire DrawerFridgeView into App and FridgeSelector"
```

---

### Task 14: Dark Mode CSS Variables + Final Polish

**Files:**
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Ensure existing CSS variables work in dark mode**

Verify `.dark` block has all the `--app-*` variables. Add any missing ones if needed for new components.

- [ ] **Step 2: Commit**

```bash
git add src/styles/theme.css
git commit -m "style: verify dark mode CSS variables for drawer freezer"
```

---

### Task 15: E2E Smoke Test

**Files:**
- N/A (manual or Playwright)

- [ ] **Step 1: Manual verification checklist**

- [ ] Create a new drawer-type fridge → verify 21 drawers auto-generated
- [ ] Add 3 items to row 1 of upper storage → verify cards display
- [ ] Click drawer A1 → verify box view opens, breadcrumb updates
- [ ] Add a simple box → verify appears in list
- [ ] Click box → verify detail card
- [ ] Add a precise-mode box with 10×10 grid → click it → verify grid renders
- [ ] Click several cells → verify they toggle status
- [ ] Search box cells → verify highlight
- [ ] Navigate back via breadcrumb → verify at fridge level
- [ ] Toggle dark mode → verify all views render correctly
- [ ] Verify old fridge (no fridge_type) still works with legacy FridgeUnit

- [ ] **Step 2: Commit final fixes if any**

```bash
git add -A
git commit -m "fix: final polish for drawer freezer MVP"
```
