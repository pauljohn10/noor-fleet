import React, { useState, useEffect } from 'react';
import { Radio, Truck, AlertTriangle, ShieldCheck, Cpu, Wifi, Info } from 'lucide-react';
import { Modal } from '../common/Modal';
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

interface GpsDeviceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDevice?: GpsDevice;
}

const COMMON_DEVICE_MODELS = [
  'Teltonika FMB120 (Dual CAN & Fuel Sensor)',
  'Teltonika FMC130 (4G LTE Cat 1 & CAN)',
  'Teltonika FMB920 (Compact Tracker)',
  'CalAmp LMU-3030 OBD-II/CAN',
  'Queclink GV300 (Heavy Commercial)',
  'Ruptela HCV5 (Heavy Fleet & Tachograph)',
  'Meitrack T399G (Fuel Level Sensor)',
  'Other / Custom Model',
];

export const GpsDeviceFormModal: React.FC<GpsDeviceFormModalProps> = ({
  isOpen,
  onClose,
  initialDevice,
}) => {
  const { vehicles, gpsDevices, addGpsDevice, updateGpsDevice } = useFleet();
  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();

  const [imei, setImei] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [deviceModel, setDeviceModel] = useState(COMMON_DEVICE_MODELS[0]);
  const [customModel, setCustomModel] = useState('');
  const [installedVehicleId, setInstalledVehicleId] = useState('');
  const [simPhoneNumber, setSimPhoneNumber] = useState('');
  const [simIccid, setSimIccid] = useState('');
  const [installationDate, setInstallationDate] = useState(new Date().toISOString().slice(0, 10));
  const [installationOdometer, setInstallationOdometer] = useState(0);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when editing or opening
  useEffect(() => {
    if (initialDevice) {
      setImei(initialDevice.device_imei);
      setSerialNumber(initialDevice.serial_number || '');
      if (COMMON_DEVICE_MODELS.includes(initialDevice.device_model)) {
        setDeviceModel(initialDevice.device_model);
        setCustomModel('');
      } else {
        setDeviceModel('Other / Custom Model');
        setCustomModel(initialDevice.device_model);
      }
      setInstalledVehicleId(initialDevice.installed_vehicle_id || '');
      setSimPhoneNumber(initialDevice.sim_phone_number || '');
      setSimIccid(initialDevice.sim_iccid || '');
      setInstallationDate(initialDevice.installation_date || new Date().toISOString().slice(0, 10));
      setInstallationOdometer(initialDevice.installation_odometer || 0);
      setNotes(initialDevice.notes || '');
    } else {
      setImei('');
      setSerialNumber('');
      setDeviceModel(COMMON_DEVICE_MODELS[0]);
      setCustomModel('');
      setInstalledVehicleId('');
      setSimPhoneNumber('');
      setSimIccid('');
      setInstallationDate(new Date().toISOString().slice(0, 10));
      setInstallationOdometer(0);
      setNotes('');
    }
    setErrorMessage(null);
  }, [initialDevice, isOpen]);

  // Auto-populate installation odometer when truck is selected in create mode
  const handleVehicleChange = (vId: string) => {
    setInstalledVehicleId(vId);
    if (!initialDevice && vId) {
      const selected = vehicles.find((v) => v.id === vId);
      if (selected && selected.current_mileage) {
        setInstallationOdometer(selected.current_mileage);
      }
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === installedVehicleId);

  // Check if another device is currently linked to the selected truck
  const existingDeviceForTruck = installedVehicleId
    ? gpsDevices.find((d) => d.installed_vehicle_id === installedVehicleId && d.id !== initialDevice?.id)
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanImei = imei.trim();
    if (!cleanImei) {
      setErrorMessage(t('Please enter a valid hardware IMEI number.'));
      return;
    }

    // Enforce IMEI Uniqueness check
    const isDuplicate = gpsDevices.some(
      (d) => d.device_imei.trim().toLowerCase() === cleanImei.toLowerCase() && d.id !== initialDevice?.id
    );

    if (isDuplicate) {
      setErrorMessage(
        isRTL
          ? `تم رفض رقم IMEI المكرر: يوجد جهاز مسجل مسبقاً برقم "${cleanImei}".`
          : `Duplicate IMEI rejected: An existing device is already registered with IMEI "${cleanImei}".`
      );
      return;
    }

    const finalModel =
      deviceModel === 'Other / Custom Model'
        ? customModel.trim() || 'Custom Telematics Device'
        : deviceModel;

    try {
      if (initialDevice) {
        updateGpsDevice(initialDevice.id, {
          device_imei: cleanImei,
          serial_number: serialNumber.trim() || undefined,
          device_model: finalModel,
          installed_vehicle_id: installedVehicleId || undefined,
          sim_phone_number: simPhoneNumber.trim() || undefined,
          sim_iccid: simIccid.trim() || undefined,
          installation_date: installationDate,
          installation_odometer: Number(installationOdometer) || 0,
          notes: notes.trim() || undefined,
        });
      } else {
        addGpsDevice({
          device_imei: cleanImei,
          serial_number: serialNumber.trim() || undefined,
          device_model: finalModel,
          installed_vehicle_id: installedVehicleId || undefined,
          installation_date: installationDate,
          installation_odometer: Number(installationOdometer) || 0,
          is_active: true,
          battery_level_percent: undefined,
          signal_strength_csq: undefined,
          last_heartbeat: undefined,
          sim_phone_number: simPhoneNumber.trim() || undefined,
          sim_iccid: simIccid.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || t('Failed to register GPS device.'));
    }
  };

  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  // Pinned Footer with guaranteed visibility
  const modalFooter = (
    <>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: EDITORIAL_STATUS.green.text }} />
        <span>
          {isRTL ? (
            <>
              تبدأ الحالة بـ <strong style={{ color: 'var(--color-ink)' }}>بانتظار ربط البيانات</strong> حتى تصل
              الإحداثيات الحية.
            </>
          ) : (
            <>
              Status initializes as <strong style={{ color: 'var(--color-ink)' }}>Awaiting Data Link</strong> until
              live telemetry arrives.
            </>
          )}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2.5 shrink-0">
        <SecondaryButton type="button" onClick={onClose}>
          {t('Cancel')}
        </SecondaryButton>

        <PrimaryButton type="submit" form="gps-device-form" disabled={!canManage}>
          {initialDevice ? t('Save Hardware Updates') : t('Confirm Hardware Registration')}
        </PrimaryButton>
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        initialDevice
          ? `${t('Edit GPS Hardware')}: ${initialDevice.device_imei}`
          : t('Register GPS Tracking Hardware')
      }
      subtitle={t('Register physical telematics tracker units, map to tractor heads, and configure cellular identity.')}
      icon={<Radio className="w-5 h-5" style={{ color: 'var(--color-brand-accent)' }} />}
      footer={modalFooter}
      maxWidth="2xl"
    >
      <form id="gps-device-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div
            className="p-3 flex items-center gap-2.5"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderInlineStart: `3px solid ${EDITORIAL_STATUS.red.stripe}`,
              borderRadius: 'var(--radius-sm)',
              color: EDITORIAL_STATUS.red.text,
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-xs">{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Hardware Identification */}
        <div
          className="p-4 space-y-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div
            className="flex items-center justify-between pb-2"
            style={{ borderBottom: '1px solid var(--color-row-divider)' }}
          >
            <div
              className="flex items-center gap-2 text-xs font-semibold"
              style={{ color: 'var(--color-ink)' }}
            >
              <span
                className="w-5 h-5 flex items-center justify-center font-bold text-[11px]"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                1
              </span>
              <Cpu className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Hardware Identification')}</span>
            </div>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--color-brand-accent)' }}>
              {t('* 15-Digit Unique IMEI Required')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Device IMEI Number')}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="e.g. 864019283746101"
                value={imei}
                onChange={(e) => {
                  setImei(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Serial Number (Optional)')}
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder="e.g. SN-TK-9014"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="nf-field w-full"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="md:col-span-2">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Device Make & Model')}
              </label>
              <select
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="nf-field w-full"
              >
                {COMMON_DEVICE_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model === 'Other / Custom Model' ? t('Other / Custom Model') : model}
                  </option>
                ))}
              </select>
            </div>

            {deviceModel === 'Other / Custom Model' && (
              <div className="md:col-span-2">
                <label
                  className="text-xs font-semibold block mb-1"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {t('Specify Custom Hardware Model')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('e.g. Tramigo T23 Fleet')}
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  className="nf-field w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Tractor Truck Assignment */}
        <div
          className="p-4 space-y-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div
            className="flex items-center justify-between pb-2"
            style={{ borderBottom: '1px solid var(--color-row-divider)' }}
          >
            <div
              className="flex items-center gap-2 text-xs font-semibold"
              style={{ color: 'var(--color-ink)' }}
            >
              <span
                className="w-5 h-5 flex items-center justify-center font-bold text-[11px]"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                2
              </span>
              <Truck className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Tractor Truck Assignment')}</span>
            </div>
            <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {selectedVehicle
                ? `${t('Paired to')} ${selectedVehicle.vehicle_id}`
                : t('Standby Spare Inventory')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="md:col-span-2">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Assigned Tractor Head Truck')}
              </label>
              <select
                value={installedVehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="nf-field w-full"
              >
                <option value="">{t('-- Unassigned / Standby Spare Unit --')}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_id} — {v.plate_number} ({v.make} {v.model})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Installation Odometer (KM)')}
              </label>
              <input
                type="number"
                min="0"
                dir="ltr"
                value={installationOdometer}
                onChange={(e) => setInstallationOdometer(Number(e.target.value))}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          {/* Selected Truck Information Preview Card */}
          {selectedVehicle ? (
            <div
              className="p-3 space-y-2"
              style={{
                background: 'var(--color-page-bg)',
                border: '1px solid var(--color-border)',
                borderInlineStart: '3px solid var(--color-brand-accent)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4" style={{ color: 'var(--color-brand-accent)' }} />
                  <span className="font-semibold" style={{ color: 'var(--color-ink)' }} dir="ltr">
                    {selectedVehicle.vehicle_id}
                  </span>
                  <PlateChip plate={selectedVehicle.plate_number} />
                  <span
                    className="text-[11px] font-semibold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
                  >
                    {selectedVehicle.make} {selectedVehicle.model}
                  </span>
                </div>
                <span
                  className="text-[11px] font-medium px-2 py-0.5"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-ink)',
                  }}
                >
                  <span dir="ltr">{(selectedVehicle.current_mileage || 0).toLocaleString()}</span>{' '}
                  {t('KM')} • {selectedVehicle.station_location}
                </span>
              </div>

              {existingDeviceForTruck && (
                <div
                  className="p-2 text-[11px] flex items-center gap-2"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderInlineStart: `3px solid ${EDITORIAL_STATUS.amber.stripe}`,
                    borderRadius: 'var(--radius-sm)',
                    color: EDITORIAL_STATUS.amber.text,
                  }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isRTL ? (
                      <>
                        ملاحظة: الشاحنة <strong dir="ltr">{selectedVehicle.vehicle_id}</strong> مرتبطة حالياً
                        بجهاز IMEI{' '}
                        <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} dir="ltr">
                          {existingDeviceForTruck.device_imei}
                        </code>
                        . الحفظ سيعيد تعيينها.
                      </>
                    ) : (
                      <>
                        Note: <strong>{selectedVehicle.vehicle_id}</strong> is currently mapped to IMEI{' '}
                        <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {existingDeviceForTruck.device_imei}
                        </code>
                        . Saving will reassign it.
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              className="px-3 py-2 text-[11px] flex items-center gap-2"
              style={{
                background: 'var(--color-page-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-muted)',
              }}
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                {t('This unit will be stored as an unassigned spare in inventory until paired with a tractor head.')}
              </span>
            </div>
          )}
        </div>

        {/* Section 3: Cellular SIM & Commissioning */}
        <div
          className="p-4 space-y-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div
            className="flex items-center justify-between pb-2"
            style={{ borderBottom: '1px solid var(--color-row-divider)' }}
          >
            <div
              className="flex items-center gap-2 text-xs font-semibold"
              style={{ color: 'var(--color-ink)' }}
            >
              <span
                className="w-5 h-5 flex items-center justify-center font-bold text-[11px]"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                3
              </span>
              <Wifi className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Cellular Connectivity & Commissioning')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Installation Date')}
              </label>
              <input
                type="date"
                dir="ltr"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="nf-field w-full"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('M2M SIM Phone Number')}
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder="+966 50 XXX XXXX"
                value={simPhoneNumber}
                onChange={(e) => setSimPhoneNumber(e.target.value)}
                className="nf-field w-full"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('SIM Card ICCID')}
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder="89966..."
                value={simIccid}
                onChange={(e) => setSimIccid(e.target.value)}
                className="nf-field w-full"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="md:col-span-3">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Installation Notes & Wiring Location')}
              </label>
              <input
                type="text"
                placeholder={t(
                  'e.g. Installed behind lower dash fuse compartment; CAN high/low tapped into OBD port.'
                )}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="nf-field w-full"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
