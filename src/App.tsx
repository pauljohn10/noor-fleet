import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider, useI18n } from './context/I18nContext';
import { FleetProvider } from './context/FleetContext';
import { Layout } from './components/layout/Layout';
import { NavItemKey } from './components/layout/Sidebar';
import { LoginPage } from './components/auth/LoginPage';
import { PublicDriverReportPortal } from './components/public/PublicDriverReportPortal';
import { Flame } from 'lucide-react';

import { SuperAdminDashboard } from './components/dashboards/SuperAdminDashboard';
import { FleetManagerDashboard } from './components/dashboards/FleetManagerDashboard';
import { WorkshopSupervisorDashboard } from './components/dashboards/WorkshopSupervisorDashboard';
import { ManagementDashboard } from './components/dashboards/ManagementDashboard';

import { VehicleList } from './components/vehicles/VehicleList';
import { SmallVehicleList } from './components/vehicles/SmallVehicleList';
import { VehicleStatusMatrix } from './components/vehicles/VehicleStatusMatrix';
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
import { UserManagementView } from './components/admin/UserManagementView';

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
  const { activeRole, isAuthenticated, isLoading, canAccessTab } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (isAuthenticated && !canAccessTab(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [isAuthenticated, activeRole, activeTab, canAccessTab]);

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
      <div
        className="min-h-screen w-screen flex flex-col items-center justify-center"
        style={{ background: 'var(--color-page-bg)', color: 'var(--color-ink)' }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            border: '1.5px solid var(--color-ink)',
            borderRadius: 4,
            overflow: 'hidden',
            background: 'var(--color-surface)',
            marginBottom: 16,
          }}
        >
          <span style={{ width: 7, alignSelf: 'stretch', background: 'var(--color-brand-accent)' }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              fontWeight: 600,
              padding: '6px 12px',
              color: 'var(--color-ink)',
            }}
          >
            NF
          </span>
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-brand)',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--color-ink)',
          }}
        >
          {t('app.title', 'Noor Fleet')}
        </h2>
        <p style={{ marginTop: 6, fontSize: 13, color: 'var(--color-text-muted)' }}>
          {t('app.initializing', 'Initializing secure telemetry & fleet session...')}
        </p>
      </div>
    );
  }

  // If not logged in, render the reference-matching Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleSelectTab = (tab: NavItemKey) => {
    if (canAccessTab(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('dashboard');
    }
  };

  const renderRoleDashboard = () => {
    switch (activeRole) {
      case 'SUPER_ADMIN':
        return <SuperAdminDashboard onNavigateTab={handleSelectTab} />;
      case 'FLEET_MANAGER':
      case 'FLEET_STAFF':
        return <FleetManagerDashboard onNavigateTab={handleSelectTab} />;
      case 'WORKSHOP_MANAGER':
      case 'WORKSHOP_STAFF':
        return <WorkshopSupervisorDashboard onNavigateTab={handleSelectTab} />;
      case 'VIEWER':
      default:
        return <ManagementDashboard onNavigateTab={handleSelectTab} />;
    }
  };

  const renderTabContent = () => {
    if (!canAccessTab(activeTab)) {
      return renderRoleDashboard();
    }
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
      case 'smallVehicles':
        return <SmallVehicleList />;
      case 'trailers':
        return <TrailerList />;
      case 'workOrders':
        return <JobCardList />;
      case 'preventive':
        return <MaintenanceScheduleList />;
      case 'inspections':
        return <InspectionList />;
      case 'statusMatrix':
        return <VehicleStatusMatrix />;
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
      case 'userManagement':
        return activeRole === 'SUPER_ADMIN' ? <UserManagementView /> : renderRoleDashboard();
      case 'auditLog':
        return activeRole === 'SUPER_ADMIN' ? <AuditLogView /> : renderRoleDashboard();
      default:
        return renderRoleDashboard();
    }
  };

  return (
    <Layout activeTab={activeTab} onSelectTab={handleSelectTab}>
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
