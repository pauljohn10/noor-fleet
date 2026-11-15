import React from 'react';
import {
  Truck,
  Wrench,
  DollarSign,
  CalendarCheck,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { useFleet, DateFilterOption } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { StatCard } from '../common/StatCard';
import { DashboardCharts } from '../dashboard/DashboardCharts';
import {
  PageContainer,
  PageHeader,
  StatusTabs,
  EDITORIAL_STATUS,
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
    dateFilter,
    setDateFilter,
  } = useFleet();
  const { isRTL } = useI18n();

  const totalTrucks = vehicles.filter(v => v.vehicle_type === 'TRACTOR_HEAD' || v.vehicle_type === 'OTHER').length;
  const totalTrailers = trailers.length;
  const availableCount = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const onTripCount = vehicles.filter(v => v.status === 'ON_TRIP').length;
  const inWorkshopCount = vehicles.filter(v => v.status === 'IN_WORKSHOP').length;
  const outOfServiceCount = vehicles.filter(v => v.status === 'OUT_OF_SERVICE').length;

  const maintenanceDueCount = schedules.filter(
    s => s.status === 'DUE' || s.status === 'OVERDUE' || s.status === 'DUE_SOON'
  ).length;
  const openWOsCount = workOrders.filter(
    w => w.status !== 'RELEASED' && w.status !== 'CANCELLED' && w.status !== 'COMPLETED'
  ).length;

  const totalMonthlyMaintCost = workOrders.reduce((sum, w) => sum + (w.total_cost || 0), 0);
  const totalMonthlyPartsCost = workOrders.reduce((sum, w) => sum + (w.parts_cost || 0), 0);

  const dateFilterOptions: { key: DateFilterOption; label: string }[] = [
    { key: 'TODAY', label: isRTL ? 'اليوم' : 'Today' },
    { key: 'WEEK', label: isRTL ? 'هذا الأسبوع' : 'This Week' },
    { key: 'MONTH', label: isRTL ? 'هذا الشهر' : 'This Month' },
    { key: 'YEAR', label: isRTL ? 'هذه السنة' : 'This Year' },
    { key: 'ALL', label: isRTL ? 'كل الأوقات' : 'All Time' },
    { key: 'CUSTOM', label: isRTL ? 'فترة مخصصة' : 'Custom Range' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={isRTL ? 'لوحة الإدارة التنفيذية والتكاليف' : 'Executive Management Dashboard'}
        subtitle={
          isRTL
            ? 'مؤشرات الأداء المالي التنفيذي، جاهزية الأسطول، وتكرار الأعطال وتحليل تكاليف الصيانة.'
            : 'High-level executive financial metrics, fleet availability, breakdown frequencies, and maintenance cost analysis.'
        }
        badge={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
              background: '#EFF6FF',
              color: '#1E40AF',
              border: '1px solid #BFDBFE',
            }}
          >
            <BarChart3 style={{ width: 13, height: 13 }} />
            {isRTL ? 'نظرة تنفيذية للقراءة فقط' : 'Executive Read-Only Overview'}
          </span>
        }
      />

      <StatusTabs
        tabs={dateFilterOptions.map(opt => ({
          key: opt.key,
          label: opt.label,
        }))}
        activeKey={dateFilter}
        onChange={key => setDateFilter(key as DateFilterOption)}
      />

      {/* Management Executive KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5 mb-7">
        <StatCard
          title={isRTL ? 'إجمالي الشاحنات' : 'TOTAL TRUCKS'}
          value={totalTrucks}
          subtitle={isRTL ? 'وحدات الجر' : 'Tractor Units'}
          icon={<Truck style={{ width: 15, height: 15, color: EDITORIAL_STATUS.amber.text }} />}
          color="amber"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'إجمالي المقطورات' : 'TOTAL TRAILERS'}
          value={totalTrailers}
          subtitle={isRTL ? 'الصهاريج والمقطورات' : 'Semi-Trailers'}
          icon={<Truck style={{ width: 15, height: 15, color: EDITORIAL_STATUS.blue.text }} />}
          color="cyan"
          onClick={() => onNavigateTab('trailers')}
        />
        <StatCard
          title={isRTL ? 'متاح للخدمة' : 'AVAILABLE'}
          value={availableCount}
          subtitle={isRTL ? 'جاهزة للرحلات' : 'Ready for Trip'}
          icon={<Truck style={{ width: 15, height: 15, color: EDITORIAL_STATUS.green.text }} />}
          color="emerald"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'في رحلة' : 'ON TRIP'}
          value={onTripCount}
          subtitle={isRTL ? 'قيد التشغيل والنقل' : 'Active Hauling'}
          icon={<Truck style={{ width: 15, height: 15, color: EDITORIAL_STATUS.blue.text }} />}
          color="blue"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'في الورشة' : 'IN WORKSHOP'}
          value={inWorkshopCount}
          subtitle={isRTL ? 'تحت الصيانة' : 'Downtime'}
          icon={<Wrench style={{ width: 15, height: 15, color: EDITORIAL_STATUS.amber.text }} />}
          color="amber"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'خارج الخدمة' : 'OUT OF SERVICE'}
          value={outOfServiceCount}
          subtitle={isRTL ? 'متوقفة' : 'Grounded'}
          icon={<AlertTriangle style={{ width: 15, height: 15, color: EDITORIAL_STATUS.red.text }} />}
          color="rose"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'بطاقات العمل المفتوحة' : 'OPEN JOB CARDS'}
          value={openWOsCount}
          subtitle={isRTL ? 'إصلاحات جارية' : 'Active Repairs'}
          icon={<Wrench style={{ width: 15, height: 15, color: EDITORIAL_STATUS.blue.text }} />}
          color="blue"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'التكلفة الشهرية' : 'MONTHLY COST'}
          value={`${(totalMonthlyMaintCost || 0).toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`}
          subtitle={isRTL ? 'إجمالي الصيانة' : 'Total Maintenance'}
          icon={<DollarSign style={{ width: 15, height: 15, color: EDITORIAL_STATUS.green.text }} />}
          color="emerald"
          onClick={() => onNavigateTab('analytics')}
        />
        <StatCard
          title={isRTL ? 'تكلفة قطع الغيار' : 'PARTS COST'}
          value={`${(totalMonthlyPartsCost || 0).toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`}
          subtitle={isRTL ? 'قطع الغيار' : 'Spare Parts'}
          icon={<DollarSign style={{ width: 15, height: 15, color: EDITORIAL_STATUS.amber.text }} />}
          color="amber"
          onClick={() => onNavigateTab('analytics')}
        />
        <StatCard
          title={isRTL ? 'صيانة وقائية مستحقة' : 'MAINTENANCE DUE'}
          value={maintenanceDueCount}
          subtitle={isRTL ? 'مستحقة أو متأخرة' : 'PM Overdue/Due'}
          icon={<CalendarCheck style={{ width: 15, height: 15, color: '#5B21B6' }} />}
          color="purple"
          onClick={() => onNavigateTab('preventive')}
        />
      </div>

      {/* Executive Recharts Graphics */}
      <DashboardCharts
        vehicles={vehicles}
        trailers={trailers}
        workOrders={workOrders}
        parts={parts}
        schedules={schedules}
      />
    </PageContainer>
  );
};
