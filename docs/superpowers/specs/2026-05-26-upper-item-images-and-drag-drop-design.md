# Upper Item Images + Drag-and-Drop Upload Design

**Date:** 2026-05-26

## Goal

1. Add image upload support for upper items (same pattern as box images)
2. Add drag-and-drop support to both box and upper item image upload areas

## Architecture

Follow the exact same pattern as the existing box image system. No new abstractions — mirror the proven approach. The box image drag-and-drop enhancement goes directly into AddBoxModal and AddItemModal respectively, keeping each component self-contained.

## Backend

### Database: `upper_item_images` table

```sql
CREATE TABLE upper_item_images (
  id VARCHAR(36) PRIMARY KEY,
  item_id VARCHAR(36) NOT NULL,
  image_path VARCHAR(500) NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES upper_items(id) ON DELETE CASCADE
);
```

### API endpoints (in `server/routes/upperItems.js`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/upper-items/:itemId/images` | Yes | Upload image (multer, multipart) |
| GET | `/api/upper-items/:itemId/images` | No | List images for an item |
| DELETE | `/api/upper-items/images/:imageId` | Yes | Delete image |

Multer config: same as boxes — 16MB limit, image/* filter, date-based subdirectory under `server/uploads/upper-item-images/`.

## Frontend

### API layer (`src/app/api.ts`)

Three new functions: `fetchUpperItemImages`, `uploadUpperItemImage`, `deleteUpperItemImage` — identical pattern to box image functions.

### AddItemModal

Add an image section below the note textarea, before the box mode section. Pattern identical to AddBoxModal's image section:
- New item: queue images locally (`pendingImages`), upload after save
- Edit item: upload immediately on selection
- Thumbnail grid + click-to-preview + delete button

### ItemCard

Show the first image thumbnail if the item has images. Compact, below the owner line.

### Drag-and-drop

Add to both AddBoxModal and AddItemModal image sections:
- `onDragOver` / `onDrop` handlers on the image area container
- Visual feedback: border highlight + "释放以上传" text during drag
- Extract files from `e.dataTransfer.files`, pipe into existing upload logic
- No new abstractions — inline event handlers per component

## Type Changes

New `UpperItemImage` interface in `types.ts`, mirroring `BoxImage` but with `item_id` instead of `box_id`.
