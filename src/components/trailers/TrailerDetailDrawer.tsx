import React, { useState, useEffect } from 'react';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { Tabs } from '../common/Tabs';
import {
  Trailer,
  VehicleDocument,
  TankerTestRecord,
  TankTestType,
  TankTestStatus,
} from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import {
  Truck,
  Wrench,
  FileText,
  Edit3,
  Plus,
  Clock,
  Eye,
  Download,
  FlaskConical,
  History,
  UserCheck,
  Building2,
  Calendar,
  Settings2,
} from 'lucide-react';
import { DocumentFormModal } from '../documents/DocumentFormModal';
import { DocumentAttachmentPreviewModal } from '../documents/DocumentAttachmentPreviewModal';
import { TankTestFormModal } from './TankTestFormModal';
import { TankTestHistoryModal } from './TankTestHistoryModal';
import {
  downloadAttachment,
  getReadableAttachmentFileName,
} from '../../lib/attachmentUtils';
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
  initialTab?: string;
}

const TANK_TEST_TYPES: TankTestType[] = [
  'Hydrostatic Test',
  'Pneumatic Test',
  'Vacuum Test',
];

export const TrailerDetailDrawer: React.FC<TrailerDetailDrawerProps> = ({
  trailer,
  isOpen,
  onClose,
  initialTab = 'overview',
}) => {
  const {
    vehicles,
    workOrders,
    documents,
    tankerTestRecords,
    updateTrailerTankTestConfig,
  } = useFleet();
  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();
  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER', 'FLEET_STAFF']);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<VehicleDocument | null>(null);
  const [isViewOnlyDoc, setIsViewOnlyDoc] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<VehicleDocument | null>(null);

  // Tank Testing & Inspection modal states
  const [isTestFormOpen, setIsTestFormOpen] = useState(false);
  const [activeTestTypeForForm, setActiveTestTypeForForm] =
    useState<TankTestType>('Hydrostatic Test');
  const [editingTestRecord, setEditingTestRecord] = useState<TankerTestRecord | null>(null);
  const [isTestFormReadOnly, setIsTestFormReadOnly] = useState(false);

  const [historyTestType, setHistoryTestType] = useState<TankTestType | null>(null);
  const [previewTestRecord, setPreviewTestRecord] = useState<TankerTestRecord | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab, trailer?.id]);

  if (!trailer) return null;

  const assignedTractor = vehicles.find((v) => v.id === trailer.assigned_tractor_id);
  const trailerWOs = workOrders.filter((w) => w.trailer_id === trailer.id);
  const trailerDocs = documents.filter((d) => d.trailer_id === trailer.id);

  // All tank test records for this tanker trailer (already sorted latest-first by test_date DESC, created_at DESC)
  const trailerTestRecords = tankerTestRecords
    .filter((r) => r.tanker_trailer_id === trailer.id)
    .sort((a, b) => {
      const dateA = a.test_date ? new Date(a.test_date).getTime() : 0;
      const dateB = b.test_date ? new Date(b.test_date).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const requiredTests: TankTestType[] = Array.isArray(trailer.required_tank_tests)
    ? trailer.required_tank_tests
    : TANK_TEST_TYPES;

  const handleToggleRequiredTest = async (testType: TankTestType) => {
    if (!canManage || isSavingConfig) return;
    setIsSavingConfig(true);
    try {
      const exists = requiredTests.includes(testType);
      const nextRequired = exists
        ? requiredTests.filter((tt) => tt !== testType)
        : [...requiredTests, testType];
      await updateTrailerTankTestConfig(
        trailer.id,
        nextRequired,
        trailer.inspection_standard || 'SASO 2288 / ADR / API RP 1110'
      );
    } catch (err) {
      console.warn('Failed to update required tank tests:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleStandardChange = async (newStandard: string) => {
    if (!canManage) return;
    try {
      await updateTrailerTankTestConfig(trailer.id, requiredTests, newStandard);
    } catch (err) {
      console.warn('Failed to update inspection standard:', err);
    }
  };

  const getTestTypeTitle = (type: TankTestType) => {
    switch (type) {
      case 'Hydrostatic Test':
        return isRTL ? 'ط§ظ„ط§ط®طھط¨ط§ط± ط§ظ„ظ‡ظٹط¯ط±ظˆط³طھط§طھظٹظƒظٹ (Hydrostatic Test)' : 'Hydrostatic Test';
      case 'Pneumatic Test':
        return isRTL ? 'ط§ظ„ط§ط®طھط¨ط§ط± ط§ظ„ظ‡ظˆط§ط¦ظٹ (Pneumatic Test)' : 'Pneumatic Test';
      case 'Vacuum Test':
        return isRTL ? 'ط§ط®طھط¨ط§ط± ط§ظ„طھظپط±ظٹط؛ (Vacuum Test)' : 'Vacuum Test';
    }
  };

  const getTestTypeDescription = (type: TankTestType) => {
    switch (type) {
      case 'Hydrostatic Test':
        return isRTL
          ? 'ظپط­طµ ط¶ط؛ط· ط¬ط³ظ… ط§ظ„طµظ‡ط±ظٹط¬ ظˆط§ظ„ط­ظˆط§ط¬ط² ط§ظ„ط¯ط§ط®ظ„ظٹط© ط¨ط§ظ„ظ…ط§ط، ط§ظ„ظ…ط¶ط؛ظˆط· ظ„ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ظ…طھط§ظ†ط© ظˆط¹ط¯ظ… ظˆط¬ظˆط¯ طھط³ط±ظٹط¨.'
          : 'Pressurized water integrity test for tank shell, compartment bulkheads, and welds.';
      case 'Pneumatic Test':
        return isRTL
          ? 'ظپط­طµ ظ…ظ†ط¸ظˆظ…ط© ط§ظ„طµظ…ط§ظ…ط§طھ ط§ظ„ظ‡ظˆط§ط¦ظٹط©طŒ طµظ…ط§ظ…ط§طھ ط§ظ„ظ‚ط§ط¹ (API)طŒ ظˆط®ط·ظˆط· ط§ط³طھط±ط¬ط§ط¹ ط§ظ„ط£ط¨ط®ط±ط© طھط­طھ ط§ظ„ط¶ط؛ط·.'
          : 'Pressurized air leak test for pneumatic emergency foot valves, API bottom valves, and vapor lines.';
      case 'Vacuum Test':
        return isRTL
          ? 'ظپط­طµ ظ…ظ‚ط§ظˆظ…ط© ط§ظ„طµظ‡ط±ظٹط¬ ظˆطµظ…ط§ظ…ط§طھ ط§ظ„طھظ†ظپظٹط³ ظ„ظ„ط¶ط؛ط· ط§ظ„ط³ظ„ط¨ظٹ ظˆط§ظ„طھظپط±ظٹط؛ ظ„ظ…ظ†ط¹ ط§ظ†ظ‡ظٹط§ط± ط§ظ„ط¬ط¯ط±ط§ظ†.'
          : 'Negative-pressure vacuum stability and breather relief valve verification test.';
    }
  };

  const getStatusBadge = (status: TankTestStatus) => {
    switch (status) {
      case 'PASS':
        return <Badge variant="success">{isRTL ? 'ظ†ط§ط¬ط­ (PASS)' : 'PASS'}</Badge>;
      case 'FAIL':
        return <Badge variant="danger">{isRTL ? 'ط±ط§ط³ط¨ (FAIL)' : 'FAIL'}</Badge>;
      case 'PENDING':
        return <Badge variant="amber">{isRTL ? 'ظ‚ظٹط¯ ط§ظ„ط§ظ†طھط¸ط§ط± (PENDING)' : 'PENDING'}</Badge>;
      case 'NOT TESTED':
      default:
        return <Badge variant="slate">{isRTL ? 'ط؛ظٹط± ظ…ظپط­ظˆطµ (NOT TESTED)' : 'NOT TESTED'}</Badge>;
    }
  };

  const getStatusStripe = (status: TankTestStatus) => {
    switch (status) {
      case 'PASS':
        return EDITORIAL_STATUS.green.stripe;
      case 'FAIL':
        return EDITORIAL_STATUS.red.stripe;
      case 'PENDING':
        return EDITORIAL_STATUS.amber.stripe;
      case 'NOT TESTED':
      default:
        return EDITORIAL_STATUS.muted.stripe;
    }
  };

  const tabItems = [
    { id: 'overview', label: t('Overview & Specs'), icon: <Truck className="w-4 h-4" /> },
    {
      id: 'tank_testing',
      label: t('Tank Testing & Inspection'),
      icon: <FlaskConical className="w-4 h-4" />,
      badge: trailerTestRecords.length,
    },
    { id: 'jobs', label: t('Work Orders'), icon: <Wrench className="w-4 h-4" />, badge: trailerWOs.length },
    {
      id: 'documents',
      label: t('Documents & Permits'),
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
            <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
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
                <p className="font-semibold text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Tank Shell Type')}
                </p>
                <p className="font-semibold text-xs mt-0.5" style={{ color: 'var(--color-ink)' }}>
                  {t(trailer.tank_type)}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Compartments')}
                </p>
                <p className="font-semibold text-xs mt-0.5" style={{ color: 'var(--color-ink)' }}>
                  {trailer.number_of_compartments} {t('Compartments')}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Manufacturer')}
                </p>
                <p className="font-semibold text-xs mt-0.5" style={{ color: 'var(--color-ink)' }}>
                  {trailer.manufacturer}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Model & Year')}
                </p>
                <p className="font-medium text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {trailer.model} ({trailer.year})
                </p>
              </div>
              <div>
                <p className="font-semibold text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
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
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
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

        {/* Tab: Tank Testing & Inspection */}
        {activeTab === 'tank_testing' && (
          <div className="space-y-4 text-xs">
            {/* Configurable Applicable Inspection Standard & Required Test Types */}
            <div
              className="p-4 space-y-3"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4" style={{ color: 'var(--color-ink)' }} />
                    <span className="font-semibold text-xs" style={{ color: 'var(--color-ink)' }}>
                      {isRTL
                        ? 'ظ…ط¹ظٹط§ط± ظپط­طµ ط§ظ„طµظ‡ط±ظٹط¬ ط§ظ„ظ…ط¹طھظ…ط¯ ظˆط§ظ„ط§ط®طھط¨ط§ط±ط§طھ ط§ظ„ظ…ط·ظ„ظˆط¨ط©'
                        : 'Applicable Tank Inspection Standard & Required Tests'}
                    </span>
                  </div>
                  <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    {isRTL
                      ? 'ط­ط¯ط¯ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ ط§ظ„ط¥ظ„ط²ط§ظ…ظٹط© ظ„ظ‡ط°ط§ ط§ظ„طµظ‡ط±ظٹط¬ ظˆظپظ‚ط§ظ‹ ظ„ظ„ظ…ط¹ظٹط§ط± ط§ظ„ظپظ†ظٹ ط§ظ„ظ…ط·ط¨ظ‚ (ظ„ظٹط³طھ ط¬ظ…ظٹط¹ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ ط§ظ„ط«ظ„ط§ط«ط© ط¥ظ„ط²ط§ظ…ظٹط© ظ„ظƒظ„ طµظ‡ط±ظٹط¬).'
                      : 'Configure which tests are mandatory for this tanker according to its applicable inspection standard.'}
                  </p>
                </div>

                <div className="min-w-[230px]">
                  <select
                    disabled={!canManage}
                    value={trailer.inspection_standard || 'SASO 2288 / ADR / API RP 1110'}
                    onChange={(e) => handleStandardChange(e.target.value)}
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '0 8px',
                      background: 'var(--color-page-bg)',
                      border: '1px solid var(--color-input-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      color: 'var(--color-ink)',
                      fontWeight: 500,
                    }}
                  >
                    <option value="SASO 2288 / ADR / API RP 1110">
                      SASO 2288 / ADR / API RP 1110
                    </option>
                    <option value="Saudi Aramco Terminal & Civil Defense Standard">
                      Saudi Aramco Terminal & Civil Defense Standard
                    </option>
                    <option value="EN 12972 / ADR Pressure & Vacuum Tank Code">
                      EN 12972 / ADR Pressure & Vacuum Tank Code
                    </option>
                    <option value="Atmospheric Gravity Fuel Tanker Standard">
                      Atmospheric Gravity Fuel Tanker Standard
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {isRTL ? 'ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ ط§ظ„ظ…ط·ظ„ظˆط¨ط© ظ„ظ‡ط°ط§ ط§ظ„طµظ‡ط±ظٹط¬:' : 'Required tests for this tanker:'}
                </span>
                {TANK_TEST_TYPES.map((tt) => {
                  const isReq = requiredTests.includes(tt);
                  return (
                    <button
                      key={tt}
                      type="button"
                      disabled={!canManage || isSavingConfig}
                      onClick={() => handleToggleRequiredTest(tt)}
                      className="px-2.5 py-1 text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                      style={{
                        background: isReq ? 'var(--color-ink)' : 'var(--color-page-bg)',
                        color: isReq ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                        border: isReq
                          ? '1px solid var(--color-ink)'
                          : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: canManage ? 'pointer' : 'default',
                      }}
                    >
                      <span>{isReq ? 'âœ“' : 'â—‹'}</span>
                      <span>{getTestTypeTitle(tt)}</span>
                      <span style={{ opacity: 0.75, fontSize: 12 }}>
                        ({isReq ? (isRTL ? 'ط¥ظ„ط²ط§ظ…ظٹ' : 'Required') : isRTL ? 'ط§ط®طھظٹط§ط±ظٹ' : 'Optional'})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Three Separate Test Cards: Hydrostatic Test, Pneumatic Test, Vacuum Test */}
            <div className="grid grid-cols-1 gap-3.5">
              {TANK_TEST_TYPES.map((testType) => {
                const recordsForType = trailerTestRecords.filter(
                  (r) => r.test_type === testType
                );
                const latestRecord = recordsForType[0] || null;
                const currentStatus: TankTestStatus =
                  latestRecord?.test_status || 'NOT TESTED';
                const isRequired = requiredTests.includes(testType);
                const hadPreviousFail =
                  recordsForType.slice(1).some((r) => r.test_status === 'FAIL') &&
                  currentStatus === 'PASS';

                // Check due date status
                let dueDiffDays: number | null = null;
                if (latestRecord?.next_test_due_date) {
                  const todayMs = new Date().setHours(0, 0, 0, 0);
                  const dueMs = new Date(latestRecord.next_test_due_date).setHours(0, 0, 0, 0);
                  dueDiffDays = Math.ceil((dueMs - todayMs) / 86400000);
                }
                const isOverdue = dueDiffDays !== null && dueDiffDays < 0;
                const isExpiringSoon =
                  dueDiffDays !== null && dueDiffDays >= 0 && dueDiffDays <= 30;

                const cardStripe =
                  currentStatus === 'FAIL' || isOverdue
                    ? EDITORIAL_STATUS.red.stripe
                    : currentStatus === 'PENDING' || isExpiringSoon
                    ? EDITORIAL_STATUS.amber.stripe
                    : getStatusStripe(currentStatus);

                return (
                  <div
                    key={testType}
                    className="p-4 space-y-3"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderInlineStart: `3px solid ${cardStripe}`,
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {/* Card Header: Title, Latest Status Badge, Required/Optional Badge, Due Date Alert */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className="font-bold text-sm"
                            style={{ color: 'var(--color-ink)' }}
                          >
                            {getTestTypeTitle(testType)}
                          </h4>
                          {getStatusBadge(currentStatus)}
                          <Badge variant={isRequired ? 'info' : 'slate'}>
                            {isRequired
                              ? isRTL
                                ? 'ط§ط®طھط¨ط§ط± ط¥ظ„ط²ط§ظ…ظٹ'
                                : 'Required by Standard'
                              : isRTL
                              ? 'ط§ط®طھظٹط§ط±ظٹ / ط؛ظٹط± ط¥ظ„ط²ط§ظ…ظٹ'
                              : 'Optional / Non-Mandatory'}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="danger">
                              {isRTL
                                ? `ظ…طھط£ط®ط± (${Math.abs(dueDiffDays!)} ظٹظˆظ…)`
                                : `OVERDUE (${Math.abs(dueDiffDays!)}d ago)`}
                            </Badge>
                          )}
                          {isExpiringSoon && (
                            <Badge variant="amber">
                              {isRTL
                                ? `ظٹط³طھط­ظ‚ ظ‚ط±ظٹط¨ط§ظ‹ (ط®ظ„ط§ظ„ ${dueDiffDays} ظٹظˆظ…)`
                                : `DUE SOON (${dueDiffDays}d left)`}
                            </Badge>
                          )}
                          {hadPreviousFail && (
                            <Badge variant="purple">
                              {isRTL
                                ? 'ط§ط¬طھط§ط² ط¥ط¹ط§ط¯ط© ط§ظ„ظپط­طµ (ط§ظ„ط³ط¬ظ„ ط§ظ„ط³ط§ط¨ظ‚ ظ…ط­ظپظˆط¸)'
                                : 'Re-Tested & Passed (Prior Fail Preserved)'}
                            </Badge>
                          )}
                        </div>
                        <p
                          className="text-[12px]"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {getTestTypeDescription(testType)}
                        </p>
                      </div>

                      {/* Card Action Buttons: View History & Add New Test */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <SecondaryButton
                          type="button"
                          onClick={() => setHistoryTestType(testType)}
                          style={{ height: 32, fontSize: 12 }}
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>
                            {t('View History')} ({recordsForType.length})
                          </span>
                        </SecondaryButton>

                        {canManage && (
                          <PrimaryButton
                            type="button"
                            onClick={() => {
                              setActiveTestTypeForForm(testType);
                              setEditingTestRecord(null);
                              setIsTestFormReadOnly(false);
                              setIsTestFormOpen(true);
                            }}
                            style={{ height: 32, fontSize: 12 }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{t('Add New Test')}</span>
                          </PrimaryButton>
                        )}
                      </div>
                    </div>

                    {/* Latest Test Metadata Grid */}
                    <div
                      className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3"
                      style={{
                        background: 'var(--color-page-bg)',
                        border: '1px solid var(--color-row-divider)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div>
                        <span
                          className="block text-[12px] font-semibold"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Calendar className="w-3 h-3 inline me-1" />
                          {t('Test Date')}
                        </span>
                        <span
                          dir="ltr"
                          className="font-semibold text-xs mt-0.5 block"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-ink)',
                          }}
                        >
                          {latestRecord?.test_date || (isRTL ? 'ط؛ظٹط± ظ…ط³ط¬ظ„' : 'Not recorded')}
                        </span>
                      </div>

                      <div>
                        <span
                          className="block text-[12px] font-semibold"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Calendar className="w-3 h-3 inline me-1" />
                          {t('Next Due Date')}
                        </span>
                        <span
                          dir="ltr"
                          className="font-semibold text-xs mt-0.5 block"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: isOverdue
                              ? EDITORIAL_STATUS.red.text
                              : isExpiringSoon
                              ? EDITORIAL_STATUS.amber.text
                              : 'var(--color-ink)',
                          }}
                        >
                          {latestRecord?.next_test_due_date ||
                            (isRTL ? 'ط؛ظٹط± ظ…ط­ط¯ط¯' : 'Not scheduled')}
                        </span>
                      </div>

                      <div>
                        <span
                          className="block text-[12px] font-semibold"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <UserCheck className="w-3 h-3 inline me-1" />
                          {t('Inspector Name')}
                        </span>
                        <span
                          className="font-semibold text-xs mt-0.5 block truncate"
                          style={{ color: 'var(--color-ink)' }}
                        >
                          {latestRecord?.inspector_name || 'â€”'}
                        </span>
                      </div>

                      <div>
                        <span
                          className="block text-[12px] font-semibold"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Building2 className="w-3 h-3 inline me-1" />
                          {t('Inspection Center')}
                        </span>
                        <span
                          className="font-semibold text-xs mt-0.5 block truncate"
                          style={{ color: 'var(--color-ink)' }}
                        >
                          {latestRecord?.inspection_center || 'â€”'}
                        </span>
                      </div>
                    </div>

                    {/* Certificate & Remarks Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[12px]"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {t('Certificate')}:
                          </span>
                          {latestRecord?.certificate_number ? (
                            <span
                              dir="ltr"
                              className="px-2 py-0.5 text-[12px] font-semibold"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                background: 'var(--color-page-bg)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-ink)',
                              }}
                            >
                              #{latestRecord.certificate_number}
                            </span>
                          ) : (
                            <span
                              className="text-[12px] italic"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              {isRTL ? 'ظ„ط§ طھظˆط¬ط¯ ط´ظ‡ط§ط¯ط© ظ…ط±ظپظ‚ط© ط¨ط¹ط¯' : 'No certificate issued yet'}
                            </span>
                          )}
                        </div>
                        {latestRecord?.remarks && (
                          <p
                            className="text-[12px]"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            <strong style={{ color: 'var(--color-ink)' }}>
                              {t('Remarks')}:{' '}
                            </strong>
                            {latestRecord.remarks}
                          </p>
                        )}
                      </div>

                      {latestRecord && (
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {latestRecord.attachment_url && (
                            <>
                              <SecondaryButton
                                type="button"
                                onClick={() => setPreviewTestRecord(latestRecord)}
                                style={{ height: 30, fontSize: 12.5 }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{t('Preview Certificate')}</span>
                              </SecondaryButton>
                              <SecondaryButton
                                type="button"
                                onClick={() =>
                                  downloadAttachment(
                                    latestRecord.attachment_url,
                                    getReadableAttachmentFileName(
                                      latestRecord.attachment_url,
                                      latestRecord.certificate_number || undefined,
                                      latestRecord.test_type
                                    )
                                  )
                                }
                                style={{ height: 30, fontSize: 12.5 }}
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{t('Download')}</span>
                              </SecondaryButton>
                            </>
                          )}
                          {canManage ? (
                            <SecondaryButton
                              type="button"
                              onClick={() => {
                                setActiveTestTypeForForm(testType);
                                setEditingTestRecord(latestRecord);
                                setIsTestFormReadOnly(false);
                                setIsTestFormOpen(true);
                              }}
                              style={{ height: 30, fontSize: 12.5 }}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{t('Edit Latest')}</span>
                            </SecondaryButton>
                          ) : (
                            <SecondaryButton
                              type="button"
                              onClick={() => {
                                setActiveTestTypeForForm(testType);
                                setEditingTestRecord(latestRecord);
                                setIsTestFormReadOnly(true);
                                setIsTestFormOpen(true);
                              }}
                              style={{ height: 30, fontSize: 12.5 }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{t('Details')}</span>
                            </SecondaryButton>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
                <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
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
                <p className="text-[12px]">
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
                              ? `ظ…ظ†طھظ‡ظٹ (ظ…ظ†ط° ${Math.abs(diffDays)} ظٹظˆظ…)`
                              : `EXPIRED (${Math.abs(diffDays)}d ago)`}
                          </Badge>
                        ) : isExpiringSoon ? (
                          <Badge variant="amber">
                            {isRTL
                              ? `ظ‚ط±ظٹط¨ ط§ظ„ط§ظ†طھظ‡ط§ط، (ظ…طھط¨ظ‚ظٹ ${diffDays} ظٹظˆظ…)`
                              : `EXPIRING SOON (${diffDays}d left)`}
                          </Badge>
                        ) : (
                          <Badge variant="success">
                            {isRTL ? `ط³ط§ط±ظٹ (ظ…طھط¨ظ‚ظٹ ${diffDays} ظٹظˆظ…)` : `VALID (${diffDays}d left)`}
                          </Badge>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-3 text-[12px] flex-wrap"
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
                        <span>â€¢</span>
                        <span>
                          {t('Authority')}:{' '}
                          <strong style={{ color: 'var(--color-text-secondary)' }}>
                            {d.issuing_authority || t('N/A')}
                          </strong>
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3 text-[12px] flex-wrap pt-0.5"
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
                        {d.issue_date && <span>â€¢</span>}
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
                          className="text-[12px] flex items-center gap-1.5 pt-0.5"
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

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 flex-wrap">
                      {d.attachment_url && (
                        <>
                          <SecondaryButton
                            type="button"
                            onClick={() => setPreviewDoc(d)}
                            style={{ height: 32, fontSize: 12 }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('Preview')}</span>
                          </SecondaryButton>
                          <SecondaryButton
                            type="button"
                            onClick={() =>
                              downloadAttachment(
                                d.attachment_url,
                                getReadableAttachmentFileName(
                                  d.attachment_url,
                                  d.document_number,
                                  d.document_type
                                )
                              )
                            }
                            style={{ height: 32, fontSize: 12 }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{t('Download')}</span>
                          </SecondaryButton>
                        </>
                      )}
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

      {previewDoc && previewDoc.attachment_url && (
        <DocumentAttachmentPreviewModal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          attachmentUrl={previewDoc.attachment_url}
          documentNumber={previewDoc.document_number}
          documentType={previewDoc.document_type}
          assetLabel={`${trailer.trailer_id} آ· ${trailer.plate_number}`}
          issueDate={previewDoc.issue_date}
          expiryDate={previewDoc.expiry_date}
        />
      )}

      {/* Tank Testing & Inspection: Add / Edit Test Modal */}
      <TankTestFormModal
        isOpen={isTestFormOpen}
        onClose={() => {
          setIsTestFormOpen(false);
          setEditingTestRecord(null);
        }}
        trailer={trailer}
        defaultTestType={activeTestTypeForForm}
        editingRecord={editingTestRecord}
        isReadOnly={isTestFormReadOnly}
      />

      {/* Tank Testing & Inspection: Complete Historical Log Modal */}
      {historyTestType && (
        <TankTestHistoryModal
          isOpen={Boolean(historyTestType)}
          onClose={() => setHistoryTestType(null)}
          trailer={trailer}
          testType={historyTestType}
          records={trailerTestRecords.filter((r) => r.test_type === historyTestType)}
          canManage={canManage}
          onAddNewTest={(tt) => {
            setActiveTestTypeForForm(tt);
            setEditingTestRecord(null);
            setIsTestFormReadOnly(false);
            setIsTestFormOpen(true);
          }}
          onEditRecord={(rec, readOnly = false) => {
            setActiveTestTypeForForm(rec.test_type);
            setEditingTestRecord(rec);
            setIsTestFormReadOnly(readOnly);
            setIsTestFormOpen(true);
          }}
        />
      )}

      {/* Tank Testing Certificate Preview Modal */}
      {previewTestRecord && previewTestRecord.attachment_url && (
        <DocumentAttachmentPreviewModal
          isOpen={Boolean(previewTestRecord)}
          onClose={() => setPreviewTestRecord(null)}
          attachmentUrl={previewTestRecord.attachment_url}
          documentNumber={
            previewTestRecord.certificate_number ||
            `${trailer.trailer_id}-${previewTestRecord.test_type}`
          }
          documentType={previewTestRecord.test_type}
          assetLabel={`${trailer.trailer_id} آ· ${trailer.plate_number}`}
          issueDate={previewTestRecord.test_date || undefined}
          expiryDate={previewTestRecord.next_test_due_date || undefined}
        />
      )}
    </Drawer>
  );
};
