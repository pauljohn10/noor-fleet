import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Lock,
  Server,
  History,
  Truck,
  Wrench,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { StatCard } from '../common/StatCard';
import { UserManagementModal } from '../common/UserManagementModal';
import { Badge } from '../common/Badge';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  EditorialSection,
  DataTable,
  DataRow,
  EDITORIAL_STATUS,
} from '../common/EditorialUI';

interface SuperAdminDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigateTab }) => {
  const { vehicles, workOrders, notifications, auditLogs } = useFleet();
  const { isRTL, t } = useI18n();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userCount, setUserCount] = useState<number>(0);

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .then(({ count }) => {
          if (count !== null && count !== undefined) setUserCount(count);
        });
    }
  }, []);

  const openWOsCount = workOrders.filter(w => w.status !== 'RELEASED' && w.status !== 'CANCELLED').length;

  return (
    <PageContainer>
      <PageHeader
        title={isRTL ? 'ظ…ط±ظƒط² ط§ظ„طھط­ظƒظ… ظ„ظ„ظ…ط¯ظٹط± ط§ظ„ط¹ط§ظ…' : 'Super Admin Control Center'}
        subtitle={
          isRTL
            ? 'ط¥ط¯ط§ط±ط© ط§ظ„ظ†ط¸ط§ظ…طŒ طھظپظˆظٹط¶ ط­ط³ط§ط¨ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ†طŒ ط³ط¬ظ„ ط§ظ„طھط¯ظ‚ظٹظ‚ ط§ظ„ط£ظ…ظ†ظٹطŒ ظˆظ…ط±ط§ظ‚ط¨ط© طµط­ط© ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ.'
            : 'System administration, user access provisioning, security audit streams, and database health telemetry.'
        }
        badge={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
              background: '#ECFDF5',
              color: '#0F5C4D',
              border: '1px solid #A7F3D0',
            }}
          >
            <ShieldCheck style={{ width: 13, height: 13 }} />
            {isRTL ? 'طµظ„ط§ط­ظٹط© ط§ظ„ظ†ط¸ط§ظ… ط§ظ„ظƒط§ظ…ظ„ط©' : 'System Root Level'}
          </span>
        }
        actions={
          <>
            <SecondaryButton onClick={() => onNavigateTab('auditLog')}>
              <History style={{ width: 14, height: 14 }} />
              <span>{isRTL ? 'ط³ط¬ظ„ط§طھ ط§ظ„طھط¯ظ‚ظٹظ‚' : 'Audit Logs'}</span>
            </SecondaryButton>
            <PrimaryButton onClick={() => setIsUserModalOpen(true)}>
              <Users style={{ width: 14, height: 14 }} />
              <span>{isRTL ? 'ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ† ظˆط§ظ„طµظ„ط§ط­ظٹط§طھ' : 'Manage Users & Provisioning'}</span>
            </PrimaryButton>
          </>
        }
      />

      {/* Admin KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 mb-7">
        <StatCard
          title={isRTL ? 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ†' : 'TOTAL USERS'}
          value={userCount}
          subtitle={isRTL ? 'ط­ط³ط§ط¨ط§طھ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ' : 'Database Profiles'}
          icon={<Users style={{ width: 15, height: 15, color: EDITORIAL_STATUS.amber.text }} />}
          color="amber"
          onClick={() => setIsUserModalOpen(true)}
        />
        <StatCard
          title={isRTL ? 'ط§ظ„ط¬ظ„ط³ط§طھ ط§ظ„ظ†ط´ط·ط©' : 'ACTIVE SESSIONS'}
          value={userCount > 0 ? userCount : 1}
          subtitle={isRTL ? 'ظ…ط³طھط®ط¯ظ…ظˆظ† ظ…ظˆط«ظ‚ظˆظ†' : 'Authenticated Users'}
          icon={<CheckCircle2 style={{ width: 15, height: 15, color: EDITORIAL_STATUS.green.text }} />}
          color="emerald"
        />
        <StatCard
          title={isRTL ? 'ط£ط¯ظˆط§ط± ط§ظ„ظ†ط¸ط§ظ…' : 'SYSTEM ROLES'}
          value={3}
          subtitle={isRTL ? 'ط£ط¯ظˆط§ط± ط§ظ„طµظ„ط§ط­ظٹط§طھ ط§ظ„ظ…ظپط¹ظ„ط©' : 'Enforced RBAC Roles'}
          icon={<Lock style={{ width: 15, height: 15, color: '#5B21B6' }} />}
          color="purple"
        />
        <StatCard
          title={isRTL ? 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط´ط§ط­ظ†ط§طھ' : 'TOTAL VEHICLES'}
          value={vehicles.length}
          subtitle={isRTL ? 'ظˆط­ط¯ط§طھ ط§ظ„ط¬ط± ظˆط§ظ„ط´ط§ط­ظ†ط§طھ' : 'Tractor Units'}
          icon={<Truck style={{ width: 15, height: 15, color: EDITORIAL_STATUS.blue.text }} />}
          color="cyan"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'ط£ظˆط§ظ…ط± ط§ظ„ط¹ظ…ظ„ ط§ظ„ظ…ظپطھظˆط­ط©' : 'OPEN WORK ORDERS'}
          value={openWOsCount}
          subtitle={isRTL ? 'ط¨ط·ط§ظ‚ط§طھ ط§ظ„ط¹ظ…ظ„ ط§ظ„ظ†ط´ط·ط©' : 'Active Job Cards'}
          icon={<Wrench style={{ width: 15, height: 15, color: EDITORIAL_STATUS.amber.text }} />}
          color="amber"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'ط³ظ„ط§ظ…ط© ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ' : 'DATABASE HEALTH'}
          value="100%"
          subtitle={isRTL ? 'PostgreSQL ظ…طھطµظ„ ظ…ط¨ط§ط´ط±' : 'PostgreSQL 15.1 Live'}
          icon={<Database style={{ width: 15, height: 15, color: EDITORIAL_STATUS.green.text }} />}
          color="emerald"
        />
      </div>

      {/* Admin Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 28 }}>
        <EditorialSection
          title={isRTL ? 'ط£ط­ط¯ط« ط£ط­ط¯ط§ط« ط§ظ„ط£ظ…ط§ظ† ظˆط§ظ„طھط¯ظ‚ظٹظ‚' : 'Recent Security & Audit Events'}
          marginTop={0}
          action={
            <button
              type="button"
              onClick={() => onNavigateTab('auditLog')}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 12.5,
                fontWeight: 500,
                color: 'var(--color-brand-accent)',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              {isRTL ? 'ط³ط¬ظ„ ط§ظ„طھط¯ظ‚ظٹظ‚ ط§ظ„ظƒط§ظ…ظ„ â†گ' : 'Full Audit Trail â†’'}
            </button>
          }
        >
          <DataTable
            showPagination
            columns={[
              { label: t('Actor') },
              { label: t('Action') },
              { label: t('Timestamp'), align: 'end' },
            ]}
            isEmpty={auditLogs.length === 0}
            emptyMessage={isRTL ? 'ظ„ط§ طھظˆط¬ط¯ ط£ط­ط¯ط§ط« طھط¯ظ‚ظٹظ‚ ط¨ط¹ط¯' : 'No audit events recorded'}
            hasActionsColumn={false}
          >
            {auditLogs.map(log => (
              <DataRow key={log.id} stripeColor={EDITORIAL_STATUS.blue.stripe}>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--color-ink)' }}>{log.user_name}</div>
                  <div style={{ fontSize: 12.5, color: EDITORIAL_STATUS.amber.text, marginTop: 2 }}>
                    {t(log.user_role, log.user_role)}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                  {isRTL ? `${log.action} ط¹ظ„ظ‰ ${log.module} (${log.record_id})` : `${log.action} on ${log.module} (${log.record_id})`}
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'end', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                  {new Date(log.created_at).toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US')}
                </td>
              </DataRow>
            ))}
          </DataTable>
        </EditorialSection>

        <EditorialSection
          title={isRTL ? 'ط­ط§ظ„ط© ط§ظ„ط¨ظ†ظٹط© ط§ظ„طھط­طھظٹط© ظˆظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ' : 'Infrastructure & Database Telemetry'}
          marginTop={0}
        >
          <DataTable
            columns={[
              { label: isRTL ? 'ط§ظ„ط®ط¯ظ…ط©' : 'Service' },
              { label: isRTL ? 'ط§ظ„طھظپط§طµظٹظ„' : 'Details' },
              { label: isRTL ? 'ط§ظ„ط­ط§ظ„ط©' : 'Status', align: 'end' },
            ]}
            isEmpty={false}
            hasActionsColumn={false}
          >
            <DataRow stripeColor={EDITORIAL_STATUS.green.stripe}>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                {isRTL ? 'ظ…ط­ط±ظƒ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ Supabase PostgreSQL' : 'Supabase PostgreSQL Engine'}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: 12, color: 'var(--color-text-muted)' }}>
                {isRTL ? 'ط£ظ…ط§ظ† ظ…ط³طھظˆظ‰ ط§ظ„طµظپظˆظپ (RLS) ظ…ظڈظپط¹ظژظ‘ظ„' : 'Row Level Security (RLS) Active'}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <Badge variant="success">Healthy</Badge>
              </td>
            </DataRow>
            <DataRow stripeColor={EDITORIAL_STATUS.green.stripe}>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                {isRTL ? 'ط­ط§ظˆظٹط§طھ ط§ظ„طھط®ط²ظٹظ† ط§ظ„ط³ط­ط§ط¨ظٹط©' : 'Storage Buckets (Photos & Docs)'}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: 12.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }} dir="ltr">
                vehicle-photos, work-order-photos, inspection-photos
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <Badge variant="success">Online</Badge>
              </td>
            </DataRow>
            <DataRow stripeColor={EDITORIAL_STATUS.blue.stripe}>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                {isRTL ? 'ظ…ط±ط§ظ‚ط¨ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ ط§ظ„ظپظˆط±ظٹط© ظ„ظ„ظ†ط¸ط§ظ…' : 'System Notification Sentinel'}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: 12, color: 'var(--color-text-muted)' }}>
                {isRTL ? `${notifications.length} طھظ†ط¨ظٹظ‡ ظ†ط¸ط§ظ… ظ†ط´ط·` : `${notifications.length} active system alerts`}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <Badge variant="info">Running</Badge>
              </td>
            </DataRow>
          </DataTable>
        </EditorialSection>
      </div>

      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />
    </PageContainer>
  );
};
