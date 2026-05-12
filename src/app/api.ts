import type { AuthUser } from './AuthContext';
import { Sample, SubSample } from './types';

export interface RefrigeratorResponse {
  id: string;
  name: string;
  description: string | null;
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
    totalItems: number;
    totalCapacity: number;
    usedSlots: number;
    usageRate: number;
    critical: number;
    warning: number;
    abnormal: number;
  };
  statusCounts: Array<{ status: string; count: number }>;
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
