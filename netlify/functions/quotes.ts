import type { Handler } from '@netlify/functions';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface TradingViewRow {
  s: string;
  d: [
    string, // 0: name
    number | null, // 1: close
    number | null, // 2: change (%)
    number | null, // 3: change_abs
    number | null, // 4: open
    number | null, // 5: high
    number | null, // 6: low
    number | null, // 7: volume
    number | null, // 8: Value.Traded
    number | null, // 9: price_52_week_high
    number | null, // 10: price_52_week_low
    number | null  // 11: Perf.W (7D %)
  ];
}

function toTradingViewTicker(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean === '^CASE30') return 'EGX:EGX30';
  if (clean === '^EGX70EWI.CA' || clean === '^EGX70EWI') return 'EGX:EGX70EWI';
  const base = clean.replace(/\.CA$/i, '');
  return `EGX:${base}`;
}

async function fetchTradingViewBatch(symbols: string[]): Promise<Record<string, TradingViewRow['d']>> {
  const tvTickers = Array.from(new Set(symbols.map(toTradingViewTicker)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch('https://scanner.tradingview.com/egypt/scan', {
      method: 'POST',
      signal: controller.signal,
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
    });

    if (!res.ok) return {};
    const json = (await res.json()) as { data?: TradingViewRow[] };
    const map: Record<string, TradingViewRow['d']> = {};
    for (const row of json?.data || []) {
      if (row?.s && Array.isArray(row.d)) {
        map[row.s.toUpperCase()] = row.d;
      }
    }
    return map;
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

async function fetchYahooHistory(symbol: string): Promise<{
  closes: number[];
  meta: any | null;
}> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}?range=7d&interval=1d`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return { closes: [], meta: null };
    const json = (await res.json()) as any;
    const result = json?.chart?.result?.[0];
    if (!result) return { closes: [], meta: null };

    const rawCloses = result.indicators?.quote?.[0]?.close || [];
    const closes = rawCloses.filter(
      (v: any): v is number => typeof v === 'number' && !isNaN(v) && v > 0
    );
    return { closes, meta: result.meta || null };
  } catch {
    return { closes: [], meta: null };
  } finally {
    clearTimeout(timer);
  }
}

function buildSynthesized7DSparkline(start7D: number, prevClose: number, currentPrice: number): number[] {
  const mid1 = start7D + (prevClose - start7D) * 0.33;
  const mid2 = start7D + (prevClose - start7D) * 0.66;
  return [start7D, mid1, mid2, prevClose, currentPrice].filter(
    (v) => typeof v === 'number' && !isNaN(v) && v > 0
  );
}

function buildQuoteFromSources(
  symbol: string,
  tvRow: TradingViewRow['d'] | undefined,
  yf: { closes: number[]; meta: any | null }
): any | null {
  const cleanSymbol = symbol.trim().toUpperCase();

  if (tvRow && typeof tvRow[1] === 'number' && tvRow[1] > 0) {
    const currentPrice = tvRow[1];
    const changePercent1D = typeof tvRow[2] === 'number' ? tvRow[2] : 0;
    const change1D = typeof tvRow[3] === 'number' ? tvRow[3] : 0;
    const previousClose = currentPrice - change1D > 0 ? currentPrice - change1D : currentPrice;
    const dayOpen = typeof tvRow[4] === 'number' && tvRow[4] > 0 ? tvRow[4] : previousClose;
    const dayHigh = typeof tvRow[5] === 'number' && tvRow[5] > 0 ? tvRow[5] : currentPrice;
    const dayLow = typeof tvRow[6] === 'number' && tvRow[6] > 0 ? tvRow[6] : currentPrice;
    const volume = typeof tvRow[7] === 'number' && tvRow[7] > 0 ? tvRow[7] : 0;
    const tradingValue =
      typeof tvRow[8] === 'number' && tvRow[8] > 0 ? tvRow[8] : volume * currentPrice;

    const rawHigh52 = typeof tvRow[9] === 'number' && tvRow[9] > 0 ? tvRow[9] : yf.meta?.fiftyTwoWeekHigh;
    const rawLow52 = typeof tvRow[10] === 'number' && tvRow[10] > 0 ? tvRow[10] : yf.meta?.fiftyTwoWeekLow;
    const fiftyTwoWeekHigh = rawHigh52 ? Math.max(rawHigh52, currentPrice) : currentPrice * 1.25;
    const fiftyTwoWeekLow = rawLow52 ? Math.min(rawLow52, currentPrice) : currentPrice * 0.75;

    const perfW = typeof tvRow[11] === 'number' ? tvRow[11] : null;
    const start7D =
      perfW !== null && 1 + perfW / 100 > 0
        ? currentPrice / (1 + perfW / 100)
        : yf.closes.length > 0
        ? yf.closes[0]
        : previousClose;
    const change7D = currentPrice - start7D;
    const changePercent7D =
      perfW !== null ? perfW : start7D > 0 ? (change7D / start7D) * 100 : changePercent1D;

    // Use Yahoo historical daily bars ONLY if they match current scale (not frozen at old 2024 price)
    let sparkline7D: number[];
    const lastYfClose = yf.closes[yf.closes.length - 1];
    if (
      yf.closes.length >= 2 &&
      lastYfClose > 0 &&
      Math.abs(lastYfClose - currentPrice) / currentPrice <= 0.35
    ) {
      sparkline7D = [...yf.closes.slice(-6), currentPrice];
    } else {
      sparkline7D = buildSynthesized7DSparkline(start7D, previousClose, currentPrice);
    }

    const sparkline1D = [previousClose, dayOpen, dayLow, dayHigh, currentPrice].filter(
      (v) => typeof v === 'number' && !isNaN(v) && v > 0
    );

    return {
      symbol: cleanSymbol,
      currency: 'EGP',
      regularMarketPrice: currentPrice,
      chartPreviousClose: previousClose,
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
  }

  // Fallback to Yahoo Finance if TradingView didn't return this ticker
  const meta = yf.meta;
  if (!meta) return null;

  const lastBar = yf.closes.length > 0 ? yf.closes[yf.closes.length - 1] : null;
  const prevBar = yf.closes.length > 1 ? yf.closes[yf.closes.length - 2] : null;
  const isMetaStale =
    typeof meta.regularMarketTime === 'number' &&
    Date.now() - meta.regularMarketTime * 1000 > 14 * 24 * 60 * 60 * 1000;

  const currentPrice = isMetaStale && lastBar ? lastBar : (meta.regularMarketPrice ?? lastBar ?? 0);
  if (!currentPrice) return null;

  const previousClose =
    isMetaStale && prevBar ? prevBar : (meta.previousClose || meta.chartPreviousClose || currentPrice);
  const change1D =
    isMetaStale && prevBar
      ? currentPrice - prevBar
      : (meta.fulldayChange ?? meta.regularMarketChange ?? (currentPrice - previousClose));
  const changePercent1D =
    isMetaStale && prevBar && prevBar > 0
      ? ((currentPrice - prevBar) / prevBar) * 100
      : (meta.fulldayChangePercent ?? meta.regularMarketChangePercent ?? (previousClose > 0 ? (change1D / previousClose) * 100 : 0));

  const sparkline7D = [...yf.closes];
  if (sparkline7D[sparkline7D.length - 1] !== currentPrice) {
    sparkline7D.push(currentPrice);
  }
  const start7D = sparkline7D.length > 1 ? sparkline7D[0] : previousClose;
  const change7D = currentPrice - start7D;
  const changePercent7D = start7D > 0 ? (change7D / start7D) * 100 : changePercent1D;

  const fiftyTwoWeekLow = meta.fiftyTwoWeekLow ? Math.min(meta.fiftyTwoWeekLow, currentPrice) : currentPrice * 0.75;
  const fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh ? Math.max(meta.fiftyTwoWeekHigh, currentPrice) : currentPrice * 1.25;

  return {
    symbol: cleanSymbol,
    currency: 'EGP',
    regularMarketPrice: currentPrice,
    chartPreviousClose: previousClose,
    change: change1D,
    changePercent: changePercent1D,
    change1D,
    changePercent1D,
    change7D,
    changePercent7D,
    dayLow: meta.regularMarketDayLow ?? currentPrice,
    dayHigh: meta.regularMarketDayHigh ?? currentPrice,
    fiftyTwoWeekLow,
    fiftyTwoWeekHigh,
    volume: meta.regularMarketVolume || 0,
    tradingValue: (meta.regularMarketVolume || 0) * currentPrice,
    regularMarketTime: isMetaStale ? Date.now() : (meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()),
    sparkline: sparkline7D.slice(-7),
    sparkline1D: [previousClose, currentPrice].filter((v) => v > 0),
  };
}

export const handler: Handler = async (event) => {
  const symbolsParam = event.queryStringParameters?.symbols || '';
  const requestedList = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const allSymbols = Array.from(new Set([...requestedList, '^CASE30', '^EGX70EWI.CA']));

  const [tvMap, yahooHistories] = await Promise.all([
    fetchTradingViewBatch(allSymbols),
    Promise.all(
      allSymbols.map(async (sym) => ({
        sym,
        history: await fetchYahooHistory(sym),
      }))
    ),
  ]);

  const yfMap: Record<string, { closes: number[]; meta: any | null }> = {};
  for (const item of yahooHistories) {
    yfMap[item.sym] = item.history;
  }

  const quotes: Record<string, any> = {};
  const errors: Record<string, string> = {};

  for (const sym of allSymbols) {
    const tvKey = toTradingViewTicker(sym);
    const quote = buildQuoteFromSources(sym, tvMap[tvKey], yfMap[sym] || { closes: [], meta: null });
    if (quote) {
      quotes[sym] = quote;
    } else {
      errors[sym] = 'No quote data available';
    }
  }

  const egx30 = quotes['^CASE30'] || null;
  const egx70 = quotes['^EGX70EWI.CA'] || null;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=30, s-maxage=60',
    },
    body: JSON.stringify({
      timestamp: Date.now(),
      egx30,
      egx70,
      quotes,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    }),
  };
};
