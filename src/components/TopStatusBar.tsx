import React from 'react';
import {
  RotateCw,
  Plus,
  SlidersHorizontal,
  Database,
  Clock,
  Cloud,
  Loader2,
} from 'lucide-react';
import {
  StockQuote,
  RefreshInterval,
  ChartRange,
  SyncStatus,
} from '../types/stock';
import { EGXMarketInfo } from '../utils/egxMarketHours';
import { PWAInstallButton } from './PWAInstallButton';

interface TopStatusBarProps {
  marketInfo: EGXMarketInfo;
  egx30: StockQuote | null;
  egx70: StockQuote | null;
  chartRange: ChartRange;
  onToggleChartRange: (range: ChartRange) => void;
  refreshInterval: RefreshInterval;
  onChangeRefreshInterval: (interval: RefreshInterval) => void;
  lastUpdated: number | null;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onOpenBackupModal: () => void;
  syncCode: string | null;
  syncStatus: SyncStatus;
  onOpenSyncModal: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  marketInfo,
  egx30,
  egx70,
  chartRange,
  onToggleChartRange,
  refreshInterval,
  onChangeRefreshInterval,
  lastUpdated,
  isLoading,
  onRefresh,
  onOpenAddModal,
  isEditMode,
  onToggleEditMode,
  onOpenBackupModal,
  syncCode,
  syncStatus,
  onOpenSyncModal,
}) => {
  // Format last updated time cleanly with AM/PM in Arabic
  const lastUpdatedFormatted = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '--:--';

  const egx30Points = egx30?.regularMarketPrice;
  const is1D = chartRange === '1D';

  // Period-aware benchmark changes
  const egx30Change1D = egx30?.changePercent1D ?? egx30?.changePercent ?? 0;
  const egx30Change7D = egx30?.changePercent7D ?? egx30Change1D;
  const egx30Change = is1D ? egx30Change1D : egx30Change7D;
  const isEgx30Pos = egx30Change > 0.001;
  const isEgx30Neg = egx30Change < -0.001;

  const egx70Points = egx70?.regularMarketPrice;
  const egx70Change1D = egx70?.changePercent1D ?? egx70?.changePercent ?? 0;
  const egx70Change7D = egx70?.changePercent7D ?? egx70Change1D;
  const egx70Change = is1D ? egx70Change1D : egx70Change7D;
  const isEgx70Pos = egx70Change > 0.001;
  const isEgx70Neg = egx70Change < -0.001;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 space-y-2.5">
        {/* Row 1: Brand Logo, Title, Market Status Badge, Primary Add Button */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & App Title & Market Status */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xs shrink-0">
              <span className="font-extrabold text-xs sm:text-sm tracking-tighter">EGX</span>
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                  نبض البورصة المصرية
                </h1>
                {/* Live Market Status Pill */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${marketInfo.badgeClass}`}
                  title={`توقيت القاهرة: ${marketInfo.cairoTimeFormatted} — ${marketInfo.nextSessionText}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      marketInfo.status === 'open'
                        ? 'bg-emerald-500 animate-pulse'
                        : marketInfo.status === 'pre-open'
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>{marketInfo.statusTextArabic}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Primary Actions: Add Stock Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سهم</span>
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton />
          </div>
        </div>

        {/* Row 2: Clean 2-Column Benchmark Tickers Grid (EGX 30 & EGX 70) */}
        {/* Generous sizing on mobile with NO crowded 3rd column */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* 1. EGX 30 Ticker Card */}
          <div className="flex flex-col justify-center rounded-xl bg-slate-50 border border-slate-200/90 p-2 sm:px-3 sm:py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate">
                مؤشر EGX 30
              </span>
              <span className="text-[9px] text-slate-400 font-medium">
                {is1D ? 'اليوم' : '٧ أيام'}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-0.5">
              <span className="font-black text-slate-900 tabular-nums text-sm sm:text-base">
                {egx30Points
                  ? egx30Points.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                  : '52,023'}
              </span>
              <span
                dir="ltr"
                className={`text-xs font-bold tabular-nums px-1.5 py-0.2 rounded-md ${
                  isEgx30Pos
                    ? 'text-emerald-700 bg-emerald-100/70'
                    : isEgx30Neg
                    ? 'text-rose-700 bg-rose-100/70'
                    : 'text-slate-600 bg-slate-200'
                }`}
              >
                {isEgx30Pos ? '+' : ''}
                {egx30Change.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* 2. EGX 70 Ticker Card */}
          <div className="flex flex-col justify-center rounded-xl bg-slate-50 border border-slate-200/90 p-2 sm:px-3 sm:py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate">
                مؤشر EGX 70 EWI
              </span>
              <span className="text-[9px] text-slate-400 font-medium">
                {is1D ? 'اليوم' : '٧ أيام'}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-0.5">
              <span className="font-black text-slate-900 tabular-nums text-sm sm:text-base">
                {egx70Points
                  ? egx70Points.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                  : '18,527'}
              </span>
              <span
                dir="ltr"
                className={`text-xs font-bold tabular-nums px-1.5 py-0.2 rounded-md ${
                  isEgx70Pos
                    ? 'text-emerald-700 bg-emerald-100/70'
                    : isEgx70Neg
                    ? 'text-rose-700 bg-rose-100/70'
                    : 'text-slate-600 bg-slate-200'
                }`}
              >
                {isEgx70Pos ? '+' : ''}
                {egx70Change.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Row 3: Action Controls Bar (1D/7D Toggle, Refresh Frequency, Refresh Button, Edit, Backup) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs text-slate-600">
          {/* Left: 1D / 7D Chart Range Selector + Auto-Refresh dropdown */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 1D vs 7D Toggle Pill */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                onClick={() => onToggleChartRange('1D')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  chartRange === '1D'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="عرض الرسم والنسب لجلسة اليوم"
              >
                1D
              </button>
              <button
                onClick={() => onToggleChartRange('7D')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  chartRange === '7D'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="عرض الرسم والنسب لآخر 7 أيام"
              >
                7D
              </button>
            </div>

            {/* Refresh Interval Selector (Default: 2m) */}
            <div className="relative">
              <select
                value={refreshInterval}
                onChange={(e) => onChangeRefreshInterval(e.target.value as RefreshInterval)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-medium text-slate-700 cursor-pointer pr-2.5 pl-6 focus:outline-hidden"
                title="تكرار التحديث التلقائي أثناء الجلسة"
              >
                <option value="2m">تحديث: كل دقيقتين</option>
                <option value="1m">تحديث: كل دقيقة</option>
                <option value="5m">تحديث: كل ٥ دقائق</option>
                <option value="manual">تحديث: يدوي فقط</option>
              </select>
              <Clock className="w-3 h-3 text-slate-400 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-[11px] sm:text-xs font-semibold cursor-pointer disabled:opacity-50"
              title="تحديث الأسعار الآن"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden xs:inline">تحديث</span>
            </button>
          </div>

          {/* Right: Sync, Edit Mode & Backup Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={onOpenSyncModal}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                syncCode
                  ? 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-300 text-emerald-800'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title={syncCode ? `متصل بالمزامنة السحابية (${syncCode})` : 'مزامنة القائمة بين الأجهزة'}
            >
              {syncStatus === 'syncing' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
              ) : (
                <Cloud className={`w-3.5 h-3.5 shrink-0 ${syncCode ? 'text-emerald-600' : 'text-slate-500'}`} />
              )}
              <span>مزامنة</span>
              {syncCode && (
                <span
                  dir="ltr"
                  className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white tracking-wide"
                >
                  {syncCode}
                </span>
              )}
            </button>

            <button
              onClick={onToggleEditMode}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isEditMode
                  ? 'bg-amber-500 border-amber-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="تعديل ترتيب أو حذف الأسهم"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'إنهاء التعديل' : 'تعديل'}</span>
            </button>

            <button
              onClick={onOpenBackupModal}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shrink-0"
              title="النسخ الاحتياطي وإدارة القائمة"
            >
              <Database className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 4: Clean, Unmessed Mobile Status & Last Update Strip */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <span>آخر تحديث:</span>
            <span dir="ltr" className="font-mono font-bold text-slate-700">
              {lastUpdatedFormatted}
            </span>
          </div>

          <div>
            {!marketInfo.isOpenSession ? (
              <span className="text-slate-600 font-medium">
                السوق مغلق (الأسعار ثابتة)
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">
                تحديث نشط كل دقيقتين
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
