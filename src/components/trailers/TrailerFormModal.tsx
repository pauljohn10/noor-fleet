import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Trailer, TrailerStatus } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { Truck, ShieldCheck, AlertTriangle, Loader2, FileText, Droplets, Link2 } from 'lucide-react';
import {
  EDITORIAL_STATUS,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface TrailerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrailer?: Trailer;
}

export const TrailerFormModal: React.FC<TrailerFormModalProps> = ({
  isOpen,
  onClose,
  initialTrailer,
}) => {
  const { addTrailer, updateTrailer, vehicles } = useFleet();
  const { t } = useI18n();

  const [trailerId, setTrailerId] = useState(
    initialTrailer?.trailer_id || `TRL-${Math.floor(200 + Math.random() * 800)}`
  );
  const [trailerNumber, setTrailerNumber] = useState(
    initialTrailer?.trailer_number || `T-${Math.floor(200 + Math.random() * 800)}`
  );
  const [plateNumber, setPlateNumber] = useState(initialTrailer?.plate_number || '');
  const [tankCapacityLiters, setTankCapacityLiters] = useState(
    initialTrailer?.tank_capacity_liters || 36000
  );
  const [numberOfCompartments, setNumberOfCompartments] = useState(
    initialTrailer?.number_of_compartments || 4
  );
  const [manufacturer, setManufacturer] = useState(
    initialTrailer?.manufacturer || 'Al-Mutlaq Tankers'
  );
  const [model, setModel] = useState(initialTrailer?.model || '36K-ALU-4C');
  const [year, setYear] = useState(initialTrailer?.year || 2023);
  const [vin, setVin] = useState(initialTrailer?.vin || '');
  const [tankType, setTankType] = useState(
    initialTrailer?.tank_type || 'Aluminum Alloy Fuel Tanker'
  );
  const [assignedTractorId, setAssignedTractorId] = useState(
    initialTrailer?.assigned_tractor_id || ''
  );
  const [status, setStatus] = useState<TrailerStatus>(initialTrailer?.status || 'AVAILABLE');
  const [currentLocation, setCurrentLocation] = useState(
    initialTrailer?.current_location || 'Dammam Fuel Terminal'
  );
  const [notes, setNotes] = useState(initialTrailer?.notes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialTrailer) {
      setTrailerId(initialTrailer.trailer_id);
      setTrailerNumber(initialTrailer.trailer_number);
      setPlateNumber(initialTrailer.plate_number);
      setTankCapacityLiters(initialTrailer.tank_capacity_liters);
      setNumberOfCompartments(initialTrailer.number_of_compartments);
      setManufacturer(initialTrailer.manufacturer);
      setModel(initialTrailer.model);
      setYear(initialTrailer.year);
      setVin(initialTrailer.vin);
      setTankType(initialTrailer.tank_type);
      setAssignedTractorId(initialTrailer.assigned_tractor_id || '');
      setStatus(initialTrailer.status);
      setCurrentLocation(initialTrailer.current_location);
      setNotes(initialTrailer.notes || '');
    } else {
      const randNum = Math.floor(200 + Math.random() * 800);
      setTrailerId(`TRL-${randNum}`);
      setTrailerNumber(`T-${randNum}`);
      setPlateNumber('');
      setTankCapacityLiters(36000);
      setNumberOfCompartments(4);
      setManufacturer('Al-Mutlaq Tankers');
      setModel('36K-ALU-4C');
      setYear(2023);
      setVin('');
      setTankType('Aluminum Alloy Fuel Tanker');
      setAssignedTractorId('');
      setStatus('AVAILABLE');
      setCurrentLocation('Dammam Fuel Terminal');
      setNotes('');
    }
    setErrorMessage(null);
  }, [initialTrailer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPlate = plateNumber.trim();
    const cleanVin = vin.trim();

    if (!cleanPlate || !cleanVin) {
      setErrorMessage(
        t('Please fill in required fields: Plate Number and VIN / Chassis Number.')
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        trailer_id: trailerId.trim(),
        trailer_number: trailerNumber.trim(),
        plate_number: cleanPlate.toUpperCase(),
        tank_capacity_liters: Number(tankCapacityLiters),
        number_of_compartments: Number(numberOfCompartments),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        year: Number(year),
        vin: cleanVin.toUpperCase(),
        tank_type: tankType.trim(),
        assigned_tractor_id: assignedTractorId || undefined,
        status,
        current_location: currentLocation.trim(),
        notes: notes.trim() || undefined,
      };

      if (initialTrailer) {
        await updateTrailer(initialTrailer.id, payload);
      } else {
        await addTrailer(payload);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || t('An error occurred while saving trailer details.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalFooter = (
    <>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: EDITORIAL_STATUS.green.text }} />
        <span>{t('Saudi SASO and Aramco petroleum transport certified specification.')}</span>
      </div>

      <div className="flex items-center justify-end gap-2.5 shrink-0">
        <SecondaryButton type="button" onClick={onClose} disabled={isSubmitting}>
          {t('Cancel')}
        </SecondaryButton>
        <PrimaryButton type="submit" form="trailer-form" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('Saving Trailer...')}</span>
            </>
          ) : (
            <span>{initialTrailer ? t('Save Trailer Master') : t('Create Trailer Master')}</span>
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
        initialTrailer
          ? `${t('Edit Tanker Trailer')}: ${initialTrailer.trailer_id}`
          : t('Register New Fuel Tanker Trailer')
      }
      subtitle={t('Configure tanker compartment capacities, discharge manifold specs, and tractor coupling.')}
      icon={<Truck className="w-5 h-5" style={{ color: 'var(--color-brand-accent)' }} />}
      footer={modalFooter}
      maxWidth="3xl"
    >
      <form id="trailer-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
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

        {/* Section 1: Identification & Registration */}
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
              <span>{t('Trailer Identification & Registry')}</span>
            </div>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--color-brand-accent)' }}>
              {t('* Required fields')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Trailer ID')} <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={trailerId}
                onChange={(e) => setTrailerId(e.target.value)}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Trailer Internal #')}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={trailerNumber}
                onChange={(e) => setTrailerNumber(e.target.value)}
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
                placeholder={t('e.g. TRA-3310')}
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
                {t('Model Year')}
              </label>
              <input
                type="number"
                min={2000}
                max={2030}
                dir="ltr"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="nf-field w-full"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Tank Specifications */}
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
              <Droplets className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Tank Construction & Volumetric Capacity')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Capacity (Liters)')}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="number"
                required
                min={1000}
                max={60000}
                step={500}
                dir="ltr"
                value={tankCapacityLiters}
                onChange={(e) => setTankCapacityLiters(Number(e.target.value))}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Compartments')}
              </label>
              <select
                value={numberOfCompartments}
                onChange={(e) => setNumberOfCompartments(Number(e.target.value))}
                className="nf-field w-full"
              >
                <option value={1}>1 {t('Compartment')}</option>
                <option value={2}>2 {t('Compartments')}</option>
                <option value={3}>3 {t('Compartments')}</option>
                <option value={4}>
                  4 {t('Compartments')} ({t('Standard')})
                </option>
                <option value={5}>5 {t('Compartments')}</option>
                <option value={6}>6 {t('Compartments')}</option>
              </select>
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Manufacturer')}
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="nf-field w-full"
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Model / Serial')}
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="nf-field w-full"
              />
            </div>

            <div className="md:col-span-2">
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
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder={t('17-character VIN number')}
                className="nf-field w-full"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="md:col-span-2">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Tank Material / Type')}
              </label>
              <input
                type="text"
                value={tankType}
                onChange={(e) => setTankType(e.target.value)}
                className="nf-field w-full"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Operational Assignment & Location */}
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
              <Link2 className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Operational Coupling & Depot Location')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Coupled Tractor Head')}
              </label>
              <select
                value={assignedTractorId}
                onChange={(e) => setAssignedTractorId(e.target.value)}
                className="nf-field w-full"
              >
                <option value="">{t('-- Uncoupled / Yard Standby --')}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_id} ({v.plate_number}) - {v.make}
                  </option>
                ))}
              </select>
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
                onChange={(e) => setStatus(e.target.value as TrailerStatus)}
                className="nf-field w-full font-semibold"
              >
                <option value="AVAILABLE">{t('AVAILABLE')}</option>
                <option value="ASSIGNED">{t('ASSIGNED')}</option>
                <option value="IN_WORKSHOP">{t('IN WORKSHOP')}</option>
                <option value="OUT_OF_SERVICE">{t('OUT OF SERVICE')}</option>
                <option value="RETIRED">{t('RETIRED')}</option>
              </select>
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Current Terminal Location')}
              </label>
              <input
                type="text"
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                placeholder={t('e.g. Dammam Main Depot')}
                className="nf-field w-full"
              />
            </div>

            <div className="md:col-span-3">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Operational Notes / Discharge Valves')}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t(
                  'e.g. 4-inch API bottom couplers, vapor recovery line, hydrostatic certification valid'
                )}
                className="nf-field w-full"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
