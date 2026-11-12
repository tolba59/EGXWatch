import React, { useState } from 'react';
import { Download, Share2, X, Smartphone, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA in standalone mode, hide button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        title="تثبيت التطبيق على جهازك للوصول السريع بدون إنترنت"
      >
        <Download className="w-3.5 h-3.5" />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
          title="كيفية تثبيت التطبيق على آيفون وآيباد"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-500" />
          <span>تثبيت على الآيفون</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    EGX
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">تثبيت على آيفون / آيباد</h3>
                    <p className="text-xs text-slate-500">يعمل كـتطبيق مستقل بشاشة كاملة</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    <Share2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <strong className="block text-slate-900">١. اضغط على زر المشاركة (Share)</strong>
                    <span>في أسفل شاشة متصفح Safari.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    <PlusSquare className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <strong className="block text-slate-900">٢. اختر "إضافة إلى الشاشة الرئيسية"</strong>
                    <span>(Add to Home Screen) من القائمة.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-emerald-600 shadow-2xs">
                    ✓
                  </div>
                  <div>
                    <strong className="block text-slate-900">٣. اضغط "إضافة" (Add)</strong>
                    <span>سيظهر التطبيق كأيقونة مستقلة على شاشتك.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                فهمت ذلك، إغلاق
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
