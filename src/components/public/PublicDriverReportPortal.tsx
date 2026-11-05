import React, { useState, useEffect, useRef } from 'react';
import {
  Flame, Truck, User, Wrench, Zap, Disc, AlertTriangle, HelpCircle,
  Camera, CheckCircle2, Clock, ShieldCheck, Globe, X, Send, Loader2,
  AlertCircle, Lock
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { DefectReportCategory } from '../../types';

const ISSUE_CATEGORIES: {
  value: DefectReportCategory;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  icon: React.ReactNode;
  activeClass: string;
}[] = [
  {
    value: 'Mechanical',
    labelEn: 'Mechanical',
    labelAr: 'ميكانيكي',
    descEn: 'Engine, brakes, transmission, air or fuel system',
    descAr: 'المحرك، الفرامل، القير، الهواء أو الوقود',
    icon: <Wrench className="w-5 h-5" />,
    activeClass: 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/25',
  },
  {
    value: 'Electrical',
    labelEn: 'Electrical',
    labelAr: 'كهربائي',
    descEn: 'Battery, lights, sensors, starter, wiring',
    descAr: 'البطارية، الإضاءة، الحساسات، الضفيرة',
    icon: <Zap className="w-5 h-5" />,
    activeClass: 'border-sky-500 bg-sky-50 text-sky-950 ring-2 ring-sky-500/25',
  },
  {
    value: 'Tire',
    labelEn: 'Tire',
    labelAr: 'الإطارات',
    descEn: 'Flat tire, blowout, tread wear, wheel hub',
    descAr: 'بنشر، تلف الإطار، الجنط أو الرمان',
    icon: <Disc className="w-5 h-5" />,
    activeClass: 'border-indigo-500 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500/25',
  },
  {
    value: 'Accident',
    labelEn: 'Accident',
    labelAr: 'حادث مروري',
    descEn: 'Collision, body damage, emergency hazard',
    descAr: 'تصادم، تلفيات بالهيكل، طوارئ الطريق',
    icon: <AlertTriangle className="w-5 h-5" />,
    activeClass: 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/25',
  },
  {
    value: 'Other',
    labelEn: 'Other',
    labelAr: 'أخرى',
    descEn: 'Tanker valve, cabin, AC, or general issue',
    descAr: 'صمامات الصهريج، المكيف، أو ملاحظة أخرى',
    icon: <HelpCircle className="w-5 h-5" />,
    activeClass: 'border-slate-600 bg-slate-100 text-slate-950 ring-2 ring-slate-500/20',
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
        v => v.plate_number.toUpperCase() === prefillPlate.toUpperCase()
      );
      if (matched) {
        setSelectedPlate(matched.plate_number);
      } else {
        setSelectedPlate('__CUSTOM__');
        setCustomPlate(prefillPlate.toUpperCase());
      }
    }
  }, [vehicles]);

  const matchedVehicle = vehicles.find(v => v.plate_number === selectedPlate);
  const matchedTrailer = matchedVehicle?.assigned_trailer_id
    ? trailers.find(t => t.id === matchedVehicle.assigned_trailer_id)
    : undefined;

  // Compress & convert uploaded image to lightweight JPEG Data URL
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(
        isRTL
          ? 'يرجى اختيار ملف صورة صالح (JPG أو PNG).'
          : 'Please select a valid image file (JPG, PNG, or WEBP).'
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(
        isRTL
          ? 'حجم الصورة كبير جداً (الحد الأقصى 10 ميجابايت).'
          : 'Image file is too large (maximum 10 MB).'
      );
      return;
    }

    setErrorMsg(null);
    setPhotoFileName(file.name);

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
          setPhotoDataUrl(compressedDataUrl);
        } else {
          setPhotoDataUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoDataUrl(undefined);
    setPhotoFileName('');
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

    try {
      const result = await submitPublicDriverReport({
        driver_name: driverName.trim(),
        plate_number: finalPlate,
        category,
        description: description.trim(),
        photo_url: photoDataUrl,
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
          hasPhoto: Boolean(photoDataUrl),
        });
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isRTL ? 'حدث خطأ أثناء إرسال البلاغ.' : 'An unexpected error occurred while submitting.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewReport = () => {
    setSubmittedRecord(null);
    setDescription('');
    setPhotoDataUrl(undefined);
    setPhotoFileName('');
    setErrorMsg(null);
  };

  return (
    <div
      className={`min-h-screen w-full bg-slate-100 flex flex-col justify-between font-sans ${
        isRTL ? '[direction:rtl] text-right' : '[direction:ltr] text-left'
      }`}
    >
      {/* Top Brand Header Bar */}
      <header className="bg-gradient-to-r from-[#081a44] via-[#0d2870] to-[#081a44] text-white border-b border-amber-400/30 shadow-md">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-400/20 shrink-0">
              <Flame className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-white">NOOR FLEET</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {isRTL ? 'بوابة السائقين' : 'Driver Portal'}
                </span>
              </div>
              <p className="text-[11px] text-sky-200/90 font-medium">
                {isRTL
                  ? 'مؤسسة النور المتحدة للنقل — قسم الصيانة والأسطول'
                  : 'Al-Noor United Transport Est. — Fleet & Workshop Division'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'en' ? 'العربية' : 'English'}</span>
          </button>
        </div>
      </header>

      {/* Main Mobile-Friendly Container */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-5 sm:py-8">
        {submittedRecord ? (
          /* ============================================================ */
          /* CONFIRMATION VIEW AFTER SUCCESSFUL SUBMISSION                */
          /* ============================================================ */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-black tracking-tight">
                {isRTL ? 'تم إرسال البلاغ بنجاح!' : 'Report Submitted Successfully!'}
              </h2>
              <p className="text-xs text-emerald-100 mt-1 max-w-sm mx-auto leading-relaxed">
                {isRTL
                  ? 'تم تسجيل بلاغ العطل مباشرة في نظام صيانة أسطول النور وإشعار مشرف الورشة.'
                  : 'Your vehicle issue has been recorded directly in the Noor Fleet Maintenance System and dispatched to the workshop team.'}
              </p>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Reference Number Highlight */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  {isRTL ? 'رقم مرجع البلاغ' : 'Official Report Reference'}
                </span>
                <span className="font-mono text-2xl font-black text-slate-900 mt-0.5 block">
                  {submittedRecord.reportNumber}
                </span>
              </div>

              {/* Submitted Details Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
                <div>
                  <span className="text-slate-400 font-semibold block">
                    {isRTL ? 'اسم السائق' : 'Driver Name'}
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {submittedRecord.driverName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">
                    {isRTL ? 'رقم اللوحة / المركبة' : 'Vehicle Plate / Unit'}
                  </span>
                  <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                    {submittedRecord.plateNumber} ({submittedRecord.vehicleId})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">
                    {isRTL ? 'تصنيف المشكلة' : 'Issue Category'}
                  </span>
                  <span className="font-bold text-amber-800 mt-0.5 block">
                    {submittedRecord.category}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">
                    {isRTL ? 'تاريخ ووقت البلاغ' : 'Recorded Date & Time'}
                  </span>
                  <span className="font-mono text-slate-700 mt-0.5 block text-[11px]">
                    {new Date(submittedRecord.submittedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetForNewReport}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-sm transition active:scale-[0.99] cursor-pointer"
              >
                {isRTL ? 'إرسال بلاغ آخر' : 'Submit Another Issue Report'}
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* PUBLIC DRIVER ISSUE REPORT FORM                              */
          /* ============================================================ */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden">
            {/* Form Title Banner */}
            <div className="px-5 py-5 bg-slate-50/90 border-b border-slate-200/90">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isRTL ? 'الإبلاغ عن مشكلة في المركبة' : 'Report a Vehicle Issue'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {isRTL ? 'بدون تسجيل دخول' : 'No Login Needed'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
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
                    onChange={e => setHoneypotUrl(e.target.value)}
                  />
                </label>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Driver Name (Required) */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-4 h-4 text-amber-600" />
                    {isRTL ? 'اسم السائق' : 'Driver Name'}{' '}
                    <span className="text-rose-500">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  required
                  list="noor-registered-drivers"
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  placeholder={
                    isRTL ? 'أدخل اسمك الكامل (مثال: محمد علي خان)' : 'Enter your full name (e.g. Mohammed Ali Khan)'
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
                <datalist id="noor-registered-drivers">
                  {drivers.map(d => (
                    <option key={d.id} value={d.full_name} />
                  ))}
                </datalist>
              </div>

              {/* 2. Vehicle Plate Number (Required, selectable from existing registered vehicles) */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-600" />
                    {isRTL ? 'رقم لوحة المركبة' : 'Vehicle Plate Number'}{' '}
                    <span className="text-rose-500">*</span>
                  </span>
                </label>
                <select
                  required
                  value={selectedPlate}
                  onChange={e => {
                    setSelectedPlate(e.target.value);
                    const veh = vehicles.find(v => v.plate_number === e.target.value);
                    if (veh && !driverName.trim() && veh.assigned_driver_id) {
                      const assignedDrv = drivers.find(d => d.id === veh.assigned_driver_id);
                      if (assignedDrv) setDriverName(assignedDrv.full_name);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition cursor-pointer"
                >
                  <option value="">
                    {isRTL ? '-- اختر رقم لوحة الشاحنة --' : '-- Select Vehicle Plate Number --'}
                  </option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.plate_number}>
                      {v.plate_number} — {v.vehicle_id} ({v.make} {v.model})
                    </option>
                  ))}
                  <option value="__CUSTOM__">
                    {isRTL ? 'لوحة أخرى (إدخال يدوي)...' : 'Other Plate Number (Enter Manually)...'}
                  </option>
                </select>

                {selectedPlate === '__CUSTOM__' && (
                  <input
                    type="text"
                    required
                    value={customPlate}
                    onChange={e => setCustomPlate(e.target.value.toUpperCase())}
                    placeholder={isRTL ? 'أدخل رقم اللوحة (مثال: LBR-4921)' : 'Enter Plate Number (e.g. LBR-4921)'}
                    className="mt-2.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-mono font-bold text-slate-900 uppercase placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                )}

                {matchedVehicle && (
                  <div className="mt-2 px-3.5 py-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-800">
                      {isRTL ? 'المركبة المسجلة:' : 'Linked Fleet Unit:'}{' '}
                      <span className="font-mono text-amber-900">{matchedVehicle.vehicle_id}</span> —{' '}
                      {matchedVehicle.make} {matchedVehicle.model}
                    </span>
                    {matchedTrailer && (
                      <span className="font-mono font-bold text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded border border-sky-200">
                        {isRTL ? 'المقطورة:' : 'Trailer:'} {matchedTrailer.trailer_id} ({matchedTrailer.plate_number})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Issue Category (Mechanical, Electrical, Tire, Accident, Other) */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-2">
                  {isRTL ? 'تصنيف المشكلة' : 'Issue Category'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ISSUE_CATEGORIES.map(item => {
                    const isSelected = category === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setCategory(item.value)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-left rtl:text-right transition cursor-pointer ${
                          isSelected
                            ? item.activeClass
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-800'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isSelected ? 'bg-white shadow-2xs' : 'bg-white border border-slate-200/80 text-slate-600'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-sm leading-tight">
                            {isRTL ? item.labelAr : item.labelEn}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
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
                <label className="block text-sm font-extrabold text-slate-800 mb-1.5">
                  {isRTL ? 'وصف المشكلة بالتفصيل' : 'Issue Description'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={
                    isRTL
                      ? 'اشرح المشكلة أو العطل الذي لاحظته في الشاحنة...'
                      : 'Describe what happened, any warning lights, unusual noises, or leaks...'
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition resize-y"
                />
              </div>

              {/* 5. Photo Upload (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-extrabold text-slate-800">
                    <span className="inline-flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-600" />
                      {isRTL ? 'إرفاق صورة للمشكلة' : 'Photo Upload'}
                    </span>
                  </label>
                  <span className="text-xs font-semibold text-slate-400">
                    {isRTL ? 'اختياري' : 'Optional'}
                  </span>
                </div>

                {!photoDataUrl ? (
                  <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl bg-slate-50/70 hover:bg-amber-50/30 transition cursor-pointer text-center">
                    <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 block">
                        {isRTL ? 'اضغط لالتقاط صورة أو اختيارها من الهاتف' : 'Tap to take a photo or upload from phone'}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        JPG, PNG — {isRTL ? 'يتم ضغط الصورة تلقائياً' : 'Automatically optimized for mobile upload'}
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
                  <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-3">
                    <img
                      src={photoDataUrl}
                      alt="Uploaded vehicle issue preview"
                      className="w-20 h-20 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {photoFileName || (isRTL ? 'صورة مرفقة' : 'Attached Issue Photo')}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isRTL ? 'جاهزة للإرسال مع البلاغ' : 'Ready to attach with report'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                      title={isRTL ? 'حذف الصورة' : 'Remove photo'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 6. Report Date & Time (Automatically Recorded) */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-semibold">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{isRTL ? 'تاريخ ووقت البلاغ (تلقائي):' : 'Report Date & Time (Auto-recorded):'}</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {currentTime.toLocaleString([], {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base shadow-md shadow-amber-500/20 transition active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isRTL ? 'جاري إرسال البلاغ...' : 'Submitting Report...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>{isRTL ? 'إرسال البلاغ الآن' : 'Submit Report'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full px-4 py-4 text-center text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200/70">
        <span>
          © {new Date().getFullYear()} Al-Noor United Transport Est. • Secure Public Issue Reporting
        </span>
        <a
          href="/"
          className="inline-flex items-center gap-1 font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <Lock className="w-3 h-3" />
          <span>{isRTL ? 'دخول موظفي الإدارة والورشة' : 'Fleet Staff Login'}</span>
        </a>
      </footer>
    </div>
  );
};

