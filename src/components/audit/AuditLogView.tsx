import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
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

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useFleet();
  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const modules = Array.from(new Set(auditLogs.map(l => l.module))).slice(0, 6);

  const filteredLogs = auditLogs.filter(log => {
    const q = search.toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(q) ||
      log.module.toLowerCase().includes(q) ||
      log.record_id.toLowerCase().includes(q) ||
      log.user_name.toLowerCase().includes(q);
    const matchesModule = moduleFilter === 'ALL' || log.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pagedItems: pagedLogs,
  } = useTablePagination(filteredLogs, [search, moduleFilter], {
    table: 'audit_logs',
    orderBy: 'created_at',
    ascending: false,
    search,
    searchColumns: ['action', 'module'],
    eqFilters: { module: moduleFilter },
  });

  if (!hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT'])) {
    return (
      <PageContainer>
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            background: 'var(--color-surface)',
          }}
        >
          <Lock size={28} style={{ color: DESIGN_TOKENS.colors.status.outOfServiceText, margin: '0 auto 12px' }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>
            {t('Access Restricted')}
          </h3>
          <p style={{ marginTop: 6, fontSize: 13, color: 'var(--color-text-muted)' }}>
            {t('Only authorized Management and Super Admin roles can inspect system audit logs.')}
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={isRTL ? 'سجل التدقيق والأمان' : 'System Audit Trail\n& Security Logs'}
        subtitle={t('Immutable log tracking all system data mutations, work order updates, inventory transactions, and vehicle modifications.')}
      />

      <StatusTabs
        tabs={[
          { key: 'ALL', label: isRTL ? 'الكل' : 'All events', count: auditLogs.length },
          ...modules.map(mod => ({
            key: mod,
            label: t(mod),
            count: auditLogs.filter(l => l.module === mod).length,
          })),
        ]}
        activeKey={moduleFilter}
        onChange={k => {
          setModuleFilter(k);
          setPage(1);
        }}
        searchValue={search}
        onSearchChange={val => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={t('Search action, user, record ID...')}
      />

      <DataTable
        columns={[
          { label: isRTL ? 'التوقيت' : 'Timestamp', align: 'start' },
          { label: isRTL ? 'المستخدم' : 'User name', align: 'start' },
          { label: isRTL ? 'الدور' : 'Role', align: 'start' },
          { label: isRTL ? 'الإجراء' : 'Action', align: 'start' },
          { label: isRTL ? 'الوحدة' : 'Module', align: 'start' },
          { label: isRTL ? 'معرّف السجل' : 'Record ID', align: 'start' },
          { label: isRTL ? 'عنوان IP' : 'IP address', align: 'start' },
        ]}
        hasActionsColumn={false}
        isEmpty={pagedLogs.length === 0}
        emptyMessage={t('No audit log records found matching search query.')}
        onClearFilters={() => {
          setSearch('');
          setModuleFilter('ALL');
          setPage(1);
        }}
      >
        {pagedLogs.map(log => {
          const isDelete = log.action.toLowerCase().includes('delete');
          const stripe = isDelete
            ? DESIGN_TOKENS.colors.status.outOfServiceStripe
            : DESIGN_TOKENS.colors.accent;

          return (
            <DataRow key={log.id} stripeColor={stripe}>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span
                  dir="ltr"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}
                >
                  {new Date(log.created_at).toLocaleString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US')}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)' }}>
                  {log.user_name}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                  {t(log.user_role)}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText
                  label={t(log.action)}
                  color={
                    isDelete
                      ? DESIGN_TOKENS.colors.status.outOfServiceText
                      : DESIGN_TOKENS.colors.status.availableText
                  }
                />
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
                  {t(log.module)}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span dir="ltr" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink)' }}>
                  {log.record_id}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span dir="ltr" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {log.ip_address || '127.0.0.1'}
                </span>
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${filteredLogs.length} من ${auditLogs.length} حدث تدقيق`
            : `${filteredLogs.length} of ${auditLogs.length} audit events`
        }
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={filteredLogs.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />
    </PageContainer>
  );
};
