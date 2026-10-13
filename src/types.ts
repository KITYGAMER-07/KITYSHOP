export interface ApkDownloadLink {
  id: string;
  name: string;
  url: string;
  version?: string;
  createdAt?: number;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
}

export interface Product {
  id: string;
  name: string;
  enabled: boolean;
  icon?: string;
  description?: string;
  category?: string;
  createdAt?: number;
  apkLinks?: ApkDownloadLink[];
}

export interface Duration {
  id: string;
  productId: string;
  name: string;
  unit: 'hours' | 'days' | 'weeks' | 'months' | 'years';
  createdAt?: number;
}

export interface Price {
  id: string;
  productId: string;
  durationId: string;
  price: number;
  createdAt?: number;
}

export interface AutoKeyDurationConfig {
  /** Turn API delivery on/off for one product + duration combination. */
  enabled?: boolean;
  /** Provider format, for example: 5h, 1d, 7d. */
  apiDuration?: string;
  game?: string;
  maxDevices?: number;
  primeEnabled?: boolean;
  trialEnabled?: boolean;
  /** Leave blank to use the normal Price table value. */
  primePrice?: number | null;
  /** Leave blank to use the normal Price table value. */
  trialPrice?: number | null;
  allowedQuantities?: number[];
}

export interface AutoKeyDeliverySettings {
  enabled?: boolean;
  /** Vercel site URL used by the locally bundled Android WebView. */
  apiBaseUrl?: string;
  defaultGame?: string;
  defaultMaxDevices?: number;
  allowedQuantities?: number[];
  primeEnabled?: boolean;
  trialEnabled?: boolean;
  durationConfigs?: Record<string, AutoKeyDurationConfig>;
}

/** Configuration for the public, API-generated Claim Free Key card. */
export interface FreeTrialApiSettings {
  /** Enables the Claim Free Key tab. The main trial card has its own toggle. */
  enabled?: boolean;
  /** Maximum number of successful API trial keys that can be issued. */
  totalLimit?: number;
  /** Existing product whose APK links are shown after a successful claim. */
  productId?: string;
  game?: string;
  /** Provider format, for example: 2h, 6h, 1d. */
  apiDuration?: string;
  maxDevices?: number;
  cardTitle?: string;
  cardMessage?: string;
  buttonText?: string;
}

export interface FreeTrialClaim {
  id: string;
  key?: string;
  productId?: string;
  productName?: string;
  game?: string;
  duration?: string;
  maxDevices?: number;
  status: 'success' | 'failed' | 'issuing';
  error?: string;
  createdAt: number;
}

export interface LicenseKey {
  id: string;
  productId: string;
  durationId: string;
  key: string;
  used: boolean;
  usedAt?: number;
  orderId?: string;
  createdAt?: number;
}

export interface TrialKey {
  id: string;
  productId: string;
  durationName?: string;
  trialCode: string;
  actualKey: string;
  key?: string; // Fallback for backwards compatibility
  used: boolean;
  usedByEmail?: string;
  usedAt?: number;
  usageCount?: number;
  lastUsedByEmail?: string;
  lastUsedAt?: number;
  createdAt?: number;
}

export interface PreBooking {
  id: string;
  productId: string;
  durationId: string;
  enabled: boolean;
  title?: string;
  description?: string;
  badgeText?: string;
  releaseDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  slots?: number;
  bookedCount?: number;
  rules?: string;
  priceOverride?: number | null;
  createdAt?: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  expiryDate?: string | null;
  usageLimit?: number;
  usageCount?: number;
  perUserLimit?: number;
  prebookingOnly?: boolean;
  active?: boolean;
  createdAt?: number;
}

export interface Order {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  durationId: string;
  durationName: string;
  originalPrice: number;
  discountAmount: number;
  finalAmount: number;
  couponCode?: string | null;
  licenseKey: string;
  /** Multiple API-generated keys when the customer buys more than one key. */
  licenseKeys?: string[];
  keyType?: 'prime' | 'trial';
  keyQuantity?: number;
  maxDevices?: number;
  deliverySource?: 'aimx-api' | 'manual-stock';
  paymentId: string;
  status: 'paid' | 'failed' | 'pending';
  orderType?: 'purchase' | 'prebooking';
  bookingId?: string | null;
  bookingStatus?: 'confirmed' | 'released' | 'cancelled' | 'pending';
  releaseDate?: string | null;
  customerEmail?: string;
  emailDeliveryStatus?: 'pending' | 'sent' | 'failed';
  emailSentAt?: number;
  createdAt: number;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  paymentId: string;
  amount: number;
  gateway: string;
  status: 'success' | 'failed';
  createdAt: number;
}

export interface Settings {
  razorpayKeyId: string;
  adminUsername: string;
  adminPassword: string;
  apkUrl: string;
  apkAppName?: string;
  apkVersion?: string;
  apkStoragePath?: string;
  apkFileName?: string;
  apkFileSize?: number;
  telegramUrl?: string;
  setupChannelUrl?: string;
  websiteLogoUrl?: string;
  websiteName?: string;
  freeTrialEnabled?: boolean;
  /** Keep the older admin-created redeem codes available independently. */
  redeemTrialCodeEnabled?: boolean;
  freeTrialApi?: FreeTrialApiSettings;
  couponEnabled?: boolean;
  emailDeliveryEnabled?: boolean;
  emailDeliveryProvider?: 'emailjs' | 'google-apps-script';
  emailJsServiceId?: string;
  emailJsTemplateId?: string;
  emailJsPublicKey?: string;
  emailSenderName?: string;
  emailReplyTo?: string;
  emailLogoUrl?: string;
  showUserPanelInApp?: boolean;
  showAdminPanelInApp?: boolean;
  showUserPanelOnWebsite?: boolean;
  showAdminPanelOnWebsite?: boolean;
  appMenuStoreEnabled?: boolean;
  appMenuRulesEnabled?: boolean;
  appMenuTrackEnabled?: boolean;
  appMenuFaqEnabled?: boolean;
  appMenuSupportEnabled?: boolean;
  appMenuTelegramEnabled?: boolean;
  appMenuAdminEnabled?: boolean;
  navbarStoreText?: string;
  navbarRulesText?: string;
  navbarTrackText?: string;
  navbarFaqText?: string;
  navbarSupportText?: string;
  navbarTelegramText?: string;
  navbarAdminText?: string;
  navbarMenuText?: string;
  navbarCloseText?: string;
  navbarTagline?: string;
  navbarStoreDescription?: string;
  navbarRulesDescription?: string;
  navbarTrackDescription?: string;
  navbarFaqDescription?: string;
  navbarSupportDescription?: string;
  navbarTelegramDescription?: string;
  navbarAdminDescription?: string;
  rulesTitle?: string;
  rulesSubtitle?: string;
  rulesDoneText?: string;
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  maintenanceEnabled?: boolean;
  websiteMaintenanceEnabled?: boolean;
  maintenanceTitle?: string;
  maintenanceMessage?: string;
  maintenanceContactText?: string;
  maintenanceContactUrl?: string;
  forceUpdateEnabled?: boolean;
  forceUpdateMinimumVersionCode?: number;
  forceUpdateVersionLabel?: string;
  forceUpdateTelegramUrl?: string;
  footerBrandText?: string;
  footerYearText?: string;
  footerCopyrightText?: string;
  footerStoreText?: string;
  footerTrackText?: string;
  footerFaqText?: string;
  footerSupportText?: string;
  productLogos?: Record<string, string>;
  autoKeyDelivery?: AutoKeyDeliverySettings;
}

export interface StockSummary {
  productId: string;
  productName: string;
  durationId: string;
  durationName: string;
  total: number;
  active: number;
  used: number;
}
