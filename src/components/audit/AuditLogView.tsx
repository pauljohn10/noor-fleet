import React, { useState } from 'react';
import { History, Search, Lock } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useFleet();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');

  if (!hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT'])) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-lg shadow-xs">
        <Lock className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">Only authorized Management and Super Admin roles can inspect system audit logs.</p>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.module.toLowerCase().includes(search.toLowerCase()) ||
    log.record_id.toLowerCase().includes(search.toLowerCase()) ||
    log.user_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" /> System Audit Trail & Security Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log tracking all system data mutations, work order updates, inventory transactions, and vehicle modifications.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-lg shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, user, record ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">User Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Action</th>
                <th className="p-3">Module</th>
                <th className="p-3">Record ID</th>
                <th className="p-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No audit log records found matching search query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono text-slate-500 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-slate-900">{log.user_name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                        {log.user_role}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-700">{log.action}</td>
                    <td className="p-3 font-bold text-slate-700">{log.module}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{log.record_id}</td>
                    <td className="p-3 font-mono text-slate-400 text-[11px]">{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
