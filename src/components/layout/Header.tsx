import React, { useState, useRef, useEffect } from 'react';
import { Search, Globe, Shield, ChevronDown, ChevronRight, Menu, LogOut, User, Check, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { NotificationCenter } from '../common/NotificationCenter';
import { UserRole } from '../../types';
import { NavItemKey } from './Sidebar';
import { UserManagementModal } from '../common/UserManagementModal';

interface HeaderProps {
  activeTab?: NavItemKey;
  onOpenSearch: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab = 'dashboard', onOpenSearch, onToggleSidebar }) => {
  const { currentProfile, activeRole, signOut } = useAuth();
  const { language, toggleLanguage, t, isRTL } = useI18n();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rolesList: { role: UserRole; label: string }[] = [
    { role: 'SUPER_ADMIN', label: t('SUPER_ADMIN', 'Super Admin') },
    { role: 'FLEET_MANAGER', label: t('FLEET_MANAGER', 'Fleet Manager') },
    { role: 'MANAGEMENT', label: t('MANAGEMENT', 'Management') }
  ];

  const getPageTitleAndBreadcrumb = (tab: NavItemKey) => {
    return {
      title: t(`title_${tab}`, tab.toUpperCase()),
      breadcrumb: t(`breadcrumb_${tab}`, 'Operations')
    };
  };

  const pageInfo = getPageTitleAndBreadcrumb(activeTab);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-4 shadow-2xs text-xs">
      {/* Left side: Sidebar Toggle, ERP Breadcrumb & Operational Title */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
            title="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-tight">
            <span>{isRTL ? 'المنظومة' : 'ERP'}</span>
            <ChevronRight className={`w-3 h-3 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
            <span className="text-amber-600 font-bold">{pageInfo.breadcrumb}</span>
          </div>
          <h1 className="text-sm font-extrabold text-slate-900 leading-none mt-0.5 tracking-tight">
            {pageInfo.title}
          </h1>
        </div>
      </div>

      {/* Center & Right: Global Search, Role Switcher, RTL, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-100 transition shadow-2xs w-36 sm:w-64"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{t('searchPlaceholder', 'Search vehicle, WO#, driver, VIN...')}</span>
          <kbd className="ml-auto hidden rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px] font-mono font-bold text-slate-400 sm:inline-block shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Language/RTL Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition shadow-2xs"
          title={t('langToggleTitle')}
        >
          <Globe className="w-3.5 h-3.5 text-sky-600" />
          <span className="font-bold text-[11px]">{language === 'en' ? 'العربية' : 'English'}</span>
        </button>

        {/* Verified User Role Badge (Read-Only) */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50/90 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs">
          <Shield className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline text-slate-500 font-normal">{t('roleLabel', 'Role:')}</span>
          <span className="font-bold text-amber-950">{rolesList.find(r => r.role === activeRole)?.label || activeRole}</span>
        </div>

        {/* Notifications */}
        <NotificationCenter />

        {/* User Profile Menu */}
        <div className="relative pl-1 rtl:pl-0 rtl:pr-1 border-l rtl:border-l-0 rtl:border-r border-slate-200" ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition active:scale-95"
            title="User Profile Menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-slate-900 to-slate-800 text-amber-400 font-bold text-xs shadow-xs border border-slate-700">
              {currentProfile.full_name.charAt(0)}
            </div>
            <div className="hidden lg:block text-left rtl:text-right">
              <p className="text-xs font-bold text-slate-900 leading-none">{currentProfile.full_name}</p>
              <p className="text-[10px] text-slate-500 font-medium leading-none mt-1 truncate max-w-[120px]">
                {isRTL ? 'لوجستيات نقل الوقود' : currentProfile.department}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-fade-in">
              {/* User details header */}
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-extrabold text-slate-900">{currentProfile.full_name}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{currentProfile.email}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {rolesList.find(r => r.role === activeRole)?.label || activeRole}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                  </span>
                </div>
              </div>

              {/* Menu options */}
              <div className="pt-1.5 space-y-1">
                {activeRole === 'SUPER_ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsUserManagementOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>{isRTL ? 'إدارة المستخدمين والأدوار' : 'Manage Users & Roles'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>{isRTL ? 'تسجيل الخروج' : 'Sign Out / Lock System'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Super Admin User Management Modal */}
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
