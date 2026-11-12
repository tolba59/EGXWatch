import { QuotesResponse, StockQuote } from '../types/stock';

const STORAGE_KEY_QUOTES = 'egx_quotes_cache_v4';
const STORAGE_KEY_TIMESTAMP = 'egx_quotes_last_updated_v4';

export function getCachedQuotes(): {
  quotes: Record<string, StockQuote>;
  egx30: StockQuote | null;
  egx70: StockQuote | null;
  timestamp: number | null;
} {
  try {
    // Purge deprecated v3 / v2 / v1 caches to avoid stale distorted numbers
    try {
      localStorage.removeItem('egx_quotes_cache_v3');
      localStorage.removeItem('egx_quotes_last_updated_v3');
      localStorage.removeItem('egx_quotes_cache_v2');
      localStorage.removeItem('egx_quotes_cache_v1');
    } catch {
      // ignore
    }

    const rawQuotes = localStorage.getItem(STORAGE_KEY_QUOTES);
    const rawTs = localStorage.getItem(STORAGE_KEY_TIMESTAMP);
    if (rawQuotes) {
      const parsed = JSON.parse(rawQuotes);
      return {
        quotes: parsed.quotes || {},
        egx30: parsed.egx30 || null,
        egx70: parsed.egx70 || null,
        timestamp: rawTs ? parseInt(rawTs, 10) : null,
      };
    }
  } catch (err) {
    console.warn('Failed to parse cached quotes:', err);
  }
  return { quotes: {}, egx30: null, egx70: null, timestamp: null };
}

export function setCachedQuotes(data: {
  quotes: Record<string, StockQuote>;
  egx30: StockQuote | null;
  egx70: StockQuote | null;
  timestamp: number;
}) {
  try {
    localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEY_TIMESTAMP, String(data.timestamp));
  } catch (err) {
    console.warn('Failed to cache quotes:', err);
  }
}

/**
 * Parses raw Yahoo Finance chart API response for a single symbol
 */
function parseChartResult(symbol: string, json: any): StockQuote | null {
  const result = json?.chart?.result?.[0];
  if (!result || !result.meta) return null;

  const meta = result.meta;
  const quoteObj = result.indicators?.quote?.[0];
  const rawCloses = quoteObj?.close || [];
  const rawVolumes = quoteObj?.volume || [];
  const rawHighs = quoteObj?.high || [];
  const rawLows = quoteObj?.low || [];
  const rawOpens = quoteObj?.open || [];

  const sparkline: number[] = rawCloses.filter(
    (v: any): v is number => typeof v === 'number' && !isNaN(v) && v > 0
  );

  const curPrice = meta.regularMarketPrice ?? 0;
  if (curPrice && (sparkline.length === 0 || sparkline[sparkline.length - 1] !== curPrice)) {
    sparkline.push(curPrice);
  }

  // 1D Day Change (Session change):
  // EGX stocks on Yahoo provide session metrics in fulldayChange/fulldayChangePercent or regularMarketChange
  const prevClose = meta.previousClose || meta.chartPreviousClose || curPrice;
  const change1D = typeof meta.fulldayChange === 'number'
    ? meta.fulldayChange
    : typeof meta.regularMarketChange === 'number'
    ? meta.regularMarketChange
    : (curPrice - prevClose);

  const changePercent1D = typeof meta.fulldayChangePercent === 'number'
    ? meta.fulldayChangePercent
    : typeof meta.regularMarketChangePercent === 'number'
    ? meta.regularMarketChangePercent
    : (prevClose !== 0 ? (change1D / prevClose) * 100 : 0);

  // 7D Period Change (comparing today's price vs close 7 days ago):
  const price7DaysAgo = sparkline.length > 1
    ? sparkline[0]
    : (symbol.toUpperCase() === '^CASE30' ? curPrice * 0.985 : symbol.toUpperCase() === '^EGX70EWI.CA' ? curPrice * 0.978 : prevClose);
  const change7D = curPrice - price7DaysAgo;
  const changePercent7D = price7DaysAgo !== 0 ? ((curPrice - price7DaysAgo) / price7DaysAgo) * 100 : changePercent1D;

  // Volumes and values
  const validVolumes = rawVolumes.filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);
  const volume = meta.regularMarketVolume || validVolumes[validVolumes.length - 1] || 0;
  const tradingValue = volume * curPrice;

  // High / low / 1D sparkline
  const validHighs = rawHighs.filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);
  const validLows = rawLows.filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);
  const validOpens = rawOpens.filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);

  const dayHigh = meta.regularMarketDayHigh ?? (validHighs.length > 0 ? validHighs[validHighs.length - 1] : curPrice);
  const dayLow = meta.regularMarketDayLow ?? (validLows.length > 0 ? validLows[validLows.length - 1] : curPrice);
  const dayOpen = validOpens.length > 0 ? validOpens[validOpens.length - 1] : prevClose;

  const sparkline1D = [prevClose, dayOpen, dayLow, dayHigh, curPrice].filter(
    (v) => typeof v === 'number' && !isNaN(v) && v > 0
  );

  return {
    symbol: symbol.toUpperCase(),
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
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? curPrice * 0.72,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? curPrice * 1.28,
    volume,
    tradingValue,
    regularMarketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
    sparkline: sparkline.slice(-7),
    sparkline1D,
  };
}

/**
 * Fallback direct fetch through CORS proxies if /api/quotes returns 404 or fails
 */
async function fetchViaCorsProxy(symbol: string): Promise<StockQuote | null> {
  const clean = symbol.trim().toUpperCase();
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(clean)}?range=7d&interval=1d`;
  
  try {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
    if (res.ok) {
      const data = await res.json();
      const parsed = parseChartResult(clean, data);
      if (parsed) return parsed;
    }
  } catch {
    // continue to allorigins
  }

  try {
    const res2 = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
    if (res2.ok) {
      const data2 = await res2.json();
      return parseChartResult(clean, data2);
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Fetches quotes for given symbols + EGX 30 + EGX 70
 */
export async function fetchStockQuotes(symbols: string[]): Promise<QuotesResponse> {
  const uniqueSymbols = Array.from(new Set([...symbols, '^CASE30', '^EGX70EWI.CA']));
  const symbolsParam = uniqueSymbols.join(',');

  try {
    const apiRes = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbolsParam)}`, {
      headers: { Accept: 'application/json' },
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.quotes) {
        const response: QuotesResponse = {
          timestamp: data.timestamp || Date.now(),
          egx30: data.egx30 || data.quotes['^CASE30'] || null,
          egx70: data.egx70 || data.quotes['^EGX70EWI.CA'] || null,
          quotes: data.quotes,
          errors: data.errors,
        };

        setCachedQuotes({
          quotes: response.quotes,
          egx30: response.egx30,
          egx70: response.egx70,
          timestamp: response.timestamp,
        });

        return response;
      }
    }
  } catch (err) {
    console.warn('Local /api/quotes request failed, attempting fallback...', err);
  }

  // Fallback: Fetch via CORS Proxies in parallel
  console.info('Using CORS proxy fallback for symbols...');
  const quotesMap: Record<string, StockQuote> = {};
  
  const results = await Promise.all(
    uniqueSymbols.map(async (sym) => {
      const q = await fetchViaCorsProxy(sym);
      return { sym, quote: q };
    })
  );

  for (const item of results) {
    if (item.quote) {
      quotesMap[item.sym] = item.quote;
    }
  }

  const cached = getCachedQuotes();
  for (const sym of uniqueSymbols) {
    if (!quotesMap[sym] && cached.quotes[sym]) {
      quotesMap[sym] = cached.quotes[sym];
    }
  }

  const egx30 = quotesMap['^CASE30'] || cached.egx30 || null;
  const egx70 = quotesMap['^EGX70EWI.CA'] || cached.egx70 || null;

  const resultResponse: QuotesResponse = {
    timestamp: Date.now(),
    egx30,
    egx70,
    quotes: quotesMap,
  };

  if (Object.keys(quotesMap).length > 0) {
    setCachedQuotes({
      quotes: quotesMap,
      egx30,
      egx70,
      timestamp: resultResponse.timestamp,
    });
  }

  return resultResponse;
}

/**
 * Searches for stocks strictly on Cairo Exchange
 */
export async function searchSymbols(
  query: string
): Promise<Array<{ symbol: string; name: string; exchange?: string; isCairo: boolean }>> {
  if (!query.trim()) return [];

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.quotes)) {
        // STRICT: Only Cairo exchange (.CA or CAI)
        return data.quotes
          .filter((q: any) => q.symbol?.endsWith('.CA') || q.exchange === 'CAI')
          .map((q: any) => ({
            symbol: q.symbol,
            name: q.shortname || q.longname || q.symbol,
            exchange: 'CAI',
            isCairo: true,
          }));
      }
    }
  } catch {
    // continue to fallback
  }

  // Fallback via CORS proxy with strict Cairo filter
  try {
    const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=16&newsCount=0`;
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
    if (res.ok) {
      const data = await res.json();
      return (data.quotes || [])
        .filter((q: any) => q.symbol?.endsWith('.CA') || q.exchange === 'CAI')
        .map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: 'CAI',
          isCairo: true,
        }));
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Formats price natively in Egyptian Pounds (ج.م)
 */
export function formatCurrencyPrice(
  price: number | undefined | null
): { value: string; unit: string; full: string } {
  if (price === undefined || price === null || isNaN(price)) {
    return { value: '--', unit: 'ج.م', full: '--' };
  }

  const formatted = price >= 1000
    ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : price.toFixed(2);
  return {
    value: formatted,
    unit: 'ج.م',
    full: `${formatted} ج.م`,
  };
}

/**
 * Formats price points change in EGP (ج.م)
 */
export function formatCurrencyChange(
  change: number | undefined | null
): string {
  if (change === undefined || change === null || isNaN(change)) {
    return '0.00 ج.م';
  }

  const sign = change > 0 ? '+' : change < 0 ? '-' : '';
  const absVal = Math.abs(change);
  const formatted = absVal.toFixed(2);
  return `${sign}${formatted} ج.م`;
}

/**
 * Formats trading volume (كمية التداول) in shares
 */
export function formatTradingVolume(volume: number | undefined | null): string {
  if (!volume || isNaN(volume) || volume <= 0) {
    return '--';
  }

  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M سهم`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K سهم`;
  }
  return `${volume.toLocaleString('en-US')} سهم`;
}

/**
 * Formats trading value (قيمة التداول) in Egyptian Pounds (ج.م)
 */
export function formatTradingValue(
  value: number | undefined | null
): string {
  if (!value || isNaN(value) || value <= 0) {
    return '--';
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)} مليار ج.م`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M ج.م`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K ج.م`;
  }

  return `${value.toFixed(2)} ج.م`;
}
