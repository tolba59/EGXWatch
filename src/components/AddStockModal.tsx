import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Check,
  Loader2,
} from 'lucide-react';
import { StockItem, getDisplaySymbol, toQuerySymbol } from '../types/stock';
import { searchSymbols } from '../services/quotesService';
import { EGX_POPULAR_CATALOG } from '../data/defaultWatchlist';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSymbols: Set<string>;
  onAddStock: (stock: Omit<StockItem, 'order'>) => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  existingSymbols,
  onAddStock,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ symbol: string; name: string; sector: string; isCairo: boolean }>
  >([]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [isOpen]);

  // Debounced search strictly for Egyptian Exchange stocks
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const cleanQ = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const rawTrimmed = query.trim().toLowerCase();

      // 1. Strict Egyptian local catalog match
      const catalogMatches = EGX_POPULAR_CATALOG.filter((item) => {
        const itemCleanSym = getDisplaySymbol(item.symbol).toUpperCase();
        return (
          itemCleanSym.includes(cleanQ) ||
          item.name.toLowerCase().includes(rawTrimmed) ||
          item.keywords.toLowerCase().includes(rawTrimmed)
        );
      }).map((item) => ({
        symbol: item.symbol,
        name: item.name,
        sector: item.sector,
        isCairo: true,
      }));

      // 2. Fetch from EGX-only search endpoint
      try {
        const apiResults = await searchSymbols(query);
        const combined = [...catalogMatches];

        for (const res of apiResults) {
          // STRICT: Double check it's Cairo
          if (!res.isCairo && !res.symbol.endsWith('.CA') && res.exchange !== 'CAI') {
            continue;
          }

          if (!combined.some((c) => c.symbol.toUpperCase() === res.symbol.toUpperCase())) {
            // Find sector in catalog if available
            const foundInCat = EGX_POPULAR_CATALOG.find(
              (c) => c.symbol.toUpperCase() === res.symbol.toUpperCase()
            );
            combined.push({
              symbol: res.symbol,
              name: foundInCat ? foundInCat.name : res.name,
              sector: foundInCat ? foundInCat.sector : 'أخرى',
              isCairo: true,
            });
          }
        }
        setSearchResults(combined);
      } catch (err) {
        setSearchResults(catalogMatches);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleAdd = (symbol: string, name: string, sector: string) => {
    const fullSym = toQuerySymbol(symbol);
    onAddStock({
      symbol: fullSym,
      name,
      sector: sector || 'أخرى',
    });
  };

  // Popular unadded stocks from EGX catalog
  const popularUnadded = EGX_POPULAR_CATALOG.filter(
    (item) =>
      !existingSymbols.has(item.symbol.toUpperCase()) &&
      !existingSymbols.has(getDisplaySymbol(item.symbol).toUpperCase())
  ).slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">إضافة سهم جديد</h2>
              <p className="text-[11px] text-slate-500">البورصة المصرية (EGX حصراً)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Simple, Clean, Prominent Search Bar (No redundant forms) */}
          <div>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث باسم الشركة أو الرمز (مثال: طلعت مصطفى، فوري، TMGH، HELI)..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-10 pl-4 text-xs sm:text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 mr-1">
              البحث يقتصر تلقائياً على الأسهم المقيدة في البورصة المصرية فقط.
            </p>
          </div>

          {/* Search Results List */}
          {query.trim().length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 mb-2">نتائج البحث في EGX:</h3>
              {searchResults.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs max-h-60 overflow-y-auto">
                  {searchResults.map((res) => {
                    const disp = getDisplaySymbol(res.symbol);
                    const isAdded =
                      existingSymbols.has(res.symbol.toUpperCase()) ||
                      existingSymbols.has(disp.toUpperCase());

                    return (
                      <div
                        key={res.symbol}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0 pr-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              dir="ltr"
                              className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white shrink-0"
                            >
                              {disp}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {res.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                            {res.sector}
                          </span>
                        </div>

                        {isAdded ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg shrink-0">
                            <Check className="w-3.5 h-3.5" />
                            <span>مضاف</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAdd(res.symbol, res.name, res.sector)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 cursor-pointer transition shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !isSearching ? (
                <div className="p-4 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  لم يتم العثور على سهم يطابق "{query}" في البورصة المصرية. تأكد من صحة الاسم أو رمز التداول.
                </div>
              ) : null}
            </div>
          )}

          {/* Popular Egyptian Stocks (1-click add) */}
          {popularUnadded.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2">
                أسهم شائعة مقترحة للإضافة:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {popularUnadded.map((item) => {
                  const disp = getDisplaySymbol(item.symbol);
                  return (
                    <div
                      key={item.symbol}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
                    >
                      <div className="min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            dir="ltr"
                            className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 shrink-0"
                          >
                            {disp}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                          {item.sector}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAdd(item.symbol, item.name, item.sector)}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer shrink-0 transition"
                        title="إضافة إلى القائمة"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
