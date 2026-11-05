import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { VehicleDocument } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, Calendar, AlertTriangle, ShieldCheck, Clock, 
  Upload, ExternalLink, CheckCircle2, Truck, RefreshCw, Paperclip
} from 'lucide-react';

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

export const COMMON_DOCUMENT_TYPES = [
  'Vehicle Registration (Istimara)',
  'Comprehensive Insurance Policy',
  'Hydrostatic Tank Inspection Certificate',
  'Aramco Loading Permit (ADR)',
  'Saudi Transport Authority (TGA) Card',
  'Periodic Technical Inspection (MVPI / Fahas)',
  'Civil Defense Hazmat Safety Certificate',
  'Calibration / Meter Verification Certificate'
];

export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({
  isOpen,
  onClose,
  initialDoc,
  preselectedVehicleId,
  preselectedTrailerId,
  defaultVehicleId,
  defaultTrailerId,
  isReadOnly = false
}) => {
  const { vehicles, trailers, addDocument, updateDocument } = useFleet();
  const { currentProfile, hasPermission } = useAuth();

  const effectiveVehicleId = preselectedVehicleId || defaultVehicleId;
  const effectiveTrailerId = preselectedTrailerId || defaultTrailerId;

  const canEdit = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);
  const effectiveReadOnly = isReadOnly || !canEdit;

  const [docType, setDocType] = useState(initialDoc?.document_type || COMMON_DOCUMENT_TYPES[0]);
  const [docNumber, setDocNumber] = useState(initialDoc?.document_number || '');
  const [issueDate, setIssueDate] = useState(initialDoc?.issue_date || '');
  const [expiryDate, setExpiryDate] = useState(initialDoc?.expiry_date || '');
  const [issuingAuthority, setIssuingAuthority] = useState(initialDoc?.issuing_authority || 'Saudi General Directorate of Traffic (Mouror)');
  
  // Target vehicle or trailer
  const [unitCategory, setUnitCategory] = useState<'VEHICLE' | 'TRAILER' | 'FLEET'>('VEHICLE');
  const [selectedVehicleId, setSelectedVehicleId] = useState(initialDoc?.vehicle_id || effectiveVehicleId || '');
  const [selectedTrailerId, setSelectedTrailerId] = useState(initialDoc?.trailer_id || effectiveTrailerId || '');

  const [attachmentUrl, setAttachmentUrl] = useState(initialDoc?.attachment_url || '');
  const [attachmentName, setAttachmentName] = useState(initialDoc?.attachment_url ? 'Existing Document Attached' : '');
  const [notes, setNotes] = useState(initialDoc?.notes || '');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when editing or opening
  useEffect(() => {
    if (initialDoc) {
      setDocType(initialDoc.document_type);
      setDocNumber(initialDoc.document_number);
      setIssueDate(initialDoc.issue_date || '');
      setExpiryDate(initialDoc.expiry_date);
      setIssuingAuthority(initialDoc.issuing_authority || '');
      if (initialDoc.vehicle_id) {
        setUnitCategory('VEHICLE');
        setSelectedVehicleId(initialDoc.vehicle_id);
        setSelectedTrailerId('');
      } else if (initialDoc.trailer_id) {
        setUnitCategory('TRAILER');
        setSelectedTrailerId(initialDoc.trailer_id);
        setSelectedVehicleId('');
      } else {
        setUnitCategory('FLEET');
        setSelectedVehicleId('');
        setSelectedTrailerId('');
      }
      setAttachmentUrl(initialDoc.attachment_url || '');
      setAttachmentName(initialDoc.attachment_url ? 'Attachment on Record' : '');
      setNotes(initialDoc.notes || '');
    } else {
      setDocType(COMMON_DOCUMENT_TYPES[0]);
      setDocNumber('');
      const today = new Date().toISOString().slice(0, 10);
      setIssueDate(today);
      // Default expiry 1 year from now
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      setExpiryDate(oneYearLater.toISOString().slice(0, 10));
      setIssuingAuthority('Saudi General Directorate of Traffic (Mouror)');
      
      if (effectiveTrailerId) {
        setUnitCategory('TRAILER');
        setSelectedTrailerId(effectiveTrailerId);
        setSelectedVehicleId('');
      } else if (effectiveVehicleId) {
        setUnitCategory('VEHICLE');
        setSelectedVehicleId(effectiveVehicleId);
        setSelectedTrailerId('');
      } else {
        setUnitCategory('VEHICLE');
        setSelectedVehicleId(vehicles[0]?.id || '');
        setSelectedTrailerId('');
      }

      setAttachmentUrl('');
      setAttachmentName('');
      setNotes('');
    }
    setErrorMessage(null);
  }, [initialDoc, preselectedVehicleId, preselectedTrailerId, isOpen, vehicles]);

  // Quick renewal button handler (+1 Year, +2 Years, +3 Years)
  const handleQuickRenew = (years: number) => {
    if (effectiveReadOnly) return;
    const baseDate = expiryDate ? new Date(expiryDate) : new Date();
    const now = new Date();
    const effectiveBase = isNaN(baseDate.getTime()) || baseDate < now ? now : baseDate;

    const renewed = new Date(effectiveBase);
    renewed.setFullYear(renewed.getFullYear() + years);
    const renewedStr = renewed.toISOString().slice(0, 10);
    setExpiryDate(renewedStr);

    const todayStr = now.toISOString().slice(0, 10);
    if (!issueDate || new Date(issueDate) < now) {
      setIssueDate(todayStr);
    }

    const renewalNote = `Renewed on ${todayStr} for +${years} year(s).`;
    setNotes(prev => (prev ? `${prev} | ${renewalNote}` : renewalNote));
  };

  const getDaysPreview = () => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    const today = new Date();
    exp.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
  };

  const daysPreview = getDaysPreview();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (effectiveReadOnly) return;
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
      const previewUrl = URL.createObjectURL(file);
      setAttachmentUrl(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanNumber = docNumber.trim();
    if (!cleanNumber) {
      setErrorMessage('Please enter a valid document or certificate number.');
      return;
    }

    if (!expiryDate) {
      setErrorMessage('Please select a valid expiration date.');
      return;
    }

    setIsSaving(true);

    try {
      const docPayload = {
        document_type: docType,
        document_number: cleanNumber,
        issue_date: issueDate || undefined,
        expiry_date: expiryDate,
        vehicle_id: unitCategory === 'VEHICLE' ? (selectedVehicleId || undefined) : undefined,
        trailer_id: unitCategory === 'TRAILER' ? (selectedTrailerId || undefined) : undefined,
        issuing_authority: issuingAuthority.trim() || undefined,
        attachment_url: attachmentUrl.trim() || undefined,
        notes: notes.trim() || undefined
      };

      if (initialDoc) {
        await updateDocument(initialDoc.id, docPayload, currentProfile?.full_name || 'Fleet Manager');
      } else {
        await addDocument(docPayload, currentProfile?.full_name || 'Fleet Manager');
      }

      setIsSaving(false);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      setErrorMessage(err?.message || 'Failed to save document. Please verify all fields and retry.');
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedTrailer = trailers.find(t => t.id === selectedTrailerId);

  const modalFooter = (
    <>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Permit status and dashboard compliance indicators refresh automatically upon saving.</span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition active:scale-95 cursor-pointer shadow-2xs"
        >
          {effectiveReadOnly ? 'Close' : 'Cancel'}
        </button>

        {!effectiveReadOnly && (
          <button
            type="submit"
            form="document-form"
            disabled={isSaving}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5 text-slate-950" />
                <span>{initialDoc ? 'Save Expiry & Renew Document' : 'Register Vehicle Document'}</span>
              </>
            )}
          </button>
        )}
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        effectiveReadOnly
          ? `Document Details: ${initialDoc?.document_number || docNumber}`
          : initialDoc
          ? `Edit & Renew Legal Document: ${initialDoc.document_number}`
          : 'Register Legal Vehicle Permit & Istimara'
      }
      subtitle={
        effectiveReadOnly
          ? 'Read-only view of vehicle compliance credentials and certification records.'
          : initialDoc
          ? 'Update expiration date, record renewal authority, and replace official attachments.'
          : 'Configure compliance expiry alerts, Saudi Istimara registration, and Aramco permits.'
      }
      icon={<FileText className="w-5 h-5 text-amber-600" />}
      footer={modalFooter}
      maxWidth="3xl"
    >
      <form id="document-form" onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold text-xs">{errorMessage}</span>
          </div>
        )}

        {/* Expiration Visual Banner for Renewals */}
        {initialDoc && (
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-sky-500/10 border border-amber-300/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Renewal Status Verification
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600">Previous Expiry:</span>
                <span className="font-mono font-bold text-slate-800">{initialDoc.expiry_date}</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600">New Expiry:</span>
                <span className="font-mono font-extrabold text-amber-700">{expiryDate || '—'}</span>
              </div>
            </div>

            {!effectiveReadOnly && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Extend:</span>
                <button
                  type="button"
                  onClick={() => handleQuickRenew(1)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/70 text-amber-900 font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  +1 Yr
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRenew(2)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/70 text-amber-900 font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  +2 Yrs
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRenew(3)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  +3 Yrs (Istimara)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Section 1: Document Classification & Identifier */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">1</span>
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Document Classification & Identifier</span>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
              * Required fields
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Document Type <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={effectiveReadOnly}
                value={docType}
                onChange={e => {
                  setDocType(e.target.value);
                  if (e.target.value.includes('Istimara') || e.target.value.includes('Registration')) {
                    setIssuingAuthority('Saudi General Directorate of Traffic (Mouror)');
                  } else if (e.target.value.includes('Insurance')) {
                    setIssuingAuthority('Tawuniya / Bupa Cooperative Insurance');
                  } else if (e.target.value.includes('Hydrostatic') || e.target.value.includes('Vapor')) {
                    setIssuingAuthority('Saudi Civil Defense / SASO Tanker Inspector');
                  } else if (e.target.value.includes('Aramco')) {
                    setIssuingAuthority('Saudi Aramco Distribution & Safety Department');
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:text-slate-600 transition"
              >
                {COMMON_DOCUMENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Document / Certificate Ref Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={effectiveReadOnly}
                placeholder="e.g. IST-901829 or POL-88210"
                value={docNumber}
                onChange={e => setDocNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold uppercase placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:text-slate-600 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Fleet Unit Association */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">2</span>
              <Truck className="w-4 h-4 text-slate-500" />
              <span>Fleet Asset Association</span>
            </div>
            <div className="flex items-center gap-2">
              {(['VEHICLE', 'TRAILER', 'FLEET'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  disabled={effectiveReadOnly}
                  onClick={() => setUnitCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                    unitCategory === cat
                      ? 'bg-amber-500 text-slate-950 shadow-2xs font-black'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {cat === 'VEHICLE' ? 'Tractor Head' : cat === 'TRAILER' ? 'Tanker Trailer' : 'General Fleet'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {unitCategory === 'VEHICLE' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Tractor Head <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={effectiveReadOnly}
                  value={selectedVehicleId}
                  onChange={e => setSelectedVehicleId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 transition"
                >
                  <option value="">-- Choose Truck --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_id} ({v.plate_number}) - Fleet #{v.fleet_number} ({v.make})
                    </option>
                  ))}
                </select>
                {selectedVehicle && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Vin: <span className="font-mono">{selectedVehicle.vin}</span> • {selectedVehicle.station_location}
                  </p>
                )}
              </div>
            )}

            {unitCategory === 'TRAILER' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Tanker Trailer <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={effectiveReadOnly}
                  value={selectedTrailerId}
                  onChange={e => setSelectedTrailerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 transition"
                >
                  <option value="">-- Choose Tanker --</option>
                  {trailers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.trailer_id} ({t.plate_number}) - {t.tank_capacity_liters.toLocaleString()}L ({t.model})
                    </option>
                  ))}
                </select>
                {selectedTrailer && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Vin: <span className="font-mono">{selectedTrailer.vin}</span> • {selectedTrailer.tank_type}
                  </p>
                )}
              </div>
            )}

            {unitCategory === 'FLEET' && (
              <div className="md:col-span-1 p-3 bg-slate-100/70 rounded-xl text-xs text-slate-600 border border-slate-200/80">
                This document applies to enterprise-wide operations or transport company licenses.
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Issuing Authority / Agency
              </label>
              <input
                type="text"
                disabled={effectiveReadOnly}
                placeholder="e.g. Saudi Traffic Police (Mouror)"
                value={issuingAuthority}
                onChange={e => setIssuingAuthority(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Validity & Expiration */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">3</span>
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Validity & Expiration Dates</span>
            </div>
            {daysPreview !== null && (
              <span className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded ${
                daysPreview < 0
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : daysPreview <= 30
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {daysPreview < 0
                  ? `EXPIRED (${Math.abs(daysPreview)} Days Ago)`
                  : daysPreview === 0
                  ? 'EXPIRES TODAY'
                  : `${daysPreview} Days of Validity Remaining`}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Issue / Renewal Date
              </label>
              <input
                type="date"
                disabled={effectiveReadOnly}
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Expiration Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                disabled={effectiveReadOnly}
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full rounded-lg border-2 border-amber-400 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Document Attachment & Renewal Remarks */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">4</span>
              <Paperclip className="w-4 h-4 text-slate-500" />
              <span>Attachment & Renewal Audit Remarks</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Document Digital Attachment (PDF / Image)
              </label>
              <div className="flex items-center gap-2">
                <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-slate-300 bg-white transition ${
                  effectiveReadOnly ? 'cursor-not-allowed opacity-60' : 'hover:border-amber-500 hover:bg-amber-50/50 cursor-pointer'
                }`}>
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {attachmentName || 'Choose or Replace File (PDF, PNG, JPG)'}
                  </span>
                  <input
                    type="file"
                    disabled={effectiveReadOnly}
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {attachmentUrl && (
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition"
                    title="Preview Document"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Renewal Notes & Audit Remarks
              </label>
              <input
                type="text"
                disabled={effectiveReadOnly}
                placeholder="e.g. Istimara renewal completed via Absher Business portal."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 transition"
              />
            </div>
          </div>
        </div>

        {/* Audit Meta (if editing existing) */}
        {initialDoc && (
          <div className="px-3.5 py-2 bg-slate-100/70 rounded-xl text-[11px] text-slate-500 font-mono flex flex-wrap items-center justify-between gap-2 border border-slate-200/60">
            <span>Created: {new Date(initialDoc.created_at).toLocaleString()}</span>
            {initialDoc.updated_at && (
              <span>Last Updated: {new Date(initialDoc.updated_at).toLocaleString()} {initialDoc.updated_by ? `by ${initialDoc.updated_by}` : ''}</span>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};
