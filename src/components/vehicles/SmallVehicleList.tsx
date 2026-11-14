import React, { useState } from 'react';
import { Eye, Edit3, Trash2, Search, Plus, Car, FileSpreadsheet, FileText } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { SmallVehicleFormModal } from './SmallVehicleFormModal';
import { SmallVehicleDetailDrawer } from './SmallVehicleDetailDrawer';
import { SmallVehicle } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

export const SmallVehicleList: React.FC = () => {
  const { smallVehicles, deleteSmallVehicle } = useFleet();
  const { hasPermission } = useAuth();
  const { isRTL } = useI18n();

  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<SmallVehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<SmallVehicle | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Search filter across the 6 informative fields + Sn
  const filtered = smallVehicles.filter(v => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(v.sn).includes(q) ||
      v.plate_number.toLowerCase().includes(q) ||
      v.vehicle_number.toLowerCase().includes(q) ||
      (v.model_year && String(v.model_year).includes(q)) ||
      (v.brand && v.brand.toLowerCase().includes(q)) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(q)) ||
      (v.department_location && v.department_location.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Excel export using the 7 Excel reference columns
  const handleExportExcel = () => {
    const data = filtered.map(v => ({
      'Sn': v.sn,
      'Plate No.': v.plate_number,
      'Vehicle Number': v.vehicle_number,
      'Model Year': v.model_year || '—',
      'Brand': v.brand || '—',
      'Driver Name': v.driver_name || 'Unassigned / Standby',
      'Dept. / Location': v.department_location || '—',
      'Registered At': new Date(v.created_at).toLocaleDateString(),
    }));
    exportToExcel(data, 'Noor_Fleet_Small_Vehicles_Master');
  };

  // PDF report matching the 7 reference columns
  const handleExportPDF = () => {
    const headers = ['Sn', 'Plate No.', 'Vehicle Number', 'Model Year', 'Brand', 'Driver Name', 'Dept. / Location'];
    const rows = filtered.map(v => [
      `#${v.sn}`,
      v.plate_number,
      v.vehicle_number,
      v.model_year ? String(v.model_year) : '—',
      v.brand || '—',
      v.driver_name || 'Unassigned / Standby',
      v.department_location || '—',
    ]);

    exportToPDFReport(
      'Small Vehicles Master Register',
      headers,
      rows,
      'Small_Vehicles_Master_Register',
      {
        orientation: 'landscape',
        subtitle: 'Official Registry of Commercial Service Vehicles, Pickups & Administration Transport (public.small_vehicles)',
        summaryKPIs: [
          { label: 'Total Registered', value: smallVehicles.length, color: 'slate' },
          { label: 'Assigned Drivers', value: smallVehicles.filter(v => v.driver_name && !v.driver_name.toLowerCase().includes('standby')).length, color: 'emerald' },
          { label: 'Standby / Pool', value: smallVehicles.filter(v => !v.driver_name || v.driver_name.toLowerCase().includes('standby')).length, color: 'amber' },
        ],
        metadata: [
          { label: 'Schema Table', value: 'public.small_vehicles (Independent Master)' },
          { label: 'Scope', value: `${filtered.length} vehicles listed` },
        ],
      }
    );
  };

  const handleDelete = async (v: SmallVehicle) => {
    const confirmMsg = isRTL
      ? `هل أنت متأكد من حذف المركبة ${v.vehicle_number} (لوحة: ${v.plate_number})؟`
      : `Are you sure you want to delete small vehicle ${v.vehicle_number} (Plate: ${v.plate_number})?`;
    if (window.confirm(confirmMsg)) {
      try {
        await deleteSmallVehicle(v.id);
        if (selectedVehicle?.id === v.id) setSelectedVehicle(null);
      } catch (err: any) {
        alert(err?.message || 'Failed to delete vehicle.');
      }
    }
  };

  return (
    <div style={{ padding: '32px 32px 48px', fontFamily: 'var(--font-ui)', minHeight: '100vh' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{
              fontFamily: 'var(--font-brand)',
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: 'var(--color-ink)',
              margin: 0,
            }}>
              {isRTL ? 'سجل المركبات الصغيرة' : 'Small Vehicles Master'}
            </h1>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 4,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-brand-accent)',
              fontFamily: 'var(--font-mono)',
            }}>
              public.small_vehicles
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8, maxWidth: 620, lineHeight: 1.5 }}>
            {isRTL
              ? 'سجل مستقل مخصص لسيارات الخدمة، البيك آب، والسيارات الإدارية، منفصل تماماً عن سجل الشاحنات والمعدات الثقيلة.'
              : 'Independent ledger dedicated exclusively to commercial light service vehicles, pickups, and administrative transport, completely separate from heavy commercial trucks.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <GhostBtn onClick={handleExportExcel} disabled={filtered.length === 0} title={isRTL ? 'تصدير إكسل' : 'Export Excel'}>
            <FileSpreadsheet size={14} style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }} />
            <span>{isRTL ? 'إكسل' : 'Excel'}</span>
          </GhostBtn>
          <GhostBtn onClick={handleExportPDF} disabled={filtered.length === 0} title={isRTL ? 'تصدير PDF' : 'Export PDF'}>
            <FileText size={14} style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }} />
            <span>{isRTL ? 'تقرير PDF' : 'PDF Report'}</span>
          </GhostBtn>
          {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) && (
            <button
              onClick={() => { setEditingVehicle(null); setIsFormOpen(true); }}
              style={{
                padding: '7px 16px',
                background: 'var(--color-ink)',
                color: 'var(--color-page-bg)',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={15} />
              <span>{isRTL ? 'إضافة مركبة صغيرة' : 'Add Small Vehicle'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Info Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-row-divider)',
        paddingBottom: 12,
        marginBottom: 0,
        gap: 16,
      }}>
        {/* Left: Summary Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span>{isRTL ? 'إجمالي المركبات:' : 'Total Registered:'}</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--color-ink)',
              padding: '2px 8px',
              borderRadius: 4,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}>
              {smallVehicles.length}
            </span>
          </div>

          {search && (
            <span style={{ fontSize: 12, color: 'var(--color-brand-accent)' }}>
              {isRTL ? `(نتائج البحث: ${filtered.length})` : `(${filtered.length} matching)`}
            </span>
          )}
        </div>

        {/* Right: Search */}
        <div style={{ position: 'relative' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              insetInlineStart: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder={isRTL ? 'بحث باللوحة، الرقم، الماركة، السائق...' : 'Search plate, vehicle #, brand, driver, dept...'}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: 290,
              padding: '7px 10px 7px 30px',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-input-border)',
              borderRadius: 4,
              color: 'var(--color-ink)',
              outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--color-brand-accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-input-border)')}
          />
        </div>
      </div>

      {/* Table: Exact 7 Columns from Excel Reference + Actions */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-row-divider)' }}>
              {[
                { label: isRTL ? 'م (Sn)' : 'Sn',                          align: 'start' as const, width: '70px' },
                { label: isRTL ? 'رقم اللوحة' : 'Plate No.',               align: 'start' as const, width: '150px' },
                { label: isRTL ? 'رقم المركبة' : 'Vehicle Number',          align: 'start' as const, width: '140px' },
                { label: isRTL ? 'سنة الصنع' : 'Model Year',               align: 'start' as const, width: '110px' },
                { label: isRTL ? 'الماركة' : 'Brand',                      align: 'start' as const, width: '130px' },
                { label: isRTL ? 'اسم السائق' : 'Driver Name',             align: 'start' as const, width: '180px' },
                { label: isRTL ? 'القسم / الموقع' : 'Dept. / Location',    align: 'start' as const, width: 'auto' },
                { label: isRTL ? 'إجراءات' : 'Actions',                    align: 'end' as const,   width: '110px' },
              ].map((col, i) => (
                <th
                  key={i}
                  style={{
                    padding: '12px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    textAlign: col.align,
                    background: 'var(--color-page-bg)',
                    position: 'sticky',
                    top: 0,
                    whiteSpace: 'nowrap',
                    width: col.width,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '72px 16px', textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    marginBottom: 14,
                  }}>
                    <Car size={26} />
                  </div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                    marginBottom: 6,
                    fontFamily: 'var(--font-brand)',
                  }}>
                    {search
                      ? (isRTL ? 'لا توجد مركبات صغيرة مطابقة لمعايير البحث' : 'No small vehicles match query criteria')
                      : (isRTL ? 'لا توجد مركبات صغيرة مسجلة حتى الآن' : 'No small vehicles registered yet')}
                  </div>
                  <p style={{
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                    maxWidth: 460,
                    margin: '0 auto 18px',
                    lineHeight: 1.5,
                  }}>
                    {search
                      ? (isRTL ? 'حاول تغيير شروط البحث أو مسح الكلمات المدخلة.' : 'Try adjusting or clearing your search criteria.')
                      : (isRTL
                          ? 'السجل فارغ وجاهز لتسجيل أول مركبة صغيرة رسمية عبر النموذج المخصص.'
                          : 'The small vehicles register is clean and empty. Click below to add an official small vehicle.')}
                  </p>
                  {search ? (
                    <button
                      onClick={() => setSearch('')}
                      style={{
                        fontSize: 13,
                        color: 'var(--color-brand-accent)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                        textDecoration: 'underline',
                      }}
                    >
                      {isRTL ? 'مسح البحث' : 'Clear search'}
                    </button>
                  ) : hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) ? (
                    <button
                      onClick={() => { setEditingVehicle(null); setIsFormOpen(true); }}
                      style={{
                        padding: '8px 18px',
                        background: 'var(--color-ink)',
                        color: 'var(--color-page-bg)',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Plus size={14} />
                      <span>{isRTL ? 'تسجيل مركبة صغيرة' : 'Add Small Vehicle'}</span>
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              paged.map(v => (
                <SmallVehicleRow
                  key={v.id}
                  v={v}
                  isRTL={isRTL}
                  canEdit={hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER'])}
                  canDelete={hasPermission(['SUPER_ADMIN'])}
                  onView={() => setSelectedVehicle(v)}
                  onEdit={() => { setEditingVehicle(v); setIsFormOpen(true); }}
                  onDelete={() => handleDelete(v)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        borderTop: '1px solid var(--color-row-divider)',
        fontSize: 13,
        color: 'var(--color-text-muted)',
      }}>
        <span>
          {isRTL
            ? `${filtered.length} من أصل ${smallVehicles.length} مركبة مسجلة`
            : `${filtered.length} of ${smallVehicles.length} small vehicles registered`}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <GhostBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
            {isRTL ? 'السابق' : 'Previous'}
          </GhostBtn>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 8px', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            {page} / {totalPages}
          </span>
          <GhostBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            {isRTL ? 'التالي' : 'Next'}
          </GhostBtn>
        </div>
      </div>

      {/* Add / Edit Form Modal - STRICTLY 6 FIELDS */}
      <SmallVehicleFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialVehicle={editingVehicle}
        onSuccess={() => {
          // Handled reactively by FleetContext
        }}
      />

      {/* Vehicle Details Drawer - 7 REFERENCE FIELDS */}
      <SmallVehicleDetailDrawer
        vehicle={selectedVehicle}
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onEdit={v => {
          setSelectedVehicle(null);
          setEditingVehicle(v);
          setIsFormOpen(true);
        }}
        onDelete={v => handleDelete(v)}
        canEdit={hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER'])}
        canDelete={hasPermission(['SUPER_ADMIN'])}
      />
    </div>
  );
};

/* ── Small Vehicle Table Row (Strictly 7 Reference Columns + Hover Actions) ── */
const SmallVehicleRow: React.FC<{
  v: SmallVehicle;
  isRTL: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ v, isRTL, canEdit, canDelete, onView, onEdit, onDelete }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: '1px solid var(--color-row-divider)',
        background: hovered ? 'var(--color-row-hover)' : 'transparent',
        transition: 'background 0.12s',
        minHeight: 56,
      }}
    >
      {/* 1. Sn */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
        }}>
          #{v.sn}
        </span>
      </td>

      {/* 2. Plate No. */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1.5px solid var(--color-ink)',
          borderRadius: 4,
          overflow: 'hidden',
          background: 'var(--color-surface)',
        }}>
          <span style={{ width: 6, height: 22, background: 'var(--color-brand-accent)', flexShrink: 0 }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: 'var(--color-ink)',
            padding: '2px 8px',
            direction: 'ltr',
          }}>
            {v.plate_number}
          </span>
        </div>
      </td>

      {/* 3. Vehicle Number */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-ink)',
          direction: 'ltr',
        }}>
          {v.vehicle_number}
        </span>
      </td>

      {/* 4. Model Year */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: 'var(--color-ink)',
        }}>
          {v.model_year || '—'}
        </span>
      </td>

      {/* 5. Brand */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <span style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-ink)',
        }}>
          {v.brand || '—'}
        </span>
      </td>

      {/* 6. Driver Name */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        {v.driver_name && !v.driver_name.toLowerCase().includes('standby') ? (
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
            {v.driver_name}
          </span>
        ) : (
          <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            {isRTL ? 'غير مخصص / احتياط' : 'Unassigned / Standby'}
          </span>
        )}
      </td>

      {/* 7. Dept. / Location */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <span style={{
          fontSize: 12.5,
          color: 'var(--color-ink)',
          padding: '2px 8px',
          borderRadius: 3,
          background: 'var(--color-page-bg)',
          border: '1px solid var(--color-border)',
          display: 'inline-block',
        }}>
          {v.department_location || '—'}
        </span>
      </td>

      {/* 8. Actions (Hover View, Edit, Delete) */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'end', whiteSpace: 'nowrap' }}>
        <div style={{
          opacity: hovered ? 1 : 0.35,
          transition: 'opacity 0.12s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 4,
        }}>
          <RowAction icon={<Eye size={14} />} title={isRTL ? 'عرض التفاصيل' : 'View Details'} onClick={onView} />
          {canEdit && <RowAction icon={<Edit3 size={14} />} title={isRTL ? 'تعديل' : 'Edit'} onClick={onEdit} />}
          {canDelete && <RowAction icon={<Trash2 size={14} />} title={isRTL ? 'حذف' : 'Delete'} onClick={onDelete} danger />}
        </div>
      </td>
    </tr>
  );
};

const RowAction: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, title, onClick, danger }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 4,
        border: 'none',
        background: hovered ? (danger ? '#FEF2F2' : 'var(--color-sidebar-hover)') : 'transparent',
        color: hovered ? (danger ? '#991B1B' : 'var(--color-ink)') : 'var(--color-text-muted)',
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {icon}
    </button>
  );
};

const GhostBtn: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}> = ({ children, onClick, disabled, title }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        fontSize: 13,
        fontFamily: 'var(--font-ui)',
        fontWeight: 500,
        color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
        background: hovered && !disabled ? 'var(--color-sidebar-hover)' : 'transparent',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.12s, color 0.12s',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
};
