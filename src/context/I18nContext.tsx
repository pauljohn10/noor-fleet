import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export interface I18nContextType {
  language: Language;
  direction: Direction;
  isRTL: boolean;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const STORAGE_LANG_KEY = 'noor_fleet_language';

const translations: Record<string, Record<Language, string>> = {
  appName: { en: 'Fleet & Workshop System', ar: 'نظام إدارة الأسطول والورشة' },
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم' },
  vehicles: { en: 'Trucks Master', ar: 'شاحنات الأسطول' },
  trailers: { en: 'Tanker Trailers', ar: 'المقطورات والسهاريج' },
  workOrders: { en: 'Job Cards & Repair', ar: 'أوامر العمل والبطاقات' },
  preventive: { en: 'Preventive Maint.', ar: 'الصيانة الوقائية' },
  inspection: { en: 'Vehicle Inspections', ar: 'فحص المركبات' },
  inspections: { en: 'Driver Reports Inbox', ar: 'صندوق بلاغات السائقين' },
  inventory: { en: 'Spare Parts Store', ar: 'مخزن قطع الغيار' },
  technicians: { en: 'Technicians', ar: 'الفنيون والميكانيكيون' },
  drivers: { en: 'Drivers', ar: 'السائقون' },
  documents: { en: 'Document Expiries', ar: 'وثائق وتراخيص المركبات' },
  reports: { en: 'Reports & Export', ar: 'التقارير والتصدير' },
  analytics: { en: 'Fleet Cost Metrics', ar: 'تكاليف ومؤشرات الأسطول' },
  auditLog: { en: 'System Audit Log', ar: 'سجل العمليات والرقابة' },
  liveMap: { en: 'Live Vehicle Map', ar: 'خريطة الأسطول الحية' },
  trips: { en: 'Trip Management', ar: 'إدارة الرحلات' },
  fuelMonitoring: { en: 'Fuel Consumption & Variance', ar: 'مراقبة الوقود والانحراف' },
  gpsSync: { en: 'GPS Sync & Diagnostics', ar: 'مزامنة التتبع والتشخيص' },

  // Fleet Status
  AVAILABLE: { en: 'AVAILABLE', ar: 'متاح للخدمة' },
  ON_TRIP: { en: 'ON TRIP', ar: 'في رحلة' },
  IN_WORKSHOP: { en: 'IN WORKSHOP', ar: 'في الورشة' },
  'REQUIRES INSPECTION': { en: 'REQUIRES INSPECT', ar: 'يتطلب فحص' },
  OUT_OF_SERVICE: { en: 'OUT OF SERVICE', ar: 'خارج الخدمة' },

  // Roles (Strictly 3 roles)
  SUPER_ADMIN: { en: 'Super Admin', ar: 'المدير العام' },
  FLEET_MANAGER: { en: 'Fleet Manager', ar: 'مدير الأسطول' },
  MANAGEMENT: { en: 'Management', ar: 'الإدارة والتدقيق' },

  // UI labels
  langToggleTitle: { en: 'Switch Language', ar: 'تغيير اللغة' },
  roleLabel: { en: 'Role:', ar: 'الدور:' },
  switchPersona: { en: 'Switch Staff Role', ar: 'تبديل دور المستخدم' },
  searchPlaceholder: { en: 'Search vehicle, WO#, driver, VIN...', ar: 'بحث عن مركبة، أمر عمل، سائق، هيكل...' },
  my_portal: { en: 'Home', ar: 'الرئيسية' },
  assigned_map: { en: 'Assigned Vehicle Map', ar: 'خريطة المركبة المخصصة' },
  my_trips: { en: 'My Dispatched Trips', ar: 'رحلاتي المجدولة' },
  log_fuel: { en: 'Log Fuel Dispense', ar: 'تسجيل تعبئة وقود' },
  submit_defect: { en: 'Submit Problem Report', ar: 'إرسال بلاغ عطل' },
  vehicle_permits: { en: 'Vehicle Permits', ar: 'تصاريح ووثائق الشاحنة' },
  drivers_tab: { en: 'Driver List & Assignments', ar: 'قائمة السائقين والتعيينات' },
  status_matrix: { en: 'Vehicle Status Matrix', ar: 'مصفوفة حالة المركبات' }
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      return saved === 'ar' || saved === 'en' ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = direction === 'rtl';

  useEffect(() => {
    try {
      document.documentElement.dir = direction;
      document.documentElement.lang = language;
      localStorage.setItem(STORAGE_LANG_KEY, language);
    } catch (e) {
      console.warn('Unable to persist language:', e);
    }
  }, [direction, language]);

  const toggleLanguage = () => {
    setLanguageState(prev => (prev === 'en' ? 'ar' : 'en'));
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string, fallback?: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    if (fallback !== undefined) {
      return fallback;
    }
    return key;
  };

  return (
    <I18nContext.Provider value={{ language, direction, isRTL, toggleLanguage, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

