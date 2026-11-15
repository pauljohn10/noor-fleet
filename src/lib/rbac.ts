import { SystemRole, UserRole } from '../types';
import type { NavItemKey } from '../components/layout/Sidebar';

/**
 * Canonical 6 System Roles for Noor Fleet & Workshop Management System
 */
export const ALL_SYSTEM_ROLES: SystemRole[] = [
  'SUPER_ADMIN',
  'FLEET_MANAGER',
  'WORKSHOP_MANAGER',
  'FLEET_STAFF',
  'WORKSHOP_STAFF',
  'VIEWER',
];

/**
 * Role groups for granular module & operation enforcement
 */
export const FLEET_WRITE_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'FLEET_MANAGER',
  'FLEET_STAFF',
];

export const FLEET_DELETE_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'FLEET_MANAGER',
];

export const WORKSHOP_WRITE_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'WORKSHOP_MANAGER',
  'WORKSHOP_STAFF',
];

export const WORKSHOP_DELETE_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'WORKSHOP_MANAGER',
];

export const INVENTORY_WRITE_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'WORKSHOP_MANAGER',
  'WORKSHOP_STAFF',
];

export const TANK_TESTING_WRITE_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'FLEET_MANAGER',
  'FLEET_STAFF',
];

export const SHARED_INSPECTION_WRITE_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'FLEET_MANAGER',
  'WORKSHOP_MANAGER',
  'FLEET_STAFF',
  'WORKSHOP_STAFF',
];

export const EXPORT_ALLOWED_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'FLEET_MANAGER',
  'WORKSHOP_MANAGER',
  'FLEET_STAFF',
  'WORKSHOP_STAFF',
  'VIEWER',
  'MANAGEMENT',
];

/**
 * Normalizes any raw database or metadata role value into one of the 6 canonical roles.
 * Maps legacy 'MANAGEMENT' to 'VIEWER', 'WORKSHOP_SUPERVISOR' to 'WORKSHOP_MANAGER', etc.
 */
export function normalizeRole(rawRole?: string | null): SystemRole {
  const cleaned = (rawRole || '').trim().toUpperCase();
  switch (cleaned) {
    case 'SUPER_ADMIN':
      return 'SUPER_ADMIN';
    case 'FLEET_MANAGER':
      return 'FLEET_MANAGER';
    case 'WORKSHOP_MANAGER':
    case 'WORKSHOP_SUPERVISOR':
      return 'WORKSHOP_MANAGER';
    case 'FLEET_STAFF':
    case 'OPERATIONS_STAFF':
      return 'FLEET_STAFF';
    case 'WORKSHOP_STAFF':
    case 'MECHANIC':
    case 'STOREKEEPER':
      return 'WORKSHOP_STAFF';
    case 'VIEWER':
    case 'MANAGEMENT':
    default:
      return 'VIEWER';
  }
}

/**
 * Returns true if the role is strictly read-only (Viewer / legacy Management).
 */
export function isViewerRole(role?: UserRole | string | null): boolean {
  return normalizeRole(role) === 'VIEWER';
}

/**
 * Sidebar & Module Navigation Access Matrix per Role
 * Hides unauthorized sidebar items and prevents unauthorized tab navigation.
 */
export const ROLE_NAV_ACCESS: Record<SystemRole, NavItemKey[]> = {
  SUPER_ADMIN: [
    'dashboard',
    'liveMap',
    'trips',
    'fuelMonitoring',
    'gpsSync',
    'vehicles',
    'smallVehicles',
    'trailers',
    'drivers',
    'inspections',
    'statusMatrix',
    'workOrders',
    'preventive',
    'inventory',
    'technicians',
    'documents',
    'reports',
    'analytics',
    'userManagement',
    'auditLog',
  ],
  FLEET_MANAGER: [
    'dashboard',
    'liveMap',
    'trips',
    'fuelMonitoring',
    'gpsSync',
    'vehicles',
    'smallVehicles',
    'trailers',
    'drivers',
    'inspections',
    'statusMatrix',
    'workOrders',
    'preventive',
    'documents',
    'reports',
    'analytics',
  ],
  WORKSHOP_MANAGER: [
    'dashboard',
    'vehicles',
    'smallVehicles',
    'trailers',
    'inspections',
    'statusMatrix',
    'workOrders',
    'preventive',
    'inventory',
    'technicians',
    'documents',
    'reports',
    'analytics',
  ],
  FLEET_STAFF: [
    'dashboard',
    'liveMap',
    'trips',
    'fuelMonitoring',
    'gpsSync',
    'vehicles',
    'smallVehicles',
    'trailers',
    'drivers',
    'inspections',
    'statusMatrix',
    'documents',
    'reports',
  ],
  WORKSHOP_STAFF: [
    'dashboard',
    'vehicles',
    'smallVehicles',
    'trailers',
    'inspections',
    'statusMatrix',
    'workOrders',
    'preventive',
    'inventory',
    'technicians',
    'reports',
  ],
  VIEWER: [
    'dashboard',
    'liveMap',
    'trips',
    'fuelMonitoring',
    'vehicles',
    'smallVehicles',
    'trailers',
    'drivers',
    'inspections',
    'statusMatrix',
    'workOrders',
    'preventive',
    'inventory',
    'documents',
    'reports',
    'analytics',
  ],
};

export function canAccessNavTab(role: UserRole | string | null | undefined, tab: NavItemKey): boolean {
  const normalized = normalizeRole(role);
  return ROLE_NAV_ACCESS[normalized]?.includes(tab) ?? false;
}

/**
 * Evaluates whether a user with `currentRole` satisfies `allowedRoles`.
 * - SUPER_ADMIN always has access.
 * - VIEWER ('VIEWER' / 'MANAGEMENT') NEVER matches write-restricted checks unless 'VIEWER' or 'MANAGEMENT' is explicitly included.
 */
export function evaluateRolePermission(
  currentRole: UserRole | string | null | undefined,
  allowedRoles: UserRole[]
): boolean {
  const normalized = normalizeRole(currentRole);

  if (normalized === 'SUPER_ADMIN') {
    return true;
  }

  if (allowedRoles.includes(normalized)) {
    return true;
  }

  // Fleet Staff has write/edit access across Fleet modules that check for FLEET_MANAGER
  if (normalized === 'FLEET_STAFF' && allowedRoles.includes('FLEET_MANAGER')) {
    return true;
  }

  if (normalized === 'VIEWER' && allowedRoles.includes('MANAGEMENT')) {
    return true;
  }

  return false;
}

export interface RoleDefinitionMeta {
  role: SystemRole;
  labelEn: string;
  labelAr: string;
  shortDescEn: string;
  shortDescAr: string;
  defaultDepartment: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  permissionsEn: string[];
  permissionsAr: string[];
}

export const ROLE_DEFINITIONS: Record<SystemRole, RoleDefinitionMeta> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    labelEn: 'Super Admin',
    labelAr: 'مدير النظام العام',
    shortDescEn: 'Full system access, user & role governance, security audit logs, and master record control.',
    shortDescAr: 'صلاحيات كاملة للنظام وإدارة المستخدمين والأدوار وسجلات التدقيق الأمني.',
    defaultDepartment: 'IT & System Administration',
    badgeBg: 'bg-[#FFF3E0]',
    badgeText: 'text-[#9A3412]',
    badgeBorder: 'border-[#FDBA74]',
    dotColor: '#EA580C',
    permissionsEn: [
      'Full Create, Read, Update & Delete across all Fleet & Workshop modules',
      'Create users, assign roles, reset passwords & deactivate accounts',
      'Inspect complete system & database Audit Logs',
      'Manage attachments, exports, GPS telematics & financial benchmarks',
    ],
    permissionsAr: [
      'صلاحيات كاملة للإضافة والتعديل والحذف في جميع وحدات الأسطول والورشة',
      'إنشاء المستخدمين وتعيين الأدوار وإعادة تعيين كلمات المرور وتعطيل الحسابات',
      'الاطلاع الكامل على سجلات التدقيق والمراقبة الأمنية',
      'إدارة المرفقات والتقارير وأجهزة التتبع والمؤشرات المالية',
    ],
  },
  FLEET_MANAGER: {
    role: 'FLEET_MANAGER',
    labelEn: 'Fleet Manager',
    labelAr: 'مدير الأسطول',
    shortDescEn: 'Manages all fleet assets, tanker testing, drivers, trips, fuel, documents, and compliance.',
    shortDescAr: 'إدارة شاملة لمركبات الأسطول واختبارات الصهاريج والسائقين والرحلات والوقود والوثائق.',
    defaultDepartment: 'Fleet Operations',
    badgeBg: 'bg-[#E6F4EA]',
    badgeText: 'text-[#137333]',
    badgeBorder: 'border-[#A8DAB5]',
    dotColor: '#137333',
    permissionsEn: [
      'Create, edit & manage Trucks, Small Vehicles, Tanker Trailers & Tank Testing',
      'Manage Drivers, Trips, Fuel Logs, GPS Sync & Document Expiries',
      'Raise Work Orders & Preventive Maintenance requests',
      'Upload/download certificates & export operational reports',
    ],
    permissionsAr: [
      'إضافة وتعديل وإدارة الشاحنات والمركبات الصغيرة والصهاريج واختبارات الخزانات',
      'إدارة السائقين والرحلات وسجلات الوقود والتتبع وانتهاء الوثائق',
      'فتح أوامر العمل وجدولة الصيانة الوقائية',
      'رفع وتحميل الشهادات وتصدير التقارير التشغيلية',
    ],
  },
  WORKSHOP_MANAGER: {
    role: 'WORKSHOP_MANAGER',
    labelEn: 'Workshop Manager',
    labelAr: 'مدير الورشة والصيانة',
    shortDescEn: 'Manages workshop job cards, preventive maintenance, spare parts inventory, and technicians.',
    shortDescAr: 'إدارة بطاقات العمل والصيانة الوقائية ومستودع قطع الغيار والفنيين.',
    defaultDepartment: 'Workshop & Maintenance',
    badgeBg: 'bg-[#E8F0FE]',
    badgeText: 'text-[#1967D2]',
    badgeBorder: 'border-[#AECBFA]',
    dotColor: '#1967D2',
    permissionsEn: [
      'Full management of Job Cards, Work Orders & Preventive Maintenance',
      'Manage Spare Parts Store, stock adjustments & Technicians roster',
      'Record Tank Testing & Inspection results and resolve Driver Defect Reports',
      'Read-only visibility into Fleet Master registries & export maintenance reports',
    ],
    permissionsAr: [
      'إدارة كاملة لبطاقات العمل وأوامر الإصلاح والصيانة الوقائية',
      'إدارة مستودع قطع الغيار وحركات المخزون وقائمة الفنيين',
      'تسجيل نتائج فحوصات الصهاريج ومعالجة بلاغات أعطال السائقين',
      'الاطلاع على سجلات الأسطول وتصدير تقارير الصيانة',
    ],
  },
  FLEET_STAFF: {
    role: 'FLEET_STAFF',
    labelEn: 'Fleet Staff',
    labelAr: 'موظف عمليات الأسطول',
    shortDescEn: 'Creates and updates authorized daily fleet records, trips, fuel logs, documents, and tank tests.',
    shortDescAr: 'إدخال وتحديث سجلات الأسطول اليومية والرحلات والوقود والوثائق وفحوصات الصهاريج.',
    defaultDepartment: 'Fleet Operations',
    badgeBg: 'bg-[#F0FDF4]',
    badgeText: 'text-[#15803D]',
    badgeBorder: 'border-[#BBF7D0]',
    dotColor: '#22C55E',
    permissionsEn: [
      'Add & update authorized Fleet records (Trucks, Small Vehicles, Trailers, Drivers)',
      'Record Trips, Fuel transactions, Document renewals & Tank Testing certificates',
      'Upload & preview document and inspection attachments',
      'Cannot delete master fleet assets or modify user/workshop store settings',
    ],
    permissionsAr: [
      'إضافة وتحديث سجلات الأسطول المصرح بها (الشاحنات، المركبات، الصهاريج، السائقين)',
      'تسجيل الرحلات ومعاملات الوقود وتجديد الوثائق وشهادات فحص الصهاريج',
      'رفع ومعاينة مرفقات الوثائق والفحوصات',
      'لا يمكنه حذف الأصول الرئيسية أو تعديل إعدادات النظام والمستودع',
    ],
  },
  WORKSHOP_STAFF: {
    role: 'WORKSHOP_STAFF',
    labelEn: 'Workshop Staff',
    labelAr: 'فني / موظف الورشة',
    shortDescEn: 'Updates job cards, logs labor and parts consumption, executes PM tasks, and records inspections.',
    shortDescAr: 'تحديث بطاقات العمل وتسجيل ساعات العمل وقطع الغيار وتنفيذ مهام الصيانة والفحوصات.',
    defaultDepartment: 'Workshop & Maintenance',
    badgeBg: 'bg-[#EFF6FF]',
    badgeText: 'text-[#1D4ED8]',
    badgeBorder: 'border-[#BFDBFE]',
    dotColor: '#3B82F6',
    permissionsEn: [
      'Create & update Job Cards, log repair status, labor hours & parts used',
      'Complete Preventive Maintenance schedules & issue/receive Spare Parts stock',
      'Process Driver Defect Reports & record Tank Testing inspections',
      'Cannot delete master records or modify fleet registration data',
    ],
    permissionsAr: [
      'إنشاء وتحديث بطاقات العمل وتسجيل حالة الإصلاح وساعات العمل والقطع المستهلكة',
      'إنجاز جداول الصيانة الوقائية وصرف/استلام قطع الغيار',
      'معالجة بلاغات الأعطال وتسجيل فحوصات الصهاريج',
      'لا يمكنه حذف السجلات الرئيسية أو تعديل بيانات تسجيل الأسطول',
    ],
  },
  VIEWER: {
    role: 'VIEWER',
    labelEn: 'Viewer (Read Only)',
    labelAr: 'مشاهد (للقراءة فقط)',
    shortDescEn: 'Strictly read-only access across authorized modules. Cannot add, edit, delete, or upload.',
    shortDescAr: 'صلاحية قراءة وعرض فقط عبر الوحدات المصرح بها دون إمكانية الإضافة أو التعديل أو الحذف أو الرفع.',
    defaultDepartment: 'Executive Management',
    badgeBg: 'bg-[#F3F4F6]',
    badgeText: 'text-[#374151]',
    badgeBorder: 'border-[#D1D5DB]',
    dotColor: '#6B7280',
    permissionsEn: [
      'Read-only access to Dashboards, Fleet registries, Workshop status & Analytics',
      'Preview & download existing document and certificate attachments',
      'Strictly blocked from adding, editing, deleting, uploading, or modifying any record',
      'Cannot access User Management or security configuration',
    ],
    permissionsAr: [
      'وصول للقراءة فقط إلى لوحات المعلومات وسجلات الأسطول وحالة الورشة والتحليلات',
      'معاينة وتحميل المرفقات والشهادات الموجودة مسبقاً',
      'يُمنع منعاً باتاً من إضافة أو تعديل أو حذف أو رفع أي سجل أو ملف',
      'لا يمكنه الوصول إلى إدارة المستخدمين أو إعدادات الأمان',
    ],
  },
};

export function getRoleMeta(role?: UserRole | string | null): RoleDefinitionMeta {
  return ROLE_DEFINITIONS[normalizeRole(role)];
}
