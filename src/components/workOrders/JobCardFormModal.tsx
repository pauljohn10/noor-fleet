import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { WOPriority } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import {
    Wrench,
    AlertTriangle,
    Loader2,
    Truck,
    Calendar,
    AlertCircle,
    ShieldCheck,
} from 'lucide-react';
import {
    EDITORIAL_STATUS,
    PrimaryButton,
    SecondaryButton,
} from '../common/EditorialUI';

interface JobCardFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const JobCardFormModal: React.FC<JobCardFormModalProps> = ({ isOpen, onClose }) => {
    const { addWorkOrder, vehicles, trailers, drivers, technicians } = useFleet();
    const { currentProfile } = useAuth();
    const { t, isRTL } = useI18n();

    const [vehicleId, setVehicleId] = useState('');
    const [trailerId, setTrailerId] = useState('');
    const [driverId, setDriverId] = useState('');
    const [problemDescription, setProblemDescription] = useState('');
    const [priority, setPriority] = useState<WOPriority>('MEDIUM');
    const [assignedTechId, setAssignedTechId] = useState('');
    const [estimatedCompletion, setEstimatedCompletion] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!vehicleId || !problemDescription.trim()) {
            setErrorMessage(
                t('Please select a Target Tractor Truck and describe the reported breakdown problem.')
            );
            return;
        }

        setIsSubmitting(true);

        try {
            addWorkOrder({
                vehicle_id: vehicleId,
                trailer_id: trailerId || undefined,
                driver_id: driverId || undefined,
                reported_by: currentProfile.full_name,
                problem_description: problemDescription.trim(),
                priority,
                workshop_location_id: '10000000-0000-0000-0000-000000000001',
                assigned_supervisor_id: currentProfile.id,
                assigned_technician_id: assignedTechId || undefined,
                estimated_completion: estimatedCompletion
                    ? new Date(estimatedCompletion).toISOString()
                    : undefined,
                status: 'REPORTED',
            });

            onClose();
        } catch (err: any) {
            setErrorMessage(err.message || t('An error occurred while generating work order.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalFooter = (
        <>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: EDITORIAL_STATUS.green.text }} />
                <span>
                    {isRTL ? (
                        <>
                            سيتم إنشاء رقم أمر العمل تلقائياً بتسلسل{' '}
                            <code
                                style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }}
                                dir="ltr"
                            >
                                WO-2026-XXXXXX
                            </code>
                            .
                        </>
                    ) : (
                        <>
                            Job order ID will be auto-generated in{' '}
                            <code
                                style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }}
                            >
                                WO-2026-XXXXXX
                            </code>{' '}
                            sequence.
                        </>
                    )}
                </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 shrink-0">
                <SecondaryButton type="button" onClick={onClose} disabled={isSubmitting}>
                    {t('Cancel')}
                </SecondaryButton>
                <PrimaryButton type="submit" form="job-card-form" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{t('Generating Order...')}</span>
                        </>
                    ) : (
                        <span>{t('Generate Work Order')}</span>
                    )}
                </PrimaryButton>
            </div >
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('Open Digital Workshop Job Card')}
            subtitle={t(
                'Commission repair work order, assign lead mechanics, and schedule workshop throughput.'
            )}
            icon={<Wrench className="w-5 h-5" style={{ color: 'var(--color-brand-accent)' }} />}
            footer={modalFooter}
            maxWidth="3xl"
        >
            <form id="job-card-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
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

                {/* Section 1: Equipment & Personnel */}
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
                            <Truck className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                            <span>{t('Target Vehicle & Equipment Allocation')}</span>
                        </div>
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--color-brand-accent)' }}>
                            {t('* Required fields')}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div>
                            <label
                                className="text-xs font-semibold block mb-1"
                                style={{ color: 'var(--color-ink)' }}
                            >
                                {t('Target Tractor Truck')}{' '}
                                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
                            </label>
                            <select
                                required
                                value={vehicleId}
                                onChange={(e) => {
                                    setVehicleId(e.target.value);
                                    const v = vehicles.find((x) => x.id === e.target.value);
                                    if (v) {
                                        if (v.assigned_trailer_id) setTrailerId(v.assigned_trailer_id);
                                        if (v.assigned_driver_id) setDriverId(v.assigned_driver_id);
                                    }
                                }}
                                className="nf-field w-full font-semibold"
                            >
                                <option value="">{t('-- Select Tractor Head --')}</option>
                                {vehicles.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.vehicle_id} ({v.plate_number}) - {t('Fleet #')}
                                        {v.fleet_number}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                className="text-xs font-semibold block mb-1"
                                style={{ color: 'var(--color-ink)' }}
                            >
                                {t('Coupled Tanker Trailer')}
                            </label>
                            <select
                                value={trailerId}
                                onChange={(e) => setTrailerId(e.target.value)}
                                className="nf-field w-full"
                            >
                                <option value="">{t('-- None / Unassigned --')}</option>
                                {trailers.map((tr) => (
                                    <option key={tr.id} value={tr.id}>
                                        {tr.trailer_id} ({tr.plate_number}) -{' '}
                                        {(tr.tank_capacity_liters || 0).toLocaleString()} {t('L')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <label
                        className="text-xs font-semibold block mb-1"
                        style={{ color: 'var(--color-ink)' }}
                    >
                        {t('Reporting Driver')}
                    </label>
                    <select
                        value={driverId}
                        onChange={(e) => setDriverId(e.target.value)}
                        className="nf-field w-full"
                    >
                        <option value="">{t('-- Select Driver --')}</option>
                        {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.full_name} ({d.employee_id})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Section 2: Priority & Mechanic Allocation */}
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
                                2
                            </span>
                            <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                            <span>{t('Priority & Repair Scheduling')}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div>
                            <label
                                className="text-xs font-semibold block mb-1"
                                style={{ color: 'var(--color-ink)' }}
                            >
                                {t('Repair Urgency / Priority')}{' '}
                                <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as WOPriority)}
                                className="nf-field w-full font-semibold"
                                style={{
                                    color:
                                        priority === 'CRITICAL'
                                            ? EDITORIAL_STATUS.red.text
                                            : priority === 'HIGH'
                                                ? EDITORIAL_STATUS.amber.text
                                                : priority === 'MEDIUM'
                                                    ? EDITORIAL_STATUS.blue.text
                                                    : 'var(--color-ink)',
                                }}
                            >
                                <option value="LOW">{t('LOW (Scheduled Routine)')}</option>
                                <option value="MEDIUM">{t('MEDIUM (Standard Maintenance)')}</option>
                                <option value="HIGH">{t('HIGH (Urgent Dispatch Impact)')}</option>
                                <option value="CRITICAL">{t('CRITICAL (Aramco Safety Emergency)')}</option>
                            </select>
                        </div>

                        <div>
                            <label
                                className="text-xs font-semibold block mb-1"
                                style={{ color: 'var(--color-ink)' }}
                            >
                                {t('Lead Repair Technician')}
                            </label>
                            <select
                                value={assignedTechId}
                                onChange={(e) => setAssignedTechId(e.target.value)}
                                className="nf-field w-full"
                            >
                                <option value="">{t('-- Assign Mechanic Later --')}</option>
                                {technicians.map((tech) => (
                                    <option key={tech.id} value={tech.id}>
                                        {tech.full_name} ({tech.specialization})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <label
                        className="text-xs font-semibold block mb-1"
                        style={{ color: 'var(--color-ink)' }}
                    >
                        {t('Target Completion Date & Time')}
                    </label>
                    <input
                        type="datetime-local"
                        dir="ltr"
                        value={estimatedCompletion}
                        onChange={(e) => setEstimatedCompletion(e.target.value)}
                        className="nf-field w-full"
                        style={{ fontFamily: 'var(--font-mono)' }}
                    />
                </div>

                {/* Section 3: Breakdown Symptoms & Description */}
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
                            <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                            <span>{t('Reported Problem Symptoms & Work Scope')}</span>
                        </div>
                    </div>

                    <div>
                        <label
                            className="text-xs font-semibold block mb-1"
                            style={{ color: 'var(--color-ink)' }}
                        >
                            {t('Breakdown Details / Driver Symptoms')}{' '}
                            <span style={{ color: EDITORIAL_STATUS.red.text }}>*</span>
                        </label>
                        <textarea
                            required
                            rows={3}
                            placeholder={t(
                                'Describe symptoms clearly: e.g. Air compressor building pressure slowly, weepage at API discharge valve 3, ABS warning light active on dashboard...'
                            )}
                            value={problemDescription}
                            onChange={(e) => setProblemDescription(e.target.value)}
                            className="nf-field w-full leading-relaxed resize-none"
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
};
