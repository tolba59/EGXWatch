import React from 'react';
import {
  Search,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { StockSector, SortOption } from '../types/stock';

interface FilterAndSortBarProps {
  sectors: StockSector[];
  activeSector: string;
  onSelectSector: (sector: string) => void;
  sectorCounts: Record<string, number>;
  totalCount: number;
  sortOption: SortOption;
  onChangeSort: (option: SortOption) => void;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  advancingCount: number;
  decliningCount: number;
  unchangedCount: number;
}

export const FilterAndSortBar: React.FC<FilterAndSortBarProps> = ({
  sectors,
  activeSector,
  onSelectSector,
  sectorCounts,
  totalCount,
  sortOption,
  onChangeSort,
  searchQuery,
  onChangeSearch,
  advancingCount,
  decliningCount,
  unchangedCount,
}) => {
  return (
    <div className="space-y-3">
      {/* Upper strip: Market breadth counter & Quick search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Watchlist Breadth Strip (صاعد / هابط / مستقر) */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">حالة القائمة اليوم:</span>
          
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold tabular-nums">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>{advancingCount} صاعد</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-bold tabular-nums">
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            <span>{decliningCount} هابط</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-semibold tabular-nums">
            <Minus className="w-3.5 h-3.5 text-slate-500" />
            <span>{unchangedCount} مستقر</span>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="بحث في قائمتك (الاسم أو الرمز)..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pr-8 pl-3 text-xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortOption}
              onChange={(e) => onChangeSort(e.target.value as SortOption)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pr-7 pl-3 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50 focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="custom">الترتيب المخصص</option>
              <option value="gainers">الأكثر ارتفاعاً (%)</option>
              <option value="losers">الأكثر انخفاضاً (%)</option>
              <option value="valueDesc">الأعلى قيمة تداول (سيولة)</option>
              <option value="volumeDesc">الأعلى كمية تداول (أسهم)</option>
              <option value="nameAsc">الاسم (أ - ي)</option>
              <option value="priceDesc">الأعلى سعراً</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Sector Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onSelectSector('ALL')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSector === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>الكل</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
              activeSector === 'ALL' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {sectors.map((sec) => {
          const count = sectorCounts[sec] || 0;
          if (count === 0 && activeSector !== sec) return null;
          const isActive = activeSector === sec;

          return (
            <button
              key={sec}
              onClick={() => onSelectSector(sec)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{sec}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                  isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
