import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { Tabs } from '../common/Tabs';
import { WorkOrder, WOStatus } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import {
  Wrench,
  FileText,
  Clock,
  Package,
  DollarSign,
  Camera,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { exportJobCardPDF } from '../../lib/exportUtils';
import {
  EDITORIAL_STATUS,
  PrimaryButton,
} from '../common/EditorialUI';

interface JobCardDetailViewProps {
  workOrder: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const JobCardDetailView: React.FC<JobCardDetailViewProps> = ({
  workOrder,
  isOpen,
  onClose,
}) => {
  const {
    vehicles,
    trailers,
    drivers,
    technicians,
    parts,
    updateWorkOrderStatus,
    addWorkOrderPart,
    addWorkOrderLabor,
  } = useFleet();
  const { currentProfile, hasPermission } = useAuth();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState('overview');

  // Local state for part issuance modal inside job card
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);

  // Local state for labor entry
  const [laborHours, setLaborHours] = useState(2);
  const [laborDesc, setLaborDesc] = useState('');

  if (!workOrder) return null;

  const vehicle = vehicles.find((v) => v.id === workOrder.vehicle_id);
  const trailer = trailers.find((tr) => tr.id === workOrder.trailer_id);
  const driver = drivers.find((d) => d.id === workOrder.driver_id);
  const tech = technicians.find((tc) => tc.id === workOrder.assigned_technician_id);

  const statusWorkflow: WOStatus[] = [
    'REPORTED',
    'INSPECTION',
    'ASSIGNED',
    'IN_PROGRESS',
    'WAITING_FOR_PARTS',
    'WAITING_FOR_APPROVAL',
    'REPAIR_COMPLETED',
    'QC_INSPECTION',
    'COMPLETED',
    'RELEASED',
  ];

  const handleIssuePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartId || partQty < 1) return;
    addWorkOrderPart(workOrder.id, selectedPartId, partQty, currentProfile.full_name);
    setSelectedPartId('');
    setPartQty(1);
  };

  const handleAddLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrder.assigned_technician_id) {
      alert(t('Please assign a technician to this work order first.'));
      return;
    }
    addWorkOrderLabor(
      workOrder.id,
      workOrder.assigned_technician_id,
      laborHours,
      laborDesc || 'Technician repair labor'
    );
    setLaborDesc('');
  };

  const handleDownloadJobCardPDF = () => {
    exportJobCardPDF(workOrder, vehicle, trailer, driver, tech);
  };

  const tabItems = [
    { id: 'overview', label: 'Overview', icon: <Wrench className="w-4 h-4" /> },
    { id: 'diagnosis', label: 'Diagnosis', icon: <FileText className="w-4 h-4" /> },
    { id: 'repair', label: 'Repair Log', icon: <Wrench className="w-4 h-4" /> },
    { id: 'parts', label: 'Parts Used', icon: <Package className="w-4 h-4" /> },
    { id: 'labor', label: 'Labor Hours', icon: <Clock className="w-4 h-4" /> },
    { id: 'photos', label: 'Photos', icon: <Camera className="w-4 h-4" /> },
    { id: 'qc', label: 'QC & Approval', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  const bannerStripe =
    workOrder.priority === 'CRITICAL'
      ? EDITORIAL_STATUS.red.stripe
      : 'var(--color-brand-accent)';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('Job Card')}: ${workOrder.work_order_number}`}
      subtitle={`${t('Vehicle')}: ${vehicle?.vehicle_id || t('N/A')} (${vehicle?.plate_number || ''}) | ${t(
        'Priority'
      )}: ${t(workOrder.priority)}`}
      width="4xl"
    >
      <div className="space-y-6 text-xs">
        {/* Banner Summary with PDF Action */}
        <div
          className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderInlineStart: `3px solid ${bannerStripe}`,
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-lg font-bold"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                dir="ltr"
              >
                {workOrder.work_order_number}
              </span>
              <Badge variant={workOrder.priority === 'CRITICAL' ? 'danger' : 'amber'}>
                {workOrder.priority}
              </Badge>
              <Badge variant="purple">{workOrder.status.replace(/_/g, ' ')}</Badge>
            </div>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {workOrder.problem_description}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="text-start sm:text-end">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {t('Total Work Order Cost')}
              </p>
              <p
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--font-mono)', color: EDITORIAL_STATUS.green.text }}
                dir="ltr"
              >
                {(workOrder.total_cost || 0).toLocaleString()} {t('SAR')}
              </p>
            </div>
            <PrimaryButton type="button" onClick={handleDownloadJobCardPDF}>
              <Download className="w-3.5 h-3.5" />
              <span>{t('Official Job Card (PDF)')}</span>
            </PrimaryButton>
          </div>
        </div>

        {/* Interactive Status Pipeline Stepper */}
        <div
          className="p-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <p className="text-[11px] font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
            {t('Workflow Lifecycle Pipeline')}
          </p>
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar py-2 gap-2">
            {statusWorkflow.map((st, idx) => {
              const currentIdx = statusWorkflow.indexOf(workOrder.status);
              const isPassed = idx <= currentIdx;
              const isCurrent = st === workOrder.status;

              return (
                <button
                  key={st}
                  disabled={!hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER', 'WORKSHOP_MANAGER', 'WORKSHOP_STAFF'])}
                  onClick={() =>
                    updateWorkOrderStatus(
                      workOrder.id,
                      st,
                      `Status changed by ${currentProfile.full_name}`,
                      currentProfile.full_name
                    )
                  }
                  className={`flex flex-col items-center shrink-0 px-1.5 transition ${hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER', 'WORKSHOP_MANAGER', 'WORKSHOP_STAFF'])
                    ? 'cursor-pointer'
                    : 'cursor-default opacity-80'
                    }`}
                >
                  <div
                    className="w-7 h-7 flex items-center justify-center font-bold text-xs"
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      background: isCurrent
                        ? 'var(--color-ink)'
                        : isPassed
                          ? 'var(--color-brand-accent)'
                          : 'var(--color-page-bg)',
                      color: isCurrent || isPassed ? 'var(--color-page-bg)' : 'var(--color-text-muted)',
                      border: isCurrent
                        ? '1px solid var(--color-ink)'
                        : isPassed
                          ? '1px solid var(--color-brand-accent)'
                          : '1px solid var(--color-border)',
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className="text-[10px] font-semibold mt-1"
                    style={{
                      color: isCurrent
                        ? 'var(--color-ink)'
                        : isPassed
                          ? 'var(--color-brand-accent)'
                          : 'var(--color-text-muted)',
                    }}
                  >
                    {t(st)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6 text-xs">
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Assigned Truck')}
                </p>
                <p
                  className="font-bold text-sm mt-0.5"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                  dir="ltr"
                >
                  {vehicle?.vehicle_id} ({vehicle?.plate_number})
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Coupled Trailer')}
                </p>
                <p
                  className="font-semibold text-xs mt-0.5"
                  style={{
                    fontFamily: trailer ? 'var(--font-mono)' : undefined,
                    color: EDITORIAL_STATUS.blue.text,
                  }}
                  dir={trailer ? 'ltr' : undefined}
                >
                  {trailer ? `${trailer.trailer_id} (${trailer.plate_number})` : t('None')}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Reporting Driver')}
                </p>
                <p className="font-semibold text-xs mt-0.5" style={{ color: 'var(--color-ink)' }}>
                  {driver?.full_name || t('Unassigned')}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Lead Mechanic')}
                </p>
                <p className="font-semibold text-xs mt-0.5" style={{ color: 'var(--color-ink)' }}>
                  {tech?.full_name || t('Unassigned')}
                </p>
              </div>
            </div>

            {/* Cost Summary Breakdown */}
            <div
              className="p-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <h4
                className="font-semibold text-xs mb-3 flex items-center gap-2"
                style={{ color: 'var(--color-ink)' }}
              >
                <DollarSign className="w-4 h-4" style={{ color: EDITORIAL_STATUS.green.text }} />{' '}
                {t('Maintenance Cost Breakdown Formula')}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                {[
                  {
                    label: t('Parts Cost'),
                    value: `${(workOrder.parts_cost || 0).toLocaleString()} ${t('SAR')}`,
                    color: EDITORIAL_STATUS.amber.text,
                  },
                  {
                    label: t('Labor Cost'),
                    value: `${(workOrder.labor_cost || 0).toLocaleString()} ${t('SAR')}`,
                    color: EDITORIAL_STATUS.blue.text,
                  },
                  {
                    label: t('External Service'),
                    value: `${(workOrder.external_service_cost || 0).toLocaleString()} ${t('SAR')}`,
                    color: 'var(--color-ink)',
                  },
                  {
                    label: t('Other Fees'),
                    value: `${(workOrder.other_cost || 0).toLocaleString()} ${t('SAR')}`,
                    color: 'var(--color-text-secondary)',
                  },
                ].map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3"
                    style={{
                      background: 'var(--color-page-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <p
                      className="text-[11px] font-semibold"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {c.label}
                    </p>
                    <p
                      className="font-bold text-sm mt-1"
                      style={{ fontFamily: 'var(--font-mono)', color: c.color }}
                      dir="ltr"
                    >
                      {c.value}
                    </p>
                  </div>
                ))}
                <div
                  className="p-3"
                  style={{
                    background: 'var(--color-page-bg)',
                    border: '1px solid var(--color-border)',
                    borderInlineStart: '3px solid var(--color-brand-accent)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <p
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {t('TOTAL COST')}
                  </p>
                  <p
                    className="font-bold text-sm mt-1"
                    style={{ fontFamily: 'var(--font-mono)', color: EDITORIAL_STATUS.green.text }}
                    dir="ltr"
                  >
                    {(workOrder.total_cost || 0).toLocaleString()} {t('SAR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Diagnosis */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-4 text-xs">
            <div
              className="p-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <h4 className="font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
                {t('Technician Diagnostic Notes')}
              </h4>
              <p
                className="leading-relaxed p-3.5"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-row-divider)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {workOrder.diagnosis_notes ||
                  t('Diagnosis notes pending completion by lead mechanic.')}
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Repair Log */}
        {activeTab === 'repair' && (
          <div className="space-y-4 text-xs">
            <div
              className="p-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <h4 className="font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
                {t('Executed Repair Summary')}
              </h4>
              <p
                className="leading-relaxed p-3.5"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-row-divider)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {workOrder.repair_summary || t('Repair summary actions log.')}
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Parts Used */}
        {activeTab === 'parts' && (
          <div className="space-y-4 text-xs">
            {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER', 'WORKSHOP_MANAGER', 'WORKSHOP_STAFF']) && (
              <form
                onSubmit={handleIssuePart}
                className="p-4 flex flex-wrap sm:flex-nowrap items-end gap-3"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div className="flex-1 min-w-[200px]">
                  <label
                    className="text-xs font-semibold block mb-1.5"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {t('Issue Spare Part from Store *')}
                  </label>
                  <select
                    required
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="nf-field w-full"
                  >
                    <option value="">{t('-- Select Part to Deduct Stock --')}</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.part_number} - {p.part_name} ({t('Stock')}: {p.current_stock} |{' '}
                        {p.unit_cost} {t('SAR')})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label
                    className="text-xs font-semibold block mb-1.5"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {t('Qty')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    dir="ltr"
                    value={partQty}
                    onChange={(e) => setPartQty(Number(e.target.value))}
                    className="nf-field w-full font-semibold"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <PrimaryButton type="submit">{t('Issue Part')}</PrimaryButton>
              </form>
            )}

            <div
              className="p-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <h4 className="font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
                {t('Parts Consumed Summary')}
              </h4>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {t('Total Parts Expenses')}:{' '}
                <span
                  className="font-bold"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                  dir="ltr"
                >
                  {(workOrder.parts_cost || 0).toLocaleString()} {t('SAR')}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Tab 5: Labor Hours */}
        {activeTab === 'labor' && (
          <div className="space-y-4 text-xs">
            {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER', 'WORKSHOP_MANAGER', 'WORKSHOP_STAFF']) && (
              <form
                onSubmit={handleAddLabor}
                className="p-4 flex flex-wrap sm:flex-nowrap items-end gap-3"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div className="w-32">
                  <label
                    className="text-xs font-semibold block mb-1.5"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {t('Labor Hours')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    dir="ltr"
                    value={laborHours}
                    onChange={(e) => setLaborHours(Number(e.target.value))}
                    className="nf-field w-full font-semibold"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label
                    className="text-xs font-semibold block mb-1.5"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {t('Work Description')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('e.g. Dismantled air line & replaced API seal kit')}
                    value={laborDesc}
                    onChange={(e) => setLaborDesc(e.target.value)}
                    className="nf-field w-full"
                  />
                </div>
                <PrimaryButton type="submit">{t('Log Labor')}</PrimaryButton>
              </form>
            )}

            <div
              className="p-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {t('Logged Labor Expenses')}:{' '}
                <span
                  className="font-bold"
                  style={{ fontFamily: 'var(--font-mono)', color: EDITORIAL_STATUS.blue.text }}
                  dir="ltr"
                >
                  {(workOrder.labor_cost || 0).toLocaleString()} {t('SAR')}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Tab 6: Photos */}
        {activeTab === 'photos' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-5 text-center"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <Camera
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: 'var(--color-brand-accent)' }}
                />
                <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {t('Before Repair Photo')}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Uploaded upon work order creation')}
                </p>
              </div>
              <div
                className="p-5 text-center"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <Camera
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: EDITORIAL_STATUS.green.text }}
                />
                <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {t('After Repair Photo')}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Uploaded upon QC inspection')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: QC */}
        {activeTab === 'qc' && (
          <div className="space-y-4 text-xs">
            <div
              className="p-4 space-y-3"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderInlineStart: `3px solid ${workOrder.qc_passed
                  ? EDITORIAL_STATUS.green.stripe
                  : EDITORIAL_STATUS.amber.stripe
                  }`,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div className="flex items-center justify-between">
                <h4
                  className="font-semibold flex items-center gap-2"
                  style={{ color: 'var(--color-ink)' }}
                >
                  <ShieldCheck className="w-4 h-4" style={{ color: EDITORIAL_STATUS.green.text }} />{' '}
                  {t('Quality Control & Supervisor Sign-off')}
                </h4>
                <Badge variant={workOrder.qc_passed ? 'success' : 'amber'}>
                  {workOrder.qc_passed ? 'QC APPROVED' : 'QC PENDING'}
                </Badge>
              </div>
              <p
                className="p-3"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-row-divider)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {workOrder.qc_notes ||
                  t('All safety torque specifications, pneumatic seals, and fuel leakage checks verified.')}
              </p>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
