import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { DESIGN_TOKENS } from '../../lib/designTokens';
import { useTablePagination } from '../../lib/supabasePagination';
import {
  PageContainer,
  PageHeader,
  StatusTabs,
  DataTable,
  DataRow,
  StatusText,
  TableFooter,
} from '../common/EditorialUI';

export const TechnicianList: React.FC = () => {
  const { technicians, workOrders } = useFleet();
  const { t, isRTL } = useI18n();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const filtered = technicians.filter(tech => {
    const q = search.toLowerCase();
    const matchesSearch =
      tech.full_name.toLowerCase().includes(q) ||
      tech.employee_id.toLowerCase().includes(q) ||
      tech.specialization.toLowerCase().includes(q) ||
      (tech.department || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || tech.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pagedItems: pagedTechnicians,
  } = useTablePagination(filtered, [search, statusFilter], {
    table: 'technicians',
    orderBy: 'created_at',
    ascending: false,
    search,
    searchColumns: ['full_name', 'employee_id', 'specialization', 'department'],
  });

  const activeCount = technicians.filter(tech => tech.status === 'ACTIVE').length;
  const inactiveCount = technicians.filter(tech => tech.status !== 'ACTIVE').length;

  return (
    <PageContainer>
      <PageHeader
        title={isRTL ? 'ط³ط¬ظ„ ط§ظ„ظپظ†ظٹظٹظ† ظˆط§ظ„ظ…ظٹظƒط§ظ†ظٹظƒظٹظٹظ†' : 'Workshop Technicians\n& Mechanics Roster'}
        subtitle={t('Track mechanic specializations, assigned work orders, repair completion rate, and hourly rates.')}
      />

      <StatusTabs
        tabs={[
          { key: 'ALL', label: isRTL ? 'ط§ظ„ظƒظ„' : 'All', count: technicians.length },
          {
            key: 'ACTIVE',
            label: isRTL ? 'ظ†ط´ط·' : 'Active',
            count: activeCount,
            stripe: DESIGN_TOKENS.colors.status.availableStripe,
          },
          {
            key: 'INACTIVE',
            label: isRTL ? 'ط؛ظٹط± ظ†ط´ط·' : 'Inactive',
            count: inactiveCount,
            stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe,
          },
        ]}
        activeKey={statusFilter}
        onChange={k => setStatusFilter(k as 'ALL' | 'ACTIVE' | 'INACTIVE')}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={isRTL ? 'ط¨ط­ط« ط¨ط§ظ„ط§ط³ظ…طŒ ط§ظ„ط±ظ‚ظ…طŒ ط§ظ„طھط®طµطµ...' : 'Search name, ID, specialization...'}
      />

      <DataTable
        columns={[
          { label: isRTL ? 'ط§ظ„ظپظ†ظٹ' : 'Technician', align: 'start' },
          { label: isRTL ? 'ط§ظ„ط±ظ‚ظ… ط§ظ„ظˆط¸ظٹظپظٹ' : 'Employee ID', align: 'start' },
          { label: isRTL ? 'ط§ظ„طھط®طµطµ ظˆط§ظ„ظ‚ط³ظ…' : 'Specialization', align: 'start' },
          { label: isRTL ? 'ط§ظ„طھظƒظ„ظپط© ط¨ط§ظ„ط³ط§ط¹ط©' : 'Hourly rate', align: 'end' },
          { label: isRTL ? 'ظ…ظ‡ط§ظ… ظ†ط´ط·ط©' : 'Active jobs', align: 'end' },
          { label: isRTL ? 'ظ…ظ‡ط§ظ… ظ…ظƒطھظ…ظ„ط©' : 'Completed', align: 'end' },
          { label: isRTL ? 'ط§ظ„ط­ط§ظ„ط©' : 'Status', align: 'start' },
        ]}
        hasActionsColumn={false}
        isEmpty={filtered.length === 0}
        emptyMessage={t('No technicians registered yet')}
        onClearFilters={
          search || statusFilter !== 'ALL'
            ? () => {
                setSearch('');
                setStatusFilter('ALL');
              }
            : undefined
        }
      >
        {pagedTechnicians.map(tech => {
          const techWOs = workOrders.filter(w => w.assigned_technician_id === tech.id);
          const activeWOs = techWOs.filter(w => w.status !== 'RELEASED' && w.status !== 'CANCELLED');
          const completedWOs = techWOs.filter(w => w.status === 'RELEASED' || w.status === 'COMPLETED');
          const isActive = tech.status === 'ACTIVE';

          return (
            <DataRow
              key={tech.id}
              stripeColor={
                isActive
                  ? DESIGN_TOKENS.colors.status.availableStripe
                  : DESIGN_TOKENS.colors.status.outOfServiceStripe
              }
            >
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 4,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: 13,
                      color: 'var(--color-ink)',
                      flexShrink: 0,
                    }}
                  >
                    {tech.full_name.charAt(0) || <Users size={14} />}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                      {tech.full_name}
                    </div>
                    {tech.phone && (
                      <div
                        dir="ltr"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--color-text-muted)' }}
                      >
                        {tech.phone}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span dir="ltr" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink)' }}>
                  {tech.employee_id}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--color-ink)' }}>
                  {tech.specialization}
                </div>
                {tech.department && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {tech.department}
                  </div>
                )}
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <span dir="ltr" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink)' }}>
                  {tech.hourly_rate} {t('SAR / Hour')}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <span
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 600,
                    color:
                      activeWOs.length > 0
                        ? DESIGN_TOKENS.colors.status.onTripText
                        : 'var(--color-text-muted)',
                  }}
                >
                  {activeWOs.length}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <span
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: DESIGN_TOKENS.colors.status.availableText,
                  }}
                >
                  {completedWOs.length}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText
                  label={isActive ? (isRTL ? 'ظ†ط´ط·' : 'Active') : (isRTL ? 'ط؛ظٹط± ظ†ط´ط·' : 'Inactive')}
                  color={
                    isActive
                      ? DESIGN_TOKENS.colors.status.availableText
                      : DESIGN_TOKENS.colors.status.outOfServiceText
                  }
                />
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${filtered.length} ظ…ظ† ${technicians.length} ظپظ†ظٹ`
            : `${filtered.length} of ${technicians.length} technicians`
        }
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />
    </PageContainer>
  );
};
