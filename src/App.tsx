import React, { useState, useEffect, useCallback, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { 
  Product, 
  Duration, 
  Price, 
  LicenseKey, 
  TrialKey,
  Coupon, 
  Order, 
  Settings,
  PreBooking,
} from './types';
import { 
  subscribeToPath, 
  firebaseConfig
} from './lib/firebase';
import { Navbar } from './components/Navbar';
import { StoreFront } from './components/StoreFront';
import { SuccessPage } from './components/SuccessPage';
import { OrderLookup } from './components/OrderLookup';
import { FaqPage } from './components/FaqPage';
import { ContactPage } from './components/ContactPage';
import { AdminPortal } from './components/AdminPortal';
import { OfflineScreen } from './components/OfflineScreen';
import { Download, Key, ShieldCheck, Heart } from 'lucide-react';

const USER_PANEL_SECTIONS = new Set(['home', 'success', 'lookup', 'faq', 'contact']);
const ADMIN_PANEL_SECTIONS = new Set(['admin', 'admin-login']);
const CONNECTION_TIMEOUT_MS = 7000;
const APP_VERSION_CODE = 1;

type ConnectionStatus = 'checking' | 'online' | 'offline';

export default function App() {
  const isNativeApp = Capacitor.isNativePlatform();
  const initialSection = isNativeApp ? 'home' : 'admin-login';
  // Navigation State
  const [currentSection, setCurrentSection] = useState<string>(initialSection);
  const [focusPreBooking, setFocusPreBooking] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const currentSectionRef = useRef(initialSection);
  const navigationHistoryRef = useRef<string[]>([]);
  const connectionCheckIdRef = useRef(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [isRetryingConnection, setIsRetryingConnection] = useState(false);

  const navigateTo = useCallback((section: string) => {
    const current = currentSectionRef.current;
    if (current === section) return;

    navigationHistoryRef.current.push(current);
    currentSectionRef.current = section;
    setCurrentSection(section);
  }, []);

  const returnToHome = useCallback(() => {
    navigationHistoryRef.current = [];
    currentSectionRef.current = 'home';
    setCurrentSection('home');
  }, []);

  const checkConnection = useCallback(async (showCheckingState = false) => {
    const currentCheckId = ++connectionCheckIdRef.current;

    // Android's native network listener is more reliable than a WebView's
    // navigator.onLine value after the app is already open.
    if (Capacitor.isNativePlatform()) {
      try {
        const nativeStatus = await Network.getStatus();
        if (!nativeStatus.connected) {
          if (currentCheckId === connectionCheckIdRef.current) {
            setConnectionStatus('offline');
          }
          return false;
        }
      } catch {
        // Use the browser fallback below if the native status is unavailable.
      }
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (currentCheckId === connectionCheckIdRef.current) {
        setConnectionStatus('offline');
      }
      return false;
    }

    if (showCheckingState) {
      setConnectionStatus('checking');
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CONNECTION_TIMEOUT_MS);

    try {
      // The request is only a lightweight reachability test. A response of any
      // kind means the app can reach the same Firebase service it uses for data.
      await fetch(`${firebaseConfig.databaseURL}/.json?shallow=true`, {
        cache: 'no-store',
        mode: 'no-cors',
        signal: controller.signal
      });

      if (currentCheckId === connectionCheckIdRef.current) {
        setConnectionStatus('online');
      }
      return true;
    } catch {
      if (currentCheckId === connectionCheckIdRef.current) {
        setConnectionStatus('offline');
      }
      return false;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  const retryConnection = useCallback(async () => {
    setIsRetryingConnection(true);
    await checkConnection(true);
    setIsRetryingConnection(false);
  }, [checkConnection]);

  useEffect(() => {
    let nativeNetworkListener: { remove: () => Promise<void> } | undefined;
    let isUnmounted = false;

    void checkConnection(true);

    const handleOnline = () => { void checkConnection(true); };
    const handleOffline = () => {
      ++connectionCheckIdRef.current;
      setConnectionStatus('offline');
    };

    if (Capacitor.isNativePlatform()) {
      void Network.addListener('networkStatusChange', (status) => {
        if (status.connected) {
          void checkConnection(true);
        } else {
          handleOffline();
        }
      }).then((listener) => {
        if (isUnmounted) {
          void listener.remove();
        } else {
          nativeNetworkListener = listener;
        }
      }).catch(() => {
        // The periodic check below still covers older Android WebViews.
      });
    }

    // This covers devices that do not emit an Android network-change event
    // immediately when mobile data is switched off while the app is open.
    const connectionCheckInterval = window.setInterval(() => {
      void checkConnection();
    }, 8000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      isUnmounted = true;
      window.clearInterval(connectionCheckInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (nativeNetworkListener) void nativeNetworkListener.remove();
    };
  }, [checkConnection]);

  const goToPreviousSection = useCallback(() => {
    const previousSection = navigationHistoryRef.current.pop();

    if (previousSection) {
      currentSectionRef.current = previousSection;
      setCurrentSection(previousSection);
      return true;
    }

    if (currentSectionRef.current !== 'home') {
      currentSectionRef.current = 'home';
      setCurrentSection('home');
      return true;
    }

    return false;
  }, []);

  // Android's left/right edge-back gesture and its system Back button now
  // follow the in-app screen history; pressing Back on the Store exits the app.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: { remove: () => Promise<void> } | undefined;
    let isUnmounted = false;

    void CapacitorApp.addListener('backButton', () => {
      if (!goToPreviousSection()) {
        void CapacitorApp.exitApp();
      }
    }).then((handle) => {
      if (isUnmounted) {
        void handle.remove();
      } else {
        listener = handle;
      }
    });

    return () => {
      isUnmounted = true;
      if (listener) void listener.remove();
    };
  }, [goToPreviousSection]);

  // Database Collections State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWebsiteSettingsReady, setIsWebsiteSettingsReady] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [durations, setDurations] = useState<Duration[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [licenseKeys, setLicenseKeys] = useState<LicenseKey[]>([]);
  const [trialKeys, setTrialKeys] = useState<TrialKey[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [preBookings, setPreBookings] = useState<PreBooking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings>({
    razorpayKeyId: 'rzp_test_5dd3025e9aa2',
    adminUsername: 'admin',
    adminPassword: 'password123',
    apkUrl: '',
    apkAppName: 'PeakLoader Shop',
    apkVersion: 'v1.0.0',
    telegramUrl: '',
    setupChannelUrl: '',
    websiteLogoUrl: '/logo.jpg',
    websiteName: 'PeakLoader Shop',
    freeTrialEnabled: true,
    couponEnabled: true,
    emailDeliveryEnabled: false,
    emailDeliveryProvider: 'google-apps-script',
    emailJsServiceId: '',
    emailJsTemplateId: '',
    emailJsPublicKey: '',
    emailSenderName: 'PeakLoader Shop',
    emailReplyTo: '',
    emailLogoUrl: '',
    showUserPanelInApp: true,
    showAdminPanelInApp: false,
    showUserPanelOnWebsite: false,
    showAdminPanelOnWebsite: true,
    appMenuStoreEnabled: true,
    appMenuRulesEnabled: true,
    appMenuTrackEnabled: true,
    appMenuFaqEnabled: true,
    appMenuSupportEnabled: true,
    appMenuTelegramEnabled: true,
    appMenuAdminEnabled: true,
    navbarStoreText: 'Store',
    navbarRulesText: 'Follow Rules',
    navbarTrackText: 'Track Order',
    navbarFaqText: 'FAQ',
    navbarSupportText: 'Support',
    navbarTelegramText: 'Telegram Support',
    navbarAdminText: 'Admin',
    navbarMenuText: 'Menu',
    navbarCloseText: 'Close',
    navbarTagline: 'Instant Digital License & Key Portal',
    navbarStoreDescription: 'Products & Licenses',
    navbarRulesDescription: 'Flag Ban Safety',
    navbarTrackDescription: 'Find Key by Order ID',
    navbarFaqDescription: 'Frequently Asked Questions',
    navbarSupportDescription: 'Contact & Ticket',
    navbarTelegramDescription: 'Telegram Support',
    navbarAdminDescription: 'Login to Control Panel',
    rulesTitle: 'Follow Rules',
    rulesSubtitle: 'Flag Ban Safety Notice',
    rulesDoneText: 'Done & Close',
    heroEyebrow: 'Auto-Delivery License Portal',
    heroTitle: 'PeakLoader Shop',
    heroSubtitle: 'Select your software or gaming pass below. Receive your original license key immediately upon payment.',
    maintenanceEnabled: false,
    websiteMaintenanceEnabled: false,
    maintenanceTitle: 'Website Under Maintenance',
    maintenanceMessage: 'We are currently updating the website. Please check back soon.',
    maintenanceContactText: 'Contact Support',
    maintenanceContactUrl: '',
    forceUpdateEnabled: false,
    forceUpdateMinimumVersionCode: APP_VERSION_CODE,
    forceUpdateVersionLabel: '1.0.0',
    forceUpdateTelegramUrl: '',
    footerBrandText: 'PeakLoader Shop',
    footerYearText: '2026',
    footerCopyrightText: 'All rights reserved.',
    footerStoreText: 'Store',
    footerTrackText: 'Track Order',
    footerFaqText: 'FAQ',
    footerSupportText: 'Support',
    productLogos: {}
  });

  // Seed DB if empty on mount and setup Realtime Listeners
  useEffect(() => {
    // 1. Subscribe Products
    const unsubProducts = subscribeToPath<Record<string, Omit<Product, 'id'>>>('products', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ ...val, id } as Product));
        setProducts(list);
      } else {
        setProducts([]);
      }
      setIsLoading(false);
    });

    // 2. Subscribe Durations
    const unsubDurations = subscribeToPath<Record<string, Omit<Duration, 'id'>>>('durations', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ ...val, id } as Duration));
        setDurations(list);
      } else {
        setDurations([]);
      }
    });

    // 3. Subscribe Prices
    const unsubPrices = subscribeToPath<Record<string, Omit<Price, 'id'>>>('prices', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ ...val, id } as Price));
        setPrices(list);
      } else {
        setPrices([]);
      }
    });

    // 4. Subscribe License Keys
    const unsubKeys = subscribeToPath<Record<string, Omit<LicenseKey, 'id'>>>('licenseKeys', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ ...val, id } as LicenseKey));
        setLicenseKeys(list);
      } else {
        setLicenseKeys([]);
      }
    });

    // 5. Subscribe Trial Keys
    const unsubTrialKeys = subscribeToPath<Record<string, Omit<TrialKey, 'id'>>>('trialKeys', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ ...val, id } as TrialKey));
        setTrialKeys(list);
      } else {
        setTrialKeys([]);
      }
    });

    // 6. Subscribe Coupons
    const unsubCoupons = subscribeToPath<Record<string, Omit<Coupon, 'id'>>>('coupons', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ ...val, id } as Coupon));
        setCoupons(list);
      } else {
        setCoupons([]);
      }
    });

    // 7. Subscribe Pre-Bookings
    const unsubPreBookings = subscribeToPath<Record<string, Omit<PreBooking, 'id'>>>('preBookings', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ ...val, id } as PreBooking));
        setPreBookings(list);
      } else {
        setPreBookings([]);
      }
    });

    // 7. Subscribe Orders
    const unsubOrders = subscribeToPath<Record<string, Omit<Order, 'id'>>>('orders', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ ...val, id } as Order));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOrders(list);
      } else {
        setOrders([]);
      }
    });

    // 8. Subscribe Settings
    const unsubRzpSettings = subscribeToPath<{ keyId?: string }>('settings/razorpay', (rzp) => {
      setSettings(prev => ({ ...prev, razorpayKeyId: rzp?.keyId ?? prev.razorpayKeyId }));
    });

    const unsubAdminSettings = subscribeToPath<{ username?: string; password?: string }>('settings/admin', (adm) => {
      setSettings(prev => ({
        ...prev,
        adminUsername: adm?.username ?? 'admin',
        adminPassword: adm?.password ?? 'password123'
      }));
    });

    const unsubWebsiteSettings = subscribeToPath<Partial<Settings>>('settings/website', (website) => {
      if (website) setSettings(prev => ({ ...prev, ...website }));
      // Don't show the default branding first. React batches this with the
      // settings update, so users only see the saved logo and website text.
      setIsWebsiteSettingsReady(true);
    });

    const unsubSetupSettings = subscribeToPath<{ channelUrl?: string }>('settings/setup', (setup) => {
      setSettings(prev => ({ ...prev, setupChannelUrl: setup?.channelUrl ?? '' }));
    });

    const unsubApkSettings = subscribeToPath<{ url?: string; appName?: string; version?: string }>('settings/apk', (apk) => {
      setSettings(prev => ({
        ...prev,
        apkUrl: apk?.url ?? '',
        apkAppName: apk?.appName ?? 'PeakLoader Shop',
        apkVersion: apk?.version ?? 'v1.0.0'
      }));
    });

    return () => {
      unsubProducts();
      unsubDurations();
      unsubPrices();
      unsubKeys();
      unsubTrialKeys();
      unsubCoupons();
      unsubPreBookings();
      unsubOrders();
      unsubRzpSettings();
      unsubAdminSettings();
      unsubApkSettings();
      unsubWebsiteSettings();
      unsubSetupSettings();
    };
  }, []);

  // Order Success Callback
  const handleOrderSuccess = (order: Order) => {
    setLastOrder(order);
    navigateTo('success');
  };

  // Google Apps Script sends mail outside the app, then writes the result back
  // to Firebase. Keep the already-open success card in sync with that update.
  useEffect(() => {
    if (!lastOrder?.id) return;

    const latestOrder = orders.find(order => order.id === lastOrder.id);
    if (!latestOrder || (
      latestOrder.emailDeliveryStatus === lastOrder.emailDeliveryStatus &&
      latestOrder.emailSentAt === lastOrder.emailSentAt
    )) return;

    setLastOrder(current => current?.id === latestOrder.id
      ? {
          ...current,
          emailDeliveryStatus: latestOrder.emailDeliveryStatus,
          emailSentAt: latestOrder.emailSentAt
        }
      : current);
  }, [orders, lastOrder?.id, lastOrder?.emailDeliveryStatus, lastOrder?.emailSentAt]);

  const showUserPanel = isNativeApp
    ? settings.showUserPanelInApp !== false
    : settings.showUserPanelOnWebsite === true;
  const showAdminPanel = isNativeApp
    ? settings.showAdminPanelInApp === true
    : settings.showAdminPanelOnWebsite !== false;
  // These controls are intentionally Android-only. The website can keep its
  // own Admin/User panel visibility without inheriting the mobile menu choices.
  const showStoreMenuItem = !isNativeApp || settings.appMenuStoreEnabled !== false;
  const showRulesMenuItem = !isNativeApp || settings.appMenuRulesEnabled !== false;
  const showTrackMenuItem = !isNativeApp || settings.appMenuTrackEnabled !== false;
  const showFaqMenuItem = !isNativeApp || settings.appMenuFaqEnabled !== false;
  const showSupportMenuItem = !isNativeApp || settings.appMenuSupportEnabled !== false;
  const showTelegramMenuItem = (!isNativeApp || settings.appMenuTelegramEnabled !== false) && Boolean(settings.telegramUrl);
  const showAdminMenuItem = !isNativeApp || settings.appMenuAdminEnabled !== false;
  const manualMaintenanceEnabled = settings.websiteMaintenanceEnabled ?? (
    settings.forceUpdateEnabled !== true && settings.maintenanceEnabled === true
  );
  const forceUpdateMinimumVersionCode = Number(settings.forceUpdateMinimumVersionCode ?? 0);
  const isForceUpdateScreen = isNativeApp && showUserPanel && settings.forceUpdateEnabled === true &&
    forceUpdateMinimumVersionCode > APP_VERSION_CODE && currentSection !== 'admin' && currentSection !== 'admin-login';
  const isMaintenanceScreen = showUserPanel && manualMaintenanceEnabled === true &&
    currentSection !== 'admin' && currentSection !== 'admin-login';
  const maintenanceTitle = isNativeApp
    ? 'App Under Maintenance'
    : (settings.maintenanceTitle ?? 'Website Under Maintenance');
  const maintenanceMessage = isNativeApp
    ? 'The PeakLoader Shop app is currently being updated. Please check back soon.'
    : (settings.maintenanceMessage ?? 'We are currently updating the website. Please check back soon.');

  const returnFromAdmin = useCallback(() => {
    setIsAdminLoggedIn(false);
    navigationHistoryRef.current = [];
    const destination = showUserPanel ? 'home' : 'admin-login';
    currentSectionRef.current = destination;
    setCurrentSection(destination);
  }, [showUserPanel]);

  // Keep each platform on an available panel when an admin changes its
  // visibility settings in real time.
  useEffect(() => {
    if (!isWebsiteSettingsReady) return;

    const section = currentSectionRef.current;
    if (!showUserPanel && USER_PANEL_SECTIONS.has(section) && showAdminPanel) {
      navigationHistoryRef.current = [];
      currentSectionRef.current = 'admin-login';
      setCurrentSection('admin-login');
    } else if (!showAdminPanel && ADMIN_PANEL_SECTIONS.has(section) && showUserPanel) {
      navigationHistoryRef.current = [];
      currentSectionRef.current = 'home';
      setCurrentSection('home');
    }
  }, [isWebsiteSettingsReady, showUserPanel, showAdminPanel]);

  // The navbar, hero and footer use Firebase-controlled branding. Holding this
  // neutral launch screen until the connection check and first snapshot arrive
  // prevents a flash of the built-in logo/text whenever the native app opens.
  if (!isWebsiteSettingsReady) {
    if (connectionStatus === 'offline') {
      return <OfflineScreen isRetrying={isRetryingConnection} onRetry={retryConnection} />;
    }

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-11 h-11 rounded-2xl border-2 border-emerald-400/25 border-t-emerald-400 animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-slate-400">{connectionStatus === 'checking' ? 'Checking connection…' : 'Loading your store…'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden w-full max-w-full">
      
      {/* The public navigation is hidden in maintenance mode so users only see
          the maintenance card; the admin route remains available as usual. */}
      {!isMaintenanceScreen && !isForceUpdateScreen && <Navbar
        currentSection={currentSection}
        onNavigate={(sec) => {
          if (!showUserPanel && (USER_PANEL_SECTIONS.has(sec) || sec === 'prebooking')) return;
          if (!showAdminPanel && ADMIN_PANEL_SECTIONS.has(sec)) return;

          if (sec === 'prebooking') {
            setFocusPreBooking(true);
            returnToHome();
            return;
          }
          navigateTo(sec);
        }}
        isAdmin={isAdminLoggedIn}
        onAdminLogout={returnFromAdmin}
        telegramUrl={settings.telegramUrl}
        telegramSupportUrl={settings.telegramUrl}
        websiteName={settings.websiteName}
        websiteLogoUrl={settings.websiteLogoUrl}
        navbarStoreText={settings.navbarStoreText}
        navbarRulesText={settings.navbarRulesText}
        navbarTrackText={settings.navbarTrackText}
        navbarFaqText={settings.navbarFaqText}
        navbarSupportText={settings.navbarSupportText}
        navbarTelegramText={settings.navbarTelegramText}
        navbarAdminText={settings.navbarAdminText}
        navbarMenuText={settings.navbarMenuText}
        navbarCloseText={settings.navbarCloseText}
        navbarTagline={settings.navbarTagline}
        navbarStoreDescription={settings.navbarStoreDescription}
        navbarRulesDescription={settings.navbarRulesDescription}
        navbarTrackDescription={settings.navbarTrackDescription}
        navbarFaqDescription={settings.navbarFaqDescription}
        navbarSupportDescription={settings.navbarSupportDescription}
        navbarTelegramDescription={settings.navbarTelegramDescription}
        navbarAdminDescription={settings.navbarAdminDescription}
        rulesTitle={settings.rulesTitle}
        rulesSubtitle={settings.rulesSubtitle}
        rulesDoneText={settings.rulesDoneText}
        showUserMenu={showUserPanel}
        showAdminMenu={showAdminPanel && showAdminMenuItem}
        showStoreItem={showStoreMenuItem}
        showRulesItem={showRulesMenuItem}
        showTrackItem={showTrackMenuItem}
        showFaqItem={showFaqMenuItem}
        showSupportItem={showSupportMenuItem}
        showTelegramItem={showTelegramMenuItem}
      />}

      {/* Main Dynamic View Content */}
      <main className="flex-1">
        {isForceUpdateScreen ? (
          <div className="min-h-screen flex items-center justify-center px-4 py-16">
            <div className="max-w-xl w-full text-center bg-slate-900/80 border border-emerald-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-emerald-950/30">
              <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Download className="w-8 h-8" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-400">Update Required</p>
              <h1 className="mt-2 text-3xl font-black text-white">New Version Available</h1>
              <p className="mt-3 text-slate-400 leading-7">Version {settings.forceUpdateVersionLabel || 'latest'} is required to continue using PeakLoader Shop.</p>
              <p className="mt-2 text-sm font-semibold text-slate-300">Download the latest app from our Telegram channel.</p>
              {(settings.forceUpdateTelegramUrl || settings.telegramUrl) && (
                <a href={settings.forceUpdateTelegramUrl || settings.telegramUrl} target="_blank" rel="noreferrer" className="inline-flex mt-7 items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition">
                  <Download className="w-4 h-4" /> Download from Telegram
                </a>
              )}
            </div>
          </div>
        ) : isMaintenanceScreen ? (
          <div className="min-h-screen flex items-center justify-center px-4 py-16">
            <div className="max-w-xl w-full text-center bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
              <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-black text-white">{maintenanceTitle}</h1>
              <p className="mt-3 text-slate-400 leading-7">{maintenanceMessage}</p>
              {settings.maintenanceContactUrl && (
                <a href={settings.maintenanceContactUrl} target="_blank" rel="noreferrer" className="inline-flex mt-7 px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition">
                  {settings.maintenanceContactText ?? 'Contact Support'}
                </a>
              )}
            </div>
          </div>
        ) : (
          <>
        {showUserPanel && currentSection === 'home' && (
          <StoreFront
            products={products}
            durations={durations}
            prices={prices}
            licenseKeys={licenseKeys}
            trialKeys={trialKeys}
            coupons={coupons}
            preBookings={preBookings}
            razorpayKeyId={settings.razorpayKeyId}
            telegramUrl={settings.telegramUrl}
            apkUrl={settings.apkUrl}
            apkAppName={settings.apkAppName}
            apkVersion={settings.apkVersion}
            setupChannelUrl={settings.setupChannelUrl}
            websiteLogoUrl={settings.websiteLogoUrl}
            productLogos={settings.productLogos}
            focusPreBooking={focusPreBooking}
            onPreBookingFocusHandled={() => setFocusPreBooking(false)}
            heroEyebrow={settings.heroEyebrow}
            heroTitle={settings.heroTitle}
            heroSubtitle={settings.heroSubtitle}
            freeTrialEnabled={settings.freeTrialEnabled !== false}
            couponEnabled={settings.couponEnabled !== false}
            emailDeliveryEnabled={settings.emailDeliveryEnabled === true}
            isLoading={isLoading}
            onOrderSuccess={handleOrderSuccess}
          />
        )}

        {showUserPanel && currentSection === 'success' && lastOrder && (
          <SuccessPage
            order={lastOrder}
            apkUrl={settings.apkUrl}
            apkAppName={settings.apkAppName}
            apkVersion={settings.apkVersion}
            apkLinks={products.find(p => p.id === lastOrder.productId)?.apkLinks || []}
            setupChannelUrl={settings.setupChannelUrl}
            productLogoUrl={settings.productLogos?.[lastOrder.productId] || settings.websiteLogoUrl}
            onReturnHome={returnToHome}
          />
        )}

        {showUserPanel && currentSection === 'lookup' && (
          <OrderLookup 
            orders={orders} 
            products={products}
            apkUrl={settings.apkUrl}
            apkAppName={settings.apkAppName}
            apkVersion={settings.apkVersion}
          />
        )}

        {showUserPanel && currentSection === 'faq' && (
          <FaqPage />
        )}

        {showUserPanel && currentSection === 'contact' && (
          <ContactPage 
            telegramUrl={settings.telegramUrl} 
            telegramGroupUrl={settings.telegramUrl}
            telegramSupportUrl={settings.telegramUrl}
          />
        )}

        {showAdminPanel && (currentSection === 'admin' || currentSection === 'admin-login') && (
          <AdminPortal
            products={products}
            durations={durations}
            prices={prices}
            licenseKeys={licenseKeys}
            trialKeys={trialKeys}
            coupons={coupons}
            preBookings={preBookings}
            orders={orders}
            settings={settings}
            isAdminLoggedIn={isAdminLoggedIn}
            onAdminLoginSuccess={() => {
              setIsAdminLoggedIn(true);
              navigateTo('admin');
            }}
            onAdminLogout={returnFromAdmin}
          />
        )}
        </>
        )}
      </main>

      {/* Footer */}
      {showUserPanel && !isMaintenanceScreen && <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-300">{settings.footerBrandText ?? settings.websiteName ?? 'PeakLoader Shop'}</span>
            <span>&copy; {settings.footerYearText ?? '2026'} {settings.footerCopyrightText ?? 'All rights reserved.'}</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={returnToHome} className="hover:text-white transition-colors">{settings.footerStoreText ?? 'Store'}</button>
            <button onClick={() => navigateTo('lookup')} className="hover:text-white transition-colors">{settings.footerTrackText ?? 'Track Order'}</button>
            <button onClick={() => navigateTo('faq')} className="hover:text-white transition-colors">{settings.footerFaqText ?? 'FAQ'}</button>
            <button onClick={() => navigateTo('contact')} className="hover:text-white transition-colors">{settings.footerSupportText ?? 'Support'}</button>
          </div>
        </div>
      </footer>}

      {/* Keep the current page mounted while the connection is unavailable.
          That preserves the user's scroll position and in-progress checkout. */}
      {connectionStatus === 'offline' && (
        <div className="fixed inset-0 z-[100]">
          <OfflineScreen isRetrying={isRetryingConnection} onRetry={retryConnection} />
        </div>
      )}

    </div>
  );
}
