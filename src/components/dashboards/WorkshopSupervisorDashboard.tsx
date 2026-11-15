import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Users,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Package,
  Calendar,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { JobCardFormModal } from '../workOrders/JobCardFormModal';
import { WOStatus } from '../../types';
import {
  EDITORIAL_STATUS,
  PageContainer,
  PageHeader,
  EditorialSection,
  DataTable,
  DataRow,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
} from '../common/EditorialUI';

interface WorkshopSupervisorDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const WorkshopSupervisorDashboard: React.FC<WorkshopSupervisorDashboardProps> = ({
  onNavigateTab,
}) => {
  const { workOrders, technicians, vehicles } = useFleet();
  const { isRTL } = useI18n();
  const [isWOModalOpen, setIsWOModalOpen] = useState(false);

  const openWOs = workOrders.filter((w) => w.status !== 'RELEASED' && w.status !== 'CANCELLED');
  const criticalJobs = workOrders.filter((w) => w.priority === 'CRITICAL' && w.status !== 'RELEASED');
  const inProgressJobs = workOrders.filter((w) => w.status === 'IN_PROGRESS');
  const waitingPartsJobs = workOrders.filter((w) => w.status === 'WAITING_FOR_PARTS');
  const qcPendingJobs = workOrders.filter((w) => w.status === 'QC_INSPECTION');
  const completedTodayJobs = workOrders.filter(
    (w) => w.status === 'COMPLETED' || w.status === 'RELEASED'
  );

  const today = new Date();
  const overdueJobs = workOrders.filter((w) => {
    if (!w.estimated_completion) return false;
    return (
      new Date(w.estimated_completion) < today && w.status !== 'RELEASED' && w.status !== 'COMPLETED'
    );
  });

  const pipelineStages: { status: WOStatus; label: string }[] = [
    { status: 'REPORTED', label: isRTL ? 'تم البلاغ' : 'Reported' },
    { status: 'INSPECTION', label: isRTL ? 'قيد الفحص' : 'Inspection' },
    { status: 'ASSIGNED', label: isRTL ? 'تم التكليف' : 'Assigned' },
    { status: 'IN_PROGRESS', label: isRTL ? 'قيد التنفيذ' : 'In Progress' },
    { status: 'WAITING_FOR_PARTS', label: isRTL ? 'بانتظار القطع' : 'Waiting Parts' },
    { status: 'QC_INSPECTION', label: isRTL ? 'فحص الجودة' : 'QC' },
    { status: 'RELEASED', label: isRTL ? 'تم التسليم' : 'Released' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={isRTL ? 'إدارة الورشة وعمليات الإصلاح' : 'Workshop Control & Repair Operations'}
        subtitle={
          isRTL
            ? 'توجيه بطاقات العمل، توزيع الفنيين، اعتماد فحص الجودة، ومتابعة طاقة الورشة.'
            : 'Job card dispatch, mechanic assignment, QC sign-offs, and workshop bay throughput tracking.'
        }
        badge={
          <Badge variant="amber" size="sm">
            {isRTL ? 'لوحة مشرف الورشة' : 'Workshop Supervisor Focus'}
          </Badge>
        }
        actions={
          <>
            <SecondaryButton onClick={() => onNavigateTab('technicians')}>
              <Users className="w-4 h-4" /> {isRTL ? 'سجل الفنيين' : 'Technicians Roster'}
            </SecondaryButton>
            <PrimaryButton onClick={() => setIsWOModalOpen(true)}>
              <Plus className="w-4 h-4" /> {isRTL ? 'فتح بطاقة عمل' : 'Open Job Card'}
            </PrimaryButton>
          </>
        }
      />

      {/* Workshop Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <StatCard
          title={isRTL ? 'بطاقات العمل المفتوحة' : 'Open job cards'}
          value={openWOs.length}
          subtitle={isRTL ? 'إصلاحات نشطة' : 'Active Repairs'}
          icon={<Wrench className="w-4 h-4" />}
          color="amber"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'أعمال حرجة' : 'Critical jobs'}
          value={criticalJobs.length}
          subtitle={isRTL ? 'إصلاحات عاجلة' : 'Urgent Fixes'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'قيد التنفيذ' : 'In progress'}
          value={inProgressJobs.length}
          subtitle={isRTL ? 'حارات نشطة' : 'Active Bays'}
          icon={<Clock className="w-4 h-4" />}
          color="blue"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'بانتظار القطع' : 'Waiting parts'}
          value={waitingPartsJobs.length}
          subtitle={isRTL ? 'طلبات المخزن' : 'Store Requisition'}
          icon={<Package className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'بانتظار فحص الجودة' : 'QC pending'}
          value={qcPendingJobs.length}
          subtitle={isRTL ? 'بانتظار الفحص' : 'Awaiting Inspection'}
          icon={<ShieldCheck className="w-4 h-4" />}
          color="purple"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'مكتمل اليوم' : 'Completed today'}
          value={completedTodayJobs.length}
          subtitle={isRTL ? 'الإنتاجية' : 'Throughput'}
          icon={<ShieldCheck className="w-4 h-4" />}
          color="emerald"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'أعمال متأخرة' : 'Overdue jobs'}
          value={overdueJobs.length}
          subtitle={isRTL ? 'تأخر التسليم' : 'Delayed Fixes'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'الجدول الزمني' : 'Calendar'}
          value="8"
          subtitle={isRTL ? 'صيانات مجدولة' : 'Scheduled Services'}
          icon={<Calendar className="w-4 h-4" />}
          color="cyan"
          onClick={() => onNavigateTab('analytics')}
        />
      </div>

      {/* Workshop Visual Pipeline Widget */}
      <EditorialSection
        title={isRTL ? 'حالة مراحل خط عمل الورشة' : 'Workshop Throughput Pipeline Status'}
        marginTop={0}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {pipelineStages.map((stage) => {
            const count = workOrders.filter((w) => w.status === stage.status).length;
            const stripe =
              stage.status === 'RELEASED'
                ? EDITORIAL_STATUS.green.stripe
                : stage.status === 'WAITING_FOR_PARTS'
                ? EDITORIAL_STATUS.amber.stripe
                : EDITORIAL_STATUS.blue.stripe;
            return (
              <div
                key={stage.status}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderTop: `2px solid ${stripe}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: 12,
                }}
                className="text-center"
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  {stage.label}
                </span>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                    marginTop: 4,
                  }}
                >
                  {count}
                </p>
              </div>
            );
          })}
        </div>
      </EditorialSection>

      {/* Technician Workload & Critical Repairs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technician Workload */}
        <EditorialSection
          title={isRTL ? 'عبء العمل على الفنيين' : 'Technician Bay Workload'}
          action={
            <GhostButton onClick={() => onNavigateTab('technicians')}>
              {isRTL ? 'عرض القائمة ←' : 'View Roster →'}
            </GhostButton>
          }
          marginTop={0}
        >
          <DataTable
            columns={[
              { label: isRTL ? 'الفني' : 'Technician' },
              { label: isRTL ? 'المهام النشطة' : 'Workload', align: 'end' },
            ]}
            hasActionsColumn={false}
            isEmpty={technicians.length === 0}
            emptyMessage={isRTL ? 'لا يوجد فنيون مسجلون.' : 'No technicians registered.'}
          >
            {technicians.map((tech) => {
              const activeCount = workOrders.filter(
                (w) => w.assigned_technician_id === tech.id && w.status !== 'RELEASED'
              ).length;
              return (
                <DataRow
                  key={tech.id}
                  stripeColor={
                    activeCount > 0 ? EDITORIAL_STATUS.amber.stripe : EDITORIAL_STATUS.green.stripe
                  }
                  onClick={() => onNavigateTab('technicians')}
                >
                  <td className="py-3 pe-3">
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                      {tech.full_name}
                    </span>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {tech.specialization}
                    </p>
                  </td>
                  <td className="py-3 text-end whitespace-nowrap">
                    <Badge variant={activeCount > 0 ? 'amber' : 'slate'} size="sm">
                      {isRTL ? `${activeCount} مهام نشطة` : `${activeCount} Active Jobs`}
                    </Badge>
                  </td>
                </DataRow>
              );
            })}
          </DataTable>
        </EditorialSection>

        {/* Critical Repairs List */}
        <EditorialSection
          title={isRTL ? 'أوامر الإصلاح الحرجة والعاجلة' : 'Urgent Critical Repair Orders'}
          action={
            <GhostButton onClick={() => onNavigateTab('workOrders')}>
              {isRTL ? 'عرض البطاقات ←' : 'View Job Cards →'}
            </GhostButton>
          }
          marginTop={0}
        >
          <DataTable
            columns={[
              { label: isRTL ? 'الأمر والمركبة' : 'Order & vehicle' },
              { label: isRTL ? 'الحالة' : 'Status', align: 'end' },
            ]}
            hasActionsColumn={false}
            isEmpty={criticalJobs.length === 0}
            emptyMessage={
              isRTL
                ? 'لا توجد إصلاحات طارئة حرجة معلقة حالياً.'
                : 'No critical emergency repairs currently pending.'
            }
          >
            {criticalJobs.map((w) => {
              const veh = vehicles.find((v) => v.id === w.vehicle_id);
              return (
                <DataRow
                  key={w.id}
                  stripeColor={EDITORIAL_STATUS.red.stripe}
                  onClick={() => onNavigateTab('workOrders')}
                >
                  <td className="py-3 pe-3">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: 12,
                          color: EDITORIAL_STATUS.red.text,
                        }}
                      >
                        {w.work_order_number}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                        {veh?.vehicle_id}
                      </span>
                    </div>
                    <p
                      className="line-clamp-1"
                      style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}
                    >
                      {w.problem_description}
                    </p>
                  </td>
                  <td className="py-3 text-end whitespace-nowrap">
                    <Badge variant="purple" size="sm">
                      {w.status}
                    </Badge>
                  </td>
                </DataRow>
              );
            })}
          </DataTable>
        </EditorialSection>
      </div>

      <JobCardFormModal isOpen={isWOModalOpen} onClose={() => setIsWOModalOpen(false)} />
    </PageContainer>
  );
};
