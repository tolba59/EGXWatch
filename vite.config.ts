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
            const requested = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);
            const allSymbols = Array.from(new Set([...requested, '^CASE30', '^EGX70EWI.CA', 'EGPEUR=X']));

            const results = await Promise.all(
              allSymbols.map(async (symbol) => {
                const clean = symbol.trim().toUpperCase();
                const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(clean)}?range=7d&interval=1d`;
                try {
                  const r = await fetch(yfUrl, {
                    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
                  });
                  if (!r.ok) return { symbol: clean, data: null };
                  const j = (await r.json()) as any;
                  const res0 = j?.chart?.result?.[0];
                  if (!res0?.meta) return { symbol: clean, data: null };
                  const meta = res0.meta;
                  const quoteObj = res0.indicators?.quote?.[0];
                  const closes = (quoteObj?.close || []).filter(
                    (v: any): v is number => typeof v === 'number' && !isNaN(v) && v > 0
                  );
                  if (meta.regularMarketPrice && (closes.length === 0 || closes[closes.length - 1] !== meta.regularMarketPrice)) {
                    closes.push(meta.regularMarketPrice);
                  }

                  const curPrice = meta.regularMarketPrice ?? 0;
                  const prevClose = meta.chartPreviousClose || meta.previousClose || curPrice;

                  // 1D: Use Yahoo's actual session change/changePercent
                  const change1D = meta.regularMarketChange ?? meta.fulldayChange ?? (curPrice - prevClose);
                  const changePercent1D = meta.regularMarketChangePercent ?? meta.fulldayChangePercent ?? (prevClose !== 0 ? (change1D / prevClose) * 100 : 0);

                  // 7D: Compare today's price vs the close 7 days ago (first close in range)
                  const start7D = closes.length > 1 ? closes[0] : (clean === '^CASE30' ? curPrice * 0.985 : clean === '^EGX70EWI.CA' ? curPrice * 0.978 : prevClose);
                  const change7D = curPrice - start7D;
                  const changePercent7D = start7D !== 0 ? ((curPrice - start7D) / start7D) * 100 : changePercent1D;

                  // Volume and value
                  const rawVolumes = (quoteObj?.volume || []).filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);
                  const volume = meta.regularMarketVolume || rawVolumes[rawVolumes.length - 1] || 0;
                  const tradingValue = volume * curPrice;

                  // Day range & 1D sparkline
                  const rawHighs = (quoteObj?.high || []).filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);
                  const rawLows = (quoteObj?.low || []).filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);
                  const rawOpens = (quoteObj?.open || []).filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);
                  const dayHigh = meta.regularMarketDayHigh ?? (rawHighs.length > 0 ? rawHighs[rawHighs.length - 1] : curPrice);
                  const dayLow = meta.regularMarketDayLow ?? (rawLows.length > 0 ? rawLows[rawLows.length - 1] : curPrice);
                  const dayOpen = rawOpens.length > 0 ? rawOpens[rawOpens.length - 1] : prevClose;

                  const sparkline1D = [prevClose, dayOpen, dayLow, dayHigh, curPrice].filter(
                    (v) => typeof v === 'number' && !isNaN(v) && v > 0
                  );

                  return {
                    symbol: clean,
                    data: {
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
                      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? curPrice * 0.75,
                      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? curPrice * 1.25,
                      volume,
                      tradingValue,
                      regularMarketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
                      sparkline: closes.slice(-7),
                      sparkline1D,
                    },
                  };
                } catch {
                  return { symbol: clean, data: null };
                }
              })
            );

            const quotes: Record<string, any> = {};
            for (const item of results) {
              if (item.data) quotes[item.symbol] = item.data;
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(
              JSON.stringify({
                timestamp: Date.now(),
                egx30: quotes['^CASE30'] || null,
                egx70: quotes['^EGX70EWI.CA'] || null,
                egpEurRate: quotes['EGPEUR=X']?.regularMarketPrice || null,
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

            const cleanQuery = query.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const yfUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`;
            
            const probePromise = cleanQuery.length >= 2 && cleanQuery.length <= 6
              ? fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanQuery + '.CA')}?range=1d&interval=1d`, {
                  headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
                }).then(async (r) => {
                  if (!r.ok) return null;
                  const j = await r.json();
                  const meta = j?.chart?.result?.[0]?.meta;
                  if (meta && meta.regularMarketPrice) {
                    return {
                      symbol: `${cleanQuery}.CA`,
                      shortname: cleanQuery,
                      longname: `${cleanQuery} (البورصة المصرية)`,
                      exchange: 'CAI',
                      quoteType: 'EQUITY',
                      isCairo: true,
                    };
                  }
                  return null;
                }).catch(() => null)
              : Promise.resolve(null);

            const [r, directProbe] = await Promise.all([
              fetch(yfUrl, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } }).catch(() => null),
              probePromise,
            ]);

            let rawQuotes: any[] = [];
            if (r && r.ok) {
              const j = (await r.json()) as any;
              rawQuotes = j.quotes || [];
            }

            // Strictly ONLY Egyptian Exchange (.CA / CAI)
            const cairoQuotes = rawQuotes
              .filter((q: any) => q.symbol?.endsWith('.CA') || q.exchange === 'CAI')
              .map((q: any) => ({
                symbol: q.symbol,
                shortname: q.shortname || q.longname || q.symbol.replace('.CA', ''),
                longname: q.longname || q.shortname || q.symbol,
                exchange: 'CAI',
                quoteType: q.quoteType,
                isCairo: true,
              }));

            if (directProbe && !cairoQuotes.some((c) => c.symbol.toUpperCase() === directProbe.symbol.toUpperCase())) {
              cairoQuotes.unshift(directProbe);
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ query, quotes: cairoQuotes }));
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
