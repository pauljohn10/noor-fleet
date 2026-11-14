import React from 'react';
import { X, Car, Calendar, User, MapPin, Tag, Hash, Clock, Edit3, Trash2 } from 'lucide-react';
import { SmallVehicle } from '../../types';
import { useI18n } from '../../context/I18nContext';

interface SmallVehicleDetailDrawerProps {
  vehicle: SmallVehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (vehicle: SmallVehicle) => void;
  onDelete?: (vehicle: SmallVehicle) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const SmallVehicleDetailDrawer: React.FC<SmallVehicleDetailDrawerProps> = ({
  vehicle,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = false,
}) => {
  const { isRTL } = useI18n();

  if (!isOpen || !vehicle) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--color-surface, #ffffff)',
          color: 'var(--color-ink, #0f172a)',
          boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          animation: 'slideIn 0.2s ease-out',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-row-divider, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-page-bg, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 6,
                background: 'var(--color-ink, #0f172a)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Car size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--color-brand-accent, #2563eb)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                SN #{vehicle.sn}
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: 'var(--font-brand, sans-serif)',
                  color: 'var(--color-ink, #0f172a)',
                }}
              >
                {vehicle.vehicle_number}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted, #64748b)',
              padding: 6,
              borderRadius: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Plate Highlight Badge */}
          <div
            style={{
              padding: '16px',
              borderRadius: 6,
              background: 'var(--color-page-bg, #f8fafc)',
              border: '1px solid var(--color-border, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                {isRTL ? 'لوحة الترخيص الرسمية' : 'Official Plate Number'}
              </span>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1.5px solid var(--color-ink, #0f172a)',
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: 'var(--color-surface, #ffffff)',
                }}
              >
                <span style={{ width: 8, height: 26, background: '#2563eb' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    padding: '2px 10px',
                    direction: 'ltr',
                    color: 'var(--color-ink, #0f172a)',
                  }}
                >
                  {vehicle.plate_number}
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'end' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                {isRTL ? 'الرقم التسلسلي' : 'Serial (Sn)'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--color-ink, #0f172a)',
                }}
              >
                #{vehicle.sn}
              </span>
            </div>
          </div>

          {/* Details Table - The 7 Excel fields */}
          <div
            style={{
              borderRadius: 6,
              border: '1px solid var(--color-row-divider, #f1f5f9)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--color-page-bg, #f8fafc)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-secondary, #475569)',
                borderBottom: '1px solid var(--color-row-divider, #f1f5f9)',
              }}
            >
              {isRTL ? 'بيانات السجل الرسمي' : 'Official Registry Specifications'}
            </div>

            <DetailRow
              icon={<Hash size={14} />}
              label={isRTL ? 'الرقم التسلسلي (Sn)' : 'Serial Number (Sn)'}
              value={`#${vehicle.sn}`}
              mono
            />
            <DetailRow
              icon={<Tag size={14} />}
              label={isRTL ? 'رقم اللوحة' : 'Plate No.'}
              value={vehicle.plate_number}
              mono
            />
            <DetailRow
              icon={<Car size={14} />}
              label={isRTL ? 'رقم المركبة' : 'Vehicle Number'}
              value={vehicle.vehicle_number}
              mono
            />
            <DetailRow
              icon={<Calendar size={14} />}
              label={isRTL ? 'سنة الصنع' : 'Model Year'}
              value={vehicle.model_year ? String(vehicle.model_year) : '—'}
              mono
            />
            <DetailRow
              icon={<Car size={14} />}
              label={isRTL ? 'الماركة / النوع' : 'Brand'}
              value={vehicle.brand || '—'}
            />
            <DetailRow
              icon={<User size={14} />}
              label={isRTL ? 'اسم السائق' : 'Driver Name'}
              value={vehicle.driver_name || (isRTL ? 'غير مخصص / احتياط' : 'Unassigned / Standby')}
            />
            <DetailRow
              icon={<MapPin size={14} />}
              label={isRTL ? 'القسم / الموقع' : 'Dept. / Location'}
              value={vehicle.department_location || '—'}
            />
          </div>

          {/* Metadata */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 6,
              background: 'var(--color-page-bg, #f8fafc)',
              fontSize: 11.5,
              color: 'var(--color-text-muted, #64748b)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} />
              <span>
                {isRTL ? 'تاريخ التسجيل:' : 'Registered:'}{' '}
                {new Date(vehicle.created_at).toLocaleString()}
              </span>
            </div>
            {vehicle.updated_at && vehicle.updated_at !== vehicle.created_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} />
                <span>
                  {isRTL ? 'آخر تحديث:' : 'Last Updated:'}{' '}
                  {new Date(vehicle.updated_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--color-row-divider, #f1f5f9)',
            background: 'var(--color-page-bg, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          {canDelete ? (
            <button
              onClick={() => onDelete?.(vehicle)}
              style={{
                padding: '8px 14px',
                borderRadius: 4,
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Trash2 size={14} />
              <span>{isRTL ? 'حذف' : 'Delete'}</span>
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 4,
                border: '1px solid var(--color-border, #cbd5e1)',
                background: 'transparent',
                color: 'var(--color-text-secondary, #475569)',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
            {canEdit && (
              <button
                onClick={() => onEdit?.(vehicle)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'var(--color-ink, #0f172a)',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Edit3 size={14} />
                <span>{isRTL ? 'تعديل السجل' : 'Edit Record'}</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}> = ({ icon, label, value, mono }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--color-row-divider, #f1f5f9)',
        fontSize: 12.5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary, #475569)' }}>
        <span style={{ color: 'var(--color-text-muted, #64748b)' }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div
        style={{
          fontWeight: 600,
          color: 'var(--color-ink, #0f172a)',
          fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit',
          direction: mono ? 'ltr' : 'inherit',
        }}
      >
        {value}
      </div>
    </div>
  );
};
