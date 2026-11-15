import React, { useState } from 'react';
import { Edit3, Trash2, Eye } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { VehicleDocument } from '../../types';
import { DocumentFormModal, COMMON_DOCUMENT_TYPES } from './DocumentFormModal';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { DESIGN_TOKENS } from '../../lib/designTokens';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  GhostButton,
  MetricStrip,
  StatusTabs,
  EditorialSelect,
  DataTable,
  DataRow,
  RowAction,
  StatusText,
  TableFooter,
} from '../common/EditorialUI';

export const DocumentList: React.FC = () => {
  const { documents, vehicles, trailers, deleteDocument } = useFleet();
  const { hasPermission, currentProfile } = useAuth();
  const { t, isRTL } = useI18n();

  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);
  const isSuperAdmin = hasPermission(['SUPER_ADMIN']);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<VehicleDocument | null>(null);
  const [isViewOnly, setIsViewOnly] = useState<boolean>(false);

  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'VEHICLE' | 'TRAILER'>('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const getDaysUntilExpiry = (expiryStr: string): number => {
    const exp = new Date(expiryStr);
    const today = new Date();
    exp.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
  };

  const getExpiryStatus = (expiryStr: string): 'EXPIRED' | 'EXPIRING_SOON' | 'VALID' => {
    const diff = getDaysUntilExpiry(expiryStr);
    if (diff < 0) return 'EXPIRED';
    if (diff <= 30) return 'EXPIRING_SOON';
    return 'VALID';
  };

  const filteredDocuments = documents.filter(d => {
    const veh = vehicles.find(v => v.id === d.vehicle_id);
    const trl = trailers.find(tr => tr.id === d.trailer_id);
    const q = search.toLowerCase().trim();

    const matchesSearch =
      !q ||
      d.document_number.toLowerCase().includes(q) ||
      d.document_type.toLowerCase().includes(q) ||
      (d.issuing_authority && d.issuing_authority.toLowerCase().includes(q)) ||
      (d.notes && d.notes.toLowerCase().includes(q)) ||
      (veh &&
        (veh.vehicle_id.toLowerCase().includes(q) ||
          veh.plate_number.toLowerCase().includes(q) ||
          veh.fleet_number.toLowerCase().includes(q))) ||
      (trl && (trl.trailer_id.toLowerCase().includes(q) || trl.plate_number.toLowerCase().includes(q)));

    const matchesType = typeFilter === 'ALL' || d.document_type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || getExpiryStatus(d.expiry_date) === statusFilter;
    const matchesAsset =
      assetFilter === 'ALL' ||
      (assetFilter === 'VEHICLE' && Boolean(d.vehicle_id)) ||
      (assetFilter === 'TRAILER' && Boolean(d.trailer_id));

    return matchesSearch && matchesType && matchesStatus && matchesAsset;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));
  const pagedDocuments = filteredDocuments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalCount = documents.length;
  const expiredCount = documents.filter(d => getExpiryStatus(d.expiry_date) === 'EXPIRED').length;
  const expiringSoonCount = documents.filter(d => getExpiryStatus(d.expiry_date) === 'EXPIRING_SOON').length;
  const compliantCount = totalCount - expiredCount - expiringSoonCount;

  const handleOpenAdd = () => {
    setEditingDoc(null);
    setIsViewOnly(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: VehicleDocument) => {
    setEditingDoc(doc);
    setIsViewOnly(false);
    setIsModalOpen(true);
  };

  const handleOpenView = (doc: VehicleDocument) => {
    setEditingDoc(doc);
    setIsViewOnly(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (doc: VehicleDocument) => {
    if (!isSuperAdmin) return;
    if (confirm(`${t('Are you sure you want to delete')} ${t(doc.document_type)} (${t('Doc #')}: ${doc.document_number})?`)) {
      await deleteDocument(doc.id, currentProfile?.full_name || 'Super Admin');
      setFeedback({
        type: 'success',
        message: `${t('Document')} ${doc.document_number} ${t('successfully deleted.')}`,
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleExportExcel = () => {
    const dateLocale = isRTL ? 'ar-SA-u-ca-gregory' : 'en-US';
    const data = filteredDocuments.map(d => {
      const veh = vehicles.find(v => v.id === d.vehicle_id);
      const trl = trailers.find(tr => tr.id === d.trailer_id);
      return {
        [t('Document Type')]: t(d.document_type),
        [t('Document Number')]: d.document_number,
        [t('Associated Asset')]: veh
          ? `${veh.vehicle_id} (${veh.plate_number})`
          : trl
            ? `${trl.trailer_id} (${trl.plate_number})`
            : t('Fleet Master'),
        [t('Issuing Authority')]: d.issuing_authority ? t(d.issuing_authority) : t('N/A'),
        [t('Issue Date')]: d.issue_date || t('N/A'),
        [t('Expiration Date')]: d.expiry_date,
        [t('Days Left')]: getDaysUntilExpiry(d.expiry_date),
        [t('Status')]: t(getExpiryStatus(d.expiry_date)),
        [t('Last Updated')]: d.updated_at ? new Date(d.updated_at).toLocaleDateString(dateLocale) : t('N/A'),
        [t('Updated By')]: d.updated_by || t('System'),
      };
    });
    exportToExcel(data, 'Vehicle_Permits_Istimara_Register');
  };

  const handleExportPDF = () => {
    const headers = [
      t('Document Type'),
      t('Document #'),
      t('Associated Unit'),
      t('Issuing Authority'),
      t('Issue Date'),
      t('Expiry Date'),
      t('Status'),
    ];
    const rows = filteredDocuments.map(d => {
      const veh = vehicles.find(v => v.id === d.vehicle_id);
      const trl = trailers.find(tr => tr.id === d.trailer_id);
      return [
        t(d.document_type),
        d.document_number,
        veh
          ? `${veh.vehicle_id} (${veh.plate_number})`
          : trl
            ? `${trl.trailer_id} (${trl.plate_number})`
            : t('Fleet Master'),
        d.issuing_authority ? t(d.issuing_authority) : t('Saudi Traffic Dept.'),
        d.issue_date || t('N/A'),
        d.expiry_date,
        t(getExpiryStatus(d.expiry_date)),
      ];
    });

    exportToPDFReport(
      t('Vehicle Permits & Istimara Compliance Register'),
      headers,
      rows,
      'Vehicle_Permits_Istimara_Register',
      {
        orientation: 'landscape',
        subtitle: t('Official Saudi Traffic Department (Muroor), Saudi Aramco Terminal Loading & Civil Defense Register'),
        summaryKPIs: [
          { label: t('Total Documents'), value: totalCount, color: 'slate' },
          { label: t('Compliant & Valid'), value: compliantCount, color: 'emerald' },
          { label: t('Expiring Soon (≤30d)'), value: expiringSoonCount, color: 'amber' },
          { label: t('Expired (Urgent)'), value: expiredCount, color: 'rose' },
        ],
        metadata: [
          { label: t('Status Filter'), value: statusFilter === 'ALL' ? t('All') : t(statusFilter) },
          { label: t('Asset Category'), value: assetFilter === 'ALL' ? t('All') : t(assetFilter) },
          { label: t('Export Scope'), value: `${filteredDocuments.length} ${t('units listed')}` },
        ],
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'تصاريح المركبات' : 'Vehicle Permits &'}
            <br />
            {isRTL ? 'وانتهاء الوثائق' : 'Document Expiries'}
          </>
        }
        subtitle={t('Saudi Istimara registration renewals, Comprehensive Insurance, Hydrostatic certificates, and Aramco loading permits.')}
        actions={
          <>
            <GhostButton onClick={handleExportExcel}>
              {t('Excel')}
            </GhostButton>
            <GhostButton onClick={handleExportPDF}>
              {isRTL ? 'تقرير PDF' : 'PDF report'}
            </GhostButton>
            {canManage && (
              <PrimaryButton onClick={handleOpenAdd}>
                {isRTL ? `+ ${t('Register Document')}` : '+ Register document'}
              </PrimaryButton>
            )}
          </>
        }
      />

      {feedback && (
        <div
          style={{
            marginBottom: 20,
            padding: '10px 14px',
            borderRadius: 4,
            border: '1px solid var(--color-border)',
            borderInlineStart: `3px solid ${
              feedback.type === 'success'
                ? DESIGN_TOKENS.colors.status.availableStripe
                : DESIGN_TOKENS.colors.status.outOfServiceStripe
            }`,
            background: 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 12,
              textDecoration: 'underline',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            {t('Dismiss')}
          </button>
        </div>
      )}

      <StatusTabs
        tabs={[
          { key: 'ALL', label: isRTL ? 'الكل' : 'All', count: totalCount },
          {
            key: 'VALID',
            label: isRTL ? 'ساري' : 'Valid',
            count: compliantCount,
            stripe: DESIGN_TOKENS.colors.status.availableStripe,
          },
          {
            key: 'EXPIRING_SOON',
            label: isRTL ? 'ينتهي قريباً' : 'Expiring soon',
            count: expiringSoonCount,
            stripe: DESIGN_TOKENS.colors.status.workshopStripe,
          },
          {
            key: 'EXPIRED',
            label: isRTL ? 'منتهي' : 'Expired',
            count: expiredCount,
            stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe,
          },
        ]}
        activeKey={statusFilter}
        onChange={k => {
          setStatusFilter(k);
          setPage(1);
        }}
        searchValue={search}
        onSearchChange={val => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={t('Search Document #, Unit Plate, Authority...')}
        extraFilters={
          <>
            <EditorialSelect
              value={typeFilter}
              onChange={e => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              width={175}
            >
              <option value="ALL">{t('All Document Types')}</option>
              {COMMON_DOCUMENT_TYPES.map((docTypeOpt: string) => (
                <option key={docTypeOpt} value={docTypeOpt}>
                  {t(docTypeOpt)}
                </option>
              ))}
            </EditorialSelect>
            <EditorialSelect
              value={assetFilter}
              onChange={e => {
                setAssetFilter(e.target.value as 'ALL' | 'VEHICLE' | 'TRAILER');
                setPage(1);
              }}
            >
              <option value="ALL">{t('All Asset Types')}</option>
              <option value="VEHICLE">{t('Tractor Trucks')}</option>
              <option value="TRAILER">{t('Tanker Trailers')}</option>
            </EditorialSelect>
          </>
        }
      />

      <DataTable
        columns={[
          { label: isRTL ? 'الوثيقة' : 'Document', align: 'start' },
          { label: isRTL ? 'المركبة / المقطورة' : 'Linked asset', align: 'start' },
          { label: isRTL ? 'رقم الوثيقة' : 'Document #', align: 'start' },
          { label: isRTL ? 'جهة الإصدار' : 'Authority', align: 'start' },
          { label: isRTL ? 'تاريخ الانتهاء' : 'Expiry date', align: 'start' },
          { label: isRTL ? 'الحالة' : 'Status', align: 'start' },
        ]}
        isEmpty={pagedDocuments.length === 0}
        emptyMessage={t('No vehicle permits or registration records matching the selected filters.')}
        onClearFilters={() => {
          setSearch('');
          setTypeFilter('ALL');
          setStatusFilter('ALL');
          setAssetFilter('ALL');
          setPage(1);
        }}
      >
        {pagedDocuments.map(d => {
          const veh = vehicles.find(v => v.id === d.vehicle_id);
          const trl = trailers.find(tr => tr.id === d.trailer_id);
          const daysLeft = getDaysUntilExpiry(d.expiry_date);
          const isExpired = daysLeft < 0;
          const isExpiringSoon = daysLeft >= 0 && daysLeft <= 30;
          const stripe = isExpired
            ? DESIGN_TOKENS.colors.status.outOfServiceStripe
            : isExpiringSoon
              ? DESIGN_TOKENS.colors.status.workshopStripe
              : DESIGN_TOKENS.colors.status.availableStripe;
          const textColor = isExpired
            ? DESIGN_TOKENS.colors.status.outOfServiceText
            : isExpiringSoon
              ? DESIGN_TOKENS.colors.status.workshopText
              : DESIGN_TOKENS.colors.status.availableText;
          const statusLabel = isExpired
            ? isRTL
              ? `منتهي (منذ ${Math.abs(daysLeft)} يوم)`
              : `Expired (${Math.abs(daysLeft)}d ago)`
            : daysLeft === 0
              ? isRTL
                ? 'ينتهي اليوم'
                : 'Expires today'
              : isExpiringSoon
                ? isRTL
                  ? `ينتهي خلال ${daysLeft} يوم`
                  : `Expiring in ${daysLeft}d`
                : isRTL
                  ? `ساري (${daysLeft} يوم)`
                  : `Valid (${daysLeft}d left)`;

          return (
            <DataRow
              key={d.id}
              stripeColor={stripe}
              onClick={() => (canManage ? handleOpenEdit(d) : handleOpenView(d))}
              actions={
                <>
                  {canManage ? (
                    <RowAction
                      icon={<Edit3 size={14} />}
                      title={t('Edit / Renew')}
                      onClick={() => handleOpenEdit(d)}
                    />
                  ) : (
                    <RowAction
                      icon={<Eye size={14} />}
                      title={t('View')}
                      onClick={() => handleOpenView(d)}
                    />
                  )}
                  {isSuperAdmin && (
                    <RowAction
                      icon={<Trash2 size={14} />}
                      title={t('Delete Document')}
                      danger
                      onClick={() => handleDelete(d)}
                    />
                  )}
                </>
              }
            >
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                  {t(d.document_type)}
                </div>
                {d.notes && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {d.notes}
                  </div>
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {veh ? (
                  <div>
                    <div
                      dir="ltr"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                      }}
                    >
                      {veh.vehicle_id} · {veh.plate_number}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {veh.make} {veh.model}
                    </div>
                  </div>
                ) : trl ? (
                  <div>
                    <div
                      dir="ltr"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                      }}
                    >
                      {trl.trailer_id} · {trl.plate_number}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {(trl.tank_capacity_liters || 0).toLocaleString()} {t('L')}
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {t('Fleet Master Policy')}
                  </span>
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-ink)',
                  }}
                >
                  {d.document_number}
                </span>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {d.issuing_authority ? t(d.issuing_authority) : t('N/A')}
                </span>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: textColor,
                  }}
                >
                  {d.expiry_date}
                </div>
                {d.issue_date && (
                  <div
                    dir="ltr"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11.5,
                      color: 'var(--color-text-muted)',
                      marginTop: 2,
                    }}
                  >
                    {isRTL ? 'صدر:' : 'Issued:'} {d.issue_date}
                  </div>
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText label={statusLabel} color={textColor} />
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${filteredDocuments.length} من ${documents.length} وثيقة`
            : `${filteredDocuments.length} of ${documents.length} documents`
        }
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />

      <DocumentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDoc(null);
          setIsViewOnly(false);
        }}
        initialDoc={editingDoc}
        isReadOnly={isViewOnly}
      />
    </PageContainer>
  );
};
