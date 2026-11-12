export type StockSector =
  | 'البنوك والتكنولوجيا المالية'
  | 'العقارات والمقاولات'
  | 'الصناعة والأسمدة'
  | 'الاتصالات والاستهلاكي'
  | 'أخرى';

export interface StockItem {
  symbol: string; // e.g. "COMI.CA" or "COMI"
  name: string; // Arabic company name e.g. "البنك التجاري الدولي (CIB)"
  sector: StockSector | string;
  order: number;
  addedAt?: number;
}

export interface StockQuote {
  symbol: string;
  currency: string; // 'EGP'
  regularMarketPrice: number;
  chartPreviousClose: number;
  // 1D Day Change (Today's session)
  change: number;
  changePercent: number;
  change1D?: number;
  changePercent1D?: number;
  // 7D Period Change (vs 7 days ago)
  change7D: number;
  changePercent7D: number;
  dayLow: number;
  dayHigh: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  volume: number; // كمية التداول (عدد الأسهم)
  tradingValue: number; // قيمة التداول (ج.م)
  regularMarketTime: number;
  sparkline: number[]; // أداء 7 أيام
  sparkline1D: number[]; // أداء جلسة اليوم
}

export type RefreshInterval = '2m' | '1m' | '5m' | 'manual';
export type SortOption = 'custom' | 'gainers' | 'losers' | 'nameAsc' | 'priceDesc' | 'volumeDesc' | 'valueDesc';
export type MarketStatus = 'open' | 'pre-open' | 'closed';
export type ChartRange = '1D' | '7D';

export interface QuotesResponse {
  timestamp: number;
  egx30: StockQuote | null;
  egx70: StockQuote | null;
  quotes: Record<string, StockQuote>;
  errors?: Record<string, string>;
}

/**
 * Utility to display only the 4 main letters (e.g. "COMI" instead of "COMI.CA")
 */
export function getDisplaySymbol(symbol: string): string {
  if (!symbol) return '';
  return symbol.replace(/\.CA$/i, '').trim();
}

/**
 * Utility to normalize a symbol for Yahoo Finance query (adds .CA if no dot)
 */
export function toQuerySymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean.startsWith('^') || clean.includes('.')) {
    return clean;
  }
  return `${clean}.CA`;
}
