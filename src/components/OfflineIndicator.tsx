import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900/90 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-white shadow-xl border border-slate-700/60 transition-all duration-300"
    >
      <div className="p-1 rounded-md bg-amber-500/20 text-amber-400">
        <WifiOff className="w-3.5 h-3.5 animate-pulse" />
      </div>
      <div>
        <p className="font-semibold text-slate-100">وضع عدم الاتصال</p>
        <p className="text-[10px] text-slate-300">يتم عرض الأسعار والبيانات المحفوظة محلياً</p>
      </div>
    </div>
  );
};
