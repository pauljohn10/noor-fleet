import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { VehicleDocument } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import {
  FileText,
  Calendar,
  Truck,
  Container,
  Upload,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  EDITORIAL_STATUS,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

export const COMMON_DOCUMENT_TYPES = [
  'Vehicle Registration (Istimara)',
  'Comprehensive Insurance Policy',
  'Hydrostatic Tank Inspection Certificate',
  'Aramco Loading Permit (ADR)',
  'Saudi Transport Authority (TGA) Card',
  'Periodic Technical Inspection (MVPI / Fahas)',
  'Civil Defense Hazmat Safety Certificate',
  'Calibration / Meter Verification Certificate',
];

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoc?: VehicleDocument | null;
  preselectedVehicleId?: string;
  preselectedTrailerId?: string;
  defaultVehicleId?: string;
  defaultTrailerId?: string;
  isReadOnly?: boolean;
}

const resolveIssuingAuthority = (type: string): string => {
  const lower = type.toLowerCase();
  if (lower.includes('istimara') || lower.includes('registration')) {
    return 'Saudi General Directorate of Traffic (Mouror)';
  }
  if (lower.includes('insurance')) {
    return 'Licensed Saudi Insurance Provider (SAMA)';
  }
  if (lower.includes('aramco')) {
    return 'Saudi Aramco Terminal Safety & Compliance';
  }
  if (lower.includes('tga') || lower.includes('transport authority')) {
    return 'Transport General Authority (TGA)';
  }
  if (lower.includes('mvpi') || lower.includes('fahas')) {
    return 'Motor Vehicle Periodic Inspection (SASO / MVPI)';
  }
  if (lower.includes('civil defense')) {
    return 'Saudi General Directorate of Civil Defense';
  }
  if (lower.includes('hydrostatic') || lower.includes('calibration')) {
    return 'Authorized Tank & Meter Inspection Agency (SASO)';
  }
  return 'Saudi Regulatory Authority';
};

export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({
  isOpen,
  onClose,
  initialDoc,
  preselectedVehicleId,
  preselectedTrailerId,
  defaultVehicleId,
  defaultTrailerId,
  isReadOnly = false,
}) => {
  const { vehicles, trailers, addDocument, updateDocument } = useFleet();
  const { currentProfile, hasPermission } = useAuth();
  const { t, isRTL } = useI18n();

  const effectiveVehicleId = preselectedVehicleId || defaultVehicleId;
  const effectiveTrailerId = preselectedTrailerId || defaultTrailerId;
  const canEdit = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);
  const effectiveReadOnly = isReadOnly || !canEdit;

  const [docType, setDocType] = useState<string>(COMMON_DOCUMENT_TYPES[0]);
  const [docNumber, setDocNumber] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [issuingAuthority, setIssuingAuthority] = useState<string>(
    'Saudi General Directorate of Traffic (Mouror)'
  );
  const [unitCategory, setUnitCategory] = useState<'VEHICLE' | 'TRAILER' | 'FLEET'>('VEHICLE');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedTrailerId, setSelectedTrailerId] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialDoc) {
      setDocType(initialDoc.document_type || COMMON_DOCUMENT_TYPES[0]);
      setDocNumber(initialDoc.document_number || '');
      setIssueDate(initialDoc.issue_date ? initialDoc.issue_date.slice(0, 10) : '');
      setExpiryDate(initialDoc.expiry_date ? initialDoc.expiry_date.slice(0, 10) : '');
      setIssuingAuthority(
        initialDoc.issuing_authority || resolveIssuingAuthority(initialDoc.document_type || '')
      );
      if (initialDoc.trailer_id) {
        setUnitCategory('TRAILER');
        setSelectedTrailerId(initialDoc.trailer_id);
        setSelectedVehicleId('');
      } else if (initialDoc.vehicle_id) {
        setUnitCategory('VEHICLE');
        setSelectedVehicleId(initialDoc.vehicle_id);
        setSelectedTrailerId('');
      } else {
        setUnitCategory('FLEET');
        setSelectedVehicleId('');
        setSelectedTrailerId('');
      }
      setAttachmentUrl(initialDoc.attachment_url || '');
      setAttachmentName(initialDoc.attachment_url ? t('Attached Document File') : '');
      setNotes(initialDoc.notes || '');
    } else if (isOpen) {
      setDocType(COMMON_DOCUMENT_TYPES[0]);
      setDocNumber('');
      setIssueDate(new Date().toISOString().slice(0, 10));
      setExpiryDate('');
      setIssuingAuthority('Saudi General Directorate of Traffic (Mouror)');
      if (effectiveTrailerId) {
        setUnitCategory('TRAILER');
        setSelectedTrailerId(effectiveTrailerId);
        setSelectedVehicleId('');
      } else if (effectiveVehicleId) {
        setUnitCategory('VEHICLE');
        setSelectedVehicleId(effectiveVehicleId);
        setSelectedTrailerId('');
      } else if (vehicles.length > 0) {
        setUnitCategory('VEHICLE');
        setSelectedVehicleId(vehicles[0].id);
        setSelectedTrailerId('');
      } else {
        setUnitCategory('FLEET');
        setSelectedVehicleId('');
        setSelectedTrailerId('');
      }
      setAttachmentUrl('');
      setAttachmentName('');
      setNotes('');
    }
    setErrorMessage(null);
  }, [initialDoc, preselectedVehicleId, preselectedTrailerId, isOpen, vehicles]);

  const handleQuickRenew = (years: number) => {
    if (effectiveReadOnly) return;
    const parsed = expiryDate ? new Date(expiryDate) : new Date();
    const baseDate = isNaN(parsed.getTime()) ? new Date() : parsed;
    baseDate.setFullYear(baseDate.getFullYear() + years);
    setExpiryDate(baseDate.toISOString().slice(0, 10));
  };

  const getDaysPreview = (): number | null => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    if (isNaN(exp.getTime())) return null;
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (effectiveReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(t('Uploaded attachment exceeds 10 MB limit.'));
      return;
    }
    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setAttachmentUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveReadOnly) return;
    setErrorMessage(null);

    const cleanNumber = docNumber.trim().toUpperCase();
    if (!cleanNumber) {
      setErrorMessage(t('Document / Certificate reference number is required.'));
      return;
    }
    if (!expiryDate) {
      setErrorMessage(t('Expiration Date is required for compliance tracking.'));
      return;
    }
    if (unitCategory === 'VEHICLE' && !selectedVehicleId) {
      setErrorMessage(t('Please select a Tractor Head to associate with this document.'));
      return;
    }
    if (unitCategory === 'TRAILER' && !selectedTrailerId) {
      setErrorMessage(t('Please select a Tanker Trailer to associate with this document.'));
      return;
    }

    setIsSaving(true);
    try {
      const performedBy = currentProfile?.full_name || 'Fleet Manager';
      const payload = {
        document_type: docType,
        document_number: cleanNumber,
        issue_date: issueDate || undefined,
        expiry_date: expiryDate,
        issuing_authority: issuingAuthority.trim() || undefined,
        vehicle_id: unitCategory === 'VEHICLE' ? selectedVehicleId : undefined,
        trailer_id: unitCategory === 'TRAILER' ? selectedTrailerId : undefined,
        attachment_url: attachmentUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        updated_by: performedBy,
      };

      if (initialDoc) {
        await updateDocument(initialDoc.id, payload, performedBy);
      } else {
        await addDocument(payload, performedBy);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || t('Failed to save compliance document.'));
    } finally {
      setIsSaving(false);
    }
  };

  const daysPreview = getDaysPreview();
  const dateLocale = isRTL ? 'ar-SA-u-ca-gregory' : 'en-US';

  const modalTitle = effectiveReadOnly
    ? `${t('Inspect Compliance Document')}: ${initialDoc?.document_number || ''}`
    : initialDoc
      ? `${t('Renew / Update Document')}: ${initialDoc.document_number}`
      : t('Register Vehicle Permit or Compliance Document');

  const modalSubtitle = effectiveReadOnly
    ? t('Read-only compliance record inspection for regulatory audit verification.')
    : initialDoc
      ? t('Update expiration date, issuing authority, or renewal scan for audit continuity.')
      : t('Register official Istimara, insurance, TGA card, MVPI, or Aramco safety permit.');

  const modalFooter = (
    <>
      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        {t('Permit status and dashboard compliance indicators refresh automatically upon saving.')}
      </span>
      <div className="flex items-center gap-2.5">
        <SecondaryButton type="button" onClick={onClose} disabled={isSaving}>
          {effectiveReadOnly ? t('Close') : t('Cancel')}
        </SecondaryButton>
        {!effectiveReadOnly && (
          <PrimaryButton
            type="submit"
            form="document-form"
            disabled={isSaving}
            dimWhenDisabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t('Saving Changes...')}</span>
              </>
            ) : (
              <span>
                {initialDoc
                  ? t('Save Expiry & Renew Document')
                  : t('Register Vehicle Document')}
              </span>
            )}
          </PrimaryButton>
        )}
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<FileText className="w-5 h-5" style={{ color: 'var(--color-brand-accent)' }} />}
      footer={modalFooter}
      maxWidth="3xl"
    >
      <form id="document-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div
            className="p-3 flex items-center gap-2.5"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderInlineStart: `3px solid ${EDITORIAL_STATUS.red.stripe}`,
              borderRadius: 'var(--radius-sm)',
              color: EDITORIAL_STATUS.red.text,
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-xs">{errorMessage}</span>
          </div>
        )}

        {/* Renewal Verification Strip when editing an existing document */}
        {initialDoc && (
          <div
            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderInlineStart: '3px solid var(--color-brand-accent)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="space-y-1">
              <div
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: 'var(--color-ink)' }}
              >
                <ShieldCheck
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--color-brand-accent)' }}
                />
                <span>{t('Renewal Status Verification')}</span>
              </div>
              <div
                className="flex flex-wrap items-center gap-4 text-[11px]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span>
                  {t('Previous Expiry')}:{' '}
                  <strong
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                    dir="ltr"
                  >
                    {initialDoc.expiry_date}
                  </strong>
                </span>
                <span>
                  {t('New Expiry')}:{' '}
                  <strong
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-brand-accent)',
                    }}
                    dir="ltr"
                  >
                    {expiryDate || '—'}
                  </strong>
                </span>
              </div>
            </div>

            {!effectiveReadOnly && (
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <span
                  className="text-[11px] font-medium me-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {t('Extend')}:
                </span>
                <SecondaryButton type="button" onClick={() => handleQuickRenew(1)}>
                  +1 {t('Yr')}
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => handleQuickRenew(2)}>
                  +2 {t('Yrs')}
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => handleQuickRenew(3)}>
                  +3 {t('Yrs (Istimara)')}
                </SecondaryButton>
              </div>
            )}
          </div>
        )}

        {/* Section 1: Document Classification & Identifier */}
        <div
          className="p-4 space-y-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div
            className="flex items-center justify-between pb-2"
            style={{ borderBottom: '1px solid var(--color-row-divider)' }}
          >
            <div
              className="flex items-center gap-2 text-xs font-semibold"
              style={{ color: 'var(--color-ink)' }}
            >
              <span
                className="w-5 h-5 flex items-center justify-center font-bold text-[11px]"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                1
              </span>
              <FileText className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Document Classification & Identifier')}</span>
            </div>
            {!effectiveReadOnly && (
              <span
                className="text-[11px] font-semibold"
                style={{ color: 'var(--color-brand-accent)' }}
              >
                {t('* Required fields')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Document Type')} <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <select
                value={docType}
                disabled={effectiveReadOnly}
                onChange={(e) => {
                  const val = e.target.value;
                  setDocType(val);
                  if (!initialDoc) {
                    setIssuingAuthority(resolveIssuingAuthority(val));
                  }
                }}
                className="nf-field w-full font-semibold cursor-pointer disabled:opacity-70"
              >
                {COMMON_DOCUMENT_TYPES.map((typeName) => (
                  <option key={typeName} value={typeName}>
                    {t(typeName)}
                  </option>
                ))}
                {!COMMON_DOCUMENT_TYPES.includes(docType) && (
                  <option value={docType}>{t(docType)}</option>
                )}
              </select>
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Document / Certificate Ref Number')}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                disabled={effectiveReadOnly}
                placeholder={t('e.g. IST-901829 or POL-88210')}
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="nf-field w-full font-semibold disabled:opacity-70"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Fleet Asset Association */}
        <div
          className="p-4 space-y-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div
            className="flex items-center gap-2 pb-2 text-xs font-semibold"
            style={{
              borderBottom: '1px solid var(--color-row-divider)',
              color: 'var(--color-ink)',
            }}
          >
            <span
              className="w-5 h-5 flex items-center justify-center font-bold text-[11px]"
              style={{
                background: 'var(--color-page-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              2
            </span>
            <Truck className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            <span>{t('Fleet Asset Association')}</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(['VEHICLE', 'TRAILER', 'FLEET'] as const).map((cat) => {
                const isSelected = unitCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={effectiveReadOnly}
                    onClick={() => setUnitCategory(cat)}
                    className="px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-65"
                    style={{
                      background: isSelected ? 'var(--color-ink)' : 'var(--color-page-bg)',
                      color: isSelected ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                      border: isSelected
                        ? '1px solid var(--color-ink)'
                        : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {cat === 'VEHICLE' && <Truck className="w-3.5 h-3.5 shrink-0" />}
                    {cat === 'TRAILER' && <Container className="w-3.5 h-3.5 shrink-0" />}
                    {cat === 'FLEET' && <ShieldCheck className="w-3.5 h-3.5 shrink-0" />}
                    <span>
                      {cat === 'VEHICLE'
                        ? t('Tractor Head')
                        : cat === 'TRAILER'
                          ? t('Tanker Trailer')
                          : t('General Fleet')}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {unitCategory === 'VEHICLE' && (
                <div>
                  <label
                    className="text-xs font-semibold block mb-1"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {t('Select Tractor Head')}{' '}
                    <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
                  </label>
                  <select
                    value={selectedVehicleId}
                    disabled={effectiveReadOnly}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="nf-field w-full font-semibold cursor-pointer disabled:opacity-70"
                  >
                    <option value="">{t('-- Select Tractor Truck --')}</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_id} — {v.plate_number} ({v.make})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {unitCategory === 'TRAILER' && (
                <div>
                  <label
                    className="text-xs font-semibold block mb-1"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {t('Select Tanker Trailer')}{' '}
                    <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
                  </label>
                  <select
                    value={selectedTrailerId}
                    disabled={effectiveReadOnly}
                    onChange={(e) => setSelectedTrailerId(e.target.value)}
                    className="nf-field w-full font-semibold cursor-pointer disabled:opacity-70"
                  >
                    <option value="">{t('-- Select Tanker Trailer --')}</option>
                    {trailers.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.trailer_id} — {tr.plate_number} ({tr.tank_capacity_liters.toLocaleString()} L)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {unitCategory === 'FLEET' && (
                <div
                  className="p-2.5 flex items-center gap-2 text-xs"
                  style={{
                    background: 'var(--color-page-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <ShieldCheck
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--color-brand-accent)' }}
                  />
                  <span>{t('Applies as a company-wide / depot fleet compliance record.')}</span>
                </div>
              )}

              <div>
                <label
                  className="text-xs font-semibold block mb-1"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {t('Issuing Authority / Agency')}
                </label>
                <input
                  type="text"
                  disabled={effectiveReadOnly}
                  placeholder={t('e.g. Saudi Traffic Police (Mouror)')}
                  value={issuingAuthority}
                  onChange={(e) => setIssuingAuthority(e.target.value)}
                  className="nf-field w-full font-medium disabled:opacity-70"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Validity & Expiration Dates */}
        <div
          className="p-4 space-y-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div
            className="flex items-center justify-between pb-2"
            style={{ borderBottom: '1px solid var(--color-row-divider)' }}
          >
            <div
              className="flex items-center gap-2 text-xs font-semibold"
              style={{ color: 'var(--color-ink)' }}
            >
              <span
                className="w-5 h-5 flex items-center justify-center font-bold text-[11px]"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                3
              </span>
              <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span>{t('Validity & Expiration Dates')}</span>
            </div>

            {daysPreview !== null && (
              <Badge
                variant={
                  daysPreview < 0 ? 'danger' : daysPreview <= 30 ? 'amber' : 'success'
                }
              >
                {daysPreview < 0
                  ? `${t('Expired')} ${Math.abs(daysPreview)} ${t('days ago')}`
                  : daysPreview === 0
                    ? t('Expires today')
                    : `${daysPreview} ${t('days remaining')}`}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Issue / Renewal Date')}
              </label>
              <input
                type="date"
                dir="ltr"
                disabled={effectiveReadOnly}
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="nf-field w-full font-semibold disabled:opacity-70"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Expiration Date')}{' '}
                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
              </label>
              <input
                type="date"
                required
                dir="ltr"
                disabled={effectiveReadOnly}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="nf-field w-full font-semibold disabled:opacity-70"
                style={{
                  fontFamily: 'var(--font-mono)',
                  borderColor: 'var(--color-brand-accent)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Attachment & Renewal Audit Remarks */}
        <div
          className="p-4 space-y-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div
            className="flex items-center gap-2 pb-2 text-xs font-semibold"
            style={{
              borderBottom: '1px solid var(--color-row-divider)',
              color: 'var(--color-ink)',
            }}
          >
            <span
              className="w-5 h-5 flex items-center justify-center font-bold text-[11px]"
              style={{
                background: 'var(--color-page-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              4
            </span>
            <Upload className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            <span>{t('Attachment & Renewal Audit Remarks')}</span>
          </div>

          <div className="space-y-3">
            {!effectiveReadOnly && (
              <label
                className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 cursor-pointer transition"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px dashed var(--color-input-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 flex items-center justify-center shrink-0"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-brand-accent)',
                    }}
                  >
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--color-ink)' }}>
                      {attachmentName || t('Upload scanned PDF or certificate photo')}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('PDF, JPG, PNG up to 10 MB')}
                    </div>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-input-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-ink)',
                  }}
                >
                  {attachmentUrl ? t('Replace File') : t('Choose File')}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}

            {attachmentUrl && (
              <div
                className="p-2.5 flex items-center justify-between gap-2"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span
                  className="text-xs font-medium truncate"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {attachmentName || t('Document scan attached')}
                </span>
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold shrink-0 hover:underline"
                  style={{ color: 'var(--color-brand-accent)' }}
                >
                  <span>{t('View Scan')}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div>
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('Renewal Notes & Audit Remarks')}
              </label>
              <textarea
                rows={2}
                disabled={effectiveReadOnly}
                placeholder={t(
                  'e.g. Renewed via Absher Business portal, physical card placed in cab folder.'
                )}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="nf-field w-full resize-none disabled:opacity-70"
              />
            </div>
          </div>
        </div>

        {/* Bottom Audit Bar for Existing Records */}
        {initialDoc && (
          <div
            className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]"
            style={{
              background: 'var(--color-page-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {t('Created')}:{' '}
                <strong style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                  {new Date(initialDoc.created_at).toLocaleDateString(dateLocale)}
                </strong>
              </span>
            </div>
            <div>
              {t('Last Updated')}:{' '}
              <strong style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                {initialDoc.updated_at
                  ? new Date(initialDoc.updated_at).toLocaleDateString(dateLocale)
                  : new Date(initialDoc.created_at).toLocaleDateString(dateLocale)}
              </strong>
              {initialDoc.updated_by ? ` — ${initialDoc.updated_by}` : ''}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
