import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, 
  Package, 
  Clock, 
  DollarSign, 
  Key, 
  Tag, 
  ShoppingBag, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  ShieldCheck, 
  ExternalLink,
  LogOut,
  RefreshCw,
  Gift,
  Zap,
  CalendarDays,
  Timer,
  BarChart3,
  Globe2,
  Download
} from 'lucide-react';
import { Product, Duration, Price, LicenseKey, TrialKey, Coupon, Order, Settings, PreBooking, ApkDownloadLink } from '../types';
import { 
  pushData, 
  updateData, 
  deleteData, 
  setData, 
  seedInitialDataIfEmpty,
  deleteTrialKeyFromDb,
  clearTrialKeysFromDb,
  uploadProductLogo,
  uploadWebsiteLogo,
  uploadApkToSupabase,
  deleteApkFromSupabase
} from '../lib/firebase';

const CURRENT_APP_VERSION_CODE = 3;

interface AdminPortalProps {
  products: Product[];
  durations: Duration[];
  prices: Price[];
  licenseKeys: LicenseKey[];
  trialKeys?: TrialKey[];
  coupons: Coupon[];
  preBookings: PreBooking[];
  orders: Order[];
  settings: Settings;
  isAdminLoggedIn: boolean;
  onAdminLoginSuccess: () => void;
  onAdminLogout: () => void;
}


interface PreBookingManagementProps {
  preBookings: PreBooking[];
  products: Product[];
  durations: Duration[];
  orders: Order[];
  onAdd: () => void;
  onEdit: (item: PreBooking) => void;
  onDelete: (id: string) => void;
  onRelease: (order: Order) => void;
  onDeleteRelease: (order: Order) => void;
  onPermanentDelete: (order: Order) => void;
  onCancel: (order: Order) => void;
}

const PreBookingManagement: React.FC<PreBookingManagementProps> = ({
  preBookings, products, durations, orders, onAdd, onEdit, onDelete, onRelease, onDeleteRelease, onPermanentDelete, onCancel
}) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [productFilter, setProductFilter] = useState('all');

  const productName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown Product';
  const filteredBookings = preBookings.filter(item => {
    const name = productName(item.productId).toLowerCase();
    const q = search.trim().toLowerCase();
    return (!q || name.includes(q) || item.id.toLowerCase().includes(q)) &&
      (productFilter === 'all' || item.productId === productFilter);
  });
  const bookingOrders = orders.filter(o => !!o.bookingId);
  const counts = {
    total: bookingOrders.length,
    confirmed: bookingOrders.filter(o => (o.bookingStatus || 'confirmed') === 'confirmed').length,
    pending: bookingOrders.filter(o => o.bookingStatus === 'pending').length,
    released: bookingOrders.filter(o => o.bookingStatus === 'released').length,
    cancelled: bookingOrders.filter(o => o.bookingStatus === 'cancelled').length,
    revenue: bookingOrders.reduce((n,o) => n + Number(o.amount || 0), 0)
  };
  const visibleOrders = bookingOrders.filter(o => {
    const st = o.bookingStatus || 'confirmed';
    const q = search.trim().toLowerCase();
    const name = productName(o.productId).toLowerCase();
    return (!q || name.includes(q) || String(o.bookingId || o.orderId || '').toLowerCase().includes(q) || String(o.email || o.username || '').toLowerCase().includes(q)) &&
      (status === 'all' || st === status) && (productFilter === 'all' || o.productId === productFilter);
  });
  const badge = (st: string) => {
    const cls = st === 'released' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : st === 'cancelled' ? 'bg-red-500/15 text-red-300 border-red-500/20' : st === 'pending' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-blue-500/15 text-blue-300 border-blue-500/20';
    return <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase whitespace-nowrap ${cls}`}>{st}</span>;
  };
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div><h2 className="text-xl font-bold text-white">Pre-Booking Management</h2><p className="text-xs text-slate-400 mt-1">Manage pre-booking configurations, reservations and releases.</p></div>
      <button onClick={onAdd} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300"><Plus className="w-4 h-4"/>Add Pre-Booking</button>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {[['Total Bookings',counts.total],['Confirmed',counts.confirmed],['Pending',counts.pending],['Released',counts.released],['Cancelled',counts.cancelled],['Revenue',`₹${counts.revenue.toFixed(2)}`]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 min-w-0"><div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</div><div className="text-lg font-bold text-white mt-1 truncate">{value}</div></div>)}
    </div>
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px_180px_auto] gap-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search booking ID, user or product" className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl pl-9 pr-3 py-3 outline-none"/></div>
        <select value={productFilter} onChange={e=>setProductFilter(e.target.value)} className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-3"><option value="all">All Products</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-3"><option value="all">All Status</option><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="released">Released</option><option value="cancelled">Cancelled</option></select>
        <button onClick={()=>{setSearch('');setStatus('all');setProductFilter('all')}} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700">Reset</button>
      </div>
    </div>
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="p-4 border-b border-slate-800"><h3 className="text-sm font-bold text-white">Pre-Booking Configurations</h3></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs"><thead className="bg-slate-950/60"><tr className="text-left text-slate-500 uppercase tracking-wider"><th className="px-4 py-3">Product</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Slots</th><th className="px-4 py-3">Release</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{filteredBookings.map(b=><tr key={b.id} className="text-slate-300 align-middle"><td className="px-4 py-3 font-semibold text-white">{productName(b.productId)}</td><td className="px-4 py-3">{durations.find(d=>d.id===b.durationId)?.name || '—'}</td><td className="px-4 py-3">₹{Number(b.priceOverride || 0).toFixed(2)}</td><td className="px-4 py-3">{Number(b.slots||0)>0 ? b.slots : 'Unlimited'}</td><td className="px-4 py-3">{b.releaseDate || '—'}</td><td className="px-4 py-3">{b.enabled ? <span className="text-emerald-300 font-bold">Enabled</span> : <span className="text-slate-500">Disabled</span>}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={()=>onEdit(b)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 font-bold"><Edit className="w-3.5 h-3.5"/>Edit</button><button onClick={()=>onDelete(b.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-300 font-bold"><Trash2 className="w-3.5 h-3.5"/>Delete</button></div></td></tr>)}{filteredBookings.length===0&&<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No pre-booking configurations found.</td></tr>}</tbody></table></div>
    </div>
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="p-4 border-b border-slate-800"><h3 className="text-sm font-bold text-white">Pre-Booking Orders</h3></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-xs"><thead className="bg-slate-950/60"><tr className="text-left text-slate-500 uppercase tracking-wider"><th className="px-4 py-3">Booking ID</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{visibleOrders.map(o=>{const st=o.bookingStatus||'confirmed'; return <tr key={o.id} className="text-slate-300 align-middle"><td className="px-4 py-3 font-bold text-white">{o.bookingId||o.orderId}</td><td className="px-4 py-3">{o.username||o.email||'—'}</td><td className="px-4 py-3">{productName(o.productId)}</td><td className="px-4 py-3">₹{Number(o.amount||0).toFixed(2)}</td><td className="px-4 py-3">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td><td className="px-4 py-3">{badge(st)}</td><td className="px-4 py-3"><div className="flex justify-end gap-2">{st!=='released'&&st!=='cancelled'&&<button onClick={()=>onRelease(o)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold">Release</button>}{st==='released'&&<button onClick={()=>onDeleteRelease(o)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-300 font-bold"><Trash2 className="w-3.5 h-3.5"/>Delete Release</button>}{st!=='cancelled'&&st!=='released'&&<button onClick={()=>onCancel(o)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-300 font-bold">Cancel</button>}<button onClick={()=>onPermanentDelete(o)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600/15 text-rose-300 font-bold border border-rose-500/20" title="Permanently delete this order and its key assignment"><Trash2 className="w-3.5 h-3.5"/>Delete Order</button></div></td></tr>})}{visibleOrders.length===0&&<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No pre-booking orders found.</td></tr>}</tbody></table></div>
    </div>
  </div>;
};

export const AdminPortal: React.FC<AdminPortalProps> = ({
  products,
  durations,
  prices,
  licenseKeys,
  trialKeys = [],
  coupons,
  preBookings,
  orders,
  settings,
  isAdminLoggedIn,
  onAdminLoginSuccess,
  onAdminLogout
}) => {
  // Login Form States
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin Console credential-change state
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [updatingAdminAccount, setUpdatingAdminAccount] = useState(false);

  // Admin Active Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'products' | 'durations' | 'prices' | 'keys' | 'trials' | 'coupons' | 'prebookings' | 'orders' | 'settings' | 'admin-console' | 'website' | 'apk-links'
  >('dashboard');

  // Modals / Form States
  // 1. Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productEditId, setProductEditId] = useState<string | null>(null);
  const [productNameInput, setProductNameInput] = useState('');
  const [productCategoryInput, setProductCategoryInput] = useState('');
  const [productDescInput, setProductDescInput] = useState('');
  const [productEnabledInput, setProductEnabledInput] = useState(true);

  // 2. Duration Modal State
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [durationEditId, setDurationEditId] = useState<string | null>(null);
  const [durationProductId, setDurationProductId] = useState('');
  const [durationNameInput, setDurationNameInput] = useState('');
  const [durationUnitInput, setDurationUnitInput] = useState<'hours' | 'days' | 'weeks' | 'months' | 'years'>('days');

  // 3. Price Modal State
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [priceProductId, setPriceProductId] = useState('');
  const [priceDurationId, setPriceDurationId] = useState('');
  const [priceValueInput, setPriceValueInput] = useState<number>(0);

  // 4. Keys State
  const [keyProductId, setKeyProductId] = useState('');
  const [keyDurationId, setKeyDurationId] = useState('');
  const [singleKeyInput, setSingleKeyInput] = useState('');
  const [bulkKeysInput, setBulkKeysInput] = useState('');
  const [keyFilterTab, setKeyFilterTab] = useState<'active' | 'used'>('active');

  // 4b. Trial Keys State
  const [trialProductId, setTrialProductId] = useState('');
  const [trialDurationNameInput, setTrialDurationNameInput] = useState('2 Hours Free Trial');
  const [trialGenCountInput, setTrialGenCountInput] = useState<number>(5);
  const [trialSingleKeyInput, setTrialSingleKeyInput] = useState('');
  const [trialCodeInput, setTrialCodeInput] = useState('');
  const [trialFilterTab, setTrialFilterTab] = useState<'active' | 'used'>('active');

  // 5. Coupon Modal State
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponEditId, setCouponEditId] = useState<string | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponTypeInput, setCouponTypeInput] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValueInput, setCouponValueInput] = useState<number>(10);
  const [couponMinOrderInput, setCouponMinOrderInput] = useState<number>(0);
  const [couponExpiryInput, setCouponExpiryInput] = useState('');
  const [couponUsageLimitInput, setCouponUsageLimitInput] = useState(0);
  const [couponPerUserLimitInput, setCouponPerUserLimitInput] = useState(0);
  const [couponPrebookingOnlyInput, setCouponPrebookingOnlyInput] = useState(false);
  const [couponActiveInput, setCouponActiveInput] = useState(true);

  // 5b. Pre-Booking State
  const [preBookingModalOpen, setPreBookingModalOpen] = useState(false);
  const [preBookingEditId, setPreBookingEditId] = useState<string | null>(null);
  const [preBookingProductId, setPreBookingProductId] = useState('');
  const [preBookingDurationId, setPreBookingDurationId] = useState('');
  const [preBookingEnabled, setPreBookingEnabled] = useState(true);
  const [preBookingTitle, setPreBookingTitle] = useState('Early Pre-Booking');
  const [preBookingDescription, setPreBookingDescription] = useState('Pay the full amount now and reserve your release.');
  const [preBookingBadge, setPreBookingBadge] = useState('PRE-BOOKING');
  const [preBookingRelease, setPreBookingRelease] = useState('');
  const [preBookingStart, setPreBookingStart] = useState('');
  const [preBookingEnd, setPreBookingEnd] = useState('');
  const [preBookingSlots, setPreBookingSlots] = useState(0);
  const [preBookingPrice, setPreBookingPrice] = useState(0);
  const [preBookingRules, setPreBookingRules] = useState('Full payment is required. Pre-bookings are confirmed after successful payment.');

  // 6. Settings State
  const [rzpKeyIdInput, setRzpKeyIdInput] = useState(settings.razorpayKeyId ?? '');
  const [adminUserSetting, setAdminUserSetting] = useState(settings.adminUsername ?? '');
  const [adminPassSetting, setAdminPassSetting] = useState(settings.adminPassword ?? '');
  // Internal APK URL kept for compatibility; manual URL editing is intentionally removed from the UI.
  const [apkUrlSetting, setApkUrlSetting] = useState(settings.apkUrl ?? '');
  const [apkNameSetting, setApkNameSetting] = useState(settings.apkAppName ?? '');
  const [apkVersionSetting, setApkVersionSetting] = useState(settings.apkVersion ?? '');
  const [apkStoragePath, setApkStoragePath] = useState(settings.apkStoragePath ?? '');
  const [apkFileName, setApkFileName] = useState(settings.apkFileName ?? '');
  const [apkFileSize, setApkFileSize] = useState(settings.apkFileSize ?? 0);
  const [uploadingApk, setUploadingApk] = useState(false);
  const [deletingApk, setDeletingApk] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [websiteLogoUrl, setWebsiteLogoUrl] = useState(settings.websiteLogoUrl ?? '/logo.jpg');
  const [websiteName, setWebsiteName] = useState(settings.websiteName ?? 'PeakLoader Shop');
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(settings.freeTrialEnabled !== false);
  const [couponEnabled, setCouponEnabled] = useState(settings.couponEnabled !== false);
  const [emailDeliveryEnabled, setEmailDeliveryEnabled] = useState(settings.emailDeliveryEnabled === true);
  const [emailSenderName, setEmailSenderName] = useState(settings.emailSenderName ?? settings.websiteName ?? 'PeakLoader Shop');
  const [emailReplyTo, setEmailReplyTo] = useState(settings.emailReplyTo ?? '');
  const [emailLogoUrl, setEmailLogoUrl] = useState(settings.emailLogoUrl ?? settings.websiteLogoUrl ?? '');
  const [showUserPanelInApp, setShowUserPanelInApp] = useState(settings.showUserPanelInApp !== false);
  const [showAdminPanelInApp, setShowAdminPanelInApp] = useState(settings.showAdminPanelInApp === true);
  const [showUserPanelOnWebsite, setShowUserPanelOnWebsite] = useState(settings.showUserPanelOnWebsite === true);
  const [showAdminPanelOnWebsite, setShowAdminPanelOnWebsite] = useState(settings.showAdminPanelOnWebsite !== false);
  const [appMenuStoreEnabled, setAppMenuStoreEnabled] = useState(settings.appMenuStoreEnabled !== false);
  const [appMenuRulesEnabled, setAppMenuRulesEnabled] = useState(settings.appMenuRulesEnabled !== false);
  const [appMenuTrackEnabled, setAppMenuTrackEnabled] = useState(settings.appMenuTrackEnabled !== false);
  const [appMenuFaqEnabled, setAppMenuFaqEnabled] = useState(settings.appMenuFaqEnabled !== false);
  const [appMenuSupportEnabled, setAppMenuSupportEnabled] = useState(settings.appMenuSupportEnabled !== false);
  const [appMenuTelegramEnabled, setAppMenuTelegramEnabled] = useState(settings.appMenuTelegramEnabled !== false);
  const [appMenuAdminEnabled, setAppMenuAdminEnabled] = useState(settings.appMenuAdminEnabled !== false);
  const [navbarStoreText, setNavbarStoreText] = useState(settings.navbarStoreText ?? 'Store');
  const [navbarRulesText, setNavbarRulesText] = useState(settings.navbarRulesText ?? 'Follow Rules');
  const [navbarTrackText, setNavbarTrackText] = useState(settings.navbarTrackText ?? 'Track Order');
  const [navbarFaqText, setNavbarFaqText] = useState(settings.navbarFaqText ?? 'FAQ');
  const [navbarSupportText, setNavbarSupportText] = useState(settings.navbarSupportText ?? 'Support');
  const [navbarTelegramText, setNavbarTelegramText] = useState(settings.navbarTelegramText ?? 'Telegram Support');
  const [navbarAdminText, setNavbarAdminText] = useState(settings.navbarAdminText ?? 'Admin');
  const [navbarMenuText, setNavbarMenuText] = useState(settings.navbarMenuText ?? 'Menu');
  const [navbarCloseText, setNavbarCloseText] = useState(settings.navbarCloseText ?? 'Close');
  const [navbarTagline, setNavbarTagline] = useState(settings.navbarTagline ?? 'Instant Digital License & Key Portal');
  const [navbarStoreDescription, setNavbarStoreDescription] = useState(settings.navbarStoreDescription ?? 'Products & Licenses');
  const [navbarRulesDescription, setNavbarRulesDescription] = useState(settings.navbarRulesDescription ?? 'Flag Ban Safety');
  const [navbarTrackDescription, setNavbarTrackDescription] = useState(settings.navbarTrackDescription ?? 'Find Key by Order ID');
  const [navbarFaqDescription, setNavbarFaqDescription] = useState(settings.navbarFaqDescription ?? 'Frequently Asked Questions');
  const [navbarSupportDescription, setNavbarSupportDescription] = useState(settings.navbarSupportDescription ?? 'Contact & Ticket');
  const [navbarTelegramDescription, setNavbarTelegramDescription] = useState(settings.navbarTelegramDescription ?? 'Telegram Support');
  const [navbarAdminDescription, setNavbarAdminDescription] = useState(settings.navbarAdminDescription ?? 'Login to Control Panel');
  const [rulesTitle, setRulesTitle] = useState(settings.rulesTitle ?? 'Follow Rules');
  const [rulesSubtitle, setRulesSubtitle] = useState(settings.rulesSubtitle ?? 'Flag Ban Safety Notice');
  const [rulesDoneText, setRulesDoneText] = useState(settings.rulesDoneText ?? 'Done & Close');
  const [heroEyebrow, setHeroEyebrow] = useState(settings.heroEyebrow ?? 'Auto-Delivery License Portal');
  const [heroTitle, setHeroTitle] = useState(settings.heroTitle ?? 'PeakLoader Shop');
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle ?? 'Select your software or gaming pass below. Receive your original license key immediately upon payment.');
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(settings.websiteMaintenanceEnabled ?? (settings.forceUpdateEnabled ? false : !!settings.maintenanceEnabled));
  const [maintenanceTitle, setMaintenanceTitle] = useState(settings.maintenanceTitle ?? 'Website Under Maintenance');
  const [maintenanceMessage, setMaintenanceMessage] = useState(settings.maintenanceMessage ?? 'We are currently updating the website. Please check back soon.');
  const [maintenanceContactText, setMaintenanceContactText] = useState(settings.maintenanceContactText ?? 'Contact Support');
  const [maintenanceContactUrl, setMaintenanceContactUrl] = useState(settings.maintenanceContactUrl ?? '');
  const [forceUpdateEnabled, setForceUpdateEnabled] = useState(settings.forceUpdateEnabled === true);
  const [forceUpdateMinimumVersionCode, setForceUpdateMinimumVersionCode] = useState(String(Number(settings.forceUpdateMinimumVersionCode ?? CURRENT_APP_VERSION_CODE)));
  const [forceUpdateVersionLabel, setForceUpdateVersionLabel] = useState(settings.forceUpdateVersionLabel ?? '1.0.2');
  const [forceUpdateTelegramUrl, setForceUpdateTelegramUrl] = useState(settings.forceUpdateTelegramUrl ?? settings.telegramUrl ?? '');
  const [footerBrandText, setFooterBrandText] = useState(settings.footerBrandText ?? 'PeakLoader Shop');
  const [footerYearText, setFooterYearText] = useState(settings.footerYearText ?? '2026');
  const [footerCopyrightText, setFooterCopyrightText] = useState(settings.footerCopyrightText ?? 'All rights reserved.');
  const [footerStoreText, setFooterStoreText] = useState(settings.footerStoreText ?? 'Store');
  const [footerTrackText, setFooterTrackText] = useState(settings.footerTrackText ?? 'Track Order');
  const [footerFaqText, setFooterFaqText] = useState(settings.footerFaqText ?? 'FAQ');
  const [footerSupportText, setFooterSupportText] = useState(settings.footerSupportText ?? 'Support');
  const [productLogos, setProductLogos] = useState<Record<string, string>>(settings.productLogos ?? {});
  const [uploadingProductLogo, setUploadingProductLogo] = useState<string | null>(null);
  const [uploadingWebsiteLogo, setUploadingWebsiteLogo] = useState(false);
  const [apkLinkProductId, setApkLinkProductId] = useState('');
  const [apkLinkNameInput, setApkLinkNameInput] = useState('');
  const [apkLinkUrlInput, setApkLinkUrlInput] = useState('');
  const [apkLinkVersionInput, setApkLinkVersionInput] = useState('');
  const [uploadingProductApk, setUploadingProductApk] = useState(false);
  const [deletingProductApkId, setDeletingProductApkId] = useState<string | null>(null);
  const [setupChannelUrlSetting, setSetupChannelUrlSetting] = useState(settings.setupChannelUrl ?? '');

  // Dashboard metrics are derived only from live orders and key inventory.
  // Customer admins cannot manually change the figures.
  const dashboardStats = React.useMemo(() => ({
    revenue: orders.filter(o => o.status === 'paid').reduce((n, o) => n + Number(o.finalAmount || 0), 0),
    sales: orders.filter(o => o.status === 'paid').length,
    stock: licenseKeys.filter(k => !k.used).length,
    delivered: licenseKeys.filter(k => k.used).length
  }), [orders, licenseKeys]);
  // Sync settings when props change from Firebase
  useEffect(() => {
    if (settings) {
      setRzpKeyIdInput(settings.razorpayKeyId ?? '');
      setAdminUserSetting(settings.adminUsername ?? '');
      setAdminPassSetting(settings.adminPassword ?? '');
      setApkNameSetting(settings.apkAppName ?? '');
      setApkVersionSetting(settings.apkVersion ?? '');
      setApkStoragePath(settings.apkStoragePath ?? '');
      setApkFileName(settings.apkFileName ?? '');
      setApkFileSize(settings.apkFileSize ?? 0);
      setSetupChannelUrlSetting(settings.setupChannelUrl ?? '');
      setWebsiteLogoUrl(settings.websiteLogoUrl ?? '/logo.jpg');
      setWebsiteName(settings.websiteName ?? 'PeakLoader Shop');
      setFreeTrialEnabled(settings.freeTrialEnabled !== false);
      setCouponEnabled(settings.couponEnabled !== false);
      setEmailDeliveryEnabled(settings.emailDeliveryEnabled === true);
      setEmailSenderName(settings.emailSenderName ?? settings.websiteName ?? 'PeakLoader Shop');
      setEmailReplyTo(settings.emailReplyTo ?? '');
      setEmailLogoUrl(settings.emailLogoUrl ?? settings.websiteLogoUrl ?? '');
      setShowUserPanelInApp(settings.showUserPanelInApp !== false);
      setShowAdminPanelInApp(settings.showAdminPanelInApp === true);
      setShowUserPanelOnWebsite(settings.showUserPanelOnWebsite === true);
      setShowAdminPanelOnWebsite(settings.showAdminPanelOnWebsite !== false);
      setAppMenuStoreEnabled(settings.appMenuStoreEnabled !== false);
      setAppMenuRulesEnabled(settings.appMenuRulesEnabled !== false);
      setAppMenuTrackEnabled(settings.appMenuTrackEnabled !== false);
      setAppMenuFaqEnabled(settings.appMenuFaqEnabled !== false);
      setAppMenuSupportEnabled(settings.appMenuSupportEnabled !== false);
      setAppMenuTelegramEnabled(settings.appMenuTelegramEnabled !== false);
      setAppMenuAdminEnabled(settings.appMenuAdminEnabled !== false);
      setNavbarStoreText(settings.navbarStoreText ?? 'Store');
      setNavbarRulesText(settings.navbarRulesText ?? 'Follow Rules');
      setNavbarTrackText(settings.navbarTrackText ?? 'Track Order');
      setNavbarFaqText(settings.navbarFaqText ?? 'FAQ');
      setNavbarSupportText(settings.navbarSupportText ?? 'Support');
      setNavbarTelegramText(settings.navbarTelegramText ?? 'Telegram Support');
      setNavbarAdminText(settings.navbarAdminText ?? 'Admin');
      setNavbarMenuText(settings.navbarMenuText ?? 'Menu');
      setNavbarCloseText(settings.navbarCloseText ?? 'Close');
      setNavbarTagline(settings.navbarTagline ?? 'Instant Digital License & Key Portal');
      setNavbarStoreDescription(settings.navbarStoreDescription ?? 'Products & Licenses');
      setNavbarRulesDescription(settings.navbarRulesDescription ?? 'Flag Ban Safety');
      setNavbarTrackDescription(settings.navbarTrackDescription ?? 'Find Key by Order ID');
      setNavbarFaqDescription(settings.navbarFaqDescription ?? 'Frequently Asked Questions');
      setNavbarSupportDescription(settings.navbarSupportDescription ?? 'Contact & Ticket');
      setNavbarTelegramDescription(settings.navbarTelegramDescription ?? 'Telegram Support');
      setNavbarAdminDescription(settings.navbarAdminDescription ?? 'Login to Control Panel');
      setRulesTitle(settings.rulesTitle ?? 'Follow Rules');
      setRulesSubtitle(settings.rulesSubtitle ?? 'Flag Ban Safety Notice');
      setRulesDoneText(settings.rulesDoneText ?? 'Done & Close');
      setHeroEyebrow(settings.heroEyebrow ?? 'Auto-Delivery License Portal');
      setHeroTitle(settings.heroTitle ?? 'PeakLoader Shop');
      setHeroSubtitle(settings.heroSubtitle ?? 'Select your software or gaming pass below. Receive your original license key immediately upon payment.');
      setMaintenanceEnabled(settings.websiteMaintenanceEnabled ?? (settings.forceUpdateEnabled ? false : !!settings.maintenanceEnabled));
      setMaintenanceTitle(settings.maintenanceTitle ?? 'Website Under Maintenance');
      setMaintenanceMessage(settings.maintenanceMessage ?? 'We are currently updating the website. Please check back soon.');
      setMaintenanceContactText(settings.maintenanceContactText ?? 'Contact Support');
      setMaintenanceContactUrl(settings.maintenanceContactUrl ?? '');
      setForceUpdateEnabled(settings.forceUpdateEnabled === true);
      setForceUpdateMinimumVersionCode(String(Number(settings.forceUpdateMinimumVersionCode ?? CURRENT_APP_VERSION_CODE)));
      setForceUpdateVersionLabel(settings.forceUpdateVersionLabel ?? '1.0.2');
      setForceUpdateTelegramUrl(settings.forceUpdateTelegramUrl ?? settings.telegramUrl ?? '');
      setFooterBrandText(settings.footerBrandText ?? 'PeakLoader Shop');
      setFooterYearText(settings.footerYearText ?? '2026');
      setFooterCopyrightText(settings.footerCopyrightText ?? 'All rights reserved.');
      setFooterStoreText(settings.footerStoreText ?? 'Store');
      setFooterTrackText(settings.footerTrackText ?? 'Track Order');
      setFooterFaqText(settings.footerFaqText ?? 'FAQ');
      setFooterSupportText(settings.footerSupportText ?? 'Support');
      setProductLogos(settings.productLogos ?? {});
    }
  }, [settings]);

  // 7. Orders Filter Search
  const [orderSearchTerm, setOrderSearchTerm] = useState('');

  // Admin Console: securely validate the current password against the existing
  // credential record before changing the login credentials. The app's existing
  // Firebase auth model is preserved so this remains backward compatible.
  const handleUpdateAdminAccount = async () => {
    if (updatingAdminAccount) return;
    const storedPassword = settings.adminPassword || 'password123';
    const storedUsername = settings.adminUsername || 'admin';
    const username = newAdminUsername.trim() || storedUsername;

    if (!currentAdminPassword) {
      alert('Enter your current password.');
      return;
    }
    if (currentAdminPassword !== storedPassword) {
      alert('Current password is incorrect.');
      return;
    }
    if (!username) {
      alert('Username cannot be empty.');
      return;
    }
    if (newAdminPassword && newAdminPassword.length < 8) {
      alert('New password must be at least 8 characters.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      alert('New password and confirmation do not match.');
      return;
    }
    if (!newAdminUsername.trim() && !newAdminPassword) {
      alert('Enter a new username or a new password.');
      return;
    }

    try {
      setUpdatingAdminAccount(true);
      await setData('settings/admin', {
        username,
        password: newAdminPassword || storedPassword
      });
      setCurrentAdminPassword('');
      setNewAdminUsername('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      alert('Admin account updated successfully. Please login again with the new credentials.');
      onAdminLogout();
    } catch (err: any) {
      console.error('Admin account update failed:', err);
      alert(err?.message || 'Admin account update failed.');
    } finally {
      setUpdatingAdminAccount(false);
    }
  };

  // Login Handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validUser = settings.adminUsername || 'admin';
    const validPass = settings.adminPassword || 'password123';

    if (loginUser.trim() === validUser && loginPass.trim() === validPass) {
      setLoginError('');
      onAdminLoginSuccess();
    } else {
      setLoginError('Invalid username or password credentials.');
    }
  };

  // If not logged in, render Admin Login Card
  if (!isAdminLoggedIn) {
    return (
      <div className="py-16 max-w-md mx-auto px-4">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Admin Authentication</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Enter your administrator credentials to access store controls.</p>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Username</label>
              <input
                type="text"
                required
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Stats Calculations
  const totalOrdersCount = orders.length;
  const paidOrders = orders.filter(o => o.status === 'paid');
  const totalRevenue = dashboardStats.revenue;
  const totalSalesCount = dashboardStats.sales;
  const activeKeysCount = dashboardStats.stock;
  const usedKeysCount = dashboardStats.delivered;

  // PRODUCT CRUD
  const handleOpenProductModal = (prod?: Product) => {
    if (prod) {
      setProductEditId(prod.id);
      setProductNameInput(prod.name);
      setProductCategoryInput(prod.category || '');
      setProductDescInput(prod.description || '');
      setProductEnabledInput(prod.enabled !== false);
    } else {
      setProductEditId(null);
      setProductNameInput('');
      setProductCategoryInput('');
      setProductDescInput('');
      setProductEnabledInput(true);
    }
    setProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productNameInput.trim()) return;
    if (productEditId) {
      await updateData(`products/${productEditId}`, {
        name: productNameInput.trim(),
        category: productCategoryInput.trim(),
        description: productDescInput.trim(),
        enabled: productEnabledInput
      });
    } else {
      await pushData('products', {
        name: productNameInput.trim(),
        category: productCategoryInput.trim(),
        description: productDescInput.trim(),
        enabled: productEnabledInput,
        createdAt: Date.now()
      });
    }
    setProductModalOpen(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteData(`products/${id}`);
    }
  };

  // DURATION CRUD
  const handleOpenDurationModal = (dur?: Duration) => {
    if (dur) {
      setDurationEditId(dur.id);
      setDurationProductId(dur.productId);
      setDurationNameInput(dur.name);
      setDurationUnitInput(dur.unit || 'days');
    } else {
      setDurationEditId(null);
      setDurationProductId(products[0]?.id || '');
      setDurationNameInput('');
      setDurationUnitInput('days');
    }
    setDurationModalOpen(true);
  };

  const handleSaveDuration = async () => {
    if (!durationProductId || !durationNameInput.trim()) return;
    if (durationEditId) {
      await updateData(`durations/${durationEditId}`, {
        productId: durationProductId,
        name: durationNameInput.trim(),
        unit: durationUnitInput
      });
    } else {
      await pushData('durations', {
        productId: durationProductId,
        name: durationNameInput.trim(),
        unit: durationUnitInput,
        createdAt: Date.now()
      });
    }
    setDurationModalOpen(false);
  };

  const handleDeleteDuration = async (id: string) => {
    if (confirm('Delete this duration?')) {
      await deleteData(`durations/${id}`);
    }
  };

  // PRICE CRUD
  const handleOpenPriceModal = (pr?: Price) => {
    if (pr) {
      setPriceEditId(pr.id);
      setPriceProductId(pr.productId);
      setPriceDurationId(pr.durationId);
      setPriceValueInput(pr.price);
    } else {
      setPriceEditId(null);
      setPriceProductId(products[0]?.id || '');
      setPriceDurationId('');
      setPriceValueInput(99);
    }
    setPriceModalOpen(true);
  };

  const handleSavePrice = async () => {
    if (!priceProductId || !priceDurationId || priceValueInput <= 0) return;
    if (priceEditId) {
      await updateData(`prices/${priceEditId}`, {
        productId: priceProductId,
        durationId: priceDurationId,
        price: priceValueInput
      });
    } else {
      await pushData('prices', {
        productId: priceProductId,
        durationId: priceDurationId,
        price: priceValueInput,
        createdAt: Date.now()
      });
    }
    setPriceModalOpen(false);
  };

  const handleDeletePrice = async (id: string) => {
    if (confirm('Delete this price setting?')) {
      await deleteData(`prices/${id}`);
    }
  };

  // LICENSE KEYS
  const handleAddSingleKey = async () => {
    if (!keyProductId || !keyDurationId || !singleKeyInput.trim()) {
      alert('Select product, duration, and enter key text.');
      return;
    }
    await pushData('licenseKeys', {
      productId: keyProductId,
      durationId: keyDurationId,
      key: singleKeyInput.trim(),
      used: false,
      createdAt: Date.now()
    });
    setSingleKeyInput('');
    alert('License key added to stock!');
  };

  const handleImportBulkKeys = async () => {
    if (!keyProductId || !keyDurationId || !bulkKeysInput.trim()) {
      alert('Select product, duration, and paste keys into the textarea.');
      return;
    }
    const lines = bulkKeysInput.split('\n').map(l => l.trim()).filter(l => l);
    let count = 0;
    for (const keyStr of lines) {
      await pushData('licenseKeys', {
        productId: keyProductId,
        durationId: keyDurationId,
        key: keyStr,
        used: false,
        usageCount: 0,
        createdAt: Date.now()
      });
      count++;
    }
    setBulkKeysInput('');
    alert(`${count} keys imported into stock successfully!`);
  };

  const handleDeleteKey = async (id: string) => {
    if (confirm('Remove this license key from database?')) {
      await deleteData(`licenseKeys/${id}`);
    }
  };

  // TRIAL KEYS HANDLERS
  const handleGenerateTrialKeyFromActualKey = async () => {
    let targetProductId = trialProductId || (products[0] ? products[0].id : '');
    if (!targetProductId) {
      alert('Please create at least one product in Product Manager first.');
      return;
    }
    if (!trialSingleKeyInput.trim()) {
      alert('Please enter/paste the actual key that should be delivered when user activates trial!');
      return;
    }

    const manualTrialCode = trialCodeInput.trim();
    if (!manualTrialCode) {
      alert('Please enter the Trial Code manually. Random trial codes are disabled.');
      return;
    }

    const duplicate = trialKeys.some(k =>
      (k.trialCode || k.key || '').trim().toUpperCase() === manualTrialCode.toUpperCase()
    );
    if (duplicate) {
      alert('This Trial Code already exists. Please enter a different code.');
      return;
    }

    try {
      await pushData('trialKeys', {
        productId: targetProductId,
        durationName: trialDurationNameInput.trim() || '2 Hours Free Trial',
        trialCode: manualTrialCode,
        actualKey: trialSingleKeyInput.trim(),
        key: manualTrialCode,
        used: false,
        usageCount: 0,
        createdAt: Date.now()
      });

      const savedKey = trialSingleKeyInput.trim();
      setTrialSingleKeyInput('');
      setTrialCodeInput('');
      setTrialFilterTab('active');
      alert(`Trial Code Saved Successfully!\n\nTrial Code: ${manualTrialCode}\nAttached Actual Key: ${savedKey}\n\nGive this Trial Code to users.`);
    } catch (err) {
      console.error('Error generating trial key:', err);
      alert('Failed to save generated trial key. Please try again.');
    }
  };

  const handleDeleteTrialKey = async (trialKeyItem: TrialKey) => {
    if (!trialKeyItem) return;
    if (confirm('Delete this trial key permanently?')) {
      try {
        await deleteTrialKeyFromDb({
          id: trialKeyItem.id,
          trialCode: trialKeyItem.trialCode,
          key: trialKeyItem.key
        });
        alert('Trial key deleted successfully from Firebase.');
      } catch (err) {
        console.error('Delete trial key error:', err);
        alert(`Failed to delete trial key from Firebase. ${err instanceof Error ? err.message : 'Please check Firebase Database Rules.'}`);
      }
    }
  };

  const handleClearAllFilteredTrialKeys = async () => {
    const listToDelete = trialKeys.filter(k => trialFilterTab === 'active' ? true : (Number(k.usageCount || 0) > 0 || k.used));
    if (listToDelete.length === 0) {
      alert(`No ${trialFilterTab === 'active' ? 'active' : 'claimed/used'} trial keys to delete.`);
      return;
    }
    const label = trialFilterTab === 'active' ? 'Active Trial Codes' : 'Used Trial Codes';
    if (confirm(`Are you sure you want to delete ALL ${listToDelete.length} ${label}?`)) {
      try {
        const result = await clearTrialKeysFromDb(trialFilterTab);
        alert(`${result.deleted} ${label} deleted successfully from Firebase.`);
      } catch (err) {
        console.error('Error clearing trial keys:', err);
        alert(`Failed to delete trial keys from Firebase. ${err instanceof Error ? err.message : 'Please check Firebase Database Rules.'}`);
      }
    }
  };

  // COUPON CRUD
  const handleOpenCouponModal = (coupon?: Coupon) => {
    if (coupon) { setCouponEditId(coupon.id); setCouponCodeInput(coupon.code); setCouponTypeInput(coupon.type); setCouponValueInput(coupon.value); setCouponMinOrderInput(coupon.minOrderValue || 0); setCouponExpiryInput(coupon.expiryDate || ''); setCouponUsageLimitInput(coupon.usageLimit || 0); setCouponPerUserLimitInput(coupon.perUserLimit || 0); setCouponPrebookingOnlyInput(!!coupon.prebookingOnly); setCouponActiveInput(coupon.active !== false); }
    else { setCouponEditId(null); setCouponCodeInput(''); setCouponTypeInput('percentage'); setCouponValueInput(10); setCouponMinOrderInput(0); setCouponExpiryInput(''); setCouponUsageLimitInput(0); setCouponPerUserLimitInput(0); setCouponPrebookingOnlyInput(false); setCouponActiveInput(true); }
    setCouponModalOpen(true);
  };

  const handleSaveCoupon = async () => {
    if (!couponCodeInput.trim() || couponValueInput <= 0) return;
    const payload = { code: couponCodeInput.trim().toUpperCase(), type: couponTypeInput, value: couponValueInput, minOrderValue: couponMinOrderInput || 0, expiryDate: couponExpiryInput || null, usageLimit: couponUsageLimitInput || 0, perUserLimit: couponPerUserLimitInput || 0, prebookingOnly: couponPrebookingOnlyInput, active: couponActiveInput };
    if (couponEditId) await updateData(`coupons/${couponEditId}`, payload); else await pushData('coupons', { ...payload, usageCount: 0, createdAt: Date.now() });
    setCouponModalOpen(false); setCouponEditId(null);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (confirm('Delete this coupon?')) {
      await deleteData(`coupons/${id}`);
    }
  };

  const handleOpenPreBookingModal = (item?: PreBooking) => {
    if (item) {
      setPreBookingEditId(item.id); setPreBookingProductId(item.productId); setPreBookingDurationId(item.durationId); setPreBookingEnabled(item.enabled !== false);
      setPreBookingTitle(item.title || 'Early Pre-Booking'); setPreBookingDescription(item.description || 'Pay the full amount now and reserve your release.'); setPreBookingBadge(item.badgeText || 'PRE-BOOKING');
      setPreBookingRelease(item.releaseDate || ''); setPreBookingPrice(Number(item.priceOverride || 0)); setPreBookingStart(item.startDate || ''); setPreBookingEnd(item.endDate || ''); setPreBookingSlots(Number(item.slots || 0)); setPreBookingRules(item.rules || '');
    } else {
      setPreBookingEditId(null); setPreBookingProductId(products[0]?.id || ''); setPreBookingDurationId(''); setPreBookingEnabled(true); setPreBookingTitle('Early Pre-Booking'); setPreBookingDescription('Pay the full amount now and reserve your release.'); setPreBookingBadge('PRE-BOOKING'); setPreBookingRelease(''); setPreBookingPrice(0); setPreBookingStart(''); setPreBookingEnd(''); setPreBookingSlots(0); setPreBookingRules('Full payment is required. Pre-bookings are confirmed after successful payment.');
    }
    setPreBookingModalOpen(true);
  };

  const handleSavePreBooking = async () => {
    if (!preBookingProductId || !preBookingDurationId) { alert('Select product and duration.'); return; }
    const payload = { productId: preBookingProductId, durationId: preBookingDurationId, enabled: preBookingEnabled, title: preBookingTitle.trim(), description: preBookingDescription.trim(), badgeText: preBookingBadge.trim() || 'PRE-BOOKING', releaseDate: preBookingRelease || null, startDate: preBookingStart || null, endDate: preBookingEnd || null, slots: Math.max(0, preBookingSlots || 0), rules: preBookingRules.trim(), priceOverride: preBookingPrice > 0 ? preBookingPrice : null, ...(preBookingEditId ? {} : { bookedCount: 0, createdAt: Date.now() }) };
    if (preBookingEditId) await updateData(`preBookings/${preBookingEditId}`, payload); else await pushData('preBookings', payload);
    setPreBookingModalOpen(false);
  };

  const handleDeletePreBooking = async (id: string) => { if (confirm('Delete this pre-booking configuration?')) await deleteData(`preBookings/${id}`); };

  const handleReleaseBooking = async (order: Order) => {
    if (order.bookingStatus === 'cancelled') return;

    // A pre-booking can only ever receive one key. If it was released before,
    // reuse the exact same key instead of assigning a new one.
    const existingAssignedKey = licenseKeys.find(
      k => k.orderId === order.orderId && k.productId === order.productId && k.durationId === order.durationId
    ) || licenseKeys.find(
      k => !!order.licenseKey && k.key === order.licenseKey && k.productId === order.productId && k.durationId === order.durationId
    );

    const keyObj = existingAssignedKey || licenseKeys.find(
      k => k.productId === order.productId && k.durationId === order.durationId && !k.used
    );

    if (!keyObj) { alert('No license key is available for this booking yet.'); return; }

    await updateData(`licenseKeys/${keyObj.id}`, {
      used: true,
      usedAt: keyObj.usedAt || Date.now(),
      orderId: order.orderId
    });
    await updateData(`orders/${order.id}`, { bookingStatus: 'released', licenseKey: keyObj.key });
  };

  const handleDeleteRelease = async (order: Order) => {
    if (!confirm(`Delete the release for pre-booking ${order.bookingId || order.orderId}? The assigned key will be preserved and this booking can be released again later with the SAME key.`)) return;

    // IMPORTANT: do not free/delete the key assignment. The order-to-key
    // mapping is permanent until the admin explicitly deletes the order.
    await updateData(`orders/${order.id}`, { bookingStatus: 'confirmed' });
  };

  const handlePermanentDeletePreBookingOrder = async (order: Order) => {
    const id = order.bookingId || order.orderId;
    if (!confirm(`PERMANENTLY DELETE order ${id}? This removes the booking, its permanent key assignment, and the order record. This cannot be undone.`)) return;

    const assignedKey = licenseKeys.find(k =>
      k.orderId === order.orderId ||
      (!!order.licenseKey && k.key === order.licenseKey)
    );

    if (assignedKey) {
      await deleteData(`licenseKeys/${assignedKey.id}`);
    }
    await deleteData(`orders/${order.id}`);
  };

  const handleCancelBooking = async (order: Order) => {
    if (confirm(`Cancel pre-booking ${order.bookingId || order.orderId}?`)) await updateData(`orders/${order.id}`, { bookingStatus: 'cancelled' });
  };

  // PRODUCT APK DOWNLOADS — multiple APK releases can be kept for each product
  const handleUploadProductApk = async (file: File) => {
    if (!apkLinkProductId) { alert('Please select a product first.'); return; }
    if (uploadingProductApk) return;
    const product = products.find(p => p.id === apkLinkProductId);
    if (!product) return;
    try {
      setUploadingProductApk(true);
      const uploaded = await uploadApkToSupabase(file);
      const link: ApkDownloadLink = {
        id: `apk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: apkLinkNameInput.trim() || uploaded.fileName.replace(/\.apk$/i, ''),
        url: uploaded.url,
        version: apkLinkVersionInput.trim(),
        storagePath: uploaded.path,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        createdAt: Date.now()
      };
      const existingLinks = Array.isArray(product.apkLinks) ? product.apkLinks : [];
      // Append only. Existing releases are never removed automatically.
      await updateData(`products/${product.id}`, { apkLinks: [...existingLinks, link] });
      setApkLinkNameInput('');
      setApkLinkVersionInput('');
      alert(`${product.name} APK uploaded successfully. Existing APK releases were kept.`);
    } catch (error: any) {
      alert(error?.message || 'Product APK upload failed.');
    } finally {
      setUploadingProductApk(false);
    }
  };

  const handleAddProductApkUrl = async () => {
    if (!apkLinkProductId) { alert('Please select a product first.'); return; }
    if (uploadingProductApk) return;
    const url = apkLinkUrlInput.trim();
    if (!/^https?:\/\//i.test(url)) { alert('Please enter a valid HTTP or HTTPS APK URL.'); return; }
    const product = products.find(p => p.id === apkLinkProductId);
    if (!product) return;
    try {
      setUploadingProductApk(true);
      const link: ApkDownloadLink = {
        id: `apk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: apkLinkNameInput.trim() || `APK ${apkLinkVersionInput.trim() || 'Release'}`,
        url,
        version: apkLinkVersionInput.trim(),
        createdAt: Date.now()
      };
      const existingLinks = Array.isArray(product.apkLinks) ? product.apkLinks : [];
      await updateData(`products/${product.id}`, { apkLinks: [...existingLinks, link] });
      setApkLinkNameInput('');
      setApkLinkVersionInput('');
      setApkLinkUrlInput('');
      alert(`${product.name} APK URL added successfully. Existing APK releases were kept.`);
    } catch (error: any) {
      alert(error?.message || 'Product APK URL save failed.');
    } finally {
      setUploadingProductApk(false);
    }
  };

  const handleDeleteApkLink = async (product: Product, linkId: string) => {
    const link = (product.apkLinks || []).find(item => item.id === linkId);
    if (!link) return;
    if (!confirm(`Delete the APK for ${product.name}?`)) return;
    try {
      setDeletingProductApkId(product.id);
      if (link.storagePath) await deleteApkFromSupabase(link.storagePath);
      const remainingLinks = (product.apkLinks || []).filter(item => item.id !== linkId);
      await updateData(`products/${product.id}`, { apkLinks: remainingLinks });
    } catch (error: any) {
      alert(error?.message || 'Product APK delete failed.');
    } finally {
      setDeletingProductApkId(null);
    }
  };

  // DIRECT APK UPLOAD / DELETE
  const handleUploadApk = async (file: File) => {
    if (uploadingApk || deletingApk) return;
    const previousPath = apkStoragePath;
    try {
      setUploadingApk(true);
      const uploaded = await uploadApkToSupabase(file);
      const nextAppName = apkNameSetting.trim() || uploaded.fileName.replace(/\.apk$/i, '');

      // Save the new URL/metadata first so the live site never points to a deleted APK.
      await setData('settings/apk', {
        url: uploaded.url,
        appName: nextAppName,
        version: apkVersionSetting.trim(),
        storagePath: uploaded.path,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize
      });

      setApkUrlSetting(uploaded.url);
      setApkNameSetting(nextAppName);
      setApkStoragePath(uploaded.path);
      setApkFileName(uploaded.fileName);
      setApkFileSize(uploaded.fileSize);

      if (previousPath && previousPath !== uploaded.path) {
        try {
          await deleteApkFromSupabase(previousPath);
        } catch (cleanupError) {
          console.warn('Old APK cleanup failed after replacement:', cleanupError);
        }
      }

      alert('APK uploaded successfully. The new download link is now active.');
    } catch (err: any) {
      console.error('APK upload failed:', err);
      alert(err?.message || 'APK upload failed.');
    } finally {
      setUploadingApk(false);
    }
  };

  const handleDeleteUploadedApk = async () => {
    if (deletingApk || uploadingApk) return;
    if (!apkStoragePath) {
      alert('No uploaded APK is linked to this project.');
      return;
    }
    if (!confirm(`Delete uploaded APK${apkFileName ? ` "${apkFileName}"` : ''}? This cannot be undone.`)) return;

    try {
      setDeletingApk(true);
      await deleteApkFromSupabase(apkStoragePath);
      await setData('settings/apk', {
        url: '',
        appName: '',
        version: '',
        storagePath: '',
        fileName: '',
        fileSize: 0
      });
      setApkUrlSetting('');
      setApkNameSetting('');
      setApkVersionSetting('');
      setApkStoragePath('');
      setApkFileName('');
      setApkFileSize(0);
      alert('Uploaded APK deleted successfully.');
    } catch (err: any) {
      console.error('APK delete failed:', err);
      alert(err?.message || 'APK delete failed.');
    } finally {
      setDeletingApk(false);
    }
  };

  // SAVE SETTINGS
  const handleSaveSettings = async () => {
    if (savingSettings) return;
    const minimumVersionCode = Math.max(1, Math.floor(Number(forceUpdateMinimumVersionCode) || CURRENT_APP_VERSION_CODE));
    const telegramUpdateUrl = forceUpdateTelegramUrl.trim();
    if (forceUpdateEnabled && !telegramUpdateUrl) {
      alert('Paste the Telegram post or channel link before enabling Force App Update.');
      return;
    }
    setSavingSettings(true);
    setSettingsSavedMsg(false);
    try {
      await Promise.all([
        setData('settings/razorpay', { keyId: rzpKeyIdInput.trim() }),
        setData('settings/admin', {
          username: adminUserSetting.trim() || 'admin',
          password: adminPassSetting.trim() || 'password123'
        }),
        setData('settings/apk', {
          url: apkStoragePath.trim() ? (settings.apkUrl ?? '') : '',
          appName: apkNameSetting.trim(),
          version: apkVersionSetting.trim(),
          storagePath: apkStoragePath.trim(),
          fileName: apkFileName.trim(),
          fileSize: apkFileSize || 0
        }),
        setData('settings/setup', { channelUrl: setupChannelUrlSetting.trim() }),
        setData('settings/website', {
          websiteLogoUrl: websiteLogoUrl.trim(),
          websiteName: websiteName.trim(),
          freeTrialEnabled,
          couponEnabled,
          emailDeliveryEnabled,
          emailDeliveryProvider: 'google-apps-script',
          emailSenderName: emailSenderName.trim(),
          emailReplyTo: emailReplyTo.trim(),
          emailLogoUrl: emailLogoUrl.trim(),
          showUserPanelInApp,
          showAdminPanelInApp,
          showUserPanelOnWebsite,
          showAdminPanelOnWebsite,
          appMenuStoreEnabled,
          appMenuRulesEnabled,
          appMenuTrackEnabled,
          appMenuFaqEnabled,
          appMenuSupportEnabled,
          appMenuTelegramEnabled,
          appMenuAdminEnabled,
          navbarStoreText: navbarStoreText.trim(),
          navbarRulesText: navbarRulesText.trim(),
          navbarTrackText: navbarTrackText.trim(),
          navbarFaqText: navbarFaqText.trim(),
          navbarSupportText: navbarSupportText.trim(),
          navbarTelegramText: navbarTelegramText.trim(),
          navbarAdminText: navbarAdminText.trim(),
          navbarMenuText: navbarMenuText.trim(),
          navbarCloseText: navbarCloseText.trim(),
          navbarTagline: navbarTagline.trim(),
          navbarStoreDescription: navbarStoreDescription.trim(),
          navbarRulesDescription: navbarRulesDescription.trim(),
          navbarTrackDescription: navbarTrackDescription.trim(),
          navbarFaqDescription: navbarFaqDescription.trim(),
          navbarSupportDescription: navbarSupportDescription.trim(),
          navbarTelegramDescription: navbarTelegramDescription.trim(),
          navbarAdminDescription: navbarAdminDescription.trim(),
          rulesTitle: rulesTitle.trim(),
          rulesSubtitle: rulesSubtitle.trim(),
          rulesDoneText: rulesDoneText.trim(),
          heroEyebrow: heroEyebrow.trim(),
          heroTitle: heroTitle.trim(),
          heroSubtitle: heroSubtitle.trim(),
          // Older APKs only understand maintenanceEnabled. Keeping this true
          // during a force update blocks those versions too.
          maintenanceEnabled: forceUpdateEnabled || maintenanceEnabled,
          websiteMaintenanceEnabled: maintenanceEnabled,
          maintenanceTitle: maintenanceTitle.trim(),
          maintenanceMessage: maintenanceMessage.trim(),
          maintenanceContactText: forceUpdateEnabled ? 'Download Latest Version' : maintenanceContactText.trim(),
          maintenanceContactUrl: forceUpdateEnabled ? telegramUpdateUrl : maintenanceContactUrl.trim(),
          forceUpdateEnabled,
          forceUpdateMinimumVersionCode: minimumVersionCode,
          forceUpdateVersionLabel: forceUpdateVersionLabel.trim() || 'Latest',
          forceUpdateTelegramUrl: telegramUpdateUrl,
          footerBrandText: footerBrandText.trim(),
          footerYearText: footerYearText.trim(),
          footerCopyrightText: footerCopyrightText.trim(),
          footerStoreText: footerStoreText.trim(),
          footerTrackText: footerTrackText.trim(),
          footerFaqText: footerFaqText.trim(),
          footerSupportText: footerSupportText.trim(),
          productLogos
        })
      ]);
      setSettingsSavedMsg(true);
      setTimeout(() => setSettingsSavedMsg(false), 3000);
    } catch (err: any) {
      console.error('Settings save failed:', err);
      alert(`Settings could not be saved. ${err?.message || 'Please check Firebase Database Rules and your connection.'}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // SEED DEFAULT DATABASE
  const handleSeedDatabase = async () => {
    if (confirm('Populate database with default sample products, prices, and stock keys?')) {
      await seedInitialDataIfEmpty();
      alert('Default data generated!');
    }
  };

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* Top Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            Authenticated Admin Mode
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Store Control Center</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDatabase}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-bold transition-all"
            title="Populate initial demo data"
          >
            <Database className="w-3.5 h-3.5" /> Seed DB
          </button>
          <button
            onClick={onAdminLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 mb-6 no-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'products', label: 'Products', icon: Package },
          { id: 'durations', label: 'Durations', icon: Clock },
          { id: 'prices', label: 'Prices', icon: DollarSign },
          { id: 'keys', label: 'License Keys', icon: Key },
          { id: 'trials', label: 'Trial Keys', icon: Zap },
          { id: 'coupons', label: 'Coupons', icon: Tag },
          { id: 'prebookings', label: 'Pre-Bookings', icon: CalendarDays },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
          { id: 'admin-console', label: 'Admin Console', icon: ShieldCheck },
          { id: 'website', label: 'Website', icon: Globe2 },
          { id: 'apk-links', label: 'APK Downloads', icon: Download }
        ].map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <IconComponent className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Metrics Row */}
          <div className="mb-3">
            <h3 className="text-sm font-bold text-white">Dashboard Statistics</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Revenue</span>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1">₹{totalRevenue}</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Sales</span>
                <div className="text-2xl font-black text-white mt-1">{totalSalesCount} Orders</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Keys In Stock</span>
                <div className="text-2xl font-black text-teal-400 mt-1">{activeKeysCount} Active</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
                <Key className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Keys Delivered</span>
                <div className="text-2xl font-black text-cyan-400 mt-1">{usedKeysCount} Sold</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Stock Availability Matrix Cards */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex flex-wrap items-center justify-between gap-2">
              <span>Inventory Stock Overview</span>
              <span className="text-xs font-normal text-slate-400">{activeKeysCount} Total Active Keys</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {durations.map((dur) => {
                const prod = products.find(p => p.id === dur.productId);
                const activeForThis = licenseKeys.filter(
                  k => k.productId === dur.productId && k.durationId === dur.id && !k.used
                ).length;
                const isLow = activeForThis > 0 && activeForThis <= 2;
                const isOut = activeForThis === 0;

                return (
                  <div key={dur.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-sm truncate">{prod?.name || 'Product'}</div>
                        <div className="text-xs text-slate-400 truncate">{dur.name} ({dur.unit})</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                        isOut ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        isLow ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>

                    <div className="text-xl font-extrabold font-mono text-emerald-400 mt-2">
                      {activeForThis} <span className="text-xs font-normal text-slate-400">Keys</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Orders List */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Recent Transactions</h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/80 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Order ID</th>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Product</th>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Duration</th>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Amount</th>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {orders.slice(0, 5).map((ord) => (
                    <tr key={ord.id || ord.orderId} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-white whitespace-nowrap">{ord.orderId}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{ord.productName}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{ord.durationName}</td>
                      <td className="px-4 py-3.5 font-mono text-emerald-400 whitespace-nowrap">₹{ord.finalAmount}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No transactions recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h3 className="text-base font-bold text-white">Products Catalog</h3>
            <button
              onClick={() => handleOpenProductModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Product Name</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Category</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Status</th>
                  <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{p.category || 'General'}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.enabled !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {p.enabled !== false ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenProductModal(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DURATIONS */}
      {activeTab === 'durations' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h3 className="text-base font-bold text-white">Access Durations</h3>
            <button
              onClick={() => handleOpenDurationModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Duration
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Product</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Duration Name</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Unit</th>
                  <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {durations.map((d) => {
                  const prod = products.find(p => p.id === d.productId);
                  return (
                    <tr key={d.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">{prod?.name || 'Unknown'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{d.name}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-500/10 text-teal-300 border border-teal-500/20">
                          {d.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDurationModal(d)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDuration(d.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PRICES */}
      {activeTab === 'prices' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h3 className="text-base font-bold text-white">Pricing Matrix</h3>
            <button
              onClick={() => handleOpenPriceModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" /> Set Price
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Product</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Duration</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Price</th>
                  <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {prices.map((pr) => {
                  const prod = products.find(p => p.id === pr.productId);
                  const dur = durations.find(d => d.id === pr.durationId);
                  return (
                    <tr key={pr.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">{prod?.name || 'Unknown'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{dur ? `${dur.name} (${dur.unit})` : 'Unknown'}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-400 whitespace-nowrap">₹{pr.price}</td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenPriceModal(pr)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePrice(pr.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: LICENSE KEYS */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          
          {/* Key Import Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6">
            <h3 className="text-base font-bold text-white mb-4">Add / Batch Import License Keys</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Select Product</label>
                <select
                  value={keyProductId}
                  onChange={(e) => {
                    setKeyProductId(e.target.value);
                    setKeyDurationId('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Choose Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Select Duration</label>
                <select
                  value={keyDurationId}
                  onChange={(e) => setKeyDurationId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Choose Duration</option>
                  {durations.filter(d => d.productId === keyProductId).map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.unit})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Single Key Adder</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="KEY-1234-ABCD-5678"
                    value={singleKeyInput}
                    onChange={(e) => setSingleKeyInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleAddSingleKey}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 shrink-0 transition-all"
                  >
                    Add Key
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Bulk Key Importer (One key per line)</label>
                <textarea
                  rows={3}
                  placeholder={`NOVA-KEY-001-AAA\nNOVA-KEY-002-BBB\nNOVA-KEY-003-CCC`}
                  value={bulkKeysInput}
                  onChange={(e) => setBulkKeysInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleImportBulkKeys}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" /> Import Batch
                </button>
              </div>
            </div>
          </div>

          {/* Keys Inventory Tables */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={() => setKeyFilterTab('active')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  keyFilterTab === 'active'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Active Keys ({activeKeysCount})
              </button>
              <button
                onClick={() => setKeyFilterTab('used')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  keyFilterTab === 'used'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Delivered / Used Keys ({usedKeysCount})
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/80 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Product</th>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Duration</th>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Key Text</th>
                    <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {licenseKeys
                    .filter(k => (keyFilterTab === 'active' ? !k.used : k.used))
                    .map((k) => {
                      const prod = products.find(p => p.id === k.productId);
                      const dur = durations.find(d => d.id === k.durationId);
                      return (
                        <tr key={k.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">{prod?.name || 'Unknown'}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">{dur?.name || 'Unknown'}</td>
                          <td className="px-4 py-3.5 font-mono text-emerald-400 select-all whitespace-nowrap">{k.key}</td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteKey(k.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors"
                              title="Delete Key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: TRIAL KEYS */}
      {activeTab === 'trials' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <span>Free Trial Keys Generator & Management</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select a product, attach your actual license key, and click generate. The system creates a reusable Trial Code. The same code can be activated by unlimited users until you delete it.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Select Target Product</label>
                <select
                  value={trialProductId}
                  onChange={(e) => setTrialProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Choose Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Trial Duration Title</label>
                <input
                  type="text"
                  value={trialDurationNameInput}
                  onChange={(e) => setTrialDurationNameInput(e.target.value)}
                  placeholder="2 Hours Free Trial"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Single Actual Key Input & Generate Trial Code */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Save Actual Key & Generate Trial Code</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Enter the real key below. Enter the Trial Code manually. No random code is generated. When users enter that Trial Code, each user receives this actual key. The same Trial Code can be reused by unlimited users!
              </p>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Type Trial Code manually (e.g. NOVA-TRIAL-001)"
                  value={trialCodeInput}
                  onChange={(e) => setTrialCodeInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl px-3.5 py-3 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Paste Actual Real Key here (e.g. VIP-REALKEY-9922-8811)"
                  value={trialSingleKeyInput}
                  onChange={(e) => setTrialSingleKeyInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl px-3.5 py-3 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleGenerateTrialKeyFromActualKey}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all shrink-0 flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Generate Trial Code</span>
                </button>
                </div>
              </div>
            </div>
          </div>

          {/* Trial Keys Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setTrialFilterTab('active')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    trialFilterTab === 'active'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Active Trial Codes ({trialKeys.length})
                </button>
                <button
                  onClick={() => setTrialFilterTab('used')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    trialFilterTab === 'used'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Activated Trial Codes ({trialKeys.filter(t => Number(t.usageCount || 0) > 0 || t.used).length})
                </button>
              </div>

              {trialKeys.filter(k => (trialFilterTab === 'active' ? true : (Number(k.usageCount || 0) > 0 || k.used))).length > 0 && (
                <button
                  onClick={handleClearAllFilteredTrialKeys}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All {trialFilterTab === 'active' ? 'Active' : 'Activated'}</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/80 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Product</th>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Duration</th>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Generated Trial Code (For User)</th>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Saved Actual Key (Revealed)</th>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Claimed By / Date</th>
                    <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {trialKeys
                    .filter(k => (trialFilterTab === 'active' ? true : (Number(k.usageCount || 0) > 0 || k.used)))
                    .map((k) => {
                      const prod = products.find(p => p.id === k.productId);
                      const displayTrialCode = k.trialCode || k.key || 'N/A';
                      const displayActualKey = k.actualKey || k.key || 'N/A';

                      return (
                        <tr key={k.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">{prod?.name || 'Unknown'}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">{k.durationName || '2 Hours Trial'}</td>
                          <td className="px-4 py-3.5 font-mono text-emerald-400 select-all font-bold whitespace-nowrap">{displayTrialCode}</td>
                          <td className="px-4 py-3.5 font-mono text-slate-300 select-all whitespace-nowrap">{displayActualKey}</td>
                          <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-emerald-400 font-semibold">
                                {Number(k.usageCount || 0)} activation{Number(k.usageCount || 0) === 1 ? '' : 's'} • Unlimited users
                              </span>
                              {k.lastUsedAt && (
                                <span className="text-[10px] text-slate-500">
                                  Last: {k.lastUsedByEmail || 'Trial User'} • {new Date(k.lastUsedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteTrialKey(k)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors"
                              title="Delete Trial Key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {trialKeys.filter(k => (trialFilterTab === 'active' ? true : (Number(k.usageCount || 0) > 0 || k.used))).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        No {trialFilterTab} trial keys found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h3 className="text-base font-bold text-white">Discount Coupons</h3>
            <button
              onClick={() => handleOpenCouponModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Coupon
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Code</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Discount</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Min Order</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Usage</th><th className="px-4 py-3.5 font-bold whitespace-nowrap">Type</th><th className="px-4 py-3.5 font-bold whitespace-nowrap">Expiry</th>
                  <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-400 whitespace-nowrap">{c.code}</td>
                    <td className="px-4 py-3.5 font-bold whitespace-nowrap">{c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">₹{c.minOrderValue || 0}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{c.usageCount||0} / {Number(c.usageLimit||0)>0 ? c.usageLimit : 'Unlimited'}</td><td className="px-4 py-3.5 whitespace-nowrap">{c.prebookingOnly ? 'Pre-booking only' : 'All orders'}</td><td className="px-4 py-3.5 whitespace-nowrap">{c.expiryDate || 'No expiry'}</td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenCouponModal(c)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors mr-1" title="Edit Coupon"><Edit className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PRE-BOOKINGS */}
      {activeTab === 'prebookings' && (
        <PreBookingManagement
          preBookings={preBookings}
          products={products}
          durations={durations}
          orders={orders}
          onAdd={() => handleOpenPreBookingModal()}
          onEdit={handleOpenPreBookingModal}
          onDelete={handleDeletePreBooking}
          onRelease={handleReleaseBooking}
          onDeleteRelease={handleDeleteRelease}
          onPermanentDelete={handlePermanentDeletePreBookingOrder}
          onCancel={handleCancelBooking}
        />
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h3 className="text-base font-bold text-white">Store Order Logs</h3>
            <div className="relative min-w-[200px]">
              <input
                type="text"
                placeholder="Search orders..."
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value.toLowerCase())}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Order ID</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Product</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Duration</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Pay Amount</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Assigned Key</th>
                  <th className="px-4 py-3.5 font-bold whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {orders
                  .filter(
                    o =>
                      !orderSearchTerm ||
                      o.orderId.toLowerCase().includes(orderSearchTerm) ||
                      o.productName.toLowerCase().includes(orderSearchTerm)
                  )
                  .map((ord) => (
                    <tr key={ord.id || ord.orderId} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-white whitespace-nowrap">{ord.orderId}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{ord.productName}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{ord.durationName}</td>
                      <td className="px-4 py-3.5 font-mono text-emerald-400 whitespace-nowrap">₹{ord.finalAmount}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-400 select-all whitespace-nowrap">{ord.licenseKey}</td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                        {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ADMIN CONSOLE */}
      {activeTab === 'admin-console' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6 max-w-2xl">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Admin Console</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Update the administrator username and password.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Username</div>
            <div className="text-sm font-bold text-white mt-1">{settings.adminUsername || 'admin'}</div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Current Password</label>
            <input type="password" value={currentAdminPassword} onChange={e=>setCurrentAdminPassword(e.target.value)} placeholder="Enter current password" autoComplete="current-password" className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">New Username</label>
            <input type="text" value={newAdminUsername} onChange={e=>setNewAdminUsername(e.target.value)} placeholder="Leave empty to keep current username" autoComplete="username" className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">New Password</label>
              <input type="password" value={newAdminPassword} onChange={e=>setNewAdminPassword(e.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Confirm New Password</label>
              <input type="password" value={confirmAdminPassword} onChange={e=>setConfirmAdminPassword(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <button onClick={handleUpdateAdminAccount} disabled={updatingAdminAccount} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20">
            {updatingAdminAccount ? 'Updating Admin Account...' : 'Update Admin Account'}
          </button>

          <p className="text-[11px] leading-5 text-slate-500">After a successful update, the current admin session is logged out so you can sign in again with the new credentials.</p>
        </div>
      )}

      {/* TAB CONTENT: WEBSITE */}
      {activeTab === 'website' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2"><Globe2 className="w-5 h-5 text-emerald-400" /> Website Editor</h3>
              <p className="text-xs text-slate-400 mt-1">Edit the public website content without changing source code.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Website Logo</label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center shrink-0">
                    <img src={websiteLogoUrl || '/logo.jpg'} alt="Website logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black cursor-pointer hover:bg-emerald-400 transition">
                        <Upload className="w-4 h-4" />
                        {uploadingWebsiteLogo ? 'Uploading...' : 'Upload Logo'}
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.gif"
                          className="hidden"
                          disabled={uploadingWebsiteLogo}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            e.currentTarget.value = '';
                            if (!file) return;
                            try {
                              setUploadingWebsiteLogo(true);
                              const url = await uploadWebsiteLogo(file);
                              setWebsiteLogoUrl(url);
                              await setData('settings/website/websiteLogoUrl', url);
                            } catch (err: any) {
                              alert(err?.message || 'Website logo upload failed.');
                            } finally {
                              setUploadingWebsiteLogo(false);
                            }
                          }}
                        />
                      </label>
                      <span className="text-[11px] text-slate-500">PNG, JPG, WEBP, GIF · max 5 MB</span>
                    </div>
                    <input value={websiteLogoUrl} onChange={e=>setWebsiteLogoUrl(e.target.value)} placeholder="Or paste an image URL..." className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" />
                  </div>
                </div>
              </div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Website / Navbar Name</label><input value={websiteName} onChange={e=>setWebsiteName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Footer Brand</label><input value={footerBrandText} onChange={e=>setFooterBrandText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div>
                <h4 className="text-sm font-bold text-white">Claim Free Trial Card</h4>
                <p className="mt-1 text-xs text-slate-400">Show or hide the free trial banner, button and trial popup for users.</p>
              </div>
              <button
                type="button"
                onClick={() => setFreeTrialEnabled(enabled => !enabled)}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black transition ${freeTrialEnabled ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {freeTrialEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div>
                <h4 className="text-sm font-bold text-white">Coupon Code</h4>
                <p className="mt-1 text-xs text-slate-400">Show or hide the coupon code field for users. When hidden, Email Address automatically becomes step 3.</p>
              </div>
              <button
                type="button"
                onClick={() => setCouponEnabled(enabled => !enabled)}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black transition ${couponEnabled ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {couponEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Automatic License Key Email</h4>
                  <p className="mt-1 text-xs text-slate-400">After a normal paid purchase, send the assigned license key to the buyer's email automatically. Free trials and pre-bookings are not emailed.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailDeliveryEnabled(enabled => !enabled)}
                  className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black transition ${emailDeliveryEnabled ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  {emailDeliveryEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] leading-5 text-emerald-100/80">
                Free Google Apps Script delivery is active. It checks pending paid orders every minute and sends the license key through Gmail. No EmailJS account, key, template or domain whitelist is required.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Reply-to Email (Optional)</label>
                  <input type="email" value={emailReplyTo} onChange={e => setEmailReplyTo(e.target.value)} placeholder="support@example.com" className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-3" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Sender / Store Name</label>
                  <input value={emailSenderName} onChange={e => setEmailSenderName(e.target.value)} placeholder="PeakLoader Shop" className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-3" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Logo URL</label>
                  <input type="url" value={emailLogoUrl} onChange={e => setEmailLogoUrl(e.target.value)} placeholder="https://.../peakloader-logo.png" className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-3" />
                  <p className="mt-1.5 text-[10px] text-slate-500">Use a public HTTPS logo URL so it appears in the Gmail email header.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-white">App & Website Panel Visibility</h4>
                <p className="mt-1 text-xs text-slate-400">Control where users see the Store and where the Admin menu is available. Keep at least one panel enabled on each platform.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setShowUserPanelInApp(enabled => !enabled)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${showUserPanelInApp ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}><span className="text-xs font-bold">Mobile App: User Store</span><span className="text-[10px] font-black">{showUserPanelInApp ? 'ON' : 'OFF'}</span></button>
                <button type="button" onClick={() => setShowAdminPanelInApp(enabled => !enabled)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${showAdminPanelInApp ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}><span className="text-xs font-bold">Mobile App: Admin Panel</span><span className="text-[10px] font-black">{showAdminPanelInApp ? 'ON' : 'OFF'}</span></button>
                <button type="button" onClick={() => setShowUserPanelOnWebsite(enabled => !enabled)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${showUserPanelOnWebsite ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}><span className="text-xs font-bold">Website: User Store</span><span className="text-[10px] font-black">{showUserPanelOnWebsite ? 'ON' : 'OFF'}</span></button>
                <button type="button" onClick={() => setShowAdminPanelOnWebsite(enabled => !enabled)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${showAdminPanelOnWebsite ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}><span className="text-xs font-bold">Website: Admin Menu</span><span className="text-[10px] font-black">{showAdminPanelOnWebsite ? 'ON' : 'OFF'}</span></button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-white">Mobile App Menu Items</h4>
                <p className="mt-1 text-xs text-slate-400">Choose exactly which options are visible inside the Android app Menu. These controls do not change the website menu.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setAppMenuStoreEnabled(enabled => !enabled)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${appMenuStoreEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}><span className="text-xs font-bold">Store</span><span className="text-[10px] font-black">{appMenuStoreEnabled ? 'ON' : 'OFF'}</span></button>
                <button type="button" onClick={() => setAppMenuRulesEnabled(enabled => !enabled)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${appMenuRulesEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}><span className="text-xs font-bold">Follow Rules</span><span className="text-[10px] font-black">{appMenuRulesEnabled ? 'ON' : 'OFF'}</span></button>
                <button type="button" onClick={() => setAppMenuTrackEnabled(enabled => !enabled)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${appMenuTrackEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}><span className="text-xs font-bold">Track Order</span><span className="text-[10px] font-black">{appMenuTrackEnabled ? 'ON' : 'OFF'}</span></button>
                <button type="button" onClick={() => setAppMenuFaqEnabled(enabled => !enabled)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${appMenuFaqEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}><span className="text-xs font-bold">FAQ</span><span className="text-[10px] font-black">{appMenuFaqEnabled ? 'ON' : 'OFF'}</span></button>
                <button type="button" onClick={() => setAppMenuSupportEnabled(enabled => !enabled)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${appMenuSupportEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}><span className="text-xs font-bold">Support</span><span className="text-[10px] font-black">{appMenuSupportEnabled ? 'ON' : 'OFF'}</span></button>
                <button type="button" onClick={() => setAppMenuTelegramEnabled(enabled => !enabled)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${appMenuTelegramEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}><span className="text-xs font-bold">Telegram Support</span><span className="text-[10px] font-black">{appMenuTelegramEnabled ? 'ON' : 'OFF'}</span></button>
                <button type="button" onClick={() => setAppMenuAdminEnabled(enabled => !enabled)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${appMenuAdminEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}><span className="text-xs font-bold">Admin / Control Panel</span><span className="text-[10px] font-black">{appMenuAdminEnabled ? 'ON' : 'OFF'}</span></button>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div>
              <h4 className="text-sm font-bold text-white">Product Download Logos</h4>
              <p className="text-xs text-slate-400 mt-1">Set a separate logo for each product. It will appear beside the Download APK button on purchase and trial success screens.</p>
            </div>
            <div className="space-y-3">
              {products.map(product => (
                <div key={product.id} className="grid grid-cols-1 sm:grid-cols-[180px_1fr_auto] gap-3 items-center bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shrink-0 flex items-center justify-center">
                      <img src={productLogos[product.id] || product.icon || '/logo.jpg'} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-bold text-white truncate">{product.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black cursor-pointer hover:bg-emerald-400 transition">
                      <Upload className="w-4 h-4" />
                      {uploadingProductLogo === product.id ? 'Uploading...' : 'Upload Logo'}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.gif"
                        className="hidden"
                        disabled={uploadingProductLogo === product.id}
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          e.currentTarget.value = '';
                          if (!file) return;
                          try {
                            setUploadingProductLogo(product.id);
                            const url = await uploadProductLogo(product.id, file);
                            setProductLogos(prev => ({ ...prev, [product.id]: url }));
                            await setData(`settings/website/productLogos/${product.id}`, url);
                          } catch (err: any) {
                            alert(err?.message || 'Logo upload failed.');
                          } finally {
                            setUploadingProductLogo(null);
                          }
                        }}
                      />
                    </label>
                    <span className="text-[11px] text-slate-500">PNG, JPG, WEBP · max 5 MB</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => { setProductLogos(prev => { const next = { ...prev }; delete next[product.id]; return next; }); await deleteData(`settings/website/productLogos/${product.id}`); }}
                    className="h-10 px-3 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs font-bold"
                    title="Use default logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {products.length === 0 && <p className="text-xs text-slate-500">Add products first to configure their logos.</p>}
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div><h4 className="text-sm font-bold text-white">Menu Bar & Navigation</h4><p className="text-xs text-slate-400 mt-1">These fields match the actual public Menu. Pre-Booking is intentionally not a menu item; it remains inside the Store flow.</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['Menu Button',navbarMenuText,setNavbarMenuText],['Close Button',navbarCloseText,setNavbarCloseText],
                ['Store',navbarStoreText,setNavbarStoreText],['Follow Rules',navbarRulesText,setNavbarRulesText],
                ['Track Order',navbarTrackText,setNavbarTrackText],['FAQ',navbarFaqText,setNavbarFaqText],
                ['Support',navbarSupportText,setNavbarSupportText],['Telegram Support',navbarTelegramText,setNavbarTelegramText],
                ['Admin',navbarAdminText,setNavbarAdminText],['Navbar Tagline',navbarTagline,setNavbarTagline],
                ['Store Description',navbarStoreDescription,setNavbarStoreDescription],['Rules Description',navbarRulesDescription,setNavbarRulesDescription],
                ['Track Description',navbarTrackDescription,setNavbarTrackDescription],['FAQ Description',navbarFaqDescription,setNavbarFaqDescription],
                ['Support Description',navbarSupportDescription,setNavbarSupportDescription],['Telegram Description',navbarTelegramDescription,setNavbarTelegramDescription],
                ['Admin Description',navbarAdminDescription,setNavbarAdminDescription],['Rules Title',rulesTitle,setRulesTitle],
                ['Rules Subtitle',rulesSubtitle,setRulesSubtitle],['Rules Done Text',rulesDoneText,setRulesDoneText]
              ].map(([label,value,setter])=><div key={label as string}><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{label as string}</label><input value={value as string} onChange={e=>(setter as any)(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>)}
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
            <h4 className="text-sm font-bold text-white">Homepage Hero Content</h4>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Eyebrow</label><input value={heroEyebrow} onChange={e=>setHeroEyebrow(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Main Heading</label><input value={heroTitle} onChange={e=>setHeroTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Subtitle</label><textarea rows={3} value={heroSubtitle} onChange={e=>setHeroSubtitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 resize-y" /></div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-4"><div><h4 className="text-sm font-bold text-white">Website & App Maintenance</h4><p className="text-xs text-slate-400 mt-1">When enabled, users see the maintenance card while admin remains accessible.</p></div><button onClick={()=>setMaintenanceEnabled(v=>!v)} className={`px-4 py-2 rounded-xl text-xs font-black ${maintenanceEnabled?'bg-rose-500 text-white':'bg-emerald-500 text-slate-950'}`}>{maintenanceEnabled?'ON':'OFF'}</button></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Maintenance Title</label><input value={maintenanceTitle} onChange={e=>setMaintenanceTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Maintenance Message</label><textarea rows={3} value={maintenanceMessage} onChange={e=>setMaintenanceMessage(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Contact Button Text</label><input value={maintenanceContactText} onChange={e=>setMaintenanceContactText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Contact URL</label><input value={maintenanceContactUrl} onChange={e=>setMaintenanceContactUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div></div>
          </div>
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Force App Update</h4>
                <p className="text-xs text-slate-400 mt-1">Block older installed APKs and send users to your Telegram update link. Enable only after the new APK has been uploaded to Telegram.</p>
              </div>
              <button type="button" onClick={() => setForceUpdateEnabled(v => !v)} className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black ${forceUpdateEnabled ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'}`}>{forceUpdateEnabled ? 'ON' : 'OFF'}</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Required Version Code</label>
                <input type="number" min="1" value={forceUpdateMinimumVersionCode} onChange={e=>setForceUpdateMinimumVersionCode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" />
                <p className="mt-1 text-[10px] text-slate-500">This APK is code {CURRENT_APP_VERSION_CODE}. Keep this code for the current APK; use a higher code only for a newer APK.</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Latest Version Label</label>
                <input value={forceUpdateVersionLabel} onChange={e=>setForceUpdateVersionLabel(e.target.value)} placeholder="1.0.0" className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Telegram APK / Post Link</label>
                <input type="url" value={forceUpdateTelegramUrl} onChange={e=>setForceUpdateTelegramUrl(e.target.value)} placeholder="https://t.me/your_channel/..." className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" />
              </div>
            </div>
            <p className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5 text-[11px] leading-5 text-emerald-100/80">Newer apps show a dedicated “New Version Available” Telegram screen. Already-installed old APKs are blocked through their maintenance card and receive a “Download Latest Version” Telegram button.</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
            <h4 className="text-sm font-bold text-white">Footer Content</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Footer Brand</label><input value={footerBrandText} onChange={e=>setFooterBrandText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Year</label><input value={footerYearText} onChange={e=>setFooterYearText(e.target.value)} placeholder="2026" className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Copyright Text</label><input value={footerCopyrightText} onChange={e=>setFooterCopyrightText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Footer Store Link</label><input value={footerStoreText} onChange={e=>setFooterStoreText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Footer Track Order Link</label><input value={footerTrackText} onChange={e=>setFooterTrackText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Footer FAQ Link</label><input value={footerFaqText} onChange={e=>setFooterFaqText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Footer Support Link</label><input value={footerSupportText} onChange={e=>setFooterSupportText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
            </div>
          </div>
          <button onClick={handleSaveSettings} disabled={savingSettings} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20">{savingSettings ? 'Saving Website...' : 'Save Website Changes'}</button>
        </div>
      )}

      {/* TAB CONTENT: APK DOWNLOADS */}
      {activeTab === 'apk-links' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">Product APK Downloads</h3>
              <p className="text-xs text-slate-400 mt-1">Select a product and upload APK releases directly. Multiple APK versions can be kept for the same product; existing releases are never deleted automatically. Users only see APKs mapped to the product they purchased or activated in a trial.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Select Product</label>
                <select value={apkLinkProductId} onChange={e=>setApkLinkProductId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3">
                  <option value="">Select a product</option>
                  {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">APK Version</label>
                <input value={apkLinkVersionInput} onChange={e=>setApkLinkVersionInput(e.target.value)} placeholder="v2.4.0" className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">APK Display Name (optional)</label>
              <input value={apkLinkNameInput} onChange={e=>setApkLinkNameInput(e.target.value)} placeholder="Uses the APK filename if left empty" className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black cursor-pointer hover:bg-emerald-400 transition">
                <Upload className="w-4 h-4" />
                {uploadingProductApk ? 'Uploading APK...' : 'Upload APK for Selected Product'}
                <input type="file" accept=".apk,application/vnd.android.package-archive" className="hidden" disabled={uploadingProductApk} onChange={async e=>{ const file=e.target.files?.[0]; e.currentTarget.value=''; if(file) await handleUploadProductApk(file); }} />
              </label>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">External APK URL</h4>
                <p className="text-[10px] text-slate-500 mt-1">Use this for large APKs hosted on GitHub Releases, Google Drive, Dropbox, OneDrive, CDN, your own server, or any HTTP/HTTPS download URL.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={apkLinkUrlInput} onChange={e=>setApkLinkUrlInput(e.target.value)} placeholder="https://example.com/app.apk" className="sm:col-span-2 w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" />
              </div>
              <button type="button" onClick={handleAddProductApkUrl} disabled={uploadingProductApk || !apkLinkUrlInput.trim()} className="px-4 py-3 rounded-xl bg-sky-500 text-slate-950 text-xs font-black hover:bg-sky-400 disabled:opacity-50">
                {uploadingProductApk ? 'Saving URL...' : 'Add APK URL for Selected Product'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">Both methods create a new release. Existing APK releases are never replaced or deleted automatically. Admin Delete is required to remove a release.</p>
          </div>

          <div className="space-y-3">
            {products.map(product => {
              const links = [...(product.apkLinks || [])].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
              return (
                <div key={product.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white">{product.name}</div>
                      {links.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {links.map((link, index) => (
                            <div key={link.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-emerald-400">{link.name}</span>
                                  {link.version && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">{link.version}</span>}
                                  {index === 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">Latest</span>}
                                  {link.fileSize ? <span className="text-[9px] text-slate-500">{(link.fileSize/(1024*1024)).toFixed(2)} MB</span> : null}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 truncate">{link.fileName || link.url}</p>
                              </div>
                              <button onClick={()=>handleDeleteApkLink(product, link.id)} disabled={deletingProductApkId===product.id} className="shrink-0 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 text-xs font-bold">{deletingProductApkId===product.id ? 'Deleting...' : 'Delete'}</button>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-slate-500 mt-1">No APK uploaded for this product.</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            {products.length===0 && <p className="text-xs text-slate-500">Add products first to configure product APKs.</p>}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6 max-w-2xl">
          <h3 className="text-base font-bold text-white">Store Configuration & Gateway Settings</h3>

          {settingsSavedMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              All settings saved successfully!
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Razorpay Key ID (Merchant)</label>
            <input
              type="password"
              value={rzpKeyIdInput}
              onChange={(e) => setRzpKeyIdInput(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl p-3"
            />
          </div>


          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Setup Guide Channel URL</label><input type="url" value={setupChannelUrlSetting} onChange={e=>setSetupChannelUrlSetting(e.target.value)} placeholder="https://t.me/your_setup_channel" className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /><p className="text-[11px] text-slate-500 mt-1">Shown as Setup Guide on purchase and trial success pages.</p></div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
          >
            {savingSettings ? 'Saving Settings...' : 'Save All Settings'}
          </button>
        </div>
      )}

      {/* MODAL: Product Add/Edit */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {productEditId ? 'Edit Product' : 'Add New Product'}
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Product Name</label>
              <input
                type="text"
                value={productNameInput}
                onChange={(e) => setProductNameInput(e.target.value)}
                placeholder="e.g. PeakLoader Premium"
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Category</label>
              <input
                type="text"
                value={productCategoryInput}
                onChange={(e) => setProductCategoryInput(e.target.value)}
                placeholder="e.g. Gaming ESP / Software"
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Description</label>
              <textarea
                value={productDescInput}
                onChange={(e) => setProductDescInput(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableCheck"
                checked={productEnabledInput}
                onChange={(e) => setProductEnabledInput(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
              />
              <label htmlFor="enableCheck" className="text-xs text-white">Enabled in Store</label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setProductModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Duration Add/Edit */}
      {durationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {durationEditId ? 'Edit Duration' : 'Add Access Duration'}
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Product</label>
              <select
                value={durationProductId}
                onChange={(e) => setDurationProductId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Duration Title</label>
              <input
                type="text"
                value={durationNameInput}
                onChange={(e) => setDurationNameInput(e.target.value)}
                placeholder="e.g. 7 Days Access"
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Time Unit</label>
              <select
                value={durationUnitInput}
                onChange={(e) => setDurationUnitInput(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDurationModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDuration}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Price Add/Edit */}
      {priceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Set Pricing</h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Product</label>
              <select
                value={priceProductId}
                onChange={(e) => {
                  setPriceProductId(e.target.value);
                  setPriceDurationId('');
                }}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Duration</label>
              <select
                value={priceDurationId}
                onChange={(e) => setPriceDurationId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Choose Duration --</option>
                {durations.filter(d => d.productId === priceProductId).map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.unit})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Price (₹)</label>
              <input
                type="number"
                value={priceValueInput}
                onChange={(e) => setPriceValueInput(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPriceModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrice}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors"
              >
                Save Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Pre-Booking Add/Edit */}
      {preBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-base font-bold text-white">{preBookingEditId?'Edit Pre-Booking':'Create Pre-Booking'}</h3><CalendarDays className="w-5 h-5 text-amber-400"/></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Product</label><select value={preBookingProductId} onChange={e=>{setPreBookingProductId(e.target.value);setPreBookingDurationId('')}} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3">{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Duration</label><select value={preBookingDurationId} onChange={e=>setPreBookingDurationId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3"><option value="">Choose duration</option>{durations.filter(d=>d.productId===preBookingProductId).map(d=><option key={d.id} value={d.id}>{d.name} ({d.unit})</option>)}</select></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-400 mb-1">Title</label><input value={preBookingTitle} onChange={e=>setPreBookingTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3"/></div><div><label className="block text-xs font-bold text-slate-400 mb-1">Badge</label><input value={preBookingBadge} onChange={e=>setPreBookingBadge(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3"/></div></div>
            <div><label className="block text-xs font-bold text-slate-400 mb-1">Description</label><textarea value={preBookingDescription} onChange={e=>setPreBookingDescription(e.target.value)} rows={2} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3"/></div>
            <div><label className="block text-xs font-bold text-slate-400 mb-1">Pre-Booking Price (0 = Use Normal Price)</label><input type="number" min="0" value={preBookingPrice} onChange={e=>setPreBookingPrice(parseFloat(e.target.value)||0)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3"/></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-400 mb-1">Start Date</label><input type="datetime-local" value={preBookingStart} onChange={e=>setPreBookingStart(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3"/></div><div><label className="block text-xs font-bold text-slate-400 mb-1">Close Date</label><input type="datetime-local" value={preBookingEnd} onChange={e=>setPreBookingEnd(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3"/></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-400 mb-1">Release Date</label><input type="datetime-local" value={preBookingRelease} onChange={e=>setPreBookingRelease(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3"/></div><div><label className="block text-xs font-bold text-slate-400 mb-1">Slots (0 = Unlimited)</label><input type="number" min="0" value={preBookingSlots} onChange={e=>setPreBookingSlots(parseInt(e.target.value)||0)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3"/></div></div>
            <div><label className="block text-xs font-bold text-slate-400 mb-1">Pre-Booking Rules</label><textarea value={preBookingRules} onChange={e=>setPreBookingRules(e.target.value)} rows={4} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3"/></div>
            <label className="flex items-center gap-2 text-xs text-white"><input type="checkbox" checked={preBookingEnabled} onChange={e=>setPreBookingEnabled(e.target.checked)}/> Enabled in Store</label>
            <div className="flex gap-2"><button onClick={()=>setPreBookingModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button><button onClick={handleSavePreBooking} className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold">Save Pre-Booking</button></div>
          </div>
        </div>
      )}

      {/* MODAL: Coupon Add */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">{couponEditId ? 'Edit Coupon Code' : 'Create Coupon Code'}</h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Coupon Code</label>
              <input
                type="text"
                placeholder="SAVE20"
                value={couponCodeInput}
                onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs uppercase rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Type</label>
              <select
                value={couponTypeInput}
                onChange={(e) => setCouponTypeInput(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Value</label>
              <input
                type="number"
                value={couponValueInput}
                onChange={(e) => setCouponValueInput(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Minimum Order Value (₹)</label>
              <input
                type="number"
                value={couponMinOrderInput}
                onChange={(e) => setCouponMinOrderInput(parseFloat(e.target.value) || 0)}
                placeholder="0 = no min"
                className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Expiry Date (Optional)</label>
              <input
                type="date"
                value={couponExpiryInput}
                onChange={(e) => setCouponExpiryInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Usage Limit (0 = Unlimited)</label><input type="number" min="0" value={couponUsageLimitInput} onChange={e=>setCouponUsageLimitInput(parseInt(e.target.value)||0)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Scope</label><select value={couponPrebookingOnlyInput ? 'pre' : 'all'} onChange={e=>setCouponPrebookingOnlyInput(e.target.value==='pre')} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3"><option value="all">All orders</option><option value="pre">Pre-booking only</option></select></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Per User Limit (0 = Unlimited)</label><input type="number" min="0" value={couponPerUserLimitInput} onChange={e=>setCouponPerUserLimitInput(parseInt(e.target.value)||0)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3" /></div>
              <label className="flex items-center gap-2 text-xs text-white pt-6"><input type="checkbox" checked={couponActiveInput} onChange={e=>setCouponActiveInput(e.target.checked)}/> Active Coupon</label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCouponModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCoupon}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
