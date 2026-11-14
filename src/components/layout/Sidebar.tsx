import React from 'react';
import { LogOut } from 'lucide-react';
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

interface NavItem {
  key: NavItemKey;
  label: string;
  labelAr: string;
}

interface NavGroup {
  id: string;
  title: string;
  titleAr: string;
  items: NavItem[];
  adminOnly?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'telematics',
    title: 'GPS & Telematics',
    titleAr: 'GPS والتتبع',
    items: [
      { key: 'liveMap',        label: 'Live Vehicle Map',             labelAr: 'خريطة المركبات' },
      { key: 'trips',          label: 'Trip Management',              labelAr: 'إدارة الرحلات' },
      { key: 'fuelMonitoring', label: 'Fuel Consumption & Variance',  labelAr: 'استهلاك الوقود' },
      { key: 'gpsSync',        label: 'GPS Sync & Diagnostics',       labelAr: 'تشخيص GPS' },
    ],
  },
  {
    id: 'fleet',
    title: 'Fleet Management',
    titleAr: 'إدارة الأسطول',
    items: [
      { key: 'vehicles',  label: 'Trucks Master',    labelAr: 'الشاحنات الرئيسية' },
      { key: 'trailers',  label: 'Tanker Trailers',  labelAr: 'مقطورات الصهريج' },
    ],
  },
  {
    id: 'drivers',
    title: 'Drivers & Roster',
    titleAr: 'السائقون والجدول',
    items: [
      { key: 'drivers', label: 'Driver List & Assignments', labelAr: 'قائمة السائقين' },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    titleAr: 'العمليات',
    items: [
      { key: 'inspections', label: 'Driver Reports Inbox',  labelAr: 'صندوق تقارير السائقين' },
      { key: 'vehicles',    label: 'Vehicle Status Matrix', labelAr: 'مصفوفة حالة المركبات' },
    ],
  },
  {
    id: 'maintenance',
    title: 'Maintenance',
    titleAr: 'الصيانة',
    items: [
      { key: 'workOrders', label: 'Job Cards & Repair',   labelAr: 'بطاقات العمل والإصلاح' },
      { key: 'preventive', label: 'Preventive Maint.',    labelAr: 'الصيانة الوقائية' },
      { key: 'inventory',  label: 'Spare Parts Store',    labelAr: 'مخزن قطع الغيار' },
    ],
  },
  {
    id: 'documents',
    title: 'Documents & Istimara',
    titleAr: 'الوثائق والاستمارة',
    items: [
      { key: 'documents', label: 'Document Expiries', labelAr: 'انتهاء الوثائق' },
    ],
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    titleAr: 'التقارير والتحليلات',
    items: [
      { key: 'reports',    label: 'Reports & Export',    labelAr: 'التقارير والتصدير' },
      { key: 'analytics',  label: 'Fleet Cost Metrics',  labelAr: 'مقاييس تكلفة الأسطول' },
    ],
  },
  {
    id: 'admin',
    title: 'Administration',
    titleAr: 'الإدارة',
    adminOnly: true,
    items: [
      { key: 'userManagement', label: 'User Management', labelAr: 'إدارة المستخدمين' },
      { key: 'auditLog',       label: 'Audit Logs',      labelAr: 'سجلات التدقيق' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { activeRole, currentProfile, signOut } = useAuth();
  const { isRTL } = useI18n();

  const visibleGroups = NAV_GROUPS.filter(g => !g.adminOnly || activeRole === 'SUPER_ADMIN');

  const sidebarBase: React.CSSProperties = {
    width: 224,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    background: 'var(--color-page-bg)',
    borderInlineEnd: '1px solid var(--color-border)',
    userSelect: 'none',
    fontFamily: 'var(--font-ui)',
    overflowY: 'auto',
  };

  return (
    <aside style={sidebarBase}>
      {/* Brand */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-brand)',
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--color-ink)',
          lineHeight: 1.1,
        }}>
          {isRTL ? 'النور المتحدة' : 'Al-Noor United'}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--color-text-muted)',
          marginTop: 3,
          fontFamily: 'var(--font-ui)',
        }}>
          {isRTL ? 'نظام نقل الوقود' : 'Fuel transport ERP'}
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        {/* Dashboard standalone item */}
        <NavBtn
          label={isRTL ? 'لوحة القيادة' : 'Dashboard'}
          isActive={activeTab === 'dashboard'}
          onClick={() => onSelectTab('dashboard')}
        />

        <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0' }} />

        {visibleGroups.map(group => (
          <div key={group.id} style={{ marginBottom: 4 }}>
            {/* Group label */}
            <div style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              padding: '8px 8px 4px',
              letterSpacing: '0.01em',
              textTransform: 'none',
            }}>
              {isRTL ? group.titleAr : group.title}
            </div>

            {group.items.map(item => (
              <NavBtn
                key={`${group.id}-${item.key}`}
                label={isRTL ? item.labelAr : item.label}
                isActive={activeTab === item.key && group.id !== 'operations'}
                onClick={() => onSelectTab(item.key)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Footer — user + sign out */}
      <div style={{
        padding: '12px 12px',
        borderTop: '1px solid var(--color-border)',
        fontSize: 12,
      }}>
        <div style={{
          color: 'var(--color-ink)',
          fontWeight: 500,
          marginBottom: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {currentProfile.full_name}
        </div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginBottom: 8 }}>
          {activeRole.replace(/_/g, ' ')}
        </div>
        <button
          onClick={signOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
            transition: 'color 0.15s',
            fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <LogOut size={13} />
          <span>{isRTL ? 'خروج' : 'Sign out'}</span>
        </button>
      </div>
    </aside>
  );
};

/* ── Reusable nav button ── */
const NavBtn: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => {
  const [hovered, setHovered] = React.useState(false);

  const style: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'start',
    padding: '6px 8px',
    borderRadius: 4,
    fontSize: 13.5,
    fontWeight: isActive ? 600 : 400,
    fontFamily: 'var(--font-ui)',
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.12s, color 0.12s',
    color: isActive ? 'var(--color-page-bg)' : 'var(--color-ink)',
    background: isActive
      ? 'var(--color-ink)'
      : hovered
      ? 'var(--color-sidebar-hover)'
      : 'transparent',
    marginBottom: 1,
  };

  return (
    <button
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
};
