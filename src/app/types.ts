export type SampleStatus = 'normal' | 'warning' | 'critical' | 'used' | 'pending';
export type SampleType = string;
export type Compartment = 'upper' | 'lower';

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

export interface SubSample {
  id: string;
  name: string;
  type: SampleType;
  status: SampleStatus;
  temperature: number;
  collectedAt: string;
  patientId: string;
  uploader: string;
  createdBy?: string;
  tags: string[];
  position: number;
  note?: string;
  volume?: string;
}

export interface Sample {
  id: string;
  name: string;
  type: SampleType;
  status: SampleStatus;
  temperature: number;
  collectedAt: string;
  patientId: string;
  uploader: string;
  createdBy?: string;
  tags: string[];
  compartment: Compartment;
  position: number;
  note?: string;
  volume?: string;
  gridRows: number;
  gridCols: number;
  subSamples: SubSample[];
}

export interface CompartmentGridConfig {
  rows: number;
  cols: number;
}

export const GRID_MIN = 1;
export const GRID_MAX_ROWS = 5;
export const GRID_MAX_COLS = 5;

export const DEFAULT_COMPARTMENT_GRIDS: Record<Compartment, CompartmentGridConfig> = {
  upper: { rows: 2, cols: 3 },
  lower: { rows: 2, cols: 2 },
};

export function compartmentCapacity(config: CompartmentGridConfig): number {
  return config.rows * config.cols;
}

export function positionToGrid(pos: number, cols: number): { row: number; col: number } {
  return { row: Math.floor(pos / cols), col: pos % cols };
}

export function formatChineseShortDate(value?: string | null): string {
  if (!value) return '-';

  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year.slice(-2)}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;

  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export const UPPER_CAPACITY = compartmentCapacity(DEFAULT_COMPARTMENT_GRIDS.upper);
export const LOWER_CAPACITY = compartmentCapacity(DEFAULT_COMPARTMENT_GRIDS.lower);

export const DEFAULT_SAMPLE_TYPES: SampleType[] = ['血清', '血浆', '尿液', 'DNA', '组织', '全血'];

export const STATUS_CONFIG: Record<
  SampleStatus,
  { label: string; color: string; bgColor: string; borderColor: string; glowColor: string }
> = {
  normal: {
    label: '正常',
    color: '#1d4ed8',
    bgColor: '#dbeafe',
    borderColor: '#60a5fa',
    glowColor: 'rgba(37,99,235,0.22)',
  },
  warning: {
    label: '温度异常',
    color: '#92400e',
    bgColor: '#fef3c7',
    borderColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.22)',
  },
  critical: {
    label: '严重异常',
    color: '#b91c1c',
    bgColor: '#fee2e2',
    borderColor: '#ef4444',
    glowColor: 'rgba(239,68,68,0.24)',
  },
  used: {
    label: '已使用',
    color: '#475569',
    bgColor: '#e2e8f0',
    borderColor: '#94a3b8',
    glowColor: 'rgba(100,116,139,0.18)',
  },
  pending: {
    label: '待处理',
    color: '#6d28d9',
    bgColor: '#ede9fe',
    borderColor: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.22)',
  },
};

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
