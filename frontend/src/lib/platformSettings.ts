import 'server-only';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';

export interface ResolvedPlatformSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceScheduledAt: Date | null;
  readOnlyMode: boolean;
  emergencyLockdown: boolean;
  twoFactor: boolean;
  twoFactorOwners: boolean;
  requireEmailVerification: boolean;
  sessionTimeout: number;
  passwordMinLength: number;
  passwordExpiryDays: number;
  passwordHistoryCount: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  blockDisposableEmails: boolean;
  preventMultipleSessions: boolean;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  adminIpWhitelist: string[];
  allowNewSignups: boolean;
  allowFreeTrial: boolean;
  allowPublicRegistration: boolean;
  inviteOnlyRegistration: boolean;
  aiDisabledPlans: string[];
  notifs: {
    newTenant: boolean;
    ticketEscalation: boolean;
    dailyReport: boolean;
    paymentFailed: boolean;
    systemAlert: boolean;
    newAdminCreated: boolean;
    subscriptionExpiring: boolean;
    subscriptionCancelled: boolean;
    failedLoginAlert: boolean;
    storageLimitReached: boolean;
    highCpuUsage: boolean;
    highMemoryUsage: boolean;
    databaseBackupFailed: boolean;
  };
}

// Single source of truth for defaults — every route that reads platform
// settings should go through this instead of re-declaring `?? <fallback>`
// inline, so the effective values can never drift between call sites.
const DEFAULTS: ResolvedPlatformSettings = {
  maintenanceMode: false,
  maintenanceMessage: 'The platform is currently under maintenance. Please check back shortly.',
  maintenanceScheduledAt: null,
  readOnlyMode: false,
  emergencyLockdown: false,
  twoFactor: false,
  twoFactorOwners: false,
  requireEmailVerification: false,
  sessionTimeout: 60,
  passwordMinLength: 8,
  passwordExpiryDays: 0,
  passwordHistoryCount: 0,
  passwordRequireUppercase: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: true,
  blockDisposableEmails: false,
  preventMultipleSessions: false,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  adminIpWhitelist: [],
  allowNewSignups: true,
  allowFreeTrial: true,
  allowPublicRegistration: true,
  inviteOnlyRegistration: false,
  aiDisabledPlans: [],
  notifs: {
    newTenant: true,
    ticketEscalation: true,
    dailyReport: false,
    paymentFailed: true,
    systemAlert: true,
    newAdminCreated: true,
    subscriptionExpiring: true,
    subscriptionCancelled: true,
    failedLoginAlert: false,
    storageLimitReached: true,
    highCpuUsage: true,
    highMemoryUsage: true,
    databaseBackupFailed: true,
  },
};

export async function getPlatformSettings(): Promise<ResolvedPlatformSettings> {
  try {
    await connectDB();
    const s = await PlatformSettings.findOne().lean() as any;
    if (!s) return DEFAULTS;
    return {
      maintenanceMode: s.maintenanceMode ?? DEFAULTS.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage ?? DEFAULTS.maintenanceMessage,
      maintenanceScheduledAt: s.maintenanceScheduledAt ?? DEFAULTS.maintenanceScheduledAt,
      readOnlyMode: s.readOnlyMode ?? DEFAULTS.readOnlyMode,
      emergencyLockdown: s.emergencyLockdown ?? DEFAULTS.emergencyLockdown,
      twoFactor: s.twoFactor ?? DEFAULTS.twoFactor,
      twoFactorOwners: s.twoFactorOwners ?? DEFAULTS.twoFactorOwners,
      requireEmailVerification: s.requireEmailVerification ?? DEFAULTS.requireEmailVerification,
      sessionTimeout: s.sessionTimeout ?? DEFAULTS.sessionTimeout,
      passwordMinLength: s.passwordMinLength ?? DEFAULTS.passwordMinLength,
      passwordExpiryDays: s.passwordExpiryDays ?? DEFAULTS.passwordExpiryDays,
      passwordHistoryCount: s.passwordHistoryCount ?? DEFAULTS.passwordHistoryCount,
      passwordRequireUppercase: s.passwordRequireUppercase ?? DEFAULTS.passwordRequireUppercase,
      passwordRequireNumber: s.passwordRequireNumber ?? DEFAULTS.passwordRequireNumber,
      passwordRequireSymbol: s.passwordRequireSymbol ?? DEFAULTS.passwordRequireSymbol,
      blockDisposableEmails: s.blockDisposableEmails ?? DEFAULTS.blockDisposableEmails,
      preventMultipleSessions: s.preventMultipleSessions ?? DEFAULTS.preventMultipleSessions,
      maxLoginAttempts: s.maxLoginAttempts ?? DEFAULTS.maxLoginAttempts,
      lockoutDurationMinutes: s.lockoutDurationMinutes ?? DEFAULTS.lockoutDurationMinutes,
      adminIpWhitelist: s.adminIpWhitelist ?? DEFAULTS.adminIpWhitelist,
      allowNewSignups: s.allowNewSignups ?? DEFAULTS.allowNewSignups,
      allowFreeTrial: s.allowFreeTrial ?? DEFAULTS.allowFreeTrial,
      allowPublicRegistration: s.allowPublicRegistration ?? DEFAULTS.allowPublicRegistration,
      inviteOnlyRegistration: s.inviteOnlyRegistration ?? DEFAULTS.inviteOnlyRegistration,
      aiDisabledPlans: s.aiDisabledPlans ?? DEFAULTS.aiDisabledPlans,
      notifs: { ...DEFAULTS.notifs, ...(s.notifs ?? {}) },
    };
  } catch {
    return DEFAULTS;
  }
}

/** True only once maintenanceMode is on AND (no future start time was set, or that time has passed) —
 * lets an admin schedule maintenance ahead of time without blocking access immediately. */
export function isMaintenanceActive(s: { maintenanceMode: boolean; maintenanceScheduledAt?: Date | string | null }): boolean {
  if (!s.maintenanceMode) return false;
  if (!s.maintenanceScheduledAt) return true;
  return new Date(s.maintenanceScheduledAt).getTime() <= Date.now();
}
