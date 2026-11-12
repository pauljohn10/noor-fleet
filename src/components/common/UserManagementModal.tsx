import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { UserRole, Profile } from '../../types';
import { UserCheck, Shield, Plus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from './Badge';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { currentProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<UserRole>('FLEET_MANAGER');

  // Load live verified user profiles from Supabase
  const loadProfiles = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, department, is_active, created_at')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[Security] Could not load profiles:', error.message);
          setErrorMessage('Could not load user profiles from database. Verify RLS permissions.');
        } else if (data) {
          setUsers(data as Profile[]);
        }
      }
    } catch (err: any) {
      console.error('[Security] Exception loading profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    if (!cleanName || !cleanEmail) return;

    setIsSubmitting(true);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.');
      }

      // Check if email already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existing) {
        throw new Error(`A user profile with email ${cleanEmail} already exists.`);
      }

      // Insert into public.profiles
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          email: cleanEmail,
          full_name: cleanName,
          role: role,
          department: department.trim() || (role === 'SUPER_ADMIN' ? 'Executive Management' : role === 'FLEET_MANAGER' ? 'Fleet Operations' : 'Management & Audit'),
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMessage(`User profile for ${cleanEmail} provisioned successfully with role ${role}.`);
      setFullName('');
      setEmail('');
      setDepartment('');
      await loadProfiles();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to provision user profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeVariant = (userRole: UserRole) => {
    switch (userRole) {
      case 'SUPER_ADMIN': return 'amber';
      case 'FLEET_MANAGER': return 'info';
      case 'MANAGEMENT': return 'purple';
      default: return 'slate';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Accounts & Role Permissions Manager"
      subtitle="Super Admin control panel for provisioning users, managing corporate credentials, and setting system access roles."
      maxWidth="4xl"
    >
      <div className="space-y-6 text-xs font-sans">
        {/* Security Notification Banner */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/90 rounded-xl flex items-start gap-3 text-blue-950">
          <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-extrabold block mb-0.5">Role-Based Access Control (RBAC) Enforcement</span>
            Only authorized personnel may be provisioned into one of the 3 system roles: <strong>SUPER ADMIN</strong> (Full Control), <strong>FLEET MANAGER</strong> (Fleet & Workshop Operations), or <strong>MANAGEMENT</strong> (Executive Audit & Read-Only). Demo accounts and unverified bypasses are strictly disabled.
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Provision New User Form Card */}
        <form onSubmit={handleAddUser} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-600" />
              Provision New User Account
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Enterprise Access Role Assignment</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Faisal Al-Otaibi"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Corporate Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. faisal@alnoortransport.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Department
              </label>
              <input
                type="text"
                placeholder="e.g. Heavy Workshop Operations"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Assign System Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="SUPER_ADMIN">SUPER ADMIN (Full Access)</option>
                <option value="FLEET_MANAGER">FLEET MANAGER (Dispatch & Maintenance)</option>
                <option value="MANAGEMENT">MANAGEMENT EXECUTIVE (Read-Only Audit)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Provisioning Account...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Provision Account</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing Users Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Verified Database User Profiles</span>
            <span className="text-[11px] font-mono text-slate-500">{users.length} accounts configured</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-50/60 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Role Authority</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        <span>Loading verified profiles from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      No active profiles found in database. Provision the first corporate user above.
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id || u.email} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{u.full_name}</td>
                      <td className="p-3 font-mono text-slate-600">{u.email}</td>
                      <td className="p-3">
                        <Badge variant={getRoleBadgeVariant(u.role)}>
                          {u.role.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-600">{u.department}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </Modal>
  );
};
