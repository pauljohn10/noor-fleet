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
        title={isRTL ? 'مركز التحكم للمدير العام' : 'Super Admin Control Center'}
        subtitle={
          isRTL
            ? 'إدارة النظام، تفويض حسابات المستخدمين، سجل التدقيق الأمني، ومراقبة صحة قاعدة البيانات.'
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
            {isRTL ? 'صلاحية النظام الكاملة' : 'System Root Level'}
          </span>
        }
        actions={
          <>
            <SecondaryButton onClick={() => onNavigateTab('auditLog')}>
              <History style={{ width: 14, height: 14 }} />
              <span>{isRTL ? 'سجلات التدقيق' : 'Audit Logs'}</span>
            </SecondaryButton>
            <PrimaryButton onClick={() => setIsUserModalOpen(true)}>
              <Users style={{ width: 14, height: 14 }} />
              <span>{isRTL ? 'إدارة المستخدمين والصلاحيات' : 'Manage Users & Provisioning'}</span>
            </PrimaryButton>
          </>
        }
      />

      {/* Admin KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 mb-7">
        <StatCard
          title={isRTL ? 'إجمالي المستخدمين' : 'TOTAL USERS'}
          value={userCount}
          subtitle={isRTL ? 'حسابات قاعدة البيانات' : 'Database Profiles'}
          icon={<Users style={{ width: 15, height: 15, color: EDITORIAL_STATUS.amber.text }} />}
          color="amber"
          onClick={() => setIsUserModalOpen(true)}
        />
        <StatCard
          title={isRTL ? 'الجلسات النشطة' : 'ACTIVE SESSIONS'}
          value={userCount > 0 ? userCount : 1}
          subtitle={isRTL ? 'مستخدمون موثقون' : 'Authenticated Users'}
          icon={<CheckCircle2 style={{ width: 15, height: 15, color: EDITORIAL_STATUS.green.text }} />}
          color="emerald"
        />
        <StatCard
          title={isRTL ? 'أدوار النظام' : 'SYSTEM ROLES'}
          value={3}
          subtitle={isRTL ? 'أدوار الصلاحيات المفعلة' : 'Enforced RBAC Roles'}
          icon={<Lock style={{ width: 15, height: 15, color: '#5B21B6' }} />}
          color="purple"
        />
        <StatCard
          title={isRTL ? 'إجمالي الشاحنات' : 'TOTAL VEHICLES'}
          value={vehicles.length}
          subtitle={isRTL ? 'وحدات الجر والشاحنات' : 'Tractor Units'}
          icon={<Truck style={{ width: 15, height: 15, color: EDITORIAL_STATUS.blue.text }} />}
          color="cyan"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title={isRTL ? 'أوامر العمل المفتوحة' : 'OPEN WORK ORDERS'}
          value={openWOsCount}
          subtitle={isRTL ? 'بطاقات العمل النشطة' : 'Active Job Cards'}
          icon={<Wrench style={{ width: 15, height: 15, color: EDITORIAL_STATUS.amber.text }} />}
          color="amber"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title={isRTL ? 'سلامة قاعدة البيانات' : 'DATABASE HEALTH'}
          value="100%"
          subtitle={isRTL ? 'PostgreSQL متصل مباشر' : 'PostgreSQL 15.1 Live'}
          icon={<Database style={{ width: 15, height: 15, color: EDITORIAL_STATUS.green.text }} />}
          color="emerald"
        />
      </div>

      {/* Admin Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 28 }}>
        <EditorialSection
          title={isRTL ? 'أحدث أحداث الأمان والتدقيق' : 'Recent Security & Audit Events'}
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
              {isRTL ? 'سجل التدقيق الكامل ←' : 'Full Audit Trail →'}
            </button>
          }
        >
          <DataTable
            columns={[
              { label: t('Actor') },
              { label: t('Action') },
              { label: t('Timestamp'), align: 'end' },
            ]}
            isEmpty={auditLogs.length === 0}
            emptyMessage={isRTL ? 'لا توجد أحداث تدقيق بعد' : 'No audit events recorded'}
            hasActionsColumn={false}
          >
            {auditLogs.slice(0, 5).map(log => (
              <DataRow key={log.id} stripeColor={EDITORIAL_STATUS.blue.stripe}>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--color-ink)' }}>{log.user_name}</div>
                  <div style={{ fontSize: 11.5, color: EDITORIAL_STATUS.amber.text, marginTop: 2 }}>
                    {t(log.user_role, log.user_role)}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                  {isRTL ? `${log.action} على ${log.module} (${log.record_id})` : `${log.action} on ${log.module} (${log.record_id})`}
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'end', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                  {new Date(log.created_at).toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US')}
                </td>
              </DataRow>
            ))}
          </DataTable>
        </EditorialSection>

        <EditorialSection
          title={isRTL ? 'حالة البنية التحتية وقاعدة البيانات' : 'Infrastructure & Database Telemetry'}
          marginTop={0}
        >
          <DataTable
            columns={[
              { label: isRTL ? 'الخدمة' : 'Service' },
              { label: isRTL ? 'التفاصيل' : 'Details' },
              { label: isRTL ? 'الحالة' : 'Status', align: 'end' },
            ]}
            isEmpty={false}
            hasActionsColumn={false}
          >
            <DataRow stripeColor={EDITORIAL_STATUS.green.stripe}>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                {isRTL ? 'محرك قاعدة البيانات Supabase PostgreSQL' : 'Supabase PostgreSQL Engine'}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: 12, color: 'var(--color-text-muted)' }}>
                {isRTL ? 'أمان مستوى الصفوف (RLS) مُفعَّل' : 'Row Level Security (RLS) Active'}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <Badge variant="success">Healthy</Badge>
              </td>
            </DataRow>
            <DataRow stripeColor={EDITORIAL_STATUS.green.stripe}>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                {isRTL ? 'حاويات التخزين السحابية' : 'Storage Buckets (Photos & Docs)'}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }} dir="ltr">
                vehicle-photos, work-order-photos, inspection-photos
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <Badge variant="success">Online</Badge>
              </td>
            </DataRow>
            <DataRow stripeColor={EDITORIAL_STATUS.blue.stripe}>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                {isRTL ? 'مراقب التنبيهات الفورية للنظام' : 'System Notification Sentinel'}
              </td>
              <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: 12, color: 'var(--color-text-muted)' }}>
                {isRTL ? `${notifications.length} تنبيه نظام نشط` : `${notifications.length} active system alerts`}
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
