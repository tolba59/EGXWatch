import type { Handler } from '@netlify/functions';
import { connectLambda, getStore } from '@netlify/blobs';

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

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: HEADERS,
      body: '',
    };
  }

  try {
    // Initialize Netlify Blobs context for v1 Lambda functions when running on Netlify
    if ((event as any).blobs) {
      connectLambda(event as any);
    }

    const store = getStore({ name: STORE_NAME, consistency: 'strong' });

    if (event.httpMethod === 'GET') {
      const rawCode = event.queryStringParameters?.code || '';
      const code = normalizeCode(rawCode);

      if (!isValidCode(code)) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ error: 'رمز المزامنة غير صالح' }),
        };
      }

      const key = `sync:${code}`;
      const record = (await store.get(key, { type: 'json' })) as SyncRecord | null;

      if (!record) {
        return {
          statusCode: 404,
          headers: HEADERS,
          body: JSON.stringify({
            error: 'لم يتم العثور على بيانات محفوظة لهذا الرمز',
            notFound: true,
          }),
        };
      }

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          code: record.code || code,
          data: record.data,
          updatedAt: record.updatedAt,
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ error: 'البيانات المرسلة فارغة' }),
        };
      }

      let payload: Partial<SyncRecord>;
      try {
        payload = JSON.parse(event.body);
      } catch {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ error: 'صيغة JSON غير صالحة' }),
        };
      }

      const code = normalizeCode(String(payload.code || ''));
      if (!isValidCode(code)) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ error: 'رمز المزامنة غير صالح' }),
        };
      }

      if (!payload.data || typeof payload.data !== 'object') {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ error: 'بيانات المزامنة غير صالحة' }),
        };
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
      await store.setJSON(key, record);

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          ok: true,
          code,
          updatedAt,
        }),
      };
    }

    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (err: any) {
    console.error('Sync function error:', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err?.message || 'حدث خطأ في خدمة المزامنة' }),
    };
  }
};
