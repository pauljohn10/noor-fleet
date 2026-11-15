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
      labelAr: 'ظ…ظٹظƒط§ظ†ظٹظƒظٹ',
      descEn: 'Engine, brakes, transmission, air or fuel system',
      descAr: 'ط§ظ„ظ…ط­ط±ظƒطŒ ط§ظ„ظپط±ط§ظ…ظ„طŒ ط§ظ„ظ‚ظٹط±طŒ ط§ظ„ظ‡ظˆط§ط، ط£ظˆ ط§ظ„ظˆظ‚ظˆط¯',
      icon: <Wrench className="w-4 h-4" />,
      stripeColor: EDITORIAL_STATUS.amber.stripe,
      iconColor: EDITORIAL_STATUS.amber.text,
    },
    {
      value: 'Electrical',
      labelEn: 'Electrical',
      labelAr: 'ظƒظ‡ط±ط¨ط§ط¦ظٹ',
      descEn: 'Battery, lights, sensors, starter, wiring',
      descAr: 'ط§ظ„ط¨ط·ط§ط±ظٹط©طŒ ط§ظ„ط¥ط¶ط§ط،ط©طŒ ط§ظ„ط­ط³ط§ط³ط§طھطŒ ط§ظ„ط¶ظپظٹط±ط©',
      icon: <Zap className="w-4 h-4" />,
      stripeColor: EDITORIAL_STATUS.blue.stripe,
      iconColor: EDITORIAL_STATUS.blue.text,
    },
    {
      value: 'Tire',
      labelEn: 'Tire',
      labelAr: 'ط§ظ„ط¥ط·ط§ط±ط§طھ',
      descEn: 'Flat tire, blowout, tread wear, wheel hub',
      descAr: 'ط¨ظ†ط´ط±طŒ طھظ„ظپ ط§ظ„ط¥ط·ط§ط±طŒ ط§ظ„ط¬ظ†ط· ط£ظˆ ط§ظ„ط±ظ…ط§ظ†',
      icon: <Disc className="w-4 h-4" />,
      stripeColor: 'var(--color-brand-accent)',
      iconColor: 'var(--color-brand-accent)',
    },
    {
      value: 'Accident',
      labelEn: 'Accident',
      labelAr: 'ط­ط§ط¯ط« ظ…ط±ظˆط±ظٹ',
      descEn: 'Collision, body damage, emergency hazard',
      descAr: 'طھطµط§ط¯ظ…طŒ طھظ„ظپظٹط§طھ ط¨ط§ظ„ظ‡ظٹظƒظ„طŒ ط·ظˆط§ط±ط¦ ط§ظ„ط·ط±ظٹظ‚',
      icon: <AlertTriangle className="w-4 h-4" />,
      stripeColor: EDITORIAL_STATUS.red.stripe,
      iconColor: EDITORIAL_STATUS.red.text,
    },
    {
      value: 'Other',
      labelEn: 'Other',
      labelAr: 'ط£ط®ط±ظ‰',
      descEn: 'Tanker valve, cabin, AC, or general issue',
      descAr: 'طµظ…ط§ظ…ط§طھ ط§ظ„طµظ‡ط±ظٹط¬طŒ ط§ظ„ظ…ظƒظٹظپطŒ ط£ظˆ ظ…ظ„ط§ط­ط¸ط© ط£ط®ط±ظ‰',
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
          ? 'ظٹط±ط¬ظ‰ ط§ط®طھظٹط§ط± ظ…ظ„ظپ طµظˆط±ط© طµط§ظ„ط­ (JPG ط£ظˆ PNG ط£ظˆ WEBP).'
          : 'Please select a valid image file (JPG, PNG, or WEBP).'
      );
      return;
    }

    // Accept up to 25 MB mobile photo before compression
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg(
        isRTL
          ? 'ط­ط¬ظ… ط§ظ„طµظˆط±ط© ط§ظ„ط£طµظ„ظٹ ظƒط¨ظٹط± ط¬ط¯ط§ظ‹ (ط§ظ„ط­ط¯ ط§ظ„ط£ظ‚طµظ‰ 25 ظ…ظٹط¬ط§ط¨ط§ظٹطھ ظ‚ط¨ظ„ ط§ظ„ط¶ط؛ط·).'
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
        dimensions: `${result.compressedWidth} أ— ${result.compressedHeight} px`,
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
          ? 'ظٹط±ط¬ظ‰ ط§ظ„ط§ظ†طھط¸ط§ط± ط¨ط¶ط¹ ط«ظˆط§ظ†ظچ ظ‚ط¨ظ„ ط¥ط±ط³ط§ظ„ ط¨ظ„ط§ط؛ ط¢ط®ط±.'
          : 'Please wait a few seconds before submitting another report.'
      );
      return;
    }

    const finalPlate =
      selectedPlate === '__CUSTOM__' ? customPlate.trim().toUpperCase() : selectedPlate.trim();

    if (!driverName.trim() || driverName.trim().length < 2) {
      setErrorMsg(
        isRTL ? 'ظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„ ط§ط³ظ… ط§ظ„ط³ط§ط¦ظ‚ ط§ظ„ط«ظ„ط§ط«ظٹ.' : 'Please enter your full Driver Name.'
      );
      return;
    }

    if (!finalPlate) {
      setErrorMsg(
        isRTL
          ? 'ظٹط±ط¬ظ‰ ط§ط®طھظٹط§ط± ط£ظˆ ط¥ط¯ط®ط§ظ„ ط±ظ‚ظ… ظ„ظˆط­ط© ط§ظ„ظ…ط±ظƒط¨ط©.'
          : 'Please select or enter the Vehicle Plate Number.'
      );
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setErrorMsg(
        isRTL
          ? 'ظٹط±ط¬ظ‰ ظƒطھط§ط¨ط© ظˆطµظپ ظˆط§ط¶ط­ ظ„ظ„ظ…ط´ظƒظ„ط© (5 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„).'
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
              ? 'ط¬ط§ط±ظٹ ط±ظپط¹ ط§ظ„طµظˆط±ط© ط§ظ„ظ…ط¶ط؛ظˆط·ط© ط¥ظ„ظ‰ ط®ظˆط§ط¯ظ… ط£ط³ط·ظˆظ„ ظ†ظˆط±...'
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
          (isRTL ? 'طھط¹ط°ط± ط¥ط±ط³ط§ظ„ ط§ظ„ط¨ظ„ط§ط؛. ط­ط§ظˆظ„ ظ…ط±ط© ط£ط®ط±ظ‰.' : 'Failed to submit report. Please try again.')
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
        (isRTL ? 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط¥ط±ط³ط§ظ„ ط§ظ„ط¨ظ„ط§ط؛.' : 'An unexpected error occurred while submitting.')
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
                  className="text-[12px] font-semibold px-2 py-0.5"
                  style={{
                    background: 'var(--color-page-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-brand-accent)',
                  }}
                >
                  {isRTL ? 'ط¨ظˆط§ط¨ط© ط§ظ„ط³ط§ط¦ظ‚ظٹظ†' : 'Driver Portal'}
                </span>
              </div>
              <p
                className="text-[12px] truncate mt-0.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {isRTL
                  ? 'ظ…ط¤ط³ط³ط© ط§ظ„ظ†ظˆط± ط§ظ„ظ…طھط­ط¯ط© ظ„ظ„ظ†ظ‚ظ„ â€” ظ‚ط³ظ… ط§ظ„طµظٹط§ظ†ط© ظˆط§ظ„ط£ط³ط·ظˆظ„'
                  : 'Al-Noor United Transport Est. â€” Fleet & Workshop Division'}
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
            <span>{language === 'en' ? 'ط§ظ„ط¹ط±ط¨ظٹط©' : 'English'}</span>
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
                {isRTL ? 'طھظ… ط¥ط±ط³ط§ظ„ ط§ظ„ط¨ظ„ط§ط؛ ط¨ظ†ط¬ط§ط­!' : 'Report Submitted Successfully!'}
              </h2>
              <p
                className="text-xs mt-1.5 max-w-sm mx-auto leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {isRTL
                  ? 'طھظ… طھط³ط¬ظٹظ„ ط¨ظ„ط§ط؛ ط§ظ„ط¹ط·ظ„ ظ…ط¨ط§ط´ط±ط© ظپظٹ ظ†ط¸ط§ظ… طµظٹط§ظ†ط© ط£ط³ط·ظˆظ„ ط§ظ„ظ†ظˆط± ظˆط¥ط´ط¹ط§ط± ظ…ط´ط±ظپ ط§ظ„ظˆط±ط´ط©.'
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
                  {isRTL ? 'ط±ظ‚ظ… ظ…ط±ط¬ط¹ ط§ظ„ط¨ظ„ط§ط؛' : 'Official Report Reference'}
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
                    className="text-[12px] font-medium block"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {isRTL ? 'ط§ط³ظ… ط§ظ„ط³ط§ط¦ظ‚' : 'Driver Name'}
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
                    className="text-[12px] font-medium block"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {isRTL ? 'ط±ظ‚ظ… ط§ظ„ظ„ظˆط­ط© / ط§ظ„ظ…ط±ظƒط¨ط©' : 'Vehicle Plate / Unit'}
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
                    className="text-[12px] font-medium block"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {isRTL ? 'طھطµظ†ظٹظپ ط§ظ„ظ…ط´ظƒظ„ط©' : 'Issue Category'}
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
                    className="text-[12px] font-medium block"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {isRTL ? 'طھط§ط±ظٹط® ظˆظˆظ‚طھ ط§ظ„ط¨ظ„ط§ط؛' : 'Recorded Date & Time'}
                  </span>
                  <span
                    className="mt-0.5 block text-[12px]"
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
                {isRTL ? 'ط¥ط±ط³ط§ظ„ ط¨ظ„ط§ط؛ ط¢ط®ط±' : 'Submit Another Issue Report'}
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
                  {isRTL ? 'ط§ظ„ط¥ط¨ظ„ط§ط؛ ط¹ظ† ظ…ط´ظƒظ„ط© ظپظٹ ط§ظ„ظ…ط±ظƒط¨ط©' : 'Report a Vehicle Issue'}
                </h1>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold shrink-0"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-brand-accent)',
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'ط¨ط¯ظˆظ† طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„' : 'No Login Needed'}</span>
                </span>
              </div>
              <p
                className="text-xs sm:text-sm mt-1.5 leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {isRTL
                  ? 'ط£ظƒظ…ظ„ ط§ظ„ظ†ظ…ظˆط°ط¬ ط£ط¯ظ†ط§ظ‡ ظ„ط¥ط±ط³ط§ظ„ ط¨ظ„ط§ط؛ ظپظˆط±ظٹ ط¥ظ„ظ‰ ظ‚ط³ظ… ط§ظ„طµظٹط§ظ†ط© ظˆط¥ط¯ط§ط±ط© ط§ظ„ط£ط³ط·ظˆظ„.'
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
                    {isRTL ? 'ط§ط³ظ… ط§ظ„ط³ط§ط¦ظ‚' : 'Driver Name'}{' '}
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
                      ? 'ط£ط¯ط®ظ„ ط§ط³ظ…ظƒ ط§ظ„ظƒط§ظ…ظ„ (ظ…ط«ط§ظ„: ظ…ط­ظ…ط¯ ط¹ظ„ظٹ ط®ط§ظ†)'
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
                    {isRTL ? 'ط±ظ‚ظ… ظ„ظˆط­ط© ط§ظ„ظ…ط±ظƒط¨ط©' : 'Vehicle Plate Number'}{' '}
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
                    {isRTL ? '-- ط§ط®طھط± ط±ظ‚ظ… ظ„ظˆط­ط© ط§ظ„ط´ط§ط­ظ†ط© --' : '-- Select Vehicle Plate Number --'}
                  </option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.plate_number}>
                      {v.plate_number} â€” {v.vehicle_id} ({v.make} {v.model})
                    </option>
                  ))}
                  <option value="__CUSTOM__">
                    {isRTL
                      ? 'ظ„ظˆط­ط© ط£ط®ط±ظ‰ (ط¥ط¯ط®ط§ظ„ ظٹط¯ظˆظٹ)...'
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
                      isRTL ? 'ط£ط¯ط®ظ„ ط±ظ‚ظ… ط§ظ„ظ„ظˆط­ط© (ظ…ط«ط§ظ„: LBR-4921)' : 'Enter Plate Number (e.g. LBR-4921)'
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
                        {isRTL ? 'ط§ظ„ظ…ط±ظƒط¨ط© ط§ظ„ظ…ط³ط¬ظ„ط©:' : 'Linked Fleet Unit:'}
                      </span>
                      <span
                        className="font-semibold"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                        dir="ltr"
                      >
                        {matchedVehicle.vehicle_id}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        â€” {matchedVehicle.make} {matchedVehicle.model}
                      </span>
                    </div>
                    {matchedTrailer && (
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <span
                          className="text-[12px]"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {isRTL ? 'ط§ظ„ظ…ظ‚ط·ظˆط±ط©:' : 'Trailer:'}
                        </span>
                        <PlateChip plate={`${matchedTrailer.trailer_id} آ· ${matchedTrailer.plate_number}`} />
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
                  {isRTL ? 'طھطµظ†ظٹظپ ط§ظ„ظ…ط´ظƒظ„ط©' : 'Issue Category'}{' '}
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
                            className="text-[12px] mt-1 leading-snug"
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
                  {isRTL ? 'ظˆطµظپ ط§ظ„ظ…ط´ظƒظ„ط© ط¨ط§ظ„طھظپطµظٹظ„' : 'Issue Description'}{' '}
                  <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isRTL
                      ? 'ط§ط´ط±ط­ ط§ظ„ظ…ط´ظƒظ„ط© ط£ظˆ ط§ظ„ط¹ط·ظ„ ط§ظ„ط°ظٹ ظ„ط§ط­ط¸طھظ‡ ظپظٹ ط§ظ„ط´ط§ط­ظ†ط©...'
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
                      {isRTL ? 'ط¥ط±ظپط§ظ‚ طµظˆط±ط© ظ„ظ„ظ…ط´ظƒظ„ط©' : 'Photo Upload'}
                    </span>
                  </label>
                  <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    {isRTL ? 'ط§ط®طھظٹط§ط±ظٹ' : 'Optional'}
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
                        ? 'ط¬ط§ط±ظٹ ط¶ط؛ط· ظˆطھط­ط³ظٹظ† ط§ظ„طµظˆط±ط© ظ„ظ„ظ…ظˆط¨ط§ظٹظ„...'
                        : 'Compressing & optimizing photo for mobile...'}
                    </span>
                    <span
                      className="text-[12px]"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {isRTL
                        ? 'ط§ظ„ط­ظپط§ط¸ ط¹ظ„ظ‰ ظˆط¶ظˆط­ طھظپط§طµظٹظ„ ط§ظ„ط¹ط·ظ„ ظˆطھطµط؛ظٹط± ط§ظ„ط­ط¬ظ…'
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
                          ? 'ط§ط¶ط؛ط· ظ„ط§ظ„طھظ‚ط§ط· طµظˆط±ط© ط£ظˆ ط§ط®طھظٹط§ط±ظ‡ط§ ظ…ظ† ط§ظ„ظ‡ط§طھظپ'
                          : 'Tap to take a photo or upload from phone'}
                      </span>
                      <span
                        className="text-[12px] block mt-0.5"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        JPG, PNG â€”{' '}
                        {isRTL
                          ? 'ظٹطھظ… ط¶ط؛ط· ط§ظ„طµظˆط±ط© طھظ„ظ‚ط§ط¦ظٹط§ظ‹ ط¥ظ„ظ‰ ~200-400KB'
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
                            ? 'ط§ط¶ط؛ط· ظ„طھظƒط¨ظٹط± ط§ظ„طµظˆط±ط© ظˆظ…ط¹ط§ظٹظ†طھظ‡ط§'
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
                            {photoFileName || (isRTL ? 'طµظˆط±ط© ظ…ط±ظپظ‚ط©' : 'Attached Issue Photo')}
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsLightboxOpen(true)}
                            className="text-[12px] font-semibold px-2 py-0.5 flex items-center gap-1 cursor-pointer shrink-0 transition"
                            style={{
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-brand-accent)',
                            }}
                          >
                            <Maximize2 className="w-2.5 h-2.5" />
                            <span>{isRTL ? 'ظ…ط¹ط§ظٹظ†ط©' : 'Preview'}</span>
                          </button>
                        </div>

                        {/* File Size & Compression Ratio */}
                        {compressionStats ? (
                          <div className="mt-1 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
                              <span
                                className="line-through"
                                style={{ color: 'var(--color-text-muted)' }}
                              >
                                {compressionStats.originalSize}
                              </span>
                              <span
                                className="font-semibold px-1.5 py-0.5 text-[12px]"
                                style={{
                                  background: 'var(--color-surface)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: 'var(--radius-sm)',
                                  color: EDITORIAL_STATUS.green.text,
                                }}
                              >
                                {isRTL
                                  ? `${compressionStats.compressedSize} (طھظˆظپظٹط± ${compressionStats.savedPercent}%)`
                                  : `${compressionStats.compressedSize} (${compressionStats.savedPercent}% smaller)`}
                              </span>
                            </div>
                            <span
                              className="text-[12px] block"
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
                            className="text-[12px] font-semibold mt-0.5 flex items-center gap-1"
                            style={{ color: EDITORIAL_STATUS.green.text }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {isRTL ? 'ط¬ط§ظ‡ط²ط© ظ„ظ„ط¥ط±ط³ط§ظ„ ظ…ط¹ ط§ظ„ط¨ظ„ط§ط؛' : 'Ready to attach with report'}
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
                        title={isRTL ? 'ط­ط°ظپ ط§ظ„طµظˆط±ط©' : 'Remove photo'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p
                      className="text-[12px] flex items-center gap-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <Sparkles
                        className="w-3 h-3 shrink-0"
                        style={{ color: 'var(--color-brand-accent)' }}
                      />
                      <span>
                        {isRTL
                          ? 'طھظ… طھط­ط³ظٹظ† ط£ط¨ط¹ط§ط¯ ظˆط­ط¬ظ… ط§ظ„طµظˆط±ط© طھظ„ظ‚ط§ط¦ظٹط§ظ‹ ظ„ط³ط±ط¹ط© ط§ظ„ط¥ط±ط³ط§ظ„ ظ…ط¹ ط§ظ„ط­ظپط§ط¸ ط¹ظ„ظ‰ ط¯ظ‚ط© طھظپط§طµظٹظ„ ط§ظ„ط¹ط·ظ„.'
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
                    {isRTL ? 'طھط§ط±ظٹط® ظˆظˆظ‚طھ ط§ظ„ط¨ظ„ط§ط؛ (طھظ„ظ‚ط§ط¦ظٹ):' : 'Report Date & Time (Auto-recorded):'}
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
                      {uploadStatusText || (isRTL ? 'ط¬ط§ط±ظٹ ط¥ط±ط³ط§ظ„ ط§ظ„ط¨ظ„ط§ط؛...' : 'Submitting Report...')}
                    </span>
                  </>
                ) : isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isRTL ? 'ط¬ط§ط±ظٹ ظ…ط¹ط§ظ„ط¬ط© ط§ظ„طµظˆط±ط©...' : 'Processing Photo...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isRTL ? 'ط¥ط±ط³ط§ظ„ ط§ظ„ط¨ظ„ط§ط؛ ط§ظ„ط¢ظ†' : 'Submit Report'}</span>
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
          title={isRTL ? 'ظ…ط¹ط§ظٹظ†ط© طµظˆط±ط© ط§ظ„ط¹ط·ظ„ ظ‚ط¨ظ„ ط§ظ„ط¥ط±ط³ط§ظ„' : 'Incident Photo Preview'}
          subtitle={photoFileName || (selectedPlate ? `Vehicle: ${selectedPlate}` : undefined)}
        />
      )}

      {/* Footer */}
      <footer
        className="max-w-xl mx-auto w-full px-4 py-4 text-center text-[12px] flex flex-col sm:flex-row items-center justify-between gap-2"
        style={{
          color: 'var(--color-text-muted)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <span>
          {isRTL
            ? `آ© ${new Date().getFullYear()} ظ…ط¤ط³ط³ط© ط§ظ„ظ†ظˆط± ط§ظ„ظ…طھط­ط¯ط© ظ„ظ„ظ†ظ‚ظ„ â€¢ ط¨ظˆط§ط¨ط© ط¨ظ„ط§ط؛ط§طھ ط§ظ„ط£ط¹ط·ط§ظ„ ط§ظ„ط¹ط§ظ…ط© ط§ظ„ط¢ظ…ظ†ط©`
            : `آ© ${new Date().getFullYear()} Al-Noor United Transport Est. â€¢ Secure Public Issue Reporting`}
        </span>
        <a
          href="/"
          className="inline-flex items-center gap-1 font-semibold hover:underline transition"
          style={{ color: 'var(--color-ink)' }}
        >
          <Lock className="w-3 h-3" />
          <span>{isRTL ? 'ط¯ط®ظˆظ„ ظ…ظˆط¸ظپظٹ ط§ظ„ط¥ط¯ط§ط±ط© ظˆط§ظ„ظˆط±ط´ط©' : 'Fleet Staff Login'}</span>
        </a>
      </footer>
    </div>
  );
};
