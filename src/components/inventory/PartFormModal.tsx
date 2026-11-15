import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Part } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { Package, AlertTriangle, Loader2, ShieldCheck, Layers } from 'lucide-react';
import {
  EDITORIAL_STATUS,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface PartFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPart?: Part;
}

export const PartFormModal: React.FC<PartFormModalProps> = ({
  isOpen,
  onClose,
  initialPart,
}) => {
  const { addPart, updatePart } = useFleet();
  const { t, isRTL } = useI18n();

  const [partNumber, setPartNumber] = useState(initialPart?.part_number || '');
  const [partName, setPartName] = useState(initialPart?.part_name || '');
  const [categoryName, setCategoryName] = useState(initialPart?.category_id || 'Engine & Filters');
  const [manufacturer, setManufacturer] = useState(initialPart?.manufacturer || '');
  const [unit, setUnit] = useState(initialPart?.unit || 'PCS');
  const [minimumStock, setMinimumStock] = useState(initialPart?.minimum_stock || 5);
  const [maximumStock, setMaximumStock] = useState(initialPart?.maximum_stock || 50);
  const [currentStock, setCurrentStock] = useState(initialPart?.current_stock || 10);
  const [locationRack, setLocationRack] = useState(initialPart?.location_rack || 'Rack A-01');
  const [unitCost, setUnitCost] = useState(initialPart?.unit_cost || 250);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialPart) {
      setPartNumber(initialPart.part_number);
      setPartName(initialPart.part_name);
      setCategoryName(initialPart.category_id);
      setManufacturer(initialPart.manufacturer || '');
      setUnit(initialPart.unit);
      setMinimumStock(initialPart.minimum_stock);
      setMaximumStock(initialPart.maximum_stock);
      setCurrentStock(initialPart.current_stock);
      setLocationRack(initialPart.location_rack);
      setUnitCost(initialPart.unit_cost);
    } else {
      setPartNumber('');
      setPartName('');
      setCategoryName('Engine & Filters');
      setManufacturer('');
      setUnit('PCS');
      setMinimumStock(5);
      setMaximumStock(50);
      setCurrentStock(10);
      setLocationRack('Rack A-01');
      setUnitCost(250);
    }
    setErrorMessage(null);
  }, [initialPart, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanNum = partNumber.trim();
    const cleanName = partName.trim();

    if (!cleanNum || !cleanName) {
      setErrorMessage(t('Please fill in required fields: Part Number and Part Name.'));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        part_number: cleanNum.toUpperCase(),
        part_name: cleanName,
        category_id: categoryName,
        manufacturer: manufacturer.trim() || undefined,
        unit,
        minimum_stock: Number(minimumStock) || 0,
        maximum_stock: Number(maximumStock) || 0,
        current_stock: Number(currentStock) || 0,
        location_rack: locationRack.trim(),
        unit_cost: Number(unitCost) || 0,
        status:
          Number(currentStock) <= Number(minimumStock)
            ? ('LOW_STOCK' as const)
            : ('IN_STOCK' as const),
      };

      if (initialPart) {
        updatePart(initialPart.id, payload);
      } else {
        addPart(payload);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || t('An error occurred while saving the spare part.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalFooter = (
    <>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: EDITORIAL_STATUS.green.text }} />
        <span>
          {t('Inventory tracked across Dammam Workshop Storehouse with automated reorder alerts.')}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2.5 shrink-0">
        <SecondaryButton type="button" onClick={onClose} disabled={isSubmitting}>
          {t('Cancel')}
        </SecondaryButton>
        <PrimaryButton type="submit" form="part-form" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('Saving Part...')}</span>
            </>
          ) : (
            <span>{initialPart ? t('Save Part Record') : t('Register Spare Part')}</span>
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
        initialPart
          ? `${t('Edit Spare Part')}: ${initialPart.part_number}`
          : t('Register New Spare Part in Catalog')
      }
      subtitle={t('Configure minimum stock alert thresholds, unit cost, and rack bin location.')}
      icon={<Package className="w-5 h-5" style={{ color: 'var(--color-brand-accent)' }} />}
      footer={modalFooter}
      maxWidth="3xl"
    >
      <form id="part-form" onSubmit={handleSubmit} className={`space-y-4 text-xs ${isRTL ? '' : ''}`}>
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

        {/* Section 1: Part Identity */}
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
                className="w-5 h-5 flex items-center justify-center font-bold text-[12px]"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                1
              </span>
              <Package className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Part Identification & Classification')}</span>
            </div>
            <span className="text-[12px] font-semibold" style={{ color: 'var(--color-brand-accent)' }}>
              {t('* Required fields')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Part Number / SKU')}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder={t('e.g. FIL-VOL-1512')}
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="md:col-span-2">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Part Name / Description')}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder={t('e.g. Volvo Engine Primary Fuel Filter Element')}
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="nf-field w-full font-medium"
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Category')}
              </label>
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="nf-field w-full"
              >
                <option value="Engine & Filters">{t('Engine & Filters')}</option>
                <option value="Brakes & Pneumatics">{t('Brakes & Pneumatics')}</option>
                <option value="Tires & Wheels">{t('Tires & Wheels')}</option>
                <option value="Electrical & Sensors">{t('Electrical & Sensors')}</option>
                <option value="Tanker Discharge Valves">{t('Tanker Discharge Valves')}</option>
                <option value="Suspension & Steering">{t('Suspension & Steering')}</option>
                <option value="Lubricants & Fluids">{t('Lubricants & Fluids')}</option>
              </select>
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Manufacturer / Brand')}
              </label>
              <input
                type="text"
                placeholder={t('e.g. Bosch / Donaldson')}
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
                {t('Unit of Measure')}
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="nf-field w-full"
              >
                <option value="PCS">{t('Pieces (PCS)')}</option>
                <option value="SET">{t('Set / Kit (SET)')}</option>
                <option value="LITERS">{t('Liters (L)')}</option>
                <option value="BOX">{t('Box (BOX)')}</option>
                <option value="ROLL">{t('Roll (ROLL)')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Stock Levels & Valuation */}
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
                className="w-5 h-5 flex items-center justify-center font-bold text-[12px]"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                2
              </span>
              <Layers className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Stock Quantities, Thresholds & Bin Location')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Current Stock Qty')}
              </label>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Min Alert Stock')}
              </label>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={minimumStock}
                onChange={(e) => setMinimumStock(Number(e.target.value))}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)', color: EDITORIAL_STATUS.amber.text }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Max Capacity')}
              </label>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={maximumStock}
                onChange={(e) => setMaximumStock(Number(e.target.value))}
                className="nf-field w-full"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Unit Cost (SAR)')}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                dir="ltr"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)', color: EDITORIAL_STATUS.green.text }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Rack / Bin Location')}
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder={t('e.g. Rack A-12')}
                value={locationRack}
                onChange={(e) => setLocationRack(e.target.value)}
                className="nf-field w-full"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
