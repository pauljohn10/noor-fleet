import React, { useState, useEffect } from 'react';
import { X, Car, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { SmallVehicle, SmallVehicleInput } from '../../types';

interface SmallVehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVehicle?: SmallVehicle | null;
  onSuccess?: (vehicle: SmallVehicle) => void;
}

const COMMON_BRANDS = [
  'Toyota',
  'Isuzu',
  'Hyundai',
  'Nissan',
  'Ford',
  'Chevrolet',
  'Suzuki',
  'Mitsubishi',
  'Kia',
  'GMC'
];

export const SmallVehicleFormModal: React.FC<SmallVehicleFormModalProps> = ({
  isOpen,
  onClose,
  initialVehicle,
  onSuccess,
}) => {
  const { smallVehicles, addSmallVehicle, updateSmallVehicle } = useFleet();
  const { isRTL } = useI18n();

  const isEditing = Boolean(initialVehicle && initialVehicle.id);

  // Strictly ONLY the 6 allowed input fields
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [modelYear, setModelYear] = useState<string>('');
  const [brand, setBrand] = useState('');
  const [driverName, setDriverName] = useState('');
  const [departmentLocation, setDepartmentLocation] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Populate on open / change
  useEffect(() => {
    if (initialVehicle) {
      setPlateNumber(initialVehicle.plate_number || '');
      setVehicleNumber(initialVehicle.vehicle_number || '');
      setModelYear(initialVehicle.model_year ? String(initialVehicle.model_year) : '');
      setBrand(initialVehicle.brand || '');
      setDriverName(initialVehicle.driver_name || '');
      setDepartmentLocation(initialVehicle.department_location || '');
    } else {
      setPlateNumber('');
      setVehicleNumber('');
      setModelYear(String(new Date().getFullYear()));
      setBrand('');
      setDriverName('');
      setDepartmentLocation('');
    }
    setErrors({});
    setServerError(null);
  }, [initialVehicle, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Plate Number: required
    const cleanPlate = plateNumber.trim();
    if (!cleanPlate) {
      errs.plateNumber = isRTL ? 'ط±ظ‚ظ… ط§ظ„ظ„ظˆط­ط© ظ…ط·ظ„ظˆط¨' : 'Plate number is required';
    } else {
      // Duplicate check
      const dupPlate = smallVehicles.find(
        v => v.plate_number.toLowerCase() === cleanPlate.toLowerCase() &&
          (!isEditing || v.id !== initialVehicle?.id)
      );
      if (dupPlate) {
        errs.plateNumber = isRTL
          ? `ط±ظ‚ظ… ط§ظ„ظ„ظˆط­ط© ظ…ط³ط¬ظ„ ط¨ط§ظ„ظپط¹ظ„ ظ„ظ„ظ…ط±ظƒط¨ط© (${dupPlate.vehicle_number})`
          : `Plate number already exists for vehicle (${dupPlate.vehicle_number})`;
      }
    }

    // 2. Vehicle Number: required
    const cleanVehNum = vehicleNumber.trim();
    if (!cleanVehNum) {
      errs.vehicleNumber = isRTL ? 'ط±ظ‚ظ… ط§ظ„ظ…ط±ظƒط¨ط© ظ…ط·ظ„ظˆط¨' : 'Vehicle number is required';
    } else {
      // Duplicate check
      const dupVeh = smallVehicles.find(
        v => v.vehicle_number.toLowerCase() === cleanVehNum.toLowerCase() &&
          (!isEditing || v.id !== initialVehicle?.id)
      );
      if (dupVeh) {
        errs.vehicleNumber = isRTL
          ? `ط±ظ‚ظ… ط§ظ„ظ…ط±ظƒط¨ط© ظ…ط³ط¬ظ„ ط¨ط§ظ„ظپط¹ظ„`
          : `Vehicle number already registered`;
      }
    }

    // 3. Model Year: optional number validation
    if (modelYear.trim()) {
      const yr = Number(modelYear);
      if (isNaN(yr) || yr < 1980 || yr > 2100) {
        errs.modelYear = isRTL
          ? 'ط³ظ†ط© ط§ظ„طµظ†ط¹ ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط¨ظٹظ† 1980 ظˆ 2100'
          : 'Model year must be between 1980 and 2100';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    const payload: SmallVehicleInput = {
      plate_number: plateNumber.trim().toUpperCase(),
      vehicle_number: vehicleNumber.trim().toUpperCase(),
      model_year: modelYear.trim() ? Number(modelYear) : null,
      brand: brand.trim() || null,
      driver_name: driverName.trim() || null,
      department_location: departmentLocation.trim() || null,
    };

    try {
      let saved: SmallVehicle;
      if (isEditing && initialVehicle) {
        saved = await updateSmallVehicle(initialVehicle.id, payload);
      } else {
        saved = await addSmallVehicle(payload);
      }
      onSuccess?.(saved);
      onClose();
    } catch (err: any) {
      console.error('[SmallVehicleFormModal] Save error:', err);
      // Friendly message if table missing or duplicate check
      const msg = err?.message || 'Failed to save small vehicle.';
      if (msg.includes('relation "public.small_vehicles" does not exist') || msg.includes('schema cache')) {
        setServerError(
          isRTL
            ? 'ط¬ط¯ظˆظ„ small_vehicles ظ„ظ… ظٹطھظ… ط¥ظ†ط´ط§ط¤ظ‡ ظپظٹ Supabase ط¨ط¹ط¯. ظٹط±ط¬ظ‰ طھط´ط؛ظٹظ„ ظ…ظ„ظپ migration ظپظٹ ظ…ط­ط±ط± SQL.'
            : 'The table "small_vehicles" does not exist in Supabase yet. Please execute the migration script in your Supabase SQL Editor.'
        );
      } else {
        setServerError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        padding: 16,
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: 540,
          background: 'var(--color-surface, #ffffff)',
          color: 'var(--color-ink, #0f172a)',
          borderRadius: 8,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          border: '1px solid var(--color-border, #e2e8f0)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--color-row-divider, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-page-bg, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: 'var(--color-ink, #0f172a)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Car size={18} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: 'var(--font-brand)',
                  color: 'var(--color-ink, #0f172a)',
                }}
              >
                {isEditing
                  ? (isRTL ? 'طھط¹ط¯ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط±ظƒط¨ط© ط§ظ„طµط؛ظٹط±ط©' : 'Edit Small Vehicle')
                  : (isRTL ? 'ط¥ط¶ط§ظپط© ظ…ط±ظƒط¨ط© طµط؛ظٹط±ط© ط¬ط¯ظٹط¯ط©' : 'Add Small Vehicle')}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--color-text-muted, #64748b)',
                  marginTop: 2,
                }}
              >
                {isEditing
                  ? (isRTL ? `طھط­ط¯ظٹط« ط§ظ„ط³ط¬ظ„: ${initialVehicle?.vehicle_number}` : `Updating record: ${initialVehicle?.vehicle_number}`)
                  : (isRTL ? 'طھط³ط¬ظٹظ„ ظ…ط±ظƒط¨ط© ط®ط¯ظ…ط© ط£ظˆ ط¨ظٹظƒ ط¢ط¨ ط£ظˆ ط³ظٹط§ط±ط© ط¥ط¯ط§ط±ظٹط©' : 'Register service pickup, commercial light vehicle or admin car')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted, #64748b)',
              padding: 6,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            style={{
              margin: '16px 24px 0',
              padding: '12px 14px',
              borderRadius: 6,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>{serverError}</div>
          </div>
        )}

        {/* Form Body - ONLY 6 Allowed Fields */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              padding: '20px 24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Auto Serial Number Notice */}
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--color-page-bg, #f8fafc)',
                borderRadius: 4,
                border: '1px dashed var(--color-border, #cbd5e1)',
                fontSize: 12.5,
                color: 'var(--color-text-secondary, #475569)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                <strong>{isRTL ? 'ط§ظ„ط±ظ‚ظ… ط§ظ„طھط³ظ„ط³ظ„ظٹ (Sn):' : 'Serial Number (Sn):'}</strong>{' '}
                {isEditing ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    #{initialVehicle?.sn}
                  </span>
                ) : (
                  <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                    {isRTL ? 'ظٹطھظ… ط§ظ„طھظˆظ„ظٹط¯ طھظ„ظ‚ط§ط¦ظٹط§ظ‹ ط¨ظˆط§ط³ط·ط© ط§ظ„ظ†ط¸ط§ظ…' : 'Auto-generated by system upon registration'}
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-brand-accent, #0F5C4D)',
                }}
              >
                Auto Identity
              </span>
            </div>

            {/* Row 1: Plate No & Vehicle Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Field 1: Plate No. */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 5,
                    color: 'var(--color-ink, #0f172a)',
                  }}
                >
                  {isRTL ? 'ط±ظ‚ظ… ط§ظ„ظ„ظˆط­ط©' : 'Plate No.'}{' '}
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={isRTL ? 'ظ…ط«ط§ظ„: 5691 ZJB' : 'e.g. 5691 ZJB'}
                  value={plateNumber}
                  onChange={e => {
                    setPlateNumber(e.target.value);
                    if (errors.plateNumber) setErrors(prev => ({ ...prev, plateNumber: '' }));
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono, monospace)',
                    borderRadius: 4,
                    border: errors.plateNumber ? '1px solid #dc2626' : '1px solid var(--color-input-border, #cbd5e1)',
                    background: 'var(--color-surface, #ffffff)',
                    color: 'var(--color-ink, #0f172a)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: '0.04em',
                  }}
                />
                {errors.plateNumber && (
                  <span style={{ display: 'block', fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                    {errors.plateNumber}
                  </span>
                )}
              </div>

              {/* Field 2: Vehicle Number */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 5,
                    color: 'var(--color-ink, #0f172a)',
                  }}
                >
                  {isRTL ? 'ط±ظ‚ظ… ط§ظ„ظ…ط±ظƒط¨ط©' : 'Vehicle Number'}{' '}
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={isRTL ? 'ظ…ط«ط§ظ„: SV-1-100' : 'e.g. SV-1-100'}
                  value={vehicleNumber}
                  onChange={e => {
                    setVehicleNumber(e.target.value);
                    if (errors.vehicleNumber) setErrors(prev => ({ ...prev, vehicleNumber: '' }));
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono, monospace)',
                    borderRadius: 4,
                    border: errors.vehicleNumber ? '1px solid #dc2626' : '1px solid var(--color-input-border, #cbd5e1)',
                    background: 'var(--color-surface, #ffffff)',
                    color: 'var(--color-ink, #0f172a)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: '0.04em',
                  }}
                />
                {errors.vehicleNumber && (
                  <span style={{ display: 'block', fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                    {errors.vehicleNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Model Year & Brand */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Field 3: Model Year */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 5,
                    color: 'var(--color-ink, #0f172a)',
                  }}
                >
                  {isRTL ? 'ط³ظ†ط© ط§ظ„طµظ†ط¹' : 'Model Year'}
                </label>
                <input
                  type="number"
                  min="1980"
                  max="2100"
                  placeholder="2023"
                  value={modelYear}
                  onChange={e => {
                    setModelYear(e.target.value);
                    if (errors.modelYear) setErrors(prev => ({ ...prev, modelYear: '' }));
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono, monospace)',
                    borderRadius: 4,
                    border: errors.modelYear ? '1px solid #dc2626' : '1px solid var(--color-input-border, #cbd5e1)',
                    background: 'var(--color-surface, #ffffff)',
                    color: 'var(--color-ink, #0f172a)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.modelYear && (
                  <span style={{ display: 'block', fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                    {errors.modelYear}
                  </span>
                )}
              </div>

              {/* Field 4: Brand */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 5,
                    color: 'var(--color-ink, #0f172a)',
                  }}
                >
                  {isRTL ? 'ط§ظ„ظ…ط§ط±ظƒط© / ط§ظ„ظ†ظˆط¹' : 'Brand'}
                </label>
                <input
                  type="text"
                  list="brands-datalist"
                  placeholder={isRTL ? 'ظ…ط«ط§ظ„: Isuzu ط£ظˆ Toyota' : 'e.g. Isuzu or Toyota'}
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    borderRadius: 4,
                    border: '1px solid var(--color-input-border, #cbd5e1)',
                    background: 'var(--color-surface, #ffffff)',
                    color: 'var(--color-ink, #0f172a)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <datalist id="brands-datalist">
                  {COMMON_BRANDS.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Field 5: Driver Name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 5,
                  color: 'var(--color-ink, #0f172a)',
                }}
              >
                {isRTL ? 'ط§ط³ظ… ط§ظ„ط³ط§ط¦ظ‚' : 'Driver Name'}
              </label>
              <input
                type="text"
                placeholder={isRTL ? 'ظ…ط«ط§ظ„: ط£ط­ظ…ط¯ ط¹ط¨ط¯ ط§ظ„ظ„ظ‡ (ط£ظˆ ظٹطھط±ظƒ ظپط§ط±ط؛ط§ظ‹ ط¥ط°ط§ ظƒط§ظ† ط§ط­طھظٹط§ط·ظٹط§ظ‹)' : 'e.g. Ahmed Abdullah (or leave blank if pool / standby)'}
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  borderRadius: 4,
                  border: '1px solid var(--color-input-border, #cbd5e1)',
                  background: 'var(--color-surface, #ffffff)',
                  color: 'var(--color-ink, #0f172a)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Field 6: Dept. / Location */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 5,
                  color: 'var(--color-ink, #0f172a)',
                }}
              >
                {isRTL ? 'ط§ظ„ظ‚ط³ظ… / ط§ظ„ظ…ظˆظ‚ط¹' : 'Dept. / Location'}
              </label>
              <input
                type="text"
                placeholder={isRTL ? 'ظ…ط«ط§ظ„: Workshop - Najran ط£ظˆ Admin - Riyadh' : 'e.g. Workshop - Najran or Admin - Riyadh'}
                value={departmentLocation}
                onChange={e => setDepartmentLocation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  borderRadius: 4,
                  border: '1px solid var(--color-input-border, #cbd5e1)',
                  background: 'var(--color-surface, #ffffff)',
                  color: 'var(--color-ink, #0f172a)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--color-row-divider, #f1f5f9)',
              background: 'var(--color-page-bg, #f8fafc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--color-border, #cbd5e1)',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-secondary, #475569)',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {isRTL ? 'ط¥ظ„ط؛ط§ط،' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 18px',
                background: 'var(--color-ink, #0f172a)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              <CheckCircle2 size={15} />
              <span>
                {submitting
                  ? (isRTL ? 'ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸...' : 'Saving...')
                  : isEditing
                    ? (isRTL ? 'ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ' : 'Update Vehicle')
                    : (isRTL ? 'ط¥ط¶ط§ظپط© ط§ظ„ظ…ط±ظƒط¨ط©' : 'Add Vehicle')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
