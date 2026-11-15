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
    { key: 'TODAY', label: isRTL ? 'اليوم' : 'Today' },
    { key: 'WEEK', label: isRTL ? 'هذا الأسبوع' : 'This Week' },
    { key: 'MONTH', label: isRTL ? 'هذا الشهر' : 'This Month' },
    { key: 'YEAR', label: isRTL ? 'هذه السنة' : 'This Year' },
    { key: 'ALL', label: isRTL ? 'كل الأوقات' : 'All Time' },
    { key: 'CUSTOM', label: isRTL ? 'فترة مخصصة' : 'Custom Range' },
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
        title={isRTL ? 'لوحة الإدارة التنفيذية للأسطول والورشة' : 'Executive Fleet & Workshop Dashboard'}
        subtitle={
          isRTL
            ? 'التتبع المباشر، أوامر العمل، تنبيهات المخزون، ومؤشرات صيانة صهاريج الوقود.'
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
              <span style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'إلى' : 'to'}</span>
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
          title={isRTL ? 'إجمالي الشاحنات' : 'Total trucks'}
          value={totalTrucks}
          subtitle={isRTL ? 'رؤوس الشاحنات' : 'Tractor Heads'}
          icon={<Truck className="w-4 h-4" />}
          color="amber"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'إجمالي المقطورات' : 'Total trailers'}
          value={totalTrailers}
          subtitle={isRTL ? 'وحدات الصهاريج' : 'Tanker Units'}
          icon={<Truck className="w-4 h-4" />}
          color="cyan"
          onClick={() => onNavigateTab('trailers')}
        />
        <StatCard
          title={isRTL ? 'متاح للخدمة' : 'Available'}
          value={availableCount}
          subtitle={isRTL ? 'جاهزة للرحلة' : 'Ready for Trip'}
          icon={<Truck className="w-4 h-4" />}
          color="emerald"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'في رحلة' : 'On trip'}
          value={onTripCount}
          subtitle={isRTL ? 'توصيل نشط' : 'Active Delivery'}
          icon={<Truck className="w-4 h-4" />}
          color="blue"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'في الورشة' : 'In workshop'}
          value={inWorkshopCount}
          subtitle={isRTL ? 'تحت الصيانة' : 'Under Maintenance'}
          icon={<Wrench className="w-4 h-4" />}
          color="amber"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'خارج الخدمة' : 'Out of service'}
          value={outOfServiceCount}
          subtitle={isRTL ? 'وحدات متوقفة' : 'Grounded Units'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'صيانة مستحقة' : 'Maintenance due'}
          value={maintenanceDueCount}
          subtitle={isRTL ? 'مستحقة / متأخرة' : 'PM Overdue/Due'}
          icon={<CalendarCheck className="w-4 h-4" />}
          color="purple"
          onClick={() => onNavigateTab('preventive')}
        />
        <StatCard
          title={isRTL ? 'وثائق تنتهي قريباً' : 'Docs expiring'}
          value={docsExpiringCount}
          subtitle={isRTL ? '≤ 30 يوم للانتهاء' : '≤ 30 Days Expiry'}
          icon={<FileText className="w-4 h-4" />}
          color="amber"
          onClick={() => onNavigateTab('documents')}
        />
        <StatCard
          title={isRTL ? 'أوامر عمل مفتوحة' : 'Open job cards'}
          value={openWOsCount}
          subtitle={isRTL ? 'أوامر عمل نشطة' : 'Active Work Orders'}
          icon={<Wrench className="w-4 h-4" />}
          color="blue"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'أعمال متأخرة' : 'Overdue jobs'}
          value={overdueWOsCount}
          subtitle={isRTL ? 'تجاوزت الموعد' : 'Passed Completion'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'قطع منخفضة المخزون' : 'Low stock parts'}
          value={lowStockCount}
          subtitle={isRTL ? 'أقل من الحد الأدنى' : 'Below Min Threshold'}
          icon={<Package className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title={isRTL ? 'التكلفة الشهرية' : 'Monthly cost'}
          value={`${(totalMonthlyMaintCost || 0).toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`}
          subtitle={isRTL ? 'إجمالي الصيانة' : 'Total Maintenance'}
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
          title={isRTL ? 'بطاقات العمل والإصلاحات النشطة' : 'Active Job Cards & Repairs'}
          action={
            <GhostButton onClick={() => onNavigateTab('workOrders')}>
              {isRTL ? 'عرض الكل' : 'View All'} <ArrowUpRight className="w-3.5 h-3.5" />
            </GhostButton>
          }
          marginTop={0}
        >
          <DataTable
            columns={[
              { label: isRTL ? 'رقم الأمر' : 'Job card' },
              { label: isRTL ? 'الوصف' : 'Issue' },
              { label: isRTL ? 'الحالة والتكلفة' : 'Status & cost', align: 'end' },
            ]}
            hasActionsColumn={false}
            isEmpty={workOrders.length === 0}
            emptyMessage={isRTL ? 'لا توجد أوامر عمل حالياً.' : 'No work orders recorded.'}
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
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {isRTL
                      ? `تاريخ البلاغ: ${new Date(wo.date_reported).toLocaleDateString('ar-SA')}`
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
                      {wo.total_cost} {isRTL ? 'ر.س' : 'SAR'}
                    </span>
                  </div>
                </td>
              </DataRow>
            ))}
          </DataTable>
        </EditorialSection>

        {/* Low Stock Inventory Warnings */}
        <EditorialSection
          title={isRTL ? 'تنبيه انخفاض مخزون قطع الغيار' : 'Low Stock Spare Parts Alert'}
          action={
            <GhostButton onClick={() => onNavigateTab('inventory')}>
              {isRTL ? 'إدارة المخزن' : 'Manage Store'} <ArrowUpRight className="w-3.5 h-3.5" />
            </GhostButton>
          }
          marginTop={0}
        >
          <DataTable
            columns={[
              { label: isRTL ? 'القطعة' : 'Part' },
              { label: isRTL ? 'الموقع' : 'Rack' },
              { label: isRTL ? 'المخزون' : 'Stock level', align: 'end' },
            ]}
            hasActionsColumn={false}
            isEmpty={lowStockParts.length === 0}
            emptyMessage={
              isRTL
                ? 'جميع مستويات مخزون قطع الغيار أعلى من الحد الأدنى.'
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
                  <StatusText label={p.location_rack || '—'} color="var(--color-text-secondary)" />
                </td>
                <td className="py-3 text-end whitespace-nowrap">
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="danger" size="sm">
                      {p.current_stock} / {isRTL ? 'الأدنى' : 'Min'} {p.minimum_stock} {p.unit}
                    </Badge>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {p.unit_cost} {isRTL ? 'ر.س' : 'SAR'} / {p.unit}
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
