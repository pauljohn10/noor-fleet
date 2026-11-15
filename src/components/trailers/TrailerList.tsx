import React, { useState, useMemo } from 'react';
import { Trash2, Edit3, Eye, FlaskConical } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { TrailerFormModal } from './TrailerFormModal';
import { TrailerDetailDrawer } from './TrailerDetailDrawer';
import { Trailer } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { DESIGN_TOKENS } from '../../lib/designTokens';
import { useTablePagination } from '../../lib/supabasePagination';
import { computeTankTestingMetrics, ALL_TANK_TEST_TYPES } from '../../lib/tankTestingUtils';
import {
  EDITORIAL_STATUS,
  PageContainer,
  PageHeader,
  PrimaryButton,
  GhostButton,
  StatusTabs,
  DataTable,
  DataRow,
  RowAction,
  PlateChip,
  StatusText,
  TableFooter,
  EmptyDash,
  EditorialSection,
  MetricStrip,
} from '../common/EditorialUI';

const TRAILER_STATUS_META: Record<
  string,
  { stripe: string; text: string; label: string; labelAr: string }
> = {
  AVAILABLE: {
    stripe: DESIGN_TOKENS.colors.status.availableStripe,
    text: DESIGN_TOKENS.colors.status.availableText,
    label: 'Available',
    labelAr: 'متاحة',
  },
  ASSIGNED: {
    stripe: DESIGN_TOKENS.colors.status.onTripStripe,
    text: DESIGN_TOKENS.colors.status.onTripText,
    label: 'Assigned',
    labelAr: 'مخصصة',
  },
  IN_WORKSHOP: {
    stripe: DESIGN_TOKENS.colors.status.workshopStripe,
    text: DESIGN_TOKENS.colors.status.workshopText,
    label: 'In workshop',
    labelAr: 'في الورشة',
  },
  OUT_OF_SERVICE: {
    stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe,
    text: DESIGN_TOKENS.colors.status.outOfServiceText,
    label: 'Out of service',
    labelAr: 'خارج الخدمة',
  },
};

export const TrailerList: React.FC = () => {
  const { trailers, deleteTrailer, vehicles, tankerTestRecords } = useFleet();
  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<string>('overview');
  const [editingTrailer, setEditingTrailer] = useState<Trailer | undefined>(undefined);

  const tankTestMetrics = useMemo(
    () => computeTankTestingMetrics(trailers, tankerTestRecords),
    [trailers, tankerTestRecords]
  );

  const filteredTrailers = trailers.filter(tr => {
    const q = search.toLowerCase();
    const matchesSearch =
      tr.trailer_id.toLowerCase().includes(q) ||
      tr.plate_number.toLowerCase().includes(q) ||
      tr.trailer_number.toLowerCase().includes(q) ||
      tr.vin.toLowerCase().includes(q) ||
      (tr.manufacturer || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || tr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pagedItems: pagedTrailers,
  } = useTablePagination(filteredTrailers, [search, statusFilter], {
    table: 'trailers',
    orderBy: 'created_at',
    ascending: false,
    search,
    searchColumns: ['trailer_id', 'plate_number', 'trailer_number', 'vin', 'manufacturer'],
    eqFilters: { status: statusFilter },
  });

  const handleExportExcel = () => {
    const data = filteredTrailers.map(tr => ({
      [t('Trailer ID')]: tr.trailer_id,
      [t('Trailer #')]: tr.trailer_number,
      [t('Plate Number')]: tr.plate_number,
      [t('Capacity (Liters)')]: tr.tank_capacity_liters,
      [t('Compartments')]: tr.number_of_compartments,
      [t('Manufacturer')]: tr.manufacturer,
      [t('VIN')]: tr.vin,
      [t('Status')]: t(tr.status),
      [t('Current Location')]: tr.current_location,
    }));
    exportToExcel(data, 'Fuel_Tanker_Trailers');
  };

  const handleExportPDF = () => {
    const headers = [
      t('Trailer ID'),
      t('Plate Number'),
      t('Tank Type'),
      t('Capacity (L)'),
      t('Compartments'),
      t('Coupled Tractor'),
      t('Depot Location'),
      t('Status'),
    ];
    const rows = filteredTrailers.map(tr => {
      const tractor = vehicles.find(v => v.id === tr.assigned_tractor_id);
      return [
        tr.trailer_id,
        tr.plate_number,
        tr.tank_type || t('Fuel Tanker'),
        `${(tr.tank_capacity_liters || 0).toLocaleString()} ${t('L')}`,
        `${tr.number_of_compartments} ${t('Compartments')}`,
        tractor ? `${tractor.vehicle_id} (${tractor.plate_number})` : t('Uncoupled'),
        tr.current_location || t('Dammam'),
        t(tr.status),
      ];
    });

    const totalCap = trailers.reduce((sum, tr) => sum + (tr.tank_capacity_liters || 0), 0);
    const assignedCount = trailers.filter(tr => tr.status === 'ASSIGNED').length;

    exportToPDFReport(
      t('Al-Noor Tanker Trailer Master Registry'),
      headers,
      rows,
      'Tanker_Trailer_Master_Registry',
      {
        orientation: 'landscape',
        subtitle: t('Heavy Commercial Fuel Tanker Trailers, Shell Specifications, Coupling Matrix & Depots'),
        summaryKPIs: [
          { label: t('Total Tankers'), value: trailers.length, color: 'slate' },
          {
            label: t('Total Fleet Capacity'),
            value: `${((totalCap || 0) / 1000).toLocaleString()}K ${t('Liters')}`,
            color: 'sky',
          },
          { label: t('Coupled to Tractor'), value: assignedCount, color: 'emerald' },
        ],
        metadata: [
          { label: t('Status Filter'), value: statusFilter === 'ALL' ? t('All Statuses') : t(statusFilter) },
          { label: t('Export Scope'), value: `${filteredTrailers.length} ${t('trailers')}` },
        ],
      }
    );
  };

  const canEdit = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);
  const canDelete = hasPermission(['SUPER_ADMIN']);

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'مقطورات صهاريج' : 'Fuel Tanker'}
            <br />
            {isRTL ? 'نقل الوقود' : 'Trailers Register'}
          </>
        }
        subtitle={t('Directory of multi-compartment fuel tankers, API bottom loading valves, and hydrostatic safety certifications.')}
        actions={
          <>
            <GhostButton onClick={handleExportExcel}>
              {t('Excel')}
            </GhostButton>
            <GhostButton onClick={handleExportPDF}>
              {isRTL ? 'تقرير PDF' : 'PDF report'}
            </GhostButton>
            {canEdit && (
              <PrimaryButton
                onClick={() => {
                  setEditingTrailer(undefined);
                  setIsFormOpen(true);
                }}
              >
                {isRTL ? `+ ${t('Add Tanker Trailer')}` : '+ Add tanker trailer'}
              </PrimaryButton>
            )}
          </>
        }
      />

      <EditorialSection
        title={isRTL ? 'ملخص فحوصات واختبارات الصهاريج' : 'Tank testing & inspection summary'}
        marginTop={0}
      >
        <MetricStrip
          items={[
            {
              label: isRTL ? 'الاختبارات الناجحة' : 'Passed tests',
              value: tankTestMetrics.passedCount,
              mono: true,
              stripe: EDITORIAL_STATUS.green.stripe,
            },
            {
              label: isRTL ? 'الاختبارات الراسبة' : 'Failed tests',
              value: tankTestMetrics.failedCount,
              mono: true,
              stripe: EDITORIAL_STATUS.red.stripe,
            },
            {
              label: isRTL ? 'الاختبارات قيد الانتظار' : 'Pending tests',
              value: tankTestMetrics.pendingCount,
              mono: true,
              stripe: EDITORIAL_STATUS.amber.stripe,
            },
            {
              label: isRTL ? 'قرب انتهاء الصلاحية (30 يوم)' : 'Upcoming test expirations',
              value: tankTestMetrics.upcomingExpirationsCount,
              mono: true,
              stripe: EDITORIAL_STATUS.amber.stripe,
            },
            {
              label: isRTL ? 'الفحوصات المتأخرة' : 'Overdue inspections',
              value: tankTestMetrics.overdueInspectionsCount,
              mono: true,
              stripe: EDITORIAL_STATUS.red.stripe,
            },
          ]}
        />
      </EditorialSection>

      <StatusTabs
        tabs={[
          { key: 'ALL', label: isRTL ? 'الكل' : 'All', count: trailers.length },
          ...(['AVAILABLE', 'ASSIGNED', 'IN_WORKSHOP', 'OUT_OF_SERVICE'] as const).map(st => ({
            key: st,
            label: isRTL ? TRAILER_STATUS_META[st].labelAr : TRAILER_STATUS_META[st].label,
            count: trailers.filter(tr => tr.status === st).length,
            stripe: TRAILER_STATUS_META[st].stripe,
          })),
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
        searchPlaceholder={t('Search Trailer ID, Plate, VIN...')}
      />

      <DataTable
        columns={[
          { label: isRTL ? 'المقطورة واللوحة' : 'Trailer', align: 'start', width: '16%' },
          { label: isRTL ? 'السعة والجيوب' : 'Capacity and compartments', align: 'start', width: '14%' },
          { label: isRTL ? 'الشركة المصنعة' : 'Manufacturer and model', align: 'start', width: '16%' },
          { label: isRTL ? 'فحوصات الصهريج (H / P / V)' : 'Tank testing & inspection', align: 'start', width: '20%' },
          { label: isRTL ? 'الجرار المقترن' : 'Coupled tractor', align: 'start', width: '12%' },
          { label: isRTL ? 'المحطة الحالية' : 'Current terminal', align: 'start', width: '12%' },
          { label: isRTL ? 'الحالة' : 'Status', align: 'start', width: '10%' },
        ]}
        isEmpty={pagedTrailers.length === 0}
        emptyMessage={t('No tanker trailers found matching criteria.')}
        onClearFilters={() => {
          setSearch('');
          setStatusFilter('ALL');
          setPage(1);
        }}
      >
        {pagedTrailers.map(tr => {
          const tractor = vehicles.find(v => v.id === tr.assigned_tractor_id);
          const meta = TRAILER_STATUS_META[tr.status] || TRAILER_STATUS_META.AVAILABLE;
          const trTestSummaries = ALL_TANK_TEST_TYPES.map(tt =>
            tankTestMetrics.summaries.find(
              s => s.trailer.id === tr.id && s.testType === tt
            )
          );

          return (
            <DataRow
              key={tr.id}
              stripeColor={meta.stripe}
              onClick={() => {
                setDrawerInitialTab('overview');
                setSelectedTrailer(tr);
              }}
              actions={
                <>
                  <RowAction
                    icon={<FlaskConical size={14} />}
                    title={t('Tank Testing & Inspection')}
                    onClick={() => {
                      setDrawerInitialTab('tank_testing');
                      setSelectedTrailer(tr);
                    }}
                  />
                  <RowAction
                    icon={<Eye size={14} />}
                    title={t('View Details')}
                    onClick={() => {
                      setDrawerInitialTab('overview');
                      setSelectedTrailer(tr);
                    }}
                  />
                  {canEdit && (
                    <RowAction
                      icon={<Edit3 size={14} />}
                      title={t('Edit Trailer')}
                      onClick={() => {
                        setEditingTrailer(tr);
                        setIsFormOpen(true);
                      }}
                    />
                  )}
                  {canDelete && (
                    <RowAction
                      icon={<Trash2 size={14} />}
                      title={t('Delete Trailer')}
                      danger
                      onClick={() => {
                        const msg = isRTL
                          ? `هل أنت متأكد من حذف المقطورة ${tr.trailer_id}؟`
                          : `Are you sure you want to delete trailer ${tr.trailer_id}?`;
                        if (confirm(msg)) deleteTrailer(tr.id);
                      }}
                    />
                  )}
                </>
              }
            >
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ marginBottom: 6 }}>
                  <PlateChip plate={tr.plate_number} />
                </div>
                <div
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {tr.trailer_id} · #{tr.trailer_number}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-ink)' }}>
                  <span dir="ltr">{(tr.tank_capacity_liters || 0).toLocaleString()}</span>{' '}
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t('L')}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {tr.number_of_compartments} {t('Compartments')}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)' }}>
                  {tr.manufacturer}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {tr.model} ({tr.year})
                </div>
              </td>

              <td
                style={{ padding: '14px 16px', verticalAlign: 'middle' }}
                onClick={e => {
                  e.stopPropagation();
                  setDrawerInitialTab('tank_testing');
                  setSelectedTrailer(tr);
                }}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {trTestSummaries.map((s, idx) => {
                    const shortLabel =
                      idx === 0
                        ? isRTL
                          ? 'هيدرو'
                          : 'Hyd'
                        : idx === 1
                        ? isRTL
                          ? 'هوائي'
                          : 'Pne'
                        : isRTL
                        ? 'تفريغ'
                        : 'Vac';
                    const st = s?.status || 'NOT TESTED';
                    const dotColor =
                      st === 'PASS'
                        ? EDITORIAL_STATUS.green.stripe
                        : st === 'FAIL'
                        ? EDITORIAL_STATUS.red.stripe
                        : st === 'PENDING'
                        ? EDITORIAL_STATUS.amber.stripe
                        : EDITORIAL_STATUS.muted.stripe;
                    return (
                      <span
                        key={idx}
                        title={`${ALL_TANK_TEST_TYPES[idx]}: ${st}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '2px 7px',
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 3,
                          color: 'var(--color-ink)',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 1,
                            background: dotColor,
                          }}
                        />
                        <span>{shortLabel}:</span>
                        <span style={{ fontWeight: 600 }}>{st}</span>
                      </span>
                    );
                  })}
                </div>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {tractor ? (
                  <div>
                    <span
                      dir="ltr"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                        borderBottom: '1px solid var(--color-border)',
                        paddingBottom: 1,
                      }}
                    >
                      {tractor.vehicle_id}
                    </span>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {tractor.plate_number}
                    </div>
                  </div>
                ) : (
                  <EmptyDash label={t('Unassigned')} />
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {tr.current_location || '—'}
                </span>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText label={isRTL ? meta.labelAr : meta.label} color={meta.text} />
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${filteredTrailers.length} من ${trailers.length} مقطورة`
            : `${filteredTrailers.length} of ${trailers.length} trailers`
        }
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={filteredTrailers.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />

      <TrailerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialTrailer={editingTrailer}
      />

      <TrailerDetailDrawer
        trailer={selectedTrailer}
        isOpen={!!selectedTrailer}
        onClose={() => setSelectedTrailer(null)}
        initialTab={drawerInitialTab}
      />
    </PageContainer>
  );
};
