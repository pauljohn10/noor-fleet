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
    { status: 'REPORTED', label: isRTL ? 'طھظ… ط§ظ„ط¨ظ„ط§ط؛' : 'Reported' },
    { status: 'INSPECTION', label: isRTL ? 'ظ‚ظٹط¯ ط§ظ„ظپط­طµ' : 'Inspection' },
    { status: 'ASSIGNED', label: isRTL ? 'طھظ… ط§ظ„طھظƒظ„ظٹظپ' : 'Assigned' },
    { status: 'IN_PROGRESS', label: isRTL ? 'ظ‚ظٹط¯ ط§ظ„طھظ†ظپظٹط°' : 'In Progress' },
    { status: 'WAITING_FOR_PARTS', label: isRTL ? 'ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ظ‚ط·ط¹' : 'Waiting Parts' },
    { status: 'QC_INSPECTION', label: isRTL ? 'ظپط­طµ ط§ظ„ط¬ظˆط¯ط©' : 'QC' },
    { status: 'RELEASED', label: isRTL ? 'طھظ… ط§ظ„طھط³ظ„ظٹظ…' : 'Released' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={isRTL ? 'ط¥ط¯ط§ط±ط© ط§ظ„ظˆط±ط´ط© ظˆط¹ظ…ظ„ظٹط§طھ ط§ظ„ط¥طµظ„ط§ط­' : 'Workshop Control & Repair Operations'}
        subtitle={
          isRTL
            ? 'طھظˆط¬ظٹظ‡ ط¨ط·ط§ظ‚ط§طھ ط§ظ„ط¹ظ…ظ„طŒ طھظˆط²ظٹط¹ ط§ظ„ظپظ†ظٹظٹظ†طŒ ط§ط¹طھظ…ط§ط¯ ظپط­طµ ط§ظ„ط¬ظˆط¯ط©طŒ ظˆظ…طھط§ط¨ط¹ط© ط·ط§ظ‚ط© ط§ظ„ظˆط±ط´ط©.'
            : 'Job card dispatch, mechanic assignment, QC sign-offs, and workshop bay throughput tracking.'
        }
        badge={
          <Badge variant="amber" size="sm">
            {isRTL ? 'ظ„ظˆط­ط© ظ…ط´ط±ظپ ط§ظ„ظˆط±ط´ط©' : 'Workshop Supervisor Focus'}
          </Badge>
        }
        actions={
          <>
            <SecondaryButton onClick={() => onNavigateTab('technicians')}>
              <Users className="w-4 h-4" /> {isRTL ? 'ط³ط¬ظ„ ط§ظ„ظپظ†ظٹظٹظ†' : 'Technicians Roster'}
            </SecondaryButton>
            <PrimaryButton onClick={() => setIsWOModalOpen(true)}>
              <Plus className="w-4 h-4" /> {isRTL ? 'ظپطھط­ ط¨ط·ط§ظ‚ط© ط¹ظ…ظ„' : 'Open Job Card'}
            </PrimaryButton>
          </>
        }
      />

      {/* Workshop Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <StatCard
          title={isRTL ? 'ط¨ط·ط§ظ‚ط§طھ ط§ظ„ط¹ظ…ظ„ ط§ظ„ظ…ظپطھظˆط­ط©' : 'Open job cards'}
          value={openWOs.length}
          subtitle={isRTL ? 'ط¥طµظ„ط§ط­ط§طھ ظ†ط´ط·ط©' : 'Active Repairs'}
          icon={<Wrench className="w-4 h-4" />}
          color="amber"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'ط£ط¹ظ…ط§ظ„ ط­ط±ط¬ط©' : 'Critical jobs'}
          value={criticalJobs.length}
          subtitle={isRTL ? 'ط¥طµظ„ط§ط­ط§طھ ط¹ط§ط¬ظ„ط©' : 'Urgent Fixes'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'ظ‚ظٹط¯ ط§ظ„طھظ†ظپظٹط°' : 'In progress'}
          value={inProgressJobs.length}
          subtitle={isRTL ? 'ط­ط§ط±ط§طھ ظ†ط´ط·ط©' : 'Active Bays'}
          icon={<Clock className="w-4 h-4" />}
          color="blue"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ظ‚ط·ط¹' : 'Waiting parts'}
          value={waitingPartsJobs.length}
          subtitle={isRTL ? 'ط·ظ„ط¨ط§طھ ط§ظ„ظ…ط®ط²ظ†' : 'Store Requisition'}
          icon={<Package className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'ط¨ط§ظ†طھط¸ط§ط± ظپط­طµ ط§ظ„ط¬ظˆط¯ط©' : 'QC pending'}
          value={qcPendingJobs.length}
          subtitle={isRTL ? 'ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ظپط­طµ' : 'Awaiting Inspection'}
          icon={<ShieldCheck className="w-4 h-4" />}
          color="purple"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'ظ…ظƒطھظ…ظ„ ط§ظ„ظٹظˆظ…' : 'Completed today'}
          value={completedTodayJobs.length}
          subtitle={isRTL ? 'ط§ظ„ط¥ظ†طھط§ط¬ظٹط©' : 'Throughput'}
          icon={<ShieldCheck className="w-4 h-4" />}
          color="emerald"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'ط£ط¹ظ…ط§ظ„ ظ…طھط£ط®ط±ط©' : 'Overdue jobs'}
          value={overdueJobs.length}
          subtitle={isRTL ? 'طھط£ط®ط± ط§ظ„طھط³ظ„ظٹظ…' : 'Delayed Fixes'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'ط§ظ„ط¬ط¯ظˆظ„ ط§ظ„ط²ظ…ظ†ظٹ' : 'Calendar'}
          value="8"
          subtitle={isRTL ? 'طµظٹط§ظ†ط§طھ ظ…ط¬ط¯ظˆظ„ط©' : 'Scheduled Services'}
          icon={<Calendar className="w-4 h-4" />}
          color="cyan"
          onClick={() => onNavigateTab('analytics')}
        />
      </div>

      {/* Workshop Visual Pipeline Widget */}
      <EditorialSection
        title={isRTL ? 'ط­ط§ظ„ط© ظ…ط±ط§ط­ظ„ ط®ط· ط¹ظ…ظ„ ط§ظ„ظˆط±ط´ط©' : 'Workshop Throughput Pipeline Status'}
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
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
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
          title={isRTL ? 'ط¹ط¨ط، ط§ظ„ط¹ظ…ظ„ ط¹ظ„ظ‰ ط§ظ„ظپظ†ظٹظٹظ†' : 'Technician Bay Workload'}
          action={
            <GhostButton onClick={() => onNavigateTab('technicians')}>
              {isRTL ? 'ط¹ط±ط¶ ط§ظ„ظ‚ط§ط¦ظ…ط© â†گ' : 'View Roster â†’'}
            </GhostButton>
          }
          marginTop={0}
        >
          <DataTable
            showPagination
            columns={[
              { label: isRTL ? 'ط§ظ„ظپظ†ظٹ' : 'Technician' },
              { label: isRTL ? 'ط§ظ„ظ…ظ‡ط§ظ… ط§ظ„ظ†ط´ط·ط©' : 'Workload', align: 'end' },
            ]}
            hasActionsColumn={false}
            isEmpty={technicians.length === 0}
            emptyMessage={isRTL ? 'ظ„ط§ ظٹظˆط¬ط¯ ظپظ†ظٹظˆظ† ظ…ط³ط¬ظ„ظˆظ†.' : 'No technicians registered.'}
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
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {tech.specialization}
                    </p>
                  </td>
                  <td className="py-3 text-end whitespace-nowrap">
                    <Badge variant={activeCount > 0 ? 'amber' : 'slate'} size="sm">
                      {isRTL ? `${activeCount} ظ…ظ‡ط§ظ… ظ†ط´ط·ط©` : `${activeCount} Active Jobs`}
                    </Badge>
                  </td>
                </DataRow>
              );
            })}
          </DataTable>
        </EditorialSection>

        {/* Critical Repairs List */}
        <EditorialSection
          title={isRTL ? 'ط£ظˆط§ظ…ط± ط§ظ„ط¥طµظ„ط§ط­ ط§ظ„ط­ط±ط¬ط© ظˆط§ظ„ط¹ط§ط¬ظ„ط©' : 'Urgent Critical Repair Orders'}
          action={
            <GhostButton onClick={() => onNavigateTab('workOrders')}>
              {isRTL ? 'ط¹ط±ط¶ ط§ظ„ط¨ط·ط§ظ‚ط§طھ â†گ' : 'View Job Cards â†’'}
            </GhostButton>
          }
          marginTop={0}
        >
          <DataTable
            showPagination
            columns={[
              { label: isRTL ? 'ط§ظ„ط£ظ…ط± ظˆط§ظ„ظ…ط±ظƒط¨ط©' : 'Order & vehicle' },
              { label: isRTL ? 'ط§ظ„ط­ط§ظ„ط©' : 'Status', align: 'end' },
            ]}
            hasActionsColumn={false}
            isEmpty={criticalJobs.length === 0}
            emptyMessage={
              isRTL
                ? 'ظ„ط§ طھظˆط¬ط¯ ط¥طµظ„ط§ط­ط§طھ ط·ط§ط±ط¦ط© ط­ط±ط¬ط© ظ…ط¹ظ„ظ‚ط© ط­ط§ظ„ظٹط§ظ‹.'
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
