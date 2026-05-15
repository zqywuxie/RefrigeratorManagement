# Feature A: Sample-Tube-Well Grouping System

## Summary
One sample → multiple tubes → multiple well positions. Tubes belonging to the same sample share a group color and highlight together.

## Data Model

### sample_records
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | UUID |
| patient_name | VARCHAR(200) NOT NULL | 姓名 (required) |
| sample_code | VARCHAR(200) NOT NULL | 编号 (required) |
| source | VARCHAR(200) | 样本来源 |
| sample_type | VARCHAR(100) | 样本类型 |
| collection_stage | VARCHAR(100) | 采集阶段 |
| collected_at | DATETIME | 采集时间 |
| tags | JSON | |
| note | TEXT | 备注 |
| group_color | VARCHAR(20) | Auto-assigned hex color |
| uploader | VARCHAR(100) | Auto-set to current user |
| created_at / updated_at / deleted_at / deleted_by | | Standard |

### tubes
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | UUID |
| sample_id | VARCHAR(36) FK | → sample_records(id) CASCADE |
| tube_label | VARCHAR(50) | Auto: Tube1, Tube2, ... |
| box_id | VARCHAR(36) FK | → boxes(id) CASCADE |
| position | INT | Well position in box grid |
| barcode | VARCHAR(100) | |
| volume | VARCHAR(50) | |
| status | ENUM | normal/warning/critical/used/pending |
| note | TEXT | |
| UNIQUE | (box_id, position) | One tube per position |

### Migration
Existing box_cells → migrate each cell to: 1 sample_record + 1 tube.

## API Routes
- `GET /api/sample-records?box_id=` — List sample records (optionally filtered by box)
- `POST /api/sample-records` — Create sample with tubes at positions
- `PUT /api/sample-records/:id` — Update sample fields
- `DELETE /api/sample-records/:id` — Soft delete sample + all tubes
- `GET /api/boxes/:boxId/tubes` — Get tubes for a box (replaces box_cells)
- `POST /api/sample-records/:id/tubes` — Add tube(s) to existing sample
- `PUT /api/tubes/:id` — Update tube
- `DELETE /api/tubes/:id` — Remove tube from position
- `PUT /api/sample-records/batch` — Batch update multiple samples

## Frontend

### Types
- `SampleRecord` — patient info + group color + tubes[]
- `Tube` — single well position, linked to sample

### Group Color Palette
12 colors assigned round-robin: #3b82f6, #ef4444, #22c55e, #f59e0b, #8b5cf6, #ec4899, #06b6d4, #f97316, #84cc16, #14b8a6, #e11d48, #6366f1

### Multi-Selection in BoxGrid
- Toggle "多选模式" button
- In multi-select mode, clicking positions toggles selection (highlighted border)
- Selected positions are bound to one sample → auto-generate tubes
- Same-sample positions share group color

### Grouped Visualization
- Tubes of same sample: same background tint, same left-border accent
- Hovering one tube pulses all sibling tubes
- Optional glow/connection effect
