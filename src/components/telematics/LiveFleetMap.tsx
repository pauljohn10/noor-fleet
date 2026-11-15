import React, { useState } from 'react';
import {
  Truck,
  Radio,
  Search,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { VehicleGpsPing } from '../../types';
import { Modal } from '../common/Modal';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  PlateChip,
  StatusText,
  EDITORIAL_STATUS,
} from '../common/EditorialUI';

export type GpsTelemetryStatus = 'LIVE' | 'LAST_KNOWN' | 'STALE' | 'UNAVAILABLE';

export const LiveFleetMap: React.FC = () => {
  const { vehicles, drivers, trailers, gpsDevices, gpsPings, isGpsProviderConnected } = useFleet();
  const { t, isRTL } = useI18n();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'LAST_KNOWN' | 'STALE' | 'UNAVAILABLE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);

  const getVehicleTelemetryStatus = (ping?: VehicleGpsPing): {
    status: GpsTelemetryStatus;
    label: string;
    tone: 'muted' | 'green' | 'amber' | 'red';
    lastSeenText: string;
  } => {
    if (!ping || !ping.is_valid_point || ping.data_source === 'SIMULATED_MOCK_FOR_DEV_ONLY') {
      return {
        status: 'UNAVAILABLE',
        label: t('No GPS Feed'),
        tone: 'muted',
        lastSeenText: t('Never (Awaiting Feed)'),
      };
    }

    const pingTime = new Date(ping.gps_timestamp).getTime();
    const now = Date.now();
    const ageMinutes = (now - pingTime) / 60000;

    if (ageMinutes <= 5) {
      const secs = Math.round(ageMinutes * 60);
      return {
        status: 'LIVE',
        label: ping.speed_kmh > 0 ? t('Live (Moving)') : t('Live (Stationary)'),
        tone: 'green',
        lastSeenText: isRTL ? `منذ ${secs} ث` : `${secs}s ago`,
      };
    } else if (ageMinutes <= 1440) {
      const hours = Math.round(ageMinutes / 60);
      const mins = Math.round(ageMinutes);
      return {
        status: 'LAST_KNOWN',
        label: t('Last Known'),
        tone: 'amber',
        lastSeenText: hours > 0
          ? isRTL
            ? `منذ ${hours} س`
            : `${hours}h ago`
          : isRTL
            ? `منذ ${mins} د`
            : `${mins}m ago`,
      };
    } else {
      const days = Math.round(ageMinutes / 1440);
      return {
        status: 'STALE',
        label: t('Stale Signal'),
        tone: 'red',
        lastSeenText: isRTL ? `منذ ${days} ي` : `${days}d ago`,
      };
    }
  };

  const enrichedVehicles = vehicles.map(v => {
    const ping = gpsPings.find(p => p.vehicle_id === v.id && p.data_source === 'LIVE_PROVIDER');
    const device = gpsDevices.find(d => d.installed_vehicle_id === v.id);
    const driver = drivers.find(d => d.id === v.assigned_driver_id);
    const trailer = trailers.find(tr => tr.id === v.assigned_trailer_id);
    const telemetry = getVehicleTelemetryStatus(ping);

    return {
      ...v,
      ping,
      device,
      driver,
      trailer,
      telemetry,
    };
  });

  const filteredVehicles = enrichedVehicles.filter(v => {
    if (statusFilter !== 'ALL' && v.telemetry.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        v.vehicle_id.toLowerCase().includes(q) ||
        v.plate_number.toLowerCase().includes(q) ||
        (v.driver?.full_name.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const selectedVehicle = enrichedVehicles.find(v => v.id === selectedVehicleId) || enrichedVehicles[0];

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'خريطة المركبات المباشرة' : 'Live Vehicle'}
            <br />
            {isRTL ? 'والتتبع الميداني' : 'Map & Telemetry'}
          </>
        }
        subtitle={
          isGpsProviderConnected
            ? t('Receiving verified positions from external telematics provider.')
            : t('GPS provider not connected — awaiting real vehicle telemetry feed.')
        }
        actions={
          <SecondaryButton onClick={() => setShowSetupModal(true)}>
            <span>{t('Provider Setup Guide')}</span>
          </SecondaryButton>
        }
      />

      {/* Split Roster + Map Container */}
      <div
        className="flex flex-col lg:flex-row"
        style={{
          minHeight: 560,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {/* Left Roster Sidebar */}
        <div
          className="w-full lg:w-80 flex flex-col shrink-0"
          style={{
            borderInlineEnd: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ padding: 12, borderBottom: '1px solid var(--color-row-divider)', background: 'var(--color-page-bg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  width: 14,
                  height: 14,
                  color: 'var(--color-text-muted)',
                  position: 'absolute',
                  insetInlineStart: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder={t('Search truck, plate, driver...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="nf-field"
                style={{ paddingInlineStart: 32, height: 32, fontSize: 12.5 }}
              />
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: 4 }}>
              {(['ALL', 'LIVE', 'LAST_KNOWN', 'UNAVAILABLE'] as const).map(tab => {
                const isActive = statusFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    style={{
                      flex: 1,
                      padding: '6px 4px',
                      fontSize: 11.5,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--color-ink)' : 'var(--color-text-muted)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: isActive ? '2px solid var(--color-ink)' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {tab === 'ALL' ? t('All') : tab === 'LAST_KNOWN' ? t('Last Seen') : tab === 'UNAVAILABLE' ? t('No Feed') : t('Live')}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredVehicles.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12.5 }}>
                {t('No vehicles match current search filter.')}
              </div>
            ) : (
              filteredVehicles.map(v => {
                const isSelected = v.id === selectedVehicleId;
                const { telemetry } = v;
                const tone = EDITORIAL_STATUS[telemetry.tone];

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--color-row-divider)',
                      borderInlineStart: isSelected ? `3px solid ${tone.stripe}` : '3px solid transparent',
                      background: isSelected ? 'var(--color-row-hover)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Truck style={{ width: 14, height: 14, color: isSelected ? 'var(--color-ink)' : 'var(--color-text-muted)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--color-ink)' }} dir="ltr">{v.vehicle_id}</span>
                        <span
                          dir="ltr"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            fontWeight: 500,
                            color: 'var(--color-ink)',
                            background: 'var(--color-page-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 4,
                            padding: '1px 5px',
                          }}
                        >
                          {v.plate_number}
                        </span>
                      </div>
                      <StatusText label={telemetry.label} color={tone.text} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 6 }}>
                      <span className="truncate max-w-[160px]">
                        {v.driver ? v.driver.full_name : t('No driver')}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {telemetry.lastSeenText}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Vector Map & Inspector Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 460 }}>
          <div
            style={{
              flex: 1,
              background: 'var(--color-page-bg)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <svg className="absolute inset-0 w-full h-full opacity-45" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="roadGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#D9D4C8" strokeWidth="1" strokeDasharray="3 3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#roadGrid)" />
              <line x1="15%" y1="20%" x2="85%" y2="75%" stroke="#B8B09E" strokeWidth="2.5" />
              <line x1="85%" y1="75%" x2="40%" y2="85%" stroke="#B8B09E" strokeWidth="2" />
              <line x1="20%" y1="15%" x2="25%" y2="90%" stroke="#B8B09E" strokeWidth="1.5" strokeDasharray="6 4" />
            </svg>

            <div
              className="hidden sm:block"
              style={{
                position: 'absolute',
                top: 20,
                insetInlineStart: 24,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '5px 10px',
                fontSize: 11.5,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
              }}
            >
              {t('Dammam Central Fuel Terminal Depot')}
            </div>
            <div
              className="hidden sm:block"
              style={{
                position: 'absolute',
                top: 20,
                insetInlineEnd: 24,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '5px 10px',
                fontSize: 11.5,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
              }}
            >
              {t('Ras Tanura Aramco Terminal')}
            </div>
            <div
              className="hidden sm:block"
              style={{
                position: 'absolute',
                bottom: 24,
                insetInlineStart: 28,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '5px 10px',
                fontSize: 11.5,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
              }}
            >
              {t('Jubail Industrial Logistics Hub')}
            </div>
            <div
              className="hidden sm:block"
              style={{
                position: 'absolute',
                bottom: 24,
                insetInlineEnd: 28,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '5px 10px',
                fontSize: 11.5,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
              }}
            >
              {t('Riyadh North Fuel Distribution Center')}
            </div>

            <div
              style={{
                position: 'relative',
                zIndex: 10,
                maxWidth: 480,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: 24,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  margin: '0 auto',
                  borderRadius: 4,
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0F5C4D',
                }}
              >
                <Radio style={{ width: 22, height: 22 }} />
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>
                  {t('GPS Provider Not Connected — Awaiting Real Vehicle Data')}
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                  {t('No verified coordinates are currently being received from external tracking hardware. Vehicles will render on this map automatically once your GPS provider is confirmed and connected.')}
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  textAlign: 'start',
                  paddingTop: 12,
                  borderTop: '1px solid var(--color-row-divider)',
                }}
              >
                <div style={{ padding: 10, background: 'var(--color-page-bg)', border: '1px solid var(--color-border)', borderRadius: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block' }}>{t('STEP 1')}</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: 12, marginTop: 2 }}>{t('Vendor API')}</div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{t('Confirm REST or webhook feed')}</span>
                </div>
                <div style={{ padding: 10, background: 'var(--color-page-bg)', border: '1px solid var(--color-border)', borderRadius: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block' }}>{t('STEP 2')}</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: 12, marginTop: 2 }}>{t('Server Secret')}</div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{t('Store API keys on backend')}</span>
                </div>
                <div style={{ padding: 10, background: 'var(--color-page-bg)', border: '1px solid var(--color-border)', borderRadius: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block' }}>{t('STEP 3')}</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: 12, marginTop: 2 }}>{t('Sync Active')}</div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{t('Positions update live')}</span>
                </div>
              </div>

              <div>
                <PrimaryButton onClick={() => setShowSetupModal(true)}>
                  <span>{t('View Integration Instructions')}</span>
                  <ArrowRight style={{ width: 14, height: 14 }} className={isRTL ? 'rotate-180' : ''} />
                </PrimaryButton>
              </div>
            </div>
          </div>

          {/* Bottom Vehicle Inspector Bar */}
          {selectedVehicle && (
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--color-surface)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <PlateChip
                  plate={selectedVehicle.plate_number}
                  accentColor={EDITORIAL_STATUS[selectedVehicle.telemetry.tone].stripe}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: 13 }} dir="ltr">{selectedVehicle.vehicle_id}</span>
                    <StatusText
                      label={selectedVehicle.telemetry.label}
                      color={EDITORIAL_STATUS[selectedVehicle.telemetry.tone].text}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {selectedVehicle.make} {selectedVehicle.model} • {t('Driver')}: {selectedVehicle.driver?.full_name || t('Unassigned')} • {t('Status')}: {t(selectedVehicle.status)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, fontSize: 12 }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11, display: 'block' }}>{t('SPEED')}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }} dir="ltr">--</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11, display: 'block' }}>{t('IGNITION')}</span>
                  <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{t('Unavailable')}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11, display: 'block' }}>{t('LAST GPS SIGNAL')}</span>
                  <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{t('Never (No Feed)')}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11, display: 'block' }}>{t('HARDWARE UNIT')}</span>
                  <span
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--color-ink)' }}
                    dir={selectedVehicle.device ? 'ltr' : undefined}
                  >
                    {selectedVehicle.device ? selectedVehicle.device.device_imei : t('Awaiting Data')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Setup Guide Modal */}
      <Modal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        title={t('GPS PROVIDER INTEGRATION GUIDE')}
        maxWidth="xl"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 12.5 }}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            {t('Your Noor Fleet ERP is architected to be vendor-agnostic. It accepts live coordinates from any modern fleet telematics hardware via standard REST polling or webhooks.')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>{t('1. Confirm Tracking Vendor')}</div>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                {t('Provide the API endpoint, authentication method (Bearer token, API key, or OAuth2), and JSON payload format.')}
              </p>
            </div>

            <div style={{ padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>{t('2. Configure Supabase Secrets')}</div>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                {t('Store credentials on the backend. No secrets are ever exposed in frontend code:')}
              </p>
              <code
                dir="ltr"
                style={{
                  display: 'block',
                  background: '#161513',
                  color: '#CDEBE3',
                  padding: '8px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  marginTop: 8,
                }}
              >
                supabase secrets set GPS_PROVIDER_BASE_URL="https://api.vendor.com/v1" GPS_PROVIDER_API_KEY="..."
              </code>
            </div>

            <div style={{ padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>{t('3. Activate Scheduled Sync or Webhook')}</div>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                {t('Deploy sync-gps-positions Edge Function to process coordinates with the active speed and stationary jitter filters.')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
            <PrimaryButton onClick={() => setShowSetupModal(false)}>
              {t('Got It')}
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};
