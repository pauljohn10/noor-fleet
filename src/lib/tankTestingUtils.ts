import {
  Trailer,
  TankerTestRecord,
  TankTestType,
  TankTestStatus,
} from '../types';

export const ALL_TANK_TEST_TYPES: TankTestType[] = [
  'Hydrostatic Test',
  'Pneumatic Test',
  'Vacuum Test',
];

export interface LatestTankTestSummary {
  trailer: Trailer;
  testType: TankTestType;
  isRequired: boolean;
  latestRecord: TankerTestRecord | null;
  status: TankTestStatus;
  dueDiffDays: number | null;
  isOverdue: boolean;
  isExpiringSoon: boolean;
}

export interface TankTestingMetrics {
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  notTestedCount: number;
  upcomingExpirationsCount: number;
  overdueInspectionsCount: number;
  summaries: LatestTankTestSummary[];
  alertSummaries: LatestTankTestSummary[];
}

/**
 * Computes the latest status per (trailer, testType) across all trailers and historical records.
 * Historical records are sorted by (test_date DESC, created_at DESC) so the newest test result
 * is always treated as the active status while preserving all prior history.
 */
export function computeTankTestingMetrics(
  trailers: Trailer[],
  tankerTestRecords: TankerTestRecord[]
): TankTestingMetrics {
  const sorted = [...tankerTestRecords].sort((a, b) => {
    const dA = a.test_date ? new Date(a.test_date).getTime() : 0;
    const dB = b.test_date ? new Date(b.test_date).getTime() : 0;
    if (dB !== dA) return dB - dA;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const latestMap = new Map<string, TankerTestRecord>();
  for (const rec of sorted) {
    const key = `${rec.tanker_trailer_id}::${rec.test_type}`;
    if (!latestMap.has(key)) {
      latestMap.set(key, rec);
    }
  }

  const todayMs = new Date().setHours(0, 0, 0, 0);
  const summaries: LatestTankTestSummary[] = [];

  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let notTestedCount = 0;
  let upcomingExpirationsCount = 0;
  let overdueInspectionsCount = 0;

  for (const trailer of trailers) {
    const requiredList = Array.isArray(trailer.required_tank_tests)
      ? trailer.required_tank_tests
      : ALL_TANK_TEST_TYPES;

    for (const testType of ALL_TANK_TEST_TYPES) {
      const isRequired = requiredList.includes(testType);
      const latestRecord = latestMap.get(`${trailer.id}::${testType}`) || null;
      const status: TankTestStatus = latestRecord?.test_status || 'NOT TESTED';

      let dueDiffDays: number | null = null;
      if (latestRecord?.next_test_due_date) {
        const dueMs = new Date(latestRecord.next_test_due_date).setHours(0, 0, 0, 0);
        dueDiffDays = Math.ceil((dueMs - todayMs) / 86400000);
      }

      const isOverdue = dueDiffDays !== null && dueDiffDays < 0;
      const isExpiringSoon =
        dueDiffDays !== null && dueDiffDays >= 0 && dueDiffDays <= 30;

      // Count active test statuses (either recorded or required for this tanker)
      if (latestRecord || isRequired) {
        if (status === 'PASS') passedCount++;
        else if (status === 'FAIL') failedCount++;
        else if (status === 'PENDING') pendingCount++;
        else notTestedCount++;

        if (isOverdue) overdueInspectionsCount++;
        else if (isExpiringSoon) upcomingExpirationsCount++;
      }

      summaries.push({
        trailer,
        testType,
        isRequired,
        latestRecord,
        status,
        dueDiffDays,
        isOverdue,
        isExpiringSoon,
      });
    }
  }

  const alertSummaries = summaries.filter(
    (s) =>
      s.status === 'FAIL' ||
      s.status === 'PENDING' ||
      s.isOverdue ||
      s.isExpiringSoon
  );

  return {
    passedCount,
    failedCount,
    pendingCount,
    notTestedCount,
    upcomingExpirationsCount,
    overdueInspectionsCount,
    summaries,
    alertSummaries,
  };
}
