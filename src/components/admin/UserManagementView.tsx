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
          {isRTL ? 'ط؛ظٹط± ظ…طµط±ط­ ط¨ط§ظ„ظˆطµظˆظ„' : 'Restricted Administrator Area'}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
          {isRTL
            ? 'ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ† ظˆط§ظ„ط£ط¯ظˆط§ط± ظ…طھط§ط­ط© ظپظ‚ط· ظ„ظ…ط¯ظٹط± ط§ظ„ظ†ط¸ط§ظ… ط§ظ„ط¹ط§ظ… (Super Admin).'
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
          ? 'ظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„ ط§ظ„ط§ط³ظ… ط§ظ„ظƒط§ظ…ظ„ ظˆط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظˆظƒظ„ظ…ط© ظ…ط±ظˆط± ظ…ظ† 6 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„.'
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
          ? `طھظ… ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨ ط§ظ„ظ…ط³طھط®ط¯ظ… ${created.full_name} ط¨ط¯ظˆط± ${ROLE_DEFINITIONS[normalizeRole(created.role)].labelAr}`
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
          ? 'ظ„ط§ ظٹظ…ظƒظ†ظƒ طھط®ظپظٹط¶ طµظ„ط§ط­ظٹط© ط­ط³ط§ط¨ظƒ ط§ظ„ط´ط®طµظٹ ظƒظ…ط¯ظٹط± ظ†ط¸ط§ظ… ط¹ط§ظ….'
          : 'Safety Lock: You cannot demote your own Super Admin account.'
      );
      return;
    }

    if (editingUser.id === currentProfile.id && !editIsActive) {
      showBanner(
        'error',
        isRTL
          ? 'ظ„ط§ ظٹظ…ظƒظ†ظƒ طھط¹ط·ظٹظ„ ط­ط³ط§ط¨ظƒ ط§ظ„ط´ط®طµظٹ ط§ظ„ظ†ط´ط·.'
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
          ? `طھظ… طھط­ط¯ظٹط« طµظ„ط§ط­ظٹط§طھ ظˆط¨ظٹط§ظ†ط§طھ ${updated.full_name} ط¨ظ†ط¬ط§ط­.`
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
          ? 'ظ„ط§ ظٹظ…ظƒظ†ظƒ طھط¹ط·ظٹظ„ ط­ط³ط§ط¨ظƒ ط§ظ„ط´ط®طµظٹ ط§ظ„ظ†ط´ط·.'
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
            ? `طھظ… طھظپط¹ظٹظ„ ط­ط³ط§ط¨ ${u.full_name}`
            : `Activated account for ${u.full_name}.`
          : isRTL
          ? `طھظ… طھط¹ط·ظٹظ„ ط­ط³ط§ط¨ ${u.full_name} ظˆط¥ظٹظ‚ط§ظپ ظˆطµظˆظ„ظ‡ ظ„ظ„ظ†ط¸ط§ظ….`
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
          ? `طھظ… طھط­ط¯ظٹط« ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظ„ظ„ظ…ط³طھط®ط¯ظ… ${resetTargetUser.full_name}`
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
        isRTL ? `طھظ… ط­ط°ظپ ط­ط³ط§ط¨ ${deletedName}` : `Deleted user account "${deletedName}".`
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
        title={isRTL ? 'ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ† ظˆط§ظ„طµظ„ط§ط­ظٹط§طھ (RBAC)' : 'Users & Role-Based Access Control (RBAC)'}
        subtitle={
          isRTL
            ? 'ط¥ظ†ط´ط§ط، ط§ظ„ط­ط³ط§ط¨ط§طھطŒ طھط¹ظٹظٹظ† ط§ظ„ط£ط¯ظˆط§ط± ط§ظ„ط³طھط© ط§ظ„ظ…ط¹طھظ…ط¯ط©طŒ طھظپط¹ظٹظ„ ط£ظˆ طھط¹ط·ظٹظ„ ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ†طŒ ظˆط¥ظ†ظپط§ط° ط³ظٹط§ط³ط§طھ ط£ظ…ط§ظ† ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ (Supabase RLS).'
            : 'Provision users, assign the 6 system roles, enforce read-only viewer guards, and manage account activation backed by Supabase Row Level Security.'
        }
        actions={
          <>
            <GhostButton onClick={() => setShowRoleMatrix(v => !v)}>
              <Shield size={14} style={{ marginInlineEnd: 5, display: 'inline' }} />
              {showRoleMatrix
                ? isRTL
                  ? 'ط¥ط®ظپط§ط، ظ…طµظپظˆظپط© ط§ظ„طµظ„ط§ط­ظٹط§طھ'
                  : 'Hide Role Matrix'
                : isRTL
                ? 'ظ…طµظپظˆظپط© ط§ظ„ط£ط¯ظˆط§ط± ظˆط§ظ„طµظ„ط§ط­ظٹط§طھ (6)'
                : 'Role Permissions Matrix (6)'}
            </GhostButton>
            <GhostButton onClick={fetchUsers} disabled={loading}>
              <RefreshCw
                size={14}
                className={loading ? 'animate-spin' : ''}
                style={{ marginInlineEnd: 5, display: 'inline' }}
              />
              {isRTL ? 'طھط­ط¯ظٹط«' : 'Refresh'}
            </GhostButton>
            <PrimaryButton onClick={() => setIsCreateOpen(true)}>
              <UserPlus size={14} style={{ marginInlineEnd: 6, display: 'inline' }} />
              {isRTL ? '+ ط¥ط¶ط§ظپط© ظ…ط³طھط®ط¯ظ… ط¬ط¯ظٹط¯' : '+ Create User Account'}
            </PrimaryButton>
            {isModal && onClose && (
              <GhostButton onClick={onClose}>{isRTL ? 'ط¥ط؛ظ„ط§ظ‚' : 'Close'}</GhostButton>
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
            âœ•
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
            âœ•
          </button>
        </div>
      )}

      {/* 6-Role KPI Strip */}
      <MetricStrip
        items={[
          {
            label: isRTL ? 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط­ط³ط§ط¨ط§طھ' : 'Total Accounts',
            value: users.length,
            subtext: `${activeUsersCount} ${isRTL ? 'ظ†ط´ط·' : 'active'} آ· ${deactivatedUsersCount} ${
              isRTL ? 'ظ…ط¹ط·ظ„' : 'deactivated'
            }`,
          },
          {
            label: isRTL ? 'ظ…ط¯ظٹط± ط§ظ„ظ†ط¸ط§ظ… / ط§ظ„ط£ط³ط·ظˆظ„' : 'Super Admin / Fleet Mgr',
            value: `${roleCounts.SUPER_ADMIN} / ${roleCounts.FLEET_MANAGER}`,
            subtext: isRTL ? 'ط§ظ„ظ‚ظٹط§ط¯ط© ظˆط¥ط¯ط§ط±ط© ط§ظ„ط£ط³ط·ظˆظ„' : 'System & Fleet Leadership',
          },
          {
            label: isRTL ? 'ظ…ط¯ظٹط± ط§ظ„ظˆط±ط´ط© / ظ…ظˆط¸ظپ ط§ظ„ط£ط³ط·ظˆظ„' : 'Workshop Mgr / Fleet Staff',
            value: `${roleCounts.WORKSHOP_MANAGER} / ${roleCounts.FLEET_STAFF}`,
            subtext: isRTL ? 'ط¥ط¯ط§ط±ط© ط§ظ„طµظٹط§ظ†ط© ظˆط¹ظ…ظ„ظٹط§طھ ط§ظ„ط£ط³ط·ظˆظ„' : 'Maintenance & Fleet Ops',
          },
          {
            label: isRTL ? 'ظ…ظˆط¸ظپ ط§ظ„ظˆط±ط´ط© / ظ…ط´ط§ظ‡ط¯ (ظ‚ط±ط§ط،ط© ظپظ‚ط·)' : 'Workshop Staff / Viewer',
            value: `${roleCounts.WORKSHOP_STAFF} / ${roleCounts.VIEWER}`,
            subtext: isRTL ? 'ط§ظ„طھظ†ظپظٹط° ط§ظ„ظپظ†ظٹ ظˆط§ظ„ط¹ط±ط¶ ظپظ‚ط·' : 'Workshop Execution & Read-Only',
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
                  ? 'ظ…طµظپظˆظپط© ط§ظ„طµظ„ط§ط­ظٹط§طھ ظ„ظ„ط£ط¯ظˆط§ط± ط§ظ„ط³طھط© (ظ…ط·ط¨ظ‚ط© ظپظٹ ط§ظ„ظˆط§ط¬ظ‡ط© ظˆظ‚ط§ط¹ط¯ط© ط¨ظٹط§ظ†ط§طھ Supabase RLS)'
                  : '6-Role Security & Permission Matrix (Enforced on Frontend, Backend API & Supabase RLS)'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                {isRTL
                  ? 'ظ„ط§ ظٹظڈط³ظ…ط­ ظ„ظ„ظ…ط³طھط®ط¯ظ…ظٹظ† ط¨طھط±ظ‚ظٹط© طµظ„ط§ط­ظٹط§طھظ‡ظ… ط°ط§طھظٹط§ظ‹. ط¯ظˆط± ط§ظ„ظ…ط´ط§ظ‡ط¯ (Viewer) ظ…ظ‚ظٹط¯ ظ„ظ„ظ‚ط±ط§ط،ط© ظپظ‚ط·.'
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
                        fontSize: 12,
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {r}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
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
                      fontSize: 12.5,
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
            ? 'ط¨ط­ط« ط¨ط§ظ„ط§ط³ظ…طŒ ط§ظ„ط¨ط±ظٹط¯طŒ ط§ظ„ظ‚ط³ظ…طŒ ط£ظˆ ط§ظ„ط¯ظˆط±...'
            : 'Search name, email, department, role...'
        }
        extraFilters={
          <EditorialSelect
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">{isRTL ? 'ط¬ظ…ظٹط¹ ط§ظ„ط­ط§ظ„ط§طھ' : 'All Account Statuses'}</option>
            <option value="ACTIVE">{isRTL ? 'ظ†ط´ط· ظپظ‚ط·' : 'Active Only'}</option>
            <option value="INACTIVE">{isRTL ? 'ظ…ط¹ط·ظ„ ظپظ‚ط·' : 'Deactivated Only'}</option>
          </EditorialSelect>
        }
        tabs={[
          { key: 'ALL', label: isRTL ? 'ط§ظ„ظƒظ„' : 'All Roles', count: users.length },
          {
            key: 'SUPER_ADMIN',
            label: isRTL ? 'ظ…ط¯ظٹط± ط§ظ„ظ†ط¸ط§ظ…' : 'Super Admin',
            count: roleCounts.SUPER_ADMIN,
            stripe: ROLE_DEFINITIONS.SUPER_ADMIN.dotColor,
          },
          {
            key: 'FLEET_MANAGER',
            label: isRTL ? 'ظ…ط¯ظٹط± ط§ظ„ط£ط³ط·ظˆظ„' : 'Fleet Manager',
            count: roleCounts.FLEET_MANAGER,
            stripe: ROLE_DEFINITIONS.FLEET_MANAGER.dotColor,
          },
          {
            key: 'WORKSHOP_MANAGER',
            label: isRTL ? 'ظ…ط¯ظٹط± ط§ظ„ظˆط±ط´ط©' : 'Workshop Manager',
            count: roleCounts.WORKSHOP_MANAGER,
            stripe: ROLE_DEFINITIONS.WORKSHOP_MANAGER.dotColor,
          },
          {
            key: 'FLEET_STAFF',
            label: isRTL ? 'ظ…ظˆط¸ظپ ط§ظ„ط£ط³ط·ظˆظ„' : 'Fleet Staff',
            count: roleCounts.FLEET_STAFF,
            stripe: ROLE_DEFINITIONS.FLEET_STAFF.dotColor,
          },
          {
            key: 'WORKSHOP_STAFF',
            label: isRTL ? 'ظ…ظˆط¸ظپ ط§ظ„ظˆط±ط´ط©' : 'Workshop Staff',
            count: roleCounts.WORKSHOP_STAFF,
            stripe: ROLE_DEFINITIONS.WORKSHOP_STAFF.dotColor,
          },
          {
            key: 'VIEWER',
            label: isRTL ? 'ظ…ط´ط§ظ‡ط¯ (ظ‚ط±ط§ط،ط© ظپظ‚ط·)' : 'Viewer (Read Only)',
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
                  {isRTL ? 'ط§ظ„ظ…ط³طھط®ط¯ظ…' : 'User'}
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {isRTL ? 'ط§ظ„ط¯ظˆط± ط§ظ„ط£ظ…ظ†ظٹ (Role)' : 'Assigned Role'}
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {isRTL ? 'ط§ظ„ظ‚ط³ظ…' : 'Department'}
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {isRTL ? 'ظ…ط³طھظˆظ‰ ط§ظ„ظˆطµظˆظ„' : 'Access Level'}
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {isRTL ? 'ط­ط§ظ„ط© ط§ظ„ط­ط³ط§ط¨' : 'Account Status'}
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
                  {isRTL ? 'ط§ظ„ط¥ط¬ط±ط§ط،ط§طھ' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {isRTL ? 'ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط­ط³ط§ط¨ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ†...' : 'Loading user accounts & permissions...'}
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {isRTL ? 'ظ„ط§ طھظˆط¬ط¯ ط­ط³ط§ط¨ط§طھ ظ…ط·ط§ط¨ظ‚ط© ظ„ظ„ط¨ط­ط«.' : 'No user accounts match the current filters.'}
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
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'var(--color-row-hover)',
                                color: 'var(--color-ink)',
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              {isRTL ? 'ط£ظ†طھ' : 'You'}
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
                          {u.email || 'â€”'}
                          {u.phone ? ` آ· ${u.phone}` : ''}
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
                            {isRTL ? 'ظ‚ط±ط§ط،ط© ظپظ‚ط· (ظ…ظ…ظ†ظˆط¹ ط§ظ„ط¥ط¶ط§ظپط©/ط§ظ„طھط¹ط¯ظٹظ„/ط§ظ„ط±ظپط¹)' : 'Read-Only (No Add/Edit/Delete/Upload)'}
                          </span>
                        ) : normalizedRole === 'SUPER_ADMIN' ? (
                          <span style={{ color: '#9A3412', fontWeight: 500 }}>
                            {isRTL ? 'طµظ„ط§ط­ظٹط§طھ ط§ظ„ظ†ط¸ط§ظ… ط§ظ„ظƒط§ظ…ظ„ط©' : 'Full System & Admin Control'}
                          </span>
                        ) : normalizedRole === 'FLEET_MANAGER' ? (
                          <span>{isRTL ? 'ط¥ط¯ط§ط±ط© ط§ظ„ط£ط³ط·ظˆظ„ ظƒط§ظ…ظ„ط©' : 'Full Fleet Management'}</span>
                        ) : normalizedRole === 'WORKSHOP_MANAGER' ? (
                          <span>{isRTL ? 'ط¥ط¯ط§ط±ط© ط§ظ„ظˆط±ط´ط© ظˆط§ظ„طµظٹط§ظ†ط© ظƒط§ظ…ظ„ط©' : 'Full Workshop & Store Management'}</span>
                        ) : normalizedRole === 'FLEET_STAFF' ? (
                          <span>{isRTL ? 'طھط´ط؛ظٹظ„ ظˆط³ط¬ظ„ط§طھ ط§ظ„ط£ط³ط·ظˆظ„ ط§ظ„ظ…طµط±ط­ط©' : 'Authorized Fleet Operations'}</span>
                        ) : (
                          <span>{isRTL ? 'طھط´ط؛ظٹظ„ ظˆط³ط¬ظ„ط§طھ ط§ظ„ظˆط±ط´ط© ط§ظ„ظ…طµط±ط­ط©' : 'Authorized Workshop Operations'}</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {u.is_active !== false ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#15803D', fontWeight: 500 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#15803D' }} />
                            {isRTL ? 'ظ†ط´ط·' : 'Active'}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#B91C1C', fontWeight: 500 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#B91C1C' }} />
                            {isRTL ? 'ظ…ط¹ط·ظ„' : 'Deactivated'}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'end' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <GhostButton
                            onClick={() => openEditModal(u)}
                            title={isRTL ? 'طھط¹ط¯ظٹظ„ ط§ظ„ط¯ظˆط± ظˆط§ظ„طµظ„ط§ط­ظٹط§طھ' : 'Change Role & Permissions'}
                          >
                            <Edit3 size={13} style={{ marginInlineEnd: 4, display: 'inline' }} />
                            {isRTL ? 'ط§ظ„ط¯ظˆط± / طھط¹ط¯ظٹظ„' : 'Role / Edit'}
                          </GhostButton>

                          <GhostButton
                            onClick={() => {
                              setResetTargetUser(u);
                              setNewPasswordVal('');
                            }}
                            title={isRTL ? 'ط¥ط¹ط§ط¯ط© طھط¹ظٹظٹظ† ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±' : 'Reset Password'}
                          >
                            <KeyRound size={13} />
                          </GhostButton>

                          {!isSelf && (
                            <GhostButton
                              onClick={() => handleToggleActive(u)}
                              title={
                                u.is_active !== false
                                  ? isRTL
                                    ? 'طھط¹ط·ظٹظ„ ط§ظ„ط­ط³ط§ط¨'
                                    : 'Deactivate Account'
                                  : isRTL
                                  ? 'طھظپط¹ظٹظ„ ط§ظ„ط­ط³ط§ط¨'
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
                              title={isRTL ? 'ط­ط°ظپ ط§ظ„ظ…ط³طھط®ط¯ظ…' : 'Delete User'}
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
            summaryText={`${filteredUsers.length} ${isRTL ? 'ظ…ط³طھط®ط¯ظ…' : 'users'}`}
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
                  {isRTL ? 'ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨ ظ…ط³طھط®ط¯ظ… ط¬ط¯ظٹط¯ ظˆطھط¹ظٹظٹظ† ط§ظ„طµظ„ط§ط­ظٹط§طھ' : 'Create New User Account & Assign Role'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                  {isRTL
                    ? 'ط§ط®طھط± ط£ط­ط¯ ط§ظ„ط£ط¯ظˆط§ط± ط§ظ„ط³طھط© ط§ظ„ظ…ط¹طھظ…ط¯ط©. ط³ظٹطھظ… طھط·ط¨ظٹظ‚ ط§ظ„طµظ„ط§ط­ظٹط§طھ طھظ„ظ‚ط§ط¦ظٹط§ظ‹ ظپظٹ Supabase RLS.'
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
                âœ•
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                    {isRTL ? 'ط§ظ„ط§ط³ظ… ط§ظ„ظƒط§ظ…ظ„ *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={createFullName}
                    onChange={e => setCreateFullName(e.target.value)}
                    placeholder={isRTL ? 'ظ…ط«ط§ظ„: ط®ط§ظ„ط¯ ط§ظ„ط¹طھظٹط¨ظٹ' : 'e.g., Khalid Al-Otaibi'}
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
                    {isRTL ? 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط§ظ„ط±ط³ظ…ظٹ *' : 'Corporate Email *'}
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
                    {isRTL ? 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط£ظˆظ„ظٹط© (6 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„) *' : 'Initial Password (min 6 chars) *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={createPassword}
                      onChange={e => setCreatePassword(e.target.value)}
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
                    {isRTL ? 'ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„' : 'Phone / Mobile'}
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
                  {isRTL ? 'طھط¹ظٹظٹظ† ط§ظ„ط¯ظˆط± ط§ظ„ط£ظ…ظ†ظٹ (ط§ط®طھط± ظˆط§ط­ط¯ط§ظ‹ ظ…ظ† ط§ظ„ط£ط¯ظˆط§ط± ط§ظ„ط³طھط©) *' : 'Assign System Role (6 Roles) *'}
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
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.35 }}>
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
                    {isRTL ? 'ط§ظ„ظ‚ط³ظ… / ط§ظ„ط¥ط¯ط§ط±ط©' : 'Department'}
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
                    <span>{isRTL ? 'ط§ظ„ط­ط³ط§ط¨ ظ†ط´ط· ظˆظ…ظپط¹ظ„ ظ„ظ„ط¯ط®ظˆظ„ ظپظˆط±ط§ظ‹' : 'Account Active (Allow immediate sign-in)'}</span>
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
                  {isRTL ? 'ط¥ظ„ط؛ط§ط،' : 'Cancel'}
                </GhostButton>
                <PrimaryButton type="submit" disabled={submittingCreate}>
                  {submittingCreate
                    ? isRTL
                      ? 'ط¬ط§ط±ظٹ ط§ظ„ط¥ظ†ط´ط§ط،...'
                      : 'Creating Account...'
                    : isRTL
                    ? 'ط¥ظ†ط´ط§ط، ط§ظ„ط­ط³ط§ط¨ ظˆطھط¹ظٹظٹظ† ط§ظ„ط¯ظˆط±'
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
                  {isRTL ? 'طھط¹ط¯ظٹظ„ ط¯ظˆط± ظˆطµظ„ط§ط­ظٹط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ…' : 'Modify User Role & Permissions'}
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
                âœ•
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                    {isRTL ? 'ط§ظ„ط§ط³ظ… ط§ظ„ظƒط§ظ…ظ„ *' : 'Full Name *'}
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
                    {isRTL ? 'ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„' : 'Phone / Mobile'}
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
                  {isRTL ? 'ط§ظ„ط¯ظˆط± ط§ظ„ط£ظ…ظ†ظٹ ظˆظ…ط³طھظˆظ‰ ط§ظ„طµظ„ط§ط­ظٹط§طھ *' : 'System Role & Permission Tier *'}
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
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.35 }}>
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
                    ? `ط§ظ„طµظ„ط§ط­ظٹط§طھ ط§ظ„ظپط¹ظ„ظٹط© ظ„ط¯ظˆط± (${ROLE_DEFINITIONS[editRole].labelAr}):`
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
                    {isRTL ? 'ط§ظ„ظ‚ط³ظ… / ط§ظ„ط¥ط¯ط§ط±ط©' : 'Department'}
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
                    <span>{isRTL ? 'ط§ظ„ط­ط³ط§ط¨ ظ†ط´ط· (ظ…ط³ظ…ظˆط­ ط¨طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„)' : 'Account Active (Authorized to access system)'}</span>
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
                  {isRTL ? 'ط¥ظ„ط؛ط§ط،' : 'Cancel'}
                </GhostButton>
                <PrimaryButton type="submit" disabled={submittingEdit}>
                  {submittingEdit
                    ? isRTL
                      ? 'ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸...'
                      : 'Saving Changes...'
                    : isRTL
                    ? 'ط­ظپط¸ ط§ظ„ط¯ظˆط± ظˆط§ظ„طµظ„ط§ط­ظٹط§طھ'
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
              {isRTL ? 'ط¥ط¹ط§ط¯ط© طھط¹ظٹظٹظ† ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±' : 'Reset User Password'}
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
                  placeholder={isRTL ? 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط¬ط¯ظٹط¯ط© (6 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„)' : 'New password (min 6 characters)'}
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
                  {isRTL ? 'ط¥ظ„ط؛ط§ط،' : 'Cancel'}
                </GhostButton>
                <PrimaryButton type="submit" disabled={submittingReset}>
                  {submittingReset
                    ? isRTL
                      ? 'ط¬ط§ط±ظٹ ط§ظ„طھط­ط¯ظٹط«...'
                      : 'Updating...'
                    : isRTL
                    ? 'طھط­ط¯ظٹط« ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±'
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
              {isRTL ? 'طھط£ظƒظٹط¯ ط­ط°ظپ ط­ط³ط§ط¨ ط§ظ„ظ…ط³طھط®ط¯ظ…' : 'Confirm User Deletion'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {isRTL
                ? `ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ ط­ط³ط§ط¨ "${deleteTargetUser.full_name}" (${deleteTargetUser.email})طں ظٹظ…ظƒظ†ظƒ ط¨ط¯ظ„ط§ظ‹ ظ…ظ† ط°ظ„ظƒ طھط¹ط·ظٹظ„ ط§ظ„ط­ط³ط§ط¨ ظ…ط¹ ط§ظ„ط§ط­طھظپط§ط¸ ط¨ط§ظ„ط³ط¬ظ„.`
                : `Are you sure you want to permanently remove "${deleteTargetUser.full_name}" (${deleteTargetUser.email})? Tip: You can deactivate the account instead to preserve historical links.`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <GhostButton type="button" onClick={() => setDeleteTargetUser(null)}>
                {isRTL ? 'ط¥ظ„ط؛ط§ط،' : 'Cancel'}
              </GhostButton>
              <PrimaryButton
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submittingDelete}
                style={{ background: '#B91C1C', color: '#FFFFFF' }}
              >
                {submittingDelete
                  ? isRTL
                    ? 'ط¬ط§ط±ظٹ ط§ظ„ط­ط°ظپ...'
                    : 'Deleting...'
                  : isRTL
                  ? 'ط­ط°ظپ ط§ظ„ط­ط³ط§ط¨ ظ†ظ‡ط§ط¦ظٹط§ظ‹'
                  : 'Delete Account'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
