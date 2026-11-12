import React, { useState, useEffect } from 'react';
import { X, Check, Edit2 } from 'lucide-react';
import { StockItem, StockSector, getDisplaySymbol } from '../types/stock';
import { SECTORS } from '../data/defaultWatchlist';

interface EditStockModalProps {
  stock: StockItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (symbol: string, updatedName: string, updatedSector: string) => void;
}

export const EditStockModal: React.FC<EditStockModalProps> = ({
  stock,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [sector, setSector] = useState<string>('');

  useEffect(() => {
    if (stock) {
      setName(stock.name);
      setSector(stock.sector);
    }
  }, [stock]);

  if (!isOpen || !stock) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(stock.symbol, name.trim(), sector);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">تعديل بيانات السهم</h2>
              <p className="text-xs text-slate-500 font-mono font-bold" dir="ltr">
                {getDisplaySymbol(stock.symbol)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الاسم المعروض بالعربية
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              القطاع
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden cursor-pointer"
            >
              {SECTORS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
