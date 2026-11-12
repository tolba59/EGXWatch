import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// In-memory store for /api/sync during local development and preview
const devSyncStore = new Map<string, { code: string; data: unknown; updatedAt: number }>();

function normalizeDevSyncCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

// Dev server middleware plugin for local development in AI Studio
function devApiProxyPlugin(): Plugin {
  return {
    name: 'dev-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');

        if (url.pathname === '/api/sync') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Cache-Control', 'no-store');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'GET') {
            const code = normalizeDevSyncCode(url.searchParams.get('code') || '');
            if (!/^[A-Z0-9-]{4,32}$/.test(code)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'رمز المزامنة غير صالح' }));
              return;
            }
            const record = devSyncStore.get(code);
            if (!record) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'لم يتم العثور على بيانات محفوظة لهذا الرمز', notFound: true }));
              return;
            }
            res.statusCode = 200;
            res.end(JSON.stringify(record));
            return;
          }

          if (req.method === 'POST') {
            try {
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
              }
              const rawBody = Buffer.concat(chunks).toString('utf8');
              const payload = JSON.parse(rawBody || '{}');
              const code = normalizeDevSyncCode(String(payload.code || ''));

              if (!/^[A-Z0-9-]{4,32}$/.test(code)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'رمز المزامنة غير صالح' }));
                return;
              }
              if (!payload.data || typeof payload.data !== 'object') {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'بيانات المزامنة غير صالحة' }));
                return;
              }

              const updatedAt =
                typeof payload.updatedAt === 'number' && !isNaN(payload.updatedAt)
                  ? payload.updatedAt
                  : Date.now();

              const record = { code, data: payload.data, updatedAt };
              devSyncStore.set(code, record);

              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, code, updatedAt }));
              return;
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: e?.message || 'صيغة JSON غير صالحة' }));
              return;
            }
          }

          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        if (url.pathname === '/api/quotes') {
          try {
            const symbolsParam = url.searchParams.get('symbols') || '';
            const requested = symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
            const allSymbols = Array.from(new Set([...requested, '^CASE30', '^EGX70EWI.CA']));

            const toTvTicker = (sym: string) => {
              const c = sym.trim().toUpperCase();
              if (c === '^CASE30') return 'EGX:EGX30';
              if (c === '^EGX70EWI.CA' || c === '^EGX70EWI') return 'EGX:EGX70EWI';
              return `EGX:${c.replace(/\.CA$/i, '')}`;
            };

            const tvTickers = Array.from(new Set(allSymbols.map(toTvTicker)));
            const tvPromise = fetch('https://scanner.tradingview.com/egypt/scan', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': USER_AGENT,
                Accept: 'application/json',
              },
              body: JSON.stringify({
                symbols: { tickers: tvTickers },
                columns: [
                  'name',
                  'close',
                  'change',
                  'change_abs',
                  'open',
                  'high',
                  'low',
                  'volume',
                  'Value.Traded',
                  'price_52_week_high',
                  'price_52_week_low',
                  'Perf.W',
                ],
              }),
            })
              .then(async (r) => (r.ok ? ((await r.json()) as any) : null))
              .catch(() => null);

            const yfPromise = Promise.all(
              allSymbols.map(async (clean) => {
                const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(clean)}?range=7d&interval=1d`;
                try {
                  const r = await fetch(yfUrl, {
                    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
                  });
                  if (!r.ok) return { clean, closes: [] as number[], meta: null };
                  const j = (await r.json()) as any;
                  const res0 = j?.chart?.result?.[0];
                  const closes = (res0?.indicators?.quote?.[0]?.close || []).filter(
                    (v: any): v is number => typeof v === 'number' && !isNaN(v) && v > 0
                  );
                  return { clean, closes, meta: res0?.meta || null };
                } catch {
                  return { clean, closes: [] as number[], meta: null };
                }
              })
            );

            const [tvJson, yfResults] = await Promise.all([tvPromise, yfPromise]);

            const tvMap: Record<string, any[]> = {};
            for (const row of tvJson?.data || []) {
              if (row?.s && Array.isArray(row.d)) {
                tvMap[row.s.toUpperCase()] = row.d;
              }
            }

            const yfMap: Record<string, { closes: number[]; meta: any | null }> = {};
            for (const item of yfResults) {
              yfMap[item.clean] = { closes: item.closes, meta: item.meta };
            }

            const quotes: Record<string, any> = {};
            for (const clean of allSymbols) {
              const tvRow = tvMap[toTvTicker(clean)];
              const yf = yfMap[clean] || { closes: [], meta: null };

              if (tvRow && typeof tvRow[1] === 'number' && tvRow[1] > 0) {
                const curPrice = tvRow[1];
                const changePercent1D = typeof tvRow[2] === 'number' ? tvRow[2] : 0;
                const change1D = typeof tvRow[3] === 'number' ? tvRow[3] : 0;
                const prevClose = curPrice - change1D > 0 ? curPrice - change1D : curPrice;
                const dayOpen = typeof tvRow[4] === 'number' && tvRow[4] > 0 ? tvRow[4] : prevClose;
                const dayHigh = typeof tvRow[5] === 'number' && tvRow[5] > 0 ? tvRow[5] : curPrice;
                const dayLow = typeof tvRow[6] === 'number' && tvRow[6] > 0 ? tvRow[6] : curPrice;
                const volume = typeof tvRow[7] === 'number' && tvRow[7] > 0 ? tvRow[7] : 0;
                const tradingValue = typeof tvRow[8] === 'number' && tvRow[8] > 0 ? tvRow[8] : volume * curPrice;

                const rawHigh52 = typeof tvRow[9] === 'number' && tvRow[9] > 0 ? tvRow[9] : yf.meta?.fiftyTwoWeekHigh;
                const rawLow52 = typeof tvRow[10] === 'number' && tvRow[10] > 0 ? tvRow[10] : yf.meta?.fiftyTwoWeekLow;
                const fiftyTwoWeekHigh = rawHigh52 ? Math.max(rawHigh52, curPrice) : curPrice * 1.25;
                const fiftyTwoWeekLow = rawLow52 ? Math.min(rawLow52, curPrice) : curPrice * 0.75;

                const perfW = typeof tvRow[11] === 'number' ? tvRow[11] : null;
                const start7D =
                  perfW !== null && 1 + perfW / 100 > 0
                    ? curPrice / (1 + perfW / 100)
                    : yf.closes.length > 0
                    ? yf.closes[0]
                    : prevClose;
                const change7D = curPrice - start7D;
                const changePercent7D = perfW !== null ? perfW : start7D > 0 ? (change7D / start7D) * 100 : changePercent1D;

                const lastYfClose = yf.closes[yf.closes.length - 1];
                let sparkline7D: number[];
                if (
                  yf.closes.length >= 2 &&
                  lastYfClose > 0 &&
                  Math.abs(lastYfClose - curPrice) / curPrice <= 0.35
                ) {
                  sparkline7D = [...yf.closes.slice(-6), curPrice];
                } else {
                  const mid1 = start7D + (prevClose - start7D) * 0.33;
                  const mid2 = start7D + (prevClose - start7D) * 0.66;
                  sparkline7D = [start7D, mid1, mid2, prevClose, curPrice].filter((v) => v > 0);
                }

                const sparkline1D = [prevClose, dayOpen, dayLow, dayHigh, curPrice].filter(
                  (v) => typeof v === 'number' && !isNaN(v) && v > 0
                );

                quotes[clean] = {
                  symbol: clean,
                  currency: 'EGP',
                  regularMarketPrice: curPrice,
                  chartPreviousClose: prevClose,
                  change: change1D,
                  changePercent: changePercent1D,
                  change1D,
                  changePercent1D,
                  change7D,
                  changePercent7D,
                  dayLow,
                  dayHigh,
                  fiftyTwoWeekLow,
                  fiftyTwoWeekHigh,
                  volume,
                  tradingValue,
                  regularMarketTime: Date.now(),
                  sparkline: sparkline7D,
                  sparkline1D,
                };
              } else if (yf.meta) {
                const meta = yf.meta;
                const lastBar = yf.closes.length > 0 ? yf.closes[yf.closes.length - 1] : null;
                const prevBar = yf.closes.length > 1 ? yf.closes[yf.closes.length - 2] : null;
                const isStale =
                  typeof meta.regularMarketTime === 'number' &&
                  Date.now() - meta.regularMarketTime * 1000 > 14 * 24 * 60 * 60 * 1000;
                const curPrice = isStale && lastBar ? lastBar : (meta.regularMarketPrice ?? lastBar ?? 0);
                if (curPrice > 0) {
                  const prevClose = isStale && prevBar ? prevBar : (meta.previousClose || meta.chartPreviousClose || curPrice);
                  const change1D = isStale && prevBar ? curPrice - prevBar : (meta.fulldayChange ?? meta.regularMarketChange ?? (curPrice - prevClose));
                  const changePercent1D =
                    isStale && prevBar && prevBar > 0
                      ? ((curPrice - prevBar) / prevBar) * 100
                      : (meta.fulldayChangePercent ?? meta.regularMarketChangePercent ?? (prevClose > 0 ? (change1D / prevClose) * 100 : 0));
                  const spark = [...yf.closes];
                  if (spark[spark.length - 1] !== curPrice) spark.push(curPrice);
                  const start7D = spark.length > 1 ? spark[0] : prevClose;
                  const change7D = curPrice - start7D;
                  const changePercent7D = start7D > 0 ? (change7D / start7D) * 100 : changePercent1D;

                  quotes[clean] = {
                    symbol: clean,
                    currency: 'EGP',
                    regularMarketPrice: curPrice,
                    chartPreviousClose: prevClose,
                    change: change1D,
                    changePercent: changePercent1D,
                    change1D,
                    changePercent1D,
                    change7D,
                    changePercent7D,
                    dayLow: meta.regularMarketDayLow ?? curPrice,
                    dayHigh: meta.regularMarketDayHigh ?? curPrice,
                    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? Math.min(meta.fiftyTwoWeekLow, curPrice) : curPrice * 0.75,
                    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? Math.max(meta.fiftyTwoWeekHigh, curPrice) : curPrice * 1.25,
                    volume: meta.regularMarketVolume || 0,
                    tradingValue: (meta.regularMarketVolume || 0) * curPrice,
                    regularMarketTime: Date.now(),
                    sparkline: spark.slice(-7),
                    sparkline1D: [prevClose, curPrice].filter((v) => v > 0),
                  };
                }
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(
              JSON.stringify({
                timestamp: Date.now(),
                egx30: quotes['^CASE30'] || null,
                egx70: quotes['^EGX70EWI.CA'] || null,
                quotes,
              })
            );
            return;
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
            return;
          }
        }

        if (url.pathname === '/api/search') {
          try {
            const query = (url.searchParams.get('q') || '').trim();
            if (!query) {
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ query: '', quotes: [] }));
              return;
            }

            const cleanTicker = query.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const hasArabic = /[\u0600-\u06FF]/.test(query);
            const tvRes = await fetch('https://scanner.tradingview.com/egypt/scan', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': USER_AGENT,
                Accept: 'application/json',
              },
              body: JSON.stringify({
                filter: [{ left: 'name,description', operation: 'match', right: query }],
                options: { lang: hasArabic ? 'ar' : 'en' },
                columns: ['name', 'description', 'type'],
                range: [0, 20],
              }),
            }).catch(() => null);

            const results: any[] = [];
            if (tvRes && tvRes.ok) {
              const json = (await tvRes.json()) as any;
              for (const row of json?.data || []) {
                const ticker = String(row.d?.[0] || '').trim().toUpperCase();
                const desc = String(row.d?.[1] || ticker).trim();
                const type = String(row.d?.[2] || '').toLowerCase();
                if (!ticker || type === 'index' || ticker.startsWith('EGX')) continue;
                if (/^EGS[0-9A-Z]{8,}$/.test(ticker)) continue;
                results.push({
                  symbol: `${ticker}.CA`,
                  shortname: ticker,
                  longname: desc,
                  exchange: 'CAI',
                  quoteType: 'EQUITY',
                  isCairo: true,
                });
              }
            }

            if (cleanTicker.length >= 3 && cleanTicker.length <= 6) {
              const exactSymbol = `${cleanTicker}.CA`;
              if (!results.some((r) => r.symbol === exactSymbol)) {
                const probeRes = await fetch('https://scanner.tradingview.com/egypt/scan', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': USER_AGENT,
                    Accept: 'application/json',
                  },
                  body: JSON.stringify({
                    symbols: { tickers: [`EGX:${cleanTicker}`] },
                    columns: ['name', 'description', 'close', 'type'],
                  }),
                }).catch(() => null);

                if (probeRes && probeRes.ok) {
                  const pj = (await probeRes.json()) as any;
                  const row = pj?.data?.[0];
                  if (row && typeof row.d?.[2] === 'number' && row.d[2] > 0) {
                    results.unshift({
                      symbol: exactSymbol,
                      shortname: cleanTicker,
                      longname: row.d[1] || `${cleanTicker} (البورصة المصرية)`,
                      exchange: 'CAI',
                      quoteType: 'EQUITY',
                      isCairo: true,
                    });
                  }
                }
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ query, quotes: results }));
            return;
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      devApiProxyPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'نبض البورصة المصرية - محفظة أسهم EGX',
          short_name: 'نبض البورصة',
          description: 'تطبيق ويب تقدمي لمتابعة أسعار وأداء الأسهم المقيدة في البورصة المصرية ومؤشر EGX 30 لحظة بلحظة.',
          theme_color: '#ffffff',
          background_color: '#f8fafc',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          lang: 'ar',
          dir: 'rtl',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
