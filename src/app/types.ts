export type SampleStatus = 'normal' | 'warning' | 'critical' | 'used' | 'pending';
export type SampleType = string;
export type Compartment = 'upper' | 'lower';

export interface Refrigerator {
  id: string;
  name: string;
  description?: string;
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
