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
}

export interface SubSample {
  id: string;
  name: string;
  type: SampleType;
  status: SampleStatus;
  temperature: number;
  collectedAt: string;
  patientId: string;
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

export const UPPER_CAPACITY = compartmentCapacity(DEFAULT_COMPARTMENT_GRIDS.upper);
export const LOWER_CAPACITY = compartmentCapacity(DEFAULT_COMPARTMENT_GRIDS.lower);

export const DEFAULT_SAMPLE_TYPES: SampleType[] = ['血清', '血浆', '尿液', 'DNA', '组织', '全血'];

export const STATUS_CONFIG: Record<
  SampleStatus,
  { label: string; color: string; bgColor: string; borderColor: string; glowColor: string }
> = {
  normal: {
    label: '正常',
    color: '#93c5fd',
    bgColor: 'rgba(29,78,216,0.9)',
    borderColor: '#3b82f6',
    glowColor: 'rgba(59,130,246,0.55)',
  },
  warning: {
    label: '温度异常',
    color: '#fcd34d',
    bgColor: 'rgba(180,83,9,0.9)',
    borderColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.55)',
  },
  critical: {
    label: '严重异常',
    color: '#fca5a5',
    bgColor: 'rgba(153,27,27,0.9)',
    borderColor: '#ef4444',
    glowColor: 'rgba(239,68,68,0.65)',
  },
  used: {
    label: '已使用',
    color: '#9ca3af',
    bgColor: 'rgba(55,65,81,0.9)',
    borderColor: '#6b7280',
    glowColor: 'rgba(107,114,128,0.3)',
  },
  pending: {
    label: '待处理',
    color: '#c4b5fd',
    bgColor: 'rgba(91,33,182,0.9)',
    borderColor: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.55)',
  },
};
