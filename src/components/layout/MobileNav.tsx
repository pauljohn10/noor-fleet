import React from 'react';
import { LayoutDashboard, Truck, Wrench, ShieldCheck, Package } from 'lucide-react';
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
          { key: 'dashboard', label: t('dashboard', 'Dashboard'), icon: <LayoutDashboard className="w-5 h-5" /> },
          { key: 'vehicles', label: t('vehicles', 'Trucks'), icon: <Truck className="w-5 h-5" /> },
          { key: 'workOrders', label: t('workOrders', 'Work Orders'), icon: <Wrench className="w-5 h-5" /> },
          { key: 'inspections', label: t('inspections', 'Reports'), icon: <ShieldCheck className="w-5 h-5 text-amber-400" /> }
        ];
      case 'SUPER_ADMIN':
      case 'MANAGEMENT':
      default:
        return [
          { key: 'dashboard', label: t('dashboard', 'Dashboard'), icon: <LayoutDashboard className="w-5 h-5" /> },
          { key: 'vehicles', label: t('vehicles', 'Trucks'), icon: <Truck className="w-5 h-5" /> },
          { key: 'workOrders', label: t('workOrders', 'Work Orders'), icon: <Wrench className="w-5 h-5" /> },
          { key: 'inventory', label: t('inventory', 'Store'), icon: <Package className="w-5 h-5" /> }
        ];
    }
  };

  const items = getRoleMobileItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-800 md:hidden flex justify-around p-2">
      {items.map(item => {
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onSelectTab(item.key)}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold transition ${
              isActive ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.icon}
            <span className="mt-1">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
