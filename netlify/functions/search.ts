import type { Handler } from '@netlify/functions';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const handler: Handler = async (event) => {
  const query = (event.queryStringParameters?.q || '').trim();

  if (!query) {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ quotes: [] }),
    };
  }

  try {
    const cleanTicker = query.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const hasArabic = /[\u0600-\u06FF]/.test(query);

    // Query TradingView Egypt exchange directly (strictly EGX equities)
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

    const results: Array<{
      symbol: string;
      shortname: string;
      longname: string;
      exchange: string;
      quoteType: string;
      isCairo: boolean;
    }> = [];

    if (tvRes && tvRes.ok) {
      const json = (await tvRes.json()) as {
        data?: Array<{ s: string; d: [string, string, string] }>;
      };

      for (const row of json.data || []) {
        const ticker = String(row.d?.[0] || '').trim().toUpperCase();
        const desc = String(row.d?.[1] || ticker).trim();
        const type = String(row.d?.[2] || '').toLowerCase();

        // Exclude indices from stock search results; allow stocks/funds
        if (!ticker || type === 'index' || ticker.startsWith('EGX')) continue;
        // Skip raw ISIN-only tickers if clean 4-letter ticker exists
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

    // If user typed an exact ticker code (e.g. HELI) that wasn't matched via partial filter, verify directly
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
          const pj = (await probeRes.json()) as {
            data?: Array<{ s: string; d: [string, string, number | null, string] }>;
          };
          const row = pj.data?.[0];
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

    return {
      statusCode: 200,
      headers: {
        ...HEADERS,
        'Cache-Control': 'public, max-age=120',
      },
      body: JSON.stringify({
        query,
        quotes: results,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message || 'Search failed' }),
    };
  }
};
