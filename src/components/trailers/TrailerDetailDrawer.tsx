import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { Tabs } from '../common/Tabs';
import { Trailer, VehicleDocument } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Truck, Wrench, ShieldCheck, CheckCircle2, AlertTriangle, FileText, Edit3, Plus, Clock, Eye } from 'lucide-react';
import { DocumentFormModal } from '../documents/DocumentFormModal';

interface TrailerDetailDrawerProps {
  trailer: Trailer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TrailerDetailDrawer: React.FC<TrailerDetailDrawerProps> = ({
  trailer,
  isOpen,
  onClose
}) => {
  const { vehicles, workOrders, inspections, documents } = useFleet();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  const [activeTab, setActiveTab] = useState('overview');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<VehicleDocument | null>(null);
  const [isViewOnlyDoc, setIsViewOnlyDoc] = useState(false);

  if (!trailer) return null;

  const assignedTractor = vehicles.find(v => v.id === trailer.assigned_tractor_id);
  const trailerWOs = workOrders.filter(w => w.trailer_id === trailer.id);
  const trailerInspections = inspections.filter(i => i.trailer_id === trailer.id);
  const trailerDocs = documents.filter(d => d.trailer_id === trailer.id);

  const trailerChecklist = [
    { name: 'Hydrostatic Tank Shell & Baffles', status: 'PASS', lastChecked: '2026-08-20' },
    { name: 'API Bottom Discharge Valves (4-Inch)', status: 'PASS', lastChecked: '2026-09-02' },
    { name: 'Vapor Recovery Line & Pressure Relief Valve', status: 'PASS', lastChecked: '2026-09-02' },
    { name: 'Pneumatic Emergency Foot Valves', status: 'PASS', lastChecked: '2026-09-02' },
    { name: 'Static Grounding Reel & Cable Clamp', status: 'PASS', lastChecked: '2026-09-02' },
    { name: 'Trailer Kingpin & Coupling Mounting', status: 'PASS', lastChecked: '2026-08-15' },
    { name: 'Dual-Line Pneumatic ABS Brake System', status: 'PASS', lastChecked: '2026-08-15' },
    { name: 'Heavy Air Suspension Bellows', status: 'PASS', lastChecked: '2026-08-15' },
    { name: 'Rear LED Hazard & Clearance Lights', status: 'PASS', lastChecked: '2026-09-02' },
    { name: 'Fire Extinguisher Box & Chemical Spill Kit', status: 'PASS', lastChecked: '2026-09-02' },
  ];

  const tabItems = [
    { id: 'overview', label: 'Overview & Specs', icon: <Truck className="w-4 h-4" /> },
    { id: 'safety', label: 'Tanker Safety Check', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'jobs', label: 'Work Orders', icon: <Wrench className="w-4 h-4" />, badge: trailerWOs.length },
    { id: 'documents', label: 'Documents & Permits', icon: <FileText className="w-4 h-4" />, badge: trailerDocs.length }
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Trailer: ${trailer.trailer_id} (${trailer.plate_number})`}
      subtitle={`${(trailer.tank_capacity_liters || 0).toLocaleString()} Liters - ${trailer.number_of_compartments || 0} Compartments`}
      width="3xl"
    >
      <div className="space-y-6 text-xs font-sans">
        {/* Banner Summary */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900">{trailer.trailer_id}</span>
                <Badge variant={trailer.status === 'ASSIGNED' ? 'info' : 'success'}>{trailer.status}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">VIN: <span className="font-mono text-slate-700 font-semibold">{trailer.vin}</span></p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Capacity</p>
            <p className="text-base font-mono font-black text-amber-700">{(trailer.tank_capacity_liters || 0).toLocaleString()} L</p>
          </div>
        </div>

        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Tank Shell Type</p>
                <p className="font-bold text-slate-900 text-xs mt-0.5">{trailer.tank_type}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Compartments</p>
                <p className="font-bold text-slate-900 text-xs mt-0.5">{trailer.number_of_compartments} Compartments</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Manufacturer</p>
                <p className="font-bold text-slate-900 text-xs mt-0.5">{trailer.manufacturer}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Model & Year</p>
                <p className="text-slate-800 font-medium text-xs mt-0.5">{trailer.model} ({trailer.year})</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Current Depot</p>
                <p className="text-slate-800 font-medium text-xs mt-0.5">{trailer.current_location}</p>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <h4 className="font-bold text-slate-800 text-xs mb-2">Coupled Tractor Unit</h4>
              {assignedTractor ? (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <span className="font-bold text-slate-900">{assignedTractor.vehicle_id} ({assignedTractor.plate_number})</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">{assignedTractor.make} {assignedTractor.model}</p>
                  </div>
                  <Badge variant="success">Coupled</Badge>
                </div>
              ) : (
                <p className="text-slate-400 italic">No tractor head coupled to this trailer.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Tanker Safety Check */}
        {activeTab === 'safety' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-500 text-xs mb-2">Mandatory Saudi Civil Defense & Aramco Terminal Safety Checks:</p>
            <div className="grid grid-cols-1 gap-2">
              {trailerChecklist.map((item, idx) => (
                <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-500">Last Certified: {item.lastChecked}</p>
                    </div>
                  </div>
                  <Badge variant="success">{item.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Work Orders */}
        {activeTab === 'jobs' && (
          <div className="space-y-3 text-xs">
            {trailerWOs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
                No work orders recorded for this trailer.
              </div>
            ) : (
              trailerWOs.map(w => (
                <div key={w.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="font-mono font-bold text-amber-800">{w.work_order_number}</span>
                    <p className="text-slate-800 mt-1 font-medium">{w.problem_description}</p>
                  </div>
                  <Badge variant="purple">{w.status}</Badge>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Documents & Permits */}
        {activeTab === 'documents' && (
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
              <div>
                <span className="font-bold text-slate-800 text-xs">Tanker Permits & Compliance Documents</span>
                <p className="text-[11px] text-slate-500">Hydrostatic Certificates, Civil Defense, Istimara & Aramco Permits</p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDocForEdit(null);
                    setIsViewOnlyDoc(false);
                    setIsDocModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition active:scale-95 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Document</span>
                </button>
              )}
            </div>

            {trailerDocs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-xl space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">No documents registered for this tanker trailer.</p>
                <p className="text-[11px] text-slate-500">Register Hydrostatic test or Aramco permits to monitor expiration dates.</p>
              </div>
            ) : (
              trailerDocs.map(d => {
                const now = new Date();
                const expDate = new Date(d.expiry_date);
                const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = diffDays < 0;
                const isExpiringSoon = !isExpired && diffDays <= 30;

                return (
                  <div key={d.id} className="p-4 bg-white border border-slate-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{d.document_type}</span>
                        {isExpired ? (
                          <Badge variant="danger">EXPIRED ({Math.abs(diffDays)}d ago)</Badge>
                        ) : isExpiringSoon ? (
                          <Badge variant="amber">EXPIRING SOON ({diffDays}d left)</Badge>
                        ) : (
                          <Badge variant="success">VALID ({diffDays}d left)</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span>Doc #: <strong className="font-mono text-slate-800">{d.document_number}</strong></span>
                        <span>•</span>
                        <span>Authority: <strong className="text-slate-700">{d.issuing_authority || 'N/A'}</strong></span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap pt-0.5">
                        {d.issue_date && <span>Issued: <span className="font-mono text-slate-700">{d.issue_date}</span></span>}
                        {d.issue_date && <span>•</span>}
                        <span className="font-semibold">Expiry Date: <strong className="font-mono text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{d.expiry_date}</strong></span>
                      </div>
                      {d.updated_at && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Last renewed: {new Date(d.updated_at).toLocaleDateString()} {d.updated_by ? `by ${d.updated_by}` : ''}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocForEdit(d);
                            setIsViewOnlyDoc(false);
                            setIsDocModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition active:scale-95 shadow-xs cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Renew / Edit</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocForEdit(d);
                            setIsViewOnlyDoc(true);
                            setIsDocModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition active:scale-95 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Embedded Document Form / Renewal Modal */}
      <DocumentFormModal
        isOpen={isDocModalOpen}
        onClose={() => {
          setIsDocModalOpen(false);
          setSelectedDocForEdit(null);
        }}
        initialDoc={selectedDocForEdit}
        isReadOnly={isViewOnlyDoc}
        defaultTrailerId={trailer.id}
      />
    </Drawer>
  );
};
