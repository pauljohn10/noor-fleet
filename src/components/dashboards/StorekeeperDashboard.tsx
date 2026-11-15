import React, { useState } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { PartFormModal } from '../inventory/PartFormModal';
import { Modal } from '../common/Modal';
import {
  EDITORIAL_STATUS,
  PageContainer,
  PageHeader,
  EditorialSection,
  DataTable,
  DataRow,
  RowAction,
  StatusText,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface StorekeeperDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const StorekeeperDashboard: React.FC<StorekeeperDashboardProps> = ({ onNavigateTab }) => {
  const { parts, receivePartStock } = useFleet();
  const { isRTL } = useI18n();

  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [receiveQty, setReceiveQty] = useState(10);

  const lowStockParts = parts.filter((p) => p.current_stock <= p.minimum_stock && p.current_stock > 0);
  const outOfStockParts = parts.filter((p) => p.current_stock === 0);
  const totalValuation = parts.reduce((sum, p) => sum + p.current_stock * p.unit_cost, 0);

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;
    receivePartStock(selectedPart.id, receiveQty, selectedPart.unit_cost, 'Storekeeper');
    setIsReceiveOpen(false);
    setSelectedPart(null);
  };

  return (
    <PageContainer>
      <PageHeader
        title={isRTL ? 'مخزن قطع الغيار وإدارة المستودع' : 'Spare Parts Store & Warehouse Control'}
        subtitle={
          isRTL
            ? 'إدارة كتالوج قطع الغيار، استلام التوريدات، الصرف لأوامر العمل، وجرد المخزون الفعلي.'
            : 'Spare parts catalog management, inventory receiving, work order issuances, and physical stock count audits.'
        }
        badge={
          <Badge variant="purple" size="sm">
            {isRTL ? 'لوحة أمين المستودع' : 'Storekeeper Focus'}
          </Badge>
        }
        actions={
          <>
            <SecondaryButton onClick={() => onNavigateTab('inventory')}>
              <Package className="w-4 h-4" /> {isRTL ? 'كتالوج المخزون الكامل' : 'Full Inventory Catalog'}
            </SecondaryButton>
            <PrimaryButton onClick={() => setIsPartModalOpen(true)}>
              <Plus className="w-4 h-4" /> {isRTL ? 'إضافة قطعة غيار' : 'Add Spare Part SKU'}
            </PrimaryButton>
          </>
        }
      />

      {/* Storekeeper KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <StatCard
          title={isRTL ? 'إجمالي الأصناف' : 'Total parts SKUs'}
          value={parts.length}
          subtitle={isRTL ? 'أصناف الكتالوج' : 'Catalog SKUs'}
          icon={<Package className="w-4 h-4" />}
          color="purple"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title={isRTL ? 'مخزون منخفض' : 'Low stock'}
          value={lowStockParts.length}
          subtitle={isRTL ? '≤ الحد الأدنى' : '≤ Min Threshold'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="amber"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title={isRTL ? 'نفد المخزون' : 'Out of stock'}
          value={outOfStockParts.length}
          subtitle={isRTL ? '0 متوفر' : '0 Available'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title={isRTL ? 'استلام اليوم' : 'Today receiving'}
          value={12}
          subtitle={isRTL ? 'سندات استلام' : 'Stock Receipts'}
          icon={<ArrowDownRight className="w-4 h-4" />}
          color="emerald"
        />
        <StatCard
          title={isRTL ? 'صرف اليوم' : 'Today issues'}
          value={18}
          subtitle={isRTL ? 'مصروفة للأوامر' : 'Issued to WOs'}
          icon={<ArrowUpRight className="w-4 h-4" />}
          color="blue"
        />
        <StatCard
          title={isRTL ? 'المرتجعات' : 'Returns'}
          value={2}
          subtitle={isRTL ? 'قطع غير مستخدمة' : 'Unused Parts'}
          icon={<RefreshCw className="w-4 h-4" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'تقييم المخزن' : 'Store valuation'}
          value={`${(totalValuation || 0).toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`}
          subtitle={isRTL ? 'قيمة المخزون' : 'Stock Value'}
          icon={<DollarSign className="w-4 h-4" />}
          color="emerald"
        />
      </div>

      {/* Storekeeper Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Warning List */}
        <EditorialSection
          title={isRTL ? 'أصناف المخزون المنخفض' : 'Low Stock Inventory Items'}
          marginTop={0}
        >
          <DataTable
            columns={[
              { label: isRTL ? 'القطعة' : 'Part' },
              { label: isRTL ? 'الموقع' : 'Rack' },
              { label: isRTL ? 'المخزون' : 'Stock', align: 'end' },
            ]}
            isEmpty={lowStockParts.length === 0}
            emptyMessage={
              isRTL
                ? 'لا توجد تحذيرات نقص مخزون. جميع الأصناف فوق الحد الأدنى.'
                : 'No low stock warnings. All items above threshold.'
            }
          >
            {lowStockParts.map((p) => (
              <DataRow
                key={p.id}
                stripeColor={EDITORIAL_STATUS.amber.stripe}
                onClick={() => {
                  setSelectedPart(p);
                  setIsReceiveOpen(true);
                }}
                actions={
                  <RowAction
                    icon={<Plus className="w-4 h-4" />}
                    title={isRTL ? '+ استلام مخزون' : '+ Receive Stock'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPart(p);
                      setIsReceiveOpen(true);
                    }}
                  />
                }
              >
                <td className="py-3 pe-3">
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      fontSize: 12,
                      color: EDITORIAL_STATUS.amber.text,
                    }}
                  >
                    {p.part_number}
                  </span>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)', marginTop: 2 }}>
                    {p.part_name}
                  </p>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <StatusText label={p.location_rack || '—'} color="var(--color-text-secondary)" />
                </td>
                <td className="py-3 text-end whitespace-nowrap">
                  <Badge variant="amber" size="sm">
                    {p.current_stock} / {isRTL ? 'أدنى' : 'Min'} {p.minimum_stock}
                  </Badge>
                </td>
              </DataRow>
            ))}
          </DataTable>
        </EditorialSection>

        {/* Most Consumed Parts */}
        <EditorialSection
          title={isRTL ? 'القطع الأكثر استهلاكاً' : 'Most Frequently Consumed Parts'}
          marginTop={0}
        >
          <DataTable
            columns={[
              { label: isRTL ? 'القطعة' : 'Part' },
              { label: isRTL ? 'الموقع' : 'Rack' },
              { label: isRTL ? 'التكلفة' : 'Unit cost', align: 'end' },
            ]}
            hasActionsColumn={false}
            isEmpty={parts.length === 0}
            emptyMessage={isRTL ? 'لا توجد قطع غيار مسجلة.' : 'No spare parts available.'}
          >
            {parts.slice(0, 4).map((p) => (
              <DataRow key={p.id} stripeColor={EDITORIAL_STATUS.blue.stripe}>
                <td className="py-3 pe-3">
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      fontSize: 12,
                      color: 'var(--color-ink)',
                    }}
                  >
                    {p.part_number}
                  </span>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)', marginTop: 2 }}>
                    {p.part_name}
                  </p>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <StatusText label={p.location_rack || '—'} color="var(--color-text-secondary)" />
                </td>
                <td className="py-3 text-end whitespace-nowrap">
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                    }}
                  >
                    {p.unit_cost} {isRTL ? 'ر.س' : 'SAR'} / {p.unit}
                  </span>
                </td>
              </DataRow>
            ))}
          </DataTable>
        </EditorialSection>
      </div>

      <PartFormModal isOpen={isPartModalOpen} onClose={() => setIsPartModalOpen(false)} />

      {isReceiveOpen && selectedPart && (
        <Modal
          isOpen={isReceiveOpen}
          onClose={() => setIsReceiveOpen(false)}
          title={
            isRTL
              ? `استلام مخزون: ${selectedPart.part_number}`
              : `Receive Stock: ${selectedPart.part_number}`
          }
          subtitle={`${selectedPart.part_name || selectedPart.name || ''} | ${
            isRTL ? 'الرصيد الحالي:' : 'Current In Stock:'
          } ${selectedPart.current_stock} ${selectedPart.unit || selectedPart.unit_of_measure || ''}`}
          maxWidth="md"
        >
          <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
            <div
              className="p-3 flex items-center justify-between"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderInlineStart: `3px solid ${EDITORIAL_STATUS.amber.stripe}`,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div>
                <span className="text-[12px] font-semibold block" style={{ color: 'var(--color-ink)' }}>
                  {selectedPart.part_name || selectedPart.name}
                </span>
                <span
                  className="text-[11px]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
                >
                  {isRTL ? 'الموقع:' : 'Location:'}{' '}
                  {selectedPart.location_rack ||
                    selectedPart.warehouse_location ||
                    (isRTL ? 'المستودع الرئيسي' : 'Main Depot')}
                </span>
              </div>
              <Badge variant="amber" size="sm">
                {isRTL ? 'الكمية:' : 'Qty:'} {selectedPart.current_stock}
              </Badge>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-ink)' }}>
                {isRTL ? 'الكمية المستلمة' : 'Quantity Received'}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={receiveQty}
                onChange={(e) => setReceiveQty(Number(e.target.value))}
                className="nf-field w-full font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div
              className="flex items-center justify-end gap-2.5 pt-3"
              style={{ borderTop: '1px solid var(--color-row-divider)' }}
            >
              <SecondaryButton type="button" onClick={() => setIsReceiveOpen(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </SecondaryButton>
              <PrimaryButton type="submit">{isRTL ? 'تأكيد الاستلام' : 'Confirm Receipt'}</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
};
