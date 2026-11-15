import React from 'react';
import { Truck, Cpu, Wifi, Battery, AlertCircle, Edit3, Trash2, Calendar } from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { GpsDevice } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import {
  EDITORIAL_STATUS,
  PlateChip,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface GpsDeviceDetailDrawerProps {
  device: GpsDevice | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (device: GpsDevice) => void;
  onDelete: (deviceId: string) => void;
}

export const GpsDeviceDetailDrawer: React.FC<GpsDeviceDetailDrawerProps> = ({
  device,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { vehicles, isGpsProviderConnected } = useFleet();
  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();

  if (!device) return null;

  const linkedVehicle = vehicles.find((v) => v.id === device.installed_vehicle_id);
  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('GPS TRACKER')}: ${device.device_imei}`}
      subtitle={`${device.device_model} • ${t('Hardware Registry Detail')}`}
      width="xl"
    >
      <div className="space-y-4 text-xs" style={{ color: 'var(--color-ink)' }}>
        {/* Header Summary Banner */}
        <div
          className="p-3.5 flex items-center justify-between gap-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderInlineStart: `3px solid ${
              isGpsProviderConnected ? EDITORIAL_STATUS.green.stripe : EDITORIAL_STATUS.muted.stripe
            }`,
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div>
            <div
              className="text-[11px] font-medium"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
            >
              {t('PHYSICAL HARDWARE IDENTIFIER')}
            </div>
            <div
              className="text-sm font-bold mt-0.5"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
              dir="ltr"
            >
              {device.device_imei}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {t('Model')}: {device.device_model}
            </div>
          </div>

          <div className="text-end">
            <Badge variant={isGpsProviderConnected ? 'success' : 'slate'} size="sm">
              {isGpsProviderConnected ? t('Active Live Feed') : t('Awaiting Provider Feed')}
            </Badge>
            <div
              className="text-[11px] mt-1"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
            >
              {t('ERP State')}: {device.is_active ? t('Active Unit') : t('Deactivated')}
            </div>
          </div>
        </div>

        {/* Section 1: Assigned Tractor Head Truck */}
        <div className="space-y-2">
          <div
            className="text-[11px] font-semibold pb-1 flex items-center gap-1.5"
            style={{
              color: 'var(--color-text-muted)',
              borderBottom: '1px solid var(--color-row-divider)',
            }}
          >
            <Truck className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-accent)' }} />
            <span>{t('1. PAIRED VEHICLE SPECIFICATIONS')}</span>
          </div>

          {linkedVehicle ? (
            <div
              className="p-3 space-y-2.5"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderInlineStart: '3px solid var(--color-brand-accent)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold flex items-center gap-2 flex-wrap">
                    <span dir="ltr" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                      {linkedVehicle.vehicle_id}
                    </span>
                    <PlateChip plate={linkedVehicle.plate_number} />
                    <span
                      className="text-[11px]"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
                    >
                      {t('Fleet #')}
                      <span dir="ltr">{linkedVehicle.fleet_number}</span>
                    </span>
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {linkedVehicle.make} {linkedVehicle.model} (<span dir="ltr">{linkedVehicle.year}</span>)
                  </div>
                </div>

                <Badge variant={linkedVehicle.status === 'AVAILABLE' ? 'success' : 'amber'}>
                  {linkedVehicle.status}
                </Badge>
              </div>

              <div
                className="grid grid-cols-2 gap-2 pt-2 text-[11px]"
                style={{ borderTop: '1px solid var(--color-row-divider)' }}
              >
                <div>
                  <span className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>
                    {t('CURRENT ODOMETER')}
                  </span>
                  <span
                    className="font-semibold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                  >
                    <span dir="ltr">{(linkedVehicle.current_mileage || 0).toLocaleString()}</span> {t('KM')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>
                    {t('ENGINE HOURS')}
                  </span>
                  <span
                    className="font-semibold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                  >
                    <span dir="ltr">{(linkedVehicle.current_engine_hours || 0).toLocaleString()}</span>{' '}
                    {t('Hours')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>
                    {t('ASSIGNED DEPOT')}
                  </span>
                  <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                    {linkedVehicle.station_location}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>
                    {t('VIN / CHASSIS NUMBER')}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}
                    dir="ltr"
                  >
                    {linkedVehicle.vin}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="p-4 text-center"
              style={{
                background: 'var(--color-surface)',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-muted)',
              }}
            >
              <AlertCircle className="w-5 h-5 mx-auto mb-1" />
              <div className="font-semibold text-xs" style={{ color: 'var(--color-ink)' }}>
                {t('No Vehicle Linked')}
              </div>
              <p className="text-[11px] mt-0.5">
                {t('This unit is currently stored in inventory as an unassigned spare device.')}
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Hardware Telemetry Metrics */}
        <div className="space-y-2">
          <div
            className="text-[11px] font-semibold pb-1 flex items-center gap-1.5"
            style={{
              color: 'var(--color-text-muted)',
              borderBottom: '1px solid var(--color-row-divider)',
            }}
          >
            <Cpu className="w-3.5 h-3.5" style={{ color: EDITORIAL_STATUS.blue.text }} />
            <span>{t('2. SENSORS & CELLULAR CONNECTIVITY')}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: t('BATTERY LEVEL'),
                icon: <Battery className="w-3.5 h-3.5" style={{ color: EDITORIAL_STATUS.green.text }} />,
                val:
                  device.battery_level_percent !== undefined ? (
                    <span dir="ltr">{device.battery_level_percent}%</span>
                  ) : (
                    t('-- (Awaiting Feed)')
                  ),
                sub: t('Backup Internal Battery'),
              },
              {
                label: t('CELLULAR CSQ SIGNAL'),
                icon: <Wifi className="w-3.5 h-3.5" style={{ color: EDITORIAL_STATUS.blue.text }} />,
                val:
                  device.signal_strength_csq !== undefined ? (
                    <span dir="ltr">CSQ {device.signal_strength_csq}/31</span>
                  ) : (
                    t('-- (Awaiting Feed)')
                  ),
                sub: t('4G LTE / GSM Network'),
              },
              {
                label: t('M2M SIM PHONE'),
                val: (
                  <span dir={device.sim_phone_number ? 'ltr' : undefined}>
                    {device.sim_phone_number || t('Not Configured')}
                  </span>
                ),
                sub: t('Telemetry Data SIM'),
              },
              {
                label: t('SIM ICCID'),
                val: (
                  <span className="block truncate" title={device.sim_iccid} dir={device.sim_iccid ? 'ltr' : undefined}>
                    {device.sim_iccid || t('Not Configured')}
                  </span>
                ),
                sub: t('M2M Card Serial'),
              },
            ].map((cell, i) => (
              <div
                key={i}
                className="p-2.5"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div
                  className="flex items-center justify-between text-[10px]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <span>{cell.label}</span>
                  {cell.icon}
                </div>
                <div
                  className="text-xs font-semibold mt-0.5"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                >
                  {cell.val}
                </div>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {cell.sub}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Installation & Commissioning */}
        <div className="space-y-2">
          <div
            className="text-[11px] font-semibold pb-1 flex items-center gap-1.5"
            style={{
              color: 'var(--color-text-muted)',
              borderBottom: '1px solid var(--color-row-divider)',
            }}
          >
            <Calendar className="w-3.5 h-3.5" style={{ color: EDITORIAL_STATUS.green.text }} />
            <span>{t('3. INSTALLATION AUDIT & NOTES')}</span>
          </div>

          <div
            className="p-3 space-y-2"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>
                  {t('INSTALLATION DATE')}
                </span>
                <span
                  className="font-semibold"
                  style={{ color: 'var(--color-ink)' }}
                  dir={device.installation_date ? 'ltr' : undefined}
                >
                  {device.installation_date || t('N/A')}
                </span>
              </div>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>
                  {t('ODOMETER AT INSTALL')}
                </span>
                <span
                  className="font-semibold"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                >
                  <span dir="ltr">{(device.installation_odometer || 0).toLocaleString()}</span> {t('KM')}
                </span>
              </div>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>
                  {t('HARDWARE SERIAL')}
                </span>
                <span
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                  dir={device.serial_number ? 'ltr' : undefined}
                >
                  {device.serial_number || t('N/A')}
                </span>
              </div>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>
                  {t('REGISTRATION DATE')}
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                  {new Date(device.created_at).toLocaleDateString(
                    isRTL ? 'ar-SA-u-ca-gregory' : 'en-US'
                  )}
                </span>
              </div>
            </div>

            {device.notes && (
              <div className="pt-2" style={{ borderTop: '1px solid var(--color-row-divider)' }}>
                <span
                  className="text-[10px] block font-semibold mb-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {t('INSTALLATION NOTES')}
                </span>
                <p
                  className="text-xs leading-relaxed p-2"
                  style={{
                    background: 'var(--color-page-bg)',
                    border: '1px solid var(--color-row-divider)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {device.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid var(--color-row-divider)' }}
        >
          {canManage ? (
            <SecondaryButton
              onClick={() => {
                if (
                  confirm(
                    isRTL
                      ? `هل أنت متأكد من حذف جهاز التتبع ${device.device_imei}؟`
                      : `Are you sure you want to delete GPS device ${device.device_imei}?`
                  )
                ) {
                  onDelete(device.id);
                  onClose();
                }
              }}
              style={{ color: EDITORIAL_STATUS.red.text }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('Delete Unit')}</span>
            </SecondaryButton>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <SecondaryButton onClick={onClose}>{t('Close')}</SecondaryButton>

            {canManage && (
              <PrimaryButton
                onClick={() => {
                  onEdit(device);
                  onClose();
                }}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t('Edit Assignment')}</span>
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
