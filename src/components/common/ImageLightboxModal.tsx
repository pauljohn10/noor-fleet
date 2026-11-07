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
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
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
      className="fixed inset-0 z-[99999] flex flex-col bg-slate-950/95 backdrop-blur-md text-white select-none transition-all duration-200 animate-in fade-in"
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
        className="flex items-center justify-between px-3 sm:px-5 py-3 bg-slate-900/90 border-b border-white/10 shrink-0 z-30 gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[200px] sm:max-w-md">
                {title}
              </h3>
              {reportNumber && (
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-mono text-[10px] sm:text-[11px] font-bold border border-amber-400/30 shrink-0">
                  {reportNumber}
                </span>
              )}
            </div>
            {(subtitle || createdAt) && (
              <p className="text-[10px] sm:text-[11px] text-slate-300 truncate font-medium mt-0.5">
                {subtitle} {createdAt && `• ${new Date(createdAt).toLocaleString()}`}
              </p>
            )}
          </div>
        </div>

        {/* Toolbar Controls & Prominent Close Button */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.75}
            title="Zoom Out (-)"
            className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 transition cursor-pointer active:scale-95"
          >
            <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Current Scale Display & Reset */}
          <button
            type="button"
            onClick={handleReset}
            title="Reset Zoom (0)"
            className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] sm:text-xs font-mono font-bold text-amber-300 transition flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{Math.round(scale * 100)}%</span>
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            title="Zoom In (+)"
            className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 transition cursor-pointer active:scale-95"
          >
            <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="w-px h-5 bg-white/20 mx-0.5 hidden sm:block" />

          {/* Toggle Fullscreen (Desktop) */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer hidden sm:flex active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Download Original Image */}
          <button
            type="button"
            onClick={handleDownload}
            title="Download Original Image"
            className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer active:scale-95 hidden xs:flex"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Open in New Tab */}
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Full Image in New Tab"
            className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer active:scale-95 hidden xs:flex"
          >
            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </a>

          {/* HIGHLY VISIBLE CLOSE (X) BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close Viewer and Return (Esc)"
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-extrabold text-xs shadow-lg transition cursor-pointer border border-rose-400/40"
          >
            <X className="w-4 h-4" />
            <span className="font-extrabold">Close</span>
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
        {/* Floating Quick Close Button (Top-Right on Mobile & Desktop) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Close Viewer"
          aria-label="Close photo viewer"
          className="absolute top-3 right-3 sm:top-5 sm:right-6 z-40 p-2 sm:p-2.5 rounded-full bg-slate-900/85 hover:bg-rose-600 text-white shadow-xl border border-white/20 transition cursor-pointer active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        {/* The Photo */}
        <img
          src={imageUrl}
          alt={title}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl transition-transform duration-75 ease-out select-none border border-white/10"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        />

        {/* Floating Pan Hint when zoomed */}
        {scale > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-xs text-[11px] font-bold text-amber-300 border border-white/15 pointer-events-none shadow-lg">
            Drag to pan around • Scroll or buttons to zoom
          </div>
        )}
      </div>

      {/* Bottom Information & Return Bar */}
      <div
        className="px-4 py-2.5 bg-slate-900/90 border-t border-white/10 shrink-0 flex items-center justify-between text-xs text-slate-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition cursor-pointer active:scale-95 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Previous Screen</span>
          </button>
        </div>

        <span className="hidden sm:inline text-[11px] text-slate-400 font-medium">
          Use mouse wheel or + / - to zoom • Esc or Click Background to close
        </span>

        <button
          type="button"
          onClick={onClose}
          className="text-rose-400 hover:text-rose-300 font-bold text-xs sm:hidden flex items-center gap-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit Viewer</span>
        </button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(lightboxNode, document.body) : lightboxNode;
};
