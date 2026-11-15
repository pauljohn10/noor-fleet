import React, { useState } from 'react';
import {
  Navigation,
  Plus,
  CheckCircle2,
  FileText,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { Trip, TripStatus } from '../../types';
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
  RowAction,
  PlateChip,
  StatusText,
  TableFooter,
  MetricStrip,
  EDITORIAL_STATUS,
} from '../common/EditorialUI';

export const TripManager: React.FC = () => {
  const {
    trips,
    vehicles,
    drivers,
    trailers,
    addTrip,
    updateTrip,
    reconcileTripFuel,
  } = useFleet();
  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();
  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TripStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // New Trip Form State
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [trailerId, setTrailerId] = useState(trailers[0]?.id || '');
  const [originName, setOriginName] = useState('Dammam Main Fuel Terminal Depot');
  const [destinationName, setDestinationName] = useState('Riyadh North Distribution Hub');
  const [cargoVolume, setCargoVolume] = useState('36000');
  const [cargoDescription, setCargoDescription] = useState('Diesel (Euro 5 Spec)');
  const [isLoaded, setIsLoaded] = useState(true);
  const [notes, setNotes] = useState('');

  const filteredTrips = trips.filter(tripItem => {
    if (statusFilter !== 'ALL' && tripItem.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const veh = vehicles.find(v => v.id === tripItem.vehicle_id);
      const drv = drivers.find(d => d.id === tripItem.assigned_driver_id);
      return (
        tripItem.trip_number.toLowerCase().includes(q) ||
        tripItem.origin_name.toLowerCase().includes(q) ||
        tripItem.destination_name.toLowerCase().includes(q) ||
        (veh && veh.vehicle_id.toLowerCase().includes(q)) ||
        (veh && veh.plate_number.toLowerCase().includes(q)) ||
        (drv && drv.full_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pagedItems: pagedTrips,
  } = useTablePagination(filteredTrips, [searchQuery, statusFilter], {
    table: 'trips',
    orderBy: 'created_at',
    ascending: false,
    search: searchQuery,
    searchColumns: ['trip_number', 'origin_name', 'destination_name'],
    eqFilters: { status: statusFilter },
  });

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const selVeh = vehicles.find(v => v.id === vehicleId);

    addTrip({
      vehicle_id: vehicleId,
      assigned_driver_id: driverId || undefined,
      assigned_trailer_id: trailerId || undefined,
      origin_name: originName,
      destination_name: destinationName,
      cargo_description: cargoDescription,
      cargo_volume_liters: Number(cargoVolume) || 36000,
      is_loaded_trip: isLoaded,
      planned_departure: new Date().toISOString(),
      actual_departure: new Date().toISOString(),
      start_odometer_km: selVeh?.current_mileage || 140000,
      gps_calculated_distance_km: 0,
      distance_calculation_method: 'GPS_HAVERSINE_SUMMATION',
      data_quality: 'HIGH_CONFIDENCE',
      status: 'IN_PROGRESS',
      notes: notes || 'Dispatched via Trip Manager',
    });

    setIsModalOpen(false);
    setNotes('');
  };

  const handleCompleteTrip = (trip: Trip) => {
    const endOdo = (trip.start_odometer_km || 140000) + Math.round(trip.gps_calculated_distance_km || 280);
    updateTrip(trip.id, {
      status: 'COMPLETED',
      actual_arrival: new Date().toISOString(),
      end_odometer_km: endOdo,
      final_distance_km: trip.gps_calculated_distance_km || 280,
      data_quality: 'HIGH_CONFIDENCE',
    });

    reconcileTripFuel(trip.id);
  };

  const getStatusMeta = (status: TripStatus) => {
    switch (status) {
      case 'IN_PROGRESS':
        return { label: t('IN PROGRESS'), tone: EDITORIAL_STATUS.green };
      case 'COMPLETED':
        return { label: t('COMPLETED'), tone: EDITORIAL_STATUS.blue };
      case 'PLANNED':
        return { label: t('PLANNED'), tone: EDITORIAL_STATUS.amber };
      case 'ARRIVED_AT_DESTINATION':
        return { label: t('ARRIVED'), tone: EDITORIAL_STATUS.blue };
      case 'CANCELLED':
        return { label: t('CANCELLED'), tone: EDITORIAL_STATUS.red };
      default:
        return { label: t(status.replace(/_/g, ' ')), tone: EDITORIAL_STATUS.muted };
    }
  };

  const handleExportExcel = () => {
    const data = filteredTrips.map(tripItem => {
      const veh = vehicles.find(v => v.id === tripItem.vehicle_id);
      const drv = drivers.find(d => d.id === tripItem.assigned_driver_id);
      const trl = trailers.find(tId => tId.id === tripItem.assigned_trailer_id);
      return {
        [t('Trip Number')]: tripItem.trip_number,
        [t('Vehicle Unit')]: veh ? `${veh.vehicle_id} (${veh.plate_number})` : t('N/A'),
        [t('Tanker Trailer')]: trl ? `${trl.trailer_id} (${trl.plate_number})` : t('N/A'),
        [t('Driver')]: drv ? drv.full_name : t('Unassigned'),
        [t('Origin')]: tripItem.origin_name,
        [t('Destination')]: tripItem.destination_name,
        [t('Cargo')]: `${tripItem.cargo_volume_liters || 0} ${t('L')} (${tripItem.cargo_description})`,
        [t('Distance (KM)')]: tripItem.final_distance_km || tripItem.gps_calculated_distance_km || 0,
        [t('Status')]: t(tripItem.status.replace(/_/g, ' ')),
      };
    });
    exportToExcel(data, 'Commercial_Trips_Dispatch');
  };

  const handleExportPDF = () => {
    const headers = [
      t('Trip #'),
      t('Vehicle Unit'),
      t('Tanker Trailer'),
      t('Driver'),
      t('Origin Depot'),
      t('Destination Hub'),
      t('Cargo Volume'),
      t('Distance'),
      t('Status'),
    ];
    const rows = filteredTrips.map(tripItem => {
      const veh = vehicles.find(v => v.id === tripItem.vehicle_id);
      const drv = drivers.find(d => d.id === tripItem.assigned_driver_id);
      const trl = trailers.find(tId => tId.id === tripItem.assigned_trailer_id);
      return [
        tripItem.trip_number,
        veh ? `${veh.vehicle_id} (${veh.plate_number})` : t('N/A'),
        trl ? `${trl.trailer_id} (${trl.plate_number})` : t('Uncoupled'),
        drv ? drv.full_name : t('Unassigned'),
        tripItem.origin_name,
        tripItem.destination_name,
        `${(tripItem.cargo_volume_liters || 0).toLocaleString()} ${t('L')}`,
        `${tripItem.final_distance_km || tripItem.gps_calculated_distance_km || 0} ${t('KM')}`,
        t(tripItem.status.replace(/_/g, ' ')),
      ];
    });

    const activeCount = trips.filter(tripItem => tripItem.status === 'IN_PROGRESS').length;
    const completedCount = trips.filter(tripItem => tripItem.status === 'COMPLETED').length;

    exportToPDFReport(
      t('Commercial Fuel Trips & Route Dispatch Register'),
      headers,
      rows,
      'Commercial_Trips_Report',
      {
        orientation: 'landscape',
        subtitle: t('Commercial Fleet Haulage Dispatches, GPS Route Distance & Destination Ledger'),
        summaryKPIs: [
          { label: t('Total Trips'), value: trips.length, color: 'slate' },
          { label: t('Active In Transit'), value: activeCount, color: 'emerald' },
          { label: t('Completed Deliveries'), value: completedCount, color: 'sky' },
        ],
        metadata: [
          { label: t('Status Filter'), value: statusFilter === 'ALL' ? t('All') : t(statusFilter.replace(/_/g, ' ')) },
          { label: t('Export Scope'), value: isRTL ? `${filteredTrips.length} رحلة مدرجة` : `${filteredTrips.length} trips listed` },
        ],
      }
    );
  };

  const activeCount = trips.filter(tItem => tItem.status === 'IN_PROGRESS').length;
  const completedCount = trips.filter(tItem => tItem.status === 'COMPLETED').length;
  const plannedCount = trips.filter(tItem => tItem.status === 'PLANNED').length;
  const totalDistance = trips.reduce(
    (acc, tripItem) => acc + (tripItem.final_distance_km || tripItem.gps_calculated_distance_km || 0),
    0
  );

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'الرحلات والمسارات' : 'Trip & Route'}
            <br />
            {isRTL ? 'وإدارة الإرسال' : 'Dispatch Management'}
          </>
        }
        subtitle={t('Dispatch fuel tanker trucks, calculate road distance, and verify odometer against GPS route history.')}
        actions={
          <>
            <GhostButton onClick={handleExportExcel} title={t('Export to Excel')}>
              {t('Excel')}
            </GhostButton>
            <GhostButton onClick={handleExportPDF} title={t('Export to PDF')}>
              {isRTL ? 'تقرير PDF' : 'PDF report'}
            </GhostButton>
            {canManage && (
              <PrimaryButton onClick={() => setIsModalOpen(true)}>
                {isRTL ? `+ ${t('Dispatch New Trip')}` : '+ Dispatch new trip'}
              </PrimaryButton>
            )}
          </>
        }
      />

      <StatusTabs
        tabs={[
          { key: 'ALL', label: t('All'), count: trips.length },
          { key: 'IN_PROGRESS', label: t('Active'), count: activeCount, stripe: EDITORIAL_STATUS.green.stripe },
          { key: 'PLANNED', label: t('Planned'), count: plannedCount, stripe: EDITORIAL_STATUS.amber.stripe },
          { key: 'COMPLETED', label: t('Completed'), count: completedCount, stripe: EDITORIAL_STATUS.blue.stripe },
        ]}
        activeKey={statusFilter}
        onChange={key => setStatusFilter(key as 'ALL' | TripStatus)}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('Search trip #, truck, driver...')}
      />

      <DataTable
        columns={[
          { label: t('Trip Number') },
          { label: t('Assigned Vehicle & Driver') },
          { label: t('Route Origin → Destination') },
          { label: t('Cargo & Payload') },
          { label: t('Distance Audit (KM)') },
          { label: t('Status') },
        ]}
        isEmpty={filteredTrips.length === 0}
        emptyMessage={t('No dispatches matched your search criteria.')}
        onClearFilters={
          searchQuery || statusFilter !== 'ALL'
            ? () => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }
            : undefined
        }
        clearFiltersLabel={t('Clear filters')}
      >
        {pagedTrips.map(trip => {
          const veh = vehicles.find(v => v.id === trip.vehicle_id);
          const drv = drivers.find(d => d.id === trip.assigned_driver_id);
          const trl = trailers.find(tr => tr.id === trip.assigned_trailer_id);
          const meta = getStatusMeta(trip.status);
          const dist = trip.final_distance_km || trip.gps_calculated_distance_km;

          return (
            <DataRow
              key={trip.id}
              stripeColor={meta.tone.stripe}
              actions={
                canManage ? (
                  <>
                    {trip.status === 'IN_PROGRESS' && (
                      <RowAction
                        icon={<CheckCircle2 style={{ width: 15, height: 15, color: EDITORIAL_STATUS.green.text }} />}
                        title={t('Mark Arrived')}
                        onClick={() => handleCompleteTrip(trip)}
                      />
                    )}
                    {trip.status === 'COMPLETED' && (
                      <RowAction
                        icon={<RefreshCw style={{ width: 14, height: 14 }} />}
                        title={t('Reconcile Fuel')}
                        onClick={() => reconcileTripFuel(trip.id)}
                      />
                    )}
                  </>
                ) : undefined
              }
            >
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }} dir="ltr">
                  {trip.trip_number}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }} dir="ltr">
                  {new Date(trip.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US')}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {veh?.plate_number ? (
                    <PlateChip plate={veh.plate_number} accentColor={meta.tone.stripe} />
                  ) : null}
                  <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--color-ink)' }} dir="ltr">
                    {veh?.vehicle_id || t('Unknown')}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  {t('Driver')}: {drv ? drv.full_name : t('Unassigned')}
                  {trl ? (
                    <span style={{ color: 'var(--color-text-muted)', marginInlineStart: 8 }}>
                      • {t('Trailer')}: <span dir="ltr">{trl.trailer_id} ({trl.plate_number})</span>
                    </span>
                  ) : null}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle', maxWidth: 260 }}>
                <div className="truncate" style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)' }} title={trip.origin_name}>
                  {t('From')}: {trip.origin_name}
                </div>
                <div className="truncate" style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }} title={trip.destination_name}>
                  {t('To')}: {trip.destination_name}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 7px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: trip.is_loaded_trip ? '#FFFBEB' : 'var(--color-page-bg)',
                    color: trip.is_loaded_trip ? '#92400E' : 'var(--color-text-secondary)',
                    border: `1px solid ${trip.is_loaded_trip ? '#FDE68A' : 'var(--color-border)'}`,
                  }}
                >
                  {trip.is_loaded_trip ? t('LOADED') : t('EMPTY RETURN')}
                </span>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                  <span dir="ltr">{(trip.cargo_volume_liters || 0).toLocaleString()}</span> {t('L')}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                  {dist ? <><span dir="ltr">{dist.toFixed(1)}</span> {t('KM')}</> : '--'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {t('Start Odo')}: <span dir="ltr">{(trip.start_odometer_km || 0).toLocaleString()}</span> {t('KM')}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText label={meta.label} color={meta.tone.text} />
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={`${t('Dispatched Trips Registry')}: ${filteredTrips.length} / ${trips.length}`}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={filteredTrips.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />

      {/* Dispatch Trip Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={t('Dispatch Fuel Transport Trip')}
          subtitle={t('Assign tractor head truck, trailer, driver, route destination, and payload volume into logistics dispatch.')}
          maxWidth="3xl"
        >
          <form onSubmit={handleCreateTrip} style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12.5 }}>
            {/* Section 1 */}
            <div style={{ padding: 14, borderRadius: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--color-row-divider)' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--color-ink)', color: 'var(--color-page-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>1</span>
                  {t('Fleet Asset & Driver Allocation')}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{t('* Required fields')}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Tractor Truck')} <span style={{ color: '#991B1B' }}>*</span>
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
                    {t('Fuel Tanker Trailer')}
                  </label>
                  <EditorialSelect
                    width="100%"
                    value={trailerId}
                    onChange={e => setTrailerId(e.target.value)}
                  >
                    <option value="">{t('-- No Trailer Coupled --')}</option>
                    {trailers.map(tr => (
                      <option key={tr.id} value={tr.id}>
                        {tr.trailer_id} ({(tr.tank_capacity_liters || 0).toLocaleString()} {t('L')})
                      </option>
                    ))}
                  </EditorialSelect>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Assigned Driver')}
                  </label>
                  <EditorialSelect
                    width="100%"
                    value={driverId}
                    onChange={e => setDriverId(e.target.value)}
                  >
                    <option value="">{t('-- Unassigned --')}</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.employee_id})
                      </option>
                    ))}
                  </EditorialSelect>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div style={{ padding: 14, borderRadius: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--color-row-divider)' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--color-ink)', color: 'var(--color-page-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>2</span>
                  {t('Route, Cargo & Gate Pass Notes')}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Origin Terminal')} <span style={{ color: '#991B1B' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={originName}
                    onChange={e => setOriginName(e.target.value)}
                    className="nf-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Destination Hub')} <span style={{ color: '#991B1B' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={destinationName}
                    onChange={e => setDestinationName(e.target.value)}
                    className="nf-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Cargo Payload (Liters)')}
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    value={cargoVolume}
                    onChange={e => setCargoVolume(e.target.value)}
                    className="nf-field"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Cargo Description')}
                  </label>
                  <input
                    type="text"
                    value={cargoDescription}
                    onChange={e => setCargoDescription(e.target.value)}
                    className="nf-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Load Status')}
                  </label>
                  <EditorialSelect
                    width="100%"
                    value={isLoaded ? 'LOADED' : 'EMPTY'}
                    onChange={e => setIsLoaded(e.target.value === 'LOADED')}
                  >
                    <option value="LOADED">{t('Loaded Tanker (56 L/100km)')}</option>
                    <option value="EMPTY">{t('Empty Return (34 L/100km)')}</option>
                  </EditorialSelect>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 4 }}>
                    {t('Dispatch & Gate Pass Notes')}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={t('e.g. Aramco Ras Tanura fuel bill of lading #44120. Special night convoy escort.')}
                    className="nf-field"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <SecondaryButton onClick={() => setIsModalOpen(false)}>
                {t('Cancel')}
              </SecondaryButton>
              <PrimaryButton type="submit">
                <Navigation style={{ width: 14, height: 14 }} />
                <span>{t('Confirm Dispatch')}</span>
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
};
