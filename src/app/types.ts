export type SampleStatus = 'normal' | 'warning' | 'critical' | 'used' | 'pending';
export type SampleType = '血清' | '血浆' | '尿液' | 'DNA' | '组织' | '全血';
export type Compartment = 'upper' | 'lower';

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

export const SAMPLE_TYPES: SampleType[] = ['血清', '血浆', '尿液', 'DNA', '组织', '全血'];

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

export const INITIAL_SAMPLES: Sample[] = [
  {
    id: 'S-001',
    name: '全血样本容器 001',
    type: '全血',
    status: 'normal',
    temperature: -20,
    collectedAt: '2026-04-15',
    patientId: 'P-2024-001',
    tags: ['紧急', 'A型'],
    compartment: 'upper',
    position: 0,
    volume: '5ml',
    note: '手术前采集，状态良好',
    gridRows: 2,
    gridCols: 2,
    subSamples: [
      {
        id: 'SS-001',
        name: '全血副样本 001-A',
        type: '全血',
        status: 'normal',
        temperature: -20,
        collectedAt: '2026-04-15',
        patientId: 'P-2024-001',
        tags: ['原液'],
        position: 0,
        volume: '3ml',
      },
      {
        id: 'SS-002',
        name: '全血副样本 001-B',
        type: '全血',
        status: 'warning',
        temperature: -18,
        collectedAt: '2026-04-15',
        patientId: 'P-2024-001',
        tags: ['稀释'],
        position: 1,
        volume: '2ml',
        note: '轻微溶血',
      },
    ],
  },
  {
    id: 'S-002',
    name: '血清样本容器 002',
    type: '血清',
    status: 'warning',
    temperature: -18,
    collectedAt: '2026-04-20',
    patientId: 'P-2024-015',
    tags: ['常规'],
    compartment: 'upper',
    position: 1,
    volume: '3ml',
    note: '温度偏高，需持续关注',
    gridRows: 2,
    gridCols: 2,
    subSamples: [
      {
        id: 'SS-003',
        name: '血清副样本 002-A',
        type: '血清',
        status: 'normal',
        temperature: -20,
        collectedAt: '2026-04-20',
        patientId: 'P-2024-015',
        tags: ['常规'],
        position: 0,
        volume: '1.5ml',
      },
    ],
  },
  {
    id: 'S-003',
    name: 'DNA样本容器 003',
    type: 'DNA',
    status: 'critical',
    temperature: -15,
    collectedAt: '2026-04-22',
    patientId: 'P-2024-032',
    tags: ['基因检测', '紧急'],
    compartment: 'upper',
    position: 3,
    volume: '2ml',
    note: '⚠️ 温度严重偏高！需立即处理',
    gridRows: 2,
    gridCols: 2,
    subSamples: [
      {
        id: 'SS-004',
        name: 'DNA副样本 003-A',
        type: 'DNA',
        status: 'critical',
        temperature: -15,
        collectedAt: '2026-04-22',
        patientId: 'P-2024-032',
        tags: ['基因检测'],
        position: 0,
        volume: '1ml',
        note: '温度异常',
      },
      {
        id: 'SS-005',
        name: 'DNA副样本 003-B',
        type: 'DNA',
        status: 'warning',
        temperature: -17,
        collectedAt: '2026-04-22',
        patientId: 'P-2024-032',
        tags: ['备份'],
        position: 1,
        volume: '1ml',
      },
    ],
  },
  {
    id: 'S-004',
    name: '尿液样本容器 004',
    type: '尿液',
    status: 'used',
    temperature: 4,
    collectedAt: '2026-04-18',
    patientId: 'P-2024-008',
    tags: ['常规检查'],
    compartment: 'lower',
    position: 0,
    volume: '10ml',
    note: '已完成常规检测',
    gridRows: 2,
    gridCols: 2,
    subSamples: [
      {
        id: 'SS-006',
        name: '尿液副样本 004-A',
        type: '尿液',
        status: 'used',
        temperature: 4,
        collectedAt: '2026-04-18',
        patientId: 'P-2024-008',
        tags: ['已检测'],
        position: 0,
        volume: '5ml',
      },
    ],
  },
  {
    id: 'S-005',
    name: '血浆样本容器 005',
    type: '血浆',
    status: 'pending',
    temperature: 4,
    collectedAt: '2026-05-01',
    patientId: 'P-2024-088',
    tags: ['待检测'],
    compartment: 'lower',
    position: 2,
    volume: '4ml',
    note: '等待科室处理指令',
    gridRows: 2,
    gridCols: 2,
    subSamples: [],
  },
  {
    id: 'S-006',
    name: '组织样本容器 006',
    type: '组织',
    status: 'normal',
    temperature: -20,
    collectedAt: '2026-05-03',
    patientId: 'P-2024-099',
    tags: ['活检', '肿瘤科'],
    compartment: 'upper',
    position: 4,
    volume: '0.5g',
    note: '活检组织，保存完好',
    gridRows: 2,
    gridCols: 2,
    subSamples: [
      {
        id: 'SS-007',
        name: '组织副样本 006-A',
        type: '组织',
        status: 'normal',
        temperature: -20,
        collectedAt: '2026-05-03',
        patientId: 'P-2024-099',
        tags: ['切片A'],
        position: 0,
        volume: '0.2g',
      },
      {
        id: 'SS-008',
        name: '组织副样本 006-B',
        type: '组织',
        status: 'normal',
        temperature: -20,
        collectedAt: '2026-05-03',
        patientId: 'P-2024-099',
        tags: ['切片B'],
        position: 1,
        volume: '0.3g',
      },
    ],
  },
];
