import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'egx-watchlist-sync';

const HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

interface SyncRecord {
  code: string;
  data: unknown;
  updatedAt: number;
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

function isValidCode(code: string): boolean {
  return /^[A-Z0-9-]{4,32}$/.test(code);
}

function jsonResponse(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: HEADERS,
  });
}

async function readSyncRecord(key: string): Promise<SyncRecord | null> {
  try {
    const strongStore = getStore({ name: STORE_NAME, consistency: 'strong' });
    return (await strongStore.get(key, { type: 'json' })) as SyncRecord | null;
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (
      err?.name === 'BlobsConsistencyError' ||
      msg.includes('uncachedEdgeURL') ||
      msg.includes('strong consistency')
    ) {
      const fallbackStore = getStore(STORE_NAME);
      return (await fallbackStore.get(key, { type: 'json' })) as SyncRecord | null;
    }
    throw err;
  }
}

async function writeSyncRecord(key: string, record: SyncRecord): Promise<void> {
  const store = getStore(STORE_NAME);
  await store.setJSON(key, record);
}

export default async function handler(req: Request, _context: Context): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: HEADERS,
    });
  }

  try {
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const rawCode = url.searchParams.get('code') || '';
      const code = normalizeCode(rawCode);

      if (!isValidCode(code)) {
        return jsonResponse({ error: 'رمز المزامنة غير صالح' }, 400);
      }

      const key = `sync:${code}`;
      const record = await readSyncRecord(key);

      if (!record) {
        return jsonResponse(
          {
            error: 'لم يتم العثور على بيانات محفوظة لهذا الرمز',
            notFound: true,
          },
          404
        );
      }

      return jsonResponse({
        code: record.code || code,
        data: record.data,
        updatedAt: record.updatedAt,
      });
    }

    if (req.method === 'POST') {
      const bodyText = await req.text();
      if (!bodyText) {
        return jsonResponse({ error: 'البيانات المرسلة فارغة' }, 400);
      }

      let payload: Partial<SyncRecord>;
      try {
        payload = JSON.parse(bodyText);
      } catch {
        return jsonResponse({ error: 'صيغة JSON غير صالحة' }, 400);
      }

      const code = normalizeCode(String(payload.code || ''));
      if (!isValidCode(code)) {
        return jsonResponse({ error: 'رمز المزامنة غير صالح' }, 400);
      }

      if (!payload.data || typeof payload.data !== 'object') {
        return jsonResponse({ error: 'بيانات المزامنة غير صالحة' }, 400);
      }

      const updatedAt =
        typeof payload.updatedAt === 'number' && !isNaN(payload.updatedAt)
          ? payload.updatedAt
          : Date.now();

      const record: SyncRecord = {
        code,
        data: payload.data,
        updatedAt,
      };

      const key = `sync:${code}`;
      await writeSyncRecord(key, record);

      return jsonResponse({
        ok: true,
        code,
        updatedAt,
      });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err: any) {
    console.error('Sync function error:', err);
    return jsonResponse(
      { error: err?.message || 'حدث خطأ في خدمة المزامنة' },
      500
    );
  }
}
