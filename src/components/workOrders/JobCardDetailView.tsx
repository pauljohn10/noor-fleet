import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { Tabs } from '../common/Tabs';
import { WorkOrder, WOStatus } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Wrench, CheckCircle2, AlertTriangle, FileText, Clock, Package, DollarSign, Camera, ShieldCheck, User, Plus, Download, Printer
} from 'lucide-react';
import { exportJobCardPDF } from '../../lib/exportUtils';

interface JobCardDetailViewProps {
  workOrder: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const JobCardDetailView: React.FC<JobCardDetailViewProps> = ({
  workOrder,
  isOpen,
  onClose
}) => {
  const { 
    vehicles, trailers, drivers, technicians, parts,
    updateWorkOrderStatus, addWorkOrderPart, addWorkOrderLabor
  } = useFleet();
  const { currentProfile, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  
  // Local state for part issuance modal inside job card
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);

  // Local state for labor entry
  const [laborHours, setLaborHours] = useState(2);
  const [laborDesc, setLaborDesc] = useState('');

  if (!workOrder) return null;

  const vehicle = vehicles.find(v => v.id === workOrder.vehicle_id);
  const trailer = trailers.find(t => t.id === workOrder.trailer_id);
  const driver = drivers.find(d => d.id === workOrder.driver_id);
  const tech = technicians.find(t => t.id === workOrder.assigned_technician_id);

  const statusWorkflow: WOStatus[] = [
    'REPORTED',
    'INSPECTION',
    'ASSIGNED',
    'IN_PROGRESS',
    'WAITING_FOR_PARTS',
    'WAITING_FOR_APPROVAL',
    'REPAIR_COMPLETED',
    'QC_INSPECTION',
    'COMPLETED',
    'RELEASED'
  ];

  const handleIssuePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartId || partQty < 1) return;
    addWorkOrderPart(workOrder.id, selectedPartId, partQty, currentProfile.full_name);
    setSelectedPartId('');
    setPartQty(1);
  };

  const handleAddLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrder.assigned_technician_id) {
      alert('Please assign a technician to this work order first.');
      return;
    }
    addWorkOrderLabor(workOrder.id, workOrder.assigned_technician_id, laborHours, laborDesc || 'Technician repair labor');
    setLaborDesc('');
  };

  const handleDownloadJobCardPDF = () => {
    exportJobCardPDF(workOrder, vehicle, trailer, driver, tech);
  };

  const tabItems = [
    { id: 'overview', label: 'Overview', icon: <Wrench className="w-4 h-4" /> },
    { id: 'diagnosis', label: 'Diagnosis', icon: <FileText className="w-4 h-4" /> },
    { id: 'repair', label: 'Repair Log', icon: <Wrench className="w-4 h-4" /> },
    { id: 'parts', label: 'Parts Used', icon: <Package className="w-4 h-4" /> },
    { id: 'labor', label: 'Labor Hours', icon: <Clock className="w-4 h-4" /> },
    { id: 'photos', label: 'Photos', icon: <Camera className="w-4 h-4" /> },
    { id: 'qc', label: 'QC & Approval', icon: <ShieldCheck className="w-4 h-4" /> }
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Job Card: ${workOrder.work_order_number}`}
      subtitle={`Vehicle: ${vehicle?.vehicle_id || 'N/A'} (${vehicle?.plate_number || ''}) | Priority: ${workOrder.priority}`}
      width="4xl"
    >
      <div className="space-y-6 text-xs font-sans">
        {/* Banner Summary with PDF Action */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black font-mono text-amber-800">{workOrder.work_order_number}</span>
              <Badge variant={workOrder.priority === 'CRITICAL' ? 'danger' : 'amber'}>{workOrder.priority}</Badge>
              <Badge variant="purple">{workOrder.status.replace(/_/g, ' ')}</Badge>
            </div>
            <p className="text-xs text-slate-700 mt-1 font-medium">{workOrder.problem_description}</p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="text-left sm:text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Total Work Order Cost</p>
              <p className="text-xl font-black font-mono text-emerald-700">{(workOrder.total_cost || 0).toLocaleString()} SAR</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadJobCardPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Official Job Card (PDF)</span>
            </button>
          </div>
        </div>

        {/* Interactive Status Pipeline Stepper */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">Workflow Lifecycle Pipeline</p>
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar py-2 gap-2">
            {statusWorkflow.map((st, idx) => {
              const currentIdx = statusWorkflow.indexOf(workOrder.status);
              const isPassed = idx <= currentIdx;
              const isCurrent = st === workOrder.status;

              return (
                <button
                  key={st}
                  disabled={!hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER'])}
                  onClick={() => updateWorkOrderStatus(workOrder.id, st, `Status changed by ${currentProfile.full_name}`, currentProfile.full_name)}
                  className={`flex flex-col items-center shrink-0 px-1.5 transition ${
                    hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) ? 'cursor-pointer' : 'cursor-default opacity-80'
                  } ${
                    isCurrent ? 'text-amber-800 scale-105' : isPassed ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border ${
                    isCurrent ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs' : isPassed ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="text-[9px] font-bold mt-1 uppercase tracking-tight">{st.replace(/_/g, ' ')}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Assigned Truck</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{vehicle?.vehicle_id} ({vehicle?.plate_number})</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Coupled Trailer</p>
                <p className="font-bold text-sky-800 text-xs mt-0.5">{trailer ? `${trailer.trailer_id} (${trailer.plate_number})` : 'None'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Reporting Driver</p>
                <p className="font-bold text-slate-900 text-xs mt-0.5">{driver?.full_name || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Lead Mechanic</p>
                <p className="font-bold text-amber-800 text-xs mt-0.5">{tech?.full_name || 'Unassigned'}</p>
              </div>
            </div>

            {/* Cost Summary Breakdown */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Maintenance Cost Breakdown Formula
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Parts Cost</p>
                  <p className="font-mono font-bold text-amber-800 text-sm mt-1">{(workOrder.parts_cost || 0).toLocaleString()} SAR</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Labor Cost</p>
                  <p className="font-mono font-bold text-sky-800 text-sm mt-1">{(workOrder.labor_cost || 0).toLocaleString()} SAR</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">External Service</p>
                  <p className="font-mono font-bold text-purple-800 text-sm mt-1">{(workOrder.external_service_cost || 0).toLocaleString()} SAR</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Other Fees</p>
                  <p className="font-mono font-bold text-slate-700 text-sm mt-1">{(workOrder.other_cost || 0).toLocaleString()} SAR</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl">
                  <p className="text-[10px] text-amber-900 uppercase font-bold">TOTAL COST</p>
                  <p className="font-mono font-black text-emerald-700 text-sm mt-1">{(workOrder.total_cost || 0).toLocaleString()} SAR</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Diagnosis */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <h4 className="font-bold text-slate-800 mb-2">Technician Diagnostic Notes</h4>
              <p className="text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {workOrder.diagnosis_notes || 'Diagnosis notes pending completion by lead mechanic.'}
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Repair Log */}
        {activeTab === 'repair' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <h4 className="font-bold text-slate-800 mb-2">Executed Repair Summary</h4>
              <p className="text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {workOrder.repair_summary || 'Repair summary actions log.'}
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Parts Used */}
        {activeTab === 'parts' && (
          <div className="space-y-4 text-xs">
            {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) && (
              <form onSubmit={handleIssuePart} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Issue Spare Part from Store *</label>
                  <select
                    required
                    value={selectedPartId}
                    onChange={e => setSelectedPartId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  >
                    <option value="">-- Select Part to Deduct Stock --</option>
                    {parts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.part_number} - {p.part_name} (Stock: {p.current_stock} | {p.unit_cost} SAR)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={partQty}
                    onChange={e => setPartQty(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Issue Part
                </button>
              </form>
            )}

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <h4 className="font-bold text-slate-800 mb-2">Parts Consumed Summary</h4>
              <p className="text-slate-600">Total Parts Expenses: <span className="font-mono text-amber-800 font-bold">{(workOrder.parts_cost || 0).toLocaleString()} SAR</span></p>
            </div>
          </div>
        )}

        {/* Tab 5: Labor Hours */}
        {activeTab === 'labor' && (
          <div className="space-y-4 text-xs">
            {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) && (
              <form onSubmit={handleAddLabor} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-end gap-3">
                <div className="w-32">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Labor Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={laborHours}
                    onChange={e => setLaborHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Work Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Dismantled air line & replaced API seal kit"
                    value={laborDesc}
                    onChange={e => setLaborDesc(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Log Labor
                </button>
              </form>
            )}

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <p className="text-slate-600">Logged Labor Expenses: <span className="font-mono text-sky-800 font-bold">{(workOrder.labor_cost || 0).toLocaleString()} SAR</span></p>
            </div>
          </div>
        )}

        {/* Tab 6: Photos */}
        {activeTab === 'photos' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
                <Camera className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="font-bold text-slate-800">Before Repair Photo</p>
                <p className="text-[10px] text-slate-500 mt-1">Uploaded upon work order creation</p>
              </div>
              <div className="p-5 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
                <Camera className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-slate-800">After Repair Photo</p>
                <p className="text-[10px] text-slate-500 mt-1">Uploaded upon QC inspection</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: QC */}
        {activeTab === 'qc' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Quality Control & Supervisor Sign-off
                </h4>
                <Badge variant={workOrder.qc_passed ? 'success' : 'amber'}>
                  {workOrder.qc_passed ? 'QC APPROVED' : 'QC PENDING'}
                </Badge>
              </div>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {workOrder.qc_notes || 'All safety torque specifications, pneumatic seals, and fuel leakage checks verified.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
