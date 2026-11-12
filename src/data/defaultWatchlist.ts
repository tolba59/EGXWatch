import { StockItem, StockSector } from '../types/stock';

export const SECTORS: StockSector[] = [
  'البنوك والتكنولوجيا المالية',
  'العقارات والمقاولات',
  'الصناعة والأسمدة',
  'الاتصالات والاستهلاكي',
  'أخرى',
];

export const DEFAULT_WATCHLIST: StockItem[] = [
  // البنوك والتكنولوجيا المالية
  {
    symbol: 'COMI.CA',
    name: 'البنك التجاري الدولي (CIB)',
    sector: 'البنوك والتكنولوجيا المالية',
    order: 0,
  },
  {
    symbol: 'ADIB.CA',
    name: 'مصرف أبوظبي الإسلامي - مصر',
    sector: 'البنوك والتكنولوجيا المالية',
    order: 1,
  },
  {
    symbol: 'HRHO.CA',
    name: 'مجموعة إي إف جي القابضة',
    sector: 'البنوك والتكنولوجيا المالية',
    order: 2,
  },
  {
    symbol: 'FWRY.CA',
    name: 'فوري لتكنولوجيا البنوك',
    sector: 'البنوك والتكنولوجيا المالية',
    order: 3,
  },
  {
    symbol: 'EFIH.CA',
    name: 'إي فاينانس للاستثمارات المالية',
    sector: 'البنوك والتكنولوجيا المالية',
    order: 4,
  },

  // العقارات والمقاولات
  {
    symbol: 'TMGH.CA',
    name: 'مجموعة طلعت مصطفى القابضة',
    sector: 'العقارات والمقاولات',
    order: 5,
  },
  {
    symbol: 'ORAS.CA',
    name: 'أوراسكوم كونستراكشون',
    sector: 'العقارات والمقاولات',
    order: 6,
  },
  {
    symbol: 'PHDC.CA',
    name: 'بالم هيلز للتعمير',
    sector: 'العقارات والمقاولات',
    order: 7,
  },
  {
    symbol: 'EMFD.CA',
    name: 'إعمار مصر للتنمية',
    sector: 'العقارات والمقاولات',
    order: 8,
  },

  // الصناعة والأسمدة والموارد
  {
    symbol: 'ABUK.CA',
    name: 'أبو قير للأسمدة',
    sector: 'الصناعة والأسمدة',
    order: 9,
  },
  {
    symbol: 'MFPC.CA',
    name: 'مصر لإنتاج الأسمدة (موبكو)',
    sector: 'الصناعة والأسمدة',
    order: 10,
  },
  {
    symbol: 'EGAL.CA',
    name: 'مصر للألومنيوم',
    sector: 'الصناعة والأسمدة',
    order: 11,
  },
  {
    symbol: 'ALCN.CA',
    name: 'الإسكندرية لتداول الحاويات',
    sector: 'الصناعة والأسمدة',
    order: 12,
  },

  // الاتصالات والسلع الاستهلاكية
  {
    symbol: 'ETEL.CA',
    name: 'المصرية للاتصالات',
    sector: 'الاتصالات والاستهلاكي',
    order: 13,
  },
  {
    symbol: 'EAST.CA',
    name: 'الشرقية - إيسترن كومباني',
    sector: 'الاتصالات والاستهلاكي',
    order: 14,
  },
  {
    symbol: 'JUFO.CA',
    name: 'جهينة للصناعات الغذائية',
    sector: 'الاتصالات والاستهلاكي',
    order: 15,
  },
];

// Rich catalog of popular Egyptian Exchange stocks with aliases for instant search & one-click addition
export const EGX_POPULAR_CATALOG: Array<{
  symbol: string;
  name: string;
  sector: StockSector;
  keywords: string;
}> = [
  {
    symbol: 'TMGH.CA',
    name: 'مجموعة طلعت مصطفى القابضة',
    sector: 'العقارات والمقاولات',
    keywords: 'tmgh tmg طلعت مصطفى ت طلعت مصطفى talaat moustafa مدينتي الرحاب سيليا بنان',
  },
  {
    symbol: 'COMI.CA',
    name: 'البنك التجاري الدولي (CIB)',
    sector: 'البنوك والتكنولوجيا المالية',
    keywords: 'comi cib التجاري الدولي بنك cib commercial international bank',
  },
  {
    symbol: 'FWRY.CA',
    name: 'فوري لتكنولوجيا البنوك',
    sector: 'البنوك والتكنولوجيا المالية',
    keywords: 'fwry fawry فوري مدفوعات إلكترونية تكنولوجيا مالية',
  },
  {
    symbol: 'HRHO.CA',
    name: 'مجموعة إي إف جي القابضة (هيرميس)',
    sector: 'البنوك والتكنولوجيا المالية',
    keywords: 'hrho efg hermes هيرميس إي إف جي بنك استثمار',
  },
  {
    symbol: 'ADIB.CA',
    name: 'مصرف أبوظبي الإسلامي - مصر',
    sector: 'البنوك والتكنولوجيا المالية',
    keywords: 'adib abu dhabi islamic bank ابوظبي الاسلامي مصرف',
  },
  {
    symbol: 'EFIH.CA',
    name: 'إي فاينانس للاستثمارات المالية',
    sector: 'البنوك والتكنولوجيا المالية',
    keywords: 'efih efinance e-finance إي فاينانس فايننس',
  },
  {
    symbol: 'ORAS.CA',
    name: 'أوراسكوم كونستراكشون',
    sector: 'العقارات والمقاولات',
    keywords: 'oras orascom construction اوراسكوم كونستراكشون مقاولات ساويرس',
  },
  {
    symbol: 'PHDC.CA',
    name: 'بالم هيلز للتعمير',
    sector: 'العقارات والمقاولات',
    keywords: 'phdc palm hills بالم هيلز تعمير ياسين منصور بادية',
  },
  {
    symbol: 'EMFD.CA',
    name: 'إعمار مصر للتنمية',
    sector: 'العقارات والمقاولات',
    keywords: 'emfd emaar misr اعمار مصر مراسي اب تاون كايرو',
  },
  {
    symbol: 'ABUK.CA',
    name: 'أبو قير للأسمدة',
    sector: 'الصناعة والأسمدة',
    keywords: 'abuk abu qir fertilizers ابو قير اسمدة كيماويات',
  },
  {
    symbol: 'MFPC.CA',
    name: 'مصر لإنتاج الأسمدة (موبكو)',
    sector: 'الصناعة والأسمدة',
    keywords: 'mfpc mopco موبكو اسمدة دمياط',
  },
  {
    symbol: 'EGAL.CA',
    name: 'مصر للألومنيوم',
    sector: 'الصناعة والأسمدة',
    keywords: 'egal egypt aluminium مصر للالومنيوم الومنيوم نجع حمادي',
  },
  {
    symbol: 'ALCN.CA',
    name: 'الإسكندرية لتداول الحاويات',
    sector: 'الصناعة والأسمدة',
    keywords: 'alcn alexandria container اسكندرية لتداول الحاويات موانئ',
  },
  {
    symbol: 'ETEL.CA',
    name: 'المصرية للاتصالات (WE)',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'etel telecom egypt we وي المصرية للاتصالات سنترال انترنت',
  },
  {
    symbol: 'EAST.CA',
    name: 'الشرقية - إيسترن كومباني',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'east eastern company الشرقية للدخان ايسترن سجائر',
  },
  {
    symbol: 'JUFO.CA',
    name: 'جهينة للصناعات الغذائية',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'jufo juhayna جهينة البان عصائر اغذية',
  },
  {
    symbol: 'SWDY.CA',
    name: 'السويدي إليكتريك',
    sector: 'الصناعة والأسمدة',
    keywords: 'swdy elsewedy electric السويدي للكابلات والكهرباء طاقة',
  },
  {
    symbol: 'EKHO.CA',
    name: 'القابضة المصرية الكويتية',
    sector: 'البنوك والتكنولوجيا المالية',
    keywords: 'ekho egypt kuwait holding القابضة الكويتية استثمارات',
  },
  {
    symbol: 'SKPC.CA',
    name: 'سيدي كرير للبتروكيماويات (سيدبك)',
    sector: 'الصناعة والأسمدة',
    keywords: 'skpc sidpec sidi kerir سيدبك بتروكيماويات غاز',
  },
  {
    symbol: 'AMOC.CA',
    name: 'الإسكندرية للزيوت المعدنية (أموك)',
    sector: 'الصناعة والأسمدة',
    keywords: 'amoc alexandria mineral oils أموك بترول زيوت تكرير',
  },
  {
    symbol: 'HELI.CA',
    name: 'مصر الجديدة للإسكان والتعمير',
    sector: 'العقارات والمقاولات',
    keywords: 'heli heliopolis housing مصر الجديدة تعمير هليوبوليس نيو هليوبوليس',
  },
  {
    symbol: 'MADR.CA',
    name: 'مدينة مصر للإسكان والتعمير',
    sector: 'العقارات والمقاولات',
    keywords: 'madr mnhd madinet masr مدينة نصر مدينة مصر تاج سيتي سراي',
  },
  {
    symbol: 'CLHO.CA',
    name: 'مجموعة مستشفيات كليوباترا',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'clho cleopatra hospital كليوباترا مستشفى صحة رعاية',
  },
  {
    symbol: 'ISPH.CA',
    name: 'ابن سينا فارما',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'isph ibnsina pharma ابن سينا أدوية توزيع صيدليات',
  },
  {
    symbol: 'ESRS.CA',
    name: 'عز الدخيلة للصلب - الإسكندرية',
    sector: 'الصناعة والأسمدة',
    keywords: 'esrs ezz steel حديد عز الدخيلة صلب احمد عز',
  },
  {
    symbol: 'BTFH.CA',
    name: 'بلتون القابضة',
    sector: 'البنوك والتكنولوجيا المالية',
    keywords: 'btfh beltone financial بلتون استثمار مالية داليا خورشيد',
  },
  {
    symbol: 'CIEB.CA',
    name: 'بنك كريدي أجريكول مصر',
    sector: 'البنوك والتكنولوجيا المالية',
    keywords: 'cieb credit agricole egypt بنك كريدي اجريكول فرنسي',
  },
  {
    symbol: 'SAUD.CA',
    name: 'بنك البركة مصر',
    sector: 'البنوك والتكنولوجيا المالية',
    keywords: 'saud al baraka bank albaraka بنك البركة اسلامي صيرفة',
  },
  {
    symbol: 'CCAP.CA',
    name: 'القلعة للاستشارات المالية',
    sector: 'البنوك والتكنولوجيا المالية',
    keywords: 'ccap qalaa holdings القلعة استثمارات طاقة هيكل المصرية للتكرير',
  },
  {
    symbol: 'POUL.CA',
    name: 'القاهرة للدواجن',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'poul cairo poultry القاهرة للدواجن أغذية فراخ كتاكيت',
  },
  {
    symbol: 'ORHD.CA',
    name: 'أوراسكوم للتنمية مصر',
    sector: 'العقارات والمقاولات',
    keywords: 'orhd orascom development egypt الجونة اوراسكوم للتنمية فنادق سياحة',
  },
  {
    symbol: 'DSCW.CA',
    name: 'دايس للملابس الجاهزة',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'dscw dice sportswear دايس ملابس غزل ونسيج قطن توما',
  },
  {
    symbol: 'RAYA.CA',
    name: 'راية القابضة للاستثمارات المالية',
    sector: 'البنوك والتكنولوجيا المالية',
    keywords: 'raya raya holding راية تكنولوجيا كول سنتر مراكز اتصالات أمان',
  },
  {
    symbol: 'AUTO.CA',
    name: 'جي بي كوربوريشن (غبور أوتو)',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'auto gb corp ghabbour auto غبور سيارات هيونداي شيري توك توك',
  },
  {
    symbol: 'CSAG.CA',
    name: 'القناة للتوكيلات الملاحية',
    sector: 'الصناعة والأسمدة',
    keywords: 'csag canal shipping agencies القناة ملاحية نقل بحري شحن توكيلات',
  },
  {
    symbol: 'OCDI.CA',
    name: 'السادس من أكتوبر للتنمية والاستثمار (سوديك)',
    sector: 'العقارات والمقاولات',
    keywords: 'ocdi sodic سوديك السادس من اكتوبر للتنمية الدار العقارية',
  },
  {
    symbol: 'ORWE.CA',
    name: 'النساجون الشرقيون للسجاد',
    sector: 'الصناعة والأسمدة',
    keywords: 'orwe oriental weavers النساجون الشرقيون سجاد موكيت خميس',
  },
  {
    symbol: 'DOMT.CA',
    name: 'الصناعات الغذائية العربية (دومتي)',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'domt domty دومتي جبنة عصير كرواسون مخبوزات',
  },
  {
    symbol: 'OLFI.CA',
    name: 'عبور لاند للصناعات الغذائية',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'olfi obour land عبور لاند جبنة تتراباك اغذية',
  },
  {
    symbol: 'RREI.CA',
    name: 'العاشر من رمضان للصناعات الدوائية (راميدا)',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'rrei rameda راميدا العاشر من رمضان ادوية علاج فارما',
  },
  {
    symbol: 'SPMD.CA',
    name: 'سبيد ميديكال',
    sector: 'الاتصالات والاستهلاكي',
    keywords: 'spmd speed medical سبيد ميديكال معامل تحاليل طبية',
  },
];
