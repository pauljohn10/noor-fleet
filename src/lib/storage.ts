/**
 * Storage Helper - Noor Fleet ERP
 * Local mock data arrays have been COMPLETELY REMOVED.
 * Supabase is the sole source of truth for all operational records.
 */

const STORAGE_KEY_PREFIX = 'FWMS_V1_';

export class LocalStorageRepository {
  /**
   * Purge all legacy mock and demo data from browser storage.
   */
  static clearLegacyMockData(): void {
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('[Storage] Could not purge legacy cache:', e);
    }
  }

  // Safe empty fallbacks (Zero mock records)
  static getVehicles(): any[] { return []; }
  static getTrailers(): any[] { return []; }
  static getDrivers(): any[] { return []; }
  static getTechnicians(): any[] { return []; }
  static getWorkOrders(): any[] { return []; }
  static getParts(): any[] { return []; }
  static getSchedules(): any[] { return []; }
  static getInspections(): any[] { return []; }
  static getDocuments(): any[] { return []; }
  static getNotifications(): any[] { return []; }
  static getAuditLogs(): any[] { return []; }
  static getDefectReports(): any[] { return []; }
  static getTrips(): any[] { return []; }
  static getGpsDevices(): any[] { return []; }
  static getGpsPings(): any[] { return []; }
  static getFuelTransactions(): any[] { return []; }
  static getFuelBenchmarks(): any[] { return []; }
  static getTripReconciliations(): any[] { return []; }
  static getGpsSyncLogs(): any[] { return []; }

  static saveVehicles(_data: any): void {}
  static saveTrailers(_data: any): void {}
  static saveDrivers(_data: any): void {}
  static saveTechnicians(_data: any): void {}
  static saveWorkOrders(_data: any): void {}
  static saveParts(_data: any): void {}
  static saveSchedules(_data: any): void {}
  static saveInspections(_data: any): void {}
  static saveDocuments(_data: any): void {}
  static saveNotifications(_data: any): void {}
  static saveDefectReports(_data: any): void {}
  static addAuditLog(_data: any): void {}
  static addNotification(_data: any): void {}
}
