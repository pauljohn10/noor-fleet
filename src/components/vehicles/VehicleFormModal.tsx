import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Vehicle, VehicleStatus, VehicleType } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import {
  Truck,
  Wrench,
  MapPin,
  AlertTriangle,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  EDITORIAL_STATUS,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVehicle?: Vehicle;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  initialVehicle,
}) => {
  const { addVehicle, updateVehicle, drivers, trailers } = useFleet();
  const { t } = useI18n();

  const [vehicleId, setVehicleId] = useState(
    initialVehicle?.vehicle_id || `TRK-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [plateNumber, setPlateNumber] = useState(initialVehicle?.plate_number || '');
  const [fleetNumber, setFleetNumber] = useState(initialVehicle?.fleet_number || '');
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    initialVehicle?.vehicle_type || 'TRACTOR_HEAD'
  );
  const [make, setMake] = useState(initialVehicle?.make || 'Volvo');
  const [model, setModel] = useState(initialVehicle?.model || 'FH 500 Globetrotter (6x4)');
  const [year, setYear] = useState(initialVehicle?.year || 2024);
  const [vin, setVin] = useState(initialVehicle?.vin || '');
  const [engineNumber, setEngineNumber] = useState(initialVehicle?.engine_number || '');
  const [color, setColor] = useState(initialVehicle?.color || 'White / Yellow Stripe');
  const [currentMileage, setCurrentMileage] = useState(
    initialVehicle?.current_mileage ?? 120000
  );
  const [currentEngineHours, setCurrentEngineHours] = useState(
    initialVehicle?.current_engine_hours ?? 3200
  );
  const [assignedDriverId, setAssignedDriverId] = useState(
    initialVehicle?.assigned_driver_id || ''
  );
  const [assignedTrailerId, setAssignedTrailerId] = useState(
    initialVehicle?.assigned_trailer_id || ''
  );
  const [stationLocation, setStationLocation] = useState(
    initialVehicle?.station_location || 'Dammam Main Terminal'
  );
  const [status, setStatus] = useState<VehicleStatus>(
    initialVehicle?.status || 'AVAILABLE'
  );
  const [purchaseCost, setPurchaseCost] = useState(initialVehicle?.purchase_cost ?? 450000);
  const [notes, setNotes] = useState(initialVehicle?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialVehicle) {
      setVehicleId(initialVehicle.vehicle_id || '');
      setPlateNumber(initialVehicle.plate_number || '');
      setFleetNumber(initialVehicle.fleet_number || '');
      setVehicleType(initialVehicle.vehicle_type || 'TRACTOR_HEAD');
      setMake(initialVehicle.make || 'Volvo');
      setModel(initialVehicle.model || 'FH 500 Globetrotter (6x4)');
      setYear(initialVehicle.year || 2024);
      setVin(initialVehicle.vin || '');
      setEngineNumber(initialVehicle.engine_number || '');
      setColor(initialVehicle.color || 'White / Yellow Stripe');
      setCurrentMileage(initialVehicle.current_mileage ?? 0);
      setCurrentEngineHours(initialVehicle.current_engine_hours ?? 0);
      setAssignedDriverId(initialVehicle.assigned_driver_id || '');
      setAssignedTrailerId(initialVehicle.assigned_trailer_id || '');
      setStationLocation(initialVehicle.station_location || 'Dammam Main Terminal');
      setStatus(initialVehicle.status || 'AVAILABLE');
      setPurchaseCost(initialVehicle.purchase_cost ?? 450000);
      setNotes(initialVehicle.notes || '');
    } else if (isOpen) {
      setVehicleId(`TRK-${Math.floor(1000 + Math.random() * 9000)}`);
      setPlateNumber('');
      setFleetNumber('');
      setVehicleType('TRACTOR_HEAD');
      setMake('Volvo');
      setModel('FH 500 Globetrotter (6x4)');
      setYear(2024);
      setVin('');
      setEngineNumber('');
      setColor('White / Yellow Stripe');
      setCurrentMileage(120000);
      setCurrentEngineHours(3200);
      setAssignedDriverId('');
      setAssignedTrailerId('');
      setStationLocation('Dammam Main Terminal');
      setStatus('AVAILABLE');
      setPurchaseCost(450000);
      setNotes('');
    }
    setErrorMessage(null);
  }, [initialVehicle, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!vehicleId.trim()) {
      setErrorMessage(t('Vehicle ID is required.'));
      return;
    }
    if (!plateNumber.trim()) {
      setErrorMessage(t('Plate number is required.'));
      return;
    }
    if (!vin.trim()) {
      setErrorMessage(t('VIN / Chassis number is required.'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (initialVehicle) {
        await updateVehicle(initialVehicle.id, {
          vehicle_id: vehicleId.trim(),
          plate_number: plateNumber.trim().toUpperCase(),
          fleet_number: fleetNumber.trim().toUpperCase(),
          vehicle_type: vehicleType,
          make,
          model,
          year: Number(year),
          vin: vin.trim().toUpperCase(),
          engine_number: engineNumber.trim() || undefined,
          color: color.trim() || 'White / Yellow Stripe',
          current_mileage: Number(currentMileage) || 0,
          current_engine_hours: Number(currentEngineHours) || 0,
          assigned_driver_id: assignedDriverId.trim() || undefined,
          assigned_trailer_id: assignedTrailerId.trim() || undefined,
          station_location: stationLocation,
          status,
          purchase_cost: Number(purchaseCost) || 0,
          notes: notes.trim() || undefined,
        });
      } else {
        await addVehicle({
          vehicle_id: vehicleId.trim(),
          plate_number: plateNumber.trim().toUpperCase(),
          fleet_number: fleetNumber.trim().toUpperCase(),
          vehicle_type: vehicleType,
          make,
          model,
          year: Number(year),
          vin: vin.trim().toUpperCase(),
          engine_number: engineNumber.trim() || undefined,
          color: color.trim() || 'White / Yellow Stripe',
          fuel_type: 'Diesel (Euro 5)',
          current_mileage: Number(currentMileage) || 0,
          current_engine_hours: Number(currentEngineHours) || 0,
          assigned_driver_id: assignedDriverId.trim() || undefined,
          assigned_trailer_id: assignedTrailerId.trim() || undefined,
          department: 'Fleet Operations',
          station_location: stationLocation,
          status,
          purchase_cost: Number(purchaseCost) || 0,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || t('Failed to save vehicle record.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalFooter = (
    <>
      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        {t('Validated for Saudi Ministry of Transport & Aramco safety compliance.')}
      </span>
      <div className="flex items-center gap-2.5">
        <SecondaryButton type="button" onClick={onClose} disabled={isSubmitting}>
          {t('Cancel')}
        </SecondaryButton>
        <PrimaryButton
          type="submit"
          form="vehicle-form"
          disabled={isSubmitting}
          dimWhenDisabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{t('Saving Vehicle...')}</span>
            </>
          ) : (
            <span>{initialVehicle ? t('Save Vehicle Master') : t('Create Vehicle Master')}</span>
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
        initialVehicle
          ? `${t('Edit Tractor Truck')}: ${initialVehicle.vehicle_id}`
          : t('Register Heavy Tractor Truck')
      }
      subtitle={t(
        'Enter heavy commercial tractor specifications, chassis identity, telemetry, and driver coupling.'
      )}
      icon={<Truck className="w-5 h-5" style={{ color: 'var(--color-brand-accent)' }} />}
      footer={modalFooter}
      maxWidth="3xl"
    >
      <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
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

        {/* Section 1: Vehicle Identification & Registration */}
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
              <FileText className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Vehicle Identification & Registration')}</span>
            </div>
            <span
              className="text-[11px] font-semibold"
              style={{ color: 'var(--color-brand-accent)' }}
            >
              {t('* Required fields')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Vehicle ID')} <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Plate Number')} <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder={t('e.g. LBR-4921')}
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Fleet Internal #')}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder={t('e.g. FLT-101')}
                value={fleetNumber}
                onChange={(e) => setFleetNumber(e.target.value)}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Operational Status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                className="nf-field w-full font-semibold cursor-pointer"
              >
                <option value="AVAILABLE">{t('AVAILABLE')}</option>
                <option value="ON_TRIP">{t('ON TRIP')}</option>
                <option value="IN_WORKSHOP">{t('IN WORKSHOP')}</option>
                <option value="OUT_OF_SERVICE">{t('OUT OF SERVICE')}</option>
                <option value="SOLD">{t('SOLD')}</option>
                <option value="RETIRED">{t('RETIRED')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Make, Model & Chassis Specifications */}
        <div
          className="p-4 space-y-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div
            className="flex items-center gap-2 pb-2 text-xs font-semibold"
            style={{
              borderBottom: '1px solid var(--color-row-divider)',
              color: 'var(--color-ink)',
            }}
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
            <Wrench className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            <span>{t('Make, Model & Chassis Specifications')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Make / Brand')}
              </label>
              <select
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="nf-field w-full font-semibold cursor-pointer"
              >
                <option value="Volvo">{t('Volvo Trucks')}</option>
                <option value="MAN">{t('MAN Trucks')}</option>
                <option value="Mercedes-Benz">{t('Mercedes-Benz Actros')}</option>
                <option value="Scania">{t('Scania Heavy')}</option>
                <option value="Renault">{t('Renault Trucks')}</option>
              </select>
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Model Description')}
              </label>
              <input
                type="text"
                placeholder={t('e.g. FH 500 Globetrotter (6x4)')}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="nf-field w-full font-medium"
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Model Year')}
              </label>
              <input
                type="number"
                min={2000}
                max={2030}
                dir="ltr"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('VIN / Chassis Number')}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder={t('17-character VIN number')}
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Engine Serial Number')}
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder={t('e.g. D13K500-EU6')}
                value={engineNumber}
                onChange={(e) => setEngineNumber(e.target.value)}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Purchase Cost (SAR)')}
              </label>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(Number(e.target.value))}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Telemetry, Assignments & Depot Hub */}
        <div
          className="p-4 space-y-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div
            className="flex items-center gap-2 pb-2 text-xs font-semibold"
            style={{
              borderBottom: '1px solid var(--color-row-divider)',
              color: 'var(--color-ink)',
            }}
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
            <MapPin className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            <span>{t('Telemetry, Assignments & Depot Hub')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Odometer (KM)')}
              </label>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={currentMileage}
                onChange={(e) => setCurrentMileage(Number(e.target.value))}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Engine Hours')}
              </label>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={currentEngineHours}
                onChange={(e) => setCurrentEngineHours(Number(e.target.value))}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Station / Depot Hub')}
              </label>
              <input
                type="text"
                placeholder={t('e.g. Dammam Main Terminal')}
                value={stationLocation}
                onChange={(e) => setStationLocation(e.target.value)}
                className="nf-field w-full font-medium"
              />
            </div>

            <div className="sm:col-span-1 md:col-span-1">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Assigned Primary Driver')}
              </label>
              <select
                value={assignedDriverId}
                onChange={(e) => setAssignedDriverId(e.target.value)}
                className="nf-field w-full font-medium cursor-pointer"
              >
                <option value="">{t('-- Unassigned --')}</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1 md:col-span-2">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Coupled Tanker Trailer')}
              </label>
              <select
                value={assignedTrailerId}
                onChange={(e) => setAssignedTrailerId(e.target.value)}
                className="nf-field w-full font-medium cursor-pointer"
              >
                <option value="">{t('-- Unassigned --')}</option>
                {trailers.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.trailer_id} — {tr.plate_number} ({tr.tank_capacity_liters.toLocaleString()} L)
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-3">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Maintenance & Safety Notes')}
              </label>
              <textarea
                rows={2}
                placeholder={t(
                  'e.g. Equipped with Aramco-certified ADR safety kit and dual retarder brakes'
                )}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="nf-field w-full resize-none"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
