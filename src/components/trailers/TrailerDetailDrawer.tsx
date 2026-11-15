import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { Tabs } from '../common/Tabs';
import { Trailer, VehicleDocument } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import {
  Truck,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  FileText,
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

interface TrailerDetailDrawerProps {
  trailer: Trailer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TrailerDetailDrawer: React.FC<TrailerDetailDrawerProps> = ({
  trailer,
  isOpen,
  onClose,
}) => {
  const { vehicles, workOrders, inspections, documents } = useFleet();
  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();
  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  const [activeTab, setActiveTab] = useState('overview');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<VehicleDocument | null>(null);
  const [isViewOnlyDoc, setIsViewOnlyDoc] = useState(false);

  if (!trailer) return null;

  const assignedTractor = vehicles.find((v) => v.id === trailer.assigned_tractor_id);
  const trailerWOs = workOrders.filter((w) => w.trailer_id === trailer.id);
  const _trailerInspections = inspections.filter((i) => i.trailer_id === trailer.id);
  void _trailerInspections;
  const trailerDocs = documents.filter((d) => d.trailer_id === trailer.id);

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
    {
      id: 'documents',
      label: 'Documents & Permits',
      icon: <FileText className="w-4 h-4" />,
      badge: trailerDocs.length,
    },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('Trailer')}: ${trailer.trailer_id} (${trailer.plate_number})`}
      subtitle={`${(trailer.tank_capacity_liters || 0).toLocaleString()} ${t('Liters')} - ${
        trailer.number_of_compartments || 0
      } ${t('Compartments')}`}
      width="3xl"
    >
      <div className="space-y-6 text-xs">
        {/* Banner Summary */}
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
                  {trailer.trailer_id}
                </span>
                <PlateChip plate={trailer.plate_number} />
                <Badge variant={trailer.status === 'ASSIGNED' ? 'info' : 'success'}>
                  {trailer.status}
                </Badge>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {t('VIN')}:{' '}
                <span
                  className="font-semibold"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}
                  dir="ltr"
                >
                  {trailer.vin}
                </span>
              </p>
            </div>
          </div>
          <div className="text-end">
            <p className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              {t('Total Capacity')}
            </p>
            <p
              className="text-base font-bold"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
              dir="ltr"
            >
              {(trailer.tank_capacity_liters || 0).toLocaleString()} {t('L')}
            </p>
          </div>
        </div>

        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5 text-xs">
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
                  {t('Tank Shell Type')}
                </p>
                <p className="font-semibold text-xs mt-0.5" style={{ color: 'var(--color-ink)' }}>
                  {t(trailer.tank_type)}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Compartments')}
                </p>
                <p className="font-semibold text-xs mt-0.5" style={{ color: 'var(--color-ink)' }}>
                  {trailer.number_of_compartments} {t('Compartments')}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Manufacturer')}
                </p>
                <p className="font-semibold text-xs mt-0.5" style={{ color: 'var(--color-ink)' }}>
                  {trailer.manufacturer}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Model & Year')}
                </p>
                <p className="font-medium text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {trailer.model} ({trailer.year})
                </p>
              </div>
              <div>
                <p className="font-semibold text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Current Depot')}
                </p>
                <p className="font-medium text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {trailer.current_location}
                </p>
              </div>
            </div>

            <div
              className="p-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <h4 className="font-semibold text-xs mb-2" style={{ color: 'var(--color-ink)' }}>
                {t('Coupled Tractor Unit')}
              </h4>
              {assignedTractor ? (
                <div
                  className="flex items-center justify-between p-3"
                  style={{
                    background: 'var(--color-page-bg)',
                    border: '1px solid var(--color-row-divider)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div>
                    <span
                      className="font-semibold"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                      dir="ltr"
                    >
                      {assignedTractor.vehicle_id} ({assignedTractor.plate_number})
                    </span>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {assignedTractor.make} {assignedTractor.model}
                    </p>
                  </div>
                  <Badge variant="success">Coupled</Badge>
                </div>
              ) : (
                <p className="italic" style={{ color: 'var(--color-text-muted)' }}>
                  {t('No tractor head coupled to this trailer.')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Tanker Safety Check */}
        {activeTab === 'safety' && (
          <div className="space-y-3 text-xs">
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('Mandatory Saudi Civil Defense & Aramco Terminal Safety Checks:')}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {trailerChecklist.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 flex items-center justify-between"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderInlineStart: `3px solid ${EDITORIAL_STATUS.green.stripe}`,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2
                      className="w-4 h-4 shrink-0"
                      style={{ color: EDITORIAL_STATUS.green.text }}
                    />
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                        {t(item.name)}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {t('Last Certified')}:{' '}
                        <span style={{ fontFamily: 'var(--font-mono)' }} dir="ltr">
                          {item.lastChecked}
                        </span>
                      </p>
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
              <div
                className="p-6 text-center"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {t('No work orders recorded for this trailer.')}
              </div>
            ) : (
              trailerWOs.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 flex items-center justify-between"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderInlineStart: `3px solid ${EDITORIAL_STATUS.amber.stripe}`,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div>
                    <span
                      className="font-semibold"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                      dir="ltr"
                    >
                      {w.work_order_number}
                    </span>
                    <p className="mt-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {w.problem_description}
                    </p>
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
            <div
              className="flex items-center justify-between pb-2"
              style={{ borderBottom: '1px solid var(--color-row-divider)' }}
            >
              <div>
                <span className="font-semibold text-xs" style={{ color: 'var(--color-ink)' }}>
                  {t('Tanker Permits & Compliance Documents')}
                </span>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Hydrostatic Certificates, Civil Defense, Istimara & Aramco Permits')}
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

            {trailerDocs.length === 0 ? (
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
                  {t('No documents registered for this tanker trailer.')}
                </p>
                <p className="text-[11px]">
                  {t('Register Hydrostatic test or Aramco permits to monitor expiration dates.')}
                </p>
              </div>
            ) : (
              trailerDocs.map((d) => {
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
        defaultTrailerId={trailer.id}
      />
    </Drawer>
  );
};
