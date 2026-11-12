import { SyncCloudRecord, SyncDashboardData } from '../types/stock';

const STORAGE_KEY_SYNC_CODE = 'egx_sync_code_v1';
const STORAGE_KEY_LAST_SYNCED = 'egx_sync_last_synced_v1';
const STORAGE_KEY_LOCAL_UPDATED_AT = 'egx_sync_local_updated_at_v1';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeSyncCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function isValidSyncCode(raw: string): boolean {
  const code = normalizeSyncCode(raw);
  return /^[A-Z0-9-]{4,32}$/.test(code);
}

export function generateSyncCode(): string {
  const chars: string[] = [];
  const randomValues = new Uint32Array(4);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < 4; i++) {
      chars.push(CODE_ALPHABET[randomValues[i] % CODE_ALPHABET.length]);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      chars.push(CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]);
    }
  }
  return `SYNC-${chars.join('')}`;
}

export function getStoredSyncCode(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SYNC_CODE);
    if (!raw) return null;
    const normalized = normalizeSyncCode(raw);
    return isValidSyncCode(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function setStoredSyncCode(code: string | null): void {
  try {
    if (!code) {
      localStorage.removeItem(STORAGE_KEY_SYNC_CODE);
    } else {
      localStorage.setItem(STORAGE_KEY_SYNC_CODE, normalizeSyncCode(code));
    }
  } catch (err) {
    console.warn('Failed to persist sync code:', err);
  }
}

export function getLastSyncedAt(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_SYNCED);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

export function setLastSyncedAt(ts: number | null): void {
  try {
    if (ts === null) {
      localStorage.removeItem(STORAGE_KEY_LAST_SYNCED);
    } else {
      localStorage.setItem(STORAGE_KEY_LAST_SYNCED, String(ts));
    }
  } catch {
    // ignore
  }
}

export function getLocalUpdatedAt(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_UPDATED_AT);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

export function setLocalUpdatedAt(ts: number | null): void {
  try {
    if (ts === null) {
      localStorage.removeItem(STORAGE_KEY_LOCAL_UPDATED_AT);
    } else {
      localStorage.setItem(STORAGE_KEY_LOCAL_UPDATED_AT, String(ts));
    }
  } catch {
    // ignore
  }
}

export function unlinkSync(): void {
  setStoredSyncCode(null);
  setLastSyncedAt(null);
}

export async function pushToCloud(
  rawCode: string,
  data: SyncDashboardData,
  updatedAt: number = Date.now()
): Promise<{ code: string; updatedAt: number }> {
  const code = normalizeSyncCode(rawCode);
  if (!isValidSyncCode(code)) {
    throw new Error('رمز المزامنة غير صالح');
  }

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      code,
      data,
      updatedAt,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || 'فشل رفع البيانات إلى السحابة');
  }

  const confirmedUpdatedAt = typeof json.updatedAt === 'number' ? json.updatedAt : updatedAt;
  setStoredSyncCode(code);
  setLastSyncedAt(Date.now());
  setLocalUpdatedAt(confirmedUpdatedAt);

  return {
    code,
    updatedAt: confirmedUpdatedAt,
  };
}

export async function pullFromCloud(rawCode: string): Promise<SyncCloudRecord | null> {
  const code = normalizeSyncCode(rawCode);
  if (!isValidSyncCode(code)) {
    throw new Error('رمز المزامنة غير صالح');
  }

  const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (res.status === 404) {
    return null;
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || 'فشل سحب البيانات من السحابة');
  }

  if (!json || !json.data || !Array.isArray(json.data.watchlist)) {
    throw new Error('البيانات المستلمة من السحابة غير صالحة');
  }

  return {
    code: json.code || code,
    data: json.data as SyncDashboardData,
    updatedAt: typeof json.updatedAt === 'number' ? json.updatedAt : Date.now(),
  };
}
