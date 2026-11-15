import React, { useEffect, useState } from 'react';
import { X, Download, ExternalLink, FileText, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import {
  createRenderablePreviewUrl,
  detectAttachmentKind,
  downloadAttachment,
  getReadableAttachmentFileName,
  openAttachmentInNewTab,
} from '../../lib/attachmentUtils';
import { useI18n } from '../../context/I18nContext';

export interface DocumentAttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachmentUrl: string;
  documentNumber?: string;
  documentType?: string;
  assetLabel?: string;
  issueDate?: string;
  expiryDate?: string;
  fileName?: string;
}

export const DocumentAttachmentPreviewModal: React.FC<DocumentAttachmentPreviewModalProps> = ({
  isOpen,
  onClose,
  attachmentUrl,
  documentNumber,
  documentType,
  assetLabel,
  issueDate,
  expiryDate,
  fileName,
}) => {
  const { t, isRTL } = useI18n();
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  const kind = detectAttachmentKind(attachmentUrl, fileName);
  const readableFileName =
    fileName || getReadableAttachmentFileName(attachmentUrl, documentNumber, documentType);

  useEffect(() => {
    if (!isOpen || !attachmentUrl) {
      setRenderUrl(null);
      return;
    }

    let active = true;
    let revokeFn: (() => void) | null = null;
    setLoading(true);
    setZoom(1);
    setRotation(0);

    createRenderablePreviewUrl(attachmentUrl)
      .then(({ previewUrl, revoke }) => {
        if (!active) {
          revoke();
          return;
        }
        revokeFn = revoke;
        setRenderUrl(previewUrl);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setRenderUrl(attachmentUrl);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (revokeFn) revokeFn();
    };
  }, [isOpen, attachmentUrl]);

  if (!isOpen || !attachmentUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        backgroundColor: 'rgba(22, 21, 19, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={onClose}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          backgroundColor: '#F4F1EA',
          border: '1px solid #D9D4C8',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#FFFDF8',
            borderBottom: '1px solid #D9D4C8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: "'Bricolage Grotesque', var(--font-display), sans-serif",
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#161513',
                }}
              >
                {documentType ? t(documentType) : t('Attached Document Preview')}
              </span>
              {documentNumber && (
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#ECE8DE',
                    color: '#161513',
                    border: '1px solid #D9D4C8',
                  }}
                >
                  {documentNumber}
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginTop: '0.25rem',
                fontSize: '0.78rem',
                color: '#5B574F',
                flexWrap: 'wrap',
              }}
            >
              {assetLabel && (
                <span>
                  {t('Asset')}: <strong style={{ color: '#161513' }}>{assetLabel}</strong>
                </span>
              )}
              {issueDate && (
                <span>
                  {t('Issued')}: <span style={{ fontFamily: "'DM Mono', monospace" }}>{issueDate}</span>
                </span>
              )}
              {expiryDate && (
                <span>
                  {t('Expiry')}:{' '}
                  <strong style={{ fontFamily: "'DM Mono', monospace", color: '#161513' }}>
                    {expiryDate}
                  </strong>
                </span>
              )}
              <span style={{ fontFamily: "'DM Mono', monospace", color: '#6B665C' }}>
                {readableFileName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {kind === 'image' && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  title={t('Zoom out')}
                  style={{
                    height: '34px',
                    padding: '0 0.6rem',
                    backgroundColor: '#FFFDF8',
                    border: '1px solid #CFC9BA',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: '#161513',
                    fontSize: '0.75rem',
                  }}
                >
                  <ZoomOut size={14} />
                </button>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '0.75rem',
                    color: '#5B574F',
                    minWidth: '42px',
                    textAlign: 'center',
                  }}
                >
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                  title={t('Zoom in')}
                  style={{
                    height: '34px',
                    padding: '0 0.6rem',
                    backgroundColor: '#FFFDF8',
                    border: '1px solid #CFC9BA',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: '#161513',
                    fontSize: '0.75rem',
                  }}
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title={t('Rotate')}
                  style={{
                    height: '34px',
                    padding: '0 0.6rem',
                    backgroundColor: '#FFFDF8',
                    border: '1px solid #CFC9BA',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: '#161513',
                  }}
                >
                  <RotateCw size={14} />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => openAttachmentInNewTab(attachmentUrl)}
              style={{
                height: '34px',
                padding: '0 0.75rem',
                backgroundColor: '#FFFDF8',
                border: '1px solid #CFC9BA',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#161513',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              <ExternalLink size={13} />
              {t('Open in New Tab')}
            </button>

            <button
              type="button"
              onClick={() => downloadAttachment(attachmentUrl, readableFileName)}
              style={{
                height: '34px',
                padding: '0 0.85rem',
                backgroundColor: '#161513',
                border: '1px solid #161513',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#FFFDF8',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              <Download size={13} />
              {t('Download')}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '34px',
                height: '34px',
                backgroundColor: '#FFFDF8',
                border: '1px solid #CFC9BA',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5B574F',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: '460px',
            maxHeight: '75vh',
            overflow: 'auto',
            backgroundColor: '#ECE8DE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: '#5B574F', fontSize: '0.875rem' }}>
              {t('Loading document preview...')}
            </div>
          ) : !renderUrl ? (
            <div style={{ textAlign: 'center', color: '#5B574F', fontSize: '0.875rem' }}>
              {t('Unable to load attachment preview.')}
            </div>
          ) : kind === 'image' ? (
            <div
              style={{
                overflow: 'auto',
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={renderUrl}
                alt={readableFileName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '68vh',
                  objectFit: 'contain',
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease',
                  borderRadius: '4px',
                  border: '1px solid #D9D4C8',
                  backgroundColor: '#FFFDF8',
                }}
              />
            </div>
          ) : kind === 'pdf' ? (
            <iframe
              src={renderUrl}
              title={readableFileName || 'PDF Document Preview'}
              style={{
                width: '100%',
                height: '68vh',
                border: '1px solid #D9D4C8',
                borderRadius: '4px',
                backgroundColor: '#FFFDF8',
              }}
            />
          ) : (
            <div
              style={{
                padding: '2.5rem',
                backgroundColor: '#FFFDF8',
                border: '1px solid #D9D4C8',
                borderRadius: '4px',
                textAlign: 'center',
                maxWidth: '420px',
              }}
            >
              <FileText size={36} style={{ color: '#0F5C4D', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 700, color: '#161513', marginBottom: '0.35rem' }}>
                {readableFileName}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#5B574F', marginBottom: '1.25rem' }}>
                {t('Use the buttons below to open or download this attached compliance file.')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => openAttachmentInNewTab(attachmentUrl)}
                  style={{
                    height: '36px',
                    padding: '0 0.85rem',
                    backgroundColor: '#FFFDF8',
                    border: '1px solid #CFC9BA',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#161513',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={14} />
                  {t('Open File')}
                </button>
                <button
                  type="button"
                  onClick={() => downloadAttachment(attachmentUrl, readableFileName)}
                  style={{
                    height: '36px',
                    padding: '0 0.85rem',
                    backgroundColor: '#161513',
                    border: '1px solid #161513',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#FFFDF8',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <Download size={14} />
                  {t('Download')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
