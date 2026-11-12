import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  Check,
  FileJson,
} from 'lucide-react';
import { StockItem } from '../types/stock';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: StockItem[];
  onImport: (newWatchlist: StockItem[]) => void;
  onResetToDefault: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  watchlist,
  onImport,
  onResetToDefault,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Export JSON file
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(watchlist, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `egx_watchlist_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء تصدير الملف');
    }
  };

  // Import JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('الملف غير صالح أو فارغ');
        }

        // Validate basic structure
        const validated: StockItem[] = parsed.map((item: any, idx: number) => ({
          symbol: String(item.symbol || '').toUpperCase(),
          name: String(item.name || item.symbol || ''),
          sector: String(item.sector || 'أخرى'),
          order: typeof item.order === 'number' ? item.order : idx,
        })).filter((item) => item.symbol.length > 0);

        if (validated.length === 0) {
          throw new Error('لم يتم العثور على أي أسهم صالحة داخل الملف');
        }

        onImport(validated);
        setImportStatus(`تم استيراد ${validated.length} سهماً بنجاح!`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorMessage(err.message || 'فشل في قراءة ملف JSON');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">النسخ الاحتياطي وإدارة القائمة</h2>
              <p className="text-xs text-slate-500">حفظ واسترجاع قائمة الأسهم الخاصة بك</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Status / Error Alerts */}
          {importStatus && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{importStatus}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Export JSON */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800">تصدير القائمة (JSON)</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                تنزيل ملف يحتوي على {watchlist.length} سهماً لحفظها أو نقلها لجهاز آخر
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer shrink-0 transition shadow-2xs"
            >
              <Download className="w-4 h-4" />
              <span>تصدير</span>
            </button>
          </div>

          {/* 2. Import JSON */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800">استيراد القائمة (JSON)</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                رفع ملف قائمة محفوظ مسبقاً لاستبدال قائمتك الحالية
              </p>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,application/json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shrink-0 transition shadow-2xs"
              >
                <Upload className="w-4 h-4" />
                <span>استيراد</span>
              </button>
            </div>
          </div>

          {/* 3. Reset to Default */}
          <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40">
            {!showResetConfirm ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-rose-900">استعادة القائمة الافتراضية</h4>
                  <p className="text-rose-700/80 text-[11px] mt-0.5">
                    إعادة ضبط القائمة إلى الـ ١٦ سهماً الرئيسية (EGX 30 Blue Chips)
                  </p>
                </div>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer shrink-0 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>استعادة</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-rose-900 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>هل أنت متأكد من استعادة القائمة الافتراضية؟ سيتم استبدال أي أسهم أضفتها يدوياً.</span>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      onResetToDefault();
                      setShowResetConfirm(false);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    نعم، استعادة الافتراضية
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
