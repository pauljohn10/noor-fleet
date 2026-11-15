import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Trailer,
  TankerTestRecord,
  TankTestType,
  TankTestStatus,
} from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import {
  ShieldCheck,
  Calendar,
  Upload,
  CheckCircle2,
  FileText,
  Eye,
  Download,
  UserCheck,
  Building2,
} from 'lucide-react';
import {
  uploadDocumentAttachment,
  downloadAttachment,
  getReadableAttachmentFileName,
  detectAttachmentKind,
} from '../../lib/attachmentUtils';
import { DocumentAttachmentPreviewModal } from '../documents/DocumentAttachmentPreviewModal';
import {
  EDITORIAL_STATUS,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface TankTestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailer: Trailer;
  defaultTestType?: TankTestType;
  /** Pass an existing record ONLY when explicitly editing or viewing that specific historical record.
   *  When adding a new test, leave null so a brand-new historical record is inserted. */
  editingRecord?: TankerTestRecord | null;
  isReadOnly?: boolean;
}

const TEST_TYPES: TankTestType[] = [
  'Hydrostatic Test',
  'Pneumatic Test',
  'Vacuum Test',
];

const TEST_STATUSES: TankTestStatus[] = [
  'PASS',
  'FAIL',
  'PENDING',
  'NOT TESTED',
];

const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 10px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-input-border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 12,
  color: 'var(--color-ink)',
  outline: 'none',
};

const sectionCardStyle: React.CSSProperties = {
  padding: 16,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
};

export const TankTestFormModal: React.FC<TankTestFormModalProps> = ({
  isOpen,
  onClose,
  trailer,
  defaultTestType = 'Hydrostatic Test',
  editingRecord = null,
  isReadOnly = false,
}) => {
  const { addTankerTestRecord, updateTankerTestRecord } = useFleet();
  const { currentProfile } = useAuth();
  const { t, isRTL } = useI18n();

  const [testType, setTestType] = useState<TankTestType>(defaultTestType);
  const [testStatus, setTestStatus] = useState<TankTestStatus>('PASS');
  const [testDate, setTestDate] = useState<string>('');
  const [nextTestDueDate, setNextTestDueDate] = useState<string>('');
  const [inspectorName, setInspectorName] = useState<string>('');
  const [inspectionCenter, setInspectionCenter] = useState<string>('');
  const [certificateNumber, setCertificateNumber] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentFileName, setAttachmentFileName] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingRecord) {
      setTestType(editingRecord.test_type);
      setTestStatus(editingRecord.test_status);
      setTestDate(editingRecord.test_date || '');
      setNextTestDueDate(editingRecord.next_test_due_date || '');
      setInspectorName(editingRecord.inspector_name || '');
      setInspectionCenter(editingRecord.inspection_center || '');
      setCertificateNumber(editingRecord.certificate_number || '');
      setAttachmentUrl(editingRecord.attachment_url || '');
      setAttachmentFileName(
        editingRecord.attachment_url
          ? getReadableAttachmentFileName(
              editingRecord.attachment_url,
              editingRecord.certificate_number || undefined,
              editingRecord.test_type
            )
          : ''
      );
      setRemarks(editingRecord.remarks || '');
    } else {
      const todayStr = new Date().toISOString().slice(0, 10);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const nextYearStr = nextYear.toISOString().slice(0, 10);

      setTestType(defaultTestType);
      setTestStatus('PASS');
      setTestDate(todayStr);
      setNextTestDueDate(nextYearStr);
      setInspectorName('');
      setInspectionCenter('');
      setCertificateNumber('');
      setAttachmentUrl('');
      setAttachmentFileName('');
      setRemarks('');
    }
  }, [isOpen, editingRecord, defaultTestType]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploaded = await uploadDocumentAttachment(file, {
        documentNumber: certificateNumber || `${trailer.trailer_id}_${testType}`,
        documentType: testType,
        trailerId: trailer.trailer_id,
      });
      setAttachmentUrl(uploaded.url);
      setAttachmentFileName(uploaded.fileName);
    } catch (err: any) {
      alert(
        isRTL
          ? `طھط¹ط°ط± ط±ظپط¹ ط´ظ‡ط§ط¯ط© ط§ظ„ظپط­طµ: ${err?.message || 'ط®ط·ط£ ط؛ظٹط± ظ…ط¹ط±ظˆظپ'}`
          : `Failed to upload certificate attachment: ${err?.message || 'Unknown error'}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const applyQuickDueOffset = (months: number) => {
    const base = testDate ? new Date(testDate) : new Date();
    base.setMonth(base.getMonth() + months);
    setNextTestDueDate(base.toISOString().slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      onClose();
      return;
    }

    if (testStatus !== 'NOT TESTED' && !testDate) {
      alert(
        isRTL
          ? 'ظٹط±ط¬ظ‰ طھط­ط¯ظٹط¯ طھط§ط±ظٹط® ط§ظ„ظپط­طµ.'
          : 'Please provide the Test Date.'
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        tanker_trailer_id: trailer.id,
        test_type: testType,
        test_status: testStatus,
        test_date: testDate || null,
        next_test_due_date: nextTestDueDate || null,
        inspector_name: inspectorName.trim() || null,
        inspection_center: inspectionCenter.trim() || null,
        certificate_number: certificateNumber.trim() || null,
        attachment_url:
          attachmentUrl.trim() || editingRecord?.attachment_url || null,
        remarks: remarks.trim() || null,
      };

      if (editingRecord) {
        await updateTankerTestRecord(
          editingRecord.id,
          payload,
          currentProfile.full_name
        );
      } else {
        await addTankerTestRecord(payload, currentProfile.full_name);
      }
      onClose();
    } catch (err: any) {
      alert(
        isRTL
          ? `ظپط´ظ„ ط­ظپط¸ ط³ط¬ظ„ ظپط­طµ ط§ظ„طµظ‡ط±ظٹط¬: ${err?.message || 'ط®ط·ط£ ط؛ظٹط± ظ…ط¹ط±ظˆظپ'}`
          : `Failed to save tank test record: ${err?.message || 'Unknown error'}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const statusMeta: Record<
    TankTestStatus,
    { labelEn: string; labelAr: string; stripe: string; text: string }
  > = {
    PASS: {
      labelEn: 'PASS',
      labelAr: 'ظ†ط§ط¬ط­ (PASS)',
      stripe: EDITORIAL_STATUS.green.stripe,
      text: EDITORIAL_STATUS.green.text,
    },
    FAIL: {
      labelEn: 'FAIL',
      labelAr: 'ط±ط§ط³ط¨ (FAIL)',
      stripe: EDITORIAL_STATUS.red.stripe,
      text: EDITORIAL_STATUS.red.text,
    },
    PENDING: {
      labelEn: 'PENDING',
      labelAr: 'ظ‚ظٹط¯ ط§ظ„ط§ظ†طھط¸ط§ط± (PENDING)',
      stripe: EDITORIAL_STATUS.amber.stripe,
      text: EDITORIAL_STATUS.amber.text,
    },
    'NOT TESTED': {
      labelEn: 'NOT TESTED',
      labelAr: 'ط؛ظٹط± ظ…ظپط­ظˆطµ (NOT TESTED)',
      stripe: EDITORIAL_STATUS.muted.stripe,
      text: EDITORIAL_STATUS.muted.text,
    },
  };

  const getTestTypeLabel = (type: TankTestType) => {
    switch (type) {
      case 'Hydrostatic Test':
        return isRTL ? 'ط§ظ„ط§ط®طھط¨ط§ط± ط§ظ„ظ‡ظٹط¯ط±ظˆط³طھط§طھظٹظƒظٹ (Hydrostatic Test)' : 'Hydrostatic Test';
      case 'Pneumatic Test':
        return isRTL ? 'ط§ظ„ط§ط®طھط¨ط§ط± ط§ظ„ظ‡ظˆط§ط¦ظٹ (Pneumatic Test)' : 'Pneumatic Test';
      case 'Vacuum Test':
        return isRTL ? 'ط§ط®طھط¨ط§ط± ط§ظ„طھظپط±ظٹط؛ (Vacuum Test)' : 'Vacuum Test';
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          isReadOnly
            ? `${t('Tank Test Certificate Details')}: ${getTestTypeLabel(testType)}`
            : editingRecord
            ? `${t('Edit Tank Test Record')}: ${getTestTypeLabel(testType)}`
            : `${t('Add New Tank Test Record')} â€” ${trailer.trailer_id} (${trailer.plate_number})`
        }
        subtitle={
          isReadOnly
            ? t('Review inspection result, inspector credentials, due date, and certificate scan.')
            : editingRecord
            ? t('Update test metadata or attach the inspection certificate scan.')
            : t('Record a new inspection test entry. Previous inspection history is automatically preserved.')
        }
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Section 1: Test Type & Status */}
          <div style={sectionCardStyle} className="space-y-3.5">
            <div
              className="flex items-center gap-2 pb-2"
              style={{
                borderBottom: '1px solid var(--color-row-divider)',
                color: 'var(--color-ink)',
                fontWeight: 600,
              }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t('1. Test Type & Inspection Result')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="block font-semibold mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('Test Type')} *
                </label>
                <select
                  disabled={isReadOnly || Boolean(editingRecord)}
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as TankTestType)}
                  style={{
                    ...fieldStyle,
                    opacity: isReadOnly || Boolean(editingRecord) ? 0.7 : 1,
                  }}
                >
                  {TEST_TYPES.map((tt) => (
                    <option key={tt} value={tt}>
                      {getTestTypeLabel(tt)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="block font-semibold mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('Test Status')} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TEST_STATUSES.map((st) => {
                    const active = testStatus === st;
                    const meta = statusMeta[st];
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => setTestStatus(st)}
                        className="py-2 px-2.5 text-[12px] font-semibold flex items-center gap-2 transition-colors"
                        style={{
                          background: active ? 'var(--color-ink)' : 'var(--color-page-bg)',
                          color: active ? 'var(--color-surface)' : 'var(--color-ink)',
                          border: active
                            ? '1px solid var(--color-ink)'
                            : '1px solid var(--color-border)',
                          borderInlineStart: `3px solid ${meta.stripe}`,
                          borderRadius: 'var(--radius-sm)',
                          cursor: isReadOnly ? 'default' : 'pointer',
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 1,
                            background: meta.stripe,
                            flexShrink: 0,
                          }}
                        />
                        <span className="truncate">
                          {isRTL ? meta.labelAr : meta.labelEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Test Date & Next Test Due Date */}
          <div style={sectionCardStyle} className="space-y-3.5">
            <div
              className="flex items-center justify-between pb-2 flex-wrap gap-2"
              style={{ borderBottom: '1px solid var(--color-row-divider)' }}
            >
              <div
                className="flex items-center gap-2"
                style={{ color: 'var(--color-ink)', fontWeight: 600 }}
              >
                <Calendar className="w-4 h-4" />
                <span>{t('2. Test Date & Next Due Date')}</span>
              </div>
              {!isReadOnly && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyQuickDueOffset(6)}
                    className="px-2 py-1 text-[12px] font-medium"
                    style={{
                      background: 'var(--color-page-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {isRTL ? '+ 6 ط£ط´ظ‡ط±' : '+ 6 Months'}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickDueOffset(12)}
                    className="px-2 py-1 text-[12px] font-medium"
                    style={{
                      background: 'var(--color-page-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {isRTL ? '+ ط³ظ†ط© ظˆط§ط­ط¯ط©' : '+ 1 Year'}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="block font-semibold mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('Test Date')}
                </label>
                <input
                  disabled={isReadOnly}
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  style={{ ...fieldStyle, fontFamily: 'var(--font-mono)' }}
                  dir="ltr"
                />
              </div>

              <div>
                <label
                  className="block font-semibold mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('Next Test Due Date')}
                </label>
                <input
                  disabled={isReadOnly}
                  type="date"
                  value={nextTestDueDate}
                  onChange={(e) => setNextTestDueDate(e.target.value)}
                  style={{ ...fieldStyle, fontFamily: 'var(--font-mono)' }}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Inspector, Inspection Center & Certificate Number */}
          <div style={sectionCardStyle} className="space-y-3.5">
            <div
              className="flex items-center gap-2 pb-2"
              style={{
                borderBottom: '1px solid var(--color-row-divider)',
                color: 'var(--color-ink)',
                fontWeight: 600,
              }}
            >
              <UserCheck className="w-4 h-4" />
              <span>{t('3. Inspector, Inspection Center & Certificate Number')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  className="block font-semibold mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('Inspector Name')}
                </label>
                <input
                  disabled={isReadOnly}
                  type="text"
                  placeholder={isRTL ? 'ط§ط³ظ… ط§ظ„ظپط§ط­طµ ط§ظ„ظ…ط¹طھظ…ط¯' : 'e.g. Eng. Khalid Al-Harbi'}
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  style={fieldStyle}
                />
              </div>

              <div>
                <label
                  className="block font-semibold mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {t('Inspection Center')}
                  </span>
                </label>
                <input
                  disabled={isReadOnly}
                  type="text"
                  placeholder={isRTL ? 'ظ…ط±ظƒط² ط§ظ„ظپط­طµ ط§ظ„ظ…ط¹طھظ…ط¯ (ظ…ط«ظ„ TأœV / SGS)' : 'e.g. TأœV Rheinland / SGS Dammam'}
                  value={inspectionCenter}
                  onChange={(e) => setInspectionCenter(e.target.value)}
                  style={fieldStyle}
                />
              </div>

              <div>
                <label
                  className="block font-semibold mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('Certificate Number')}
                </label>
                <input
                  disabled={isReadOnly}
                  type="text"
                  placeholder="e.g. CERT-HYD-2026-8841"
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  style={{ ...fieldStyle, fontFamily: 'var(--font-mono)' }}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Certificate Attachment (PDF / JPG / PNG) & Remarks */}
          <div style={sectionCardStyle} className="space-y-3.5">
            <div
              className="flex items-center gap-2 pb-2"
              style={{
                borderBottom: '1px solid var(--color-row-divider)',
                color: 'var(--color-ink)',
                fontWeight: 600,
              }}
            >
              <Upload className="w-4 h-4" />
              <span>{t('4. Certificate Attachment (PDF / JPG / PNG) & Remarks')}</span>
            </div>

            {!isReadOnly && (
              <div
                className="p-3.5 flex items-center justify-between gap-3 flex-wrap"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px dashed var(--color-input-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="p-2"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: attachmentUrl
                        ? EDITORIAL_STATUS.green.text
                        : 'var(--color-text-muted)',
                    }}
                  >
                    {attachmentUrl ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="font-semibold text-xs truncate"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {isUploading
                        ? t('Uploading certificate to Supabase Storage...')
                        : attachmentFileName ||
                          (attachmentUrl
                            ? t('Attached Certificate File')
                            : t('Upload Inspection Certificate Scan'))}
                    </p>
                    <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('PDF, JPG, PNG up to 10 MB')}
                    </p>
                  </div>
                </div>
                <label
                  className="cursor-pointer px-3 py-1.5 font-semibold text-xs transition-colors shrink-0"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-ink)',
                  }}
                >
                  {isUploading
                    ? t('Uploading...')
                    : attachmentUrl
                    ? t('Replace Certificate')
                    : t('Browse File')}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}

            {attachmentUrl && (
              <div
                className="p-3 flex items-center justify-between gap-3 flex-wrap"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText
                    className="w-4 h-4 shrink-0"
                    style={{ color: EDITORIAL_STATUS.green.text }}
                  />
                  <div className="min-w-0">
                    <span
                      className="font-medium truncate block"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {attachmentFileName ||
                        getReadableAttachmentFileName(
                          attachmentUrl,
                          certificateNumber,
                          testType
                        ) ||
                        t('Attached Certificate')}
                    </span>
                    <span
                      className="text-[12px]"
                      style={{
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {detectAttachmentKind(attachmentUrl, attachmentFileName).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <SecondaryButton
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    style={{ height: 30, fontSize: 12.5 }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t('Preview')}</span>
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() =>
                      downloadAttachment(
                        attachmentUrl,
                        attachmentFileName ||
                          getReadableAttachmentFileName(
                            attachmentUrl,
                            certificateNumber,
                            testType
                          )
                      )
                    }
                    style={{ height: 30, fontSize: 12.5 }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('Download')}</span>
                  </SecondaryButton>
                </div>
              </div>
            )}

            <div>
              <label
                className="block font-semibold mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('Remarks')}
              </label>
              <textarea
                disabled={isReadOnly}
                rows={3}
                placeholder={
                  isRTL
                    ? 'ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„ظپط­طµطŒ ط¶ط؛ط· ط§ظ„ط§ط®طھط¨ط§ط± ط¨ط§ظ„ط¨ط§ط± (Bar/PSI)طŒ ط£ظˆ ط§ظ„طھظˆطµظٹط§طھ ط§ظ„ظپظ†ظٹط©...'
                    : 'e.g. Tested at 0.35 bar hydrostatic pressure for 30 minutes; zero pressure drop or shell weepage observed.'
                }
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                style={{
                  ...fieldStyle,
                  height: 'auto',
                  padding: '8px 10px',
                }}
              />
            </div>
          </div>

          <div
            className="flex items-center justify-end gap-2 pt-3"
            style={{ borderTop: '1px solid var(--color-row-divider)' }}
          >
            <SecondaryButton type="button" onClick={onClose}>
              {isReadOnly ? t('Close') : t('Cancel')}
            </SecondaryButton>
            {!isReadOnly && (
              <PrimaryButton type="submit" disabled={isSaving || isUploading}>
                {isSaving
                  ? t('Saving...')
                  : editingRecord
                  ? t('Save Changes')
                  : t('Save Test Record')}
              </PrimaryButton>
            )}
          </div>
        </form>
      </Modal>

      {attachmentUrl && (
        <DocumentAttachmentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          attachmentUrl={attachmentUrl}
          documentNumber={certificateNumber || `${trailer.trailer_id}-${testType}`}
          documentType={testType}
          assetLabel={`${trailer.trailer_id} آ· ${trailer.plate_number}`}
          issueDate={testDate}
          expiryDate={nextTestDueDate}
        />
      )}
    </>
  );
};
