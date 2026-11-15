import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusTabs,
  EditorialSelect,
  DataTable,
  DataRow,
  RowAction,
  StatusText,
  TableFooter,
  MetricStrip,
  EDITORIAL_STATUS,
} from '../common/EditorialUI';
import { 
  Shield, Users, Plus, Key, Edit, Trash2, Search, 
  CheckCircle2, AlertCircle, Loader2, Building2, Mail, 
  Lock, RefreshCw, X, Eye, EyeOff, UserCheck, UserX,
  Sparkles, Check
} from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { 
  listCorporateUsers, 
  createCorporateUser, 
  updateCorporateUser, 
  toggleUserActive, 
  resetUserPassword, 
  deleteCorporateUser,
  AdminUserRecord 
} from '../../lib/adminUsersApi';

export const UserManagementView: React.FC = () => {
  const { currentProfile } = useAuth();
  const { t, isRTL } = useI18n();

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Notification banners
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);

  // Form states: Create User
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('FLEET_MANAGER');
  const [newDepartment, setNewDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states: Edit User
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('FLEET_MANAGER');
  const [editDepartment, setEditDepartment] = useState('');

  // Form states: Reset Password
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Load live users from server
  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const res = await listCorporateUsers();
    if (res.success && res.users) {
      setUsers(res.users);
    } else {
      setErrorMessage(res.error || t('Failed to load corporate users from database.'));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.department?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.is_active) ||
        (statusFilter === 'INACTIVE' && !u.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Metric stats
  const metrics = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((u) => u.role === 'SUPER_ADMIN').length;
    const fleetManagers = users.filter((u) => u.role === 'FLEET_MANAGER').length;
    const management = users.filter((u) => u.role === 'MANAGEMENT').length;
    const active = users.filter((u) => u.is_active).length;
    const inactive = total - active;
    return { total, superAdmins, fleetManagers, management, active, inactive };
  }, [users]);

  // Generate strong random password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await createCorporateUser({
      fullName: newFullName,
      email: newEmail,
      password: newPassword,
      role: newRole,
      department: newDepartment
    });

    if (res.success) {
      setSuccessMessage(
        isRTL
          ? `تم إنشاء الحساب بنجاح للمستخدم ${newEmail}.`
          : `Account created successfully for ${newEmail}.`
      );
      setIsCreateModalOpen(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewDepartment('');
      setNewRole('FLEET_MANAGER');
      await loadUsers();
    } else {
      setErrorMessage(res.error || t('Failed to create user account.'));
    }
    setIsSubmitting(false);
  };

  // Open Edit Modal
  const openEditModal = (user: AdminUserRecord) => {
    setSelectedUser(user);
    setEditFullName(user.full_name);
    setEditRole(user.role);
    setEditDepartment(user.department || '');
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await updateCorporateUser({
      userId: selectedUser.id,
      fullName: editFullName,
      role: editRole,
      department: editDepartment
    });

    if (res.success) {
      setSuccessMessage(
        isRTL
          ? `تم تحديث ملف المستخدم ${selectedUser.email} بنجاح.`
          : `User profile for ${selectedUser.email} updated successfully.`
      );
      setIsEditModalOpen(false);
      await loadUsers();
    } else {
      setErrorMessage(res.error || t('Failed to update user.'));
    }
    setIsSubmitting(false);
  };

  // Handle Toggle Active/Inactive
  const handleToggleActive = async (user: AdminUserRecord) => {
    if (user.id === currentProfile.id) {
      setErrorMessage(t('Security Alert: You cannot deactivate your own Super Admin account.'));
      return;
    }

    const nextState = !user.is_active;
    const confirmMsg = nextState
      ? (isRTL ? `إعادة تفعيل صلاحية الدخول للمستخدم ${user.email}؟` : `Reactivate login access for ${user.email}?`)
      : (isRTL ? `تعطيل صلاحية الدخول للمستخدم ${user.email}؟ سيتم منع المستخدم من تسجيل الدخول فوراً.` : `Deactivate login access for ${user.email}? The user will immediately be barred from signing in.`);

    if (!window.confirm(confirmMsg)) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await toggleUserActive(user.id, nextState);
    if (res.success) {
      setSuccessMessage(
        isRTL
          ? `حالة حساب ${user.email} الآن: ${nextState ? 'نشط' : 'معطل'}.`
          : `Account for ${user.email} is now ${nextState ? 'ACTIVE' : 'DEACTIVATED'}.`
      );
      await loadUsers();
    } else {
      setErrorMessage(res.error || t('Failed to update account status.'));
    }
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (user: AdminUserRecord) => {
    setSelectedUser(user);
    const initialPass = generateStrongPassword();
    setResetNewPassword(initialPass);
    setResetConfirmPassword(initialPass);
    setIsResetPasswordModalOpen(true);
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage(t('Passwords do not match.'));
      return;
    }
    if (resetNewPassword.length < 8) {
      setErrorMessage(t('Password must be at least 8 characters long.'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await resetUserPassword(selectedUser.id, resetNewPassword);
    if (res.success) {
      setSuccessMessage(
        isRTL
          ? `تم تحديث كلمة المرور بنجاح للمستخدم ${selectedUser.email}.`
          : `Password updated successfully for ${selectedUser.email}.`
      );
      setIsResetPasswordModalOpen(false);
    } else {
      setErrorMessage(res.error || t('Failed to reset password.'));
    }
    setIsSubmitting(false);
  };

  // Open Delete Modal
  const openDeleteModal = (user: AdminUserRecord) => {
    if (user.id === currentProfile.id) {
      setErrorMessage(t('Security Alert: You cannot delete your own Super Admin account.'));
      return;
    }
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await deleteCorporateUser(selectedUser.id);
    if (res.success) {
      setSuccessMessage(
        isRTL
          ? `تم حذف حساب المستخدم ${selectedUser.email} نهائياً.`
          : `User account ${selectedUser.email} deleted permanently.`
      );
      setIsDeleteModalOpen(false);
      await loadUsers();
    } else {
      setErrorMessage(res.error || t('Failed to delete user.'));
    }
    setIsSubmitting(false);
  };

  const getRoleDisplay = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: t('SUPER ADMIN'), stripe: EDITORIAL_STATUS.amber.stripe, color: EDITORIAL_STATUS.amber.text, icon: Shield };
      case 'FLEET_MANAGER':
        return { label: t('FLEET MANAGEMENT'), stripe: EDITORIAL_STATUS.blue.stripe, color: EDITORIAL_STATUS.blue.text, icon: Building2 };
      case 'MANAGEMENT':
      default:
        return { label: t('MANAGEMENT AUDIT'), stripe: '#6D28D9', color: '#5B21B6', icon: Users };
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('Corporate User & Role Management')}
        subtitle={t('Super Admin governance console: provision corporate staff, enforce 3-role RBAC, manage credentials, and audit user logins.')}
        actions={
          <>
            <SecondaryButton onClick={loadUsers} disabled={isLoading}>
              <RefreshCw style={{ width: 14, height: 14 }} className={isLoading ? 'animate-spin' : ''} />
              <span>{t('Refresh')}</span>
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                setNewPassword(generateStrongPassword());
                setIsCreateModalOpen(true);
              }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              <span>{t('Provision New User')}</span>
            </PrimaryButton>
          </>
        }
      />

      {/* Feedback Alerts */}
      {errorMessage && (
        <div
          style={{
            padding: '12px 14px',
            marginBottom: 16,
            borderRadius: 4,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderInlineStart: '3px solid #991B1B',
            color: '#991B1B',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontWeight: 500 }}>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#991B1B', cursor: 'pointer' }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '12px 14px',
            marginBottom: 16,
            borderRadius: 4,
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderInlineStart: '3px solid #16A34A',
            color: '#166534',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontWeight: 500 }}>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer' }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>
      )}

      {/* Editorial Metric Strip */}
      <MetricStrip
        marginBottom={20}
        items={[
          { label: t('Total Accounts'), value: metrics.total, mono: true, onClick: () => { setRoleFilter('ALL'); setStatusFilter('ALL'); } },
          { label: t('Super Admins'), value: metrics.superAdmins, mono: true, stripe: EDITORIAL_STATUS.amber.stripe, valueColor: EDITORIAL_STATUS.amber.text, onClick: () => setRoleFilter('SUPER_ADMIN') },
          { label: t('Fleet Management'), value: metrics.fleetManagers, mono: true, stripe: EDITORIAL_STATUS.blue.stripe, valueColor: EDITORIAL_STATUS.blue.text, onClick: () => setRoleFilter('FLEET_MANAGER') },
          { label: t('Executive Audit'), value: metrics.management, mono: true, stripe: '#6D28D9', valueColor: '#5B21B6', onClick: () => setRoleFilter('MANAGEMENT') },
          { label: t('Active Status'), value: metrics.active, mono: true, stripe: EDITORIAL_STATUS.green.stripe, valueColor: EDITORIAL_STATUS.green.text, onClick: () => setStatusFilter('ACTIVE') },
          { label: t('Deactivated'), value: metrics.inactive, mono: true, stripe: EDITORIAL_STATUS.red.stripe, valueColor: EDITORIAL_STATUS.red.text, onClick: () => setStatusFilter('INACTIVE') },
        ]}
      />

      {/* Tabs + Filters + Search */}
      <StatusTabs
        tabs={[
          { key: 'ALL', label: t('All Roles'), count: metrics.total, stripe: 'var(--color-ink)' },
          { key: 'SUPER_ADMIN', label: t('Super Admins'), count: metrics.superAdmins, stripe: EDITORIAL_STATUS.amber.stripe },
          { key: 'FLEET_MANAGER', label: t('Fleet Management'), count: metrics.fleetManagers, stripe: EDITORIAL_STATUS.blue.stripe },
          { key: 'MANAGEMENT', label: t('Executive Audit'), count: metrics.management, stripe: '#6D28D9' },
        ]}
        activeKey={roleFilter}
        onChange={key => setRoleFilter(key as any)}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('Search by full name, email address, or department...')}
        extraFilters={
          <EditorialSelect
            width={160}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">{t('All Statuses')}</option>
            <option value="ACTIVE">{t('Active Only')}</option>
            <option value="INACTIVE">{t('Deactivated Only')}</option>
          </EditorialSelect>
        }
      />

      {/* Users Table */}
      <DataTable
        columns={[
          { label: t('Employee Name') },
          { label: t('Corporate Email') },
          { label: t('Role Authority') },
          { label: t('Department') },
          { label: t('Account Status') },
          { label: t('Created Date') },
          { label: t('Last Sign-In') },
        ]}
        isEmpty={!isLoading && filteredUsers.length === 0}
        emptyMessage={
          searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
            ? t('No matching user accounts found.')
            : t('Click "Provision New User" above to add your first corporate user.')
        }
        onClearFilters={
          searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
            ? () => {
                setSearchTerm('');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
              }
            : undefined
        }
        clearFiltersLabel={t('Clear filters')}
      >
        {isLoading ? (
          <tr>
            <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Loader2 className="animate-spin" style={{ width: 22, height: 22, color: 'var(--color-brand-accent)' }} />
                <span style={{ fontWeight: 500, fontSize: 13 }}>{t('Querying corporate directory and auth credentials...')}</span>
              </div>
            </td>
          </tr>
        ) : (
          filteredUsers.map(user => {
            const roleMeta = getRoleDisplay(user.role);
            const RoleIcon = roleMeta.icon;
            const stripe = user.is_active ? roleMeta.stripe : EDITORIAL_STATUS.red.stripe;

            return (
              <DataRow
                key={user.id}
                stripeColor={stripe}
                style={!user.is_active ? { opacity: 0.72 } : undefined}
                actions={
                  <>
                    <RowAction
                      icon={<Edit style={{ width: 14, height: 14 }} />}
                      title={t('Edit Profile & Role')}
                      onClick={() => openEditModal(user)}
                    />
                    <RowAction
                      icon={<Key style={{ width: 14, height: 14 }} />}
                      title={t('Reset Password')}
                      onClick={() => openResetPasswordModal(user)}
                    />
                    {user.id !== currentProfile.id && (
                      <RowAction
                        icon={user.is_active ? <UserX style={{ width: 14, height: 14 }} /> : <UserCheck style={{ width: 14, height: 14 }} />}
                        title={user.is_active ? t('Deactivate Account') : t('Reactivate Account')}
                        danger={user.is_active}
                        onClick={() => handleToggleActive(user)}
                      />
                    )}
                    {user.id !== currentProfile.id && (
                      <RowAction
                        icon={<Trash2 style={{ width: 14, height: 14 }} />}
                        title={t('Delete Permanently')}
                        danger
                        onClick={() => openDeleteModal(user)}
                      />
                    )}
                  </>
                }
              >
                <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 4,
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-ink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--color-ink)' }}>{user.full_name}</span>
                      {user.id === currentProfile.id && (
                        <span
                          style={{
                            marginInlineStart: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#0F5C4D',
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {t('YOU')}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail style={{ width: 13, height: 13, color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    <span dir="ltr">{user.email}</span>
                  </div>
                </td>

                <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, color: roleMeta.color }}>
                    <RoleIcon style={{ width: 13, height: 13, flexShrink: 0 }} />
                    <span>{roleMeta.label}</span>
                  </span>
                </td>

                <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 style={{ width: 13, height: 13, color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    <span>{user.department || t('Fleet Operations')}</span>
                  </div>
                </td>

                <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                  <StatusText
                    label={user.is_active ? t('Active') : t('Deactivated')}
                    color={user.is_active ? EDITORIAL_STATUS.green.text : EDITORIAL_STATUS.red.text}
                  />
                </td>

                <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }} dir="ltr">
                  {new Date(user.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US')}
                </td>

                <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {user.last_sign_in_at ? (
                    <span dir="ltr">{new Date(user.last_sign_in_at).toLocaleString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US')}</span>
                  ) : (
                    <span>{t('Never')}</span>
                  )}
                </td>
              </DataRow>
            );
          })
        )}
      </DataTable>

      <TableFooter
        summaryText={`${t('Showing')} ${filteredUsers.length} ${t('of')} ${users.length} ${t('Total Accounts')}`}
      />

      {/* MODAL 1: PROVISION NEW USER */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('Provision New Corporate User')}
        subtitle={t('Create Supabase Auth credentials & assign RBAC role')}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 5 }}>
              {t('Full Legal Name')} <span style={{ color: '#991B1B' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder={t('e.g. Faisal Al-Otaibi')}
              value={newFullName}
              onChange={e => setNewFullName(e.target.value)}
              className="nf-field"
            />
          </div>

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 5 }}>
              {t('Corporate Email Address')} <span style={{ color: '#991B1B' }}>*</span>
            </label>
            <input
              type="email"
              required
              dir="ltr"
              placeholder="e.g. faisal@alnoortransport.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="nf-field"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)' }}>
                {t('Master Password')} <span style={{ color: '#991B1B' }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => setNewPassword(generateStrongPassword())}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 12,
                  color: 'var(--color-brand-accent)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  textDecoration: 'underline',
                }}
              >
                <Sparkles style={{ width: 12, height: 12 }} />
                {t('Generate Strong')}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                dir="ltr"
                minLength={8}
                placeholder={t('Min 8 characters')}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="nf-field"
                style={{ fontFamily: 'var(--font-mono)', paddingInlineEnd: 36 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  insetInlineEnd: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4, marginBottom: 0 }}>
              {t('The password will be activated immediately without requiring email confirmation clicks.')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 5 }}>
                {t('System Role')} <span style={{ color: '#991B1B' }}>*</span>
              </label>
              <EditorialSelect
                width="100%"
                value={newRole}
                onChange={e => setNewRole(e.target.value as UserRole)}
              >
                <option value="SUPER_ADMIN">{t('SUPER ADMIN (Full Access)')}</option>
                <option value="FLEET_MANAGER">{t('FLEET MANAGEMENT (Dispatch & Workshop)')}</option>
                <option value="MANAGEMENT">{t('MANAGEMENT (Audit & Reports)')}</option>
              </EditorialSelect>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 5 }}>
                {t('Department')}
              </label>
              <input
                type="text"
                placeholder={t('e.g. Workshop Operations')}
                value={newDepartment}
                onChange={e => setNewDepartment(e.target.value)}
                className="nf-field"
              />
            </div>
          </div>

          <div style={{ paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <SecondaryButton onClick={() => setIsCreateModalOpen(false)}>
              {t('Cancel')}
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Check style={{ width: 14, height: 14 }} />}
              <span>{isSubmitting ? t('Provisioning...') : t('Provision Account')}</span>
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: EDIT USER & ROLE */}
      {selectedUser && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={t('Edit User Profile & Role')}
          maxWidth="md"
        >
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 5 }}>
                {t('Corporate Email')}
              </label>
              <input
                type="email"
                disabled
                dir="ltr"
                value={selectedUser.email}
                className="nf-field"
                style={{ fontFamily: 'var(--font-mono)', opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 5 }}>
                {t('Full Legal Name')}
              </label>
              <input
                type="text"
                required
                value={editFullName}
                onChange={e => setEditFullName(e.target.value)}
                className="nf-field"
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 5 }}>
                {t('Role Authority')}
              </label>
              <EditorialSelect
                width="100%"
                value={editRole}
                onChange={e => setEditRole(e.target.value as UserRole)}
                disabled={selectedUser.id === currentProfile.id}
              >
                <option value="SUPER_ADMIN">{t('SUPER ADMIN (Full Access)')}</option>
                <option value="FLEET_MANAGER">{t('FLEET MANAGEMENT (Dispatch & Workshop)')}</option>
                <option value="MANAGEMENT">{t('MANAGEMENT (Audit & Reports)')}</option>
              </EditorialSelect>
              {selectedUser.id === currentProfile.id && (
                <p style={{ fontSize: 11.5, color: EDITORIAL_STATUS.amber.text, marginTop: 4, marginBottom: 0 }}>
                  {t('You cannot change your own role to prevent accidental lockout.')}
                </p>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 5 }}>
                {t('Department')}
              </label>
              <input
                type="text"
                value={editDepartment}
                onChange={e => setEditDepartment(e.target.value)}
                className="nf-field"
              />
            </div>

            <div style={{ paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <SecondaryButton onClick={() => setIsEditModalOpen(false)}>
                {t('Cancel')}
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('Saving...') : t('Save Changes')}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: RESET PASSWORD */}
      {selectedUser && (
        <Modal
          isOpen={isResetPasswordModalOpen}
          onClose={() => setIsResetPasswordModalOpen(false)}
          title={t('Reset Password')}
          maxWidth="sm"
        >
          <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 0, marginBottom: 14 }}>
            {isRTL
              ? <>تعيين كلمة مرور رئيسية جديدة للحساب <strong style={{ color: 'var(--color-ink)' }} dir="ltr">{selectedUser.email}</strong>.</>
              : <>Set a new master password for <strong style={{ color: 'var(--color-ink)' }}>{selectedUser.email}</strong>.</>}
          </p>

          <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)' }}>{t('New Password')}</label>
                <button
                  type="button"
                  onClick={() => {
                    const p = generateStrongPassword();
                    setResetNewPassword(p);
                    setResetConfirmPassword(p);
                  }}
                  style={{ background: 'transparent', border: 'none', fontSize: 11.5, color: 'var(--color-brand-accent)', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  {t('Generate Strong')}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  dir="ltr"
                  minLength={8}
                  value={resetNewPassword}
                  onChange={e => setResetNewPassword(e.target.value)}
                  className="nf-field"
                  style={{ fontFamily: 'var(--font-mono)', paddingInlineEnd: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  style={{
                    position: 'absolute',
                    insetInlineEnd: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showResetPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: 5 }}>
                {t('Confirm Password')}
              </label>
              <input
                type={showResetPassword ? 'text' : 'password'}
                required
                dir="ltr"
                value={resetConfirmPassword}
                onChange={e => setResetConfirmPassword(e.target.value)}
                className="nf-field"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div style={{ paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <SecondaryButton onClick={() => setIsResetPasswordModalOpen(false)}>
                {t('Cancel')}
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('Updating...') : t('Set Password')}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {selectedUser && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title={t('Permanently Delete Account?')}
          maxWidth="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                padding: 14,
                borderRadius: 4,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {isRTL
                ? <>هل أنت متأكد من حذف حساب <strong dir="ltr">{selectedUser.email}</strong>؟ سيؤدي ذلك إلى إزالة بيانات الدخول وملفه في قاعدة البيانات نهائياً.</>
                : <>Are you sure you want to delete <strong>{selectedUser.email}</strong>? This will remove both their login credentials and database profile.</>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <SecondaryButton onClick={() => setIsDeleteModalOpen(false)}>
                {t('Cancel')}
              </SecondaryButton>
              <PrimaryButton
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                style={{ background: '#991B1B', borderColor: '#991B1B' }}
              >
                {isSubmitting ? t('Deleting...') : t('Yes, Delete Account')}
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
};

