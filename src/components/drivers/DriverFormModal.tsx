import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Driver } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { UserCheck, ShieldCheck, AlertTriangle, Loader2, FileText, Phone, Truck } from 'lucide-react';

interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDriver?: Driver;
}

export const DriverFormModal: React.FC<DriverFormModalProps> = ({
  isOpen,
  onClose,
  initialDriver
}) => {
  const { addDriver, updateDriver, vehicles, updateVehicle } = useFleet();

  const [fullName, setFullName] = useState(initialDriver?.full_name || '');
  const [employeeId, setEmployeeId] = useState(initialDriver?.employee_id || `DRV-${Math.floor(100 + Math.random() * 900)}`);
  const [licenseNumber, setLicenseNumber] = useState(initialDriver?.license_number || '');
  const [licenseType, setLicenseType] = useState(initialDriver?.license_type || 'Heavy Transport & Hazmat (Type 1)');
  const [licenseExpiry, setLicenseExpiry] = useState(initialDriver?.license_expiry || new Date(Date.now() + 365*24*3600*1000).toISOString().slice(0, 10));
  const [phone, setPhone] = useState(initialDriver?.phone || '');
  const [status, setStatus] = useState<'ACTIVE' | 'ON_LEAVE' | 'INACTIVE'>(initialDriver?.status || 'ACTIVE');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [notes, setNotes] = useState(initialDriver?.notes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialDriver) {
      setFullName(initialDriver.full_name);
      setEmployeeId(initialDriver.employee_id);
      setLicenseNumber(initialDriver.license_number);
      setLicenseType(initialDriver.license_type);
      setLicenseExpiry(initialDriver.license_expiry);
      setPhone(initialDriver.phone || '');
      setStatus(initialDriver.status);
      const linked = vehicles.find(v => v.assigned_driver_id === initialDriver.id);
      setAssignedVehicleId(linked?.id || '');
      setNotes(initialDriver.notes || '');
    } else {
      setFullName('');
      setEmployeeId(`DRV-${Math.floor(100 + Math.random() * 900)}`);
      setLicenseNumber('');
      setLicenseType('Heavy Transport & Hazmat (Type 1)');
      setLicenseExpiry(new Date(Date.now() + 365*24*3600*1000).toISOString().slice(0, 10));
      setPhone('');
      setStatus('ACTIVE');
      setAssignedVehicleId('');
      setNotes('');
    }
    setErrorMessage(null);
  }, [initialDriver, isOpen, vehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanEmp = employeeId.trim();
    const cleanLic = licenseNumber.trim();

    if (!cleanName || !cleanEmp || !cleanLic) {
      setErrorMessage('Please fill in required fields: Full Name, Employee ID, and License Number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: cleanName,
        employee_id: cleanEmp.toUpperCase(),
        license_number: cleanLic.toUpperCase(),
        license_type: licenseType.trim(),
        license_expiry: licenseExpiry,
        phone: phone.trim() || '+966 50 000 0000',
        status,
        notes: notes.trim() || undefined
      };

      if (initialDriver) {
        await updateDriver(initialDriver.id, payload);
        if (assignedVehicleId) {
          updateVehicle(assignedVehicleId, { assigned_driver_id: initialDriver.id });
        }
      } else {
        addDriver(payload);
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving driver.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalFooter = (
    <>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Saudi ADR Hazmat certified commercial transport operator roster.</span>
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
          form="driver-form"
          disabled={isSubmitting}
          className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Saving Driver...</span>
            </>
          ) : (
            <span>{initialDriver ? 'Save Driver Profile' : 'Register Driver'}</span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialDriver ? `Edit Driver Profile: ${initialDriver.full_name}` : 'Register New Transport Driver'}
      subtitle="Heavy vehicle transport driver profile, hazardous materials certification, and vehicle allocation."
      icon={<UserCheck className="w-5 h-5 text-amber-600" />}
      footer={modalFooter}
      maxWidth="3xl"
    >
      <form id="driver-form" onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold text-xs">{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Personal & Identification */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">1</span>
              <UserCheck className="w-4 h-4 text-slate-500" />
              <span>Driver Personal & Employment Identity</span>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
              * Required fields
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mohammed Tariq Al-Dosari"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Employee ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold uppercase focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Driver Duty Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="ACTIVE">ACTIVE (On Duty)</option>
                <option value="ON_LEAVE">ON LEAVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Driver License & Hazmat Certification */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">2</span>
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Commercial License & Hazmat Certification</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                License Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. DL-SA-90142"
                value={licenseNumber}
                onChange={e => setLicenseNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold uppercase focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">License Category</label>
              <select
                value={licenseType}
                onChange={e => setLicenseType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="Heavy Transport & Hazmat (Type 1)">Heavy Transport & Hazmat (Type 1)</option>
                <option value="Heavy Vehicle Transport (Type 2)">Heavy Vehicle Transport (Type 2)</option>
                <option value="Aramco Hazardous Liquid Certified">Aramco Hazardous Liquid Certified</option>
                <option value="General Commercial">General Commercial</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">License Expiry Date</label>
              <input
                type="date"
                required
                value={licenseExpiry}
                onChange={e => setLicenseExpiry(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Contact & Vehicle Allocation */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">3</span>
              <Phone className="w-4 h-4 text-slate-500" />
              <span>Contact & Tractor Truck Allocation</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone Number</label>
              <input
                type="text"
                placeholder="+966 50 XXX XXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Tractor Truck</label>
              <select
                value={assignedVehicleId}
                onChange={e => setAssignedVehicleId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="">-- Unassigned / Reserve Driver --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_id} ({v.plate_number}) - {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-700 block mb-1">Driver Safety & Route Notes</label>
              <input
                type="text"
                placeholder="e.g. Aramco refinery access badge valid until Dec 2026"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
