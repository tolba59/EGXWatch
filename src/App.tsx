/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StockItem,
  StockQuote,
  RefreshInterval,
  SortOption,
  ChartRange,
  SyncDashboardData,
  SyncStatus,
} from './types/stock';
import { DEFAULT_WATCHLIST, SECTORS } from './data/defaultWatchlist';
import {
  fetchStockQuotes,
  getCachedQuotes,
} from './services/quotesService';
import {
  generateSyncCode,
  getLastSyncedAt,
  getLocalUpdatedAt,
  getStoredSyncCode,
  pullFromCloud,
  pushToCloud,
  setLastSyncedAt,
  setLocalUpdatedAt,
  setStoredSyncCode,
  unlinkSync,
} from './services/syncService';
import { getEGXMarketInfo, EGXMarketInfo } from './utils/egxMarketHours';
import { TopStatusBar } from './components/TopStatusBar';
import { FilterAndSortBar } from './components/FilterAndSortBar';
import { StockTile } from './components/StockTile';
import { AddStockModal } from './components/AddStockModal';
import { EditStockModal } from './components/EditStockModal';
import { BackupModal } from './components/BackupModal';
import { SyncModal } from './components/SyncModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Plus, SlidersHorizontal } from 'lucide-react';

const STORAGE_KEY_WATCHLIST = 'egx_user_watchlist_v3';
const STORAGE_KEY_INTERVAL = 'egx_pref_refresh_interval_v3';
const STORAGE_KEY_CHART_RANGE = 'egx_pref_chart_range_v3';

export default function App() {
  // 1. Watchlist state (initialized from localStorage or default 16 blue chips)
  const [watchlist, setWatchlist] = useState<StockItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WATCHLIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load watchlist from localStorage', e);
    }
    return DEFAULT_WATCHLIST;
  });

  // 2. Preferences: Refresh Interval (Default: 2m) and Chart Range (Default: 1D)
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(() => {
    return (localStorage.getItem(STORAGE_KEY_INTERVAL) as RefreshInterval) || '2m';
  });

  const [chartRange, setChartRange] = useState<ChartRange>(() => {
    return (localStorage.getItem(STORAGE_KEY_CHART_RANGE) as ChartRange) || '1D';
  });

  // 3. Quotes & Market State (EGX 30, EGX 70, and individual stocks in native EGP)
  const initialCache = useMemo(() => getCachedQuotes(), []);
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>(initialCache.quotes);
  const [egx30, setEgx30] = useState<StockQuote | null>(initialCache.egx30);
  const [egx70, setEgx70] = useState<StockQuote | null>(initialCache.egx70);
  const [lastUpdated, setLastUpdated] = useState<number | null>(initialCache.timestamp);
  const [isLoading, setIsLoading] = useState(false);

  // 4. Live EGX Market Session Status
  const [marketInfo, setMarketInfo] = useState<EGXMarketInfo>(() => getEGXMarketInfo());

  // 5. UI Filters, Sort & Modals
  const [activeSector, setActiveSector] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('custom');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);

  // 6. Multi-Device Cloud Sync state
  const [syncCode, setSyncCode] = useState<string | null>(() => getStoredSyncCode());
  const [lastSyncedAt, setLastSyncedAtState] = useState<number | null>(() => getLastSyncedAt());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const hasMountedSyncRef = useRef(false);
  const suppressNextAutoPushRef = useRef(false);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify(watchlist));
    } catch (e) {
      console.warn('Failed to save watchlist', e);
    }
  }, [watchlist]);

  const applyCloudData = useCallback((cloudData: SyncDashboardData, cloudUpdatedAt: number) => {
    suppressNextAutoPushRef.current = true;
    if (Array.isArray(cloudData.watchlist) && cloudData.watchlist.length > 0) {
      setWatchlist(cloudData.watchlist);
    }
    if (cloudData.refreshInterval) {
      setRefreshInterval(cloudData.refreshInterval);
      localStorage.setItem(STORAGE_KEY_INTERVAL, cloudData.refreshInterval);
    }
    if (cloudData.chartRange) {
      setChartRange(cloudData.chartRange);
      localStorage.setItem(STORAGE_KEY_CHART_RANGE, cloudData.chartRange);
    }
    if (cloudData.sortOption) {
      setSortOption(cloudData.sortOption);
    }
    const now = Date.now();
    setLocalUpdatedAt(cloudUpdatedAt);
    setLastSyncedAt(now);
    setLastSyncedAtState(now);
  }, []);

  // Auto-pull latest cloud state on app startup if linked & online
  useEffect(() => {
    const initialCode = getStoredSyncCode();
    if (!initialCode) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    let cancelled = false;
    setSyncStatus('syncing');

    pullFromCloud(initialCode)
      .then(async (record) => {
        if (cancelled) return;
        if (record) {
          const localTs = getLocalUpdatedAt();
          if (!localTs || record.updatedAt >= localTs) {
            applyCloudData(record.data, record.updatedAt);
          } else {
            await pushToCloud(
              initialCode,
              { watchlist, refreshInterval, chartRange, sortOption },
              localTs
            );
            if (!cancelled) {
              setLastSyncedAtState(Date.now());
            }
          }
          if (!cancelled) setSyncStatus('synced');
        } else {
          // If the code isn't on server yet (e.g. fresh local dev session), seed it
          await pushToCloud(initialCode, {
            watchlist,
            refreshInterval,
            chartRange,
            sortOption,
          });
          if (!cancelled) {
            setLastSyncedAtState(Date.now());
            setSyncStatus('synced');
          }
        }
      })
      .catch((err) => {
        console.warn('Startup cloud sync failed:', err);
        if (!cancelled) setSyncStatus('error');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-push whenever dashboard data changes locally while linked
  useEffect(() => {
    if (!hasMountedSyncRef.current) {
      hasMountedSyncRef.current = true;
      return;
    }

    if (suppressNextAutoPushRef.current) {
      suppressNextAutoPushRef.current = false;
      return;
    }

    const changeTs = Date.now();
    setLocalUpdatedAt(changeTs);

    if (!syncCode) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await pushToCloud(
          syncCode,
          { watchlist, refreshInterval, chartRange, sortOption },
          changeTs
        );
        setLastSyncedAtState(Date.now());
        setSyncStatus('synced');
      } catch (err) {
        console.warn('Auto-push sync failed:', err);
        setSyncStatus('error');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [watchlist, refreshInterval, chartRange, sortOption, syncCode]);

  const handleChangeRefreshInterval = (interval: RefreshInterval) => {
    setRefreshInterval(interval);
    localStorage.setItem(STORAGE_KEY_INTERVAL, interval);
  };

  const handleToggleChartRange = (range: ChartRange) => {
    setChartRange(range);
    localStorage.setItem(STORAGE_KEY_CHART_RANGE, range);
  };

  // Clock ticker for market session (updates every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setMarketInfo(getEGXMarketInfo());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Primary quote refresher
  const refreshQuotes = useCallback(async () => {
    if (watchlist.length === 0) return;
    setIsLoading(true);

    try {
      const symbols = watchlist.map((w) => w.symbol);
      const res = await fetchStockQuotes(symbols);

      setQuotes(res.quotes);
      if (res.egx30) setEgx30(res.egx30);
      if (res.egx70) setEgx70(res.egx70);
      setLastUpdated(res.timestamp);
    } catch (err) {
      console.error('Error fetching stock quotes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [watchlist]);

  // Initial fetch on mount
  useEffect(() => {
    refreshQuotes();
  }, [refreshQuotes]);

  // Smart market-aware background refresh timer:
  // ONLY refresh during open market hours (09:30 - 14:45 Cairo time Sun-Thu)
  // When market is closed, DO NOT refresh and keep on the latest prices!
  useEffect(() => {
    if (refreshInterval === 'manual') return;

    if (!marketInfo.isOpenSession) {
      return;
    }

    let intervalMs = 120000; // 2 minutes (default)
    if (refreshInterval === '1m') intervalMs = 60000;
    if (refreshInterval === '5m') intervalMs = 300000;

    const timer = setInterval(() => {
      refreshQuotes();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [refreshInterval, marketInfo.isOpenSession, refreshQuotes]);

  // Watchlist Actions
  const handleAddStock = (newStock: Omit<StockItem, 'order'>) => {
    const nextOrder = watchlist.length;
    const item: StockItem = {
      ...newStock,
      order: nextOrder,
      addedAt: Date.now(),
    };
    const updated = [...watchlist, item];
    setWatchlist(updated);
    // Fetch quote for new item immediately
    fetchStockQuotes([item.symbol]).then((res) => {
      if (res.quotes[item.symbol]) {
        setQuotes((prev) => ({ ...prev, [item.symbol]: res.quotes[item.symbol] }));
      }
    });
  };

  const handleEditStock = (symbol: string, updatedName: string, updatedSector: string) => {
    setWatchlist((prev) =>
      prev.map((item) =>
        item.symbol === symbol
          ? { ...item, name: updatedName, sector: updatedSector }
          : item
      )
    );
  };

  const handleDeleteStock = (symbol: string) => {
    setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setWatchlist((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next.map((item, i) => ({ ...item, order: i }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= watchlist.length - 1) return;
    setWatchlist((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next.map((item, i) => ({ ...item, order: i }));
    });
  };

  const handleResetToDefault = () => {
    setWatchlist(DEFAULT_WATCHLIST);
    refreshQuotes();
  };

  const handleImportWatchlist = (imported: StockItem[]) => {
    setWatchlist(imported);
    refreshQuotes();
  };

  // Cloud Sync Handlers
  const handleGenerateSyncCode = async () => {
    const newCode = generateSyncCode();
    setSyncStatus('syncing');
    try {
      const res = await pushToCloud(newCode, {
        watchlist,
        refreshInterval,
        chartRange,
        sortOption,
      });
      setSyncCode(res.code);
      setLastSyncedAtState(Date.now());
      setSyncStatus('synced');
    } catch (err) {
      setSyncStatus('error');
      throw err;
    }
  };

  const handleConnectSyncCode = async (rawCode: string) => {
    setSyncStatus('syncing');
    try {
      const record = await pullFromCloud(rawCode);
      if (!record) {
        setSyncStatus('idle');
        throw new Error('لم يتم العثور على بيانات محفوظة لهذا الرمز. تأكد من كتابته بشكل صحيح.');
      }
      setStoredSyncCode(record.code);
      setSyncCode(record.code);
      applyCloudData(record.data, record.updatedAt);
      setSyncStatus('synced');
    } catch (err) {
      setSyncStatus('error');
      throw err;
    }
  };

  const handlePushManual = async () => {
    if (!syncCode) return;
    setSyncStatus('syncing');
    try {
      await pushToCloud(syncCode, {
        watchlist,
        refreshInterval,
        chartRange,
        sortOption,
      });
      setLastSyncedAtState(Date.now());
      setSyncStatus('synced');
    } catch (err) {
      setSyncStatus('error');
      throw err;
    }
  };

  const handlePullManual = async () => {
    if (!syncCode) return;
    setSyncStatus('syncing');
    try {
      const record = await pullFromCloud(syncCode);
      if (!record) {
        throw new Error('لم يتم العثور على بيانات لهذا الرمز على السحابة.');
      }
      applyCloudData(record.data, record.updatedAt);
      setSyncStatus('synced');
    } catch (err) {
      setSyncStatus('error');
      throw err;
    }
  };

  const handleUnlinkSync = () => {
    unlinkSync();
    setSyncCode(null);
    setLastSyncedAtState(null);
    setSyncStatus('idle');
  };

  const existingSymbols = useMemo(
    () => new Set(watchlist.map((w) => w.symbol.toUpperCase())),
    [watchlist]
  );

  // Sector counts
  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of watchlist) {
      counts[item.sector] = (counts[item.sector] || 0) + 1;
    }
    return counts;
  }, [watchlist]);

  // Market Breadth (Advancers / Decliners / Unchanged) - MATCHES ACTIVE PERIOD (1D vs 7D)
  const { advancingCount, decliningCount, unchangedCount } = useMemo(() => {
    let adv = 0;
    let dec = 0;
    let unc = 0;
    const is1D = chartRange === '1D';

    for (const item of watchlist) {
      const q = quotes[item.symbol];
      if (!q) {
        unc++;
        continue;
      }
      const pct = is1D
        ? (q.changePercent1D ?? q.changePercent)
        : (q.changePercent7D ?? q.changePercent);

      if (pct > 0.001) adv++;
      else if (pct < -0.001) dec++;
      else unc++;
    }
    return { advancingCount: adv, decliningCount: dec, unchangedCount: unc };
  }, [watchlist, quotes, chartRange]);

  // Filtered and sorted stocks (sorting respects the active 1D vs 7D period)
  const displayedStocks = useMemo(() => {
    let list = [...watchlist];
    const is1D = chartRange === '1D';

    // 1. Sector filter
    if (activeSector !== 'ALL') {
      list = list.filter((item) => item.sector === activeSector);
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.symbol.toLowerCase().includes(q) ||
          item.sector.toLowerCase().includes(q)
      );
    }

    // 3. Sorting (Matches active 1D or 7D period)
    if (sortOption === 'gainers') {
      list.sort((a, b) => {
        const qa = quotes[a.symbol];
        const qb = quotes[b.symbol];
        const pa = is1D ? (qa?.changePercent1D ?? qa?.changePercent ?? -999) : (qa?.changePercent7D ?? qa?.changePercent ?? -999);
        const pb = is1D ? (qb?.changePercent1D ?? qb?.changePercent ?? -999) : (qb?.changePercent7D ?? qb?.changePercent ?? -999);
        return pb - pa;
      });
    } else if (sortOption === 'losers') {
      list.sort((a, b) => {
        const qa = quotes[a.symbol];
        const qb = quotes[b.symbol];
        const pa = is1D ? (qa?.changePercent1D ?? qa?.changePercent ?? 999) : (qa?.changePercent7D ?? qa?.changePercent ?? 999);
        const pb = is1D ? (qb?.changePercent1D ?? qb?.changePercent ?? 999) : (qb?.changePercent7D ?? qb?.changePercent ?? 999);
        return pa - pb;
      });
    } else if (sortOption === 'valueDesc') {
      list.sort((a, b) => {
        const va = quotes[a.symbol]?.tradingValue ?? 0;
        const vb = quotes[b.symbol]?.tradingValue ?? 0;
        return vb - va;
      });
    } else if (sortOption === 'volumeDesc') {
      list.sort((a, b) => {
        const va = quotes[a.symbol]?.volume ?? 0;
        const vb = quotes[b.symbol]?.volume ?? 0;
        return vb - va;
      });
    } else if (sortOption === 'nameAsc') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    } else if (sortOption === 'priceDesc') {
      list.sort((a, b) => {
        const pa = quotes[a.symbol]?.regularMarketPrice ?? 0;
        const pb = quotes[b.symbol]?.regularMarketPrice ?? 0;
        return pb - pa;
      });
    } else {
      list.sort((a, b) => a.order - b.order);
    }

    return list;
  }, [watchlist, activeSector, searchQuery, sortOption, quotes, chartRange]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-16 overflow-x-hidden">
      {/* Top Status Bar with Live EGX 30 & EGX 70 and Clean Mobile Header */}
      <TopStatusBar
        marketInfo={marketInfo}
        egx30={egx30}
        egx70={egx70}
        chartRange={chartRange}
        onToggleChartRange={handleToggleChartRange}
        refreshInterval={refreshInterval}
        onChangeRefreshInterval={handleChangeRefreshInterval}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        onRefresh={refreshQuotes}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode((prev) => !prev)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        syncCode={syncCode}
        syncStatus={syncStatus}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3.5 pb-8 flex-1 w-full space-y-3.5">
        {/* Filter, Search & Sorting Bar */}
        <FilterAndSortBar
          sectors={SECTORS}
          activeSector={activeSector}
          onSelectSector={setActiveSector}
          sectorCounts={sectorCounts}
          totalCount={watchlist.length}
          sortOption={sortOption}
          onChangeSort={setSortOption}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          advancingCount={advancingCount}
          decliningCount={decliningCount}
          unchangedCount={unchangedCount}
        />

        {/* Watchlist Grid */}
        {displayedStocks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {displayedStocks.map((item, index) => {
              const quote = quotes[item.symbol];
              return (
                <StockTile
                  key={item.symbol}
                  item={item}
                  quote={quote}
                  chartRange={chartRange}
                  isEditMode={isEditMode}
                  canMoveUp={sortOption === 'custom' && index > 0}
                  canMoveDown={sortOption === 'custom' && index < displayedStocks.length - 1}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  onEdit={() => setEditingStock(item)}
                  onDelete={() => handleDeleteStock(item.symbol)}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center my-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">لا توجد أسهم مطابقة</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              لم يتم العثور على أي أسهم تطابق معايير البحث أو التصفية المحددة.
            </p>
            <div className="mt-3.5 flex items-center justify-center gap-2">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  مسح البحث
                </button>
              )}
              {activeSector !== 'ALL' && (
                <button
                  onClick={() => setActiveSector('ALL')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  عرض كل القطاعات
                </button>
              )}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة سهم جديد</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info Strip */}
      <footer className="border-t border-slate-200 bg-white/70 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <p>
            <strong>نبض البورصة المصرية</strong> — أسعار وبيانات فورية بالجنيه المصري (EGP).
          </p>
          <p className="text-[11px] text-slate-400">
            تطبيق ويب تقدمي (PWA) • Yahoo Finance EGX API
          </p>
        </div>
      </footer>

      {/* Modals & Floating Indicators */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingSymbols={existingSymbols}
        onAddStock={handleAddStock}
      />

      <EditStockModal
        stock={editingStock}
        isOpen={!!editingStock}
        onClose={() => setEditingStock(null)}
        onSave={handleEditStock}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        watchlist={watchlist}
        onImport={handleImportWatchlist}
        onResetToDefault={handleResetToDefault}
      />

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncCode={syncCode}
        lastSyncedAt={lastSyncedAt}
        syncStatus={syncStatus}
        watchlist={watchlist}
        onGenerateCode={handleGenerateSyncCode}
        onConnectCode={handleConnectSyncCode}
        onPushToCloud={handlePushManual}
        onPullFromCloud={handlePullManual}
        onUnlink={handleUnlinkSync}
        onImportWatchlist={handleImportWatchlist}
      />

      <OfflineIndicator />
    </div>
  );
}
