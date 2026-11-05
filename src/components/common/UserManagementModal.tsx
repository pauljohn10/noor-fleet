import React, { useState } from 'react';
import { Modal } from './Modal';
import { UserRole, Profile } from '../../types';
import { UserCheck, Shield, Plus, CheckCircle2 } from 'lucide-react';
import { Badge } from './Badge';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<Profile[]>([
    { id: 'p1', email: 'admin@alnoortransport.com', full_name: 'Rashid Al-Mansoor', role: 'SUPER_ADMIN', department: 'Executive Management', is_active: true, created_at: '2023-01-01' },
    { id: 'p2', email: 'fleet.manager@alnoortransport.com', full_name: 'Tariq Al-Ghamdi', role: 'FLEET_MANAGER', department: 'Fleet Operations & Workshop', is_active: true, created_at: '2023-02-15' },
    { id: 'p7', email: 'management@alnoortransport.com', full_name: 'Fahad Al-Subaie', role: 'MANAGEMENT', department: 'Operations Audit', is_active: true, created_at: '2023-05-20' }
  ]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('FLEET_MANAGER');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    const newUser: Profile = {
      id: 'p-' + Date.now(),
      email: email.trim(),
      full_name: fullName.trim(),
      role,
      department: 'Fleet & Workshop Operations',
      is_active: true,
      created_at: new Date().toISOString().slice(0, 10)
    };

    setUsers([newUser, ...users]);
    setFullName('');
    setEmail('');
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
        {/* Provision New User Form Card */}
        <form onSubmit={handleAddUser} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-600" />
              Provision New User Account
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Enterprise Access Role Assignment</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Assign System Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
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
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Provision Account</span>
            </button>
          </div>
        </form>

        {/* Existing Users Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Active Authorized User Profiles</span>
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
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </Modal>
  );
};
