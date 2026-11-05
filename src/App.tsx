import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { FleetProvider } from './context/FleetContext';
import { Layout } from './components/layout/Layout';
import { NavItemKey } from './components/layout/Sidebar';
import { LoginPage } from './components/auth/LoginPage';
import { PublicDriverReportPortal } from './components/public/PublicDriverReportPortal';
import { Flame } from 'lucide-react';

import { SuperAdminDashboard } from './components/dashboards/SuperAdminDashboard';
import { FleetManagerDashboard } from './components/dashboards/FleetManagerDashboard';
import { ManagementDashboard } from './components/dashboards/ManagementDashboard';

import { VehicleList } from './components/vehicles/VehicleList';
import { TrailerList } from './components/trailers/TrailerList';
import { JobCardList } from './components/workOrders/JobCardList';
import { MaintenanceScheduleList } from './components/preventive/MaintenanceScheduleList';
import { InspectionList } from './components/inspections/InspectionList';
import { PartsList } from './components/inventory/PartsList';
import { TechnicianList } from './components/technicians/TechnicianList';
import { DriverList } from './components/drivers/DriverList';
import { DocumentList } from './components/documents/DocumentList';
import { CostAnalysisView } from './components/analytics/CostAnalysisView';
import { ReportsCenter } from './components/reports/ReportsCenter';
import { AuditLogView } from './components/audit/AuditLogView';

import { LiveFleetMap } from './components/telematics/LiveFleetMap';
import { TripManager } from './components/telematics/TripManager';
import { FuelMonitoringView } from './components/telematics/FuelMonitoringView';
import { GpsSyncStatusView } from './components/telematics/GpsSyncStatusView';

function isPublicDriverReportRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  return (
    pathname === '/driver-report' ||
    pathname.endsWith('/driver-report') ||
    hash === '#/driver-report' ||
    hash === '#driver-report' ||
    params.get('portal') === 'driver-report'
  );
}

export function AppContent() {
  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  const [isPublicPortal, setIsPublicPortal] = useState<boolean>(() => isPublicDriverReportRoute());
  const { activeRole, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    const syncRoute = () => setIsPublicPortal(isPublicDriverReportRoute());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  // Dedicated Public Driver Issue Reporting Portal (/driver-report) — No login required
  if (isPublicPortal) {
    return <PublicDriverReportPortal />;
  }

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#081a44] via-[#0d2870] to-[#061233] text-white">
        <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/20 mb-4 animate-bounce">
          <Flame className="w-8 h-8 fill-current" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-white">NOOR FLEET ERP</h2>
        <p className="text-xs text-sky-200 mt-1 font-medium">Initializing secure telemetry & fleet session...</p>
        <div className="w-36 h-1 bg-white/20 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full animate-pulse" style={{ width: '70%' }} />
        </div>
      </div>
    );
  }

  // If not logged in, render the reference-matching Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderRoleDashboard = () => {
    switch (activeRole) {
      case 'SUPER_ADMIN':
        return <SuperAdminDashboard onNavigateTab={setActiveTab} />;
      case 'FLEET_MANAGER':
        return <FleetManagerDashboard onNavigateTab={setActiveTab} />;
      case 'MANAGEMENT':
      default:
        return <ManagementDashboard onNavigateTab={setActiveTab} />;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderRoleDashboard();
      case 'liveMap':
        return <LiveFleetMap />;
      case 'trips':
        return <TripManager />;
      case 'fuelMonitoring':
        return <FuelMonitoringView />;
      case 'gpsSync':
        return <GpsSyncStatusView />;
      case 'vehicles':
        return <VehicleList />;
      case 'trailers':
        return <TrailerList />;
      case 'workOrders':
        return <JobCardList />;
      case 'preventive':
        return <MaintenanceScheduleList />;
      case 'inspections':
        return <InspectionList />;
      case 'inventory':
        return <PartsList />;
      case 'technicians':
        return <TechnicianList />;
      case 'drivers':
        return <DriverList />;
      case 'documents':
        return <DocumentList />;
      case 'analytics':
        return <CostAnalysisView />;
      case 'reports':
        return <ReportsCenter />;
      case 'auditLog':
        return activeRole === 'SUPER_ADMIN' ? <AuditLogView /> : renderRoleDashboard();
      default:
        return renderRoleDashboard();
    }
  };

  return (
    <Layout activeTab={activeTab} onSelectTab={setActiveTab}>
      {renderTabContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <FleetProvider>
          <AppContent />
        </FleetProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
