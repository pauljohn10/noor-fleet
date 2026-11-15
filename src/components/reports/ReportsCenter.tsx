import React, { useState } from 'react';
import { FileText, Download, Printer, Eye, Truck, Wrench, Package, CalendarCheck, Flame } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { exportToPDFReport, triggerPrint } from '../../lib/exportUtils';
import { Modal } from '../common/Modal';
import {
  PageContainer,
  PageHeader,
  StatusTabs,
  DataTable,
  DataRow,
  TableFooter,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  RowAction,
  StatusText,
  EDITORIAL_STATUS,
} from '../common/EditorialUI';

export const ReportsCenter: React.FC = () => {
  const { vehicles, trailers, drivers, workOrders, parts, documents, schedules, fuelTransactions } = useFleet();
  const { t, isRTL } = useI18n();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'FLEET' | 'MAINTENANCE' | 'COMPLIANCE'>('ALL');

  const reportCards = [
    {
      id: 'fleet-summary',
      title: t('Fleet & Tanker Summary Master Audit'),
      description: t('Comprehensive audit on tractor heads, coupled fuel trailers, current odometers, and operational statuses.'),
      icon: <Truck style={{ width: 18, height: 18, color: '#0F5C4D' }} />
    },
    {
      id: 'workshop-summary',
      title: t('Workshop Job Cards & Cost Audit'),
      description: t('Complete breakdown of work orders, repair priorities, parts costs, labor hours, and total maintenance expenditure.'),
      icon: <Wrench style={{ width: 18, height: 18, color: '#1E40AF' }} />
    },
    {
      id: 'parts-consumption',
      title: t('Spare Parts Storehouse & Inventory Valuation'),
      description: t('Stock valuation, low stock SKU reorder alerts, and spare parts billed to maintenance job cards.'),
      icon: <Package style={{ width: 18, height: 18, color: '#5B21B6' }} />
    },
    {
      id: 'document-expiry',
      title: t('Vehicle Permits & Istimara Compliance Audit'),
      description: t('Audit of vehicle registrations (Istimara), insurance policies, hydrostatic certificates, and Aramco gate permits.'),
      icon: <FileText style={{ width: 18, height: 18, color: '#991B1B' }} />
    },
    {
      id: 'pm-audit',
      title: t('Preventive Maintenance Service Due Report'),
      description: t('Audit of upcoming, due, and overdue scheduled services across tractors and fuel tanker trailers.'),
      icon: <CalendarCheck style={{ width: 18, height: 18, color: '#0F5C4D' }} />
    },
    {
      id: 'trips-fuel',
      title: t('Commercial Trips & Fuel Expense Audit'),
      description: t('Dispatch trips, diesel liters dispensed, fuel station invoicing, and fuel cost reconciliation audit.'),
      icon: <Flame style={{ width: 18, height: 18, color: '#92400E' }} />
    }
  ];

  const handleGeneratePDF = (reportId: string) => {
    const dateLocale = isRTL ? 'ar-SA-u-ca-gregory' : 'en-US';

    if (reportId === 'fleet-summary') {
      const headers = [
        t('Vehicle ID'),
        t('Plate Number'),
        t('Fleet #'),
        t('Make & Model'),
        t('Coupled Trailer'),
        t('Station Location'),
        t('Odometer'),
        t('Operational Status')
      ];
      const rows = vehicles.map(v => {
        const trl = trailers.find(tr => tr.id === v.assigned_trailer_id);
        return [
          v.vehicle_id,
          v.plate_number,
          v.fleet_number || t('N/A'),
          `${v.make} ${v.model}`,
          trl ? `${trl.trailer_id} (${trl.plate_number})` : t('Uncoupled'),
          v.station_location || t('Dammam'),
          `${(v.current_mileage || 0).toLocaleString()} ${t('KM')}`,
          t(v.status.replace(/_/g, ' '))
        ];
      });

      const activeCount = vehicles.filter(v => v.status === 'AVAILABLE' || v.status === 'ON_TRIP').length;
      const workshopCount = vehicles.filter(v => v.status === 'IN_WORKSHOP' || v.status === 'OUT_OF_SERVICE').length;

      exportToPDFReport(
        t('Al-Noor Fleet & Tanker Summary Master Audit'),
        headers,
        rows,
        'Fleet_Master_Audit_Report',
        {
          orientation: 'landscape',
          subtitle: t('Executive Heavy Vehicle Fleet Status, Trailer Coupling Matrix & Odometer Ledger'),
          summaryKPIs: [
            { label: t('Total Tractor Heads'), value: vehicles.length, color: 'slate' },
            { label: t('Active & Operating'), value: activeCount, color: 'emerald' },
            { label: t('In Maintenance / OOS'), value: workshopCount, color: workshopCount > 0 ? 'rose' : 'emerald' }
          ]
        }
      );
    }

    if (reportId === 'workshop-summary') {
      const headers = [
        t('WO #'),
        t('Vehicle Unit'),
        t('Priority'),
        t('Workflow Status'),
        t('Reported Date'),
        t('Parts Cost'),
        t('Labor Cost'),
        t('External Cost'),
        t('Total Cost')
      ];
      const rows = workOrders.map(w => {
        const veh = vehicles.find(v => v.id === w.vehicle_id);
        return [
          w.work_order_number,
          veh ? `${veh.vehicle_id} (${veh.plate_number})` : t('N/A'),
          t(w.priority),
          t(w.status.replace(/_/g, ' ')),
          new Date(w.date_reported).toLocaleDateString(dateLocale),
          `${(w.parts_cost || 0).toLocaleString()} ${t('SAR')}`,
          `${(w.labor_cost || 0).toLocaleString()} ${t('SAR')}`,
          `${(w.external_service_cost || 0).toLocaleString()} ${t('SAR')}`,
          `${(w.total_cost || 0).toLocaleString()} ${t('SAR')}`
        ];
      });

      const totalExpense = workOrders.reduce((sum, w) => sum + (w.total_cost || 0), 0);
      const criticalCount = workOrders.filter(w => w.priority === 'CRITICAL').length;

      exportToPDFReport(
        t('Al-Noor Workshop Work Order & Maintenance Cost Audit'),
        headers,
        rows,
        'Workshop_Cost_Audit_Report',
        {
          orientation: 'landscape',
          subtitle: t('Central Maintenance Workshop Repair Records, Labor Billing & Spare Parts Consumption Ledger'),
          summaryKPIs: [
            { label: t('Total Work Orders'), value: workOrders.length, color: 'slate' },
            { label: t('Cumulative Cost'), value: `${(totalExpense || 0).toLocaleString()} ${t('SAR')}`, color: 'emerald' },
            { label: t('Critical Repairs'), value: criticalCount, color: criticalCount > 0 ? 'rose' : 'emerald' }
          ]
        }
      );
    }

    if (reportId === 'parts-consumption') {
      const headers = [
        t('Part Number'),
        t('Part Name & Specification'),
        t('Warehouse Rack'),
        t('Current Stock'),
        t('Min Stock'),
        t('Unit Cost'),
        t('Stock Valuation')
      ];
      const rows = parts.map(p => [
        p.part_number,
        p.part_name,
        p.location_rack || t('Main Store'),
        `${p.current_stock} ${t(p.unit)}`,
        `${p.minimum_stock} ${t(p.unit)}`,
        `${(p.unit_cost || 0).toLocaleString()} ${t('SAR')}`,
        `${((p.current_stock || 0) * (p.unit_cost || 0)).toLocaleString()} ${t('SAR')}`
      ]);

      const totalVal = parts.reduce((sum, p) => sum + ((p.current_stock || 0) * (p.unit_cost || 0)), 0);
      const lowStockCount = parts.filter(p => p.current_stock <= p.minimum_stock).length;

      exportToPDFReport(
        t('Al-Noor Spare Parts Storehouse & Inventory Valuation'),
        headers,
        rows,
        'Inventory_Valuation_Report',
        {
          orientation: 'landscape',
          subtitle: t('Central Workshop Spare Parts Inventory Valuation & Reorder Point Status'),
          summaryKPIs: [
            { label: t('Total Catalog SKUs'), value: parts.length, color: 'slate' },
            { label: t('Total Store Valuation'), value: `${(totalVal || 0).toLocaleString()} ${t('SAR')}`, color: 'emerald' },
            { label: t('Low Stock Alerts'), value: lowStockCount, color: lowStockCount > 0 ? 'amber' : 'emerald' }
          ]
        }
      );
    }

    if (reportId === 'document-expiry') {
      const headers = [
        t('Document Type'),
        t('Document #'),
        t('Associated Unit'),
        t('Issuing Authority'),
        t('Issue Date'),
        t('Expiry Date'),
        t('Status')
      ];
      const rows = documents.map(d => {
        const veh = vehicles.find(v => v.id === d.vehicle_id);
        const trl = trailers.find(tr => tr.id === d.trailer_id);
        const expDate = new Date(d.expiry_date);
        const now = new Date();
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const st = diffDays < 0 ? t('EXPIRED') : diffDays <= 30 ? t('EXPIRING SOON') : t('VALID');

        return [
          t(d.document_type),
          d.document_number,
          veh ? `${veh.vehicle_id} (${veh.plate_number})` : trl ? `${trl.trailer_id} (${trl.plate_number})` : t('Fleet Master'),
          d.issuing_authority || t('Saudi Traffic Dept.'),
          d.issue_date || t('N/A'),
          d.expiry_date,
          st
        ];
      });

      const expiredCount = documents.filter(d => new Date(d.expiry_date) < new Date()).length;
      const validCount = documents.length - expiredCount;

      exportToPDFReport(
        t('Al-Noor Vehicle Permits & Istimara Compliance Audit'),
        headers,
        rows,
        'Document_Compliance_Report',
        {
          orientation: 'landscape',
          subtitle: t('Official Saudi Traffic (Muroor), Saudi Aramco Terminal Loading & Civil Defense Certificates'),
          summaryKPIs: [
            { label: t('Total Permits'), value: documents.length, color: 'slate' },
            { label: t('Compliant & Valid'), value: validCount, color: 'emerald' },
            { label: t('Expired / Action Req.'), value: expiredCount, color: expiredCount > 0 ? 'rose' : 'emerald' }
          ]
        }
      );
    }

    if (reportId === 'pm-audit') {
      const headers = [
        t('Schedule Title'),
        t('Unit Assigned'),
        t('Service Interval'),
        t('Last Service Odo'),
        t('Next Due Odo'),
        t('Next Due Date'),
        t('Status')
      ];
      const rows = schedules.map(s => {
        const veh = vehicles.find(v => v.id === s.vehicle_id);
        const trl = trailers.find(tr => tr.id === s.trailer_id);
        return [
          s.title,
          veh ? `${veh.vehicle_id} (${veh.plate_number})` : trl ? `${trl.trailer_id} (${trl.plate_number})` : t('Unassigned'),
          s.frequency_type === 'MILEAGE'
            ? (isRTL ? `كل ${(s.interval_value || 0).toLocaleString()} كم` : `Every ${(s.interval_value || 0).toLocaleString()} KM`)
            : (isRTL ? `كل ${s.interval_value || 0} يوم` : `Every ${s.interval_value || 0} Days`),
          s.last_service_mileage ? `${(s.last_service_mileage || 0).toLocaleString()} ${t('KM')}` : t('N/A'),
          s.next_due_mileage ? `${(s.next_due_mileage || 0).toLocaleString()} ${t('KM')}` : t('N/A'),
          s.next_due_date || t('N/A'),
          t(s.status.replace(/_/g, ' '))
        ];
      });

      const overdueCount = schedules.filter(s => s.status === 'OVERDUE').length;
      const dueCount = schedules.filter(s => s.status === 'DUE' || s.status === 'DUE_SOON').length;

      exportToPDFReport(
        t('Preventive Maintenance Service Due Audit'),
        headers,
        rows,
        'PM_Service_Due_Report',
        {
          orientation: 'landscape',
          subtitle: t('Routine Preventive Maintenance Intervals, Target Odometers & Due Dates'),
          summaryKPIs: [
            { label: t('Total PM Schedules'), value: schedules.length, color: 'slate' },
            { label: t('Overdue Services'), value: overdueCount, color: overdueCount > 0 ? 'rose' : 'emerald' },
            { label: t('Due / Due Soon'), value: dueCount, color: dueCount > 0 ? 'amber' : 'emerald' }
          ]
        }
      );
    }

    if (reportId === 'trips-fuel') {
      const headers = [
        t('Date'),
        t('Vehicle ID'),
        t('Driver'),
        t('Station / City'),
        t('Fuel Type'),
        t('Liters'),
        t('Cost / Liter'),
        t('Total Amount (SAR)'),
        t('Payment')
      ];
      const rows = fuelTransactions.map(f => {
        const veh = vehicles.find(v => v.id === f.vehicle_id);
        const drv = drivers.find(d => d.id === f.driver_id);
        return [
          new Date(f.transaction_date).toLocaleDateString(dateLocale),
          veh ? `${veh.vehicle_id} (${veh.plate_number})` : t('N/A'),
          drv ? drv.full_name : t('Unassigned'),
          `${f.fuel_station_name} (${f.station_city})`,
          t(f.fuel_type || 'Diesel'),
          `${(f.liters_dispensed || 0).toLocaleString()} ${t('L')}`,
          `${(f.unit_cost || 0).toFixed(2)} ${t('SAR')}`,
          `${(f.total_cost || 0).toLocaleString()} ${t('SAR')}`,
          t(f.payment_method.replace(/_/g, ' '))
        ];
      });

      const totalLiters = fuelTransactions.reduce((acc, f) => acc + (f.liters_dispensed || 0), 0);
      const totalFuelCost = fuelTransactions.reduce((acc, f) => acc + (f.total_cost || 0), 0);

      exportToPDFReport(
        t('Commercial Trips & Fuel Expense Audit Report'),
        headers,
        rows,
        'Fuel_Expense_Audit_Report',
        {
          orientation: 'landscape',
          subtitle: t('Fleet Fuel Transactions, Terminal Dispenser Invoices & Consumption Ledger'),
          summaryKPIs: [
            { label: t('Fuel Invoices'), value: fuelTransactions.length, color: 'slate' },
            { label: t('Total Liters'), value: `${(totalLiters || 0).toLocaleString()} ${t('L')}`, color: 'sky' },
            { label: t('Total Fuel Expense'), value: `${(totalFuelCost || 0).toLocaleString()} ${t('SAR')}`, color: 'emerald' }
          ]
        }
      );
    }
  };

  const reportMeta: Record<string, { category: 'FLEET' | 'MAINTENANCE' | 'COMPLIANCE'; moduleLabel: string; records: number; stripe: string }> = {
    'fleet-summary': {
      category: 'FLEET',
      moduleLabel: isRTL ? 'الأسطول والمقطورات' : 'Fleet & Trailers',
      records: vehicles.length + trailers.length,
      stripe: EDITORIAL_STATUS.green.stripe,
    },
    'workshop-summary': {
      category: 'MAINTENANCE',
      moduleLabel: isRTL ? 'الورشة وأوامر العمل' : 'Workshop & WOs',
      records: workOrders.length,
      stripe: EDITORIAL_STATUS.amber.stripe,
    },
    'parts-consumption': {
      category: 'COMPLIANCE',
      moduleLabel: isRTL ? 'المخزن وقطع الغيار' : 'Spare Parts Store',
      records: parts.length,
      stripe: EDITORIAL_STATUS.blue.stripe,
    },
    'document-expiry': {
      category: 'COMPLIANCE',
      moduleLabel: isRTL ? 'التصاريح والوثائق' : 'Permits & Documents',
      records: documents.length,
      stripe: EDITORIAL_STATUS.red.stripe,
    },
    'pm-audit': {
      category: 'MAINTENANCE',
      moduleLabel: isRTL ? 'الصيانة الوقائية' : 'Preventive Maint.',
      records: schedules.length,
      stripe: EDITORIAL_STATUS.amber.stripe,
    },
    'trips-fuel': {
      category: 'FLEET',
      moduleLabel: isRTL ? 'الرحلات والوقود' : 'Trips & Fuel',
      records: fuelTransactions.length,
      stripe: EDITORIAL_STATUS.blue.stripe,
    },
  };

  const filteredReports = reportCards.filter(card => {
    const meta = reportMeta[card.id];
    const matchesCategory = categoryFilter === 'ALL' || meta?.category === categoryFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      card.title.toLowerCase().includes(q) ||
      card.description.toLowerCase().includes(q) ||
      (meta?.moduleLabel || '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'التقارير التنفيذية' : 'Enterprise Reports'}
            <br />
            {isRTL ? 'ومركز التصدير' : '& Export Center'}
          </>
        }
        subtitle={t('Generate official executive management reports with company header branding, timestamps, and export to PDF or Print.')}
        actions={
          <>
            <GhostButton onClick={() => handleGeneratePDF('fleet-summary')}>
              {isRTL ? 'تقرير PDF' : 'PDF report'}
            </GhostButton>
            <PrimaryButton onClick={triggerPrint}>
              {t('Print Active View')}
            </PrimaryButton>
          </>
        }
      />

      <StatusTabs
        tabs={[
          { key: 'ALL', label: isRTL ? 'الكل' : 'All', count: reportCards.length },
          {
            key: 'FLEET',
            label: isRTL ? 'الأسطول والرحلات' : 'Fleet & trips',
            count: reportCards.filter(r => reportMeta[r.id]?.category === 'FLEET').length,
            stripe: EDITORIAL_STATUS.green.stripe,
          },
          {
            key: 'MAINTENANCE',
            label: isRTL ? 'الورشة والصيانة' : 'Maintenance',
            count: reportCards.filter(r => reportMeta[r.id]?.category === 'MAINTENANCE').length,
            stripe: EDITORIAL_STATUS.amber.stripe,
          },
          {
            key: 'COMPLIANCE',
            label: isRTL ? 'المخزن والوثائق' : 'Inventory & permits',
            count: reportCards.filter(r => reportMeta[r.id]?.category === 'COMPLIANCE').length,
            stripe: EDITORIAL_STATUS.blue.stripe,
          },
        ]}
        activeKey={categoryFilter}
        onChange={k => setCategoryFilter(k as 'ALL' | 'FLEET' | 'MAINTENANCE' | 'COMPLIANCE')}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={isRTL ? 'بحث في التقارير...' : 'Search report title, module, scope...'}
      />

      <DataTable
        columns={[
          { label: isRTL ? 'اسم التقرير' : 'Report title', align: 'start', width: '26%' },
          { label: isRTL ? 'القسم' : 'Module', align: 'start', width: '16%' },
          { label: isRTL ? 'النطاق والوصف' : 'Scope and description', align: 'start', width: '34%' },
          { label: isRTL ? 'عدد السجلات' : 'Records', align: 'start', width: '12%' },
          { label: isRTL ? 'الصيغة' : 'Format', align: 'start', width: '12%' },
        ]}
        isEmpty={filteredReports.length === 0}
        emptyMessage={isRTL ? 'لا توجد تقارير مطابقة للبحث' : 'No reports match query'}
        onClearFilters={() => {
          setSearch('');
          setCategoryFilter('ALL');
        }}
      >
        {filteredReports.map(card => {
          const meta = reportMeta[card.id] || {
            category: 'FLEET',
            moduleLabel: 'Fleet',
            records: 0,
            stripe: EDITORIAL_STATUS.green.stripe,
          };
          return (
            <DataRow
              key={card.id}
              stripeColor={meta.stripe}
              onClick={() => setSelectedReport(card.id)}
              actions={
                <>
                  <RowAction
                    icon={<Eye size={14} />}
                    title={t('Preview')}
                    onClick={() => setSelectedReport(card.id)}
                  />
                  <RowAction
                    icon={<Download size={14} />}
                    title={t('Download PDF')}
                    onClick={() => handleGeneratePDF(card.id)}
                  />
                </>
              }
            >
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)' }}>{card.title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }} dir="ltr">
                  {card.id}
                </div>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: 13, color: 'var(--color-ink)', fontWeight: 500 }}>
                {meta.moduleLabel}
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                {card.description}
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink)' }}>
                <span dir="ltr">{meta.records.toLocaleString()}</span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText label={isRTL ? 'PDF معتمد' : 'PDF report'} color={EDITORIAL_STATUS.green.text} />
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${filteredReports.length} من ${reportCards.length} تقارير`
            : `${filteredReports.length} of ${reportCards.length} reports`
        }
      />

      {/* Preview Modal */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title={t('Report Executive Preview')}
          maxWidth="4xl"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12.5 }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-ink)' }}>{t('AL-NOOR UNITED TRANSPORT EST.')}</h1>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>{t('Fuel Tanker & Fleet Operations Management System')}</p>
              </div>
              <div style={{ textAlign: 'end', fontSize: 12, color: 'var(--color-text-muted)' }}>
                <p style={{ margin: 0 }}>{t('Generated')}: <span dir="ltr">{new Date().toLocaleString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US')}</span></p>
                <p style={{ margin: '3px 0 0', fontWeight: 600, color: '#166534' }}>{t('Certified System Report')}</p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)' }}>
              {reportCards.find(r => r.id === selectedReport)?.title}
            </p>

            <div style={{ padding: 14, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4 }}>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 12.5 }}>
                {t('This report is compiled automatically using synchronized records from the Supabase PostgreSQL database.')}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <SecondaryButton onClick={() => setSelectedReport(null)}>
                {t('Cancel')}
              </SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  handleGeneratePDF(selectedReport);
                  setSelectedReport(null);
                }}
              >
                <Download style={{ width: 14, height: 14 }} />
                <span>{t('Download PDF Document')}</span>
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
};
