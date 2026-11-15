import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { Tabs } from '../common/Tabs';
import { Vehicle, VehicleDocument } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import {
  Truck,
  Wrench,
  ShieldCheck,
  FileText,
  Calendar,
  User,
  Edit3,
  Plus,
  Clock,
  Eye,
} from 'lucide-react';
import { DocumentFormModal } from '../documents/DocumentFormModal';
import {
  EDITORIAL_STATUS,
  PlateChip,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface VehicleDetailDrawerProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VehicleDetailDrawer: React.FC<VehicleDetailDrawerProps> = ({
  vehicle,
  isOpen,
  onClose,
}) => {
  const { drivers, trailers, workOrders, inspections, documents, schedules } = useFleet();
  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();
  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  const [activeTab, setActiveTab] = useState('overview');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<VehicleDocument | null>(null);
  const [isViewOnlyDoc, setIsViewOnlyDoc] = useState(false);

  if (!vehicle) return null;

  const assignedDriver = drivers.find((d) => d.id === vehicle.assigned_driver_id);
  const assignedTrailer = trailers.find((tr) => tr.id === vehicle.assigned_trailer_id);
  const vehicleWOs = workOrders.filter((w) => w.vehicle_id === vehicle.id);
  const vehicleInspections = inspections.filter((i) => i.vehicle_id === vehicle.id);
  const vehicleDocs = documents.filter((d) => d.vehicle_id === vehicle.id);
  const vehicleSchedules = schedules.filter((s) => s.vehicle_id === vehicle.id);

  const totalMaintCost = vehicleWOs.reduce((acc, w) => acc + (w.total_cost || 0), 0);

  const tabItems = [
    { id: 'overview', label: 'Overview', icon: <Truck className="w-4 h-4" /> },
    { id: 'jobs', label: 'Work Orders', icon: <Wrench className="w-4 h-4" />, badge: vehicleWOs.length },
    {
      id: 'inspections',
      label: 'Inspections',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: vehicleInspections.length,
    },
    {
      id: 'pm',
      label: 'PM Schedules',
      icon: <Calendar className="w-4 h-4" />,
      badge: vehicleSchedules.length,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText className="w-4 h-4" />,
      badge: vehicleDocs.length,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge variant="success">AVAILABLE</Badge>;
      case 'ON_TRIP':
        return <Badge variant="info">ON TRIP</Badge>;
      case 'IN_WORKSHOP':
        return <Badge variant="amber">IN WORKSHOP</Badge>;
      case 'OUT_OF_SERVICE':
        return <Badge variant="danger">OUT OF SERVICE</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${vehicle.vehicle_id} (${vehicle.plate_number})`}
      subtitle={`${t('Fleet #')}${vehicle.fleet_number} - ${vehicle.make} ${vehicle.model} (${vehicle.year})`}
      width="3xl"
    >
      <div className="space-y-6 text-xs">
        {/* Header Summary Banner */}
        <div
          className="p-4 flex items-center justify-between gap-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderInlineStart: '3px solid var(--color-brand-accent)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5"
              style={{
                background: 'var(--color-page-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-brand-accent)',
              }}
            >
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-base font-bold"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                  dir="ltr"
                >
                  {vehicle.vehicle_id}
                </span>
                <PlateChip plate={vehicle.plate_number} />
                {getStatusBadge(vehicle.status)}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {t('VIN')}:{' '}
                <span
                  className="font-semibold"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}
                  dir="ltr"
                >
                  {vehicle.vin}
                </span>
              </p>
            </div>
          </div>
          <div className="text-end">
            <p className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              {t('Total Repair Expense')}
            </p>
            <p
              className="text-base font-bold"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
              dir="ltr"
            >
              {(totalMaintCost || 0).toLocaleString()} {t('SAR')}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5 text-xs">
            {/* Specs Grid */}
            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Odometer Reading')}
                </p>
                <p
                  className="font-bold text-sm mt-0.5"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                  dir="ltr"
                >
                  {(vehicle.current_mileage || 0).toLocaleString()} {t('KM')}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Model Year')}
                </p>
                <p
                  className="font-bold text-sm mt-0.5"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                  dir="ltr"
                >
                  {vehicle.year}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Department')}
                </p>
                <p
                  className="font-medium text-xs mt-0.5 truncate"
                  style={{ color: 'var(--color-ink)' }}
                  title={vehicle.department}
                >
                  {vehicle.department || t('Operations')}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Color / Livery')}
                </p>
                <p className="font-medium text-xs mt-0.5" style={{ color: 'var(--color-ink)' }}>
                  {vehicle.color ? t(vehicle.color) : '-'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Current Location')}
                </p>
                <p className="font-medium text-xs mt-0.5" style={{ color: 'var(--color-ink)' }}>
                  {vehicle.station_location}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Purchase Cost')}
                </p>
                <p
                  className="font-bold text-xs mt-0.5"
                  style={{ fontFamily: 'var(--font-mono)', color: EDITORIAL_STATUS.green.text }}
                  dir="ltr"
                >
                  {(vehicle.purchase_cost || 0).toLocaleString()} {t('SAR')}
                </p>
              </div>
            </div>

            {/* Assignments Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className="p-4"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderInlineStart: '3px solid var(--color-brand-accent)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" style={{ color: 'var(--color-brand-accent)' }} />
                  <h4 className="font-semibold text-xs" style={{ color: 'var(--color-ink)' }}>
                    {t('Assigned Driver')}
                  </h4>
                </div>
                {assignedDriver ? (
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                      {assignedDriver.full_name}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {t('Emp ID')}:{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }} dir="ltr">
                        {assignedDriver.employee_id}
                      </span>{' '}
                      | {t('License')}:{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }} dir="ltr">
                        {assignedDriver.license_number}
                      </span>
                    </p>
                    <p
                      className="text-[11px] font-medium mt-1"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t('Phone')}:{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }} dir="ltr">
                        {assignedDriver.phone}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="italic" style={{ color: 'var(--color-text-muted)' }}>
                    {t('No driver assigned to this vehicle.')}
                  </p>
                )}
              </div>

              <div
                className="p-4"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderInlineStart: `3px solid ${EDITORIAL_STATUS.blue.stripe}`,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4" style={{ color: EDITORIAL_STATUS.blue.text }} />
                  <h4 className="font-semibold text-xs" style={{ color: 'var(--color-ink)' }}>
                    {t('Coupled Tanker Trailer')}
                  </h4>
                </div>
                {assignedTrailer ? (
                  <div>
                    <p
                      className="font-semibold"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                      dir="ltr"
                    >
                      {assignedTrailer.trailer_id} ({assignedTrailer.plate_number})
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {(assignedTrailer.tank_capacity_liters || 0).toLocaleString()} {t('L')} -{' '}
                      {assignedTrailer.number_of_compartments} {t('Compartments')}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {t(assignedTrailer.tank_type)}
                    </p>
                  </div>
                ) : (
                  <p className="italic" style={{ color: 'var(--color-text-muted)' }}>
                    {vehicle.vehicle_id.startsWith('SV-') || vehicle.vehicle_type === 'SMALL_VEHICLE'
                      ? t('Not applicable for small / service vehicles.')
                      : t('No trailer currently coupled to this tractor head.')}
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
              <div
                className="p-6 text-center"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {t('No repair work orders recorded for this truck.')}
              </div>
            ) : (
              vehicleWOs.map((wo) => (
                <div
                  key={wo.id}
                  className="p-3.5 flex items-center justify-between gap-3"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderInlineStart: `3px solid ${
                      wo.priority === 'CRITICAL'
                        ? EDITORIAL_STATUS.red.stripe
                        : EDITORIAL_STATUS.amber.stripe
                    }`,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-semibold"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                        dir="ltr"
                      >
                        {wo.work_order_number}
                      </span>
                      <Badge variant={wo.priority === 'CRITICAL' ? 'danger' : 'amber'} size="sm">
                        {wo.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {wo.problem_description}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {t('Date')}:{' '}
                      {new Date(wo.date_reported).toLocaleDateString(
                        isRTL ? 'ar-SA-u-ca-gregory' : 'en-US'
                      )}
                    </p>
                  </div>
                  <div className="text-end shrink-0">
                    <Badge variant={wo.status === 'RELEASED' ? 'success' : 'purple'} size="sm">
                      {wo.status}
                    </Badge>
                    <p
                      className="font-semibold mt-1"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                      dir="ltr"
                    >
                      {(wo.total_cost || 0).toLocaleString()} {t('SAR')}
                    </p>
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
              <div
                className="p-6 text-center"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {t('No digital inspections submitted yet.')}
              </div>
            ) : (
              vehicleInspections.map((i) => (
                <div
                  key={i.id}
                  className="p-3.5 flex items-center justify-between"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderInlineStart: `3px solid ${
                      i.overall_status === 'PASS'
                        ? EDITORIAL_STATUS.green.stripe
                        : EDITORIAL_STATUS.red.stripe
                    }`,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div>
                    <span
                      className="font-semibold"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                      dir="ltr"
                    >
                      {i.inspection_number}
                    </span>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {t('Odometer')}:{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }} dir="ltr">
                        {(i.odometer_reading || 0).toLocaleString()}
                      </span>{' '}
                      {t('KM')}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(i.inspection_date).toLocaleString(
                        isRTL ? 'ar-SA-u-ca-gregory' : 'en-US'
                      )}
                    </p>
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
              <div
                className="p-6 text-center"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {t('No preventive maintenance schedules assigned.')}
              </div>
            ) : (
              vehicleSchedules.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 flex items-center justify-between"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderInlineStart: `3px solid ${
                      s.status === 'OVERDUE'
                        ? EDITORIAL_STATUS.red.stripe
                        : s.status === 'DUE_SOON'
                        ? EDITORIAL_STATUS.amber.stripe
                        : EDITORIAL_STATUS.green.stripe
                    }`,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                      {s.title}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {t('Interval')}: {s.interval_value} {t(s.frequency_type)}
                    </p>
                    {s.next_due_date && (
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('Next Due')}:{' '}
                        <span style={{ fontFamily: 'var(--font-mono)' }} dir="ltr">
                          {s.next_due_date}
                        </span>
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      s.status === 'OVERDUE' ? 'danger' : s.status === 'DUE_SOON' ? 'amber' : 'success'
                    }
                  >
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
            <div
              className="flex items-center justify-between pb-2"
              style={{ borderBottom: '1px solid var(--color-row-divider)' }}
            >
              <div>
                <span className="font-semibold text-xs" style={{ color: 'var(--color-ink)' }}>
                  {t('Compliance & Regulatory Documents')}
                </span>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Istimara, Insurance, Aramco Gate Permits, and Testing Certificates')}
                </p>
              </div>
              {canManage && (
                <PrimaryButton
                  type="button"
                  onClick={() => {
                    setSelectedDocForEdit(null);
                    setIsViewOnlyDoc(false);
                    setIsDocModalOpen(true);
                  }}
                  style={{ height: 32, fontSize: 12 }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('Register Document')}</span>
                </PrimaryButton>
              )}
            </div>

            {vehicleDocs.length === 0 ? (
              <div
                className="p-8 text-center space-y-2"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <FileText className="w-8 h-8 mx-auto opacity-60" />
                <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {t('No documents registered for this vehicle.')}
                </p>
                <p className="text-[11px]">
                  {t('Register the vehicle Istimara or insurance policy to track expiration alerts.')}
                </p>
              </div>
            ) : (
              vehicleDocs.map((d) => {
                const now = new Date();
                const expDate = new Date(d.expiry_date);
                const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = diffDays < 0;
                const isExpiringSoon = !isExpired && diffDays <= 30;
                const docStripe = isExpired
                  ? EDITORIAL_STATUS.red.stripe
                  : isExpiringSoon
                  ? EDITORIAL_STATUS.amber.stripe
                  : EDITORIAL_STATUS.green.stripe;

                return (
                  <div
                    key={d.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderInlineStart: `3px solid ${docStripe}`,
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs" style={{ color: 'var(--color-ink)' }}>
                          {t(d.document_type)}
                        </span>
                        {isExpired ? (
                          <Badge variant="danger">
                            {isRTL
                              ? `منتهي (منذ ${Math.abs(diffDays)} يوم)`
                              : `EXPIRED (${Math.abs(diffDays)}d ago)`}
                          </Badge>
                        ) : isExpiringSoon ? (
                          <Badge variant="amber">
                            {isRTL
                              ? `قريب الانتهاء (متبقي ${diffDays} يوم)`
                              : `EXPIRING SOON (${diffDays}d left)`}
                          </Badge>
                        ) : (
                          <Badge variant="success">
                            {isRTL ? `ساري (متبقي ${diffDays} يوم)` : `VALID (${diffDays}d left)`}
                          </Badge>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-3 text-[11px] flex-wrap"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <span>
                          {t('Doc #')}:{' '}
                          <strong
                            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                            dir="ltr"
                          >
                            {d.document_number}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          {t('Authority')}:{' '}
                          <strong style={{ color: 'var(--color-text-secondary)' }}>
                            {d.issuing_authority || t('N/A')}
                          </strong>
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3 text-[11px] flex-wrap pt-0.5"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {d.issue_date && (
                          <span>
                            {t('Issued')}:{' '}
                            <span style={{ fontFamily: 'var(--font-mono)' }} dir="ltr">
                              {d.issue_date}
                            </span>
                          </span>
                        )}
                        {d.issue_date && <span>•</span>}
                        <span className="font-semibold">
                          {t('Expiry Date')}:{' '}
                          <span
                            className="px-1.5 py-0.5"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              background: 'var(--color-page-bg)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-ink)',
                            }}
                            dir="ltr"
                          >
                            {d.expiry_date}
                          </span>
                        </span>
                      </div>
                      {d.updated_at && (
                        <div
                          className="text-[11px] flex items-center gap-1.5 pt-0.5"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Clock className="w-3 h-3" />
                          <span>
                            {t('Last renewed:')}{' '}
                            {new Date(d.updated_at).toLocaleDateString(
                              isRTL ? 'ar-SA-u-ca-gregory' : 'en-US'
                            )}{' '}
                            {d.updated_by ? `${t('by')} ${d.updated_by}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      {canManage ? (
                        <SecondaryButton
                          type="button"
                          onClick={() => {
                            setSelectedDocForEdit(d);
                            setIsViewOnlyDoc(false);
                            setIsDocModalOpen(true);
                          }}
                          style={{ height: 32, fontSize: 12 }}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{t('Renew / Edit')}</span>
                        </SecondaryButton>
                      ) : (
                        <SecondaryButton
                          type="button"
                          onClick={() => {
                            setSelectedDocForEdit(d);
                            setIsViewOnlyDoc(true);
                            setIsDocModalOpen(true);
                          }}
                          style={{ height: 32, fontSize: 12 }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('View')}</span>
                        </SecondaryButton>
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
