import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit2,
  BarChart3,
  Coins,
} from 'lucide-react';
import {
  StockItem,
  StockQuote,
  ChartRange,
  getDisplaySymbol,
} from '../types/stock';
import {
  formatCurrencyPrice,
  formatCurrencyChange,
  formatTradingVolume,
  formatTradingValue,
} from '../services/quotesService';
import { SparklineChart } from './SparklineChart';

interface StockTileProps {
  item: StockItem;
  quote?: StockQuote;
  chartRange: ChartRange;
  isEditMode: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const StockTile: React.FC<StockTileProps> = ({
  item,
  quote,
  chartRange,
  isEditMode,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}) => {
  const price = quote?.regularMarketPrice;
  const prevClose = quote?.chartPreviousClose;
  // DYNAMIC PERIOD CHANGE: Computes distinct 1D vs 7D metrics
  const is1D = chartRange === '1D';
  const curPrice = quote?.regularMarketPrice ?? 0;
  const sparklineCloses = quote?.sparkline || [];

  // 7D Period Change (Price today vs Price 7 days ago)
  const start7D = sparklineCloses.length > 0 ? sparklineCloses[0] : (quote?.chartPreviousClose || curPrice);
  const fallbackChange7D = curPrice - start7D;
  const fallbackChangePct7D = start7D > 0 ? ((curPrice - start7D) / start7D) * 100 : 0;

  const change7D = quote?.change7D !== undefined ? quote.change7D : fallbackChange7D;
  const changePercent7D = quote?.changePercent7D !== undefined ? quote.changePercent7D : fallbackChangePct7D;

  // 1D Day Session Change (Today's session gain/loss)
  let change1D = quote?.change1D ?? quote?.change ?? 0;
  let changePercent1D = quote?.changePercent1D ?? quote?.changePercent ?? 0;

  // If 1D was accidentally identical to 7D (e.g. from older cache where 1D was set to 7D chartPreviousClose drop), derive session change
  if (
    quote?.change1D === undefined &&
    sparklineCloses.length >= 2 &&
    Math.abs(changePercent1D - changePercent7D) < 0.01 &&
    Math.abs(changePercent7D) > 0.05
  ) {
    const prevSessionClose = sparklineCloses[sparklineCloses.length - 2];
    if (prevSessionClose && prevSessionClose > 0) {
      change1D = curPrice - prevSessionClose;
      changePercent1D = ((curPrice - prevSessionClose) / prevSessionClose) * 100;
    }
  }

  const changePercent = is1D ? changePercent1D : changePercent7D;
  const change = is1D ? change1D : change7D;

  const isPositive = changePercent > 0.001;
  const isNegative = changePercent < -0.001;
  const isNeutral = !isPositive && !isNegative;

  // Clean 4-letter display ticker (e.g. "COMI" instead of "COMI.CA")
  const displayTicker = getDisplaySymbol(item.symbol);

  // Dynamic heatmap colors based on percentage magnitude of selected period
  let containerBg = 'bg-white';
  let containerBorder = 'border-slate-200';
  let badgeBg = 'bg-slate-100 text-slate-700';
  let textColor = 'text-slate-900';

  if (isPositive) {
    if (changePercent >= 4.0) {
      containerBg = 'bg-emerald-50/90';
      containerBorder = 'border-emerald-400 ring-1 ring-emerald-300/40';
      badgeBg = 'bg-emerald-600 text-white shadow-xs';
      textColor = 'text-emerald-950';
    } else if (changePercent >= 1.5) {
      containerBg = 'bg-emerald-50/70';
      containerBorder = 'border-emerald-300';
      badgeBg = 'bg-emerald-500 text-white';
      textColor = 'text-emerald-900';
    } else {
      containerBg = 'bg-emerald-50/40';
      containerBorder = 'border-emerald-200';
      badgeBg = 'bg-emerald-100 text-emerald-800';
      textColor = 'text-emerald-900';
    }
  } else if (isNegative) {
    const absChange = Math.abs(changePercent);
    if (absChange >= 4.0) {
      containerBg = 'bg-rose-50/90';
      containerBorder = 'border-rose-400 ring-1 ring-rose-300/40';
      badgeBg = 'bg-rose-600 text-white shadow-xs';
      textColor = 'text-rose-950';
    } else if (absChange >= 1.5) {
      containerBg = 'bg-rose-50/70';
      containerBorder = 'border-rose-300';
      badgeBg = 'bg-rose-500 text-white';
      textColor = 'text-rose-900';
    } else {
      containerBg = 'bg-rose-50/40';
      containerBorder = 'border-rose-200';
      badgeBg = 'bg-rose-100 text-rose-800';
      textColor = 'text-rose-900';
    }
  }

  // Price and change formatting (100% native EGP)
  const formattedPrice = formatCurrencyPrice(price);
  const formattedChange = formatCurrencyChange(change);
  const formattedPrevClose = formatCurrencyPrice(prevClose);

  // Volume & Trading value today
  const formattedVolume = formatTradingVolume(quote?.volume);
  const formattedTradingValue = formatTradingValue(quote?.tradingValue);

  // 52-week position calculation
  const low52 = quote?.fiftyTwoWeekLow ?? (price ? price * 0.75 : 0);
  const high52 = quote?.fiftyTwoWeekHigh ?? (price ? price * 1.25 : 100);
  const range52 = high52 - low52 || 1;
  const currentPos = price ? Math.max(0, Math.min(100, ((price - low52) / range52) * 100)) : 50;

  const formattedLow52 = formatCurrencyPrice(low52);
  const formattedHigh52 = formatCurrencyPrice(high52);

  // Day range
  const dayLowFormatted = formatCurrencyPrice(quote?.dayLow);
  const dayHighFormatted = formatCurrencyPrice(quote?.dayHigh);

  // Chart data: 1D vs 7D
  const chartData = is1D
    ? (quote?.sparkline1D && quote.sparkline1D.length >= 2 ? quote.sparkline1D : quote?.sparkline || [])
    : (quote?.sparkline || []);

  const chartLabel = is1D ? 'أداء اليوم (1D)' : 'أداء ٧ أيام (7D)';
  const periodBadgeLabel = is1D ? 'اليوم' : '٧ أيام';

  return (
    <div
      className={`group relative rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 hover:shadow-md ${containerBg} ${containerBorder}`}
    >
      {/* Edit Mode Overlay / Actions */}
      {isEditMode && (
        <div className="mb-2.5 flex items-center justify-between pb-2 border-b border-slate-200/80 bg-white/80 -mx-3.5 -mt-3.5 sm:-mx-4 sm:-mt-4 p-2.5 sm:p-3 rounded-t-2xl">
          <div className="flex items-center gap-1">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              title="تحريك لأعلى"
              className="p-1 rounded-md text-slate-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              title="تحريك لأسفل"
              className="p-1 rounded-md text-slate-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onEdit}
              title="تعديل الاسم أو القطاع"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>تعديل</span>
            </button>
            <button
              onClick={onDelete}
              title="حذف من قائمة المتابعة"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Header: Clean 4-letter Ticker, Arabic Company Name & Sector */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Clean 4-letter Ticker Code (No .CA) */}
            <span
              dir="ltr"
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-bold tracking-wider shrink-0 shadow-2xs"
            >
              {displayTicker}
            </span>

            {/* Arabic Name */}
            <h3
              className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate"
              title={item.name}
            >
              {item.name}
            </h3>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span className="truncate">{item.sector}</span>
          </div>
        </div>
      </div>

      {/* 2. Primary Price Row & Sparkline */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${textColor}`}
            >
              {formattedPrice.value}
            </span>
            <span className="text-xs font-bold text-slate-500">
              {formattedPrice.unit}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {/* Percentage Badge - matches selected period (1D vs 7D) */}
            <span
              key={`badge-${chartRange}-${item.symbol}`}
              dir="ltr"
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-bold tabular-nums tracking-wide transition-all duration-200 ${badgeBg}`}
              title={`نسبة تغير ${chartLabel}`}
            >
              {isPositive && <ArrowUp className="w-3 h-3 stroke-[2.5]" />}
              {isNegative && <ArrowDown className="w-3 h-3 stroke-[2.5]" />}
              {isNeutral && <Minus className="w-3 h-3 stroke-[2.5]" />}
              <span>
                {isPositive ? '+' : ''}
                {changePercent.toFixed(2)}%
              </span>
            </span>

            {/* Period Point Change */}
            <span
              key={`change-${chartRange}-${item.symbol}`}
              dir="ltr"
              className={`text-[11px] sm:text-xs font-semibold tabular-nums transition-all duration-200 ${
                isPositive
                  ? 'text-emerald-700'
                  : isNegative
                  ? 'text-rose-700'
                  : 'text-slate-500'
              }`}
            >
              {formattedChange}
            </span>

            <span className="text-[10px] text-slate-500 font-bold px-1 py-0.2 rounded bg-slate-100">
              {periodBadgeLabel}
            </span>
          </div>
        </div>

        {/* Sparkline (1D or 7D) */}
        <div className="shrink-0 flex flex-col items-end">
          <div className="text-[10px] font-medium text-slate-400 mb-0.5">
            {chartLabel}
          </div>
          <SparklineChart
            data={chartData}
            isPositive={isPositive || isNeutral}
            width={110}
            height={32}
          />
        </div>
      </div>

      {/* 3. Trading Activity Today: Amount (كمية التداول) & Value (قيمة التداول) */}
      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-white/80 p-2 border border-slate-200/70 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-slate-100 text-slate-600 shrink-0">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-slate-400 font-medium">كمية التداول</span>
            <span className="font-bold text-slate-800 tabular-nums text-[11px] truncate block" dir="ltr">
              {formattedVolume}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-emerald-100 text-emerald-700 shrink-0">
            <Coins className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-slate-400 font-medium">قيمة التداول</span>
            <span className="font-bold text-slate-800 tabular-nums text-[11px] truncate block" dir="ltr">
              {formattedTradingValue}
            </span>
          </div>
        </div>
      </div>

      {/* 4. 52-Week Range Bar */}
      <div className="mt-2.5 pt-2 border-t border-slate-200/60">
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 font-medium mb-1">
          <span>نطاق ٥٢ أسبوع</span>
          <span className="text-[10px] text-slate-400">
            {Math.round(currentPos)}%
          </span>
        </div>
        <div className="relative h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-slate-400'
            }`}
            style={{ width: `${currentPos}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 tabular-nums font-mono">
          <span title="أدنى ٥٢ أسبوع">{formattedLow52.full}</span>
          <span className="text-slate-400 text-[9px]">أدنى / أعلى</span>
          <span title="أعلى ٥٢ أسبوع">{formattedHigh52.full}</span>
        </div>
      </div>

      {/* 5. Footer: Day Range & Prev Close */}
      <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-600 px-1 pt-1 border-t border-slate-100">
        <div>
          <span className="text-slate-400">مدى اليوم: </span>
          <span className="font-semibold tabular-nums text-slate-700">
            {dayLowFormatted.value} - {dayHighFormatted.value}
          </span>
        </div>
        <div>
          <span className="text-slate-400">الإغلاق السابق: </span>
          <span className="font-semibold tabular-nums text-slate-700">
            {formattedPrevClose.full}
          </span>
        </div>
      </div>
    </div>
  );
};
