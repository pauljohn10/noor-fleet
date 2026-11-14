import React, { useState, useRef, useEffect } from 'react';
import { Bell, Users, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { NotificationCenter } from '../common/NotificationCenter';
import { NavItemKey } from './Sidebar';
import { UserManagementModal } from '../common/UserManagementModal';

interface HeaderProps {
  activeTab?: NavItemKey;
  onOpenSearch: () => void;
  onToggleSidebar?: () => void;
}

/** Map a NavItemKey to a human-readable breadcrumb + page segment */
const getBreadcrumb = (tab: NavItemKey, isRTL: boolean): { section: string; page: string } => {
  const map: Partial<Record<NavItemKey, { section: string; sectionAr: string; page: string; pageAr: string }>> = {
    dashboard:      { section: 'Home',         sectionAr: 'الرئيسية',    page: 'Dashboard',               pageAr: 'لوحة القيادة' },
    vehicles:       { section: 'Operations',   sectionAr: 'العمليات',    page: 'Vehicles',                pageAr: 'المركبات' },
    trailers:       { section: 'Operations',   sectionAr: 'العمليات',    page: 'Trailers',                pageAr: 'المقطورات' },
    liveMap:        { section: 'GPS',          sectionAr: 'GPS',         page: 'Live Map',                pageAr: 'الخريطة المباشرة' },
    trips:          { section: 'GPS',          sectionAr: 'GPS',         page: 'Trip Management',         pageAr: 'إدارة الرحلات' },
    fuelMonitoring: { section: 'GPS',          sectionAr: 'GPS',         page: 'Fuel Consumption',        pageAr: 'استهلاك الوقود' },
    gpsSync:        { section: 'GPS',          sectionAr: 'GPS',         page: 'GPS Diagnostics',         pageAr: 'تشخيص GPS' },
    drivers:        { section: 'Operations',   sectionAr: 'العمليات',    page: 'Drivers',                 pageAr: 'السائقون' },
    inspections:    { section: 'Operations',   sectionAr: 'العمليات',    page: 'Reports Inbox',           pageAr: 'صندوق التقارير' },
    workOrders:     { section: 'Maintenance',  sectionAr: 'الصيانة',     page: 'Job Cards',               pageAr: 'بطاقات العمل' },
    preventive:     { section: 'Maintenance',  sectionAr: 'الصيانة',     page: 'Preventive',              pageAr: 'الصيانة الوقائية' },
    inventory:      { section: 'Maintenance',  sectionAr: 'الصيانة',     page: 'Spare Parts',             pageAr: 'قطع الغيار' },
    documents:      { section: 'Documents',    sectionAr: 'الوثائق',     page: 'Document Expiries',       pageAr: 'انتهاء الوثائق' },
    reports:        { section: 'Analytics',    sectionAr: 'التحليلات',   page: 'Reports & Export',        pageAr: 'التقارير والتصدير' },
    analytics:      { section: 'Analytics',    sectionAr: 'التحليلات',   page: 'Fleet Cost Metrics',      pageAr: 'مقاييس التكلفة' },
    userManagement: { section: 'Admin',        sectionAr: 'الإدارة',     page: 'User Management',         pageAr: 'إدارة المستخدمين' },
    auditLog:       { section: 'Admin',        sectionAr: 'الإدارة',     page: 'Audit Logs',              pageAr: 'سجلات التدقيق' },
  };
  const entry = map[tab];
  if (!entry) return { section: 'ERP', page: tab };
  return {
    section: isRTL ? entry.sectionAr : entry.section,
    page:    isRTL ? entry.pageAr    : entry.page,
  };
};

const roleLabel = (role: string, isRTL: boolean) => {
  const map: Record<string, { en: string; ar: string }> = {
    SUPER_ADMIN:   { en: 'Super Admin',    ar: 'مدير النظام' },
    FLEET_MANAGER: { en: 'Fleet Manager',  ar: 'مدير الأسطول' },
    MANAGEMENT:    { en: 'Management',     ar: 'الإدارة' },
  };
  const entry = map[role];
  if (!entry) return role;
  return isRTL ? entry.ar : entry.en;
};

export const Header: React.FC<HeaderProps> = ({ activeTab = 'dashboard', onOpenSearch }) => {
  const { currentProfile, activeRole, signOut } = useAuth();
  const { language, toggleLanguage, isRTL } = useI18n();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { section, page } = getBreadcrumb(activeTab, isRTL);

  const headerStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 30,
    height: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    background: 'var(--color-page-bg)',
    borderBottom: '1px solid var(--color-border)',
    fontFamily: 'var(--font-ui)',
    flexShrink: 0,
  };

  const ghostBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 10px',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    background: 'none',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    transition: 'background 0.12s',
    whiteSpace: 'nowrap' as const,
  };

  return (
    <header style={headerStyle}>
      {/* Left — breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ color: 'var(--color-text-muted)' }}>{section}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
        <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{page}</span>
      </div>

      {/* Right — actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Search */}
        <button
          onClick={onOpenSearch}
          style={{
            ...ghostBtnStyle,
            border: '1px solid var(--color-input-border)',
            background: 'var(--color-surface)',
            borderRadius: 4,
            padding: '5px 12px',
            gap: 8,
            width: 200,
            justifyContent: 'space-between',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-text-muted)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-input-border)')}
        >
          <span style={{ color: 'var(--color-text-muted)' }}>
            {isRTL ? 'ابحث عن أي شيء' : 'Search anything'}
          </span>
          <kbd style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-muted)',
            background: 'var(--color-page-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 3,
            padding: '1px 4px',
          }}>
            ⌘K
          </kbd>
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          style={ghostBtnStyle}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-sidebar-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {language === 'en' ? 'العربية' : 'English'}
        </button>

        {/* Role */}
        <span style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          padding: '0 6px',
        }}>
          {roleLabel(activeRole, isRTL)}
        </span>

        {/* Notifications */}
        <NotificationCenter />

        {/* Profile menu */}
        <div style={{ position: 'relative' }} ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-ink)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-ui)',
            }}
            title={currentProfile.full_name}
          >
            {currentProfile.full_name.charAt(0)}
          </button>

          {isProfileMenuOpen && (
            <div style={{
              position: 'absolute',
              insetInlineEnd: 0,
              top: 36,
              width: 220,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              boxShadow: '0 4px 16px rgba(22,21,19,0.1)',
              zIndex: 50,
              padding: 8,
            }}>
              <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--color-border)', marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>{currentProfile.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{currentProfile.email}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>{roleLabel(activeRole, isRTL)}</div>
              </div>

              {activeRole === 'SUPER_ADMIN' && (
                <MenuRow
                  icon={<Users size={13} />}
                  label={isRTL ? 'إدارة المستخدمين' : 'Manage users'}
                  onClick={() => { setIsProfileMenuOpen(false); setIsUserManagementOpen(true); }}
                />
              )}
              <MenuRow
                icon={<LogOut size={13} />}
                label={isRTL ? 'تسجيل الخروج' : 'Sign out'}
                onClick={() => { setIsProfileMenuOpen(false); signOut(); }}
                danger
              />
            </div>
          )}

          {activeRole === 'SUPER_ADMIN' && (
            <UserManagementModal
              isOpen={isUserManagementOpen}
              onClose={() => setIsUserManagementOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
};

const MenuRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        textAlign: 'start',
        padding: '7px 10px',
        borderRadius: 4,
        fontSize: 13,
        color: danger ? '#991B1B' : 'var(--color-ink)',
        background: hovered ? (danger ? '#FEF2F2' : 'var(--color-sidebar-hover)') : 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        transition: 'background 0.12s',
      }}
    >
      {icon}
      {label}
    </button>
  );
};
