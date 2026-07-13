import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlatformSettings extends Document {
  // ── General / Platform ──────────────────────────────────────────────
  platformName:      string;
  domain:            string;
  supportEmail:      string;
  timezone:          string;
  currency:          string;
  defaultLanguage:   string;
  dateFormat:        string;
  timeFormat:        string;

  // ── Platform status ─────────────────────────────────────────────────
  maintenanceMode:    boolean;
  maintenanceMessage: string;
  maintenanceScheduledAt: Date | null;
  maintenanceNoticeSentAt: Date | null;
  readOnlyMode:       boolean;
  emergencyLockdown:  boolean;
  allowNewSignups:    boolean;
  allowFreeTrial:     boolean;
  allowPublicRegistration: boolean;
  inviteOnlyRegistration:  boolean;

  // ── Security ─────────────────────────────────────────────────────────
  twoFactor:         boolean; // 2FA for super_admin
  twoFactorOwners:   boolean; // 2FA for owner/manager
  requireEmailVerification: boolean;
  sessionTimeout:    number;
  passwordMinLength: number;
  passwordExpiryDays: number;       // 0 = disabled
  passwordHistoryCount: number;     // 0 = disabled
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  blockDisposableEmails: boolean;
  preventMultipleSessions: boolean;
  maxLoginAttempts:      number;
  lockoutDurationMinutes: number;
  adminIpWhitelist: string[];

  // ── Billing ──────────────────────────────────────────────────────────
  defaultTrialDays: number;
  gracePeriodDays: number;
  autoSuspendExpiredShops: boolean;

  // ── Email ────────────────────────────────────────────────────────────
  activeEmailProvider: string;
  defaultSenderName: string;
  defaultSenderEmail: string;
  replyToEmail: string;
  emailRateLimitPerHour: number;
  disableMarketingEmails: boolean;

  // ── Notifications ────────────────────────────────────────────────────
  notifs: {
    newTenant:        boolean;
    ticketEscalation: boolean;
    dailyReport:      boolean;
    paymentFailed:    boolean;
    systemAlert:      boolean;
    newAdminCreated:  boolean;
    subscriptionExpiring: boolean;
    subscriptionCancelled: boolean;
    failedLoginAlert: boolean;
    storageLimitReached: boolean;
    highCpuUsage: boolean;
    highMemoryUsage: boolean;
    databaseBackupFailed: boolean;
  };

  // ── AI ────────────────────────────────────────────────────────────────
  aiProvider: string;
  aiModel:    string;
  aiDailyBudgetUsd: number;    // 0 = unlimited
  aiMonthlyBudgetUsd: number;  // 0 = unlimited
  aiDisabledPlans: string[];
  aiRateLimitPerHourPerTenant: number; // 0 = unlimited

  // ── Storage ───────────────────────────────────────────────────────────
  maxUploadSizeMb: number;
  allowedFileTypes: string[];
  maxStoragePerTenantMb: number;

  // ── Feature flags ────────────────────────────────────────────────────
  featureFlags: {
    enableAI: boolean;
    enableTickets: boolean;
    enableInventory: boolean;
    enableReports: boolean;
    enableCustomerPortal: boolean;
    enableAnalytics: boolean;
  };

  // ── Appearance / Branding ────────────────────────────────────────────
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  darkModeDefault: boolean;
  loginBackgroundUrl: string;
  companyName: string;
  footerText: string;

  // ── Backup & Recovery ────────────────────────────────────────────────
  autoBackupEnabled: boolean;
  autoBackupFrequency: 'daily' | 'weekly' | 'monthly';
  backupRetentionDays: number;
  lastAutoBackupAt?: Date;

  updatedAt: Date;
}

const schema = new Schema<IPlatformSettings>(
  {
    platformName:      { type: String, default: 'RepairShop SaaS' },
    domain:            { type: String, default: 'repairshop.app' },
    supportEmail:      { type: String, default: 'support@repairshop.app' },
    timezone:          { type: String, default: 'Asia/Karachi' },
    currency:          { type: String, default: 'PKR' },
    defaultLanguage:   { type: String, default: 'en' },
    dateFormat:        { type: String, default: 'DD/MM/YYYY' },
    timeFormat:        { type: String, enum: ['12h', '24h'], default: '24h' },

    maintenanceMode:    { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'The platform is currently under maintenance. Please check back shortly.' },
    maintenanceScheduledAt: { type: Date, default: null },
    maintenanceNoticeSentAt: { type: Date, default: null },
    readOnlyMode:       { type: Boolean, default: false },
    emergencyLockdown:  { type: Boolean, default: false },
    allowNewSignups:    { type: Boolean, default: true },
    allowFreeTrial:     { type: Boolean, default: true },
    allowPublicRegistration: { type: Boolean, default: true },
    inviteOnlyRegistration:  { type: Boolean, default: false },

    twoFactor:         { type: Boolean, default: false },
    twoFactorOwners:   { type: Boolean, default: false },
    requireEmailVerification: { type: Boolean, default: false },
    sessionTimeout:    { type: Number, default: 60 },
    passwordMinLength: { type: Number, default: 8 },
    passwordExpiryDays: { type: Number, default: 0 },
    passwordHistoryCount: { type: Number, default: 0 },
    passwordRequireUppercase: { type: Boolean, default: true },
    passwordRequireNumber: { type: Boolean, default: true },
    passwordRequireSymbol: { type: Boolean, default: true },
    blockDisposableEmails: { type: Boolean, default: false },
    preventMultipleSessions: { type: Boolean, default: false },
    maxLoginAttempts:      { type: Number, default: 5 },
    lockoutDurationMinutes: { type: Number, default: 15 },
    adminIpWhitelist: { type: [String], default: [] },

    defaultTrialDays: { type: Number, default: 14 },
    gracePeriodDays: { type: Number, default: 3 },
    autoSuspendExpiredShops: { type: Boolean, default: false },

    activeEmailProvider:  { type: String, enum: ['resend', 'mailersend', 'mailtrap'], default: 'resend' },
    defaultSenderName: { type: String, default: 'Dibnow Repair' },
    defaultSenderEmail: { type: String, default: 'noreply@dibnow.com' },
    replyToEmail: { type: String, default: '' },
    emailRateLimitPerHour: { type: Number, default: 0 },
    disableMarketingEmails: { type: Boolean, default: false },

    notifs: {
      newTenant:        { type: Boolean, default: true },
      ticketEscalation: { type: Boolean, default: true },
      dailyReport:      { type: Boolean, default: false },
      paymentFailed:    { type: Boolean, default: true },
      systemAlert:      { type: Boolean, default: true },
      newAdminCreated:  { type: Boolean, default: true },
      subscriptionExpiring: { type: Boolean, default: true },
      subscriptionCancelled: { type: Boolean, default: true },
      failedLoginAlert: { type: Boolean, default: false },
      storageLimitReached: { type: Boolean, default: true },
      highCpuUsage: { type: Boolean, default: true },
      highMemoryUsage: { type: Boolean, default: true },
      databaseBackupFailed: { type: Boolean, default: true },
    },

    aiProvider: { type: String, default: 'groq' },
    aiModel:    { type: String, default: 'llama-3.3-70b-versatile' },
    aiDailyBudgetUsd: { type: Number, default: 0 },
    aiMonthlyBudgetUsd: { type: Number, default: 0 },
    aiDisabledPlans: { type: [String], default: [] },
    aiRateLimitPerHourPerTenant: { type: Number, default: 0 },

    maxUploadSizeMb: { type: Number, default: 10 },
    allowedFileTypes: { type: [String], default: ['jpg', 'jpeg', 'png', 'webp', 'pdf'] },
    maxStoragePerTenantMb: { type: Number, default: 500 },

    featureFlags: {
      enableAI: { type: Boolean, default: true },
      enableTickets: { type: Boolean, default: true },
      enableInventory: { type: Boolean, default: true },
      enableReports: { type: Boolean, default: true },
      enableCustomerPortal: { type: Boolean, default: true },
      enableAnalytics: { type: Boolean, default: true },
    },

    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#2563eb' },
    secondaryColor: { type: String, default: '#7c3aed' },
    darkModeDefault: { type: Boolean, default: false },
    loginBackgroundUrl: { type: String, default: '' },
    companyName: { type: String, default: 'Dibnow Repair' },
    footerText: { type: String, default: 'DibnowRepairSaaS © 2026' },

    autoBackupEnabled: { type: Boolean, default: false },
    autoBackupFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
    backupRetentionDays: { type: Number, default: 14 },
    lastAutoBackupAt: { type: Date },
  },
  { timestamps: true }
);

const PlatformSettings: Model<IPlatformSettings> =
  mongoose.models.PlatformSettings ||
  mongoose.model<IPlatformSettings>('PlatformSettings', schema);

export default PlatformSettings;
