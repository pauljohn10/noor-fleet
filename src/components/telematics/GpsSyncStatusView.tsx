import React, { useState } from 'react';
import {
  RotateCw,
  CheckCircle2,
  Plus,
  Eye,
  Edit3,
  Trash2,
} from 'lucide-react';
import { GpsDevice } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { GpsDeviceFormModal } from './GpsDeviceFormModal';
import { GpsDeviceDetailDrawer } from './GpsDeviceDetailDrawer';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusTabs,
  DataTable,
  DataRow,
  RowAction,
  PlateChip,
  StatusText,
  TableFooter,
  MetricStrip,
  EditorialSection,
  EDITORIAL_STATUS,
} from '../common/EditorialUI';

export const GpsSyncStatusView: React.FC = () => {
  const {
    gpsDevices,
    gpsSyncLogs,
    vehicles,
    simulateGpsSync,
    deleteGpsDevice,
    isGpsProviderConnected,
  } = useFleet();

  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency_ms: number } | null>(null);

  // Modal and Drawer States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<GpsDevice | undefined>(undefined);
  const [selectedDevice, setSelectedDevice] = useState<GpsDevice | null>(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      setIsTesting(false);
      setTestResult({
        success: true,
        message: t('Mock Telematics Adapter responded successfully (Deno Edge Function Handshake Simulation)'),
        latency_ms: 42,
      });
    }, 600);
  };

  const filteredDevices = gpsDevices.filter(dev => {
    const veh = vehicles.find(v => v.id === dev.installed_vehicle_id);
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      dev.device_imei.toLowerCase().includes(query) ||
      dev.device_model.toLowerCase().includes(query) ||
      (dev.serial_number && dev.serial_number.toLowerCase().includes(query)) ||
      (veh && veh.vehicle_id.toLowerCase().includes(query)) ||
      (veh && veh.plate_number.toLowerCase().includes(query)) ||
      (dev.sim_phone_number && dev.sim_phone_number.includes(query));

    const matchesFilter =
      assignmentFilter === 'ALL' ||
      (assignmentFilter === 'ASSIGNED' && Boolean(dev.installed_vehicle_id)) ||
      (assignmentFilter === 'UNASSIGNED' && !dev.installed_vehicle_id);

    return matchesSearch && matchesFilter;
  });

  const pairedCount = gpsDevices.filter(d => Boolean(d.installed_vehicle_id)).length;
  const unassignedCount = gpsDevices.length - pairedCount;

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'مزامنة GPS' : 'GPS Sync &'}
            <br />
            {isRTL ? 'وتشخيص الأجهزة' : 'Hardware Diagnostics'}
          </>
        }
        subtitle={t('Server-side Edge Function telemetry ingestion status, hardware IMEI registry, and execution logs.')}
        actions={
          <>
            <SecondaryButton onClick={handleTestConnection} disabled={isTesting}>
              <span>{t('Test Handshake')}</span>
            </SecondaryButton>
            <SecondaryButton onClick={simulateGpsSync}>
              <span>{t('Run Sync Ingestion')}</span>
            </SecondaryButton>
            {canManage && (
              <PrimaryButton
                onClick={() => {
                  setEditingDevice(undefined);
                  setIsFormOpen(true);
                }}
              >
                {isRTL ? `+ ${t('Add GPS Device')}` : '+ Add GPS device'}
              </PrimaryButton>
            )}
          </>
        }
      />

      {testResult && (
        <div
          style={{
            padding: '12px 14px',
            marginBottom: 18,
            borderRadius: 4,
            background: testResult.success ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${testResult.success ? '#BBF7D0' : '#FECACA'}`,
            borderInlineStart: `3px solid ${testResult.success ? '#16A34A' : '#991B1B'}`,
            color: testResult.success ? '#166534' : '#991B1B',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
            <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span>{testResult.message}</span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              background: 'var(--color-surface)',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid #BBF7D0',
            }}
          >
            {t('Latency')}: <span dir="ltr">{testResult.latency_ms}</span> {t('ms')}
          </span>
        </div>
      )}

      <MetricStrip
        marginBottom={24}
        items={[
          {
            label: t('Provider Gateway State'),
            value: isGpsProviderConnected ? t('Online (Active Feed)') : t('Awaiting Provider Feed'),
            subtext: t('Status: Standby for Provider Secrets'),
            valueColor: isGpsProviderConnected ? EDITORIAL_STATUS.green.text : EDITORIAL_STATUS.amber.text,
          },
          {
            label: t('Hardware Registry'),
            value: `${gpsDevices.length} ${t('Registered Trackers')}`,
            subtext: isRTL
              ? `${pairedCount} مقترن، ${unassignedCount} احتياطي`
              : `${pairedCount} paired, ${unassignedCount} unassigned spare`,
            mono: true,
          },
          {
            label: t('Telemetry Validation Filter'),
            value: t('Speed & Jitter Filter Active'),
            subtext: t('Variance Threshold: ±5% verification'),
            valueColor: EDITORIAL_STATUS.green.text,
          },
        ]}
      />

      <StatusTabs
        tabs={[
          { key: 'ALL', label: t('All Hardware'), count: gpsDevices.length, stripe: 'var(--color-ink)' },
          { key: 'ASSIGNED', label: t('Paired to Truck'), count: pairedCount, stripe: EDITORIAL_STATUS.green.stripe },
          { key: 'UNASSIGNED', label: t('Unassigned Spares'), count: unassignedCount, stripe: EDITORIAL_STATUS.amber.stripe },
        ]}
        activeKey={assignmentFilter}
        onChange={key => setAssignmentFilter(key as 'ALL' | 'ASSIGNED' | 'UNASSIGNED')}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('Search IMEI, Truck, Plate...')}
      />

      {/* Hardware Devices Master Table */}
      <DataTable
        columns={[
          { label: t('Device IMEI & Model') },
          { label: t('Assigned Vehicle') },
          { label: t('Telematics Status') },
          { label: t('M2M SIM Connectivity') },
          { label: t('Installation Audit') },
        ]}
        isEmpty={filteredDevices.length === 0}
        emptyMessage={t('No units matched your filter. Clear search or register a new physical device IMEI.')}
        onClearFilters={
          searchQuery || assignmentFilter !== 'ALL'
            ? () => {
              setSearchQuery('');
              setAssignmentFilter('ALL');
            }
            : undefined
        }
        clearFiltersLabel={t('Clear filters')}
      >
        {filteredDevices.map(dev => {
          const veh = vehicles.find(v => v.id === dev.installed_vehicle_id);
          const stripe = isGpsProviderConnected
            ? EDITORIAL_STATUS.green.stripe
            : veh
              ? EDITORIAL_STATUS.blue.stripe
              : EDITORIAL_STATUS.muted.stripe;

          return (
            <DataRow
              key={dev.id}
              stripeColor={stripe}
              onClick={() => setSelectedDevice(dev)}
              actions={
                <>
                  <RowAction
                    icon={<Eye style={{ width: 15, height: 15 }} />}
                    title={t('View Hardware Details')}
                    onClick={() => setSelectedDevice(dev)}
                  />
                  {canManage && (
                    <RowAction
                      icon={<Edit3 style={{ width: 14, height: 14 }} />}
                      title={t('Edit Hardware & Assignment')}
                      onClick={() => {
                        setEditingDevice(dev);
                        setIsFormOpen(true);
                      }}
                    />
                  )}
                  {hasPermission(['SUPER_ADMIN']) && (
                    <RowAction
                      icon={<Trash2 style={{ width: 14, height: 14 }} />}
                      title={t('Delete Device')}
                      danger
                      onClick={() => {
                        if (
                          confirm(
                            isRTL
                              ? `هل أنت متأكد من إزالة جهاز التتبع ${dev.device_imei} من سجل الأسطول؟`
                              : `Are you sure you want to remove tracker unit ${dev.device_imei} from the fleet registry?`
                          )
                        ) {
                          deleteGpsDevice(dev.id);
                        }
                      }}
                    />
                  )}
                </>
              }
            >
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }} dir="ltr">
                  {dev.device_imei}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{dev.device_model}</div>
                {dev.serial_number && (
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginTop: 2 }} dir="ltr">
                    SN: {dev.serial_number}
                  </div>
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {veh ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PlateChip plate={veh.plate_number} accentColor={stripe} />
                      <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--color-ink)' }} dir="ltr">
                        {veh.vehicle_id}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>
                      {veh.make} {veh.model}
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{t('Unassigned Spare Unit')}</span>
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText
                  label={isGpsProviderConnected ? t('Online (Active Feed)') : t('Awaiting Feed')}
                  color={isGpsProviderConnected ? EDITORIAL_STATUS.green.text : 'var(--color-text-muted)'}
                  subtext={`${dev.battery_level_percent !== undefined ? `${t('Batt')}: ${dev.battery_level_percent}%` : `${t('Batt')}: --`
                    } • ${dev.signal_strength_csq !== undefined ? `CSQ: ${dev.signal_strength_csq}/31` : `${t('Signal')}: --`}`}
                  monoSubtext
                />
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: dev.sim_phone_number ? 'var(--color-ink)' : 'var(--color-text-muted)' }}
                  dir={dev.sim_phone_number ? 'ltr' : undefined}
                >
                  {dev.sim_phone_number || t('No SIM Line')}
                </div>
                {dev.sim_iccid && (
                  <div className="truncate max-w-[150px]" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }} title={dev.sim_iccid} dir="ltr">
                    ICCID: {dev.sim_iccid}
                  </div>
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)' }} dir={dev.installation_date ? 'ltr' : undefined}>
                  {dev.installation_date || t('N/A')}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {t('Odo')}: <span dir="ltr">{(dev.installation_odometer || 0).toLocaleString()}</span> {t('KM')}
                </div>
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={`${t('Physical GPS Hardware Inventory')}: ${filteredDevices.length} / ${gpsDevices.length}`}
      />

      {/* Sync Execution Logs Section */}
      <EditorialSection
        title={t('Recent Ingestion Logs')}
        subtitle={t('Historical sync attempts, latencies, and packet insertion results.')}
        action={<span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{t('Retaining last 50 events')}</span>}
      >
        <DataTable
          columns={[
            { label: t('Timestamp') },
            { label: t('Provider Adapter') },
            { label: t('Trigger Source') },
            { label: t('Pings Received') },
            { label: t('Inserted') },
            { label: t('Duplicates Skipped') },
            { label: t('Latency') },
            { label: t('Status'), align: 'end' },
          ]}
          isEmpty={gpsSyncLogs.length === 0}
          emptyMessage={t('No sync logs recorded yet.')}
          hasActionsColumn={false}
        >
          {gpsSyncLogs.map(log => (
            <DataRow key={log.id} stripeColor={EDITORIAL_STATUS.green.stripe}>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }} dir="ltr">
                {new Date(log.sync_started_at).toLocaleTimeString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 500, color: 'var(--color-ink)' }}>
                {log.provider_name}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: 12, color: 'var(--color-text-muted)' }}>
                {t(log.triggered_by)}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }} dir="ltr">
                {log.pings_received}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontWeight: 600, color: EDITORIAL_STATUS.green.text }} dir="ltr">
                {log.pings_inserted}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }} dir="ltr">
                {log.pings_skipped_duplicate}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                <span dir="ltr">{log.api_latency_ms || 42}</span> {t('ms')}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <StatusText label={t(log.sync_status)} color={EDITORIAL_STATUS.green.text} />
              </td>
            </DataRow>
          ))}
        </DataTable>
      </EditorialSection>

      {/* Interactive Form Modal */}
      <GpsDeviceFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDevice(undefined);
        }}
        initialDevice={editingDevice}
      />

      {/* Slide-over Detail Drawer */}
      <GpsDeviceDetailDrawer
        device={selectedDevice}
        isOpen={Boolean(selectedDevice)}
        onClose={() => setSelectedDevice(null)}
        onEdit={dev => {
          setSelectedDevice(null);
          setEditingDevice(dev);
          setIsFormOpen(true);
        }}
        onDelete={id => {
          deleteGpsDevice(id);
          setSelectedDevice(null);
        }}
      />
    </PageContainer>
  );
};
