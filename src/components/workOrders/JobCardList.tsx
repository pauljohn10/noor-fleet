import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { JobCardFormModal } from './JobCardFormModal';
import { JobCardDetailView } from './JobCardDetailView';
import { WorkOrder, WOStatus, WOPriority } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { DESIGN_TOKENS } from '../../lib/designTokens';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  GhostButton,
  StatusTabs,
  EditorialSelect,
  DataTable,
  DataRow,
  RowAction,
  StatusText,
  TableFooter,
} from '../common/EditorialUI';

const WO_STATUS_META = (status: WOStatus, isRTL: boolean) => {
  switch (status) {
    case 'COMPLETED':
    case 'RELEASED':
      return {
        stripe: DESIGN_TOKENS.colors.status.availableStripe,
        text: DESIGN_TOKENS.colors.status.availableText,
        label: status === 'RELEASED' ? (isRTL ? 'تم التسليم' : 'Released') : (isRTL ? 'مكتمل' : 'Completed'),
      };
    case 'IN_PROGRESS':
    case 'ASSIGNED':
      return {
        stripe: DESIGN_TOKENS.colors.status.onTripStripe,
        text: DESIGN_TOKENS.colors.status.onTripText,
        label: status === 'ASSIGNED' ? (isRTL ? 'مُكلَّف' : 'Assigned') : (isRTL ? 'قيد التنفيذ' : 'In progress'),
      };
    case 'WAITING_FOR_PARTS':
    case 'WAITING_FOR_APPROVAL':
      return {
        stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe,
        text: DESIGN_TOKENS.colors.status.outOfServiceText,
        label: status === 'WAITING_FOR_PARTS' ? (isRTL ? 'بانتظار قطع غيار' : 'Waiting parts') : (isRTL ? 'بانتظار الموافقة' : 'Waiting approval'),
      };
    case 'CANCELLED':
      return {
        stripe: '#6B665C',
        text: '#5B574F',
        label: isRTL ? 'ملغى' : 'Cancelled',
      };
    default:
      return {
        stripe: DESIGN_TOKENS.colors.status.workshopStripe,
        text: DESIGN_TOKENS.colors.status.workshopText,
        label: status === 'INSPECTION' ? (isRTL ? 'فحص' : 'Inspection') : (isRTL ? 'مبلّغ عنه' : 'Reported'),
      };
  }
};

const PRIORITY_COLOR: Record<WOPriority, { color: string; label: string; labelAr: string }> = {
  CRITICAL: { color: DESIGN_TOKENS.colors.status.outOfServiceText, label: 'Critical', labelAr: 'حرجة' },
  HIGH: { color: DESIGN_TOKENS.colors.status.workshopText, label: 'High', labelAr: 'عالية' },
  MEDIUM: { color: DESIGN_TOKENS.colors.status.onTripText, label: 'Medium', labelAr: 'متوسطة' },
  LOW: { color: '#5B574F', label: 'Low', labelAr: 'منخفضة' },
};

export const JobCardList: React.FC = () => {
  const { workOrders, vehicles, technicians } = useFleet();
  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const isBucket = (w: WorkOrder, bucket: string) => {
    if (bucket === 'ALL') return true;
    if (bucket === 'PENDING') return ['REPORTED', 'INSPECTION', 'WAITING_FOR_APPROVAL'].includes(w.status);
    if (bucket === 'IN_PROGRESS') return ['ASSIGNED', 'IN_PROGRESS', 'REPAIR_COMPLETED', 'QC_INSPECTION'].includes(w.status);
    if (bucket === 'WAITING_FOR_PARTS') return w.status === 'WAITING_FOR_PARTS';
    if (bucket === 'COMPLETED') return ['COMPLETED', 'RELEASED'].includes(w.status);
    return w.status === bucket;
  };

  const filteredWOs = workOrders.filter(w => {
    const q = search.toLowerCase();
    const veh = vehicles.find(v => v.id === w.vehicle_id);
    const matchesSearch =
      w.work_order_number.toLowerCase().includes(q) ||
      w.problem_description.toLowerCase().includes(q) ||
      (veh?.vehicle_id.toLowerCase().includes(q) ?? false) ||
      (veh?.plate_number.toLowerCase().includes(q) ?? false);
    const matchesStatus = isBucket(w, statusFilter);
    const matchesPriority = priorityFilter === 'ALL' || w.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const totalPages = Math.max(1, Math.ceil(filteredWOs.length / PAGE_SIZE));
  const pagedWOs = filteredWOs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExportExcel = () => {
    const data = filteredWOs.map(w => ({
      [t('Work Order #')]: w.work_order_number,
      [t('Vehicle ID')]: vehicles.find(v => v.id === w.vehicle_id)?.vehicle_id || t('N/A'),
      [t('Priority')]: t(w.priority),
      [t('Status')]: t(w.status),
      [t('Problem')]: w.problem_description,
      [t('Parts Cost')]: w.parts_cost,
      [t('Labor Cost')]: w.labor_cost,
      [t('Total Cost')]: w.total_cost,
      [t('Date Reported')]: new Date(w.date_reported).toLocaleDateString(
        isRTL ? 'ar-SA-u-ca-gregory' : 'en-US'
      ),
    }));
    exportToExcel(data, 'Workshop_Job_Cards');
  };

  const handleExportPDF = () => {
    const headers = [
      t('WO #'),
      t('Vehicle Unit'),
      t('Priority'),
      t('Workflow Status'),
      t('Assigned Tech'),
      t('Problem Description'),
      t('Parts Cost'),
      t('Labor Cost'),
      t('Total Cost'),
    ];
    const rows = filteredWOs.map(w => {
      const veh = vehicles.find(v => v.id === w.vehicle_id);
      const tech = technicians.find(tc => tc.id === w.assigned_technician_id);
      return [
        w.work_order_number,
        veh ? `${veh.vehicle_id} (${veh.plate_number})` : t('N/A'),
        t(w.priority),
        t(w.status),
        tech ? tech.full_name : t('Unassigned'),
        w.problem_description,
        `${(w.parts_cost || 0).toLocaleString()} ${t('SAR')}`,
        `${(w.labor_cost || 0).toLocaleString()} ${t('SAR')}`,
        `${(w.total_cost || 0).toLocaleString()} ${t('SAR')}`,
      ];
    });

    const totalCost = workOrders.reduce((sum, w) => sum + (w.total_cost || 0), 0);
    const inProgressCount = workOrders.filter(
      w => w.status === 'IN_PROGRESS' || w.status === 'ASSIGNED'
    ).length;

    exportToPDFReport(
      t('Al-Noor Workshop Job Card Summary Report'),
      headers,
      rows,
      'Workshop_Job_Cards_Report',
      {
        orientation: 'landscape',
        subtitle: t(
          'Commercial Workshop Work Orders, Technician Allocations, Spare Parts Incurred & Cost Totals'
        ),
        summaryKPIs: [
          { label: t('Total Job Cards'), value: workOrders.length, color: 'slate' },
          { label: t('Active In Bay'), value: inProgressCount, color: 'amber' },
          {
            label: t('Total Workshop Cost'),
            value: `${(totalCost || 0).toLocaleString()} ${t('SAR')}`,
            color: 'emerald',
          },
        ],
        metadata: [
          { label: t('Status Filter'), value: statusFilter === 'ALL' ? t('All Statuses') : t(statusFilter) },
          { label: t('Priority Filter'), value: priorityFilter === 'ALL' ? t('All Priorities') : t(priorityFilter) },
          { label: t('Export Scope'), value: `${filteredWOs.length} ${t('work orders')}` },
        ],
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'بطاقات العمل' : 'Job Cards &'}
            <br />
            {isRTL ? 'وأوامر الصيانة' : 'Repair Orders'}
          </>
        }
        subtitle={t('Repair job cards, technician task logs, spare parts issuance deductions, labor hours, and QC release authorization.')}
        actions={
          <>
            <GhostButton onClick={handleExportExcel}>
              {t('Excel')}
            </GhostButton>
            <GhostButton onClick={handleExportPDF}>
              {isRTL ? 'تقرير PDF' : 'PDF report'}
            </GhostButton>
            {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) && (
              <PrimaryButton onClick={() => setIsFormOpen(true)}>
                {isRTL ? `+ ${t('Create Work Order')}` : '+ Create work order'}
              </PrimaryButton>
            )}
          </>
        }
      />

      <StatusTabs
        tabs={[
          { key: 'ALL', label: isRTL ? 'الكل' : 'All', count: workOrders.length },
          {
            key: 'PENDING',
            label: isRTL ? 'قيد الانتظار' : 'Pending',
            count: workOrders.filter(w => isBucket(w, 'PENDING')).length,
            stripe: DESIGN_TOKENS.colors.status.workshopStripe,
          },
          {
            key: 'IN_PROGRESS',
            label: isRTL ? 'قيد التنفيذ' : 'In progress',
            count: workOrders.filter(w => isBucket(w, 'IN_PROGRESS')).length,
            stripe: DESIGN_TOKENS.colors.status.onTripStripe,
          },
          {
            key: 'WAITING_FOR_PARTS',
            label: isRTL ? 'بانتظار قطع غيار' : 'Waiting parts',
            count: workOrders.filter(w => isBucket(w, 'WAITING_FOR_PARTS')).length,
            stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe,
          },
          {
            key: 'COMPLETED',
            label: isRTL ? 'مكتمل' : 'Completed',
            count: workOrders.filter(w => isBucket(w, 'COMPLETED')).length,
            stripe: DESIGN_TOKENS.colors.status.availableStripe,
          },
        ]}
        activeKey={statusFilter}
        onChange={k => {
          setStatusFilter(k);
          setPage(1);
        }}
        searchValue={search}
        onSearchChange={val => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={t('Search WO #, problem description...')}
        extraFilters={
          <EditorialSelect
            value={priorityFilter}
            onChange={e => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">{t('All Priorities')}</option>
            <option value="LOW">{isRTL ? 'منخفضة' : 'Low'}</option>
            <option value="MEDIUM">{isRTL ? 'متوسطة' : 'Medium'}</option>
            <option value="HIGH">{isRTL ? 'عالية' : 'High'}</option>
            <option value="CRITICAL">{isRTL ? 'حرجة' : 'Critical'}</option>
          </EditorialSelect>
        }
      />

      <DataTable
        columns={[
          { label: isRTL ? 'رقم أمر العمل' : 'Work order #', align: 'start' },
          { label: isRTL ? 'المركبة' : 'Vehicle / Unit', align: 'start' },
          { label: isRTL ? 'وصف المشكلة' : 'Problem description', align: 'start' },
          { label: isRTL ? 'الأولوية' : 'Priority', align: 'start' },
          { label: isRTL ? 'الفني المسؤول' : 'Lead technician', align: 'start' },
          { label: isRTL ? 'إجمالي التكلفة' : 'Total cost', align: 'end' },
          { label: isRTL ? 'الحالة' : 'Status', align: 'start' },
        ]}
        isEmpty={pagedWOs.length === 0}
        emptyMessage={t('No work order job cards found matching filter.')}
        onClearFilters={() => {
          setSearch('');
          setStatusFilter('ALL');
          setPriorityFilter('ALL');
          setPage(1);
        }}
      >
        {pagedWOs.map(w => {
          const veh = vehicles.find(v => v.id === w.vehicle_id);
          const tech = technicians.find(tc => tc.id === w.assigned_technician_id);
          const meta = WO_STATUS_META(w.status, isRTL);
          const pri = PRIORITY_COLOR[w.priority] || PRIORITY_COLOR.LOW;

          return (
            <DataRow
              key={w.id}
              stripeColor={meta.stripe}
              onClick={() => setSelectedWO(w)}
              actions={
                <RowAction
                  icon={<Eye size={14} />}
                  title={t('View Job Card')}
                  onClick={() => setSelectedWO(w)}
                />
              }
            >
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                  }}
                >
                  {w.work_order_number}
                </div>
                <div
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    color: 'var(--color-text-muted)',
                    marginTop: 2,
                  }}
                >
                  {new Date(w.date_reported).toLocaleDateString(
                    isRTL ? 'ar-SA-u-ca-gregory' : 'en-US'
                  )}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {veh ? (
                  <div>
                    <div
                      dir="ltr"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                      }}
                    >
                      {veh.vehicle_id}
                    </div>
                    <div
                      dir="ltr"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11.5,
                        color: 'var(--color-text-muted)',
                        marginTop: 2,
                      }}
                    >
                      {veh.plate_number}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle', maxWidth: 280 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    color: 'var(--color-ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {w.problem_description}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText label={isRTL ? pri.labelAr : pri.label} color={pri.color} />
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {tech ? (
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--color-ink)' }}>
                    {tech.full_name}
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    {t('Unassigned')}
                  </span>
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <span
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                  }}
                >
                  {(w.total_cost || 0).toLocaleString()} {t('SAR')}
                </span>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText label={meta.label} color={meta.text} />
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${filteredWOs.length} من ${workOrders.length} أمر عمل`
            : `${filteredWOs.length} of ${workOrders.length} work orders`
        }
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />

      <JobCardFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      <JobCardDetailView
        workOrder={selectedWO}
        isOpen={!!selectedWO}
        onClose={() => setSelectedWO(null)}
      />
    </PageContainer>
  );
};
