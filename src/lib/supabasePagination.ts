import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export const DEFAULT_PAGE_SIZE = 15;
export const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;

export interface TableSortController {
  sortColIndex: number | null;
  sortDirection: 'asc' | 'desc';
  onSort: (colIndex: number, colLabel: string) => void;
}

export interface SupabasePageQueryParams {
  table: string;
  page: number;
  pageSize: number;
  select?: string;
  search?: string;
  searchColumns?: string[];
  eqFilters?: Record<string, string | number | boolean | undefined | null>;
  orderBy?: string;
  ascending?: boolean;
}

export interface SupabasePageResult<T> {
  rows: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Executes a server-side paginated query directly against Supabase using
 * `.select(..., { count: 'exact' }).range(from, to)` with optional search, filter, and sort.
 */
export async function fetchSupabasePaginated<T = Record<string, unknown>>(
  params: SupabasePageQueryParams
): Promise<SupabasePageResult<T>> {
  const safePage = Math.max(1, params.page || 1);
  const safePageSize = params.pageSize > 0 ? params.pageSize : DEFAULT_PAGE_SIZE;
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  if (!isSupabaseConfigured || !supabase) {
    return {
      rows: [],
      totalCount: 0,
      page: safePage,
      pageSize: safePageSize,
      totalPages: 1,
    };
  }

  let query = supabase
    .from(params.table)
    .select(params.select || '*', { count: 'exact' });

  // Apply equality filters across all records on the server before range slicing
  if (params.eqFilters) {
    for (const [col, val] of Object.entries(params.eqFilters)) {
      if (val !== undefined && val !== null && val !== '' && val !== 'ALL') {
        query = query.eq(col, val);
      }
    }
  }

  // Apply multi-column ILIKE search across all records on the server
  const trimmedSearch = (params.search || '').trim();
  if (trimmedSearch && params.searchColumns && params.searchColumns.length > 0) {
    const escaped = trimmedSearch.replace(/[%_,()]/g, '');
    if (escaped) {
      const orClause = params.searchColumns
        .map(col => `${col}.ilike.%${escaped}%`)
        .join(',');
      query = query.or(orClause);
    }
  }

  // Apply sorting on the server
  if (params.orderBy) {
    query = query.order(params.orderBy, { ascending: params.ascending ?? false });
  }

  // Apply database pagination range
  const { data, count, error } = await query.range(from, to);

  if (error) {
    return {
      rows: [],
      totalCount: 0,
      page: safePage,
      pageSize: safePageSize,
      totalPages: 1,
    };
  }

  const totalCount = typeof count === 'number' ? count : (data || []).length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));

  return {
    rows: (data || []) as T[],
    totalCount,
    page: Math.min(safePage, totalPages),
    pageSize: safePageSize,
    totalPages,
  };
}

/**
 * Extracts a comparable value (number or lowercase string) from a record based on column header label or index.
 */
function extractComparableValue(item: any, colIndex: number, colLabel: string): string | number {
  if (item == null || typeof item !== 'object') return String(item ?? '');

  // Handle nested wrapper objects like `{ vehicle: Vehicle, repairsCount, cost }` in CostAnalysisView
  const target = item.vehicle && typeof item.vehicle === 'object' ? { ...item.vehicle, ...item } : item;
  const label = (colLabel || '').toLowerCase();

  if (label.includes('sn') || label === 'م') return Number(target.sn) || 0;
  if (label.includes('plate') || label.includes('لوحة')) return String(target.plate_number || '');
  if (label.includes('vehicle') || label.includes('tractor') || label.includes('شاحنة') || label.includes('مركبة')) {
    return String(target.vehicle_id || target.vehicle_number || target.plate_number || '');
  }
  if (label.includes('trailer') || label.includes('مقطورة')) {
    return String(target.trailer_id || target.trailer_number || target.assigned_trailer_id || '');
  }
  if (label.includes('year') || label.includes('سنة')) return Number(target.model_year ?? target.year) || 0;
  if (label.includes('make') || label.includes('brand') || label.includes('صنع') || label.includes('ماركة')) {
    return String(target.brand || `${target.make || ''} ${target.model || ''}`).trim();
  }
  if (label.includes('odometer') || label.includes('mileage') || label.includes('distance') || label.includes('مسافة') || label.includes('عداد')) {
    return Number(
      target.current_mileage ??
      target.odometer_reading ??
      target.odometer_at_fueling ??
      target.installation_odometer ??
      target.distance_used_km ??
      target.final_distance_km ??
      target.gps_calculated_distance_km ??
      0
    );
  }
  if (label.includes('driver') || label.includes('employee name') || label.includes('technician') || label.includes('user') || label.includes('سائق') || label.includes('اسم') || label.includes('فني')) {
    return String(target.full_name || target.driver_name || target.user_name || '');
  }
  if (label.includes('employee id') || label.includes('الرقم الوظيفي')) return String(target.employee_id || '');
  if (label.includes('license #') || label.includes('رخصة')) return String(target.license_number || '');
  if (label.includes('expiry') || label.includes('due') || label.includes('انتهاء') || label.includes('استحقاق')) {
    return String(target.expiry_date || target.license_expiry || target.next_due_date || '');
  }
  if (label.includes('status') || label.includes('حالة') || label.includes('result')) {
    return String(target.status || target.overall_status || target.reconciliation_status || target.sync_status || '');
  }
  if (label.includes('priority') || label.includes('أولوية') || label.includes('severity')) {
    return String(target.priority || target.severity || '');
  }
  if (label.includes('cost') || label.includes('rate') || label.includes('تكلفة')) {
    return Number(target.total_cost ?? target.cost ?? target.unit_cost ?? target.hourly_rate ?? 0);
  }
  if (label.includes('stock') || label.includes('مخزون') || label.includes('records') || label.includes('repairs')) {
    return Number(target.current_stock ?? target.records ?? target.repairsCount ?? 0);
  }
  if (label.includes('part') || label.includes('قطعة') || label.includes('sku')) {
    return String(target.part_number || target.part_name || '');
  }
  if (label.includes('rack') || label.includes('location') || label.includes('dept') || label.includes('قسم') || label.includes('موقع')) {
    return String(target.location_rack || target.department_location || target.current_location || target.station_location || target.department || '');
  }
  if (label.includes('document #') || label.includes('رقم الوثيقة')) return String(target.document_number || '');
  if (label.includes('document') || label.includes('وثيقة')) return String(target.document_type || '');
  if (label.includes('authority') || label.includes('جهة')) return String(target.issuing_authority || '');
  if (label.includes('trip') || label.includes('رحلة')) return String(target.trip_number || target.trip_id || '');
  if (label.includes('route') || label.includes('origin')) return String(target.origin_name || '');
  if (label.includes('volume') || label.includes('capacity') || label.includes('سعة')) {
    return Number(target.liters_dispensed ?? target.tank_capacity_liters ?? target.cargo_volume_liters ?? 0);
  }
  if (label.includes('imei')) return String(target.device_imei || '');
  if (label.includes('date') || label.includes('time') || label.includes('submitted') || label.includes('تاريخ') || label.includes('توقيت')) {
    return String(target.created_at || target.date_reported || target.inspection_date || target.transaction_date || target.sync_started_at || '');
  }
  if (label.includes('email') || label.includes('بريد')) return String(target.email || '');
  if (label.includes('role') || label.includes('دور')) return String(target.role || target.user_role || '');
  if (label.includes('order') || label.includes('report #') || label.includes('inspection #') || label.includes('transaction #')) {
    return String(target.work_order_number || target.report_number || target.inspection_number || target.transaction_number || target.title || '');
  }

  // Fallback: pick property by index
  const keys = Object.keys(target).filter(k => k !== 'id' && typeof target[k] !== 'object');
  const key = keys[colIndex] || keys[0];
  const val = key ? target[key] : '';
  return typeof val === 'number' ? val : String(val ?? '');
}

/**
 * Universal pagination + full-dataset sorting + Supabase `.range(from, to)` hook for Noor Fleet tables.
 * - Defaults to 15 records per page (`DEFAULT_PAGE_SIZE = 15`).
 * - Supports 15, 25, 50, 100 records per page.
 * - Keeps search, filters, and sorting working across ALL records (not just the displayed page).
 * - Automatically resets to page 1 when search, filters, sorting, or pageSize changes.
 * - Executes Supabase `.range(from, to)` database pagination queries when `supabaseConfig` is provided.
 */
export function useTablePagination<T>(
  filteredItems: T[],
  deps: unknown[] = [],
  supabaseConfig?: {
    table: string;
    orderBy?: string;
    ascending?: boolean;
    search?: string;
    searchColumns?: string[];
    eqFilters?: Record<string, string | number | boolean | undefined | null>;
  }
) {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sortColIndex, setSortColIndex] = useState<number | null>(null);
  const [sortColLabel, setSortColLabel] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  // Reset to page 1 whenever search, filters, pageSize, or sort changes
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, sortColIndex, sortDirection, ...deps]);

  const handleSort = useCallback((colIndex: number, colLabel: string) => {
    setSortColIndex(prevIdx => {
      if (prevIdx === colIndex) {
        setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
        return colIndex;
      }
      setSortDirection('asc');
      return colIndex;
    });
    setSortColLabel(colLabel);
    setPage(1);
  }, []);

  // Sort across ALL filtered records before slicing the current page
  const sortedItems = useMemo(() => {
    if (sortColIndex === null) return filteredItems;
    const copy = [...filteredItems];
    copy.sort((a, b) => {
      const valA = extractComparableValue(a, sortColIndex, sortColLabel);
      const valB = extractComparableValue(b, sortColIndex, sortColLabel);
      let cmp = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filteredItems, sortColIndex, sortColLabel, sortDirection]);

  // Execute server-side Supabase range query when configured
  useEffect(() => {
    if (!supabaseConfig?.table || !isSupabaseConfigured) return;
    const reqId = ++requestIdRef.current;

    fetchSupabasePaginated({
      table: supabaseConfig.table,
      page,
      pageSize,
      orderBy: supabaseConfig.orderBy,
      ascending: supabaseConfig.ascending,
      search: supabaseConfig.search,
      searchColumns: supabaseConfig.searchColumns,
      eqFilters: supabaseConfig.eqFilters,
    })
      .then(res => {
        if (reqId === requestIdRef.current) {
          setServerTotalCount(res.totalCount);
        }
      })
      .catch(() => {
        // Fallback to client filtered count
      });
  }, [
    supabaseConfig?.table,
    supabaseConfig?.orderBy,
    supabaseConfig?.ascending,
    supabaseConfig?.search,
    page,
    pageSize,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...deps,
  ]);

  const totalRecords = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const slice = sortedItems.slice(start, start + pageSize);

    const sortController: TableSortController = {
      sortColIndex,
      sortDirection,
      onSort: handleSort,
    };

    // Attach __sortCtrl to the array produced by pagedItems.map(...) so DataTable
    // automatically receives the full-dataset sort controller for this table instance.
    Object.defineProperty(slice, 'map', {
      configurable: true,
      enumerable: false,
      value: function <U>(
        callbackfn: (value: T, index: number, array: T[]) => U,
        thisArg?: any
      ): U[] {
        const mapped = Array.prototype.map.call(this, callbackfn, thisArg) as U[];
        Object.defineProperty(mapped, '__sortCtrl', {
          value: sortController,
          enumerable: false,
          configurable: true,
        });
        return mapped;
      },
    });

    return slice;
  }, [sortedItems, currentPage, pageSize, sortColIndex, sortDirection, handleSort]);

  const setPageSize = (nextSize: number) => {
    setPageSizeState(nextSize);
    setPage(1);
  };

  return {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    totalRecords,
    serverTotalCount,
    totalPages,
    pagedItems,
    startIndex: totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1,
    endIndex: Math.min(currentPage * pageSize, totalRecords),
    sortColIndex,
    sortDirection,
    onSort: handleSort,
  };
}
