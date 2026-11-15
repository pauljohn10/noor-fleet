import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  User,
  Wrench,
  Zap,
  Disc,
  AlertTriangle,
  HelpCircle,
  Camera,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Globe,
  X,
  Send,
  Loader2,
  AlertCircle,
  Lock,
  ZoomIn,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { DefectReportCategory } from '../../types';
import { compressImageFile, formatFileSize } from '../../lib/imageCompression';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { DESIGN_TOKENS } from '../../lib/designTokens';
import {
  EDITORIAL_STATUS,
  PlateChip,
  PrimaryButton,
} from '../common/EditorialUI';

const ISSUE_CATEGORIES: {
  value: DefectReportCategory;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  icon: React.ReactNode;
  stripeColor: string;
  iconColor: string;
}[] = [
    {
      value: 'Mechanical',
      labelEn: 'Mechanical',
      labelAr: 'ميكانيكي',
      descEn: 'Engine, brakes, transmission, air or fuel system',
      descAr: 'المحرك، الفرامل، القير، الهواء أو الوقود',
      icon: <Wrench className="w-4 h-4" />,
      stripeColor: EDITORIAL_STATUS.amber.stripe,
      iconColor: EDITORIAL_STATUS.amber.text,
    },
    {
      value: 'Electrical',
      labelEn: 'Electrical',
      labelAr: 'كهربائي',
      descEn: 'Battery, lights, sensors, starter, wiring',
      descAr: 'البطارية، الإضاءة، الحساسات، الضفيرة',
      icon: <Zap className="w-4 h-4" />,
      stripeColor: EDITORIAL_STATUS.blue.stripe,
      iconColor: EDITORIAL_STATUS.blue.text,
    },
    {
      value: 'Tire',
      labelEn: 'Tire',
      labelAr: 'الإطارات',
      descEn: 'Flat tire, blowout, tread wear, wheel hub',
      descAr: 'بنشر، تلف الإطار، الجنط أو الرمان',
      icon: <Disc className="w-4 h-4" />,
      stripeColor: 'var(--color-brand-accent)',
      iconColor: 'var(--color-brand-accent)',
    },
    {
      value: 'Accident',
      labelEn: 'Accident',
      labelAr: 'حادث مروري',
      descEn: 'Collision, body damage, emergency hazard',
      descAr: 'تصادم، تلفيات بالهيكل، طوارئ الطريق',
      icon: <AlertTriangle className="w-4 h-4" />,
      stripeColor: EDITORIAL_STATUS.red.stripe,
      iconColor: EDITORIAL_STATUS.red.text,
    },
    {
      value: 'Other',
      labelEn: 'Other',
      labelAr: 'أخرى',
      descEn: 'Tanker valve, cabin, AC, or general issue',
      descAr: 'صمامات الصهريج، المكيف، أو ملاحظة أخرى',
      icon: <HelpCircle className="w-4 h-4" />,
      stripeColor: EDITORIAL_STATUS.muted.stripe,
      iconColor: 'var(--color-text-secondary)',
    },
  ];

const COOLDOWN_STORAGE_KEY = 'noor_fleet_last_public_report_ts';
const COOLDOWN_MS = 15_000; // 15-second anti-spam cooldown between submissions

export const PublicDriverReportPortal: React.FC = () => {
  const { vehicles, trailers, drivers, submitPublicDriverReport } = useFleet();
  const { language, toggleLanguage, isRTL } = useI18n();

  // Form state
  const [driverName, setDriverName] = useState('');
  const [selectedPlate, setSelectedPlate] = useState('');
  const [customPlate, setCustomPlate] = useState('');
  const [category, setCategory] = useState<DefectReportCategory>('Mechanical');
  const [description, setDescription] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: string;
    compressedSize: string;
    savedPercent: number;
    dimensions: string;
  } | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [honeypotUrl, setHoneypotUrl] = useState('');

  // Live clock for automatic timestamp display
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  // Submission & confirmation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<{
    reportNumber: string;
    driverName: string;
    vehicleId: string;
    plateNumber: string;
    category: DefectReportCategory;
    submittedAt: string;
    hasPhoto: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 10_000);
    return () => clearInterval(interval);
  }, []);

  // Support pre-selecting vehicle plate via query string (?plate=LBR-4921)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefillPlate = params.get('plate');
    if (prefillPlate) {
      const matched = vehicles.find(
        (v) => v.plate_number.toUpperCase() === prefillPlate.toUpperCase()
      );
      if (matched) {
        setSelectedPlate(matched.plate_number);
      } else {
        setSelectedPlate('__CUSTOM__');
        setCustomPlate(prefillPlate.toUpperCase());
      }
    }
  }, [vehicles]);

  const matchedVehicle = vehicles.find((v) => v.plate_number === selectedPlate);
  const matchedTrailer = matchedVehicle?.assigned_trailer_id
    ? trailers.find((tr) => tr.id === matchedVehicle.assigned_trailer_id)
    : undefined;

  // Compress & optimize uploaded image before storage upload (Max 1600px, ~200-400KB target)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(
        isRTL
          ? 'يرجى اختيار ملف صورة صالح (JPG أو PNG أو WEBP).'
          : 'Please select a valid image file (JPG, PNG, or WEBP).'
      );
      return;
    }

    // Accept up to 25 MB mobile photo before compression
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg(
        isRTL
          ? 'حجم الصورة الأصلي كبير جداً (الحد الأقصى 25 ميجابايت قبل الضغط).'
          : 'Original image is too large (maximum 25 MB before compression).'
      );
      return;
    }

    setErrorMsg(null);
    setIsCompressing(true);
    setPhotoFileName(file.name);

    try {
      const result = await compressImageFile(file, {
        maxDimension: 1600,
        quality: 0.82,
        mimeType: 'image/jpeg',
      });

      setPhotoDataUrl(result.dataUrl);
      setCompressedBlob(result.blob);
      setCompressionStats({
        originalSize: formatFileSize(result.originalSizeBytes),
        compressedSize: formatFileSize(result.compressedSizeBytes),
        savedPercent: result.compressionRatioPercent,
        dimensions: `${result.compressedWidth} × ${result.compressedHeight} px`,
      });
    } catch (err: any) {
      console.warn('Advanced compression warning, falling back to standard reader:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoDataUrl(event.target?.result as string);
        setCompressedBlob(file);
        setCompressionStats(null);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoDataUrl(undefined);
    setPhotoFileName('');
    setCompressedBlob(null);
    setCompressionStats(null);
    setIsCompressing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    // Check anti-spam cooldown
    const lastTs = Number(localStorage.getItem(COOLDOWN_STORAGE_KEY) || '0');
    if (Date.now() - lastTs < COOLDOWN_MS) {
      setErrorMsg(
        isRTL
          ? 'يرجى الانتظار بضع ثوانٍ قبل إرسال بلاغ آخر.'
          : 'Please wait a few seconds before submitting another report.'
      );
      return;
    }

    const finalPlate =
      selectedPlate === '__CUSTOM__' ? customPlate.trim().toUpperCase() : selectedPlate.trim();

    if (!driverName.trim() || driverName.trim().length < 2) {
      setErrorMsg(
        isRTL ? 'يرجى إدخال اسم السائق الثلاثي.' : 'Please enter your full Driver Name.'
      );
      return;
    }

    if (!finalPlate) {
      setErrorMsg(
        isRTL
          ? 'يرجى اختيار أو إدخال رقم لوحة المركبة.'
          : 'Please select or enter the Vehicle Plate Number.'
      );
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setErrorMsg(
        isRTL
          ? 'يرجى كتابة وصف واضح للمشكلة (5 أحرف على الأقل).'
          : 'Please provide a clear description of the issue (at least 5 characters).'
      );
      return;
    }

    setIsSubmitting(true);
    let finalPhotoUrl = photoDataUrl;

    try {
      // 1. Upload compressed photo to Supabase storage bucket 'driver-issue-photos'
      if (compressedBlob && isSupabaseConfigured) {
        try {
          setUploadStatusText(
            isRTL
              ? 'جاري رفع الصورة المضغوطة إلى خوادم أسطول نور...'
              : 'Uploading optimized photo to fleet storage...'
          );
          const ext = compressedBlob.type === 'image/webp' ? 'webp' : 'jpg';
          const randomSuffix = Math.random().toString(36).substring(2, 9);
          const filePath = `reports/${new Date().getFullYear()}/${Date.now()}_${randomSuffix}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('driver-issue-photos')
            .upload(filePath, compressedBlob, {
              contentType: compressedBlob.type || 'image/jpeg',
              cacheControl: '3600',
              upsert: true,
            });

          if (!uploadError) {
            const { data: pubData } = supabase.storage
              .from('driver-issue-photos')
              .getPublicUrl(filePath);
            if (pubData?.publicUrl) {
              finalPhotoUrl = pubData.publicUrl;
            }
          } else {
            console.warn('Storage bucket upload notice, falling back to data URL:', uploadError);
          }
        } catch (storageErr) {
          console.warn('Storage bucket upload exception, falling back to data URL:', storageErr);
        } finally {
          setUploadStatusText(null);
        }
      }

      // 2. Submit driver report with permanent photo URL
      const result = await submitPublicDriverReport({
        driver_name: driverName.trim(),
        plate_number: finalPlate,
        category,
        description: description.trim(),
        photo_url: finalPhotoUrl,
        website_url: honeypotUrl,
      });

      if (!result.success) {
        setErrorMsg(
          result.error ||
          (isRTL ? 'تعذر إرسال البلاغ. حاول مرة أخرى.' : 'Failed to submit report. Please try again.')
        );
      } else {
        localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now()));
        setSubmittedRecord({
          reportNumber: result.report_number || 'DEF-2026-00001',
          driverName: driverName.trim(),
          vehicleId: result.vehicle_id || finalPlate,
          plateNumber: result.plate_number || finalPlate,
          category,
          submittedAt: result.submitted_at || new Date().toISOString(),
          hasPhoto: Boolean(finalPhotoUrl),
        });
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
        (isRTL ? 'حدث خطأ أثناء إرسال البلاغ.' : 'An unexpected error occurred while submitting.')
      );
    } finally {
      setIsSubmitting(false);
      setUploadStatusText(null);
    }
  };

  const handleResetForNewReport = () => {
    setSubmittedRecord(null);
    setDescription('');
    setPhotoDataUrl(undefined);
    setPhotoFileName('');
    setCompressedBlob(null);
    setCompressionStats(null);
    setErrorMsg(null);
    setUploadStatusText(null);
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between ${isRTL ? '[direction:rtl] text-right' : '[direction:ltr] text-left'
        }`}
      style={{
        background: 'var(--color-page-bg)',
        color: 'var(--color-ink)',
        fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-ui)',
      }}
    >
      {/* Top Warm-Paper Header Bar */}
      <header
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Signature Plate-Style NF Chip matching LoginPage */}
            <div
              className="flex items-stretch overflow-hidden shrink-0"
              style={{
                background: 'var(--color-page-bg)',
                border: '1px solid var(--color-input-border)',
                borderRadius: 'var(--radius-sm)',
                height: 26,
              }}
            >
              <span
                style={{
                  width: 6,
                  background: DESIGN_TOKENS.colors.accent,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  color: 'var(--color-ink)',
                  padding: '0 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                dir="ltr"
              >
                NF
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-base font-bold truncate"
                  style={{
                    fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-brand)',
                    color: 'var(--color-ink)',
                    letterSpacing: isRTL ? '0' : '-0.02em',
                  }}
                >
                  Noor Fleet
                </span>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5"
                  style={{
                    background: 'var(--color-page-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-brand-accent)',
                  }}
                >
                  {isRTL ? 'بوابة السائقين' : 'Driver Portal'}
                </span>
              </div>
              <p
                className="text-[11px] truncate mt-0.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {isRTL
                  ? 'مؤسسة النور المتحدة للنقل — قسم الصيانة والأسطول'
                  : 'Al-Noor United Transport Est. — Fleet & Workshop Division'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer shrink-0 transition-colors"
            style={{
              background: 'var(--color-page-bg)',
              border: '1px solid var(--color-input-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-ink)',
              fontFamily: language === 'en' ? 'var(--font-arabic)' : 'var(--font-ui)',
            }}
          >
            <Globe className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-accent)' }} />
            <span>{language === 'en' ? 'العربية' : 'English'}</span>
          </button>
        </div>
      </header>

      {/* Main Mobile-Friendly Container */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:py-8">
        {submittedRecord ? (
          /* ============================================================ */
          /* CONFIRMATION VIEW AFTER SUCCESSFUL SUBMISSION                */
          /* ============================================================ */
          <div
            className="overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderTop: `3px solid ${EDITORIAL_STATUS.green.stripe}`,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div
              className="p-6 text-center"
              style={{
                background: 'var(--color-page-bg)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div
                className="w-12 h-12 flex items-center justify-center mx-auto mb-3"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: EDITORIAL_STATUS.green.text,
                }}
              >
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2
                className="text-xl font-bold"
                style={{
                  fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-brand)',
                  color: 'var(--color-ink)',
                }}
              >
                {isRTL ? 'تم إرسال البلاغ بنجاح!' : 'Report Submitted Successfully!'}
              </h2>
              <p
                className="text-xs mt-1.5 max-w-sm mx-auto leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {isRTL
                  ? 'تم تسجيل بلاغ العطل مباشرة في نظام صيانة أسطول النور وإشعار مشرف الورشة.'
                  : 'Your vehicle issue has been recorded directly in the Noor Fleet Maintenance System and dispatched to the workshop team.'}
              </p>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Reference Number Highlight */}
              <div
                className="p-4 text-center"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span
                  className="text-xs font-medium block"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {isRTL ? 'رقم مرجع البلاغ' : 'Official Report Reference'}
                </span>
                <span
                  className="text-2xl font-bold mt-1 block"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                  dir="ltr"
                >
                  {submittedRecord.reportNumber}
                </span>
              </div>

              {/* Submitted Details Summary */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs p-4"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div>
                  <span
                    className="text-[11px] font-medium block"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {isRTL ? 'اسم السائق' : 'Driver Name'}
                  </span>
                  <span
                    className="font-semibold mt-0.5 block"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {submittedRecord.driverName}
                  </span>
                </div>
                <div>
                  <span
                    className="text-[11px] font-medium block"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {isRTL ? 'رقم اللوحة / المركبة' : 'Vehicle Plate / Unit'}
                  </span>
                  <div className="mt-1 flex items-center gap-2 flex-wrap" dir="ltr">
                    <PlateChip plate={submittedRecord.plateNumber} />
                    <span
                      className="text-xs"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {submittedRecord.vehicleId}
                    </span>
                  </div>
                </div>
                <div>
                  <span
                    className="text-[11px] font-medium block"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {isRTL ? 'تصنيف المشكلة' : 'Issue Category'}
                  </span>
                  <span
                    className="font-semibold mt-0.5 block"
                    style={{ color: 'var(--color-brand-accent)' }}
                  >
                    {(() => {
                      const matchedCat = ISSUE_CATEGORIES.find(
                        (c) => c.value === submittedRecord.category
                      );
                      return matchedCat
                        ? isRTL
                          ? matchedCat.labelAr
                          : matchedCat.labelEn
                        : submittedRecord.category;
                    })()}
                  </span>
                </div>
                <div>
                  <span
                    className="text-[11px] font-medium block"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {isRTL ? 'تاريخ ووقت البلاغ' : 'Recorded Date & Time'}
                  </span>
                  <span
                    className="mt-0.5 block text-[11px]"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-secondary)',
                    }}
                    dir="ltr"
                  >
                    {new Date(submittedRecord.submittedAt).toLocaleString(
                      isRTL ? 'ar-SA-u-ca-gregory' : 'en-US'
                    )}
                  </span>
                </div>
              </div>

              <PrimaryButton
                type="button"
                onClick={handleResetForNewReport}
                className="w-full justify-center py-3 text-sm"
              >
                {isRTL ? 'إرسال بلاغ آخر' : 'Submit Another Issue Report'}
              </PrimaryButton>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* PUBLIC DRIVER ISSUE REPORT FORM                              */
          /* ============================================================ */
          <div
            className="overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {/* Form Title Banner */}
            <div
              className="px-5 py-5"
              style={{
                background: 'var(--color-page-bg)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
                <h1
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-brand)',
                    color: 'var(--color-ink)',
                    letterSpacing: isRTL ? '0' : '-0.02em',
                  }}
                >
                  {isRTL ? 'الإبلاغ عن مشكلة في المركبة' : 'Report a Vehicle Issue'}
                </h1>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold shrink-0"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-brand-accent)',
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'بدون تسجيل دخول' : 'No Login Needed'}</span>
                </span>
              </div>
              <p
                className="text-xs sm:text-sm mt-1.5 leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {isRTL
                  ? 'أكمل النموذج أدناه لإرسال بلاغ فوري إلى قسم الصيانة وإدارة الأسطول.'
                  : 'Complete the simple form below to notify Noor Fleet Maintenance & Dispatch immediately.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
              {/* Honeypot anti-spam field (hidden from real users) */}
              <div className="hidden" aria-hidden="true">
                <label>
                  Website
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypotUrl}
                    onChange={(e) => setHoneypotUrl(e.target.value)}
                  />
                </label>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3.5 text-xs font-semibold flex items-start gap-2.5"
                  style={{
                    background: 'var(--color-page-bg)',
                    border: '1px solid var(--color-border)',
                    borderInlineStart: `3px solid ${EDITORIAL_STATUS.red.stripe}`,
                    borderRadius: 'var(--radius-sm)',
                    color: EDITORIAL_STATUS.red.text,
                  }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Driver Name (Required) */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: 'var(--color-ink)' }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-accent)' }} />
                    {isRTL ? 'اسم السائق' : 'Driver Name'}{' '}
                    <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
                  </span>
                </label>
                <input
                  type="text"
                  required
                  list="noor-registered-drivers"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder={
                    isRTL
                      ? 'أدخل اسمك الكامل (مثال: محمد علي خان)'
                      : 'Enter your full name (e.g. Mohammed Ali Khan)'
                  }
                  className="nf-field w-full font-medium"
                />
                <datalist id="noor-registered-drivers">
                  {drivers.map((d) => (
                    <option key={d.id} value={d.full_name} />
                  ))}
                </datalist>
              </div>

              {/* 2. Vehicle Plate Number (Required, selectable from existing registered vehicles) */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: 'var(--color-ink)' }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-accent)' }} />
                    {isRTL ? 'رقم لوحة المركبة' : 'Vehicle Plate Number'}{' '}
                    <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
                  </span>
                </label>
                <select
                  required
                  value={selectedPlate}
                  onChange={(e) => {
                    setSelectedPlate(e.target.value);
                    const veh = vehicles.find((v) => v.plate_number === e.target.value);
                    if (veh && !driverName.trim() && veh.assigned_driver_id) {
                      const assignedDrv = drivers.find((d) => d.id === veh.assigned_driver_id);
                      if (assignedDrv) setDriverName(assignedDrv.full_name);
                    }
                  }}
                  className="nf-field w-full font-semibold cursor-pointer"
                >
                  <option value="">
                    {isRTL ? '-- اختر رقم لوحة الشاحنة --' : '-- Select Vehicle Plate Number --'}
                  </option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.plate_number}>
                      {v.plate_number} — {v.vehicle_id} ({v.make} {v.model})
                    </option>
                  ))}
                  <option value="__CUSTOM__">
                    {isRTL
                      ? 'لوحة أخرى (إدخال يدوي)...'
                      : 'Other Plate Number (Enter Manually)...'}
                  </option>
                </select>

                {selectedPlate === '__CUSTOM__' && (
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={customPlate}
                    onChange={(e) => setCustomPlate(e.target.value.toUpperCase())}
                    placeholder={
                      isRTL ? 'أدخل رقم اللوحة (مثال: LBR-4921)' : 'Enter Plate Number (e.g. LBR-4921)'
                    }
                    className="nf-field w-full mt-2.5 font-semibold"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                )}

                {matchedVehicle && (
                  <div
                    className="mt-2.5 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                    style={{
                      background: 'var(--color-page-bg)',
                      border: '1px solid var(--color-border)',
                      borderInlineStart: '3px solid var(--color-brand-accent)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-medium"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {isRTL ? 'المركبة المسجلة:' : 'Linked Fleet Unit:'}
                      </span>
                      <span
                        className="font-semibold"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                        dir="ltr"
                      >
                        {matchedVehicle.vehicle_id}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        — {matchedVehicle.make} {matchedVehicle.model}
                      </span>
                    </div>
                    {matchedTrailer && (
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <span
                          className="text-[11px]"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {isRTL ? 'المقطورة:' : 'Trailer:'}
                        </span>
                        <PlateChip plate={`${matchedTrailer.trailer_id} · ${matchedTrailer.plate_number}`} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Issue Category (Mechanical, Electrical, Tire, Accident, Other) */}
              <div>
                <label
                  className="block text-xs font-semibold mb-2"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {isRTL ? 'تصنيف المشكلة' : 'Issue Category'}{' '}
                  <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ISSUE_CATEGORIES.map((item) => {
                    const isSelected = category === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setCategory(item.value)}
                        className="flex items-start gap-3 p-3 text-left rtl:text-right transition cursor-pointer"
                        style={{
                          background: isSelected ? 'var(--color-surface)' : 'var(--color-page-bg)',
                          border: isSelected
                            ? '1px solid var(--color-ink)'
                            : '1px solid var(--color-border)',
                          borderInlineStart: isSelected
                            ? `3px solid ${item.stripeColor}`
                            : '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div
                          className="p-2 shrink-0"
                          style={{
                            background: isSelected
                              ? 'var(--color-page-bg)'
                              : 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            color: isSelected ? item.iconColor : 'var(--color-text-muted)',
                          }}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div
                            className="font-semibold text-xs leading-tight"
                            style={{ color: 'var(--color-ink)' }}
                          >
                            {isRTL ? item.labelAr : item.labelEn}
                          </div>
                          <div
                            className="text-[11px] mt-1 leading-snug"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {isRTL ? item.descAr : item.descEn}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Issue Description (Required) */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {isRTL ? 'وصف المشكلة بالتفصيل' : 'Issue Description'}{' '}
                  <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isRTL
                      ? 'اشرح المشكلة أو العطل الذي لاحظته في الشاحنة...'
                      : 'Describe what happened, any warning lights, unusual noises, or leaks...'
                  }
                  className="nf-field w-full resize-y"
                />
              </div>

              {/* 5. Photo Upload (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className="block text-xs font-semibold"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Camera
                        className="w-3.5 h-3.5"
                        style={{ color: 'var(--color-brand-accent)' }}
                      />
                      {isRTL ? 'إرفاق صورة للمشكلة' : 'Photo Upload'}
                    </span>
                  </label>
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    {isRTL ? 'اختياري' : 'Optional'}
                  </span>
                </div>

                {isCompressing ? (
                  <div
                    className="flex flex-col items-center justify-center gap-2 p-6 text-center animate-pulse"
                    style={{
                      background: 'var(--color-page-bg)',
                      border: '1px solid var(--color-border)',
                      borderInlineStart: '3px solid var(--color-brand-accent)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      style={{ color: 'var(--color-brand-accent)' }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {isRTL
                        ? 'جاري ضغط وتحسين الصورة للموبايل...'
                        : 'Compressing & optimizing photo for mobile...'}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {isRTL
                        ? 'الحفاظ على وضوح تفاصيل العطل وتصغير الحجم'
                        : 'Preserving damage details & reducing file size'}
                    </span>
                  </div>
                ) : !photoDataUrl ? (
                  <label
                    className="flex flex-col items-center justify-center gap-2 p-5 transition cursor-pointer text-center"
                    style={{
                      background: 'var(--color-page-bg)',
                      border: '1px dashed var(--color-input-border)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div
                      className="w-10 h-10 flex items-center justify-center"
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-brand-accent)',
                      }}
                    >
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <span
                        className="text-xs sm:text-sm font-semibold block"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {isRTL
                          ? 'اضغط لالتقاط صورة أو اختيارها من الهاتف'
                          : 'Tap to take a photo or upload from phone'}
                      </span>
                      <span
                        className="text-[11px] block mt-0.5"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        JPG, PNG —{' '}
                        {isRTL
                          ? 'يتم ضغط الصورة تلقائياً إلى ~200-400KB'
                          : 'Auto-resized to max 1600px & compressed to ~200-400 KB'}
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div
                    className="p-3 space-y-2.5"
                    style={{
                      background: 'var(--color-page-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Clickable Thumbnail to Open Lightbox */}
                      <div
                        onClick={() => setIsLightboxOpen(true)}
                        className="group relative cursor-pointer w-20 h-20 overflow-hidden shrink-0"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        title={
                          isRTL
                            ? 'اضغط لتكبير الصورة ومعاينتها'
                            : 'Click to preview full-screen photo'
                        }
                      >
                        <img
                          src={photoDataUrl}
                          alt="Uploaded vehicle issue preview"
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all flex items-center justify-center">
                          <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className="text-xs font-semibold truncate"
                            style={{ color: 'var(--color-ink)' }}
                          >
                            {photoFileName || (isRTL ? 'صورة مرفقة' : 'Attached Issue Photo')}
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsLightboxOpen(true)}
                            className="text-[11px] font-semibold px-2 py-0.5 flex items-center gap-1 cursor-pointer shrink-0 transition"
                            style={{
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-brand-accent)',
                            }}
                          >
                            <Maximize2 className="w-2.5 h-2.5" />
                            <span>{isRTL ? 'معاينة' : 'Preview'}</span>
                          </button>
                        </div>

                        {/* File Size & Compression Ratio */}
                        {compressionStats ? (
                          <div className="mt-1 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                              <span
                                className="line-through"
                                style={{ color: 'var(--color-text-muted)' }}
                              >
                                {compressionStats.originalSize}
                              </span>
                              <span
                                className="font-semibold px-1.5 py-0.5 text-[10px]"
                                style={{
                                  background: 'var(--color-surface)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: 'var(--radius-sm)',
                                  color: EDITORIAL_STATUS.green.text,
                                }}
                              >
                                {isRTL
                                  ? `${compressionStats.compressedSize} (توفير ${compressionStats.savedPercent}%)`
                                  : `${compressionStats.compressedSize} (${compressionStats.savedPercent}% smaller)`}
                              </span>
                            </div>
                            <span
                              className="text-[10px] block"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--color-text-muted)',
                              }}
                              dir="ltr"
                            >
                              {compressionStats.dimensions}
                            </span>
                          </div>
                        ) : (
                          <p
                            className="text-[11px] font-semibold mt-0.5 flex items-center gap-1"
                            style={{ color: EDITORIAL_STATUS.green.text }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {isRTL ? 'جاهزة للإرسال مع البلاغ' : 'Ready to attach with report'}
                            </span>
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="p-2 cursor-pointer self-start transition"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: EDITORIAL_STATUS.red.text,
                        }}
                        title={isRTL ? 'حذف الصورة' : 'Remove photo'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p
                      className="text-[11px] flex items-center gap-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <Sparkles
                        className="w-3 h-3 shrink-0"
                        style={{ color: 'var(--color-brand-accent)' }}
                      />
                      <span>
                        {isRTL
                          ? 'تم تحسين أبعاد وحجم الصورة تلقائياً لسرعة الإرسال مع الحفاظ على دقة تفاصيل العطل.'
                          : 'Image optimized for fast mobile upload while keeping vehicle damage details crisp.'}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* 6. Report Date & Time (Automatically Recorded) */}
              <div
                className="flex items-center justify-between gap-2 px-4 py-3 text-xs"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Clock
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                  <span>
                    {isRTL ? 'تاريخ ووقت البلاغ (تلقائي):' : 'Report Date & Time (Auto-recorded):'}
                  </span>
                </div>
                <span
                  className="font-semibold"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                  dir="ltr"
                >
                  {currentTime.toLocaleString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Submit Button */}
              <PrimaryButton
                type="submit"
                disabled={isSubmitting || isCompressing}
                dimWhenDisabled={isSubmitting || isCompressing}
                className="w-full justify-center py-3 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {uploadStatusText || (isRTL ? 'جاري إرسال البلاغ...' : 'Submitting Report...')}
                    </span>
                  </>
                ) : isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isRTL ? 'جاري معالجة الصورة...' : 'Processing Photo...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isRTL ? 'إرسال البلاغ الآن' : 'Submit Report'}</span>
                  </>
                )}
              </PrimaryButton>
            </form>
          </div>
        )}
      </main>

      {/* Driver Photo Preview Lightbox */}
      {photoDataUrl && (
        <ImageLightboxModal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          imageUrl={photoDataUrl}
          title={isRTL ? 'معاينة صورة العطل قبل الإرسال' : 'Incident Photo Preview'}
          subtitle={photoFileName || (selectedPlate ? `Vehicle: ${selectedPlate}` : undefined)}
        />
      )}

      {/* Footer */}
      <footer
        className="max-w-xl mx-auto w-full px-4 py-4 text-center text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2"
        style={{
          color: 'var(--color-text-muted)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <span>
          {isRTL
            ? `© ${new Date().getFullYear()} مؤسسة النور المتحدة للنقل • بوابة بلاغات الأعطال العامة الآمنة`
            : `© ${new Date().getFullYear()} Al-Noor United Transport Est. • Secure Public Issue Reporting`}
        </span>
        <a
          href="/"
          className="inline-flex items-center gap-1 font-semibold hover:underline transition"
          style={{ color: 'var(--color-ink)' }}
        >
          <Lock className="w-3 h-3" />
          <span>{isRTL ? 'دخول موظفي الإدارة والورشة' : 'Fleet Staff Login'}</span>
        </a>
      </footer>
    </div>
  );
};
