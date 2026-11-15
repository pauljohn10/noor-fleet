import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

export interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  reportNumber?: string;
  createdAt?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Attached Incident Photo',
  subtitle,
  reportNumber,
  createdAt,
}) => {
  const { t, isRTL } = useI18n();
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset transform when image or modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, imageUrl]);

  // Lock document body scroll when lightbox is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow || 'auto';
    };
  }, [isOpen]);

  // Keyboard navigation & Esc handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Capture phase to prevent background triggers
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.35, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.35, 0.75);
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Dragging / Pan when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Drag for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => { });
      setIsFullscreen(false);
    }
  }, []);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${reportNumber || 'noor-fleet-issue'}-photo.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Backdrop click closes viewer only if clicking background directly
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDragging) {
      onClose();
    }
  };

  if (!isOpen || !imageUrl) return null;

  const lightboxNode = (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        background: '#161513',
        color: '#F4F1EA',
        userSelect: 'none',
        fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-ui)',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Top Header Bar */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 py-3 shrink-0 z-30 gap-2"
        style={{ background: '#1F1D1A', borderBottom: '1px solid #35322C' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              background: '#0F5C4D',
              color: '#F4F1EA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-semibold text-[#F4F1EA] truncate max-w-[200px] sm:max-w-md">
                {t(title, title)}
              </h3>
              {reportNumber && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: '#292622',
                    border: '1px solid #3E3A34',
                    color: '#CDEBE3',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                  }}
                >
                  {reportNumber}
                </span>
              )}
            </div>
            {(subtitle || createdAt) && (
              <p className="text-[12px] text-[#B8B2A6] truncate mt-0.5">
                {subtitle} {createdAt && `• ${new Date(createdAt).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}`}
              </p>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.75}
            title={t('Zoom Out (-)', 'Zoom Out (-)')}
            className="p-1.5 sm:p-2 rounded bg-[#292622] hover:bg-[#35322C] text-[#F4F1EA] disabled:opacity-40 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            title={t('Reset Zoom (0)', 'Reset Zoom (0)')}
            className="px-2.5 py-1.5 rounded bg-[#292622] hover:bg-[#35322C] text-xs font-mono text-[#F4F1EA] flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{Math.round(scale * 100)}%</span>
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            title={t('Zoom In (+)', 'Zoom In (+)')}
            className="p-1.5 sm:p-2 rounded bg-[#292622] hover:bg-[#35322C] text-[#F4F1EA] disabled:opacity-40 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-[#35322C] mx-0.5 hidden sm:block" />

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? t('Exit Fullscreen', 'Exit Fullscreen') : t('Fullscreen', 'Fullscreen')}
            className="p-1.5 sm:p-2 rounded bg-[#292622] hover:bg-[#35322C] text-[#F4F1EA] cursor-pointer hidden sm:flex"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title={t('Download Original Image', 'Download Original Image')}
            className="p-1.5 sm:p-2 rounded bg-[#292622] hover:bg-[#35322C] text-[#F4F1EA] cursor-pointer hidden xs:flex"
          >
            <Download className="w-4 h-4" />
          </button>

          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={t('Open Full Image in New Tab', 'Open Full Image in New Tab')}
            className="p-1.5 sm:p-2 rounded bg-[#292622] hover:bg-[#35322C] text-[#F4F1EA] cursor-pointer hidden xs:flex"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title={t('Close Viewer and Return (Esc)', 'Close Viewer and Return (Esc)')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#991B1B] hover:bg-[#7F1D1D] text-[#FFFDF8] font-semibold text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>{t('Close', 'Close')}</span>
          </button>
        </div>
      </div>

      {/* Main Image Viewport Area */}
      <div
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden p-2 sm:p-6"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title={t('Close Viewer', 'Close Viewer')}
          aria-label={t('Close Viewer', 'Close photo viewer')}
          className={`absolute top-3 ${isRTL ? 'left-3 sm:left-6' : 'right-3 sm:right-6'} sm:top-5 z-40 p-2 rounded bg-[#1F1D1A] hover:bg-[#991B1B] text-[#F4F1EA] border border-[#35322C] cursor-pointer`}
        >
          <X className="w-5 h-5" />
        </button>

        <img
          src={imageUrl}
          alt={title}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-[82vh] object-contain rounded transition-transform duration-75 ease-out select-none border border-[#35322C]"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        />

        {scale > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-[#1F1D1A] text-[12px] font-medium text-[#F4F1EA] border border-[#35322C] pointer-events-none">
            {t('Drag to pan around • Scroll or buttons to zoom', 'Drag to pan around • Scroll or buttons to zoom')}
          </div>
        )}
      </div>

      {/* Bottom Information & Return Bar */}
      <div
        className="px-4 py-2.5 shrink-0 flex items-center justify-between text-xs text-[#B8B2A6]"
        style={{ background: '#1F1D1A', borderTop: '1px solid #35322C' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#FFFDF8] text-[#161513] font-semibold text-xs cursor-pointer"
        >
          <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t('Return to Previous Screen', 'Return to Previous Screen')}</span>
        </button>

        <span className="hidden sm:inline text-[12px] text-[#B8B2A6]">
          {t('Use mouse wheel or + / - to zoom • Esc or Click Background to close', 'Use mouse wheel or + / - to zoom • Esc or Click Background to close')}
        </span>

        <button
          type="button"
          onClick={onClose}
          className="text-[#F87171] font-semibold text-xs sm:hidden flex items-center gap-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>{t('Exit Viewer', 'Exit Viewer')}</span>
        </button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(lightboxNode, document.body) : lightboxNode;
};
