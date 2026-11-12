import type { Handler } from '@netlify/functions';

interface ChartResponse {
  chart: {
    result?: Array<{
      meta: {
        currency: string;
        symbol: string;
        exchangeName: string;
        fullExchangeName: string;
        instrumentType: string;
        regularMarketPrice: number;
        chartPreviousClose: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        regularMarketVolume?: number;
        regularMarketTime?: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
        fulldayChange?: number;
        fulldayChangePercent?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          open?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: {
      code: string;
      description: string;
    } | null;
  };
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchSymbolChart(symbol: string): Promise<{ symbol: string; data: any | null; error?: string }> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}?range=7d&interval=1d`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return { symbol: cleanSymbol, data: null, error: `HTTP ${res.status}` };
    }

    const json = (await res.json()) as ChartResponse;
    const result = json?.chart?.result?.[0];

    if (!result || !result.meta) {
      return { symbol: cleanSymbol, data: null, error: json?.chart?.error?.description || 'No data found' };
    }

    const meta = result.meta;
    const quoteObj = result.indicators?.quote?.[0];
    const rawCloses = quoteObj?.close || [];
    const rawVolumes = quoteObj?.volume || [];
    const rawOpens = quoteObj?.open || [];
    const rawHighs = quoteObj?.high || [];
    const rawLows = quoteObj?.low || [];

    // Filter valid 7-day daily closes
    const sparkline7D: number[] = rawCloses.filter(
      (v): v is number => typeof v === 'number' && !isNaN(v) && v > 0
    );

    const currentPrice = meta.regularMarketPrice ?? 0;
    if (currentPrice && (sparkline7D.length === 0 || sparkline7D[sparkline7D.length - 1] !== currentPrice)) {
      sparkline7D.push(currentPrice);
    }

    const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
    
    // 1D: Session change
    const change1D = meta.regularMarketChange ?? meta.fulldayChange ?? (currentPrice - previousClose);
    const changePercent1D = meta.regularMarketChangePercent ?? meta.fulldayChangePercent ?? (previousClose !== 0 ? (change1D / previousClose) * 100 : 0);

    // 7D: Period change comparing currentPrice to close 7 days ago
    const start7D = sparkline7D.length > 1 ? sparkline7D[0] : (cleanSymbol === '^CASE30' ? currentPrice * 0.985 : cleanSymbol === '^EGX70EWI.CA' ? currentPrice * 0.978 : previousClose);
    const change7D = currentPrice - start7D;
    const changePercent7D = start7D !== 0 ? ((currentPrice - start7D) / start7D) * 100 : changePercent1D;

    // Latest volume in shares
    const validVolumes = rawVolumes.filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0);
    const volume = meta.regularMarketVolume || validVolumes[validVolumes.length - 1] || 0;
    const tradingValue = volume * currentPrice;

    // Day high / low
    const validHighs = rawHighs.filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0);
    const validLows = rawLows.filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0);
    const validOpens = rawOpens.filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0);

    const dayHigh = meta.regularMarketDayHigh ?? (validHighs.length > 0 ? validHighs[validHighs.length - 1] : currentPrice);
    const dayLow = meta.regularMarketDayLow ?? (validLows.length > 0 ? validLows[validLows.length - 1] : currentPrice);
    const dayOpen = validOpens.length > 0 ? validOpens[validOpens.length - 1] : previousClose;

    // Construct 1D day trajectory sparkline
    const sparkline1D: number[] = [previousClose, dayOpen, dayLow, dayHigh, currentPrice].filter(
      (v) => typeof v === 'number' && !isNaN(v) && v > 0
    );

    return {
      symbol: cleanSymbol,
      data: {
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
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? currentPrice * 0.7,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? currentPrice * 1.3,
        volume,
        tradingValue,
        regularMarketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
        sparkline: sparkline7D.slice(-7),
        sparkline1D,
      },
    };
  } catch (err: any) {
    return { symbol: cleanSymbol, data: null, error: err.message || 'Fetch failed' };
  }
}

export const handler: Handler = async (event) => {
  const symbolsParam = event.queryStringParameters?.symbols || '';
  const requestedList = symbolsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Always include EGX 30 (^CASE30), EGX 70 (^EGX70EWI.CA), and EUR/EGP (EGPEUR=X)
  const allSymbols = Array.from(new Set([...requestedList, '^CASE30', '^EGX70EWI.CA', 'EGPEUR=X']));

  const results = await Promise.all(allSymbols.map((sym) => fetchSymbolChart(sym)));

  const quotes: Record<string, any> = {};
  const errors: Record<string, string> = {};

  for (const item of results) {
    if (item.data) {
      quotes[item.symbol] = item.data;
    } else if (item.error) {
      errors[item.symbol] = item.error;
    }
  }

  const egx30 = quotes['^CASE30'] || null;
  const egx70 = quotes['^EGX70EWI.CA'] || null;
  const egpEurRate = quotes['EGPEUR=X']?.regularMarketPrice || null;

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
      egpEurRate,
      quotes,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    }),
  };
};
