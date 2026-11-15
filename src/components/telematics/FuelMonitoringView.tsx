import React, { useState } from 'react';
import {
  Flame,
  Plus,
  Info,
  FileText,
  Download,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { Modal } from '../common/Modal';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { useTablePagination } from '../../lib/supabasePagination';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  StatusTabs,
  EditorialSelect,
  DataTable,
  DataRow,
  PlateChip,
  StatusText,
  TableFooter,
  MetricStrip,
  EDITORIAL_STATUS,
} from '../common/EditorialUI';

export const FuelMonitoringView: React.FC = () => {
  const {
    vehicles,
    drivers,
    fuelTransactions,
    fuelBenchmarks,
    tripReconciliations,
    addFuelTransaction,
  } = useFleet();
  const { t, isRTL } = useI18n();

  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'RECONCILIATION' | 'BENCHMARKS'>('TRANSACTIONS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [stationName, setStationName] = useState('Petromin Station #104 - Dammam Highway');
  const [stationCity, setStationCity] = useState('Dammam');
  const [liters, setLiters] = useState('350');
  const [unitCost, setUnitCost] = useState('1.15');
  const [odometer, setOdometer] = useState('142580');
  const [paymentMethod, setPaymentMethod] = useState<'PETROMIN_CARD' | 'ARAMCO_BULK_DISPENSER' | 'COMPANY_FLEET_CARD'>('PETROMIN_CARD');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [isFullTank] = useState(true);

  const totalLiters = fuelTransactions.reduce((acc, f) => acc + f.liters_dispensed, 0);
  const totalCost = fuelTransactions.reduce((acc, f) => acc + f.total_cost, 0);
  const abnormalAlertsCount = tripReconciliations.filter(r => r.has_abnormal_variance).length;

  const handleRecordFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const l = Number(liters) || 100;
    const p = Number(unitCost) || 1.15;

    addFuelTransaction({
      vehicle_id: vehicleId,
      driver_id: driverId,
      transaction_date: new Date().toISOString(),
      fuel_station_name: stationName,
      station_city: stationCity,
      fuel_type: 'Diesel',
      liters_dispensed: l,
      unit_cost: p,
      total_cost: +(l * p).toFixed(2),
      odometer_at_fueling: Number(odometer) || 140000,
      is_full_tank: isFullTank,
      payment_method: paymentMethod,
      invoice_reference: invoiceRef || `INV-${Date.now().toString().slice(-6)}`,
      is_verified: true,
    });

    setIsModalOpen(false);
  };

  const filteredTransactions = fuelTransactions.filter(f => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const veh = vehicles.find(v => v.id === f.vehicle_id);
    const drv = drivers.find(d => d.id === f.driver_id);
    return (
      f.transaction_number.toLowerCase().includes(q) ||
      f.fuel_station_name.toLowerCase().includes(q) ||
      (veh && veh.vehicle_id.toLowerCase().includes(q)) ||
      (veh && veh.plate_number.toLowerCase().includes(q)) ||
      (drv && drv.full_name.toLowerCase().includes(q))
    );
  });

  const {
    page: txPage,
    setPage: setTxPage,
    pageSize: txPageSize,
    setPageSize: setTxPageSize,
    totalPages: txTotalPages,
    pagedItems: pagedTransactions,
  } = useTablePagination(filteredTransactions, [searchQuery, activeTab], {
    table: 'fuel_transactions',
    orderBy: 'created_at',
    ascending: false,
    search: searchQuery,
    searchColumns: ['transaction_number', 'fuel_station_name'],
  });

  const {
    page: recPage,
    setPage: setRecPage,
    pageSize: recPageSize,
    setPageSize: setRecPageSize,
    totalPages: recTotalPages,
    pagedItems: pagedReconciliations,
  } = useTablePagination(tripReconciliations, [activeTab], {
    table: 'trip_fuel_reconciliations',
    orderBy: 'created_at',
    ascending: false,
  });

  const {
    page: bmPage,
    setPage: setBmPage,
    pageSize: bmPageSize,
    setPageSize: setBmPageSize,
    totalPages: bmTotalPages,
    pagedItems: pagedBenchmarks,
  } = useTablePagination(fuelBenchmarks, [activeTab], {
    table: 'vehicle_fuel_benchmarks',
    orderBy: 'created_at',
    ascending: false,
  });

  const handleExportExcel = () => {
    const data = filteredTransactions.map(f => {
      const veh = vehicles.find(v => v.id === f.vehicle_id);
      const drv = drivers.find(d => d.id === f.driver_id);
      return {
        [t('Transaction #')]: f.transaction_number,
        [t('Date')]: new Date(f.transaction_date).toLocaleDateString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US'),
        [t('Vehicle ID')]: veh ? `${veh.vehicle_id} (${veh.plate_number})` : t('N/A'),
        [t('Driver')]: drv ? drv.full_name : t('Unassigned'),
        [t('Station')]: `${f.fuel_station_name} (${f.station_city})`,
        [t('Fuel Type')]: t(f.fuel_type),
        [t('Liters Dispensed')]: f.liters_dispensed,
        [t('Unit Cost (SAR)')]: f.unit_cost,
        [t('Total Cost (SAR)')]: f.total_cost,
        [t('Odometer')]: f.odometer_at_fueling,
        [t('Payment Method')]: t(f.payment_method.replace(/_/g, ' ')),
      };
    });
    exportToExcel(data, 'Fuel_Dispense_Transactions');
  };

  const handleExportPDF = () => {
    const headers = [
      t('Txn #'),
      t('Date'),
      t('Vehicle Unit'),
      t('Driver'),
      t('Fuel Station / City'),
      t('Liters'),
      t('Cost / L'),
      t('Total (SAR)'),
      t('Payment'),
    ];
    const rows = filteredTransactions.map(f => {
      const veh = vehicles.find(v => v.id === f.vehicle_id);
      const drv = drivers.find(d => d.id === f.driver_id);
      return [
        f.transaction_number,
        new Date(f.transaction_date).toLocaleDateString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US'),
        veh ? `${veh.vehicle_id} (${veh.plate_number})` : t('N/A'),
        drv ? drv.full_name : t('Unassigned'),
        `${f.fuel_station_name} (${f.station_city})`,
        `${(f.liters_dispensed || 0).toLocaleString()} ${t('L')}`,
        `${(f.unit_cost || 0).toFixed(2)} ${t('SAR')}`,
        `${(f.total_cost || 0).toLocaleString()} ${t('SAR')}`,
        t(f.payment_method.replace(/_/g, ' ')),
      ];
    });

    const sumLiters = filteredTransactions.reduce((acc, f) => acc + f.liters_dispensed, 0);
    const sumCost = filteredTransactions.reduce((acc, f) => acc + f.total_cost, 0);
    const activeTabLabel =
      activeTab === 'TRANSACTIONS'
        ? t('Fuel Transactions')
        : activeTab === 'RECONCILIATION'
          ? t('Trip Reconciliations')
          : t('Vehicle Consumption Baselines');

    exportToPDFReport(
      t('Commercial Fuel Consumption & Dispensing Audit'),
      headers,
      rows,
      'Fuel_Transactions_Report',
      {
        orientation: 'landscape',
        subtitle: t('Fleet Diesel Dispense Receipts, Odometer Readings & Commercial Fuel Station Billing'),
        summaryKPIs: [
          { label: t('Total Invoices'), value: filteredTransactions.length, color: 'slate' },
          { label: t('Total Volume'), value: `${(sumLiters || 0).toLocaleString()} ${t('L')}`, color: 'sky' },
          { label: t('Total Fuel Expense'), value: `${(sumCost || 0).toLocaleString()} ${t('SAR')}`, color: 'emerald' },
        ],
        metadata: [
          { label: t('Active Tab'), value: activeTabLabel },
          {
            label: t('Export Scope'),
            value: isRTL ? `${filteredTransactions.length} ظ…ط¹ط§ظ…ظ„ط© ظ…ط¯ط±ط¬ط©` : `${filteredTransactions.length} transactions listed`,
          },
        ],
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'ط§ط³طھظ‡ظ„ط§ظƒ ط§ظ„ظˆظ‚ظˆط¯' : 'Fuel Consumption'}
            <br />
            {isRTL ? 'ظˆظ…ط±ط§ط¬ط¹ط© ط§ظ„ظپط±ظˆظ‚ط§طھ' : '& Variance Audit'}
          </>
        }
        subtitle={t('Audit fuel dispensing transactions, monitor consumption benchmarks, and reconcile GPS road distance.')}
        actions={
          <>
            <GhostButton onClick={handleExportExcel} title={t('Export to Excel')}>
              {t('Excel')}
            </GhostButton>
            <GhostButton onClick={handleExportPDF} title={t('Export to PDF')}>
              {isRTL ? 'طھظ‚ط±ظٹط± PDF' : 'PDF report'}
            </GhostButton>
            <PrimaryButton onClick={() => setIsModalOpen(true)}>
              {isRTL ? `+ ${t('Log Fuel Dispense')}` : '+ Log fuel dispense'}
            </PrimaryButton>
          </>
        }
      />

      <StatusTabs
        tabs={[
          { key: 'TRANSACTIONS', label: t('Fuel Transactions'), count: fuelTransactions.length, stripe: EDITORIAL_STATUS.green.stripe },
          { key: 'RECONCILIATION', label: t('Trip Reconciliations'), count: tripReconciliations.length, stripe: EDITORIAL_STATUS.blue.stripe },
          { key: 'BENCHMARKS', label: t('Vehicle Consumption Baselines'), count: fuelBenchmarks.length, stripe: EDITORIAL_STATUS.amber.stripe },
        ]}
        activeKey={activeTab}
        onChange={key => setActiveTab(key as 'TRANSACTIONS' | 'RECONCILIATION' | 'BENCHMARKS')}
        searchValue={activeTab === 'TRANSACTIONS' ? searchQuery : undefined}
        onSearchChange={activeTab === 'TRANSACTIONS' ? setSearchQuery : undefined}
        searchPlaceholder={t('Search transaction, truck, station...')}
      />

      {/* Tab 1: Fuel Transactions */}
      {activeTab === 'TRANSACTIONS' && (
        <div>
          <DataTable
            columns={[
              { label: t('Transaction #') },
              { label: t('Vehicle & Plate') },
              { label: t('Station & Location') },
              { label: t('Volume (Liters)') },
              { label: t('Total Cost (SAR)') },
              { label: t('Odometer at Fueling') },
              { label: t('Payment Method') },
              { label: t('Verification'), align: 'end' },
            ]}
            isEmpty={filteredTransactions.length === 0}
            emptyMessage={t('No matching transactions found')}
            onClearFilters={searchQuery ? () => setSearchQuery('') : undefined}
            clearFiltersLabel={t('Clear filters')}
            hasActionsColumn={false}
          >
            {pagedTransactions.map(tx => {
              const veh = vehicles.find(v => v.id === tx.vehicle_id);

              return (
                <DataRow key={tx.id} stripeColor={EDITORIAL_STATUS.green.stripe}>
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }} dir="ltr">
                      {tx.transaction_number}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }} dir="ltr">
                      {new Date(tx.transaction_date).toLocaleDateString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US')}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {veh?.plate_number ? (
                        <PlateChip plate={veh.plate_number} accentColor={EDITORIAL_STATUS.green.stripe} />
                      ) : null}
                      <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--color-ink)' }} dir="ltr">
                        {veh?.vehicle_id || 'â€”'}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>{tx.fuel_station_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{tx.station_city}</div>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                    <span dir="ltr">{tx.liters_dispensed.toFixed(1)}</span> {t('L')}
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                    <span dir="ltr">{tx.total_cost.toFixed(2)}</span> {t('SAR')}
                    <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', fontWeight: 400 }} dir="ltr">
                      @{tx.unit_cost.toFixed(2)} /{t('L')}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    <span dir="ltr">{(tx.odometer_at_fueling || 0).toLocaleString()}</span> {t('KM')}
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                    {t(tx.payment_method.replace(/_/g, ' '))}
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                    <StatusText label={t('Verified')} color={EDITORIAL_STATUS.green.text} />
                  </td>
                </DataRow>
              );
            })}
          </DataTable>

          <TableFooter
            summaryText={`${t('Dispensing Receipts & Invoices')}: ${filteredTransactions.length} / ${fuelTransactions.length}`}
            page={txPage}
            totalPages={txTotalPages}
            pageSize={txPageSize}
            totalRecords={filteredTransactions.length}
            onPageChange={setTxPage}
            onPageSizeChange={setTxPageSize}
            onPrev={() => setTxPage(p => Math.max(1, p - 1))}
            onNext={() => setTxPage(p => Math.min(txTotalPages, p + 1))}
          />
        </div>
      )}

      {/* Tab 2: Trip Reconciliations */}
      {activeTab === 'RECONCILIATION' && (
        <div>
          <DataTable
            columns={[
              { label: t('Trip ID') },
              { label: t('Vehicle') },
              { label: t('Audited Distance') },
              { label: t('Benchmark Rate') },
              { label: t('Theoretical Fuel') },
              { label: t('Actual Consumed') },
              { label: t('Variance') },
              { label: t('Status'), align: 'end' },
            ]}
            isEmpty={tripReconciliations.length === 0}
            emptyMessage={t('No trip reconciliations recorded yet.')}
            hasActionsColumn={false}
          >
            {pagedReconciliations.map(rec => {
              const veh = vehicles.find(v => v.id === rec.vehicle_id);
              const isApproved = rec.reconciliation_status === 'APPROVED';
              const tone = isApproved ? EDITORIAL_STATUS.green : EDITORIAL_STATUS.red;

              return (
                <DataRow key={rec.id} stripeColor={tone.stripe}>
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }} dir="ltr">
                    {rec.trip_id}
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {veh?.plate_number ? (
                        <PlateChip plate={veh.plate_number} accentColor={tone.stripe} />
                      ) : null}
                      <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--color-ink)' }} dir="ltr">{veh?.vehicle_id}</span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink)' }}>
                    <span dir="ltr">{rec.distance_used_km.toFixed(1)}</span> {t('KM')}
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                    <span dir="ltr">{rec.benchmark_liters_per_100km.toFixed(1)}</span> {t('L/100km')}
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                    <span dir="ltr">{rec.estimated_fuel_liters.toFixed(1)}</span> {t('L')}
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                    <span dir="ltr">{rec.actual_fuel_consumed_liters.toFixed(1)}</span> {t('L')}
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <span
                      dir="ltr"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        fontSize: 12.5,
                        color: rec.has_abnormal_variance ? EDITORIAL_STATUS.red.text : 'var(--color-ink)',
                      }}
                    >
                      {rec.variance_liters > 0 ? `+${rec.variance_liters.toFixed(1)}` : rec.variance_liters.toFixed(1)} L ({rec.variance_percentage?.toFixed(1)}%)
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                    <StatusText label={t(rec.reconciliation_status.replace(/_/g, ' '))} color={tone.text} />
                  </td>
                </DataRow>
              );
            })}
          </DataTable>
          <TableFooter
            summaryText={`${t('Trip Reconciliations')}: ${tripReconciliations.length}`}
            page={recPage}
            totalPages={recTotalPages}
            pageSize={recPageSize}
            totalRecords={tripReconciliations.length}
            onPageChange={setRecPage}
            onPageSizeChange={setRecPageSize}
            onPrev={() => setRecPage(p => Math.max(1, p - 1))}
            onNext={() => setRecPage(p => Math.min(recTotalPages, p + 1))}
          />
        </div>
      )}

      {/* Tab 3: Benchmarks */}
      {activeTab === 'BENCHMARKS' && (
        <div>
          <DataTable
            columns={[
              { label: isRTL ? 'ط§ظ„طµظ†ط¹ ظˆط§ظ„ظ…ظˆط¯ظٹظ„' : 'Make and model', align: 'start' },
              { label: isRTL ? 'ط§ظ„ظپط¦ط©' : 'Configuration', align: 'start' },
              { label: isRTL ? 'ط§ظ„ط¹ظˆط¯ط© ظپط§ط±ط؛ط©' : 'Empty return', align: 'start' },
              { label: isRTL ? 'ظ…ط­ظ…ظ„ ط¨ط§ظ„ظˆظ‚ظˆط¯' : 'Loaded tanker', align: 'start' },
              { label: isRTL ? 'ظ…ط¶ط®ط© PTO' : 'PTO pump', align: 'start' },
              { label: isRTL ? 'ظ…ط¹ط§ظ…ظ„ ط§ظ„طھظƒظٹظٹظپ ط§ظ„طµظٹظپظٹ' : 'Summer A/C penalty', align: 'start' },
            ]}
            isEmpty={fuelBenchmarks.length === 0}
            emptyMessage={t('No benchmarks configured')}
            hasActionsColumn={false}
          >
            {pagedBenchmarks.map(bm => (
              <DataRow key={bm.id} stripeColor={EDITORIAL_STATUS.amber.stripe}>
                <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontWeight: 600, fontSize: 14, color: 'var(--color-ink)' }}>
                  {bm.make} {bm.model}
                </td>
                <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {t('Tractor Head (6x4)')}
                </td>
                <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink)' }}>
                  <span dir="ltr">{bm.empty_consumption_liters_per_100km}</span> {t('L/100km')}
                </td>
                <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink)' }}>
                  <span dir="ltr">{bm.loaded_consumption_liters_per_100km}</span> {t('L/100km')}
                </td>
                <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink)' }}>
                  <span dir="ltr">{bm.pto_pumping_consumption_liters_per_hour || 4.5}</span> {t('L/Hour')}
                </td>
                <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink)' }} dir="ltr">
                  +{bm.ac_summer_penalty_percentage || 8}%
                </td>
              </DataRow>
            ))}
          </DataTable>
          <TableFooter
            summaryText={`${t('Vehicle Consumption Baselines')}: ${fuelBenchmarks.length}`}
            page={bmPage}
            totalPages={bmTotalPages}
            pageSize={bmPageSize}
            totalRecords={fuelBenchmarks.length}
            onPageChange={setBmPage}
            onPageSizeChange={setBmPageSize}
            onPrev={() => setBmPage(p => Math.max(1, p - 1))}
            onNext={() => setBmPage(p => Math.min(bmTotalPages, p + 1))}
          />
        </div>
      )}

      {/* Log Fuel Dispense Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={t('Log Fuel Dispensing Transaction')}
          subtitle={t('Record fuel ticket receipts, dispenser pump meter, and vehicle odometer readings.')}
          maxWidth="2xl"
        >
          <form onSubmit={handleRecordFuel} style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12.5 }}>
            <div style={{ padding: 14, borderRadius: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--color-row-divider)' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--color-ink)', color: 'var(--color-page-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>1</span>
                  {t('Vehicle, Driver & Station Details')}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{t('* Required fields')}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Tractor Vehicle')} <span style={{ color: '#991B1B' }}>*</span>
                  </label>
                  <EditorialSelect
                    width="100%"
                    value={vehicleId}
                    onChange={e => setVehicleId(e.target.value)}
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_id} ({v.plate_number})
                      </option>
                    ))}
                  </EditorialSelect>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Dispensing Driver')}
                  </label>
                  <EditorialSelect
                    width="100%"
                    value={driverId}
                    onChange={e => setDriverId(e.target.value)}
                  >
                    <option value="">{t('-- No Driver Logged --')}</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.employee_id})
                      </option>
                    ))}
                  </EditorialSelect>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Fuel Station Name')} <span style={{ color: '#991B1B' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('e.g. Petromin Highway 40 / Internal Depot')}
                    value={stationName}
                    onChange={e => setStationName(e.target.value)}
                    className="nf-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('City / Location')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('e.g. Dammam / Jubail')}
                    value={stationCity}
                    onChange={e => setStationCity(e.target.value)}
                    className="nf-field"
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--color-row-divider)' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--color-ink)', color: 'var(--color-page-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>2</span>
                  {t('Pump Meter, Volume & Billing')}
                </span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: EDITORIAL_STATUS.green.text }}>
                  {t('Total')}: <span dir="ltr">{(Number(liters || 0) * Number(unitCost || 0)).toFixed(2)}</span> {t('SAR')}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Liters Dispensed')} <span style={{ color: '#991B1B' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    dir="ltr"
                    value={liters}
                    onChange={e => setLiters(e.target.value)}
                    className="nf-field"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Unit Price (SAR/L)')} <span style={{ color: '#991B1B' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    dir="ltr"
                    value={unitCost}
                    onChange={e => setUnitCost(e.target.value)}
                    className="nf-field"
                    style={{ fontFamily: 'var(--font-mono)', color: EDITORIAL_STATUS.green.text }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Odometer at Pump (KM)')} <span style={{ color: '#991B1B' }}>*</span>
                  </label>
                  <input
                    type="number"
                    required
                    dir="ltr"
                    value={odometer}
                    onChange={e => setOdometer(e.target.value)}
                    className="nf-field"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Payment Method')}
                  </label>
                  <EditorialSelect
                    width="100%"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="PETROMIN_CARD">{t('Petromin Fleet Card')}</option>
                    <option value="ARAMCO_BULK_DISPENSER">{t('Aramco Bulk Internal Dispenser')}</option>
                    <option value="COMPANY_FLEET_CARD">{t('Company Credit Card')}</option>
                  </EditorialSelect>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Invoice / Receipt Reference')}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder={t('e.g. INV-PET-90412')}
                    value={invoiceRef}
                    onChange={e => setInvoiceRef(e.target.value)}
                    className="nf-field"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <SecondaryButton onClick={() => setIsModalOpen(false)}>
                {t('Cancel')}
              </SecondaryButton>
              <PrimaryButton type="submit">
                <Flame style={{ width: 14, height: 14 }} />
                <span>{t('Save Fuel Transaction')}</span>
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
};
