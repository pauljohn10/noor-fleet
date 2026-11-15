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
        title={isRTL ? 'ظ…ط®ط²ظ† ظ‚ط·ط¹ ط§ظ„ط؛ظٹط§ط± ظˆط¥ط¯ط§ط±ط© ط§ظ„ظ…ط³طھظˆط¯ط¹' : 'Spare Parts Store & Warehouse Control'}
        subtitle={
          isRTL
            ? 'ط¥ط¯ط§ط±ط© ظƒطھط§ظ„ظˆط¬ ظ‚ط·ط¹ ط§ظ„ط؛ظٹط§ط±طŒ ط§ط³طھظ„ط§ظ… ط§ظ„طھظˆط±ظٹط¯ط§طھطŒ ط§ظ„طµط±ظپ ظ„ط£ظˆط§ظ…ط± ط§ظ„ط¹ظ…ظ„طŒ ظˆط¬ط±ط¯ ط§ظ„ظ…ط®ط²ظˆظ† ط§ظ„ظپط¹ظ„ظٹ.'
            : 'Spare parts catalog management, inventory receiving, work order issuances, and physical stock count audits.'
        }
        badge={
          <Badge variant="purple" size="sm">
            {isRTL ? 'ظ„ظˆط­ط© ط£ظ…ظٹظ† ط§ظ„ظ…ط³طھظˆط¯ط¹' : 'Storekeeper Focus'}
          </Badge>
        }
        actions={
          <>
            <SecondaryButton onClick={() => onNavigateTab('inventory')}>
              <Package className="w-4 h-4" /> {isRTL ? 'ظƒطھط§ظ„ظˆط¬ ط§ظ„ظ…ط®ط²ظˆظ† ط§ظ„ظƒط§ظ…ظ„' : 'Full Inventory Catalog'}
            </SecondaryButton>
            <PrimaryButton onClick={() => setIsPartModalOpen(true)}>
              <Plus className="w-4 h-4" /> {isRTL ? 'ط¥ط¶ط§ظپط© ظ‚ط·ط¹ط© ط؛ظٹط§ط±' : 'Add Spare Part SKU'}
            </PrimaryButton>
          </>
        }
      />

      {/* Storekeeper KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <StatCard
          title={isRTL ? 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط£طµظ†ط§ظپ' : 'Total parts SKUs'}
          value={parts.length}
          subtitle={isRTL ? 'ط£طµظ†ط§ظپ ط§ظ„ظƒطھط§ظ„ظˆط¬' : 'Catalog SKUs'}
          icon={<Package className="w-4 h-4" />}
          color="purple"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title={isRTL ? 'ظ…ط®ط²ظˆظ† ظ…ظ†ط®ظپط¶' : 'Low stock'}
          value={lowStockParts.length}
          subtitle={isRTL ? 'â‰¤ ط§ظ„ط­ط¯ ط§ظ„ط£ط¯ظ†ظ‰' : 'â‰¤ Min Threshold'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="amber"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title={isRTL ? 'ظ†ظپط¯ ط§ظ„ظ…ط®ط²ظˆظ†' : 'Out of stock'}
          value={outOfStockParts.length}
          subtitle={isRTL ? '0 ظ…طھظˆظپط±' : '0 Available'}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="rose"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title={isRTL ? 'ط§ط³طھظ„ط§ظ… ط§ظ„ظٹظˆظ…' : 'Today receiving'}
          value={12}
          subtitle={isRTL ? 'ط³ظ†ط¯ط§طھ ط§ط³طھظ„ط§ظ…' : 'Stock Receipts'}
          icon={<ArrowDownRight className="w-4 h-4" />}
          color="emerald"
        />
        <StatCard
          title={isRTL ? 'طµط±ظپ ط§ظ„ظٹظˆظ…' : 'Today issues'}
          value={18}
          subtitle={isRTL ? 'ظ…طµط±ظˆظپط© ظ„ظ„ط£ظˆط§ظ…ط±' : 'Issued to WOs'}
          icon={<ArrowUpRight className="w-4 h-4" />}
          color="blue"
        />
        <StatCard
          title={isRTL ? 'ط§ظ„ظ…ط±طھط¬ط¹ط§طھ' : 'Returns'}
          value={2}
          subtitle={isRTL ? 'ظ‚ط·ط¹ ط؛ظٹط± ظ…ط³طھط®ط¯ظ…ط©' : 'Unused Parts'}
          icon={<RefreshCw className="w-4 h-4" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'طھظ‚ظٹظٹظ… ط§ظ„ظ…ط®ط²ظ†' : 'Store valuation'}
          value={`${(totalValuation || 0).toLocaleString()} ${isRTL ? 'ط±.ط³' : 'SAR'}`}
          subtitle={isRTL ? 'ظ‚ظٹظ…ط© ط§ظ„ظ…ط®ط²ظˆظ†' : 'Stock Value'}
          icon={<DollarSign className="w-4 h-4" />}
          color="emerald"
        />
      </div>

      {/* Storekeeper Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Warning List */}
        <EditorialSection
          title={isRTL ? 'ط£طµظ†ط§ظپ ط§ظ„ظ…ط®ط²ظˆظ† ط§ظ„ظ…ظ†ط®ظپط¶' : 'Low Stock Inventory Items'}
          marginTop={0}
        >
          <DataTable
            showPagination
            columns={[
              { label: isRTL ? 'ط§ظ„ظ‚ط·ط¹ط©' : 'Part' },
              { label: isRTL ? 'ط§ظ„ظ…ظˆظ‚ط¹' : 'Rack' },
              { label: isRTL ? 'ط§ظ„ظ…ط®ط²ظˆظ†' : 'Stock', align: 'end' },
            ]}
            isEmpty={lowStockParts.length === 0}
            emptyMessage={
              isRTL
                ? 'ظ„ط§ طھظˆط¬ط¯ طھط­ط°ظٹط±ط§طھ ظ†ظ‚طµ ظ…ط®ط²ظˆظ†. ط¬ظ…ظٹط¹ ط§ظ„ط£طµظ†ط§ظپ ظپظˆظ‚ ط§ظ„ط­ط¯ ط§ظ„ط£ط¯ظ†ظ‰.'
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
                    title={isRTL ? '+ ط§ط³طھظ„ط§ظ… ظ…ط®ط²ظˆظ†' : '+ Receive Stock'}
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
                  <StatusText label={p.location_rack || 'â€”'} color="var(--color-text-secondary)" />
                </td>
                <td className="py-3 text-end whitespace-nowrap">
                  <Badge variant="amber" size="sm">
                    {p.current_stock} / {isRTL ? 'ط£ط¯ظ†ظ‰' : 'Min'} {p.minimum_stock}
                  </Badge>
                </td>
              </DataRow>
            ))}
          </DataTable>
        </EditorialSection>

        {/* Most Consumed Parts */}
        <EditorialSection
          title={isRTL ? 'ط§ظ„ظ‚ط·ط¹ ط§ظ„ط£ظƒط«ط± ط§ط³طھظ‡ظ„ط§ظƒط§ظ‹' : 'Most Frequently Consumed Parts'}
          marginTop={0}
        >
          <DataTable
            showPagination
            columns={[
              { label: isRTL ? 'ط§ظ„ظ‚ط·ط¹ط©' : 'Part' },
              { label: isRTL ? 'ط§ظ„ظ…ظˆظ‚ط¹' : 'Rack' },
              { label: isRTL ? 'ط§ظ„طھظƒظ„ظپط©' : 'Unit cost', align: 'end' },
            ]}
            hasActionsColumn={false}
            isEmpty={parts.length === 0}
            emptyMessage={isRTL ? 'ظ„ط§ طھظˆط¬ط¯ ظ‚ط·ط¹ ط؛ظٹط§ط± ظ…ط³ط¬ظ„ط©.' : 'No spare parts available.'}
          >
            {parts.map((p) => (
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
                  <StatusText label={p.location_rack || 'â€”'} color="var(--color-text-secondary)" />
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
                    {p.unit_cost} {isRTL ? 'ط±.ط³' : 'SAR'} / {p.unit}
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
              ? `ط§ط³طھظ„ط§ظ… ظ…ط®ط²ظˆظ†: ${selectedPart.part_number}`
              : `Receive Stock: ${selectedPart.part_number}`
          }
          subtitle={`${selectedPart.part_name || selectedPart.name || ''} | ${
            isRTL ? 'ط§ظ„ط±طµظٹط¯ ط§ظ„ط­ط§ظ„ظٹ:' : 'Current In Stock:'
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
                  className="text-[12px]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
                >
                  {isRTL ? 'ط§ظ„ظ…ظˆظ‚ط¹:' : 'Location:'}{' '}
                  {selectedPart.location_rack ||
                    selectedPart.warehouse_location ||
                    (isRTL ? 'ط§ظ„ظ…ط³طھظˆط¯ط¹ ط§ظ„ط±ط¦ظٹط³ظٹ' : 'Main Depot')}
                </span>
              </div>
              <Badge variant="amber" size="sm">
                {isRTL ? 'ط§ظ„ظƒظ…ظٹط©:' : 'Qty:'} {selectedPart.current_stock}
              </Badge>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-ink)' }}>
                {isRTL ? 'ط§ظ„ظƒظ…ظٹط© ط§ظ„ظ…ط³طھظ„ظ…ط©' : 'Quantity Received'}{' '}
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
                {isRTL ? 'ط¥ظ„ط؛ط§ط،' : 'Cancel'}
              </SecondaryButton>
              <PrimaryButton type="submit">{isRTL ? 'طھط£ظƒظٹط¯ ط§ظ„ط§ط³طھظ„ط§ظ…' : 'Confirm Receipt'}</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
};
