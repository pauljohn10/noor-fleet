import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Vehicle, Trailer, WorkOrder, Part, MaintenanceSchedule } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { EDITORIAL_STATUS } from '../common/EditorialUI';

interface DashboardChartsProps {
  vehicles: Vehicle[];
  trailers: Trailer[];
  workOrders: WorkOrder[];
  parts: Part[];
  schedules: MaintenanceSchedule[];
}

const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#FFFDF8',
  borderColor: '#D9D4C8',
  color: '#161513',
  borderRadius: '4px',
  fontSize: '12px',
  boxShadow: 'none',
};

const CHART_CARD_STYLE: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  padding: 20,
};

const CHART_TITLE_STYLE: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-ink)',
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  vehicles,
  workOrders,
}) => {
  const { isRTL, t } = useI18n();

  const availableCount = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const onTripCount = vehicles.filter(v => v.status === 'ON_TRIP').length;
  const inWorkshopCount = vehicles.filter(v => v.status === 'IN_WORKSHOP').length;
  const outOfServiceCount = vehicles.filter(v => v.status === 'OUT_OF_SERVICE').length;
  const totalFleetCount = vehicles.length;

  const fleetStatusData = [
    { name: isRTL ? 'متاح' : 'Available', value: availableCount, color: EDITORIAL_STATUS.green.stripe },
    { name: isRTL ? 'في رحلة' : 'On Trip', value: onTripCount, color: EDITORIAL_STATUS.blue.stripe },
    { name: isRTL ? 'في الورشة' : 'In Workshop', value: inWorkshopCount, color: EDITORIAL_STATUS.amber.stripe },
    { name: isRTL ? 'خارج الخدمة' : 'Out of Service', value: outOfServiceCount, color: EDITORIAL_STATUS.red.stripe },
  ].filter(item => item.value > 0);

  const woStatusCounts: Record<string, number> = {};
  workOrders.forEach(w => {
    woStatusCounts[w.status] = (woStatusCounts[w.status] || 0) + 1;
  });

  const woJobStatusData = Object.keys(woStatusCounts).map(status => ({
    status: t(status, status.replace(/_/g, ' ')),
    count: woStatusCounts[status],
  }));

  const monthlyCostMap = new Map<string, { parts: number; labor: number; external: number }>();
  workOrders.forEach(w => {
    const rawDate = w.date_reported || w.created_at;
    const date = rawDate ? new Date(rawDate) : new Date();
    const key = date.toLocaleString(isRTL ? 'ar-SA' : 'default', { month: 'short', year: 'numeric' });
    const existing = monthlyCostMap.get(key) || { parts: 0, labor: 0, external: 0 };
    existing.parts += Number(w.parts_cost) || 0;
    existing.labor += Number(w.labor_cost) || 0;
    existing.external += Number(w.external_service_cost) || 0;
    monthlyCostMap.set(key, existing);
  });

  const monthlyCostData = Array.from(monthlyCostMap.entries()).map(([month, data]) => ({
    month,
    parts: data.parts,
    labor: data.labor,
    external: data.external,
  }));

  const costByVehicle = vehicles
    .map(v => {
      const vWOs = workOrders.filter(w => w.vehicle_id === v.id);
      const totalCost = vWOs.reduce((acc, w) => acc + (Number(w.total_cost) || 0), 0);
      return {
        vehicleId: v.vehicle_id,
        plate: v.plate_number,
        cost: totalCost,
      };
    })
    .filter(item => item.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* 1. Fleet Status Overview */}
      <div style={CHART_CARD_STYLE}>
        <h4 style={CHART_TITLE_STYLE}>
          {isRTL ? 'حالة الأسطول التشغيلية' : 'Fleet Operational Status'}
        </h4>
        <div className="h-64 w-full flex items-center justify-center">
          {totalFleetCount === 0 || fleetStatusData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12.5 }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'لا توجد مركبات نشطة في الأسطول' : 'No active vehicles in fleet'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11.5 }}>
                {isRTL ? 'أضف مركبات لعرض توزيع الحالات المباشر' : 'Add vehicles to view live status distribution'}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {fleetStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend verticalAlign="bottom" height={36} iconType="square" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Monthly Maintenance Cost Breakdown */}
      <div style={CHART_CARD_STYLE} className="lg:col-span-2">
        <h4 style={CHART_TITLE_STYLE}>
          {isRTL ? 'اتجاه مصروفات الصيانة الشهرية (ر.س)' : 'Monthly Maintenance Expense Trend (SAR)'}
        </h4>
        <div className="h-64 w-full flex items-center justify-center">
          {monthlyCostData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12.5 }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'لم تُسجل مصروفات صيانة بعد' : 'No maintenance expenditure recorded'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11.5 }}>
                {isRTL ? 'ستظهر المصروفات تلقائياً عند إكمال أوامر العمل' : 'Expenses will plot dynamically as work orders are completed'}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyCostData}>
                <XAxis dataKey="month" stroke="#6B665C" fontSize={12} />
                <YAxis stroke="#6B665C" fontSize={12} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend />
                <Area type="monotone" dataKey="parts" stackId="1" stroke="#B45309" fill="#B45309" fillOpacity={0.32} name={isRTL ? 'تكلفة قطع الغيار' : 'Parts Cost'} />
                <Area type="monotone" dataKey="labor" stackId="1" stroke="#1E40AF" fill="#1E40AF" fillOpacity={0.32} name={isRTL ? 'تكلفة العمالة' : 'Labor Cost'} />
                <Area type="monotone" dataKey="external" stackId="1" stroke="#0F5C4D" fill="#0F5C4D" fillOpacity={0.32} name={isRTL ? 'أعمال خارجية' : 'External Service'} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Workshop Work Order Pipeline */}
      <div style={CHART_CARD_STYLE} className="lg:col-span-2">
        <h4 style={CHART_TITLE_STYLE}>
          {isRTL ? 'مراحل خط عمل الورشة' : 'Workshop Work Order Pipeline'}
        </h4>
        <div className="h-64 w-full flex items-center justify-center">
          {woJobStatusData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12.5 }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'لا توجد بطاقات عمل نشطة في الورشة' : 'No active job cards in workshop'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11.5 }}>
                {isRTL ? 'ستظهر أوامر العمل المفتوحة مصنفة حسب المرحلة هنا' : 'Open work orders will be categorized by stage here'}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={woJobStatusData}>
                <XAxis dataKey="status" stroke="#6B665C" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#6B665C" fontSize={12} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#0F5C4D" radius={[3, 3, 0, 0]} name={isRTL ? 'الأعمال النشطة' : 'Active Jobs'} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. Maintenance Cost by Vehicle */}
      <div style={CHART_CARD_STYLE}>
        <h4 style={CHART_TITLE_STYLE}>
          {isRTL ? 'الشاحنات الأعلى تكلفة في الإصلاح (ر.س)' : 'Highest Repair Cost Vehicles (SAR)'}
        </h4>
        <div className="h-64 w-full flex items-center justify-center">
          {costByVehicle.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12.5 }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'لا توجد بيانات تكاليف إصلاح بعد' : 'No repair cost data yet'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11.5 }}>
                {isRTL ? 'سيتم ترتيب المركبات الأعلى تكلفة تلقائياً' : 'Costs will rank highest-maintenance vehicles'}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costByVehicle} layout="vertical">
                <XAxis type="number" stroke="#6B665C" fontSize={10} />
                <YAxis dataKey="vehicleId" type="category" stroke="#6B665C" fontSize={12} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="cost" fill="#991B1B" radius={[0, 3, 3, 0]} name={isRTL ? 'إجمالي التكلفة (ر.س)' : 'Total Cost (SAR)'} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
