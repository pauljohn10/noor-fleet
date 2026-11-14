import React, { useState } from 'react';
import { 
  LayoutDashboard, Truck, Wrench, CalendarCheck, ShieldCheck, 
  Package, UserCheck, FileText, History, Flame, ChevronRight, ChevronDown, Settings, Layers,
  Radio, Navigation, LogOut, Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';

export type NavItemKey = 
  | 'dashboard'
  | 'vehicles'
  | 'trailers'
  | 'liveMap'
  | 'trips'
  | 'fuelMonitoring'
  | 'gpsSync'
  | 'workOrders'
  | 'preventive'
  | 'inspections'
  | 'inventory'
  | 'technicians'
  | 'drivers'
  | 'documents'
  | 'analytics'
  | 'reports'
  | 'userManagement'
  | 'auditLog';

interface SidebarProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  collapsed?: boolean;
}

interface NavSubItem {
  key: NavItemKey;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: NavSubItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, collapsed = false }) => {
  const { activeRole, currentProfile, signOut } = useAuth();
  const { t, isRTL } = useI18n();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    fleet: true,
    telematics: true,
    drivers: true,
    operations: true,
    maintenance: true,
    documents: true,
    reports: true,
    admin: true,
    driver_portal: true
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const getERPNavGroups = (): NavGroup[] => {
    return [
      {
        id: 'telematics',
        title: t('nav_telematics', 'GPS & Telematics'),
        icon: <Radio className="w-3.5 h-3.5 text-amber-400" />,
        items: [
          { key: 'liveMap', label: t('liveMap', 'Live Vehicle Map'), icon: <Radio className="w-3.5 h-3.5 text-emerald-400" /> },
          { key: 'trips', label: t('trips', 'Trip Management'), icon: <Navigation className="w-3.5 h-3.5 text-amber-400" /> },
          { key: 'fuelMonitoring', label: t('fuelMonitoring', 'Fuel Consumption & Variance'), icon: <Flame className="w-3.5 h-3.5 text-amber-500" /> },
          { key: 'gpsSync', label: t('gpsSync', 'GPS Sync & Diagnostics'), icon: <Settings className="w-3.5 h-3.5 text-slate-400" /> }
        ]
      },
      {
        id: 'fleet',
        title: t('nav_fleet', 'Fleet Management'),
        icon: <Truck className="w-3.5 h-3.5 text-amber-400" />,
        items: [
          { key: 'vehicles', label: t('vehicles', 'Tractor Heads'), icon: <Truck className="w-3.5 h-3.5" /> },
          { key: 'trailers', label: t('trailers', 'Fuel Tanker Trailers'), icon: <Truck className="w-3.5 h-3.5 text-sky-400" /> }
        ]
      },
      {
        id: 'drivers',
        title: t('nav_drivers', 'Drivers & Roster'),
        icon: <UserCheck className="w-3.5 h-3.5 text-amber-400" />,
        items: [
          { key: 'drivers', label: t('drivers_tab', 'Driver List & Assignments'), icon: <UserCheck className="w-3.5 h-3.5" /> }
        ]
      },
      {
        id: 'operations',
        title: t('nav_operations', 'Operations'),
        icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />,
        items: [
          { key: 'inspections', label: t('inspections', 'Driver Reports Inbox'), icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> },
          { key: 'vehicles', label: t('status_matrix', 'Vehicle Status Matrix'), icon: <Layers className="w-3.5 h-3.5" /> }
        ]
      },
      {
        id: 'maintenance',
        title: t('nav_maintenance', 'Maintenance'),
        icon: <Wrench className="w-3.5 h-3.5 text-amber-400" />,
        items: [
          { key: 'workOrders', label: t('workOrders', 'Maintenance Records'), icon: <Wrench className="w-3.5 h-3.5" /> },
          { key: 'preventive', label: t('preventive', 'Preventive Maintenance'), icon: <CalendarCheck className="w-3.5 h-3.5" /> },
          { key: 'inventory', label: t('inventory', 'Parts Store & Inventory'), icon: <Package className="w-3.5 h-3.5" /> }
        ]
      },
      {
        id: 'documents',
        title: t('nav_documents', 'Documents & Istimara'),
        icon: <FileText className="w-3.5 h-3.5 text-amber-400" />,
        items: [
          { key: 'documents', label: t('documents', 'Vehicle Documents'), icon: <FileText className="w-3.5 h-3.5" /> }
        ]
      },
      {
        id: 'reports',
        title: t('nav_reports', 'Reports & Analytics'),
        icon: <FileText className="w-3.5 h-3.5 text-amber-400" />,
        items: [
          { key: 'reports', label: t('reports', 'Executive Reports'), icon: <FileText className="w-3.5 h-3.5" /> },
          { key: 'analytics', label: t('analytics', 'Fleet Cost Metrics'), icon: <FileText className="w-3.5 h-3.5" /> }
        ]
      },
      ...(activeRole === 'SUPER_ADMIN' ? [{
        id: 'admin',
        title: t('nav_admin', 'Administration'),
        icon: <Settings className="w-3.5 h-3.5 text-amber-400" />,
        items: [
          { key: 'userManagement' as NavItemKey, label: t('userManagement', 'User & Role Management'), icon: <Shield className="w-3.5 h-3.5" /> },
          { key: 'auditLog' as NavItemKey, label: t('auditLog', 'Audit Trail Logs'), icon: <History className="w-3.5 h-3.5" /> }
        ]
      }] : [])
    ];
  };

  const navGroups = getERPNavGroups();

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-[#0a0f1d] border-r rtl:border-r-0 rtl:border-l border-slate-800/80 flex flex-col shrink-0 min-h-screen select-none transition-all duration-200`}>
      {/* Enterprise Brand Header */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-800/90 bg-[#0d1424]">
        <div className="p-1.5 rounded-lg bg-amber-400 text-slate-950 font-black shrink-0 shadow-md shadow-amber-400/20">
          <Flame className="w-4 h-4 fill-current" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-xs font-black uppercase tracking-wider text-white leading-none truncate">
              {t('companyName', 'AL-NOOR UNITED')}
            </h1>
            <p className="text-[9px] text-amber-400 font-bold mt-1 tracking-tight uppercase">
              {t('systemSubtitle', 'FUEL TRANSPORT ERP')}
            </p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {/* Single Dashboard button at top */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition rounded-lg ${
            isRTL ? 'border-r-2' : 'border-l-2'
          } ${
            activeTab === 'dashboard'
              ? 'bg-slate-800/90 text-amber-400 border-amber-400 font-bold shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border-transparent'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
            {!collapsed && <span>{t('dashboard', 'Dashboard')}</span>}
          </div>
          {!collapsed && activeTab === 'dashboard' && (
            <ChevronRight className={`w-3 h-3 text-amber-400 ${isRTL ? 'rotate-180' : ''}`} />
          )}
        </button>

        <div className="border-t border-slate-800/60 my-1"></div>

        {/* Expandable Navigation Groups */}
        {navGroups.map(group => {
          const isOpen = openGroups[group.id] ?? true;

          return (
            <div key={group.id} className="space-y-0.5">
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition"
                >
                  <div className="flex items-center gap-1.5">
                    {group.icon}
                    <span>{group.title}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  ) : (
                    <ChevronRight className={`w-3 h-3 text-slate-500 ${isRTL ? 'rotate-180' : ''}`} />
                  )}
                </button>
              ) : (
                <div className="px-2 py-1 text-[9px] font-bold text-slate-500 text-center uppercase">
                  {group.title.slice(0, 3)}
                </div>
              )}

              {(isOpen || collapsed) && (
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const isActive = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => onSelectTab(item.key)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium transition rounded-lg ${
                          isRTL ? 'border-r-2' : 'border-l-2'
                        } ${
                          isActive
                            ? 'bg-slate-800/90 text-amber-400 border-amber-400 font-bold shadow-xs'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border-transparent'
                        }`}
                        title={item.label}
                      >
                        <div className="flex items-center gap-2">
                          <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>{item.icon}</span>
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!collapsed && isActive && (
                          <ChevronRight className={`w-3 h-3 text-amber-400 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Profile & Sign Out Footer */}
      {!collapsed ? (
        <div className="p-3 border-t border-slate-800/90 bg-[#0d1424] text-[11px] text-slate-400">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-slate-200 truncate max-w-[110px]">{currentProfile.full_name}</span>
            <span className="text-amber-400 font-mono font-extrabold text-[9px] uppercase bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
              {t(activeRole, activeRole.replace(/_/g, ' '))}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/70">
            <p className="text-[10px] text-slate-500 font-mono">{t('dammamHub', 'ERP Terminal | Dammam')}</p>
            <button
              onClick={signOut}
              className="text-rose-400 hover:text-rose-300 transition p-1 hover:bg-rose-950/40 rounded flex items-center gap-1 text-[10px] font-bold"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
              <span>{isRTL ? 'خروج' : 'Exit'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-800/90 bg-[#0d1424] flex justify-center">
          <button
            onClick={signOut}
            className="text-rose-400 hover:text-rose-300 p-2 rounded hover:bg-rose-950/40 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
