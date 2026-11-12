import React, { useRef, useState } from 'react';
import {
  X,
  Cloud,
  Copy,
  Check,
  UploadCloud,
  DownloadCloud,
  Unlink,
  Link2,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Download,
  Upload,
  FileJson,
} from 'lucide-react';
import { StockItem, SyncStatus } from '../types/stock';
import { isValidSyncCode, normalizeSyncCode } from '../services/syncService';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncCode: string | null;
  lastSyncedAt: number | null;
  syncStatus: SyncStatus;
  watchlist: StockItem[];
  onGenerateCode: () => Promise<void>;
  onConnectCode: (code: string) => Promise<void>;
  onPushToCloud: () => Promise<void>;
  onPullFromCloud: () => Promise<void>;
  onUnlink: () => void;
  onImportWatchlist: (newWatchlist: StockItem[]) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  syncCode,
  lastSyncedAt,
  syncStatus,
  watchlist,
  onGenerateCode,
  onConnectCode,
  onPushToCloud,
  onPullFromCloud,
  onUnlink,
  onImportWatchlist,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [busyAction, setBusyAction] = useState<'generate' | 'connect' | 'push' | 'pull' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formattedLastSynced = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : 'لم تتم المزامنة بعد';

  const handleGenerate = async () => {
    setFeedback(null);
    setBusyAction('generate');
    try {
      await onGenerateCode();
      setFeedback({ type: 'success', text: 'تم إنشاء رمز المزامنة ورفع بياناتك بنجاح.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'تعذر إنشاء رمز المزامنة.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const cleaned = normalizeSyncCode(inputCode);
    if (!isValidSyncCode(cleaned)) {
      setFeedback({ type: 'error', text: 'أدخل رمز مزامنة صحيحاً (مثال: SYNC-4K9M).' });
      return;
    }

    setBusyAction('connect');
    try {
      await onConnectCode(cleaned);
      setInputCode('');
      setFeedback({ type: 'success', text: 'تم ربط الجهاز وسحب بياناتك من السحابة بنجاح.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'تعذر الاتصال بالرمز المدخل.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePush = async () => {
    setFeedback(null);
    setBusyAction('push');
    try {
      await onPushToCloud();
      setFeedback({ type: 'success', text: 'تم رفع قائمة الأسهم والإعدادات الحالية إلى السحابة.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'فشل رفع البيانات إلى السحابة.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePull = async () => {
    setFeedback(null);
    setBusyAction('pull');
    try {
      await onPullFromCloud();
      setFeedback({ type: 'success', text: 'تم تحديث قائمتك بأحدث نسخة محفوظة على السحابة.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'فشل سحب البيانات من السحابة.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyCode = async () => {
    if (!syncCode) return;
    try {
      await navigator.clipboard.writeText(syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback({ type: 'error', text: 'تعذر النسخ التلقائي، يمكنك نسخ الرمز يدوياً.' });
    }
  };

  const handleConfirmUnlink = () => {
    onUnlink();
    setConfirmUnlink(false);
    setFeedback({ type: 'success', text: 'تم إلغاء ربط هذا الجهاز. بياناتك المحلية محفوظة كما هي.' });
  };

  // Offline JSON fallback: Export
  const handleExportJson = () => {
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
      setFeedback({ type: 'success', text: 'تم تصدير ملف النسخة الاحتياطية بنجاح.' });
    } catch {
      setFeedback({ type: 'error', text: 'حدث خطأ أثناء تصدير الملف.' });
    }
  };

  // Offline JSON fallback: Import
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

        const validated: StockItem[] = parsed
          .map((item: any, idx: number) => ({
            symbol: String(item.symbol || '').toUpperCase(),
            name: String(item.name || item.symbol || ''),
            sector: String(item.sector || 'أخرى'),
            order: typeof item.order === 'number' ? item.order : idx,
          }))
          .filter((item) => item.symbol.length > 0);

        if (validated.length === 0) {
          throw new Error('لم يتم العثور على أي أسهم صالحة داخل الملف');
        }

        onImportWatchlist(validated);
        setFeedback({ type: 'success', text: `تم استيراد ${validated.length} سهماً بنجاح.` });
      } catch (err: any) {
        setFeedback({ type: 'error', text: err?.message || 'فشل في قراءة ملف JSON' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0">
              <Cloud className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                المزامنة السحابية بين الأجهزة
              </h2>
              <p className="text-[11px] text-slate-500">
                مشاركة قائمة أسهمك بين الكمبيوتر والموبايل بدون تسجيل دخول
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`flex items-start gap-2 p-3 rounded-xl border font-semibold ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* 3-Step "How It Works" Guide */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <h3 className="text-xs font-bold text-slate-800 mb-2.5">كيف تعمل المزامنة؟</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-slate-600">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="leading-relaxed">أنشئ رمز مزامنة سرياً على جهازك الرئيسي.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="leading-relaxed">أدخل الرمز نفسه على هاتفك أو أي جهاز آخر.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  3
                </span>
                <p className="leading-relaxed">تُحفظ وتُحدّث قائمتك تلقائياً دون حساب.</p>
              </div>
            </div>
          </div>

          {!syncCode ? (
            /* UNLINKED VIEW */
            <div className="space-y-3.5">
              {/* Step 1: Main Device -> Generate Code */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    ١. هل تبدأ من جهازك الرئيسي؟
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    أنشئ رمزاً سرياً جديداً لرفع قائمتك الحالية ({watchlist.length} سهماً) وإعداداتك إلى السحابة.
                  </p>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={busyAction !== null}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {busyAction === 'generate' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  <span>إنشاء رمز مزامنة</span>
                </button>
              </div>

              {/* Step 2: Another Device -> Enter Code + Connect */}
              <form
                onSubmit={handleConnect}
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    ٢. هل تربط جهازاً آخر؟
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    أدخل رمز المزامنة الذي أنشأته على جهازك الأول لجلب قائمتك فوراً.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="SYNC-XXXX"
                    maxLength={32}
                    className="flex-1 min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm font-bold tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="submit"
                    disabled={busyAction !== null || !inputCode.trim()}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {busyAction === 'connect' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    <span>ربط الجهاز</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* LINKED VIEW */
            <div className="space-y-3.5">
              {/* Active Sync Code & Copy */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-emerald-800">رمز المزامنة النشط</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    {syncStatus === 'syncing' && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    )}
                    <span>آخر مزامنة:</span>
                    <span dir="ltr" className="font-mono font-semibold text-slate-800 tabular-nums">
                      {formattedLastSynced}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 px-3.5 py-2.5">
                  <span
                    dir="ltr"
                    className="font-mono text-lg sm:text-xl font-black tracking-widest text-slate-900 select-all"
                  >
                    {syncCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer transition-colors shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Push / Pull Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePush}
                    disabled={busyAction !== null}
                    className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors disabled:opacity-60"
                  >
                    {busyAction === 'push' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4" />
                    )}
                    <span>رفع المحلي للسحابة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePull}
                    disabled={busyAction !== null}
                    className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition-colors disabled:opacity-60"
                  >
                    {busyAction === 'pull' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <DownloadCloud className="w-4 h-4" />
                    )}
                    <span>سحب من السحابة</span>
                  </button>
                </div>

                {/* Unlink Section */}
                {!confirmUnlink ? (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmUnlink(true)}
                      className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-700 hover:bg-rose-50 font-semibold text-xs cursor-pointer transition-colors"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>إلغاء الربط</span>
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 space-y-2">
                    <p className="text-rose-900 font-semibold text-[11px]">
                      هل تريد فصل هذا الجهاز عن رمز المزامنة؟ ستبقى قائمتك محفوظة محلياً على هذا الجهاز.
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmUnlink(false)}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium cursor-pointer"
                      >
                        تراجع
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmUnlink}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                      >
                        تأكيد إلغاء الربط
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy Reminder */}
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>تنبيه الخصوصية:</strong> احتفظ برمز المزامنة سراً. أي شخص يمتلك هذا الرمز يمكنه عرض أو تعديل بيانات قائمة المتابعة المرتبطة به.
                </p>
              </div>
            </div>
          )}

          {/* Offline JSON Export / Import Fallback */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                <FileJson className="w-4 h-4 text-slate-500" />
                <span>النسخ الاحتياطي المحلي (بدون إنترنت - JSON)</span>
              </div>
              <span className="text-[10px] text-slate-400">خيار بديل</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير JSON</span>
              </button>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>استيراد JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
