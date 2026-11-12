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

  const cleanQuery = query.toUpperCase().replace(/[^A-Z0-9]/g, '');

  try {
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`;
    
    // Concurrently search Yahoo Finance API and also probe query.CA if it looks like a ticker
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

    const [searchRes, directProbe] = await Promise.all([
      fetch(searchUrl, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      }).catch(() => null),
      probePromise,
    ]);

    let rawQuotes: any[] = [];
    if (searchRes && searchRes.ok) {
      const data = await searchRes.json();
      rawQuotes = data.quotes || [];
    }

    // STRICT FILTER: ONLY Egyptian Exchange (.CA or exchange === 'CAI')
    // Discard all other exchanges (US, Canada, UK, etc.)
    const cairoQuotes = rawQuotes
      .filter((q) => q.symbol?.endsWith('.CA') || q.exchange === 'CAI')
      .map((q) => ({
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

    return {
      statusCode: 200,
      headers: {
        ...HEADERS,
        'Cache-Control': 'public, max-age=120',
      },
      body: JSON.stringify({
        query,
        quotes: cairoQuotes,
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
