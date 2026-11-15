import React, { useState } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle2,
  Package,
  Play,
  Pause,
  ChevronRight,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { Drawer } from '../common/Drawer';
import { WorkOrder } from '../../types';
import {
  EDITORIAL_STATUS,
  PageContainer,
  PageHeader,
  EditorialSection,
  DataTable,
  DataRow,
  RowAction,
  PlateChip,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface MechanicDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const MechanicDashboard: React.FC<MechanicDashboardProps> = ({ onNavigateTab: _onNavigateTab }) => {
  const { workOrders, vehicles, trailers, parts, updateWorkOrderStatus, addWorkOrderPart, addWorkOrderLabor } =
    useFleet();
  const { currentProfile } = useAuth();
  const { isRTL } = useI18n();

  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  // Local workbench state
  const [diagnosisText, setDiagnosisText] = useState('');
  const [_repairText, setRepairText] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [laborHours, setLaborHours] = useState(2);

  // Filter jobs for active mechanic
  const myAssignedJobs = workOrders.filter(
    (w) =>
      w.assigned_technician_id === 't1111111-1111-1111-1111-111111111111' ||
      w.assigned_technician_id === currentProfile.id ||
      w.status === 'IN_PROGRESS' ||
      w.status === 'ASSIGNED'
  );

  const myOpenJobs = myAssignedJobs.filter((w) => w.status !== 'RELEASED' && w.status !== 'CANCELLED');
  const inProgressJobs = myAssignedJobs.filter((w) => w.status === 'IN_PROGRESS');
  const waitingPartsJobs = myAssignedJobs.filter((w) => w.status === 'WAITING_FOR_PARTS');
  const completedTodayJobs = myAssignedJobs.filter((w) => w.status === 'COMPLETED' || w.status === 'RELEASED');

  const handleStartJob = (woId: string) => {
    updateWorkOrderStatus(woId, 'IN_PROGRESS', 'Repair started by mechanic', currentProfile.full_name);
  };

  const handlePauseJob = (woId: string) => {
    updateWorkOrderStatus(woId, 'WAITING_FOR_PARTS', 'Paused waiting for store parts', currentProfile.full_name);
  };

  const handleCompleteJob = (woId: string) => {
    updateWorkOrderStatus(woId, 'REPAIR_COMPLETED', 'Repair completed by mechanic, awaiting QC', currentProfile.full_name);
    setSelectedWO(null);
    alert('Work order marked as REPAIR COMPLETED! Sent to QC Supervisor.');
  };

  const handleIssuePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO || !selectedPartId) return;
    addWorkOrderPart(selectedWO.id, selectedPartId, partQty, currentProfile.full_name);
    alert('Spare part requested and deducted from store inventory.');
    setSelectedPartId('');
  };

  const handleLogLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO) return;
    addWorkOrderLabor(selectedWO.id, 't1111111-1111-1111-1111-111111111111', laborHours, 'Labor hours logged by mechanic');
    alert('Labor hours logged successfully!');
  };

  const openWorkbench = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setDiagnosisText(wo.diagnosis_notes || '');
    setRepairText(wo.repair_summary || '');
  };

  return (
    <PageContainer>
      <PageHeader
        title={isRTL ? `طµط¨ط§ط­ ط§ظ„ط®ظٹط±طŒ ${currentProfile.full_name}` : `Good Morning, ${currentProfile.full_name}`}
        subtitle={
          isRTL
            ? 'ظ…ظ†طµط© ط¹ظ…ظ„ ظپظ†ظٹ ط§ظ„ط´ط§ط­ظ†ط§طھ ط§ظ„ط«ظ‚ظٹظ„ط© ظˆط§ظ„طµظ‡ط§ط±ظٹط¬'
            : 'Heavy Diesel & Tanker Mechanic Workbench'
        }
        badge={
          <Badge variant="info" size="sm">
            {isRTL ? 'ظ…ظ†طµط© ط§ظ„ظپظ†ظٹ' : 'Workbench'}
          </Badge>
        }
      />

      {/* Mechanic KPIs - Simple & Mobile Focused */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          title={isRTL ? 'ط£ط¹ظ…ط§ظ„ظٹ ط§ظ„ظ…ظپطھظˆط­ط©' : 'My open jobs'}
          value={myOpenJobs.length}
          subtitle={isRTL ? 'ظ…ط³ظ†ط¯ط© ظ„ظٹ' : 'Assigned to Me'}
          icon={<Wrench className="w-4 h-4" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'ظ‚ظٹط¯ ط§ظ„طھظ†ظپظٹط°' : 'In progress'}
          value={inProgressJobs.length}
          subtitle={isRTL ? 'ط­ط§ط±ط© ظ†ط´ط·ط©' : 'Active Bay'}
          icon={<Clock className="w-4 h-4" />}
          color="blue"
        />
        <StatCard
          title={isRTL ? 'ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ظ‚ط·ط¹' : 'Waiting parts'}
          value={waitingPartsJobs.length}
          subtitle={isRTL ? 'ط·ظ„ط¨ ظ…ط®ط²ظ†' : 'Store Request'}
          icon={<Package className="w-4 h-4" />}
          color="rose"
        />
        <StatCard
          title={isRTL ? 'ظ…ظƒطھظ…ظ„ ط§ظ„ظٹظˆظ…' : 'Completed today'}
          value={completedTodayJobs.length}
          subtitle={isRTL ? 'ظ…ظ†ط¬ط²' : 'Finished'}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="emerald"
        />
      </div>

      {/* Main Section: MY ASSIGNED JOBS */}
      <EditorialSection
        title={isRTL ? 'ط£ظˆط§ظ…ط± ط§ظ„ط¹ظ…ظ„ ط§ظ„ظ…ظƒظ„ظپ ط¨ظ‡ط§' : 'My Assigned Work Orders'}
        marginTop={0}
      >
        <DataTable
          showPagination
          columns={[
            { label: isRTL ? 'ط£ظ…ط± ط§ظ„ط¹ظ…ظ„' : 'Work order' },
            { label: isRTL ? 'ط§ظ„ظ…ط±ظƒط¨ط© ظˆط§ظ„ظ…ظ‚ط·ظˆط±ط©' : 'Vehicle & trailer' },
            { label: isRTL ? 'ظˆطµظپ ط§ظ„ط¹ط·ظ„' : 'Problem description' },
            { label: isRTL ? 'طھط§ط±ظٹط® ط§ظ„ط¨ظ„ط§ط؛' : 'Reported' },
            { label: isRTL ? 'ط§ظ„ط­ط§ظ„ط©' : 'Status', align: 'end' },
          ]}
          isEmpty={myAssignedJobs.length === 0}
          emptyMessage={
            isRTL
              ? 'ظ„ط§ طھظˆط¬ط¯ ط£ظˆط§ظ…ط± ط¥طµظ„ط§ط­ ظ…ظپطھظˆط­ط© ظ…ظƒظ„ظپ ط¨ظ‡ط§ ط­ط§ظ„ظٹط§ظ‹.'
              : 'You currently have no open repair jobs assigned.'
          }
        >
          {myAssignedJobs.map((wo) => {
            const veh = vehicles.find((v) => v.id === wo.vehicle_id);
            const trl = trailers.find((tr) => tr.id === wo.trailer_id);
            const stripe =
              wo.priority === 'CRITICAL'
                ? EDITORIAL_STATUS.red.stripe
                : wo.status === 'WAITING_FOR_PARTS'
                ? EDITORIAL_STATUS.amber.stripe
                : wo.status === 'IN_PROGRESS'
                ? EDITORIAL_STATUS.blue.stripe
                : EDITORIAL_STATUS.green.stripe;

            return (
              <DataRow
                key={wo.id}
                stripeColor={stripe}
                onClick={() => openWorkbench(wo)}
                actions={
                  <RowAction
                    icon={<ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
                    title={isRTL ? 'ظپطھط­ ظ…ط³ط§ط­ط© ط§ظ„ط¹ظ…ظ„' : 'Open Job Workbench'}
                    onClick={(e) => {
                      e.stopPropagation();
                      openWorkbench(wo);
                    }}
                  />
                }
              >
                <td className="py-3 pe-3 whitespace-nowrap">
                  <div className="flex flex-col items-start gap-1">
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        fontSize: 13,
                        color: 'var(--color-ink)',
                      }}
                    >
                      {wo.work_order_number}
                    </span>
                    <Badge variant={wo.priority === 'CRITICAL' ? 'danger' : 'amber'} size="sm">
                      {wo.priority}
                    </Badge>
                  </div>
                </td>
                <td className="py-3 pe-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                        {veh?.vehicle_id}
                      </span>
                      {veh?.plate_number && <PlateChip plate={veh.plate_number} />}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {veh?.make} {veh?.model}
                    </span>
                    {trl && (
                      <span style={{ fontSize: 12, color: EDITORIAL_STATUS.blue.text }}>
                        {isRTL ? 'ط§ظ„ظ…ظ‚ط·ظˆط±ط©:' : 'Trailer:'} {trl.trailer_id} ({trl.plate_number})
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 pe-3">
                  <p style={{ fontSize: 13, color: 'var(--color-ink)' }}>{wo.problem_description}</p>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {isRTL
                      ? new Date(wo.date_reported).toLocaleDateString('ar-SA')
                      : new Date(wo.date_reported).toLocaleDateString()}
                  </span>
                </td>
                <td className="py-3 text-end whitespace-nowrap">
                  <Badge variant={wo.status === 'IN_PROGRESS' ? 'amber' : 'purple'} size="sm">
                    {wo.status.replace(/_/g, ' ')}
                  </Badge>
                </td>
              </DataRow>
            );
          })}
        </DataTable>
      </EditorialSection>

      {/* Mechanic Personal Job Workbench Drawer */}
      {selectedWO && (
        <Drawer
          isOpen={!!selectedWO}
          onClose={() => setSelectedWO(null)}
          title={
            isRTL
              ? `ظ…ظ†طµط© ط¹ظ…ظ„ ط§ظ„ظپظ†ظٹ: ${selectedWO.work_order_number}`
              : `Mechanic Workbench: ${selectedWO.work_order_number}`
          }
          subtitle={
            isRTL
              ? 'ط¥ط¬ط±ط§ط،ط§طھ ط§ظ„ط¥طµظ„ط§ط­ ط§ظ„ط³ط±ظٹط¹ط© ظˆطھط³ط¬ظٹظ„ ط³ط§ط¹ط§طھ ط§ظ„ط¹ظ…ظ„ ظˆط§ظ„ظ‚ط·ط¹.'
              : 'Simple mobile-optimized repair actions and labor logging.'
          }
          width="3xl"
        >
          <div className="space-y-6 text-xs">
            {/* Quick Action Bar */}
            <div
              className="flex flex-wrap items-center gap-2 p-3"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <SecondaryButton onClick={() => handleStartJob(selectedWO.id)}>
                <Play className="w-3.5 h-3.5" style={{ color: EDITORIAL_STATUS.green.text }} />{' '}
                {isRTL ? 'ط¨ط¯ط، ط§ظ„ط¹ظ…ظ„' : 'Start Job'}
              </SecondaryButton>
              <SecondaryButton onClick={() => handlePauseJob(selectedWO.id)}>
                <Pause className="w-3.5 h-3.5" style={{ color: EDITORIAL_STATUS.red.text }} />{' '}
                {isRTL ? 'ط·ظ„ط¨ ظ‚ط·ط¹ ط؛ظٹط§ط± (ط¥ظٹظ‚ط§ظپ ظ…ط¤ظ‚طھ)' : 'Request Parts (Pause)'}
              </SecondaryButton>
              <PrimaryButton
                onClick={() => handleCompleteJob(selectedWO.id)}
                style={{ marginInlineStart: 'auto' }}
              >
                <CheckCircle2 className="w-4 h-4" /> {isRTL ? 'ط¥ظƒظ…ط§ظ„ ط§ظ„ط¥طµظ„ط§ط­' : 'Complete Repair'}
              </PrimaryButton>
            </div>

            {/* Diagnosis & Repair Notes Form */}
            <div className="space-y-4">
              <div
                className="p-4 space-y-2"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <label className="font-semibold block" style={{ color: 'var(--color-ink)' }}>
                  {isRTL ? 'ط¥ط¶ط§ظپط© ظ†طھط§ط¦ط¬ ط§ظ„طھط´ط®ظٹطµ' : 'Add Diagnostic Finding'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isRTL
                      ? 'ط³ط¬ظ„ ط§ظ„ط³ط¨ط¨ ط§ظ„ط¬ط°ط±ظٹ ظ„ظ„ط¹ط·ظ„...'
                      : 'Record root cause diagnosis (e.g. Civacon API seal leak under 4 bar pressure)...'
                  }
                  value={diagnosisText}
                  onChange={(e) => setDiagnosisText(e.target.value)}
                  className="nf-field w-full"
                />
              </div>

              {/* Request Spare Part */}
              <form
                onSubmit={handleIssuePart}
                className="p-4 space-y-3"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <h4 className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-ink)' }}>
                  <Package className="w-4 h-4" style={{ color: 'var(--color-brand-accent)' }} />{' '}
                  {isRTL ? 'ط·ظ„ط¨ ظ‚ط·ط¹ط© ط؛ظٹط§ط± ظ…ظ† ط§ظ„ظ…ط®ط²ظ†' : 'Request Part Used from Store'}
                </h4>
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <select
                    required
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="nf-field flex-1"
                  >
                    <option value="">{isRTL ? '-- ط§ط®طھط± ظ‚ط·ط¹ط© ط§ظ„ط؛ظٹط§ط± --' : '-- Select Spare Part --'}</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.part_number} - {p.part_name} ({isRTL ? 'ط§ظ„ظ…ط®ط²ظˆظ†:' : 'Stock:'} {p.current_stock})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={partQty}
                    onChange={(e) => setPartQty(Number(e.target.value))}
                    className="nf-field w-20 text-center font-semibold"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <PrimaryButton type="submit">{isRTL ? 'طµط±ظپ ط§ظ„ظ‚ط·ط¹ط©' : 'Use Part'}</PrimaryButton>
                </div>
              </form>

              {/* Log Labor Hours */}
              <form
                onSubmit={handleLogLabor}
                className="p-4 space-y-3"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <h4 className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-ink)' }}>
                  <Clock className="w-4 h-4" style={{ color: EDITORIAL_STATUS.blue.text }} />{' '}
                  {isRTL ? 'طھط³ط¬ظٹظ„ ط³ط§ط¹ط§طھ ط§ظ„ط¹ظ…ظ„ ط§ظ„ظ…ظ†ط¬ط²ط©' : 'Log Labor Hours Worked'}
                </h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={laborHours}
                    onChange={(e) => setLaborHours(Number(e.target.value))}
                    className="nf-field w-28 font-semibold"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <PrimaryButton type="submit">{isRTL ? 'طھط³ط¬ظٹظ„ ط§ظ„ط³ط§ط¹ط§طھ' : 'Log Hours'}</PrimaryButton>
                </div>
              </form>
            </div>
          </div>
        </Drawer>
      )}
    </PageContainer>
  );
};
