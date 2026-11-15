import React, { useState } from 'react';
import {
  Truck,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Bell,
  AlertOctagon,
  Clock,
  Wrench,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { InspectionFormMobile } from '../inspections/InspectionFormMobile';
import { DefectReportCategory, SeverityLevel } from '../../types';
import {
  EDITORIAL_STATUS,
  PageContainer,
  PageHeader,
  EditorialSection,
  DataTable,
  DataRow,
  PlateChip,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface DriverDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onNavigateTab }) => {
  const { vehicles, trailers, drivers, defectReports, submitDefectReport } = useFleet();
  const { currentProfile } = useAuth();
  const { isRTL, t } = useI18n();

  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showCriticalConfirm, setShowCriticalConfirm] = useState(false);

  // Form State
  const [category, setCategory] = useState<DefectReportCategory>('Brakes');
  const [severity, setSeverity] = useState<SeverityLevel>('MEDIUM');
  const [description, setDescription] = useState('');

  // Real vehicle resolution based on authenticated profile
  const matchedDriver = drivers.find(
    (d) =>
      (currentProfile?.id && d.profile_id === currentProfile.id) ||
      (currentProfile?.full_name && d.full_name.toLowerCase() === currentProfile.full_name.toLowerCase())
  );

  const myAssignedTractor =
    vehicles.find((v) => (matchedDriver ? v.assigned_driver_id === matchedDriver.id : false)) || vehicles[0];

  const myAssignedTrailer =
    trailers.find((tr) =>
      myAssignedTractor
        ? tr.id === myAssignedTractor.assigned_trailer_id || tr.assigned_tractor_id === myAssignedTractor.id
        : false
    ) || trailers[0];

  // Isolated Defect Reports for active driver
  const myReports = defectReports.filter(
    (r) =>
      (matchedDriver && r.driver_id === matchedDriver.id) ||
      (currentProfile?.full_name && r.driver_name.toLowerCase() === currentProfile.full_name.toLowerCase())
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    if (severity === 'CRITICAL') {
      setShowCriticalConfirm(true);
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = () => {
    if (!myAssignedTractor) return;

    submitDefectReport({
      driver_id: matchedDriver?.id || undefined,
      driver_name: currentProfile.full_name,
      vehicle_id: myAssignedTractor.vehicle_id,
      trailer_id: myAssignedTrailer?.trailer_id,
      category,
      severity,
      description,
      status: 'REPORTED',
    });

    setDescription('');
    setIsReportOpen(false);
    setShowCriticalConfirm(false);
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <Badge variant="danger" size="sm">
            {t('CRITICAL', 'CRITICAL')}
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge variant="amber" size="sm">
            {t('HIGH', 'HIGH')}
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge variant="info" size="sm">
            {t('MEDIUM', 'MEDIUM')}
          </Badge>
        );
      case 'LOW':
        return (
          <Badge variant="slate" size="sm">
            {t('LOW', 'LOW')}
          </Badge>
        );
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'REPORTED':
        return (
          <Badge variant="amber" size="sm">
            {t('REPORTED', 'REPORTED')}
          </Badge>
        );
      case 'UNDER_REVIEW':
        return (
          <Badge variant="purple" size="sm">
            {t('UNDER_REVIEW', 'UNDER REVIEW')}
          </Badge>
        );
      case 'WORK_ORDER_CREATED':
        return (
          <Badge variant="info" size="sm">
            {isRTL ? 'طھظ… ط¥ظ†ط´ط§ط، ط£ظ…ط± ط¹ظ…ظ„' : 'Work order created'}
          </Badge>
        );
      case 'RESOLVED':
        return (
          <Badge variant="success" size="sm">
            {t('RESOLVED', 'RESOLVED')}
          </Badge>
        );
      default:
        return (
          <Badge variant="slate" size="sm">
            {t(st, st)}
          </Badge>
        );
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={isRTL ? `ظ…ط±ط­ط¨ط§ظ‹طŒ ${currentProfile.full_name}` : `Welcome, ${currentProfile.full_name}`}
        subtitle={
          isRTL
            ? 'ط¨ظˆط§ط¨ط© ط§ظ„ط³ط§ط¦ظ‚ ط§ظ„ظ…ظˆط«ظ‚ط© â€” ظ†ط§ظ‚ظ„ ظ…ظˆط§ط¯ ط¨طھط±ظˆظ„ظٹط© ظ…ط¹طھظ…ط¯ ظ„ط¯ظ‰ ط£ط±ط§ظ…ظƒظˆ'
            : 'Authenticated Driver Portal â€” Aramco Certified Hazardous Materials Transporter'
        }
        badge={
          <Badge variant="success" size="sm">
            {isRTL ? 'ط¨ظˆط§ط¨ط© ط§ظ„ط³ط§ط¦ظ‚' : 'Driver portal'}
          </Badge>
        }
      />

      {/* MY ASSIGNED VEHICLE CARD (STRICT 1:1 BINDING - NO DROPDOWN - NO FINANCIAL DATA) */}
      <EditorialSection
        title={isRTL ? 'ط§ظ„ط´ط§ط­ظ†ط© ظˆط§ظ„ظ…ظ‚ط·ظˆط±ط© ط§ظ„ظ…ط®طµطµط© ظ„ظٹ' : 'My assigned tractor & coupled trailer'}
        action={
          <Badge
            variant={
              myAssignedTractor?.status === 'AVAILABLE'
                ? 'success'
                : myAssignedTractor?.status === 'REQUIRES INSPECTION'
                  ? 'amber'
                  : 'danger'
            }
          >
            {myAssignedTractor?.status || 'AVAILABLE'}
          </Badge>
        }
        marginTop={0}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Tractor details */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderInlineStart: '3px solid var(--color-brand-accent)',
              borderRadius: 'var(--radius-sm)',
              padding: 16,
            }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {isRTL ? 'ط±ط£ط³ ط§ظ„ط´ط§ط­ظ†ط© ط§ظ„ظ…ط®طµطµط©' : 'Assigned tractor head'}
              </span>
              <Truck className="w-4 h-4" style={{ color: 'var(--color-brand-accent)' }} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--color-ink)',
                }}
              >
                {myAssignedTractor?.vehicle_id}
              </span>
              {myAssignedTractor?.plate_number && (
                <PlateChip plate={myAssignedTractor.plate_number} />
              )}
            </div>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {myAssignedTractor?.make} {myAssignedTractor?.model} ({myAssignedTractor?.year})
            </p>
            <div
              className="pt-2 flex items-center justify-between text-[12px]"
              style={{ borderTop: '1px solid var(--color-row-divider)' }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'ط§ظ„ط¹ط¯ط§ط¯:' : 'Odometer:'}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                }}
              >
                {(myAssignedTractor?.current_mileage || 0).toLocaleString()} {isRTL ? 'ظƒظ…' : 'KM'}
              </span>
            </div>
          </div>

          {/* Coupled Trailer details */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderInlineStart: `3px solid ${EDITORIAL_STATUS.blue.stripe}`,
              borderRadius: 'var(--radius-sm)',
              padding: 16,
            }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {isRTL ? 'ظ…ظ‚ط·ظˆط±ط© ط§ظ„طµظ‡ط±ظٹط¬ ط§ظ„ظ…ط±طھط¨ط·ط©' : 'Coupled tanker trailer'}
              </span>
              <Truck className="w-4 h-4" style={{ color: EDITORIAL_STATUS.blue.text }} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--color-ink)',
                }}
              >
                {myAssignedTrailer?.trailer_id}
              </span>
              {myAssignedTrailer?.plate_number && (
                <PlateChip
                  plate={myAssignedTrailer.plate_number}
                  accentColor={EDITORIAL_STATUS.blue.stripe}
                />
              )}
            </div>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {(myAssignedTrailer?.tank_capacity_liters || 0).toLocaleString()} {isRTL ? 'ظ„طھط±' : 'Liters'} (
              {myAssignedTrailer?.number_of_compartments || 0} {isRTL ? 'ط®ط²ط§ظ†ط§طھ' : 'Compartments'})
            </p>
            <div
              className="pt-2 flex items-center justify-between text-[12px]"
              style={{ borderTop: '1px solid var(--color-row-divider)' }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'ط§ظ„ظ…ظˆط§طµظپط§طھ:' : 'Specification:'}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                {myAssignedTrailer?.tank_type}
              </span>
            </div>
          </div>
        </div>
      </EditorialSection>

      {/* PRIMARY ACTION BUTTONS (MOBILE FIRST BIG TOUCH TARGETS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
        <button
          onClick={() => setIsInspectionOpen(true)}
          style={{
            background: 'var(--color-ink)',
            color: 'var(--color-page-bg)',
            border: '1px solid var(--color-ink)',
            borderRadius: 'var(--radius-sm)',
            padding: 16,
          }}
          className="text-start flex flex-col justify-between gap-3 cursor-pointer transition-opacity hover:opacity-95"
        >
          <div className="flex items-center justify-between w-full">
            <ShieldCheck className="w-6 h-6" style={{ color: '#8FD6C4' }} />
            <Badge variant="success" size="sm">
              {isRTL ? 'ط¥ظ„ط²ط§ظ…ظٹ ظٹظˆظ…ظٹط§ظ‹' : 'Daily mandatory'}
            </Badge>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
              {isRTL ? 'ط¨ط¯ط، ظپط­طµ ظ…ط§ ظ‚ط¨ظ„ ط§ظ„ط±ط­ظ„ط©' : 'Start Pre-Trip Check'}
            </p>
            <p style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              {isRTL ? 'طھظ†ظپظٹط° ظ‚ط§ط¦ظ…ط© ط§ظ„ط³ظ„ط§ظ…ط© ط§ظ„ط±ظ‚ظ…ظٹط© (15 ط¨ظ†ط¯)' : 'Perform 15-Point Digital Safety Checklist'}
            </p>
          </div>
        </button>

        <button
          onClick={() => setIsReportOpen(true)}
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-border)',
            borderInlineStart: `3px solid ${EDITORIAL_STATUS.red.stripe}`,
            borderRadius: 'var(--radius-sm)',
            padding: 16,
          }}
          className="text-start flex flex-col justify-between gap-3 cursor-pointer transition-colors hover:bg-[#ECE8DE]"
        >
          <div className="flex items-center justify-between w-full">
            <AlertTriangle className="w-6 h-6" style={{ color: EDITORIAL_STATUS.red.text }} />
            <Badge variant="danger" size="sm">
              {isRTL ? 'ط¥ط¬ط±ط§ط، ظپظˆط±ظٹ' : 'Immediate action'}
            </Badge>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
              {isRTL ? 'ط§ظ„ط¥ط¨ظ„ط§ط؛ ط¹ظ† ط¹ط·ظ„ ط£ظˆ ظ…ط´ظƒظ„ط©' : 'Report a Problem'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {isRTL
                ? 'طھط³ط¬ظٹظ„ ط¹ط·ظ„ ط£ظˆ طھظˆظ‚ظپ ط·ط§ط±ط¦ ط£ظˆ ظ…ظ„ط§ط­ط¸ط© ط³ظ„ط§ظ…ط©'
                : 'Log Defect / Breakdown / Safety Concern'}
            </p>
          </div>
        </button>
      </div>

      {/* QUICK NAVIGATION TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => onNavigateTab('vehicles')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: 14,
          }}
          className="text-start flex flex-col gap-2 cursor-pointer hover:bg-[#ECE8DE] transition-colors"
        >
          <Truck className="w-4 h-4" style={{ color: 'var(--color-brand-accent)' }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
              {isRTL ? 'ظ…ط±ظƒط¨طھظٹ' : 'My Vehicle'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {isRTL ? 'ط§ظ„ظ…ظˆط§طµظپط§طھ ظˆط§ظ„ط³ط¬ظ„' : 'Specs & History'}
            </p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('inspections')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: 14,
          }}
          className="text-start flex flex-col gap-2 cursor-pointer hover:bg-[#ECE8DE] transition-colors"
        >
          <ShieldCheck className="w-4 h-4" style={{ color: EDITORIAL_STATUS.blue.text }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
              {isRTL ? 'ظپط­ظˆطµط§طھظٹ' : 'My Inspections'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {isRTL ? 'ط³ط¬ظ„ط§طھ ط§ظ„ظپط­طµ' : 'Checklist Logs'}
            </p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('documents')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: 14,
          }}
          className="text-start flex flex-col gap-2 cursor-pointer hover:bg-[#ECE8DE] transition-colors"
        >
          <FileText className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
              {isRTL ? 'ط§ظ„ظˆط«ط§ط¦ظ‚' : 'Documents'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {isRTL ? 'ط§ظ„ط§ط³طھظ…ط§ط±ط© ظˆط§ظ„طھطµط§ط±ظٹط­' : 'Istimara & Permits'}
            </p>
          </div>
        </button>

        <button
          onClick={() =>
            alert(
              (isRTL
                ? 'ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ: ط¬ظ…ظٹط¹ طھظ†ط¨ظٹظ‡ط§طھ ط§ظ„ط³ظ„ط§ظ…ط© ظ…ظپط¹ظ„ط© ظ„ظ„ط³ط§ط¦ظ‚ '
                : 'Notifications: All safety alerts active for driver ') + currentProfile.full_name
            )
          }
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: 14,
          }}
          className="text-start flex flex-col gap-2 cursor-pointer hover:bg-[#ECE8DE] transition-colors"
        >
          <Bell className="w-4 h-4" style={{ color: EDITORIAL_STATUS.amber.text }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
              {isRTL ? 'ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ' : 'Notifications'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {isRTL ? 'طھظ†ط¨ظٹظ‡ط§طھ ط§ظ„ظ†ط¸ط§ظ…' : 'System Alerts'}
            </p>
          </div>
        </button>
      </div>

      {/* MY DEFECT REPORTS SECTION */}
      <EditorialSection
        title={isRTL ? 'ط¨ظ„ط§ط؛ط§طھ ط§ظ„ط£ط¹ط·ط§ظ„ ظˆط§ظ„ظ…ط´ط§ظƒظ„ ط§ظ„ظ…ط±ط³ظ„ط© ظ…ظ†ظٹ' : 'My submitted defect & problem reports'}
        action={
          <Badge variant="slate" size="sm">
            {isRTL ? `${myReports.length} ط¨ظ„ط§ط؛ط§طھ ظ…ط³ط¬ظ„ط©` : `${myReports.length} Reports Logged`}
          </Badge>
        }
        marginTop={0}
      >
        <DataTable
          showPagination
          columns={[
            { label: isRTL ? 'ط§ظ„ط¨ظ„ط§ط؛ ظˆط§ظ„ظپط¦ط©' : 'Report & category' },
            { label: isRTL ? 'ط§ظ„ظˆطµظپ ظˆط±ط¯ ط§ظ„ظˆط±ط´ط©' : 'Description & response' },
            { label: isRTL ? 'ط§ظ„ظ…ط±ظƒط¨ط© ظˆط§ظ„ظˆظ‚طھ' : 'Vehicle & timestamp' },
            { label: isRTL ? 'ط§ظ„ط®ط·ظˆط±ط© ظˆط§ظ„ط­ط§ظ„ط©' : 'Severity & status', align: 'end' },
          ]}
          hasActionsColumn={false}
          isEmpty={myReports.length === 0}
          emptyMessage={
            isRTL
              ? 'ظ„ط§ طھظˆط¬ط¯ ط¨ظ„ط§ط؛ط§طھ ط£ط¹ط·ط§ظ„ ظ†ط´ط·ط© â€” ظ…ط±ظƒط¨طھظƒ ظپظٹ ط­ط§ظ„ط© طھط´ط؛ظٹظ„ظٹط© ط³ظ„ظٹظ…ط© ط­ط§ظ„ظٹط§ظ‹.'
              : 'No active defect reports â€” your vehicle is currently in operational condition.'
          }
        >
          {myReports.map((rep) => (
            <DataRow
              key={rep.id}
              stripeColor={
                rep.severity === 'CRITICAL'
                  ? EDITORIAL_STATUS.red.stripe
                  : rep.severity === 'HIGH'
                    ? EDITORIAL_STATUS.amber.stripe
                    : rep.status === 'RESOLVED'
                      ? EDITORIAL_STATUS.green.stripe
                      : EDITORIAL_STATUS.blue.stripe
              }
            >
              <td className="py-3 pe-3 whitespace-nowrap">
                <div className="flex flex-col gap-0.5">
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      fontSize: 12,
                      color: 'var(--color-ink)',
                    }}
                  >
                    {rep.report_number}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {rep.category}
                  </span>
                </div>
              </td>
              <td className="py-3 pe-3">
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
                  {rep.description}
                </p>
                {rep.workshop_response && (
                  <div
                    className="mt-2 p-2 flex items-start gap-2 text-[12px]"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <Wrench
                      className="w-3.5 h-3.5 shrink-0 mt-0.5"
                      style={{ color: EDITORIAL_STATUS.blue.text }}
                    />
                    <div>
                      <span className="font-semibold block" style={{ color: 'var(--color-ink)' }}>
                        {isRTL ? 'ط±ط¯ ط§ظ„ظˆط±ط´ط©:' : 'Workshop Response:'}
                      </span>
                      <span>{rep.workshop_response}</span>
                    </div>
                  </div>
                )}
              </td>
              <td className="py-3 pe-3 whitespace-nowrap">
                <div className="flex flex-col gap-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>
                    {rep.vehicle_id} / {rep.trailer_id || (isRTL ? 'ط¨ط¯ظˆظ† ظ…ظ‚ط·ظˆط±ط©' : 'No Trailer')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(rep.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                  </span>
                </div>
              </td>
              <td className="py-3 text-end whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  {getSeverityBadge(rep.severity)}
                  {getStatusBadge(rep.status)}
                </div>
              </td>
            </DataRow>
          ))}
        </DataTable>
      </EditorialSection>

      {/* PRE-TRIP INSPECTION MODAL */}
      {isInspectionOpen && (
        <Modal
          isOpen={isInspectionOpen}
          onClose={() => setIsInspectionOpen(false)}
          title={isRTL ? 'ط§ظ„ظپط­طµ ط§ظ„ط±ظ‚ظ…ظٹ ظ„ظ„ظ…ط±ظƒط¨ط© ظ‚ط¨ظ„ ط§ظ„ط±ط­ظ„ط©' : 'Digital Vehicle Pre-Trip Inspection'}
          maxWidth="3xl"
        >
          <InspectionFormMobile onComplete={() => setIsInspectionOpen(false)} />
        </Modal>
      )}

      {/* REPORT PROBLEM MODAL */}
      {isReportOpen && (
        <Modal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          title={isRTL ? 'ط§ظ„ط¥ط¨ظ„ط§ط؛ ط¹ظ† ط¹ط·ظ„ ظ…ط±ظƒط¨ط© ط£ظˆ ظ…ط®ط§ظ„ظپط© ط³ظ„ط§ظ…ط©' : 'Report Vehicle Defect or Safety Issue'}
          subtitle={
            isRTL
              ? 'ظٹظ†ط¨ظ‡ ظ…ط´ط±ظپ ط§ظ„ظˆط±ط´ط© ظپظˆط±ط§ظ‹ ظˆظٹط³ط¬ظ„ ط³ط¬ظ„ طھط¯ظ‚ظٹظ‚ ط§ظ„ط¨ظ„ط§ط؛.'
              : 'Alerts Workshop Supervisor immediately and records defect audit history.'
          }
        >
          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            {/* Auto-populated read-only vehicle fields */}
            <div
              className="p-3.5 grid grid-cols-2 gap-3 text-[12px]"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div>
                <span className="block font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  {isRTL ? 'ط§ظ„ط´ط§ط­ظ†ط© ط§ظ„ظ…ط®طµطµط©:' : 'Assigned Tractor:'}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                  }}
                >
                  {myAssignedTractor?.vehicle_id} ({myAssignedTractor?.plate_number})
                </span>
              </div>
              <div>
                <span className="block font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  {isRTL ? 'ط§ظ„ظ…ظ‚ط·ظˆط±ط© ط§ظ„ظ…ط±طھط¨ط·ط©:' : 'Coupled Trailer:'}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                  }}
                >
                  {myAssignedTrailer?.trailer_id || (isRTL ? 'ظ„ط§ ظٹظˆط¬ط¯' : 'N/A')}
                </span>
              </div>
              <div
                className="col-span-2 pt-2"
                style={{ borderTop: '1px solid var(--color-row-divider)' }}
              >
                <span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  {isRTL ? 'ط§ظ„ط³ط§ط¦ظ‚ ط§ظ„ظ…ظڈط¨ظ„ظ‘ط؛: ' : 'Reporting Driver: '}
                </span>
                <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {currentProfile.full_name}
                </span>
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-ink)' }}>
                {isRTL ? 'طھطµظ†ظٹظپ ط§ظ„ط¹ط·ظ„' : 'Defect Category'}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DefectReportCategory)}
                className="nf-field w-full"
              >
                <option value="Brakes">{isRTL ? 'ط§ظ„ظپط±ط§ظ…ظ„ ظˆظ†ط¸ط§ظ… ط§ظ„ظ‡ظˆط§ط،' : 'Brakes & Pneumatics'}</option>
                <option value="Engine">{isRTL ? 'ط§ظ„ظ…ط­ط±ظƒ ظˆظ†ظ‚ظ„ ط§ظ„ط­ط±ظƒط©' : 'Engine & Drivetrain'}</option>
                <option value="Tires">{isRTL ? 'ط§ظ„ط¥ط·ط§ط±ط§طھ ظˆط§ظ„ط¹ط¬ظ„ط§طھ' : 'Tires & Wheels'}</option>
                <option value="Valve">
                  {isRTL ? 'طµظ…ط§ظ…ط§طھ ط§ظ„طھظپط±ظٹط؛ ظˆط§ظ„ظˆطµظ„ط§طھ' : 'API Discharge Valves & Manifold'}
                </option>
                <option value="Electrical">{isRTL ? 'ط§ظ„ط¥ظ†ط§ط±ط© ظˆط§ظ„ظƒظ‡ط±ط¨ط§ط،' : 'Lighting & Electrical'}</option>
                <option value="Safety Gear">
                  {isRTL ? 'ظ…ط¹ط¯ط§طھ ط§ظ„ط³ظ„ط§ظ…ط© ظˆط§ظ„طھط£ط±ظٹط¶' : 'Hazmat Safety Equipment & Grounding'}
                </option>
                <option value="Steering">{isRTL ? 'ط§ظ„طھظˆط¬ظٹظ‡ ظˆظ†ط¸ط§ظ… ط§ظ„طھط¹ظ„ظٹظ‚' : 'Steering & Suspension'}</option>
                <option value="Transmission">{isRTL ? 'ظ†ط§ظ‚ظ„ ط§ظ„ط­ط±ظƒط© ظˆط§ظ„ظƒظ„طھط´' : 'Transmission & Clutch'}</option>
                <option value="Leaks">{isRTL ? 'طھط³ط±ط¨ط§طھ ط§ظ„ظˆظ‚ظˆط¯ ط£ظˆ ط§ظ„ط²ظٹطھ' : 'Fuel / Oil Leaks'}</option>
                <option value="Other">{isRTL ? 'ط¹ط·ظ„ ظ…ظٹظƒط§ظ†ظٹظƒظٹ ط¢ط®ط±' : 'Other Mechanical Defect'}</option>
              </select>
            </div>

            {/* Severity selection */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-ink)' }}>
                {isRTL ? 'ظ…ط³طھظˆظ‰ ط§ظ„ط®ط·ظˆط±ط©' : 'Severity Level'}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as SeverityLevel[]).map((s) => {
                  const isActive = severity === s;
                  const stripe =
                    s === 'CRITICAL'
                      ? EDITORIAL_STATUS.red.stripe
                      : s === 'HIGH'
                        ? EDITORIAL_STATUS.amber.stripe
                        : s === 'MEDIUM'
                          ? EDITORIAL_STATUS.blue.stripe
                          : EDITORIAL_STATUS.muted.stripe;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      style={{
                        background: isActive ? 'var(--color-ink)' : 'var(--color-surface)',
                        color: isActive ? 'var(--color-page-bg)' : 'var(--color-text-secondary)',
                        border: isActive
                          ? '1px solid var(--color-ink)'
                          : '1px solid var(--color-border)',
                        borderInlineStart: `3px solid ${stripe}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 6px',
                      }}
                      className="text-center font-semibold text-xs transition-colors cursor-pointer"
                    >
                      {t(s, s)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Problem Description */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-ink)' }}>
                {isRTL ? 'ظˆطµظپ ط§ظ„ط¹ط·ظ„ ط§ظ„طھظپطµظٹظ„ظٹ' : 'Detailed Defect Description'}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder={
                  isRTL
                    ? 'ط§ط´ط±ط­ ط§ظ„ظ…ط´ظƒظ„ط© ط¨ط¯ظ‚ط© (ظ…ط«ط§ظ„: ط¨ط·ط، طھط¹ط¨ط¦ط© ط§ظ„ظ‡ظˆط§ط،طŒ طھط³ط±ظٹط¨ ظپظٹ طµظ…ط§ظ… ط§ظ„طھظپط±ظٹط؛ ط±ظ‚ظ… 2طŒ طھط­ط°ظٹط± ط¶ط؛ط· ط§ظ„ط¥ط·ط§ط±ط§طھ)...'
                    : 'Explain the specific issue encountered (e.g. low pressure building up slowly, leak at discharge API valve 2, tire pressure warning)...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="nf-field w-full resize-none"
              />
            </div>

            <div
              className="flex items-center justify-end gap-2.5 pt-3"
              style={{ borderTop: '1px solid var(--color-row-divider)' }}
            >
              <SecondaryButton type="button" onClick={() => setIsReportOpen(false)}>
                {t('Cancel', 'Cancel')}
              </SecondaryButton>
              <PrimaryButton
                type="submit"
                style={{
                  background: EDITORIAL_STATUS.red.stripe,
                  borderColor: EDITORIAL_STATUS.red.stripe,
                }}
              >
                {isRTL ? 'ط¥ط±ط³ط§ظ„ ط¨ظ„ط§ط؛ ط§ظ„ط¹ط·ظ„' : 'Submit Problem Report'}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* CRITICAL DEFECT CONFIRMATION WARNING MODAL */}
      {showCriticalConfirm && (
        <Modal
          isOpen={showCriticalConfirm}
          onClose={() => setShowCriticalConfirm(false)}
          title={isRTL ? 'طھط­ط°ظٹط± ط³ظ„ط§ظ…ط© ط­ط±ط¬' : 'Critical safety warning'}
        >
          <div className="space-y-4 text-xs">
            <div
              className="p-4 space-y-2"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderInlineStart: `3px solid ${EDITORIAL_STATUS.red.stripe}`,
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-ink)',
              }}
            >
              <div className="flex items-center gap-2">
                <AlertOctagon
                  className="w-5 h-5 shrink-0"
                  style={{ color: EDITORIAL_STATUS.red.text }}
                />
                <h4 className="font-semibold text-sm">
                  {isRTL ? 'طھط­ط°ظٹط± ط¥ظٹظ‚ط§ظپ طھط´ط؛ظٹظ„ ط§ظ„ظ…ط±ظƒط¨ط©' : 'Vehicle Operational Suspension Warning'}
                </h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? (
                  <>
                    ط£ظ†طھ طھط­ط¯ط¯ ظ‡ط°ط§ ط§ظ„ط¨ظ„ط§ط؛ ط¨ط¯ط±ط¬ط©{' '}
                    <strong style={{ color: EDITORIAL_STATUS.red.text }}>ط­ط±ط¬</strong> ظ„ظ„ط´ط§ط­ظ†ط©{' '}
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                      {myAssignedTractor?.vehicle_id}
                    </strong>
                    .
                  </>
                ) : (
                  <>
                    You are marking this defect report as{' '}
                    <strong style={{ color: EDITORIAL_STATUS.red.text }}>CRITICAL</strong> for tractor
                    vehicle{' '}
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                      {myAssignedTractor?.vehicle_id}
                    </strong>
                    .
                  </>
                )}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? (
                  <>
                    ط³ظٹط¤ط¯ظٹ ط¥ط±ط³ط§ظ„ ط¨ظ„ط§ط؛ ط­ط±ط¬ طھظ„ظ‚ط§ط¦ظٹط§ظ‹ ط¥ظ„ظ‰ طھط؛ظٹظٹط± ط­ط§ظ„ط© ط§ظ„ظ…ط±ظƒط¨ط© ط¥ظ„ظ‰{' '}
                    <strong style={{ color: 'var(--color-ink)' }}>ظٹطھط·ظ„ط¨ ظپط­طµ</strong> ظˆط¥ظ†ط´ط§ط، طھظ†ط¨ظٹظ‡
                    ط¹ط§ط¬ظ„ ظ„ظ…ط´ط±ظپ ط§ظ„ظˆط±ط´ط©.
                  </>
                ) : (
                  <>
                    Submitting a CRITICAL report will automatically change vehicle status to{' '}
                    <strong style={{ color: 'var(--color-ink)' }}>REQUIRES INSPECTION</strong> and
                    generate an urgent alert for the Workshop Supervisor.
                  </>
                )}
              </p>
            </div>

            <div
              className="p-3.5 space-y-1"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {isRTL ? 'ظ…ظ„ط®طµ ط§ظ„ط¹ط·ظ„:' : 'Defect Summary:'}
              </span>
              <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                {category} - {description}
              </p>
            </div>

            <div
              className="flex items-center justify-end gap-2.5 pt-3"
              style={{ borderTop: '1px solid var(--color-row-divider)' }}
            >
              <SecondaryButton onClick={() => setShowCriticalConfirm(false)}>
                {isRTL ? 'ط±ط¬ظˆط¹ ظ„ظ„طھط¹ط¯ظٹظ„' : 'Back to Edit'}
              </SecondaryButton>
              <PrimaryButton
                onClick={executeSubmit}
                style={{
                  background: EDITORIAL_STATUS.red.stripe,
                  borderColor: EDITORIAL_STATUS.red.stripe,
                }}
              >
                <AlertTriangle className="w-4 h-4" />
                {isRTL ? 'طھط£ظƒظٹط¯ ط§ظ„ط¨ظ„ط§ط؛ ط§ظ„ط­ط±ط¬' : 'Confirm Critical Report'}
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
};
