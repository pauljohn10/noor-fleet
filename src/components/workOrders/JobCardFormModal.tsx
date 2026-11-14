import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { WOPriority } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Wrench, AlertTriangle, Loader2, Truck, Calendar, AlertCircle, ShieldCheck } from 'lucide-react';

interface JobCardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JobCardFormModal: React.FC<JobCardFormModalProps> = ({
  isOpen,
  onClose
}) => {
  const { addWorkOrder, vehicles, trailers, drivers, technicians } = useFleet();
  const { currentProfile } = useAuth();

  const [vehicleId, setVehicleId] = useState('');
  const [trailerId, setTrailerId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [priority, setPriority] = useState<WOPriority>('MEDIUM');
  const [assignedTechId, setAssignedTechId] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!vehicleId || !problemDescription.trim()) {
      setErrorMessage('Please select a Target Tractor Truck and describe the reported breakdown problem.');
      return;
    }

    setIsSubmitting(true);

    try {
      addWorkOrder({
        vehicle_id: vehicleId,
        trailer_id: trailerId || undefined,
        driver_id: driverId || undefined,
        reported_by: currentProfile.full_name,
        problem_description: problemDescription.trim(),
        priority,
        workshop_location_id: '10000000-0000-0000-0000-000000000001',
        assigned_supervisor_id: currentProfile.id,
        assigned_technician_id: assignedTechId || undefined,
        estimated_completion: estimatedCompletion ? new Date(estimatedCompletion).toISOString() : undefined,
        status: 'REPORTED'
      });

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while generating work order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalFooter = (
    <>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Job order ID will be auto-generated in <code className="font-mono font-bold text-slate-700">WO-2026-XXXXXX</code> sequence.</span>
      </div>

      <div className="flex items-center justify-end gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition active:scale-95 cursor-pointer shadow-2xs disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="job-card-form"
          disabled={isSubmitting}
          className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Generating Order...</span>
            </>
          ) : (
            <span>Generate Work Order</span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Open Digital Workshop Job Card"
      subtitle="Commission repair work order, assign lead mechanics, and schedule workshop throughput."
      icon={<Wrench className="w-5 h-5 text-amber-600" />}
      footer={modalFooter}
      maxWidth="3xl"
    >
      <form id="job-card-form" onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold text-xs">{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Equipment & Personnel */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">1</span>
              <Truck className="w-4 h-4 text-slate-500" />
              <span>Target Vehicle & Equipment Allocation</span>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
              * Required fields
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Target Tractor Truck <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={vehicleId}
                onChange={e => {
                  setVehicleId(e.target.value);
                  const v = vehicles.find(x => x.id === e.target.value);
                  if (v) {
                    if (v.assigned_trailer_id) setTrailerId(v.assigned_trailer_id);
                    if (v.assigned_driver_id) setDriverId(v.assigned_driver_id);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="">-- Select Tractor Head --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_id} ({v.plate_number}) - Fleet #{v.fleet_number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Coupled Tanker Trailer</label>
              <select
                value={trailerId}
                onChange={e => setTrailerId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="">-- None / Unassigned --</option>
                {trailers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.trailer_id} ({t.plate_number}) - {(t.tank_capacity_liters || 0).toLocaleString()}L
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Reporting Driver</label>
              <select
                value={driverId}
                onChange={e => setDriverId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="">-- Select Driver --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.employee_id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Priority & Mechanic Allocation */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">2</span>
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Priority & Repair Scheduling</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Repair Urgency / Priority <span className="text-rose-500">*</span>
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as WOPriority)}
                className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition ${
                  priority === 'CRITICAL' ? 'text-rose-600 bg-rose-50/50 border-rose-300' :
                  priority === 'HIGH' ? 'text-amber-600' :
                  priority === 'MEDIUM' ? 'text-sky-600' : 'text-slate-700'
                }`}
              >
                <option value="LOW">LOW (Scheduled Routine)</option>
                <option value="MEDIUM">MEDIUM (Standard Maintenance)</option>
                <option value="HIGH">HIGH (Urgent Dispatch Impact)</option>
                <option value="CRITICAL">CRITICAL (Aramco Safety Emergency)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Lead Repair Technician</label>
              <select
                value={assignedTechId}
                onChange={e => setAssignedTechId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="">-- Assign Mechanic Later --</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.specialization})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target Completion Date & Time</label>
              <input
                type="datetime-local"
                value={estimatedCompletion}
                onChange={e => setEstimatedCompletion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Breakdown Symptoms & Description */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">3</span>
              <AlertCircle className="w-4 h-4 text-slate-500" />
              <span>Reported Problem Symptoms & Work Scope</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Breakdown Details / Driver Symptoms <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe symptoms clearly: e.g. Air compressor building pressure slowly, weepage at API discharge valve 3, ABS warning light active on dashboard..."
              value={problemDescription}
              onChange={e => setProblemDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition leading-relaxed resize-none"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
