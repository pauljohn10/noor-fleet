import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Driver } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { UserCheck, ShieldCheck, AlertTriangle, Loader2, FileText, Phone } from 'lucide-react';
import {
  EDITORIAL_STATUS,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDriver?: Driver;
}

export const DriverFormModal: React.FC<DriverFormModalProps> = ({
  isOpen,
  onClose,
  initialDriver,
}) => {
  const { addDriver, updateDriver, vehicles, updateVehicle } = useFleet();
  const { t } = useI18n();

  const [fullName, setFullName] = useState(initialDriver?.full_name || '');
  const [employeeId, setEmployeeId] = useState(
    initialDriver?.employee_id || `DRV-${Math.floor(100 + Math.random() * 900)}`
  );
  const [licenseNumber, setLicenseNumber] = useState(initialDriver?.license_number || '');
  const [licenseType, setLicenseType] = useState(
    initialDriver?.license_type || 'Heavy Transport & Hazmat (Type 1)'
  );
  const [licenseExpiry, setLicenseExpiry] = useState(
    initialDriver?.license_expiry || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [phone, setPhone] = useState(initialDriver?.phone || '');
  const [status, setStatus] = useState<'ACTIVE' | 'ON_LEAVE' | 'INACTIVE'>(
    initialDriver?.status || 'ACTIVE'
  );
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [notes, setNotes] = useState(initialDriver?.notes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialDriver) {
      setFullName(initialDriver.full_name);
      setEmployeeId(initialDriver.employee_id);
      setLicenseNumber(initialDriver.license_number);
      setLicenseType(initialDriver.license_type);
      setLicenseExpiry(initialDriver.license_expiry);
      setPhone(initialDriver.phone || '');
      setStatus(initialDriver.status);
      const linked = vehicles.find((v) => v.assigned_driver_id === initialDriver.id);
      setAssignedVehicleId(linked?.id || '');
      setNotes(initialDriver.notes || '');
    } else {
      setFullName('');
      setEmployeeId(`DRV-${Math.floor(100 + Math.random() * 900)}`);
      setLicenseNumber('');
      setLicenseType('Heavy Transport & Hazmat (Type 1)');
      setLicenseExpiry(new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10));
      setPhone('');
      setStatus('ACTIVE');
      setAssignedVehicleId('');
      setNotes('');
    }
    setErrorMessage(null);
  }, [initialDriver, isOpen, vehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanEmp = employeeId.trim();
    const cleanLic = licenseNumber.trim();

    if (!cleanName || !cleanEmp || !cleanLic) {
      setErrorMessage(
        t('Please fill in required fields: Full Name, Employee ID, and License Number.')
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: cleanName,
        employee_id: cleanEmp.toUpperCase(),
        license_number: cleanLic.toUpperCase(),
        license_type: licenseType.trim(),
        license_expiry: licenseExpiry,
        phone: phone.trim() || '+966 50 000 0000',
        status,
        notes: notes.trim() || undefined,
      };

      if (initialDriver) {
        await updateDriver(initialDriver.id, payload);
        if (assignedVehicleId) {
          updateVehicle(assignedVehicleId, { assigned_driver_id: initialDriver.id });
        }
      } else {
        addDriver(payload);
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || t('An error occurred while saving driver.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalFooter = (
    <>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: EDITORIAL_STATUS.green.text }} />
        <span>{t('Saudi ADR Hazmat certified commercial transport operator roster.')}</span>
      </div>

      <div className="flex items-center justify-end gap-2.5 shrink-0">
        <SecondaryButton type="button" onClick={onClose} disabled={isSubmitting}>
          {t('Cancel')}
        </SecondaryButton>
        <PrimaryButton type="submit" form="driver-form" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('Saving Driver...')}</span>
            </>
          ) : (
            <span>{initialDriver ? t('Save Driver Profile') : t('Register Driver')}</span>
          )}
        </PrimaryButton>
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        initialDriver
          ? `${t('Edit Driver Profile')}: ${initialDriver.full_name}`
          : t('Register New Transport Driver')
      }
      subtitle={t(
        'Heavy vehicle transport driver profile, hazardous materials certification, and vehicle allocation.'
      )}
      icon={<UserCheck className="w-5 h-5" style={{ color: 'var(--color-brand-accent)' }} />}
      footer={modalFooter}
      maxWidth="3xl"
    >
      <form id="driver-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
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

        {/* Section 1: Personal & Identification */}
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
              <UserCheck className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Driver Personal & Employment Identity')}</span>
            </div>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--color-brand-accent)' }}>
              {t('* Required fields')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="md:col-span-2">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Full Legal Name')}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder={t('e.g. Mohammed Tariq Al-Dosari')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="nf-field w-full font-medium"
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Employee ID')} <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Driver Duty Status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="nf-field w-full font-semibold"
              >
                <option value="ACTIVE">{t('ACTIVE (On Duty)')}</option>
                <option value="ON_LEAVE">{t('ON LEAVE')}</option>
                <option value="INACTIVE">{t('INACTIVE')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Driver License & Hazmat Certification */}
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
              <FileText className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Commercial License & Hazmat Certification')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('License Number')}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder={t('e.g. DL-SA-90142')}
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="md:col-span-2">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('License Category')}
              </label>
              <select
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value)}
                className="nf-field w-full"
              >
                <option value="Heavy Transport & Hazmat (Type 1)">
                  {t('Heavy Transport & Hazmat (Type 1)')}
                </option>
                <option value="Heavy Vehicle Transport (Type 2)">
                  {t('Heavy Vehicle Transport (Type 2)')}
                </option>
                <option value="Aramco Hazardous Liquid Certified">
                  {t('Aramco Hazardous Liquid Certified')}
                </option>
                <option value="General Commercial">{t('General Commercial')}</option>
              </select>
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('License Expiry Date')}
              </label>
              <input
                type="date"
                required
                dir="ltr"
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
                className="nf-field w-full"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Contact & Vehicle Allocation */}
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
              <Phone className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Contact & Tractor Truck Allocation')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Mobile Phone Number')}
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder="+966 50 XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="nf-field w-full"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="md:col-span-2">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Assigned Tractor Truck')}
              </label>
              <select
                value={assignedVehicleId}
                onChange={(e) => setAssignedVehicleId(e.target.value)}
                className="nf-field w-full"
              >
                <option value="">{t('-- Unassigned / Reserve Driver --')}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_id} ({v.plate_number}) - {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Driver Safety & Route Notes')}
              </label>
              <input
                type="text"
                placeholder={t('e.g. Aramco refinery access badge valid until Dec 2026')}
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
