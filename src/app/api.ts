import type { AuthUser } from './AuthContext';
import { Sample, SubSample } from './types';
import type { UpperItem, Drawer, Box, BoxCell, SampleRecord, Tube } from './types';

export interface RefrigeratorResponse {
  id: string;
  name: string;
  description: string | null;
  fridge_type: string | null;
  upper_rows: number;
  upper_cols: number;
  lower_rows: number;
  lower_cols: number;
  upper_temperature: number;
  lower_temperature: number;
  created_at: string;
  updated_at: string;
}

export interface AdminSummary {
  totals: {
    refrigerators: number;
    samples: number;
    subSamples: number;
    sampleRecords: number;
    totalItems: number;
    totalCapacity: number;
    usedSlots: number;
    usageRate: number;
    critical: number;
    warning: number;
    abnormal: number;
  };
  statusCounts: Array<{ status: string; count: number }>;
  typeCounts: Array<{ type: string; count: number }>;
  refrigerators: Array<{
    id: string;
    name: string;
    capacity: number;
    sampleCount: number;
    subSampleCount: number;
    criticalCount: number;
    warningCount: number;
  }>;
  owners: Array<{ username: string; sampleCount: number; subSampleCount: number }>;
}

export interface AdminUser {
  username: string;
  role: AuthUser['role'];
  createdAt: string;
  sampleCount: number;
  subSampleCount: number;
}

export interface AdminSampleItem {
  kind: 'sample' | 'subsample';
  id: string;
  name: string;
  type: string;
  status: string;
  temperature: number;
  collectedAt: string;
  patientId: string;
  uploader: string;
  createdBy?: string;
  tags: string[];
  note: string;
  volume: string;
  refrigeratorId: string;
  refrigeratorName: string;
  compartment: 'upper' | 'lower';
  position: number;
  parentId?: string;
  parentName?: string;
  subSampleCount: number;
}

const BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('biofridge_token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) {
      window.dispatchEvent(new Event('biofridge:unauthorized'));
    }
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function loginUser(
  username: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  return fetchJSON(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function registerUser(
  username: string,
  password: string,
  role: AuthUser['role'] = 'user',
): Promise<AuthUser> {
  return fetchJSON(`${BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
  });
}

export async function fetchCurrentUser(): Promise<{ user: AuthUser }> {
  return fetchJSON(`${BASE}/auth/me`);
}

// ── Admin ──

export async function fetchAdminSummary(): Promise<AdminSummary> {
  return fetchJSON(`${BASE}/admin/summary`);
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  return fetchJSON(`${BASE}/admin/users`);
}

export async function fetchAdminSamples(): Promise<AdminSampleItem[]> {
  return fetchJSON(`${BASE}/admin/samples`);
}

export async function createAdminUser(
  username: string,
  password: string,
  role: AuthUser['role'] = 'user',
): Promise<AdminUser> {
  return fetchJSON(`${BASE}/admin/users`, {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
  });
}

export async function updateAdminUser(
  username: string,
  data: Partial<{ role: AuthUser['role']; password: string }>,
): Promise<AdminUser> {
  return fetchJSON(`${BASE}/admin/users/${encodeURIComponent(username)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminUser(username: string): Promise<void> {
  await fetchJSON(`${BASE}/admin/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
}

// ── Refrigerators ──

export async function fetchRefrigerators(): Promise<RefrigeratorResponse[]> {
  return fetchJSON(`${BASE}/refrigerators`);
}

export async function fetchRefrigerator(id: string): Promise<RefrigeratorResponse> {
  return fetchJSON(`${BASE}/refrigerators/${encodeURIComponent(id)}`);
}

export async function createRefrigerator(
  data: {
    name: string;
    description?: string;
    upperRows?: number;
    upperCols?: number;
    lowerRows?: number;
    lowerCols?: number;
    upperTemperature?: number;
    lowerTemperature?: number;
    fridgeType?: string;
  },
): Promise<RefrigeratorResponse> {
  return fetchJSON(`${BASE}/refrigerators`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRefrigerator(
  id: string,
  data: Partial<{
    name: string; description: string;
    upperRows: number; upperCols: number;
    lowerRows: number; lowerCols: number;
    upperTemperature: number; lowerTemperature: number;
  }>,
): Promise<RefrigeratorResponse> {
  return fetchJSON(`${BASE}/refrigerators/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRefrigerator(id: string): Promise<void> {
  await fetchJSON(`${BASE}/refrigerators/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ── Samples ──

export async function fetchSamples(fridgeId: string): Promise<Sample[]> {
  return fetchJSON(`${BASE}/refrigerators/${encodeURIComponent(fridgeId)}/samples`);
}

export async function fetchSample(fridgeId: string, id: string): Promise<Sample> {
  return fetchJSON(`${BASE}/refrigerators/${encodeURIComponent(fridgeId)}/samples/${encodeURIComponent(id)}`);
}

export async function createSample(
  fridgeId: string,
  data: Omit<Sample, 'subSamples'>,
): Promise<Sample> {
  return fetchJSON(`${BASE}/refrigerators/${encodeURIComponent(fridgeId)}/samples`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSample(
  fridgeId: string,
  id: string,
  data: Partial<Sample>,
): Promise<Sample> {
  return fetchJSON(`${BASE}/refrigerators/${encodeURIComponent(fridgeId)}/samples/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSample(fridgeId: string, id: string): Promise<void> {
  await fetchJSON(`${BASE}/refrigerators/${encodeURIComponent(fridgeId)}/samples/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ── Sub-samples ──

export async function fetchSubSamples(sampleId: string): Promise<SubSample[]> {
  return fetchJSON(`${BASE}/samples/${encodeURIComponent(sampleId)}/sub-samples`);
}

export async function createSubSample(
  sampleId: string,
  data: Omit<SubSample, 'position'> & { position?: number },
): Promise<SubSample> {
  return fetchJSON(`${BASE}/samples/${encodeURIComponent(sampleId)}/sub-samples`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSubSample(
  sampleId: string,
  id: string,
  data: Partial<SubSample>,
): Promise<SubSample> {
  return fetchJSON(`${BASE}/samples/${encodeURIComponent(sampleId)}/sub-samples/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSubSample(sampleId: string, id: string): Promise<void> {
  await fetchJSON(`${BASE}/samples/${encodeURIComponent(sampleId)}/sub-samples/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ── Sample Types ──

export async function fetchSampleTypes(): Promise<string[]> {
  return fetchJSON(`${BASE}/sample-types`);
}

export async function createSampleType(name: string): Promise<{ name: string }> {
  return fetchJSON(`${BASE}/sample-types`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// ── Item Types ──

export async function fetchItemTypes(): Promise<string[]> {
  return fetchJSON(`${BASE}/item-types`);
}

export async function createItemType(name: string): Promise<{ name: string }> {
  return fetchJSON(`${BASE}/item-types`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

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

export async function updateDrawer(drawerId: string, data: Partial<Drawer>): Promise<Drawer> {
  try {
    return await fetchJSON(`${BASE}/drawers/${encodeURIComponent(drawerId)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  } catch (err: any) {
    if (!String(err?.message || '').includes('404')) throw err;
    return fetchJSON(`${BASE}/drawers/${encodeURIComponent(drawerId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
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

export async function createStandaloneBox(data: Partial<Box>): Promise<Box> {
  return fetchJSON(`${BASE}/boxes`, {
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
  return fetchJSON(`${BASE}/boxes/cells/${encodeURIComponent(cellId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBoxCell(cellId: string): Promise<void> {
  await fetchJSON(`${BASE}/boxes/cells/${encodeURIComponent(cellId)}`, { method: 'DELETE' });
}

// ── Sample Records ──

export async function fetchSampleRecords(params?: { box_id?: string; search?: string }): Promise<SampleRecord[]> {
  const qs = new URLSearchParams();
  if (params?.box_id) qs.set('box_id', params.box_id);
  if (params?.search) qs.set('search', params.search);
  const q = qs.toString();
  return fetchJSON(`${BASE}/sample-records${q ? `?${q}` : ''}`);
}

export async function fetchSampleRecord(id: string): Promise<SampleRecord> {
  return fetchJSON(`${BASE}/sample-records/${encodeURIComponent(id)}`);
}

export async function createSampleRecord(data: {
  patient_name: string;
  sample_code: string;
  source?: string;
  sample_type?: string;
  collection_stage?: string;
  collected_at?: string;
  tags?: string[];
  note?: string;
  uploader?: string;
  tubes?: Array<{ box_id: string; position: number; volume?: string; barcode?: string; status?: string; note?: string }>;
}): Promise<SampleRecord> {
  return fetchJSON(`${BASE}/sample-records`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSampleRecord(id: string, data: Partial<SampleRecord>): Promise<SampleRecord> {
  return fetchJSON(`${BASE}/sample-records/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSampleRecord(id: string): Promise<void> {
  await fetchJSON(`${BASE}/sample-records/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function addTubesToSample(sampleId: string, tubes: Array<{ box_id: string; position: number; volume?: string; barcode?: string; status?: string; note?: string }>): Promise<{ tubes: Tube[] }> {
  return fetchJSON(`${BASE}/sample-records/${encodeURIComponent(sampleId)}/tubes`, {
    method: 'POST',
    body: JSON.stringify({ tubes }),
  });
}

export async function updateTube(tubeId: string, data: Partial<Tube>): Promise<Tube> {
  return fetchJSON(`${BASE}/tubes/${encodeURIComponent(tubeId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTube(tubeId: string): Promise<void> {
  await fetchJSON(`${BASE}/tubes/${encodeURIComponent(tubeId)}`, { method: 'DELETE' });
}

export async function fetchBoxTubes(boxId: string): Promise<Tube[]> {
  return fetchJSON(`${BASE}/boxes/${encodeURIComponent(boxId)}/tubes`);
}

export async function batchUpdateSampleRecords(ids: string[], updates: Partial<SampleRecord>): Promise<{ ok: boolean; updated: number }> {
  return fetchJSON(`${BASE}/sample-records/batch`, {
    method: 'PUT',
    body: JSON.stringify({ ids, updates }),
  });
}

// ── Excel Import ──

export interface ParsedExcel {
  headers: string[];
  rows: Record<string, any>[];
  total: number;
  fieldSuggestions: Record<string, string>;
}

export async function parseExcel(file: File): Promise<ParsedExcel> {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('biofridge_token');
  const res = await fetch(`${BASE}/import/parse-excel`, {
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

export interface ImportAssignment {
  patient_name: string;
  sample_code: string;
  source?: string;
  sample_type?: string;
  collection_stage?: string;
  collected_at?: string;
  tags?: string[];
  note?: string;
  uploader?: string;
  positions: number[];
}

export async function assignImportedSamples(boxId: string, samples: ImportAssignment[]): Promise<{ assigned: number; results: any[] }> {
  return fetchJSON(`${BASE}/import/assign`, {
    method: 'POST',
    body: JSON.stringify({ box_id: boxId, samples }),
  });
}

// ── Admin: Boxes & Sample Records ──

export interface AdminBox {
  id: string;
  drawer_id: string;
  name: string;
  mode: string;
  grid_rows: number | null;
  grid_cols: number | null;
  position: number | null;
  sample_type: string | null;
  project_name: string | null;
  quantity: number;
  owner: string | null;
  note: string | null;
  data_path: string | null;
  drawer_label: string;
  layer: number;
  row_pos: number;
  col_pos: number;
  fridge_name: string;
  fridge_id: string;
  tube_count: number;
  created_at: string;
}

export interface AdminBoxDetail extends AdminBox {
  tubes: (Tube & { patient_name: string; sample_code: string; group_color: string })[];
}

export async function fetchAdminBoxes(): Promise<AdminBox[]> {
  return fetchJSON(`${BASE}/admin/boxes`);
}

export async function fetchAdminBoxDetail(boxId: string): Promise<AdminBoxDetail> {
  return fetchJSON(`${BASE}/admin/boxes/${encodeURIComponent(boxId)}`);
}

export async function fetchAdminSampleRecords(): Promise<SampleRecord[]> {
  return fetchJSON(`${BASE}/admin/sample-records`);
}

export async function fetchAdminUpperItems(): Promise<any[]> {
  return fetchJSON(`${BASE}/admin/upper-items`);
}

export async function deleteAdminUpperItem(id: string): Promise<void> {
  await fetchJSON(`${BASE}/admin/upper-items/${encodeURIComponent(id)}`, { method: "DELETE" });
}
