import React from 'react';
import { Download, FileText } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { Badge } from '../common/Badge';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { useTablePagination } from '../../lib/supabasePagination';
import {
  PageContainer,
  PageHeader,
  GhostButton,
  MetricStrip,
  EditorialSection,
  DataTable,
  DataRow,
  PlateChip,
  TableFooter,
  EDITORIAL_STATUS,
} from '../common/EditorialUI';

export const CostAnalysisView: React.FC = () => {
  const { vehicles, workOrders, schedules } = useFleet();
  const { t, isRTL } = useI18n();

  const totalPartsCost = workOrders.reduce((sum, w) => sum + (w.parts_cost || 0), 0);
  const totalLaborCost = workOrders.reduce((sum, w) => sum + (w.labor_cost || 0), 0);
  const totalExternalCost = workOrders.reduce((sum, w) => sum + (w.external_service_cost || 0), 0);
  const totalGrandCost = workOrders.reduce((sum, w) => sum + (w.total_cost || 0), 0);

  const vehicleCostRanking = vehicles.map(v => {
    const vWOs = workOrders.filter(w => w.vehicle_id === v.id);
    const cost = vWOs.reduce((sum, w) => sum + (w.total_cost || 0), 0);
    return {
      vehicle: v,
      repairsCount: vWOs.length,
      cost
    };
  }).sort((a, b) => b.cost - a.cost);

  const {
    page: costPage,
    setPage: setCostPage,
    pageSize: costPageSize,
    setPageSize: setCostPageSize,
    totalPages: costTotalPages,
    pagedItems: pagedCostRanking,
  } = useTablePagination(vehicleCostRanking, [], {
    table: 'vehicles',
    orderBy: 'created_at',
    ascending: false,
  });

  const {
    page: schedPage,
    setPage: setSchedPage,
    pageSize: schedPageSize,
    setPageSize: setSchedPageSize,
    totalPages: schedTotalPages,
    pagedItems: pagedSchedules,
  } = useTablePagination(schedules, [], {
    table: 'maintenance_schedules',
    orderBy: 'created_at',
    ascending: false,
  });

  const handleExportExcel = () => {
    const data = vehicleCostRanking.map(r => ({
      [t('Vehicle ID')]: r.vehicle.vehicle_id,
      [t('Plate Number')]: r.vehicle.plate_number,
      [t('Make & Model')]: `${r.vehicle.make} ${r.vehicle.model}`,
      [t('Work Orders Count')]: r.repairsCount,
      [t('Total Maintenance Cost (SAR)')]: r.cost,
      [t('Status')]: t(r.vehicle.status.replace(/_/g, ' '))
    }));
    exportToExcel(data, 'Vehicle_Maintenance_Cost_Ranking');
  };

  const handleExportPDF = () => {
    const headers = [
      t('Rank'),
      t('Vehicle ID'),
      t('Plate Number'),
      t('Make & Model'),
      t('Repairs Count'),
      t('Maintenance Cost (SAR)'),
      t('Fleet Status')
    ];
    const rows = vehicleCostRanking.map((r, idx) => [
      `#${idx + 1}`,
      r.vehicle.vehicle_id,
      r.vehicle.plate_number,
      `${r.vehicle.make} ${r.vehicle.model}`,
      isRTL ? `${r.repairsCount} أمر عمل` : `${r.repairsCount} work orders`,
      `${(r.cost || 0).toLocaleString()} ${t('SAR')}`,
      t(r.vehicle.status.replace(/_/g, ' '))
    ]);

    exportToPDFReport(
      t('Fleet Maintenance Cost Analysis & Vehicle Ranking'),
      headers,
      rows,
      'Vehicle_Cost_Analysis_Report',
      {
        orientation: 'landscape',
        subtitle: t('Workshop Repair Expenditure Analysis (Spare Parts + Labor + External Subcontracting)'),
        summaryKPIs: [
          { label: t('Total Maintenance'), value: `${(totalGrandCost || 0).toLocaleString()} ${t('SAR')}`, color: 'emerald' },
          { label: t('Parts Incurred'), value: `${(totalPartsCost || 0).toLocaleString()} ${t('SAR')}`, color: 'amber' },
          { label: t('Labor Hours Billed'), value: `${(totalLaborCost || 0).toLocaleString()} ${t('SAR')}`, color: 'sky' }
        ],
        metadata: [
          { label: t('Total Vehicles Audited'), value: isRTL ? `${vehicles.length} مركبة` : `${vehicles.length} units` },
          { label: t('Total Work Orders'), value: isRTL ? `${workOrders.length} أمر عمل` : `${workOrders.length} orders` }
        ]
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'مقاييس تكلفة الأسطول' : 'Fleet Cost'}
            <br />
            {isRTL ? 'وتحليل الصيانة' : 'Metrics & Analysis'}
          </>
        }
        subtitle={t('Total Cost Formula = Spare Parts + Technician Labor + External Subcontracting Services. Breakdown by vehicle unit.')}
        actions={
          <>
            <GhostButton onClick={handleExportExcel} title={t('Export to Excel')}>
              {t('Excel')}
            </GhostButton>
            <GhostButton onClick={handleExportPDF} title={t('Export to PDF')}>
              {isRTL ? 'تقرير PDF' : 'PDF report'}
            </GhostButton>
          </>
        }
      />

      <MetricStrip
        marginBottom={28}
        items={[
          {
            label: isRTL ? 'إجمالي تكلفة الصيانة' : 'Total maintenance expense',
            value: `${(totalGrandCost || 0).toLocaleString()} ${t('SAR')}`,
            subtext: t('Cumulative Maintenance'),
            mono: true,
            stripe: EDITORIAL_STATUS.green.stripe,
            valueColor: EDITORIAL_STATUS.green.text,
          },
          {
            label: isRTL ? 'تكلفة قطع الغيار' : 'Parts expense',
            value: `${(totalPartsCost || 0).toLocaleString()} ${t('SAR')}`,
            subtext: t('Spare Parts Issued'),
            mono: true,
            stripe: EDITORIAL_STATUS.amber.stripe,
            valueColor: EDITORIAL_STATUS.amber.text,
          },
          {
            label: isRTL ? 'تكلفة العمالة' : 'Labor expense',
            value: `${(totalLaborCost || 0).toLocaleString()} ${t('SAR')}`,
            subtext: t('Technician Hours'),
            mono: true,
            stripe: EDITORIAL_STATUS.blue.stripe,
            valueColor: EDITORIAL_STATUS.blue.text,
          },
          {
            label: isRTL ? 'الخدمات الخارجية' : 'External services',
            value: `${(totalExternalCost || 0).toLocaleString()} ${t('SAR')}`,
            subtext: t('Specialized Subcontract'),
            mono: true,
            stripe: EDITORIAL_STATUS.muted.stripe,
            valueColor: 'var(--color-ink)',
          },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 28 }}>
        <EditorialSection title={t('Highest Repair Cost Vehicles')} marginTop={0}>
          <DataTable
            columns={[
              { label: t('Vehicle') },
              { label: t('Repairs Count') },
              { label: t('Total Cost'), align: 'end' },
            ]}
            isEmpty={vehicleCostRanking.length === 0}
            emptyMessage={t('No vehicles found')}
            hasActionsColumn={false}
          >
            {pagedCostRanking.map(item => (
              <DataRow key={item.vehicle.id} stripeColor={item.cost > 0 ? EDITORIAL_STATUS.amber.stripe : EDITORIAL_STATUS.muted.stripe}>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                    <PlateChip plate={item.vehicle.plate_number} />
                    <span dir="ltr" style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {item.vehicle.vehicle_id} • {item.vehicle.make} {item.vehicle.model}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <span dir="ltr" style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{item.repairsCount}</span> {t('Repairs Logged')}
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'end', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                  <span dir="ltr">{(item.cost || 0).toLocaleString()}</span> {t('SAR')}
                </td>
              </DataRow>
            ))}
          </DataTable>
          <TableFooter
            summaryText={`${vehicleCostRanking.length} ${t('vehicles')}`}
            page={costPage}
            totalPages={costTotalPages}
            pageSize={costPageSize}
            totalRecords={vehicleCostRanking.length}
            onPageChange={setCostPage}
            onPageSizeChange={setCostPageSize}
            onPrev={() => setCostPage(p => Math.max(1, p - 1))}
            onNext={() => setCostPage(p => Math.min(costTotalPages, p + 1))}
          />
        </EditorialSection>

        <EditorialSection title={t('Maintenance Calendar Schedule Overview')} marginTop={0}>
          <DataTable
            columns={[
              { label: t('Schedule Title') },
              { label: t('Target Due') },
              { label: t('Status'), align: 'end' },
            ]}
            isEmpty={schedules.length === 0}
            emptyMessage={t('No schedules found')}
            hasActionsColumn={false}
          >
            {pagedSchedules.map(s => (
              <DataRow
                key={s.id}
                stripeColor={s.status === 'OVERDUE' ? EDITORIAL_STATUS.red.stripe : EDITORIAL_STATUS.blue.stripe}
              >
                <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 500, fontSize: 13, color: 'var(--color-ink)' }}>
                  {s.title}
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  <span dir={s.next_due_date ? 'ltr' : undefined}>{s.next_due_date || t('KM Trigger')}</span>
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                  <Badge variant={s.status === 'OVERDUE' ? 'danger' : 'info'}>{s.status}</Badge>
                </td>
              </DataRow>
            ))}
          </DataTable>
          <TableFooter
            summaryText={`${schedules.length} ${t('schedules')}`}
            page={schedPage}
            totalPages={schedTotalPages}
            pageSize={schedPageSize}
            totalRecords={schedules.length}
            onPageChange={setSchedPage}
            onPageSizeChange={setSchedPageSize}
            onPrev={() => setSchedPage(p => Math.max(1, p - 1))}
            onNext={() => setSchedPage(p => Math.min(schedTotalPages, p + 1))}
          />
        </EditorialSection>
      </div>
    </PageContainer>
  );
};
