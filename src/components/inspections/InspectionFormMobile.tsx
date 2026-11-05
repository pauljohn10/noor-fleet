import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Camera, Check, Flame
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { InspectionResult, SeverityLevel } from '../../types';

interface InspectionFormMobileProps {
  onComplete: () => void;
}

interface ChecklistItemState {
  category: string;
  name: string;
  result: InspectionResult;
  severity: SeverityLevel;
  comment: string;
}

export const InspectionFormMobile: React.FC<InspectionFormMobileProps> = ({ onComplete }) => {
  const { vehicles, trailers, submitInspection } = useFleet();
  const { currentProfile } = useAuth();

  const [vehicleId, setVehicleId] = useState('');
  const [trailerId, setTrailerId] = useState('');
  const [odometer, setOdometer] = useState(142500);

  const initialItems: ChecklistItemState[] = [
    { category: 'ENGINE', name: 'Engine Oil & Belt Tension', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'BRAKES', name: 'Dual-Line Air Brakes & ABS Light', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'TIRES', name: 'Tire Tread Depth & Pressure', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'LIGHTS', name: 'Headlights, Turn Signals & Brake LED', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'BATTERY', name: 'Battery Terminals & Hold-Down', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'SUSPENSION', name: 'Air Springs & Leaf Spring Bushings', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'STEERING', name: 'Steering Linkage & Hydraulic Fluid', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'FUEL SYSTEM', name: 'Tractor Fuel Tank & Filters', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'TANKER', name: 'Tank Shell Integrity & Baffles', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'HOSES', name: 'Fuel Vapor & Discharge Hoses', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'VALVES', name: '4-Inch API Bottom Discharge Valves', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'COUPLING', name: 'Fifth Wheel Kingpin & Safety Latch', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'SAFETY EQUIPMENT', name: 'ATEX Grounding Reel & Clamp', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'FIRE EXTINGUISHER', name: 'Fire Extinguisher Charge & Tag', result: 'PASS', severity: 'LOW', comment: '' },
    { category: 'GENERAL CONDITION', name: 'Overall Cabin & Safety Reflectors', result: 'PASS', severity: 'LOW', comment: '' }
  ];

  const [items, setItems] = useState<ChecklistItemState[]>(initialItems);

  const handleResultChange = (index: number, result: InspectionResult) => {
    const updated = [...items];
    updated[index].result = result;
    setItems(updated);
  };

  const handleSeverityChange = (index: number, severity: SeverityLevel) => {
    const updated = [...items];
    updated[index].severity = severity;
    setItems(updated);
  };

  const handleCommentChange = (index: number, comment: string) => {
    const updated = [...items];
    updated[index].comment = comment;
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      alert('Please select the Tractor Head Truck');
      return;
    }

    const hasFailed = items.some(i => i.result === 'FAIL');
    const hasCritical = items.some(i => i.result === 'FAIL' && i.severity === 'CRITICAL');

    submitInspection({
      vehicle_id: vehicleId,
      trailer_id: trailerId || undefined,
      driver_id: currentProfile.id,
      odometer_reading: odometer,
      inspection_date: new Date().toISOString(),
      overall_status: hasFailed ? 'FAIL' : 'PASS',
      has_critical_failure: hasCritical,
      supervisor_approved: false,
      items: items.map(i => ({
        id: 'ii-' + Math.random(),
        category: i.category,
        item_name: i.name,
        result: i.result,
        severity: i.severity,
        comment: i.comment
      }))
    });

    if (hasCritical) {
      alert('CRITICAL FAILURE DETECTED! A high-priority Workshop Work Order has been generated automatically.');
    } else {
      alert('Vehicle inspection submitted successfully!');
    }

    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 font-sans">
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-amber-500/15 text-amber-600 rounded-xl border border-amber-500/20 shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Safety & Hazmat Pre-Trip Checklist</h2>
          <p className="text-xs text-slate-500 mt-0.5">Verify all tractor and fuel tanker components prior to depot dispatch.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Header Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/70 border border-slate-200 p-4 rounded-xl">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Select Truck <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
            >
              <option value="">-- Select Tractor Head --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.vehicle_id} ({v.plate_number})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Tanker Trailer</label>
            <select
              value={trailerId}
              onChange={e => setTrailerId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
            >
              <option value="">-- Uncoupled / None --</option>
              {trailers.map(t => (
                <option key={t.id} value={t.id}>{t.trailer_id} ({t.plate_number})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Current Odometer (KM)</label>
            <input
              type="number"
              value={odometer}
              onChange={e => setOdometer(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
            />
          </div>
        </div>

        {/* Inspection Items List */}
        <div className="space-y-2.5">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition ${
                item.result === 'FAIL'
                  ? item.severity === 'CRITICAL'
                    ? 'bg-rose-50/70 border-rose-300'
                    : 'bg-amber-50/70 border-amber-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{item.category}</span>
                  <h4 className="font-bold text-slate-900 text-xs mt-0.5">{item.name}</h4>
                </div>

                {/* Radio Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleResultChange(idx, 'PASS')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                      item.result === 'PASS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    PASS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResultChange(idx, 'FAIL')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                      item.result === 'FAIL' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    FAIL
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResultChange(idx, 'NA')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                      item.result === 'NA' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    N/A
                  </button>
                </div>
              </div>

              {/* If FAIL: Require Severity & Comment */}
              {item.result === 'FAIL' && (
                <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-rose-700 block mb-1.5">
                      Defect Severity Level <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as SeverityLevel[]).map(sev => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => handleSeverityChange(idx, sev)}
                          className={`py-1.5 font-extrabold text-[11px] rounded-lg border transition cursor-pointer ${
                            item.severity === sev
                              ? sev === 'CRITICAL'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Defect Description / Remark <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={item.result === 'FAIL'}
                      placeholder="Specify defect reason (e.g., API seal leak, low air pressure)..."
                      value={item.comment}
                      onChange={e => handleCommentChange(idx, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onComplete}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            Submit Digital Inspection Report
          </button>
        </div>
      </form>
    </div>
  );
};
