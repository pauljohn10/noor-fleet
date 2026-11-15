import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Truck,
  Radio,
  Search,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
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

export type GpsTelemetryStatus = 'ONLINE' | 'OUTDATED' | 'OFFLINE' | 'UNAVAILABLE';

const DEFAULT_SAUDI_CENTER: [number, number] = [25.6, 48.5];
const DEFAULT_ZOOM = 6;

export const LiveFleetMap: React.FC = () => {
  const {
    vehicles,
    drivers,
    trailers,
    gpsDevices,
    gpsPings,
    gpsSyncLogs,
    isGpsProviderConnected,
    simulateGpsSync,
  } = useFleet();
  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OUTDATED' | 'OFFLINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const canSync = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  const getVehicleTelemetryStatus = (ping?: VehicleGpsPing): {
    status: GpsTelemetryStatus;
    label: string;
    tone: 'muted' | 'green' | 'amber' | 'red';
    lastSeenText: string;
    exactTimestamp: string | null;
  } => {
    if (!ping || !ping.is_valid_point || ping.data_source !== 'LIVE_PROVIDER') {
      return {
        status: 'OFFLINE',
        label: t('Offline'),
        tone: 'muted',
        lastSeenText: t('No GPS Data'),
        exactTimestamp: null,
      };
    }

    const pingDate = new Date(ping.gps_timestamp);
    const ageMinutes = (Date.now() - pingDate.getTime()) / 60000;
    const exactTimestamp = pingDate.toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (ageMinutes <= 15) {
      const secs = Math.max(0, Math.round(ageMinutes * 60));
      const mins = Math.round(ageMinutes);
      return {
        status: 'ONLINE',
        label: ping.speed_kmh > 0 ? t('Online (Moving)') : t('Online'),
        tone: 'green',
        lastSeenText: mins >= 1
          ? (isRTL ? `منذ ${mins} د` : `${mins}m ago`)
          : (isRTL ? `منذ ${secs} ث` : `${secs}s ago`),
        exactTimestamp,
      };
    }

    if (ageMinutes <= 1440) {
      const hours = Math.floor(ageMinutes / 60);
      const mins = Math.round(ageMinutes);
      return {
        status: 'OUTDATED',
        label: t('Last Updated'),
        tone: 'amber',
        lastSeenText: hours > 0
          ? (isRTL ? `منذ ${hours} س` : `${hours}h ago`)
          : (isRTL ? `منذ ${mins} د` : `${mins}m ago`),
        exactTimestamp,
      };
    }

    const days = Math.round(ageMinutes / 1440);
    return {
      status: 'OFFLINE',
      label: t('Offline'),
      tone: 'red',
      lastSeenText: isRTL ? `منذ ${days} ي` : `${days}d ago`,
      exactTimestamp,
    };
  };

  const enrichedVehicles = useMemo(() => {
    return vehicles.map(v => {
      const ping = gpsPings.find(
        p => p.vehicle_id === v.id && p.is_valid_point && p.data_source === 'LIVE_PROVIDER',
      );
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
  }, [vehicles, gpsPings, gpsDevices, drivers, trailers, isRTL]);

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
  const liveVehicleCount = enrichedVehicles.filter(v => Boolean(v.ping)).length;
  const lastSyncLog = gpsSyncLogs.find(l => l.sync_status === 'SUCCESS' && !l.provider_name.toUpperCase().includes('MOCK'));

  // Initialize Leaflet OpenStreetMap once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_SAUDI_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update vehicle markers whenever live pings or selection change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const bounds: [number, number][] = [];

    for (const v of enrichedVehicles) {
      if (!v.ping) continue;
      const lat = Number(v.ping.latitude);
      const lon = Number(v.ping.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const isSelected = v.id === selectedVehicle?.id;
      const color =
        v.telemetry.status === 'ONLINE'
          ? '#0F5C4D'
          : v.telemetry.status === 'OUTDATED'
            ? '#B45309'
            : '#991B1B';

      const marker = L.circleMarker([lat, lon], {
        radius: isSelected ? 10 : 7,
        color: '#FFFDF8',
        weight: isSelected ? 3 : 2,
        fillColor: color,
        fillOpacity: 0.95,
      });

      marker.bindPopup(
        `<div style="font-family:var(--font-ui);font-size:12px;line-height:1.5">
          <strong>${v.vehicle_id}</strong> (${v.plate_number})<br/>
          ${t('Status')}: ${v.telemetry.label}<br/>
          ${t('Speed')}: ${v.ping.speed_kmh} km/h<br/>
          ${t('Last Updated')}: ${v.telemetry.exactTimestamp || '—'}
        </div>`,
      );

      marker.on('click', () => setSelectedVehicleId(v.id));
      marker.addTo(layer);
      bounds.push([lat, lon]);
    }

    if (bounds.length > 0) {
      if (selectedVehicle?.ping) {
        map.setView([selectedVehicle.ping.latitude, selectedVehicle.ping.longitude], Math.max(map.getZoom(), 10), {
          animate: true,
        });
      } else {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    }
  }, [enrichedVehicles, selectedVehicle?.id]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    const res = await simulateGpsSync();
    setIsSyncing(false);
    setSyncNotice({ ok: res.success, text: res.message });
  };

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
          isGpsProviderConnected && liveVehicleCount > 0
            ? t('Receiving verified positions from external telematics provider (auto-refresh active).')
            : t('GPS provider not connected — awaiting authorized Sniper GPS telemetry feed.')
        }
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {canSync && (
              <PrimaryButton onClick={handleManualSync} disabled={isSyncing}>
                <RefreshCw style={{ width: 14, height: 14 }} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? t('Syncing...') : t('Refresh GPS')}</span>
              </PrimaryButton>
            )}
            <SecondaryButton onClick={() => setShowSetupModal(true)}>
              <span>{t('Provider Setup Guide')}</span>
            </SecondaryButton>
          </div>
        }
      />

      {syncNotice && (
        <div
          style={{
            marginBottom: 14,
            padding: '10px 14px',
            borderRadius: 4,
            fontSize: 12.5,
            border: `1px solid ${syncNotice.ok ? '#A7F3D0' : '#FECACA'}`,
            background: syncNotice.ok ? '#ECFDF5' : '#FEF2F2',
            color: syncNotice.ok ? '#065F46' : '#991B1B',
          }}
        >
          {syncNotice.text}
        </div>
      )}

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
              {(['ALL', 'ONLINE', 'OUTDATED', 'OFFLINE'] as const).map(tab => {
                const isActive = statusFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    style={{
                      flex: 1,
                      padding: '6px 4px',
                      fontSize: 12.5,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--color-ink)' : 'var(--color-text-muted)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: isActive ? '2px solid var(--color-ink)' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {tab === 'ALL' ? t('All') : tab === 'ONLINE' ? t('Online') : tab === 'OUTDATED' ? t('Outdated') : t('Offline')}
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
                const isSelected = v.id === selectedVehicle?.id;
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
                            fontSize: 12,
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

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 6 }}>
                      <span className="truncate max-w-[160px]">
                        {v.driver ? v.driver.full_name : t('No driver')}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {telemetry.lastSeenText}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Real Leaflet Map & Inspector Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 480 }}>
          <div style={{ flex: 1, position: 'relative', minHeight: 400, background: 'var(--color-page-bg)' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 400, zIndex: 1 }} />

            {/* Honest Unavailable Overlay when zero live coordinates exist */}
            {liveVehicleCount === 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  insetInlineStart: 56,
                  insetInlineEnd: 16,
                  zIndex: 500,
                  maxWidth: 520,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 4,
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0F5C4D',
                    flexShrink: 0,
                  }}
                >
                  <Radio style={{ width: 18, height: 18 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)' }}>
                    {t('Live GPS Data Unavailable — Awaiting Authorized Sniper Feed')}
                  </div>
                  <p style={{ margin: '4px 0 8px', fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                    {t('No verified GPS coordinates have been received from live tracking hardware yet. Mock coordinates are disabled in production.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSetupModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#0F5C4D',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <span>{t('View Integration Requirements')}</span>
                    <ArrowRight style={{ width: 13, height: 13 }} className={isRTL ? 'rotate-180' : ''} />
                  </button>
                </div>
              </div>
            )}

            {/* Last Sync Status Pill */}
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                insetInlineStart: 12,
                zIndex: 500,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {lastSyncLog?.sync_completed_at
                ? `${t('Last Sync')}: ${new Date(lastSyncLog.sync_completed_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}`
                : `${t('Last Sync')}: ${t('Never')}`}
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
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block' }}>{t('COORDINATES')}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }} dir="ltr">
                    {selectedVehicle.ping
                      ? `${selectedVehicle.ping.latitude.toFixed(5)}, ${selectedVehicle.ping.longitude.toFixed(5)}`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block' }}>{t('SPEED')}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }} dir="ltr">
                    {selectedVehicle.ping ? `${selectedVehicle.ping.speed_kmh} km/h` : '--'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block' }}>{t('IGNITION')}</span>
                  <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                    {selectedVehicle.ping
                      ? (selectedVehicle.ping.ignition_on ? t('ON') : t('OFF'))
                      : t('Unavailable')}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block' }}>{t('LAST UPDATED')}</span>
                  <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {selectedVehicle.telemetry.exactTimestamp || t('Never (No Feed)')}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block' }}>{t('HARDWARE UNIT')}</span>
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
        title={t('SNIPER GPS INTEGRATION GUIDE')}
        maxWidth="xl"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 12.5 }}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            {t('Noor Fleet connects to Sniper GPS exclusively via the server-side sync-gps-positions Supabase Edge Function. Credentials are never stored in frontend code.')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>{t('1. Confirm Official Sniper API Documentation')}</div>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                {t('Obtain management authorization and official Sniper API base URL, endpoints, authentication headers, and rate limits.')}
              </p>
            </div>

            <div style={{ padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>{t('2. Configure Supabase Secrets (Placeholder)')}</div>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                {t('Store credentials strictly in Supabase Secrets on the backend:')}
              </p>
              <code
                dir="ltr"
                style={{
                  display: 'block',
                  background: '#161513',
                  color: '#CDEBE3',
                  padding: '8px 10px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  marginTop: 8,
                }}
              >
                supabase secrets set GPS_PROVIDER_TYPE="SNIPER" SNIPER_API_BASE_URL="https://api.sniper-provider.example/v1" SNIPER_API_KEY="YOUR_SECRET_KEY"
              </code>
            </div>

            <div style={{ padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>{t('3. Deploy Edge Function & Schedule Cron')}</div>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                {t('Deploy sync-gps-positions so live coordinates stream into vehicle_gps_pings and auto-refresh on this map.')}
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
