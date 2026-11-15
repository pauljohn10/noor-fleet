import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserPlus,
  RefreshCw,
  Shield,
  KeyRound,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Search,
  Eye,
  EyeOff,
  Check,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { SystemRole, UserRole } from '../../types';
import {
  ALL_SYSTEM_ROLES,
  getRoleMeta,
  normalizeRole,
  ROLE_DEFINITIONS,
} from '../../lib/rbac';
import {
  listManagedUsers,
  createManagedUser,
  updateManagedUser,
  toggleManagedUserActive,
  resetManagedUserPassword,
  deleteManagedUser,
  ManagedUserRecord,
} from '../../lib/adminUsersApi';
import {
  PageHeader,
  PrimaryButton,
  GhostButton,
  MetricStrip,
  StatusTabs,
  EditorialSelect,
  TableFooter,
} from '../common/EditorialUI';

interface UserManagementViewProps {
  isModal?: boolean;
  onClose?: () => void;
}

const DEFAULT_DEPARTMENTS = [
  'IT & System Administration',
  'Fleet Operations',
  'Workshop & Maintenance',
  'Executive Management',
  'Safety & Compliance (HSE)',
  'Dispatch & Logistics',
  'Spare Parts & Store',
];

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  isModal = false,
  onClose,
}) => {
  const { currentProfile, activeRole } = useAuth();
  const { isRTL } = useI18n();

  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [roleTab, setRoleTab] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Create User Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createFullName, setCreateFullName] = useState<string>('');
  const [createEmail, setCreateEmail] = useState<string>('');
  const [createPassword, setCreatePassword] = useState<string>('');
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);
  const [createRole, setCreateRole] = useState<SystemRole>('FLEET_STAFF');
  const [createDepartment, setCreateDepartment] = useState<string>('Fleet Operations');
  const [createPhone, setCreatePhone] = useState<string>('');
  const [createIsActive, setCreateIsActive] = useState<boolean>(true);
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<ManagedUserRecord | null>(null);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editRole, setEditRole] = useState<SystemRole>('VIEWER');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);

  // Reset Password Modal State
  const [resetTargetUser, setResetTargetUser] = useState<ManagedUserRecord | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [submittingReset, setSubmittingReset] = useState<boolean>(false);

  // Delete Confirmation Modal State
  const [deleteTargetUser, setDeleteTargetUser] = useState<ManagedUserRecord | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState<boolean>(false);

  // Role Matrix Accordion
  const [showRoleMatrix, setShowRoleMatrix] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await listManagedUsers();
      setUsers(list);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeRole === 'SUPER_ADMIN') {
      fetchUsers();
    }
  }, [activeRole, fetchUsers]);

  // Reset pagination to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleTab, statusFilter, searchQuery, pageSize]);

  const showBanner = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } else {
      setErrorMsg(msg);
      setSuccessMsg(null);
    }
  };

  // Strict RBAC guard: Only Super Admin can access User & Role Management
  if (activeRole !== 'SUPER_ADMIN') {
    return (
      <div
        style={{
          padding: 32,
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          background: 'var(--color-surface)',
          textAlign: 'center',
        }}
      >
        <Lock size={28} style={{ margin: '0 auto 10px', color: 'var(--color-danger-text)' }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
          {isRTL ? 'غير مصرح بالوصول' : 'Restricted Administrator Area'}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
          {isRTL
            ? 'إدارة المستخدمين والأدوار متاحة فقط لمدير النظام العام (Super Admin).'
            : 'Only Super Admin accounts are authorized to create users, assign roles, or modify permissions.'}
        </p>
      </div>
    );
  }

  // Role counts
  const roleCounts = useMemo(() => {
    const counts: Record<SystemRole, number> = {
      SUPER_ADMIN: 0,
      FLEET_MANAGER: 0,
      WORKSHOP_MANAGER: 0,
      FLEET_STAFF: 0,
      WORKSHOP_STAFF: 0,
      VIEWER: 0,
    };
    for (const u of users) {
      const r = normalizeRole(u.role);
      counts[r] = (counts[r] || 0) + 1;
    }
    return counts;
  }, [users]);

  const activeUsersCount = useMemo(
    () => users.filter(u => u.is_active !== false).length,
    [users]
  );
  const deactivatedUsersCount = useMemo(
    () => users.filter(u => u.is_active === false).length,
    [users]
  );

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const normalized = normalizeRole(u.role);
      if (roleTab !== 'ALL' && normalized !== roleTab) {
        return false;
      }
      if (statusFilter === 'ACTIVE' && u.is_active === false) {
        return false;
      }
      if (statusFilter === 'INACTIVE' && u.is_active !== false) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const roleMeta = getRoleMeta(normalized);
        const match =
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.department || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q) ||
          roleMeta.labelEn.toLowerCase().includes(q) ||
          roleMeta.labelAr.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [users, roleTab, statusFilter, searchQuery]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Handlers
  const handleRoleSelectForCreate = (r: SystemRole) => {
    setCreateRole(r);
    setCreateDepartment(ROLE_DEFINITIONS[r].defaultDepartment);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFullName.trim() || !createEmail.trim() || createPassword.length < 6) {
      showBanner(
        'error',
        isRTL
          ? 'يرجى إدخال الاسم الكامل والبريد الإلكتروني وكلمة مرور من 6 أحرف على الأقل.'
          : 'Please provide full name, valid email, and a password of at least 6 characters.'
      );
      return;
    }

    setSubmittingCreate(true);
    try {
      const created = await createManagedUser({
        email: createEmail.trim(),
        password: createPassword,
        full_name: createFullName.trim(),
        role: createRole,
        department: createDepartment.trim() || ROLE_DEFINITIONS[createRole].defaultDepartment,
        phone: createPhone.trim(),
        is_active: createIsActive,
      });

      setUsers(prev => [created, ...prev.filter(u => u.id !== created.id)]);
      setIsCreateOpen(false);
      setCreateFullName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreatePhone('');
      setCreateRole('FLEET_STAFF');
      setCreateIsActive(true);
      showBanner(
        'success',
        isRTL
          ? `تم إنشاء حساب المستخدم ${created.full_name} بدور ${ROLE_DEFINITIONS[normalizeRole(created.role)].labelAr}`
          : `Created user "${created.full_name}" with role ${ROLE_DEFINITIONS[normalizeRole(created.role)].labelEn}.`
      );
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to create user.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const openEditModal = (u: ManagedUserRecord) => {
    const normalized = normalizeRole(u.role);
    setEditingUser(u);
    setEditFullName(u.full_name || '');
    setEditRole(normalized);
    setEditDepartment(u.department || ROLE_DEFINITIONS[normalized].defaultDepartment);
    setEditPhone(u.phone || '');
    setEditIsActive(u.is_active !== false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editingUser.id === currentProfile.id && editRole !== 'SUPER_ADMIN') {
      showBanner(
        'error',
        isRTL
          ? 'لا يمكنك تخفيض صلاحية حسابك الشخصي كمدير نظام عام.'
          : 'Safety Lock: You cannot demote your own Super Admin account.'
      );
      return;
    }

    if (editingUser.id === currentProfile.id && !editIsActive) {
      showBanner(
        'error',
        isRTL
          ? 'لا يمكنك تعطيل حسابك الشخصي النشط.'
          : 'Safety Lock: You cannot deactivate your own active Super Admin account.'
      );
      return;
    }

    setSubmittingEdit(true);
    try {
      const updated = await updateManagedUser({
        userId: editingUser.id,
        full_name: editFullName.trim(),
        role: editRole,
        department: editDepartment.trim(),
        phone: editPhone.trim(),
        is_active: editIsActive,
      });

      setUsers(prev =>
        prev.map(u => (u.id === editingUser.id ? { ...u, ...updated, role: editRole } : u))
      );
      setEditingUser(null);
      showBanner(
        'success',
        isRTL
          ? `تم تحديث صلاحيات وبيانات ${updated.full_name} بنجاح.`
          : `Updated permissions and profile for "${updated.full_name}" (${ROLE_DEFINITIONS[editRole].labelEn}).`
      );
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to update user.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleActive = async (u: ManagedUserRecord) => {
    if (u.id === currentProfile.id) {
      showBanner(
        'error',
        isRTL
          ? 'لا يمكنك تعطيل حسابك الشخصي النشط.'
          : 'Safety Lock: You cannot deactivate your own Super Admin account.'
      );
      return;
    }

    const nextActive = u.is_active === false;
    try {
      await toggleManagedUserActive(u.id, nextActive);
      setUsers(prev =>
        prev.map(item => (item.id === u.id ? { ...item, is_active: nextActive } : item))
      );
      showBanner(
        'success',
        nextActive
          ? isRTL
            ? `تم تفعيل حساب ${u.full_name}`
            : `Activated account for ${u.full_name}.`
          : isRTL
          ? `تم تعطيل حساب ${u.full_name} وإيقاف وصوله للنظام.`
          : `Deactivated account for ${u.full_name}. Access is now blocked by RLS.`
      );
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to change account status.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || newPasswordVal.length < 6) return;

    setSubmittingReset(true);
    try {
      await resetManagedUserPassword(resetTargetUser.id, newPasswordVal);
      setResetTargetUser(null);
      setNewPasswordVal('');
      showBanner(
        'success',
        isRTL
          ? `تم تحديث كلمة المرور للمستخدم ${resetTargetUser.full_name}`
          : `Password reset completed for ${resetTargetUser.full_name}.`
      );
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to reset password.');
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetUser) return;
    if (deleteTargetUser.id === currentProfile.id) {
      showBanner('error', 'You cannot delete your own Super Admin account.');
      return;
    }

    setSubmittingDelete(true);
    try {
      await deleteManagedUser(deleteTargetUser.id);
      setUsers(prev => prev.filter(u => u.id !== deleteTargetUser.id));
      const deletedName = deleteTargetUser.full_name;
      setDeleteTargetUser(null);
      showBanner(
        'success',
        isRTL ? `تم حذف حساب ${deletedName}` : `Deleted user account "${deletedName}".`
      );
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to delete user.');
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title={isRTL ? 'إدارة المستخدمين والصلاحيات (RBAC)' : 'Users & Role-Based Access Control (RBAC)'}
        subtitle={
          isRTL
            ? 'إنشاء الحسابات، تعيين الأدوار الستة المعتمدة، تفعيل أو تعطيل المستخدمين، وإنفاذ سياسات أمان قاعدة البيانات (Supabase RLS).'
            : 'Provision users, assign the 6 system roles, enforce read-only viewer guards, and manage account activation backed by Supabase Row Level Security.'
        }
        actions={
          <>
            <GhostButton onClick={() => setShowRoleMatrix(v => !v)}>
              <Shield size={14} style={{ marginInlineEnd: 5, display: 'inline' }} />
              {showRoleMatrix
                ? isRTL
                  ? 'إخفاء مصفوفة الصلاحيات'
                  : 'Hide Role Matrix'
                : isRTL
                ? 'مصفوفة الأدوار والصلاحيات (6)'
                : 'Role Permissions Matrix (6)'}
            </GhostButton>
            <GhostButton onClick={fetchUsers} disabled={loading}>
              <RefreshCw
                size={14}
                className={loading ? 'animate-spin' : ''}
                style={{ marginInlineEnd: 5, display: 'inline' }}
              />
              {isRTL ? 'تحديث' : 'Refresh'}
            </GhostButton>
            <PrimaryButton onClick={() => setIsCreateOpen(true)}>
              <UserPlus size={14} style={{ marginInlineEnd: 6, display: 'inline' }} />
              {isRTL ? '+ إضافة مستخدم جديد' : '+ Create User Account'}
            </PrimaryButton>
            {isModal && onClose && (
              <GhostButton onClick={onClose}>{isRTL ? 'إغلاق' : 'Close'}</GhostButton>
            )}
          </>
        }
      />

      {/* Feedback Banners */}
      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 6,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 6,
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 6-Role KPI Strip */}
      <MetricStrip
        items={[
          {
            label: isRTL ? 'إجمالي الحسابات' : 'Total Accounts',
            value: users.length,
            subtext: `${activeUsersCount} ${isRTL ? 'نشط' : 'active'} · ${deactivatedUsersCount} ${
              isRTL ? 'معطل' : 'deactivated'
            }`,
          },
          {
            label: isRTL ? 'مدير النظام / الأسطول' : 'Super Admin / Fleet Mgr',
            value: `${roleCounts.SUPER_ADMIN} / ${roleCounts.FLEET_MANAGER}`,
            subtext: isRTL ? 'القيادة وإدارة الأسطول' : 'System & Fleet Leadership',
          },
          {
            label: isRTL ? 'مدير الورشة / موظف الأسطول' : 'Workshop Mgr / Fleet Staff',
            value: `${roleCounts.WORKSHOP_MANAGER} / ${roleCounts.FLEET_STAFF}`,
            subtext: isRTL ? 'إدارة الصيانة وعمليات الأسطول' : 'Maintenance & Fleet Ops',
          },
          {
            label: isRTL ? 'موظف الورشة / مشاهد (قراءة فقط)' : 'Workshop Staff / Viewer',
            value: `${roleCounts.WORKSHOP_STAFF} / ${roleCounts.VIEWER}`,
            subtext: isRTL ? 'التنفيذ الفني والعرض فقط' : 'Workshop Execution & Read-Only',
          },
        ]}
      />

      {/* Collapsible 6-Role Permissions Reference Matrix */}
      {showRoleMatrix && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            padding: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                {isRTL
                  ? 'مصفوفة الصلاحيات للأدوار الستة (مطبقة في الواجهة وقاعدة بيانات Supabase RLS)'
                  : '6-Role Security & Permission Matrix (Enforced on Frontend, Backend API & Supabase RLS)'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                {isRTL
                  ? 'لا يُسمح للمستخدمين بترقية صلاحياتهم ذاتياً. دور المشاهد (Viewer) مقيد للقراءة فقط.'
                  : 'Users are blocked by database triggers from self-escalating roles. Viewers are strictly read-only across all tables and storage buckets.'}
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: 12,
            }}
          >
            {ALL_SYSTEM_ROLES.map(r => {
              const meta = ROLE_DEFINITIONS[r];
              const perms = isRTL ? meta.permissionsAr : meta.permissionsEn;
              return (
                <div
                  key={r}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: 14,
                    background: 'var(--color-page-bg)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: meta.dotColor,
                        }}
                      />
                      {isRTL ? meta.labelAr : meta.labelEn}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10.5,
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {r}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 11.5,
                      color: 'var(--color-text-secondary)',
                      margin: '0 0 8px',
                      lineHeight: 1.4,
                    }}
                  >
                    {isRTL ? meta.shortDescAr : meta.shortDescEn}
                  </p>
                  <ul
                    style={{
                      margin: 0,
                      paddingInlineStart: 16,
                      fontSize: 11.5,
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                    }}
                  >
                    {perms.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <StatusTabs
        activeKey={roleTab}
        onChange={setRoleTab}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={
          isRTL
            ? 'بحث بالاسم، البريد، القسم، أو الدور...'
            : 'Search name, email, department, role...'
        }
        extraFilters={
          <EditorialSelect
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">{isRTL ? 'جميع الحالات' : 'All Account Statuses'}</option>
            <option value="ACTIVE">{isRTL ? 'نشط فقط' : 'Active Only'}</option>
            <option value="INACTIVE">{isRTL ? 'معطل فقط' : 'Deactivated Only'}</option>
          </EditorialSelect>
        }
        tabs={[
          { key: 'ALL', label: isRTL ? 'الكل' : 'All Roles', count: users.length },
          {
            key: 'SUPER_ADMIN',
            label: isRTL ? 'مدير النظام' : 'Super Admin',
            count: roleCounts.SUPER_ADMIN,
            stripe: ROLE_DEFINITIONS.SUPER_ADMIN.dotColor,
          },
          {
            key: 'FLEET_MANAGER',
            label: isRTL ? 'مدير الأسطول' : 'Fleet Manager',
            count: roleCounts.FLEET_MANAGER,
            stripe: ROLE_DEFINITIONS.FLEET_MANAGER.dotColor,
          },
          {
            key: 'WORKSHOP_MANAGER',
            label: isRTL ? 'مدير الورشة' : 'Workshop Manager',
            count: roleCounts.WORKSHOP_MANAGER,
            stripe: ROLE_DEFINITIONS.WORKSHOP_MANAGER.dotColor,
          },
          {
            key: 'FLEET_STAFF',
            label: isRTL ? 'موظف الأسطول' : 'Fleet Staff',
            count: roleCounts.FLEET_STAFF,
            stripe: ROLE_DEFINITIONS.FLEET_STAFF.dotColor,
          },
          {
            key: 'WORKSHOP_STAFF',
            label: isRTL ? 'موظف الورشة' : 'Workshop Staff',
            count: roleCounts.WORKSHOP_STAFF,
            stripe: ROLE_DEFINITIONS.WORKSHOP_STAFF.dotColor,
          },
          {
            key: 'VIEWER',
            label: isRTL ? 'مشاهد (قراءة فقط)' : 'Viewer (Read Only)',
            count: roleCounts.VIEWER,
            stripe: ROLE_DEFINITIONS.VIEWER.dotColor,
          },
        ]}
      />

      {/* Users Data Table */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-table-header)',
                  textAlign: 'start',
                }}
              >
                <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {isRTL ? 'المستخدم' : 'User'}
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {isRTL ? 'الدور الأمني (Role)' : 'Assigned Role'}
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {isRTL ? 'القسم' : 'Department'}
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {isRTL ? 'مستوى الوصول' : 'Access Level'}
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {isRTL ? 'حالة الحساب' : 'Account Status'}
                </th>
                <th
                  style={{
                    padding: '10px 14px',
                    fontWeight: 500,
                    color: 'var(--color-text-muted)',
                    fontSize: 12,
                    textAlign: 'end',
                  }}
                >
                  {isRTL ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {isRTL ? 'جاري تحميل حسابات المستخدمين...' : 'Loading user accounts & permissions...'}
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {isRTL ? 'لا توجد حسابات مطابقة للبحث.' : 'No user accounts match the current filters.'}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => {
                  const normalizedRole = normalizeRole(u.role);
                  const meta = getRoleMeta(normalizedRole);
                  const isSelf = u.id === currentProfile.id;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--color-border-subtle)',
                        opacity: u.is_active === false ? 0.65 : 1,
                      }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                            {u.full_name || 'Unnamed User'}
                          </span>
                          {isSelf && (
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'var(--color-row-hover)',
                                color: 'var(--color-ink)',
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              {isRTL ? 'أنت' : 'You'}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            color: 'var(--color-text-muted)',
                            marginTop: 2,
                          }}
                        >
                          {u.email || '—'}
                          {u.phone ? ` · ${u.phone}` : ''}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 9px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-page-bg)',
                            color: 'var(--color-ink)',
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: meta.dotColor,
                            }}
                          />
                          {isRTL ? meta.labelAr : meta.labelEn}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>
                        {u.department || meta.defaultDepartment}
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {normalizedRole === 'VIEWER' ? (
                          <span style={{ color: '#6B7280', fontWeight: 500 }}>
                            {isRTL ? 'قراءة فقط (ممنوع الإضافة/التعديل/الرفع)' : 'Read-Only (No Add/Edit/Delete/Upload)'}
                          </span>
                        ) : normalizedRole === 'SUPER_ADMIN' ? (
                          <span style={{ color: '#9A3412', fontWeight: 500 }}>
                            {isRTL ? 'صلاحيات النظام الكاملة' : 'Full System & Admin Control'}
                          </span>
                        ) : normalizedRole === 'FLEET_MANAGER' ? (
                          <span>{isRTL ? 'إدارة الأسطول كاملة' : 'Full Fleet Management'}</span>
                        ) : normalizedRole === 'WORKSHOP_MANAGER' ? (
                          <span>{isRTL ? 'إدارة الورشة والصيانة كاملة' : 'Full Workshop & Store Management'}</span>
                        ) : normalizedRole === 'FLEET_STAFF' ? (
                          <span>{isRTL ? 'تشغيل وسجلات الأسطول المصرحة' : 'Authorized Fleet Operations'}</span>
                        ) : (
                          <span>{isRTL ? 'تشغيل وسجلات الورشة المصرحة' : 'Authorized Workshop Operations'}</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {u.is_active !== false ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#15803D', fontWeight: 500 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#15803D' }} />
                            {isRTL ? 'نشط' : 'Active'}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#B91C1C', fontWeight: 500 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#B91C1C' }} />
                            {isRTL ? 'معطل' : 'Deactivated'}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'end' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <GhostButton
                            onClick={() => openEditModal(u)}
                            title={isRTL ? 'تعديل الدور والصلاحيات' : 'Change Role & Permissions'}
                          >
                            <Edit3 size={13} style={{ marginInlineEnd: 4, display: 'inline' }} />
                            {isRTL ? 'الدور / تعديل' : 'Role / Edit'}
                          </GhostButton>

                          <GhostButton
                            onClick={() => {
                              setResetTargetUser(u);
                              setNewPasswordVal('');
                            }}
                            title={isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                          >
                            <KeyRound size={13} />
                          </GhostButton>

                          {!isSelf && (
                            <GhostButton
                              onClick={() => handleToggleActive(u)}
                              title={
                                u.is_active !== false
                                  ? isRTL
                                    ? 'تعطيل الحساب'
                                    : 'Deactivate Account'
                                  : isRTL
                                  ? 'تفعيل الحساب'
                                  : 'Activate Account'
                              }
                            >
                              {u.is_active !== false ? (
                                <UserX size={13} style={{ color: '#B91C1C' }} />
                              ) : (
                                <UserCheck size={13} style={{ color: '#15803D' }} />
                              )}
                            </GhostButton>
                          )}

                          {!isSelf && (
                            <GhostButton
                              onClick={() => setDeleteTargetUser(u)}
                              title={isRTL ? 'حذف المستخدم' : 'Delete User'}
                            >
                              <Trash2 size={13} style={{ color: '#B91C1C' }} />
                            </GhostButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '0 14px' }}>
          <TableFooter
            summaryText={`${filteredUsers.length} ${isRTL ? 'مستخدم' : 'users'}`}
            page={currentPage}
            totalPages={Math.max(1, Math.ceil(filteredUsers.length / pageSize))}
            totalRecords={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: CREATE NEW USER ACCOUNT & ASSIGN ROLE
          ===================================================================== */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(17,17,16,0.55)' }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              width: '100%',
              maxWidth: 640,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--color-ink)' }}>
                  {isRTL ? 'إنشاء حساب مستخدم جديد وتعيين الصلاحيات' : 'Create New User Account & Assign Role'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                  {isRTL
                    ? 'اختر أحد الأدوار الستة المعتمدة. سيتم تطبيق الصلاحيات تلقائياً في Supabase RLS.'
                    : 'Select one of the 6 system roles. Permissions are enforced automatically via Supabase RLS.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                    {isRTL ? 'الاسم الكامل *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={createFullName}
                    onChange={e => setCreateFullName(e.target.value)}
                    placeholder={isRTL ? 'مثال: خالد العتيبي' : 'e.g., Khalid Al-Otaibi'}
                    style={{
                      width: '100%',
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 4,
                      border: '1px solid var(--color-input-border)',
                      background: 'var(--color-page-bg)',
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                    {isRTL ? 'البريد الإلكتروني الرسمي *' : 'Corporate Email *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={e => setCreateEmail(e.target.value)}
                    placeholder="user@alnoortransport.com"
                    style={{
                      width: '100%',
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 4,
                      border: '1px solid var(--color-input-border)',
                      background: 'var(--color-page-bg)',
                      fontSize: 13,
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                    {isRTL ? 'كلمة المرور الأولية (6 أحرف على الأقل) *' : 'Initial Password (min 6 chars) *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={createPassword}
                      onChange={e => setCreatePassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        height: 36,
                        padding: '0 34px 0 10px',
                        borderRadius: 4,
                        border: '1px solid var(--color-input-border)',
                        background: 'var(--color-page-bg)',
                        fontSize: 13,
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(v => !v)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {showCreatePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                    {isRTL ? 'رقم الجوال' : 'Phone / Mobile'}
                  </label>
                  <input
                    type="text"
                    value={createPhone}
                    onChange={e => setCreatePhone(e.target.value)}
                    placeholder="+966 5X XXX XXXX"
                    style={{
                      width: '100%',
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 4,
                      border: '1px solid var(--color-input-border)',
                      background: 'var(--color-page-bg)',
                      fontSize: 13,
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              </div>

              {/* 6-Role Selector Grid */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  {isRTL ? 'تعيين الدور الأمني (اختر واحداً من الأدوار الستة) *' : 'Assign System Role (6 Roles) *'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ALL_SYSTEM_ROLES.map(r => {
                    const meta = ROLE_DEFINITIONS[r];
                    const selected = createRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleSelectForCreate(r)}
                        style={{
                          textAlign: 'start',
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: selected
                            ? '2px solid var(--color-ink)'
                            : '1px solid var(--color-border)',
                          background: selected ? 'var(--color-row-hover)' : 'var(--color-page-bg)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12.5, color: 'var(--color-ink)' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dotColor }} />
                            {isRTL ? meta.labelAr : meta.labelEn}
                          </span>
                          {selected && <Check size={14} style={{ color: 'var(--color-ink)' }} />}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.35 }}>
                          {isRTL ? meta.shortDescAr : meta.shortDescEn}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                    {isRTL ? 'القسم / الإدارة' : 'Department'}
                  </label>
                  <input
                    type="text"
                    list="noor-departments-list"
                    value={createDepartment}
                    onChange={e => setCreateDepartment(e.target.value)}
                    style={{
                      width: '100%',
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 4,
                      border: '1px solid var(--color-input-border)',
                      background: 'var(--color-page-bg)',
                      fontSize: 13,
                    }}
                  />
                  <datalist id="noor-departments-list">
                    {DEFAULT_DEPARTMENTS.map(d => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={createIsActive}
                      onChange={e => setCreateIsActive(e.target.checked)}
                    />
                    <span>{isRTL ? 'الحساب نشط ومفعل للدخول فوراً' : 'Account Active (Allow immediate sign-in)'}</span>
                  </label>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  paddingTop: 12,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <GhostButton type="button" onClick={() => setIsCreateOpen(false)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </GhostButton>
                <PrimaryButton type="submit" disabled={submittingCreate}>
                  {submittingCreate
                    ? isRTL
                      ? 'جاري الإنشاء...'
                      : 'Creating Account...'
                    : isRTL
                    ? 'إنشاء الحساب وتعيين الدور'
                    : 'Create User & Assign Role'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: EDIT USER ROLE, PERMISSIONS & ACCOUNT STATUS
          ===================================================================== */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(17,17,16,0.55)' }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              width: '100%',
              maxWidth: 640,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--color-ink)' }}>
                  {isRTL ? 'تعديل دور وصلاحيات المستخدم' : 'Modify User Role & Permissions'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {editingUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                    {isRTL ? 'الاسم الكامل *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    style={{
                      width: '100%',
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 4,
                      border: '1px solid var(--color-input-border)',
                      background: 'var(--color-page-bg)',
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                    {isRTL ? 'رقم الجوال' : 'Phone / Mobile'}
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    style={{
                      width: '100%',
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 4,
                      border: '1px solid var(--color-input-border)',
                      background: 'var(--color-page-bg)',
                      fontSize: 13,
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              </div>

              {/* 6-Role Selector */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  {isRTL ? 'الدور الأمني ومستوى الصلاحيات *' : 'System Role & Permission Tier *'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ALL_SYSTEM_ROLES.map(r => {
                    const meta = ROLE_DEFINITIONS[r];
                    const selected = editRole === r;
                    const disabledSelfDemote = editingUser.id === currentProfile.id && r !== 'SUPER_ADMIN';
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={disabledSelfDemote}
                        onClick={() => setEditRole(r)}
                        style={{
                          textAlign: 'start',
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: selected
                            ? '2px solid var(--color-ink)'
                            : '1px solid var(--color-border)',
                          background: selected ? 'var(--color-row-hover)' : 'var(--color-page-bg)',
                          cursor: disabledSelfDemote ? 'not-allowed' : 'pointer',
                          opacity: disabledSelfDemote ? 0.45 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12.5, color: 'var(--color-ink)' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dotColor }} />
                            {isRTL ? meta.labelAr : meta.labelEn}
                          </span>
                          {selected && <Check size={14} style={{ color: 'var(--color-ink)' }} />}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.35 }}>
                          {isRTL ? meta.shortDescAr : meta.shortDescEn}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Role Effective Permissions Preview */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 6,
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>
                  {isRTL
                    ? `الصلاحيات الفعلية لدور (${ROLE_DEFINITIONS[editRole].labelAr}):`
                    : `Effective Permissions for ${ROLE_DEFINITIONS[editRole].labelEn}:`}
                </div>
                <ul style={{ margin: 0, paddingInlineStart: 18, color: 'var(--color-text-secondary)' }}>
                  {(isRTL
                    ? ROLE_DEFINITIONS[editRole].permissionsAr
                    : ROLE_DEFINITIONS[editRole].permissionsEn
                  ).map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                    {isRTL ? 'القسم / الإدارة' : 'Department'}
                  </label>
                  <input
                    type="text"
                    list="noor-departments-list"
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                    style={{
                      width: '100%',
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 4,
                      border: '1px solid var(--color-input-border)',
                      background: 'var(--color-page-bg)',
                      fontSize: 13,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      disabled={editingUser.id === currentProfile.id}
                      checked={editIsActive}
                      onChange={e => setEditIsActive(e.target.checked)}
                    />
                    <span>{isRTL ? 'الحساب نشط (مسموح بتسجيل الدخول)' : 'Account Active (Authorized to access system)'}</span>
                  </label>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  paddingTop: 12,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <GhostButton type="button" onClick={() => setEditingUser(null)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </GhostButton>
                <PrimaryButton type="submit" disabled={submittingEdit}>
                  {submittingEdit
                    ? isRTL
                      ? 'جاري الحفظ...'
                      : 'Saving Changes...'
                    : isRTL
                    ? 'حفظ الدور والصلاحيات'
                    : 'Save Role & Permissions'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: RESET USER PASSWORD
          ===================================================================== */}
      {resetTargetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(17,17,16,0.55)' }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              width: '100%',
              maxWidth: 420,
              padding: 24,
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>
              {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset User Password'}
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
              {resetTargetUser.full_name} ({resetTargetUser.email})
            </p>
            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPasswordVal}
                  onChange={e => setNewPasswordVal(e.target.value)}
                  placeholder={isRTL ? 'كلمة المرور الجديدة (6 أحرف على الأقل)' : 'New password (min 6 characters)'}
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '0 34px 0 10px',
                    borderRadius: 4,
                    border: '1px solid var(--color-input-border)',
                    background: 'var(--color-page-bg)',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <GhostButton type="button" onClick={() => setResetTargetUser(null)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </GhostButton>
                <PrimaryButton type="submit" disabled={submittingReset}>
                  {submittingReset
                    ? isRTL
                      ? 'جاري التحديث...'
                      : 'Updating...'
                    : isRTL
                    ? 'تحديث كلمة المرور'
                    : 'Update Password'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: DELETE USER CONFIRMATION
          ===================================================================== */}
      {deleteTargetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(17,17,16,0.55)' }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              width: '100%',
              maxWidth: 420,
              padding: 24,
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: '#991B1B' }}>
              {isRTL ? 'تأكيد حذف حساب المستخدم' : 'Confirm User Deletion'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {isRTL
                ? `هل أنت متأكد من حذف حساب "${deleteTargetUser.full_name}" (${deleteTargetUser.email})؟ يمكنك بدلاً من ذلك تعطيل الحساب مع الاحتفاظ بالسجل.`
                : `Are you sure you want to permanently remove "${deleteTargetUser.full_name}" (${deleteTargetUser.email})? Tip: You can deactivate the account instead to preserve historical links.`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <GhostButton type="button" onClick={() => setDeleteTargetUser(null)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </GhostButton>
              <PrimaryButton
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submittingDelete}
                style={{ background: '#B91C1C', color: '#FFFFFF' }}
              >
                {submittingDelete
                  ? isRTL
                    ? 'جاري الحذف...'
                    : 'Deleting...'
                  : isRTL
                  ? 'حذف الحساب نهائياً'
                  : 'Delete Account'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
