import React from 'react';
import { LayoutDashboard, Truck, Wrench, ShieldCheck, Package, FileText } from 'lucide-react';
import { NavItemKey } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';

interface MobileNavProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onSelectTab }) => {
  const { activeRole } = useAuth();
  const { t } = useI18n();

  const getRoleMobileItems = (): { key: NavItemKey; label: string; icon: React.ReactNode }[] => {
    switch (activeRole) {
      case 'FLEET_MANAGER':
        return [
          { key: 'dashboard', label: t('dashboard', 'Dashboard'), icon: <LayoutDashboard size={18} /> },
          { key: 'vehicles', label: t('vehicles', 'Trucks'), icon: <Truck size={18} /> },
          { key: 'workOrders', label: t('workOrders', 'Work Orders'), icon: <Wrench size={18} /> },
          { key: 'inspections', label: t('inspections', 'Reports'), icon: <ShieldCheck size={18} /> },
        ];
      case 'FLEET_STAFF':
        return [
          { key: 'dashboard', label: t('dashboard', 'Dashboard'), icon: <LayoutDashboard size={18} /> },
          { key: 'vehicles', label: t('vehicles', 'Trucks'), icon: <Truck size={18} /> },
          { key: 'documents', label: t('documents', 'Permits'), icon: <FileText size={18} /> },
          { key: 'inspections', label: t('inspections', 'Reports'), icon: <ShieldCheck size={18} /> },
        ];
      case 'WORKSHOP_MANAGER':
      case 'WORKSHOP_STAFF':
        return [
          { key: 'dashboard', label: t('dashboard', 'Dashboard'), icon: <LayoutDashboard size={18} /> },
          { key: 'workOrders', label: t('workOrders', 'Job Cards'), icon: <Wrench size={18} /> },
          { key: 'inventory', label: t('inventory', 'Store'), icon: <Package size={18} /> },
          { key: 'inspections', label: t('inspections', 'Reports'), icon: <ShieldCheck size={18} /> },
        ];
      case 'SUPER_ADMIN':
      case 'VIEWER':
      default:
        return [
          { key: 'dashboard', label: t('dashboard', 'Dashboard'), icon: <LayoutDashboard size={18} /> },
          { key: 'vehicles', label: t('vehicles', 'Trucks'), icon: <Truck size={18} /> },
          { key: 'workOrders', label: t('workOrders', 'Work Orders'), icon: <Wrench size={18} /> },
          { key: 'inventory', label: t('inventory', 'Store'), icon: <Package size={18} /> },
        ];
    }
  };

  const items = getRoleMobileItems();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex justify-around py-1.5 px-2"
      style={{
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {items.map(item => {
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectTab(item.key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              background: isActive ? 'var(--color-row-hover)' : 'transparent',
              color: isActive ? 'var(--color-ink)' : 'var(--color-text-muted)',
              fontWeight: isActive ? 600 : 400,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {item.icon}
            <span style={{ marginTop: 3 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
