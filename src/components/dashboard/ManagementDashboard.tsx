import React from 'react';
import {
  Truck,
  Wrench,
  AlertTriangle,
  CalendarCheck,
  Package,
  DollarSign,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { useFleet, DateFilterOption } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { StatCard } from '../common/StatCard';
import { DashboardCharts } from './DashboardCharts';
import { Badge } from '../common/Badge';
import {
  EDITORIAL_STATUS,
  PageContainer,
  PageHeader,
  StatusTabs,
  EditorialSection,
  DataTable,
  DataRow,
  StatusText,
  GhostButton,
} from '../common/EditorialUI';

interface ManagementDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ onNavigateTab }) => {
  const {
    vehicles,
    trailers,
    workOrders,
    parts,
    schedules,
    documents,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
  } = useFleet();
  const { isRTL } = useI18n();

  // Metrics Calculations
  const totalTrucks = vehicles.filter(
    (v) => v.vehicle_type === 'TRACTOR_HEAD' || v.vehicle_type === 'OTHER'
  ).length;
  const totalTrailers = trailers.length;
  const availableCount = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const onTripCount = vehicles.filter((v) => v.status === 'ON_TRIP').length;
  const inWorkshopCount = vehicles.filter((v) => v.status === 'IN_WORKSHOP').length;
  const outOfServiceCount = vehicles.filter((v) => v.status === 'OUT_OF_SERVICE').length;

  const maintenanceDueCount = schedules.filter(
    (s) => s.status === 'DUE' || s.status === 'OVERDUE' || s.status === 'DUE_SOON'
  ).length;

  const today = new Date();
  const docsExpiringCount = documents.filter((d) => {
    const exp = new Date(d.expiry_date);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 30;
  }).length;

  const openWOsCount = workOrders.filter(
    (w) => w.status !== 'RELEASED' && w.status !== 'CANCELLED' && w.status !== 'COMPLETED'
  ).length;
  const overdueWOsCount = workOrders.filter((w) => {
    if (!w.estimated_completion) return false;
    return new Date(w.estimated_completion) < today && w.status !== 'RELEASED' && w.status !== 'COMPLETED';
  }).length;

  const lowStockParts = parts.filter((p) => p.current_stock <= p.minimum_stock);
  const lowStockCount = lowStockParts.length;

  const totalMonthlyMaintCost = workOrders.reduce((sum, w) => sum + (w.total_cost || 0), 0);

  const dateFilterOptions: { key: DateFilterOption; label: string }[] = [
    { key: 'TODAY', label: isRTL ? 'ط§ظ„ظٹظˆظ…' : 'Today' },
    { key: 'WEEK', label: isRTL ? 'ظ‡ط°ط§ ط§ظ„ط£ط³ط¨ظˆط¹' : 'This Week' },
    { key: 'MONTH', label: isRTL ? 'ظ‡ط°ط§ ط§ظ„ط´ظ‡ط±' : 'This Month' },
    { key: 'YEAR', label: isRTL ? 'ظ‡ط°ظ‡ ط§ظ„ط³ظ†ط©' : 'This Year' },
    { key: 'ALL', label: isRTL ? 'ظƒظ„ ط§ظ„ط£ظˆظ‚ط§طھ' : 'All Time' },
    { key: 'CUSTOM', label: isRTL ? 'ظپطھط±ط© ظ…ط®طµطµط©' : 'Custom Range' },
  ];

  const getWoStripe = (priority: string, status: string) => {
    if (priority === 'CRITICAL') return EDITORIAL_STATUS.red.stripe;
    if (priority === 'HIGH' || status === 'WAITING_FOR_PARTS') return EDITORIAL_STATUS.amber.stripe;
    if (status === 'RELEASED' || status === 'COMPLETED') return EDITORIAL_STATUS.green.stripe;
    return EDITORIAL_STATUS.blue.stripe;
  };

  return (
    <PageContainer>
      <PageHeader
        title={isRTL ? 'ظ„ظˆط­ط© ط§ظ„ط¥ط¯ط§ط±ط© ط§ظ„طھظ†ظپظٹط°ظٹط© ظ„ظ„ط£ط³ط·ظˆظ„ ظˆط§ظ„ظˆط±ط´ط©' : 'Executive Fleet & Workshop Dashboard'}
        subtitle={
          isRTL
            ? 'ط§ظ„طھطھط¨ط¹ ط§ظ„ظ…ط¨ط§ط´ط±طŒ ط£ظˆط§ظ…ط± ط§ظ„ط¹ظ…ظ„طŒ طھظ†ط¨ظٹظ‡ط§طھ ط§ظ„ظ…ط®ط²ظˆظ†طŒ ظˆظ…ط¤ط´ط±ط§طھ طµظٹط§ظ†ط© طµظ‡ط§ط±ظٹط¬ ط§ظ„ظˆظ‚ظˆط¯.'
            : 'Real-time telemetry, job card pipeline, stock alerts, and fuel tanker maintenance metrics.'
        }
      />

      <StatusTabs
        tabs={dateFilterOptions.map((opt) => ({
          key: opt.key,
          label: opt.label,
          stripe: dateFilter === opt.key ? 'var(--color-brand-accent)' : undefined,
        }))}
        activeKey={dateFilter}
        onChange={(key) => setDateFilter(key as DateFilterOption)}
        extraFilters={
          dateFilter === 'CUSTOM' ? (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                className="nf-field"
                style={{ height: 32, padding: '4px 8px', width: 'auto' }}
              />
              <span style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'ط¥ظ„ظ‰' : 'to'}</span>
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                className="nf-field"
                style={{ height: 32, padding: '4px 8px', width: 'auto' }}
              />
            </div>
          ) : undefined
        }
      />

      {/* Primary KPI Grid (12 Counters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          title={isRTL ? 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط´ط§ط­ظ†ط§طھ' : 'Total trucks'}
          value={totalTrucks}
          subtitle={isRTL ? 'ط±ط¤ظˆط³ ط§ظ„ط´ط§ط­ظ†ط§طھ' : 'Tractor Heads'}
          icon={<Truck className="w-4 h-4" />}
          color="amber"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ظ‚ط·ظˆط±ط§طھ' : 'Total trailers'}
          value={totalTrailers}
          subtitle={isRTL ? 'ظˆط­ط¯ط§طھ ط§ظ„طµظ‡ط§ط±ظٹط¬' : 'Tanker Units'}
          icon={<Truck className="w-4 h-4" />}
          color="cyan"
          onClick={() => onNavigateTab('trailers')}
        />
        <StatCard
          title={isRTL ? 'ظ…طھط§ط­ ظ„ظ„ط®ط¯ظ…ط©' : 'Available'}
          value={availableCount}
          subtitle={isRTL ? 'ط¬ط§ظ‡ط²ط© ظ„ظ„ط±ط­ظ„ط©' : 'Ready for Trip'}
          icon={<Truck className="w-4 h-4" />}
          color="emerald"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'ظپظٹ ط±ط­ظ„ط©' : 'On trip'}
          value={onTripCount}
          subtitle={isRTL ? 'طھظˆطµظٹظ„ ظ†ط´ط·' : 'Active Delivery'}
          icon={<Truck className="w-4 h-4" />}
          color="blue"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'ظپظٹ ط§ظ„ظˆط±ط´ط©' : 'In workshop'}
          value={inWorkshopCount}
          subtitle={isRTL ? 'طھط­طھ ط§ظ„طµظٹط§ظ†ط©' : 'Under Maintenance'}
          icon={<Wrench className="w-4 h-4" />}
          color="amber"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'ط®ط§ط±ط¬ ط§ظ„ط®ط¯ظ…ط©' : 'Out of service'}
          value={outOfServiceCount}
          subtitle={isRTL ? 'ظˆط­ط¯ط§طھ ظ…طھظˆظ‚ظپط©' : 'Grounded Units'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'طµظٹط§ظ†ط© ظ…ط³طھط­ظ‚ط©' : 'Maintenance due'}
          value={maintenanceDueCount}
          subtitle={isRTL ? 'ظ…ط³طھط­ظ‚ط© / ظ…طھط£ط®ط±ط©' : 'PM Overdue/Due'}
          icon={<CalendarCheck className="w-4 h-4" />}
          color="purple"
          onClick={() => onNavigateTab('preventive')}
        />
        <StatCard
          title={isRTL ? 'ظˆط«ط§ط¦ظ‚ طھظ†طھظ‡ظٹ ظ‚ط±ظٹط¨ط§ظ‹' : 'Docs expiring'}
          value={docsExpiringCount}
          subtitle={isRTL ? 'â‰¤ 30 ظٹظˆظ… ظ„ظ„ط§ظ†طھظ‡ط§ط،' : 'â‰¤ 30 Days Expiry'}
          icon={<FileText className="w-4 h-4" />}
          color="amber"
          onClick={() => onNavigateTab('documents')}
        />
        <StatCard
          title={isRTL ? 'ط£ظˆط§ظ…ط± ط¹ظ…ظ„ ظ…ظپطھظˆط­ط©' : 'Open job cards'}
          value={openWOsCount}
          subtitle={isRTL ? 'ط£ظˆط§ظ…ط± ط¹ظ…ظ„ ظ†ط´ط·ط©' : 'Active Work Orders'}
          icon={<Wrench className="w-4 h-4" />}
          color="blue"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'ط£ط¹ظ…ط§ظ„ ظ…طھط£ط®ط±ط©' : 'Overdue jobs'}
          value={overdueWOsCount}
          subtitle={isRTL ? 'طھط¬ط§ظˆط²طھ ط§ظ„ظ…ظˆط¹ط¯' : 'Passed Completion'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'ظ‚ط·ط¹ ظ…ظ†ط®ظپط¶ط© ط§ظ„ظ…ط®ط²ظˆظ†' : 'Low stock parts'}
          value={lowStockCount}
          subtitle={isRTL ? 'ط£ظ‚ظ„ ظ…ظ† ط§ظ„ط­ط¯ ط§ظ„ط£ط¯ظ†ظ‰' : 'Below Min Threshold'}
          icon={<Package className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title={isRTL ? 'ط§ظ„طھظƒظ„ظپط© ط§ظ„ط´ظ‡ط±ظٹط©' : 'Monthly cost'}
          value={`${(totalMonthlyMaintCost || 0).toLocaleString()} ${isRTL ? 'ط±.ط³' : 'SAR'}`}
          subtitle={isRTL ? 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„طµظٹط§ظ†ط©' : 'Total Maintenance'}
          icon={<DollarSign className="w-4 h-4" />}
          color="emerald"
          onClick={() => onNavigateTab('analytics')}
        />
      </div>

      {/* Dashboard Analytics & Recharts */}
      <div className="mb-6">
        <DashboardCharts
          vehicles={vehicles}
          trailers={trailers}
          workOrders={workOrders}
          parts={parts}
          schedules={schedules}
        />
      </div>

      {/* Operational Highlights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <EditorialSection
          title={isRTL ? 'ط¨ط·ط§ظ‚ط§طھ ط§ظ„ط¹ظ…ظ„ ظˆط§ظ„ط¥طµظ„ط§ط­ط§طھ ط§ظ„ظ†ط´ط·ط©' : 'Active Job Cards & Repairs'}
          action={
            <GhostButton onClick={() => onNavigateTab('workOrders')}>
              {isRTL ? 'ط¹ط±ط¶ ط§ظ„ظƒظ„' : 'View All'} <ArrowUpRight className="w-3.5 h-3.5" />
            </GhostButton>
          }
          marginTop={0}
        >
          <DataTable
            columns={[
              { label: isRTL ? 'ط±ظ‚ظ… ط§ظ„ط£ظ…ط±' : 'Job card' },
              { label: isRTL ? 'ط§ظ„ظˆطµظپ' : 'Issue' },
              { label: isRTL ? 'ط§ظ„ط­ط§ظ„ط© ظˆط§ظ„طھظƒظ„ظپط©' : 'Status & cost', align: 'end' },
            ]}
            hasActionsColumn={false}
            isEmpty={workOrders.length === 0}
            emptyMessage={isRTL ? 'ظ„ط§ طھظˆط¬ط¯ ط£ظˆط§ظ…ط± ط¹ظ…ظ„ ط­ط§ظ„ظٹط§ظ‹.' : 'No work orders recorded.'}
          >
            {workOrders.slice(0, 4).map((wo) => (
              <DataRow
                key={wo.id}
                stripeColor={getWoStripe(wo.priority, wo.status)}
                onClick={() => onNavigateTab('workOrders')}
              >
                <td className="py-3 pe-3 whitespace-nowrap">
                  <div className="flex flex-col items-start gap-1">
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        fontSize: 12,
                        color: 'var(--color-ink)',
                      }}
                    >
                      {wo.work_order_number}
                    </span>
                    <Badge
                      variant={
                        wo.priority === 'CRITICAL' ? 'danger' : wo.priority === 'HIGH' ? 'amber' : 'info'
                      }
                      size="sm"
                    >
                      {wo.priority}
                    </Badge>
                  </div>
                </td>
                <td className="py-3 pe-3">
                  <p
                    className="line-clamp-1"
                    style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}
                  >
                    {wo.problem_description}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {isRTL
                      ? `طھط§ط±ظٹط® ط§ظ„ط¨ظ„ط§ط؛: ${new Date(wo.date_reported).toLocaleDateString('ar-SA')}`
                      : `Reported: ${new Date(wo.date_reported).toLocaleDateString()}`}
                  </p>
                </td>
                <td className="py-3 text-end whitespace-nowrap">
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={wo.status === 'RELEASED' ? 'success' : 'purple'} size="sm">
                      {wo.status.replace(/_/g, ' ')}
                    </Badge>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {wo.total_cost} {isRTL ? 'ط±.ط³' : 'SAR'}
                    </span>
                  </div>
                </td>
              </DataRow>
            ))}
          </DataTable>
        </EditorialSection>

        {/* Low Stock Inventory Warnings */}
        <EditorialSection
          title={isRTL ? 'طھظ†ط¨ظٹظ‡ ط§ظ†ط®ظپط§ط¶ ظ…ط®ط²ظˆظ† ظ‚ط·ط¹ ط§ظ„ط؛ظٹط§ط±' : 'Low Stock Spare Parts Alert'}
          action={
            <GhostButton onClick={() => onNavigateTab('inventory')}>
              {isRTL ? 'ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط®ط²ظ†' : 'Manage Store'} <ArrowUpRight className="w-3.5 h-3.5" />
            </GhostButton>
          }
          marginTop={0}
        >
          <DataTable
            columns={[
              { label: isRTL ? 'ط§ظ„ظ‚ط·ط¹ط©' : 'Part' },
              { label: isRTL ? 'ط§ظ„ظ…ظˆظ‚ط¹' : 'Rack' },
              { label: isRTL ? 'ط§ظ„ظ…ط®ط²ظˆظ†' : 'Stock level', align: 'end' },
            ]}
            hasActionsColumn={false}
            isEmpty={lowStockParts.length === 0}
            emptyMessage={
              isRTL
                ? 'ط¬ظ…ظٹط¹ ظ…ط³طھظˆظٹط§طھ ظ…ط®ط²ظˆظ† ظ‚ط·ط¹ ط§ظ„ط؛ظٹط§ط± ط£ط¹ظ„ظ‰ ظ…ظ† ط§ظ„ط­ط¯ ط§ظ„ط£ط¯ظ†ظ‰.'
                : 'All spare parts inventory levels are above minimum thresholds.'
            }
          >
            {lowStockParts.map((p) => (
              <DataRow
                key={p.id}
                stripeColor={EDITORIAL_STATUS.red.stripe}
                onClick={() => onNavigateTab('inventory')}
              >
                <td className="py-3 pe-3">
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: EDITORIAL_STATUS.red.text,
                    }}
                  >
                    {p.part_number}
                  </span>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)', marginTop: 2 }}>
                    {p.part_name}
                  </p>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <StatusText label={p.location_rack || 'â€”'} color="var(--color-text-secondary)" />
                </td>
                <td className="py-3 text-end whitespace-nowrap">
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="danger" size="sm">
                      {p.current_stock} / {isRTL ? 'ط§ظ„ط£ط¯ظ†ظ‰' : 'Min'} {p.minimum_stock} {p.unit}
                    </Badge>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {p.unit_cost} {isRTL ? 'ط±.ط³' : 'SAR'} / {p.unit}
                    </span>
                  </div>
                </td>
              </DataRow>
            ))}
          </DataTable>
        </EditorialSection>
      </div>
    </PageContainer>
  );
};
