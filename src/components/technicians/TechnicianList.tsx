import React, { useState } from 'react';
import { Users, Wrench, Clock, CheckCircle2, Star, Plus } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { Badge } from '../common/Badge';

export const TechnicianList: React.FC = () => {
  const { technicians, workOrders } = useFleet();

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" /> Workshop Technicians & Mechanics Roster
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track mechanic specializations, assigned work orders, repair completion rate, and hourly rates.
          </p>
        </div>
      </div>

      {/* Technician Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {technicians.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
            <p className="text-sm font-bold text-slate-300">No technicians registered yet</p>
            <p className="text-xs text-slate-500 mt-1">Workshop technicians will appear here once added in the database.</p>
          </div>
        ) : (
          technicians.map(t => {
            const techWOs = workOrders.filter(w => w.assigned_technician_id === t.id);
            const activeWOs = techWOs.filter(w => w.status !== 'RELEASED' && w.status !== 'CANCELLED');
            const completedWOs = techWOs.filter(w => w.status === 'RELEASED' || w.status === 'COMPLETED');

            return (
              <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-sm">
                      {t.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">{t.full_name}</h3>
                      <p className="text-[10px] text-slate-400 font-mono">Emp ID: {t.employee_id}</p>
                    </div>
                  </div>
                  <Badge variant="success">ACTIVE</Badge>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs space-y-1">
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Specialization</p>
                  <p className="font-bold text-amber-400">{t.specialization}</p>
                  <p className="text-slate-500 text-[10px]">Hourly Billing Rate: {t.hourly_rate} SAR / Hour</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Active Jobs</p>
                    <p className="font-mono font-bold text-sky-400 text-sm mt-0.5">{activeWOs.length}</p>
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Completed</p>
                    <p className="font-mono font-bold text-emerald-400 text-sm mt-0.5">{completedWOs.length}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
