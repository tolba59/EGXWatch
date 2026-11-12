import { MarketStatus } from '../types/stock';

export interface EGXMarketInfo {
  status: MarketStatus;
  statusTextArabic: string;
  badgeClass: string;
  cairoTimeFormatted: string;
  isOpenSession: boolean; // True during 09:30 - 14:45 Cairo time Sun-Thu
  nextSessionText: string;
}

/**
 * Calculates live Egyptian Exchange (EGX) trading status based on Cairo local time.
 * Trading days: Sunday - Thursday (Friday & Saturday are the weekend in Egypt).
 * Pre-opening session: 09:30 - 10:00
 * Continuous trading: 10:00 - 14:30
 * Closing session / Post-market: 14:30 - 14:45
 */
export function getEGXMarketInfo(now: Date = new Date()): EGXMarketInfo {
  // Convert current time to Africa/Cairo timezone
  const cairoTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    hour12: false,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });

  const parts = cairoTimeFormatter.formatToParts(now);
  let weekdayStr = '';
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const p of parts) {
    if (p.type === 'weekday') weekdayStr = p.value;
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'second') second = parseInt(p.value, 10);
  }

  const cairoTimeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

  // Sunday = Sun, Monday = Mon, Tuesday = Tue, Wednesday = Wed, Thursday = Thu
  // Friday = Fri, Saturday = Sat
  const isWeekend = weekdayStr === 'Fri' || weekdayStr === 'Sat';
  const totalMinutes = hour * 60 + minute;

  // 09:30 = 9*60 + 30 = 570
  // 10:00 = 10*60 = 600
  // 14:30 = 14*60 + 30 = 870
  // 14:45 = 14*60 + 45 = 885

  let status: MarketStatus = 'closed';
  let statusTextArabic = 'السوق مغلق';
  let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
  let nextSessionText = 'يُفتتح الأحد 09:30 ص';
  let isOpenSession = false;

  if (!isWeekend) {
    if (totalMinutes >= 570 && totalMinutes < 600) {
      status = 'pre-open';
      statusTextArabic = 'ما قبل الافتتاح';
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse';
      isOpenSession = true;
      nextSessionText = 'بدء التداول 10:00 ص';
    } else if (totalMinutes >= 600 && totalMinutes <= 870) {
      status = 'open';
      statusTextArabic = 'السوق مفتوح';
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-300';
      isOpenSession = true;
      nextSessionText = 'يُغلق 02:30 م';
    } else if (totalMinutes > 870 && totalMinutes <= 885) {
      status = 'closed';
      statusTextArabic = 'جلسة الإغلاق';
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
      isOpenSession = true;
      nextSessionText = 'انتهت جلسة اليوم';
    } else {
      status = 'closed';
      statusTextArabic = 'السوق مغلق';
      badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
      isOpenSession = false;
      if (weekdayStr === 'Thu' && totalMinutes > 885) {
        nextSessionText = 'يُفتتح الأحد 09:30 ص';
      } else if (totalMinutes < 570) {
        nextSessionText = 'يُفتتح اليوم 09:30 ص';
      } else {
        nextSessionText = 'يُفتتح غداً 09:30 ص';
      }
    }
  } else {
    status = 'closed';
    statusTextArabic = 'عطلة نهاية الأسبوع';
    badgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
    isOpenSession = false;
    nextSessionText = 'يُفتتح الأحد 09:30 ص';
  }

  return {
    status,
    statusTextArabic,
    badgeClass,
    cairoTimeFormatted,
    isOpenSession,
    nextSessionText,
  };
}
