import React, { useState } from 'react';
import { Edit3, Plus, SlidersHorizontal } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { PartFormModal } from './PartFormModal';
import { Part } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { Modal } from '../common/Modal';
import { DESIGN_TOKENS } from '../../lib/designTokens';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  MetricStrip,
  StatusTabs,
  DataTable,
  DataRow,
  RowAction,
  StatusText,
  TableFooter,
} from '../common/EditorialUI';

export const PartsList: React.FC = () => {
  const { parts, receivePartStock, adjustPartStock } = useFleet();
  const { hasPermission, currentProfile } = useAuth();
  const { t, isRTL } = useI18n();

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [editingPart, setEditingPart] = useState<Part | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Stock Receive modal state
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [receiveQty, setReceiveQty] = useState(10);
  const [receiveUnitCost, setReceiveUnitCost] = useState(250);

  // Stock Adjustment modal state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustNewStock, setAdjustNewStock] = useState(10);
  const [adjustNotes, setAdjustNotes] = useState('');

  const filteredParts = parts.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.part_number.toLowerCase().includes(q) ||
      p.part_name.toLowerCase().includes(q) ||
      p.location_rack.toLowerCase().includes(q);

    let matchesStock = true;
    if (stockFilter === 'OUT') matchesStock = p.current_stock <= 0;
    else if (stockFilter === 'LOW') matchesStock = p.current_stock > 0 && p.current_stock <= p.minimum_stock;
    else if (stockFilter === 'OK') matchesStock = p.current_stock > p.minimum_stock;

    return matchesSearch && matchesStock;
  });

  const totalPages = Math.max(1, Math.ceil(filteredParts.length / PAGE_SIZE));
  const pagedParts = filteredParts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalInventoryValue = parts.reduce((sum, p) => sum + p.current_stock * p.unit_cost, 0);
  const outStockCount = parts.filter(p => p.current_stock <= 0).length;
  const lowStockOnlyCount = parts.filter(p => p.current_stock > 0 && p.current_stock <= p.minimum_stock).length;
  const okStockCount = parts.filter(p => p.current_stock > p.minimum_stock).length;

  const handleExportExcel = () => {
    const data = filteredParts.map(p => ({
      [t('Part Number')]: p.part_number,
      [t('Part Name')]: p.part_name,
      [t('Category')]: p.category_id,
      [t('Location Rack')]: p.location_rack,
      [t('Current Stock')]: p.current_stock,
      [t('Min Stock')]: p.minimum_stock,
      [t('Unit Cost (SAR)')]: p.unit_cost,
      [t('Total Value (SAR)')]: p.current_stock * p.unit_cost,
    }));
    exportToExcel(data, 'Spare_Parts_Inventory');
  };

  const handleExportPDF = () => {
    const headers = [
      t('Part Number'),
      t('Part Name & Specification'),
      t('Warehouse Rack'),
      t('Current Stock'),
      t('Min Threshold'),
      t('Unit Cost'),
      t('Stock Valuation'),
      t('Status'),
    ];
    const rows = filteredParts.map(p => {
      const isLow = p.current_stock <= p.minimum_stock;
      return [
        p.part_number,
        p.part_name,
        p.location_rack || t('Main Store'),
        `${(p.current_stock || 0).toLocaleString()} ${t(p.unit)}`,
        `${(p.minimum_stock || 0).toLocaleString()} ${t(p.unit)}`,
        `${(p.unit_cost || 0).toLocaleString()} ${t('SAR')}`,
        `${((p.current_stock || 0) * (p.unit_cost || 0)).toLocaleString()} ${t('SAR')}`,
        isLow ? t('LOW STOCK') : t('IN STOCK'),
      ];
    });

    const totalValuation = parts.reduce((sum, p) => sum + p.current_stock * p.unit_cost, 0);
    const lowStockTotal = parts.filter(p => p.current_stock <= p.minimum_stock).length;

    exportToPDFReport(
      t('Al-Noor Workshop Spare Parts Inventory Valuation'),
      headers,
      rows,
      'Parts_Inventory_Report',
      {
        orientation: 'landscape',
        subtitle: t('Central Workshop Storehouse Inventory Valuation, Stock Balances & Reorder Thresholds'),
        summaryKPIs: [
          { label: t('Total Catalog SKUs'), value: parts.length, color: 'slate' },
          {
            label: t('Total Store Valuation'),
            value: `${(totalValuation || 0).toLocaleString()} ${t('SAR')}`,
            color: 'emerald',
          },
          { label: t('Low Stock Alerts'), value: lowStockTotal, color: lowStockTotal > 0 ? 'amber' : 'emerald' },
        ],
        metadata: [
          {
            label: t('Stock Filter'),
            value:
              stockFilter === 'LOW'
                ? t('Low Stock Only')
                : stockFilter === 'OK'
                  ? t('Sufficient Stock')
                  : t('All Inventory Items'),
          },
          { label: t('Export Scope'), value: `${filteredParts.length} ${t('SKUs listed')}` },
        ],
      }
    );
  };

  const handleReceiveStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;
    receivePartStock(selectedPart.id, receiveQty, receiveUnitCost, currentProfile.full_name);
    setIsReceiveOpen(false);
    setSelectedPart(null);
  };

  const handleAdjustStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;
    adjustPartStock(
      selectedPart.id,
      adjustNewStock,
      adjustNotes || 'Physical count audit adjustment',
      currentProfile.full_name
    );
    setIsAdjustOpen(false);
    setSelectedPart(null);
  };

  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'مخزن قطع الغيار' : 'Spare Parts Store'}
            <br />
            {isRTL ? 'وإدارة الجرد' : '& Inventory'}
          </>
        }
        subtitle={t('Stock receiving, bin locations, work order deductions, minimum reorder thresholds, and inventory valuation.')}
        actions={
          <>
            <GhostButton onClick={handleExportExcel}>
              {t('Excel')}
            </GhostButton>
            <GhostButton onClick={handleExportPDF}>
              {isRTL ? 'تقرير PDF' : 'PDF report'}
            </GhostButton>
            {canManage && (
              <PrimaryButton
                onClick={() => {
                  setEditingPart(undefined);
                  setIsFormOpen(true);
                }}
              >
                {isRTL ? `+ ${t('Add New Part')}` : '+ Add new part'}
              </PrimaryButton>
            )}
          </>
        }
      />

      <StatusTabs
        tabs={[
          { key: 'ALL', label: isRTL ? 'الكل' : 'All', count: parts.length },
          {
            key: 'OK',
            label: isRTL ? 'متوفر' : 'In stock',
            count: okStockCount,
            stripe: DESIGN_TOKENS.colors.status.availableStripe,
          },
          {
            key: 'LOW',
            label: isRTL ? 'مخزون منخفض' : 'Low stock',
            count: lowStockOnlyCount,
            stripe: DESIGN_TOKENS.colors.status.workshopStripe,
          },
          {
            key: 'OUT',
            label: isRTL ? 'نفد المخزون' : 'Out of stock',
            count: outStockCount,
            stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe,
          },
        ]}
        activeKey={stockFilter}
        onChange={k => {
          setStockFilter(k);
          setPage(1);
        }}
        searchValue={search}
        onSearchChange={val => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={t('Search Part #, Name, Location Rack...')}
      />

      <DataTable
        columns={[
          { label: isRTL ? 'رقم واسم القطعة' : 'Part and SKU', align: 'start' },
          { label: isRTL ? 'الفئة' : 'Category', align: 'start' },
          { label: isRTL ? 'موقع الرف' : 'Bin location', align: 'start' },
          { label: isRTL ? 'الرصيد الحالي' : 'Stock level', align: 'end' },
          { label: isRTL ? 'تكلفة الوحدة' : 'Unit cost', align: 'end' },
          { label: isRTL ? 'إجمالي القيمة' : 'Total value', align: 'end' },
          { label: isRTL ? 'الحالة' : 'Status', align: 'start' },
        ]}
        isEmpty={pagedParts.length === 0}
        emptyMessage={t('No spare parts found matching query.')}
        onClearFilters={() => {
          setSearch('');
          setStockFilter('ALL');
          setPage(1);
        }}
      >
        {pagedParts.map(p => {
          const isOut = p.current_stock <= 0;
          const isLow = !isOut && p.current_stock <= p.minimum_stock;
          const stripe = isOut
            ? DESIGN_TOKENS.colors.status.outOfServiceStripe
            : isLow
              ? DESIGN_TOKENS.colors.status.workshopStripe
              : DESIGN_TOKENS.colors.status.availableStripe;
          const statusColor = isOut
            ? DESIGN_TOKENS.colors.status.outOfServiceText
            : isLow
              ? DESIGN_TOKENS.colors.status.workshopText
              : DESIGN_TOKENS.colors.status.availableText;
          const statusLabel = isOut
            ? isRTL
              ? 'نفد المخزون'
              : 'Out of stock'
            : isLow
              ? isRTL
                ? 'مخزون منخفض'
                : 'Low stock'
              : isRTL
                ? 'متوفر'
                : 'In stock';

          return (
            <DataRow
              key={p.id}
              stripeColor={stripe}
              actions={
                canManage ? (
                  <>
                    <RowAction
                      icon={<Plus size={14} />}
                      title={t('Receive')}
                      onClick={() => {
                        setSelectedPart(p);
                        setReceiveUnitCost(p.unit_cost);
                        setIsReceiveOpen(true);
                      }}
                    />
                    <RowAction
                      icon={<SlidersHorizontal size={14} />}
                      title={t('Adjust')}
                      onClick={() => {
                        setSelectedPart(p);
                        setAdjustNewStock(p.current_stock);
                        setIsAdjustOpen(true);
                      }}
                    />
                    <RowAction
                      icon={<Edit3 size={14} />}
                      title={t('Edit Part')}
                      onClick={() => {
                        setEditingPart(p);
                        setIsFormOpen(true);
                      }}
                    />
                  </>
                ) : null
              }
            >
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                  {p.part_name}
                </div>
                <div
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    marginTop: 2,
                  }}
                >
                  {p.part_number}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {t(p.category_id)}
                </span>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--color-ink)',
                  }}
                >
                  {p.location_rack || '—'}
                </span>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <div
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: statusColor,
                  }}
                >
                  {p.current_stock} {t(p.unit)}
                </div>
                <div
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    color: 'var(--color-text-muted)',
                    marginTop: 2,
                  }}
                >
                  {p.minimum_stock} / {p.maximum_stock}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <span
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--color-ink)',
                  }}
                >
                  {(p.unit_cost || 0).toLocaleString()} {t('SAR')}
                </span>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <span
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                  }}
                >
                  {((p.current_stock || 0) * (p.unit_cost || 0)).toLocaleString()} {t('SAR')}
                </span>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText label={statusLabel} color={statusColor} />
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${filteredParts.length} من ${parts.length} صنف`
            : `${filteredParts.length} of ${parts.length} spare parts`
        }
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />

      <PartFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialPart={editingPart}
      />

      {isReceiveOpen && selectedPart && (
        <Modal
          isOpen={isReceiveOpen}
          onClose={() => setIsReceiveOpen(false)}
          title={`${t('Receive Purchase Stock')}: ${selectedPart.part_number}`}
          subtitle={`${t('Current Available Stock')}: ${selectedPart.current_stock} ${t(selectedPart.unit)} · ${selectedPart.part_name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleReceiveStockSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">
                {t('Quantity Received')} ({t(selectedPart.unit)}) *
              </label>
              <input
                type="number"
                min={1}
                required
                dir="ltr"
                value={receiveQty}
                onChange={e => setReceiveQty(Number(e.target.value))}
                className="nf-field font-mono font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">
                {t('Unit Purchase Cost (SAR)')}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                dir="ltr"
                value={receiveUnitCost}
                onChange={e => setReceiveUnitCost(Number(e.target.value))}
                className="nf-field font-mono font-semibold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DDD8CB]">
              <SecondaryButton onClick={() => setIsReceiveOpen(false)}>
                {t('Cancel')}
              </SecondaryButton>
              <PrimaryButton type="submit">{t('Confirm Stock Receipt')}</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {isAdjustOpen && selectedPart && (
        <Modal
          isOpen={isAdjustOpen}
          onClose={() => setIsAdjustOpen(false)}
          title={`${t('Stock Adjustment Audit')}: ${selectedPart.part_number}`}
          subtitle={`${t('Current Registered Stock')}: ${selectedPart.current_stock} ${t(selectedPart.unit)} · ${selectedPart.part_name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleAdjustStockSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">
                {t('New Audited Stock Quantity')} *
              </label>
              <input
                type="number"
                min={0}
                required
                dir="ltr"
                value={adjustNewStock}
                onChange={e => setAdjustNewStock(Number(e.target.value))}
                className="nf-field font-mono font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">
                {t('Adjustment Reason / Physical Audit Notes')} *
              </label>
              <textarea
                required
                rows={3}
                placeholder={t(
                  'Reason for discrepancy (e.g. Physical inventory count variance, damaged stock write-off)...'
                )}
                value={adjustNotes}
                onChange={e => setAdjustNotes(e.target.value)}
                className="nf-field"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DDD8CB]">
              <SecondaryButton onClick={() => setIsAdjustOpen(false)}>
                {t('Cancel')}
              </SecondaryButton>
              <PrimaryButton type="submit">{t('Save Adjustment')}</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
};
