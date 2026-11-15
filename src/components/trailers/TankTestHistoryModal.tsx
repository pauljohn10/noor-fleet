import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  Trailer,
  TankerTestRecord,
  TankTestType,
  TankTestStatus,
} from '../../types';
import { useI18n } from '../../context/I18nContext';
import {
  History,
  Plus,
  Eye,
  Download,
  Edit3,
  FileText,
  UserCheck,
  Building2,
  Calendar,
} from 'lucide-react';
import {
  downloadAttachment,
  getReadableAttachmentFileName,
} from '../../lib/attachmentUtils';
import { DocumentAttachmentPreviewModal } from '../documents/DocumentAttachmentPreviewModal';
import {
  EDITORIAL_STATUS,
  PrimaryButton,
  SecondaryButton,
} from '../common/EditorialUI';

interface TankTestHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailer: Trailer;
  testType: TankTestType;
  records: TankerTestRecord[];
  canManage: boolean;
  onAddNewTest: (testType: TankTestType) => void;
  onEditRecord: (record: TankerTestRecord, readOnly?: boolean) => void;
}

export const TankTestHistoryModal: React.FC<TankTestHistoryModalProps> = ({
  isOpen,
  onClose,
  trailer,
  testType,
  records,
  canManage,
  onAddNewTest,
  onEditRecord,
}) => {
  const { t, isRTL } = useI18n();
  const [previewRecord, setPreviewRecord] = useState<TankerTestRecord | null>(null);

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

  const getStripeColor = (status: TankTestStatus) => {
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${t('Inspection History')} â€” ${getTestTypeLabel(testType)}`}
        subtitle={`${trailer.trailer_id} (${trailer.plate_number}) آ· ${
          isRTL
            ? `${records.length} ط³ط¬ظ„ط§طھ طھط§ط±ظٹط®ظٹط© ظ…ط­ظپظˆط¸ط©`
            : `${records.length} historical record(s) preserved`
        }`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <div
            className="p-3.5 flex items-center justify-between gap-3 flex-wrap"
            style={{
              background: 'var(--color-page-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4" style={{ color: 'var(--color-ink)' }} />
              <div>
                <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {isRTL
                    ? 'ط³ط¬ظ„ ط§ظ„ظپط­ظˆطµط§طھ ط§ظ„طھط§ط±ظٹط®ظٹ ط§ظ„ظƒط§ظ…ظ„ (ط؛ظٹط± ظ‚ط§ط¨ظ„ ظ„ظ„ط­ط°ظپ ط§ظ„طھظ„ظ‚ط§ط¦ظٹ)'
                    : 'Complete Chronological Test Log (Append-Only Audit Trail)'}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  {isRTL
                    ? 'ظٹطھظ… ط§ظ„ط§ط­طھظپط§ط¸ ط¨ط¬ظ…ظٹط¹ ط§ظ„ظپط­ظˆطµط§طھ ط§ظ„ط³ط§ط¨ظ‚ط© (ط¨ظ…ط§ ظپظٹ ط°ظ„ظƒ ط§ظ„ظپط­ظˆطµط§طھ ط§ظ„ط±ط§ط³ط¨ط© ط£ظˆ ط§ظ„ظ…ط¹ط§ط¯ط©) ظˆظٹظڈط¹طھظ…ط¯ ط£ط­ط¯ط« ط³ط¬ظ„ ظƒط­ط§ظ„ط© ط­ط§ظ„ظٹط©.'
                    : 'All prior test results (including any earlier FAILED tests before re-testing and PASSING) are permanently preserved.'}
                </p>
              </div>
            </div>
            {canManage && (
              <PrimaryButton
                type="button"
                onClick={() => {
                  onClose();
                  onAddNewTest(testType);
                }}
                style={{ height: 32, fontSize: 12 }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('Add New Test')}</span>
              </PrimaryButton>
            )}
          </div>

          {records.length === 0 ? (
            <div
              className="p-8 text-center space-y-2"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-muted)',
              }}
            >
              <FileText className="w-7 h-7 mx-auto opacity-50" />
              <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                {isRTL
                  ? 'ظ„ط§ طھظˆط¬ط¯ ط³ط¬ظ„ط§طھ ظپط­طµ طھط§ط±ظٹط®ظٹط© ظ…ط³ط¬ظ„ط© ظ„ظ‡ط°ط§ ط§ظ„ط§ط®طھط¨ط§ط± ط¨ط¹ط¯.'
                  : 'No historical test records recorded for this test type yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pe-1">
              {records.map((rec, index) => {
                const isLatest = index === 0;
                const stripe = getStripeColor(rec.test_status);

                return (
                  <div
                    key={rec.id}
                    className="p-4 space-y-2.5"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderInlineStart: `3px solid ${stripe}`,
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(rec.test_status)}
                        {isLatest && (
                          <Badge variant="info">
                            {isRTL ? 'ط§ظ„ظ†طھظٹط¬ط© ط§ظ„ط­ط§ظ„ظٹط© ط§ظ„ظ…ط¹طھظ…ط¯ط©' : 'CURRENT ACTIVE RESULT'}
                          </Badge>
                        )}
                        {rec.certificate_number && (
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
                            #{rec.certificate_number}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rec.attachment_url && (
                          <>
                            <SecondaryButton
                              type="button"
                              onClick={() => setPreviewRecord(rec)}
                              style={{ height: 28, fontSize: 12.5 }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{t('Preview')}</span>
                            </SecondaryButton>
                            <SecondaryButton
                              type="button"
                              onClick={() =>
                                downloadAttachment(
                                  rec.attachment_url,
                                  getReadableAttachmentFileName(
                                    rec.attachment_url,
                                    rec.certificate_number || undefined,
                                    rec.test_type
                                  )
                                )
                              }
                              style={{ height: 28, fontSize: 12.5 }}
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
                              onClose();
                              onEditRecord(rec, false);
                            }}
                            style={{ height: 28, fontSize: 12.5 }}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{t('Edit')}</span>
                          </SecondaryButton>
                        ) : (
                          <SecondaryButton
                            type="button"
                            onClick={() => {
                              onClose();
                              onEditRecord(rec, true);
                            }}
                            style={{ height: 28, fontSize: 12.5 }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('Details')}</span>
                          </SecondaryButton>
                        )}
                      </div>
                    </div>

                    <div
                      className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[12px]"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <div>
                        <span
                          className="block text-[12px]"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Calendar className="w-3 h-3 inline me-1" />
                          {t('Test Date')}
                        </span>
                        <strong
                          dir="ltr"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-ink)',
                          }}
                        >
                          {rec.test_date || 'â€”'}
                        </strong>
                      </div>

                      <div>
                        <span
                          className="block text-[12px]"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Calendar className="w-3 h-3 inline me-1" />
                          {t('Next Due Date')}
                        </span>
                        <strong
                          dir="ltr"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-ink)',
                          }}
                        >
                          {rec.next_test_due_date || 'â€”'}
                        </strong>
                      </div>

                      <div>
                        <span
                          className="block text-[12px]"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <UserCheck className="w-3 h-3 inline me-1" />
                          {t('Inspector Name')}
                        </span>
                        <strong style={{ color: 'var(--color-ink)' }}>
                          {rec.inspector_name || 'â€”'}
                        </strong>
                      </div>

                      <div>
                        <span
                          className="block text-[12px]"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Building2 className="w-3 h-3 inline me-1" />
                          {t('Inspection Center')}
                        </span>
                        <strong style={{ color: 'var(--color-ink)' }}>
                          {rec.inspection_center || 'â€”'}
                        </strong>
                      </div>
                    </div>

                    {rec.remarks && (
                      <div
                        className="p-2.5 text-[12px]"
                        style={{
                          background: 'var(--color-page-bg)',
                          border: '1px solid var(--color-row-divider)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <strong style={{ color: 'var(--color-ink)' }}>
                          {t('Remarks')}:{' '}
                        </strong>
                        <span>{rec.remarks}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div
            className="flex items-center justify-end pt-3"
            style={{ borderTop: '1px solid var(--color-row-divider)' }}
          >
            <SecondaryButton type="button" onClick={onClose}>
              {t('Close')}
            </SecondaryButton>
          </div>
        </div>
      </Modal>

      {previewRecord && previewRecord.attachment_url && (
        <DocumentAttachmentPreviewModal
          isOpen={Boolean(previewRecord)}
          onClose={() => setPreviewRecord(null)}
          attachmentUrl={previewRecord.attachment_url}
          documentNumber={
            previewRecord.certificate_number ||
            `${trailer.trailer_id}-${previewRecord.test_type}`
          }
          documentType={previewRecord.test_type}
          assetLabel={`${trailer.trailer_id} آ· ${trailer.plate_number}`}
          issueDate={previewRecord.test_date || undefined}
          expiryDate={previewRecord.next_test_due_date || undefined}
        />
      )}
    </>
  );
};
