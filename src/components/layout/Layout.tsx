import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar, NavItemKey } from './Sidebar';
import { MobileNav } from './MobileNav';
import { GlobalSearch } from '../common/GlobalSearch';

interface LayoutProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, onSelectTab, children }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--color-page-bg)', color: 'var(--color-ink)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar 
          activeTab={activeTab} 
          onSelectTab={onSelectTab} 
          collapsed={sidebarCollapsed} 
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header 
          activeTab={activeTab} 
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--color-page-bg)' }}>
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav activeTab={activeTab} onSelectTab={onSelectTab} />

      {/* Global Search Modal */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={(type, _id) => {
          if (type === 'vehicle') onSelectTab('vehicles');
          if (type === 'trailer') onSelectTab('trailers');
          if (type === 'workOrder') onSelectTab('workOrders');
          if (type === 'part') onSelectTab('inventory');
        }}
      />
    </div>
  );
};
