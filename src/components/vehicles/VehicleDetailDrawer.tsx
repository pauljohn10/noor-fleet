import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { Tabs } from '../common/Tabs';
import { Vehicle, VehicleDocument } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Truck, Wrench, ShieldCheck, FileText, Calendar, Package, DollarSign, User, Edit3, Plus, Clock, AlertTriangle, Eye } from 'lucide-react';
import { DocumentFormModal } from '../documents/DocumentFormModal';

interface VehicleDetailDrawerProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VehicleDetailDrawer: React.FC<VehicleDetailDrawerProps> = ({
  vehicle,
  isOpen,
  onClose
}) => {
  const { drivers, trailers, workOrders, inspections, documents, schedules, parts } = useFleet();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  const [activeTab, setActiveTab] = useState('overview');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<VehicleDocument | null>(null);
  const [isViewOnlyDoc, setIsViewOnlyDoc] = useState(false);

  if (!vehicle) return null;

  const assignedDriver = drivers.find(d => d.id === vehicle.assigned_driver_id);
  const assignedTrailer = trailers.find(t => t.id === vehicle.assigned_trailer_id);
  const vehicleWOs = workOrders.filter(w => w.vehicle_id === vehicle.id);
  const vehicleInspections = inspections.filter(i => i.vehicle_id === vehicle.id);
  const vehicleDocs = documents.filter(d => d.vehicle_id === vehicle.id);
  const vehicleSchedules = schedules.filter(s => s.vehicle_id === vehicle.id);

  const totalMaintCost = vehicleWOs.reduce((acc, w) => acc + (w.total_cost || 0), 0);

  const tabItems = [
    { id: 'overview', label: 'Overview', icon: <Truck className="w-4 h-4" /> },
    { id: 'jobs', label: 'Work Orders', icon: <Wrench className="w-4 h-4" />, badge: vehicleWOs.length },
    { id: 'inspections', label: 'Inspections', icon: <ShieldCheck className="w-4 h-4" />, badge: vehicleInspections.length },
    { id: 'pm', label: 'PM Schedules', icon: <Calendar className="w-4 h-4" />, badge: vehicleSchedules.length },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" />, badge: vehicleDocs.length }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <Badge variant="success">AVAILABLE</Badge>;
      case 'ON_TRIP': return <Badge variant="info">ON TRIP</Badge>;
      case 'IN_WORKSHOP': return <Badge variant="amber">IN WORKSHOP</Badge>;
      case 'OUT_OF_SERVICE': return <Badge variant="danger">OUT OF SERVICE</Badge>;
      default: return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${vehicle.vehicle_id} (${vehicle.plate_number})`}
      subtitle={`Fleet #${vehicle.fleet_number} - ${vehicle.make} ${vehicle.model} (${vehicle.year})`}
      width="3xl"
    >
      <div className="space-y-6 text-xs font-sans">
        {/* Header Summary Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900">{vehicle.vehicle_id}</span>
                {getStatusBadge(vehicle.status)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">VIN: <span className="font-mono text-slate-700 font-semibold">{vehicle.vin}</span></p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Repair Expense</p>
            <p className="text-base font-mono font-black text-amber-700">{(totalMaintCost || 0).toLocaleString()} SAR</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5 text-xs">
            {/* Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Odometer Reading</p>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{(vehicle.current_mileage || 0).toLocaleString()} KM</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Model Year</p>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{vehicle.year}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Department</p>
                <p className="text-slate-800 font-medium text-xs mt-0.5 truncate" title={vehicle.department}>{vehicle.department || 'Operations'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Color / Livery</p>
                <p className="text-slate-800 font-medium text-xs mt-0.5">{vehicle.color}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Current Location</p>
                <p className="text-slate-800 font-medium text-xs mt-0.5">{vehicle.station_location}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Purchase Cost</p>
                <p className="font-mono font-bold text-emerald-700 text-xs mt-0.5">{(vehicle.purchase_cost || 0).toLocaleString()} SAR</p>
              </div>
            </div>

            {/* Assignments Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-amber-600" />
                  <h4 className="font-bold text-slate-900 text-xs">Assigned Driver</h4>
                </div>
                {assignedDriver ? (
                  <div>
                    <p className="font-bold text-slate-900">{assignedDriver.full_name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Emp ID: {assignedDriver.employee_id} | License: {assignedDriver.license_number}</p>
                    <p className="text-[10px] text-amber-800 font-medium mt-1">Phone: {assignedDriver.phone}</p>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No driver assigned to this vehicle.</p>
                )}
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-sky-600" />
                  <h4 className="font-bold text-slate-900 text-xs">Coupled Tanker Trailer</h4>
                </div>
                {assignedTrailer ? (
                  <div>
                    <p className="font-bold text-sky-800">{assignedTrailer.trailer_id} ({assignedTrailer.plate_number})</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{(assignedTrailer.tank_capacity_liters || 0).toLocaleString()} L - {assignedTrailer.number_of_compartments} Compartments</p>
                    <p className="text-[10px] text-slate-600 mt-1">{assignedTrailer.tank_type}</p>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">
                    {vehicle.vehicle_id.startsWith('SV-') || vehicle.vehicle_type === 'SMALL_VEHICLE'
                      ? 'Not applicable for small / service vehicles.'
                      : 'No trailer currently coupled to this tractor head.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Work Orders */}
        {activeTab === 'jobs' && (
          <div className="space-y-3 text-xs">
            {vehicleWOs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">No repair work orders recorded for this truck.</div>
            ) : (
              vehicleWOs.map(wo => (
                <div key={wo.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-800">{wo.work_order_number}</span>
                      <Badge variant={wo.priority === 'CRITICAL' ? 'danger' : 'amber'} size="sm">{wo.priority}</Badge>
                    </div>
                    <p className="text-slate-800 mt-1 font-medium">{wo.problem_description}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Date: {new Date(wo.date_reported).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={wo.status === 'RELEASED' ? 'success' : 'purple'} size="sm">{wo.status}</Badge>
                    <p className="font-mono font-bold text-slate-900 mt-1">{(wo.total_cost || 0).toLocaleString()} SAR</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Inspections */}
        {activeTab === 'inspections' && (
          <div className="space-y-3 text-xs">
            {vehicleInspections.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">No digital inspections submitted yet.</div>
            ) : (
              vehicleInspections.map(i => (
                <div key={i.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="font-mono font-bold text-sky-800">{i.inspection_number}</span>
                    <p className="text-slate-500 text-[10px] mt-0.5">Odometer: {(i.odometer_reading || 0).toLocaleString()} KM</p>
                    <p className="text-slate-500 text-[10px]">{new Date(i.inspection_date).toLocaleString()}</p>
                  </div>
                  <Badge variant={i.overall_status === 'PASS' ? 'success' : 'danger'}>
                    {i.overall_status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Preventive Maintenance */}
        {activeTab === 'pm' && (
          <div className="space-y-3 text-xs">
            {vehicleSchedules.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">No preventive maintenance schedules assigned.</div>
            ) : (
              vehicleSchedules.map(s => (
                <div key={s.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs">
                  <div>
                    <p className="font-bold text-slate-900">{s.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Interval: {s.interval_value} {s.frequency_type}</p>
                    {s.next_due_date && <p className="text-[10px] text-amber-800 mt-0.5">Next Due: {s.next_due_date}</p>}
                  </div>
                  <Badge variant={s.status === 'OVERDUE' ? 'danger' : s.status === 'DUE_SOON' ? 'amber' : 'success'}>
                    {s.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Documents */}
        {activeTab === 'documents' && (
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
              <div>
                <span className="font-bold text-slate-800 text-xs">Compliance & Regulatory Documents</span>
                <p className="text-[11px] text-slate-500">Istimara, Insurance, Aramco Gate Permits, and Testing Certificates</p>
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

            {vehicleDocs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-xl space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">No documents registered for this vehicle.</p>
                <p className="text-[11px] text-slate-500">Register the vehicle Istimara or insurance policy to track expiration alerts.</p>
              </div>
            ) : (
              vehicleDocs.map(d => {
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
        defaultVehicleId={vehicle.id}
      />
    </Drawer>
  );
};
