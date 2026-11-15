import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { InspectionResult, SeverityLevel } from '../../types';
import {
  EDITORIAL_STATUS,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface InspectionFormMobileProps {
  onComplete: () => void;
}

interface ChecklistItemState {
  category: string;
  name: string;
  result: InspectionResult;
  severity: SeverityLevel;
  comment: string;
}

export const InspectionFormMobile: React.FC<InspectionFormMobileProps> = ({ onComplete }) => {
  const { vehicles, trailers, submitInspection } = useFleet();
  const { currentProfile } = useAuth();
  const { t } = useI18n();

  const [vehicleId, setVehicleId] = useState('');
  const [trailerId, setTrailerId] = useState('');
  const [odometer, setOdometer] = useState(142500);

  const initialItems: ChecklistItemState[] = [
    { category: 'ENGINE', name: 'Engine Oil & Belt Tension', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'BRAKES', name: 'Dual-Line Air Brakes & ABS Light', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'TIRES', name: 'Tire Tread Depth & Pressure', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'LIGHTS', name: 'Headlights, Turn Signals & Brake LED', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'BATTERY', name: 'Battery Terminals & Hold-Down', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'SUSPENSION', name: 'Air Springs & Leaf Spring Bushings', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'STEERING', name: 'Steering Linkage & Hydraulic Fluid', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'FUEL SYSTEM', name: 'Tractor Fuel Tank & Filters', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'TANKER', name: 'Tank Shell Integrity & Baffles', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'HOSES', name: 'Fuel Vapor & Discharge Hoses', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'VALVES', name: '4-Inch API Bottom Discharge Valves', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'COUPLING', name: 'Fifth Wheel Kingpin & Safety Latch', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'SAFETY EQUIPMENT', name: 'ATEX Grounding Reel & Clamp', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'FIRE EXTINGUISHER', name: 'Fire Extinguisher Charge & Tag', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'GENERAL CONDITION', name: 'Overall Cabin & Safety Reflectors', result: 'PASS', severity: 'LOW', comment: '' },
  ];

  const [items, setItems] = useState<ChecklistItemState[]>(initialItems);

  const handleResultChange = (index: number, result: InspectionResult) => {
    const updated = [...items];
    updated[index].result = result;
    setItems(updated);
  };

  const handleSeverityChange = (index: number, severity: SeverityLevel) => {
    const updated = [...items];
    updated[index].severity = severity;
    setItems(updated);
  };

  const handleCommentChange = (index: number, comment: string) => {
    const updated = [...items];
    updated[index].comment = comment;
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      alert(t('Please select the Tractor Head Truck'));
      return;
    }

    const hasFailed = items.some((i) => i.result === 'FAIL');
    const hasCritical = items.some((i) => i.result === 'FAIL' && i.severity === 'CRITICAL');

    submitInspection({
      vehicle_id: vehicleId,
      trailer_id: trailerId || undefined,
      driver_id: currentProfile.id,
      odometer_reading: odometer,
      inspection_date: new Date().toISOString(),
      overall_status: hasFailed ? 'FAIL' : 'PASS',
      has_critical_failure: hasCritical,
      supervisor_approved: false,
      items: items.map((i) => ({
        id: 'ii-' + Math.random(),
        category: i.category,
        item_name: i.name,
        result: i.result,
        severity: i.severity,
        comment: i.comment,
      })),
    });

    if (hasCritical) {
      alert(
        t('CRITICAL FAILURE DETECTED! A high-priority Workshop Work Order has been generated automatically.')
      );
    } else {
      alert(t('Vehicle inspection submitted successfully!'));
    }

    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div
        className="p-4 flex items-center gap-4"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderInlineStart: '3px solid var(--color-brand-accent)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div
          className="p-2.5 shrink-0"
          style={{
            background: 'var(--color-page-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-brand-accent)',
          }}
        >
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
            {t('Safety & Hazmat Pre-Trip Checklist')}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('Verify all tractor and fuel tanker components prior to depot dispatch.')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Header Metadata */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-ink)' }}>
              {t('Select Truck')} <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
            </label>
            <select
              required
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="nf-field w-full"
            >
              <option value="">{t('-- Select Tractor Head --')}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_id} ({v.plate_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-ink)' }}>
              {t('Tanker Trailer')}
            </label>
            <select
              value={trailerId}
              onChange={(e) => setTrailerId(e.target.value)}
              className="nf-field w-full"
            >
              <option value="">{t('-- Uncoupled / None --')}</option>
              {trailers.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.trailer_id} ({tr.plate_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-ink)' }}>
              {t('Current Odometer (KM)')}
            </label>
            <input
              type="number"
              dir="ltr"
              value={odometer}
              onChange={(e) => setOdometer(Number(e.target.value))}
              className="nf-field w-full font-semibold"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        {/* Inspection Items List */}
        <div className="space-y-2.5">
          {items.map((item, idx) => {
            const stripe =
              item.result === 'FAIL'
                ? item.severity === 'CRITICAL'
                  ? EDITORIAL_STATUS.red.stripe
                  : EDITORIAL_STATUS.amber.stripe
                : item.result === 'PASS'
                  ? EDITORIAL_STATUS.green.stripe
                  : EDITORIAL_STATUS.muted.stripe;

            return (
              <div
                key={idx}
                className="p-3.5 transition-colors"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderInlineStart: `3px solid ${stripe}`,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      {t(item.category)}
                    </span>
                    <h4 className="font-semibold text-xs mt-0.5" style={{ color: 'var(--color-ink)' }}>
                      {t(item.name)}
                    </h4>
                  </div>

                  {/* Radio Selector */}
                  <div
                    className="flex items-center gap-1 p-1 shrink-0"
                    style={{
                      background: 'var(--color-page-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleResultChange(idx, 'PASS')}
                      style={{
                        background:
                          item.result === 'PASS' ? EDITORIAL_STATUS.green.stripe : 'transparent',
                        color: item.result === 'PASS' ? '#FFFDF8' : 'var(--color-text-secondary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                      className="px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {t('PASS')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResultChange(idx, 'FAIL')}
                      style={{
                        background:
                          item.result === 'FAIL' ? EDITORIAL_STATUS.red.stripe : 'transparent',
                        color: item.result === 'FAIL' ? '#FFFDF8' : 'var(--color-text-secondary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                      className="px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {t('FAIL')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResultChange(idx, 'NA')}
                      style={{
                        background: item.result === 'NA' ? 'var(--color-ink)' : 'transparent',
                        color:
                          item.result === 'NA'
                            ? 'var(--color-page-bg)'
                            : 'var(--color-text-muted)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                      className="px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {t('N/A')}
                    </button>
                  </div>
                </div>

                {/* If FAIL: Require Severity & Comment */}
                {item.result === 'FAIL' && (
                  <div
                    className="mt-3 pt-3 space-y-3"
                    style={{ borderTop: '1px solid var(--color-row-divider)' }}
                  >
                    <div>
                      <label
                        className="text-xs font-semibold block mb-1.5"
                        style={{ color: EDITORIAL_STATUS.red.text }}
                      >
                        {t('Defect Severity Level')} <span>*</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as SeverityLevel[]).map((sev) => {
                          const isSelected = item.severity === sev;
                          const sevStripe =
                            sev === 'CRITICAL'
                              ? EDITORIAL_STATUS.red.stripe
                              : sev === 'HIGH'
                                ? EDITORIAL_STATUS.amber.stripe
                                : sev === 'MEDIUM'
                                  ? EDITORIAL_STATUS.blue.stripe
                                  : EDITORIAL_STATUS.muted.stripe;
                          return (
                            <button
                              key={sev}
                              type="button"
                              onClick={() => handleSeverityChange(idx, sev)}
                              style={{
                                background: isSelected
                                  ? 'var(--color-ink)'
                                  : 'var(--color-page-bg)',
                                color: isSelected
                                  ? 'var(--color-page-bg)'
                                  : 'var(--color-text-secondary)',
                                border: isSelected
                                  ? '1px solid var(--color-ink)'
                                  : '1px solid var(--color-border)',
                                borderInlineStart: `3px solid ${sevStripe}`,
                                borderRadius: 'var(--radius-sm)',
                              }}
                              className="py-1.5 font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              {t(sev)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label
                        className="text-xs font-semibold block mb-1.5"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {t('Defect Description / Remark')}{' '}
                        <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
                      </label>
                      <input
                        type="text"
                        required={item.result === 'FAIL'}
                        placeholder={t('Specify defect reason (e.g., API seal leak, low air pressure)...')}
                        value={item.comment}
                        onChange={(e) => handleCommentChange(idx, e.target.value)}
                        className="nf-field w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="flex items-center justify-end gap-2.5 pt-3"
          style={{ borderTop: '1px solid var(--color-row-divider)' }}
        >
          <SecondaryButton type="button" onClick={onComplete}>
            {t('Cancel')}
          </SecondaryButton>
          <PrimaryButton type="submit">{t('Submit Digital Inspection Report')}</PrimaryButton>
        </div>
      </form>
    </div>
  );
};
