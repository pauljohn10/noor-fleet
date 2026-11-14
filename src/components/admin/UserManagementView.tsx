import React, { useState, useEffect, useMemo } from 'react';
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
  const { isRTL } = useI18n();

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
      setErrorMessage(res.error || 'Failed to load corporate users from database.');
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
      setSuccessMessage(`Account created successfully for ${newEmail}.`);
      setIsCreateModalOpen(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewDepartment('');
      setNewRole('FLEET_MANAGER');
      await loadUsers();
    } else {
      setErrorMessage(res.error || 'Failed to create user account.');
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
      setSuccessMessage(`User profile for ${selectedUser.email} updated successfully.`);
      setIsEditModalOpen(false);
      await loadUsers();
    } else {
      setErrorMessage(res.error || 'Failed to update user.');
    }
    setIsSubmitting(false);
  };

  // Handle Toggle Active/Inactive
  const handleToggleActive = async (user: AdminUserRecord) => {
    if (user.id === currentProfile.id) {
      setErrorMessage('Security Alert: You cannot deactivate your own Super Admin account.');
      return;
    }

    const nextState = !user.is_active;
    const confirmMsg = nextState
      ? `Reactivate login access for ${user.email}?`
      : `Deactivate login access for ${user.email}? The user will immediately be barred from signing in.`;

    if (!window.confirm(confirmMsg)) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await toggleUserActive(user.id, nextState);
    if (res.success) {
      setSuccessMessage(`Account for ${user.email} is now ${nextState ? 'ACTIVE' : 'DEACTIVATED'}.`);
      await loadUsers();
    } else {
      setErrorMessage(res.error || 'Failed to update account status.');
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
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (resetNewPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await resetUserPassword(selectedUser.id, resetNewPassword);
    if (res.success) {
      setSuccessMessage(`Password updated successfully for ${selectedUser.email}.`);
      setIsResetPasswordModalOpen(false);
    } else {
      setErrorMessage(res.error || 'Failed to reset password.');
    }
    setIsSubmitting(false);
  };

  // Open Delete Modal
  const openDeleteModal = (user: AdminUserRecord) => {
    if (user.id === currentProfile.id) {
      setErrorMessage('Security Alert: You cannot delete your own Super Admin account.');
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
      setSuccessMessage(`User account ${selectedUser.email} deleted permanently.`);
      setIsDeleteModalOpen(false);
      await loadUsers();
    } else {
      setErrorMessage(res.error || 'Failed to delete user.');
    }
    setIsSubmitting(false);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-900 border border-amber-300">
            <Shield className="w-3 h-3 text-amber-600" />
            SUPER ADMIN
          </span>
        );
      case 'FLEET_MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-500/10 text-blue-900 border border-blue-300">
            <Building2 className="w-3 h-3 text-blue-600" />
            FLEET MANAGEMENT
          </span>
        );
      case 'MANAGEMENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-500/10 text-purple-900 border border-purple-300">
            <Users className="w-3 h-3 text-purple-600" />
            MANAGEMENT AUDIT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs font-sans">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-400/20">
              <Shield className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900">
                Corporate User & Role Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Super Admin governance console: provision corporate staff, enforce 3-role RBAC, manage credentials, and audit user logins.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadUsers}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition active:scale-95 flex items-center gap-1.5"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewPassword(generateStrongPassword());
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Provision New User</span>
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Total Accounts
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
            {metrics.total}
          </span>
        </div>

        <div className="p-4 bg-amber-50/60 border border-amber-200/90 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
            Super Admins
          </span>
          <span className="text-xl font-black text-amber-950 mt-1 block font-mono">
            {metrics.superAdmins}
          </span>
        </div>

        <div className="p-4 bg-blue-50/60 border border-blue-200/90 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 block">
            Fleet Management
          </span>
          <span className="text-xl font-black text-blue-950 mt-1 block font-mono">
            {metrics.fleetManagers}
          </span>
        </div>

        <div className="p-4 bg-purple-50/60 border border-purple-200/90 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 block">
            Executive Audit
          </span>
          <span className="text-xl font-black text-purple-950 mt-1 block font-mono">
            {metrics.management}
          </span>
        </div>

        <div className="p-4 bg-emerald-50/60 border border-emerald-200/90 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
            Active Status
          </span>
          <span className="text-xl font-black text-emerald-950 mt-1 block font-mono">
            {metrics.active}
          </span>
        </div>

        <div className="p-4 bg-rose-50/60 border border-rose-200/90 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 block">
            Deactivated
          </span>
          <span className="text-xl font-black text-rose-950 mt-1 block font-mono">
            {metrics.inactive}
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by full name, email address, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin Only</option>
              <option value="FLEET_MANAGER">Fleet Management Only</option>
              <option value="MANAGEMENT">Management Audit Only</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Corporate Email</th>
                <th className="py-3 px-4">Role Authority</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Last Sign-In</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                      <span className="font-bold">Querying corporate directory and auth credentials...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-sm text-slate-600">No matching user accounts found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                        ? 'Try clearing your search query or filters.'
                        : 'Click "Provision New User" above to add your first corporate user.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`hover:bg-slate-50/80 transition-colors ${!user.is_active ? 'bg-slate-50/50 opacity-70' : ''}`}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                          {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <span>{user.full_name}</span>
                          {user.id === currentProfile.id && (
                            <span className="ml-2 text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getRoleBadge(user.role)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user.department || 'Fleet Operations'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700">
                          <UserX className="w-3.5 h-3.5 text-rose-600" />
                          Deactivated
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {user.last_sign_in_at ? (
                        new Date(user.last_sign_in_at).toLocaleString()
                      ) : (
                        <span className="text-slate-400 italic">Never</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Role / Info */}
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition"
                          title="Edit Profile & Role"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Reset Password */}
                        <button
                          type="button"
                          onClick={() => openResetPasswordModal(user)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Active / Inactive */}
                        {user.id !== currentProfile.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(user)}
                            className={`p-1.5 rounded-lg transition ${
                              user.is_active 
                                ? 'text-slate-600 hover:text-rose-700 hover:bg-rose-50' 
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={user.is_active ? 'Deactivate Account' : 'Reactivate Account'}
                          >
                            {user.is_active ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {/* Delete User */}
                        {user.id !== currentProfile.id && (
                          <button
                            type="button"
                            onClick={() => openDeleteModal(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: PROVISION NEW USER                              */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Provision New Corporate User</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Create Supabase Auth credentials & assign RBAC role</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Faisal Al-Otaibi"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Corporate Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. faisal@alnoortransport.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Master Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateStrongPassword())}
                    className="text-[11px] text-amber-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate Strong
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 pr-10 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  The password will be activated immediately without requiring email confirmation clicks.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    System Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="SUPER_ADMIN">SUPER ADMIN (Full Access)</option>
                    <option value="FLEET_MANAGER">FLEET MANAGEMENT (Dispatch & Workshop)</option>
                    <option value="MANAGEMENT">MANAGEMENT (Audit & Reports)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Workshop Operations"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Provision Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT USER & ROLE                                */}
      {/* ======================================================== */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Edit User Profile & Role</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Corporate Email</label>
                <input
                  type="email"
                  disabled
                  value={selectedUser.email}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Role Authority</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={selectedUser.id === currentProfile.id}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="SUPER_ADMIN">SUPER ADMIN (Full Access)</option>
                  <option value="FLEET_MANAGER">FLEET MANAGEMENT (Dispatch & Workshop)</option>
                  <option value="MANAGEMENT">MANAGEMENT (Audit & Reports)</option>
                </select>
                {selectedUser.id === currentProfile.id && (
                  <p className="text-[10px] text-amber-700 mt-1 font-semibold">
                    You cannot change your own role to prevent accidental lockout.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: RESET PASSWORD                                  */}
      {/* ======================================================== */}
      {isResetPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Reset Password</h3>
              <button
                type="button"
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Set a new master password for <strong className="text-slate-800">{selectedUser.email}</strong>.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="mt-4 space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">New Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const p = generateStrongPassword();
                      setResetNewPassword(p);
                      setResetConfirmPassword(p);
                    }}
                    className="text-[10px] text-amber-700 font-bold hover:underline"
                  >
                    Generate Strong
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 pr-10 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Confirm Password</label>
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: DELETE CONFIRMATION                             */}
      {/* ======================================================== */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Permanently Delete Account?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-800">{selectedUser.email}</strong>? This will remove both their login credentials and database profile.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
