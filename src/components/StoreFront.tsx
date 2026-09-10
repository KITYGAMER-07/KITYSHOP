import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Tag, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Clock, 
  Lock, 
  Send, 
  ArrowRight,
  Gift,
  HelpCircle,
  Copy,
  Info,
  Eye,
  EyeOff,
  Download,
  Smartphone,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Duration, Price, LicenseKey, TrialKey, Coupon, Order, PreBooking } from '../types';
import { pushData, updateData, recordTrialActivation, incrementCouponUsage, reservePreBookingSlot } from '../lib/firebase';
import { StoreSkeleton } from './StoreSkeleton';

interface StoreFrontProps {
  products: Product[];
  durations: Duration[];
  prices: Price[];
  licenseKeys: LicenseKey[];
  trialKeys?: TrialKey[];
  coupons: Coupon[];
  preBookings: PreBooking[];
  razorpayKeyId: string;
  telegramUrl?: string;
  apkUrl?: string;
  apkAppName?: string;
  apkVersion?: string;
  setupChannelUrl?: string;
  focusPreBooking?: boolean;
  onPreBookingFocusHandled?: () => void;
  websiteLogoUrl?: string;
  productLogos?: Record<string, string>;
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  freeTrialEnabled?: boolean;
  couponEnabled?: boolean;
  emailDeliveryEnabled?: boolean;
  isLoading?: boolean;
  onOrderSuccess: (order: Order) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PickerOption {
  value: string;
  label: string;
}

interface DarkPickerProps {
  value: string;
  placeholder: string;
  options: PickerOption[];
  icon: React.ReactNode;
  disabled?: boolean;
  onChange: (value: string) => void;
}

// This picker deliberately avoids the browser's native <select> UI. Android
// WebView renders that control with the phone's own colors, which can differ
// from the website even when the same CSS is used.
const DarkPicker: React.FC<DarkPickerProps> = ({
  value,
  placeholder,
  options,
  icon,
  disabled = false,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const closePicker = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', closePicker);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closePicker);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [isOpen]);

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
        className="w-full flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 hover:border-emerald-500 focus:border-emerald-500 text-left font-medium text-sm rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selectedOption ? 'text-white truncate' : 'text-slate-400 truncate'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="flex items-center gap-2.5 shrink-0 text-slate-400">
          {icon}
          <ArrowRight className={`w-4 h-4 text-emerald-400 transition-transform ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-950 shadow-2xl shadow-black/60"
          >
            {options.length > 0 ? options.map(option => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left text-sm transition-colors ${isSelected ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-200 hover:bg-slate-800'}`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
                </button>
              );
            }) : (
              <p className="px-4 py-3.5 text-sm text-slate-500">No options available</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const StoreFront: React.FC<StoreFrontProps> = ({
  products,
  durations,
  prices,
  licenseKeys,
  trialKeys = [],
  coupons,
  preBookings,
  razorpayKeyId,
  telegramUrl,
  apkUrl = '',
  apkAppName = 'PeakLoader Shop',
  apkVersion = 'v2.4.0',
  setupChannelUrl = '',
  focusPreBooking = false,
  onPreBookingFocusHandled,
  websiteLogoUrl = '/logo.jpg',
  productLogos = {},
  heroEyebrow = '{heroEyebrow}',
  heroTitle = 'PeakLoader Shop',
  heroSubtitle = '{heroSubtitle}',
  freeTrialEnabled = true,
  couponEnabled = true,
  emailDeliveryEnabled = false,
  isLoading = false,
  onOrderSuccess
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedDurationId, setSelectedDurationId] = useState<string>('');
  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showDemoGatewayModal, setShowDemoGatewayModal] = useState<boolean>(false);
  const [checkoutNotice, setCheckoutNotice] = useState<{ title: string; message: string } | null>(null);
  const [isPreBooking, setIsPreBooking] = useState(false);
  const [, setCountdownTick] = useState(0);
  useEffect(() => { const timer = setInterval(() => setCountdownTick(v => v + 1), 60000); return () => clearInterval(timer); }, []);

  // A disabled coupon section must never leave an earlier discount active.
  useEffect(() => {
    if (!couponEnabled) {
      setCouponCodeInput('');
      setAppliedCoupon(null);
      setCouponMessage(null);
    }
  }, [couponEnabled]);

  // Free Trial Modal & Claim States
  const [showTrialModal, setShowTrialModal] = useState<boolean>(false);
  const [trialModalTab, setTrialModalTab] = useState<'redeem' | 'claim'>('redeem');
  const [trialInputCode, setTrialInputCode] = useState<string>('');
  const [trialSelectedProductId, setTrialSelectedProductId] = useState<string>('');
  const [trialUserEmail, setTrialUserEmail] = useState<string>('');
  const [trialErrorMessage, setTrialErrorMessage] = useState<string>('');
  const [claimedTrialResult, setClaimedTrialResult] = useState<{
    key: string;
    productName: string;
    durationName: string;
    orderId: string;
    productId: string;
  } | null>(null);
  const [showTrialKeyText, setShowTrialKeyText] = useState<boolean>(false);
  const [copiedTrialKey, setCopiedTrialKey] = useState<boolean>(false);

  const showCheckoutNotice = (title: string, message: string) => {
    setCheckoutNotice({ title, message });
  };

  // Hide an already-open trial popup immediately when an admin disables the
  // public trial offer from the Website settings panel.
  useEffect(() => {
    if (!freeTrialEnabled) setShowTrialModal(false);
  }, [freeTrialEnabled]);

  // Lock the page behind the Trial Success modal; only the modal panel can scroll.
  useEffect(() => {
    if (!showTrialModal) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [showTrialModal]);

  // Active enabled products
  const enabledProducts = products.filter(p => p.enabled !== false);

  // Durations for selected product
  const availableDurations = durations.filter(d => d.productId === selectedProductId);

  // Find price for product + duration
  const currentPriceObj = prices.find(
    p => p.productId === selectedProductId && p.durationId === selectedDurationId
  );
  const normalPrice = currentPriceObj ? currentPriceObj.price : 0;

  // Available keys count for product + duration
  const availableKeysCount = licenseKeys.filter(
    k => k.productId === selectedProductId && k.durationId === selectedDurationId && !k.used
  ).length;

  // Selected Product & Duration objects
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedDuration = durations.find(d => d.id === selectedDurationId);
  const activePreBooking = preBookings.find(p => p.productId === selectedProductId && p.durationId === selectedDurationId && p.enabled !== false);
  const preBookingOpen = !!activePreBooking && (() => {
    const now = Date.now();
    const start = activePreBooking.startDate ? new Date(activePreBooking.startDate).getTime() : 0;
    const end = activePreBooking.endDate ? new Date(activePreBooking.endDate).getTime() : 0;
    const slots = Number(activePreBooking.slots || 0);
    const booked = Number(activePreBooking.bookedCount || 0);
    return (!start || now >= start) && (!end || now <= end) && (!slots || booked < slots);
  })();
  const preBookingCountdownText = activePreBooking?.endDate ? (() => {
    const diff = Math.max(0, new Date(activePreBooking.endDate).getTime() - Date.now());
    const d=Math.floor(diff/86400000), h=Math.floor(diff%86400000/3600000), m=Math.floor(diff%3600000/60000);
    return `${d}d ${h}h ${m}m`;
  })() : 'No closing date';
  const currentPrice = (isPreBooking && activePreBooking?.priceOverride != null) ? Number(activePreBooking.priceOverride) : normalPrice;

  // Reset duration and coupon when product changes
  useEffect(() => {
    setSelectedDurationId('');
    setAppliedCoupon(null);
    setCouponMessage(null);
    setIsPreBooking(false);
  }, [selectedProductId]);

  // Focus the first available pre-booking configuration when the navbar/menu
  // Pre-Booking action is used. This keeps the user on the real store card
  // and automatically selects a configured product + duration instead of
  // leaving the pre-booking area looking empty.
  useEffect(() => {
    if (!focusPreBooking) return;
    const configured = preBookings.find(p => p.enabled !== false && products.some(prod => prod.id === p.productId && prod.enabled !== false));
    if (configured) {
      setSelectedProductId(configured.productId);
      // Product-change reset runs after the product state changes, so apply
      // the configured duration/pre-booking selection on the next tick.
      window.setTimeout(() => {
        setSelectedDurationId(configured.durationId);
        setIsPreBooking(true);
        document.getElementById('prebooking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        onPreBookingFocusHandled?.();
      }, 150);
    } else {
      window.setTimeout(() => {
        document.getElementById('prebooking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        onPreBookingFocusHandled?.();
      }, 100);
    }
  }, [focusPreBooking, preBookings, products, onPreBookingFocusHandled]);

  // Re-validate coupon if duration or price changes
  useEffect(() => {
    if (appliedCoupon && currentPrice > 0) {
      if (appliedCoupon.minOrderValue && currentPrice < appliedCoupon.minOrderValue) {
        setAppliedCoupon(null);
        setCouponMessage({
          type: 'warning',
          text: `Coupon removed — requires minimum order of ₹${appliedCoupon.minOrderValue}`
        });
      }
    }
  }, [selectedDurationId, currentPrice]);

  // Return Skeleton Loader while loading products and prices from DB
  if (isLoading) {
    return <StoreSkeleton />;
  }

  // Calculate Discounts
  let discountAmount = 0;
  if (appliedCoupon && currentPrice > 0) {
    if (appliedCoupon.type === 'percentage') {
      discountAmount = Math.round((currentPrice * appliedCoupon.value) / 100);
    } else {
      discountAmount = appliedCoupon.value;
    }
  }
  const finalAmount = Math.max(0, currentPrice - discountAmount);

  // Coupon Handler
  const handleApplyCoupon = () => {
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) {
      setAppliedCoupon(null);
      setCouponMessage(null);
      return;
    }

    if (!selectedProductId || !selectedDurationId || currentPrice <= 0) {
      setCouponMessage({
        type: 'error',
        text: 'Please select a product and duration first.'
      });
      return;
    }

    const matchedCoupon = coupons.find(c => c.code.toUpperCase() === code && c.active !== false);
    if (matchedCoupon && matchedCoupon.prebookingOnly && !isPreBooking) {
      setAppliedCoupon(null);
      setCouponMessage({ type: 'error', text: 'This coupon is valid for pre-booking only.' });
      return;
    }
    if (matchedCoupon && Number(matchedCoupon.usageLimit || 0) > 0 && Number(matchedCoupon.usageCount || 0) >= Number(matchedCoupon.usageLimit)) {
      setAppliedCoupon(null);
      setCouponMessage({ type: 'error', text: 'This coupon has reached its usage limit.' });
      return;
    }
    if (!matchedCoupon) {
      setAppliedCoupon(null);
      setCouponMessage({ type: 'error', text: 'Invalid coupon code.' });
      return;
    }

    // Check expiry date
    if (matchedCoupon.expiryDate) {
      const expDate = new Date(matchedCoupon.expiryDate);
      expDate.setHours(23, 59, 59, 999);
      if (expDate < new Date()) {
        setAppliedCoupon(null);
        setCouponMessage({ type: 'error', text: 'Coupon code has expired.' });
        return;
      }
    }

    // Check minimum order value
    const minVal = matchedCoupon.minOrderValue || 0;
    if (currentPrice < minVal) {
      setAppliedCoupon(null);
      setCouponMessage({
        type: 'error',
        text: `Minimum order value of ₹${minVal} required for this coupon.`
      });
      return;
    }

    // Apply valid coupon
    setAppliedCoupon(matchedCoupon);
    const savings = matchedCoupon.type === 'percentage'
      ? Math.round((currentPrice * matchedCoupon.value) / 100)
      : matchedCoupon.value;
    setCouponMessage({
      type: 'success',
      text: `Coupon applied! You saved ₹${savings}.`
    });
  };

  // Redeem an Existing Admin-Generated Trial Key Code
  const handleRedeemTrialCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrialErrorMessage('');

    const cleanInput = trialInputCode.trim();
    if (!cleanInput) {
      setTrialErrorMessage('Please enter a Trial Code.');
      return;
    }

    // Search in database for matching key by trialCode or fallback key
    const matchedKey = (trialKeys || []).find(
      t => (t.trialCode && t.trialCode.trim().toLowerCase() === cleanInput.toLowerCase()) ||
           (t.key && t.key.trim().toLowerCase() === cleanInput.toLowerCase())
    );

    if (!matchedKey) {
      setTrialErrorMessage('Invalid Trial Code! This trial code does not exist in the system.');
      return;
    }

    // Trial codes are reusable: the same code can be activated by unlimited users.
    // We only increment an atomic usage counter; the code remains active.
    try {
      await recordTrialActivation(matchedKey.id, trialUserEmail);
    } catch (activationError) {
      console.error('Trial activation error:', activationError);
      setTrialErrorMessage('Trial activation failed. Please try again.');
      return;
    }

    const prod = products.find(p => p.id === matchedKey.productId);
    const prodName = prod ? prod.name : 'VIP Game Loader';
    const trialOrderId = `TRL-${Math.floor(100000 + Math.random() * 900000)}`;

    // Reveal the ACTUAL SAVED KEY attached by Admin
    const keyToDeliver = matchedKey.actualKey || matchedKey.key || matchedKey.trialCode;

    setClaimedTrialResult({
      key: keyToDeliver,
      productName: prodName,
      durationName: matchedKey.durationName || 'Free Trial',
      orderId: trialOrderId,
      productId: matchedKey.productId
    });
    setShowTrialKeyText(false);

    // Fire celebratory confetti cannons
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#10b981', '#14b8a6', '#06b6d4', '#f59e0b', '#ec4899']
      });
    } catch (err) {
      console.warn('Confetti effect optional error:', err);
    }
  };

  // Process Successful Order Fulfillment
  const handleFulfillOrder = async (paymentId: string) => {
    if (!selectedProduct || !selectedDuration) return;

    setIsProcessing(true);
    try {
      const orderId = isPreBooking ? 'PRE-' + Math.floor(100000 + Math.random() * 900000) : 'ORD-' + Math.floor(100000 + Math.random() * 900000);

      if (isPreBooking) {
        if (!activePreBooking || !preBookingOpen) throw new Error('Pre-booking is currently closed or sold out.');
        await reservePreBookingSlot(activePreBooking.id);
        if (appliedCoupon) await incrementCouponUsage(appliedCoupon.id);
        const bookingPayload: Order = {
          id: '', orderId, productId: selectedProductId, productName: selectedProduct.name,
          durationId: selectedDurationId, durationName: `${selectedDuration.name} (${selectedDuration.unit})`,
          originalPrice: currentPrice, discountAmount, finalAmount, couponCode: appliedCoupon?.code || null,
          licenseKey: 'PREBOOKING-RESERVED', paymentId, status: 'paid', customerEmail: customerEmail.trim() || 'Guest Customer',
          createdAt: Date.now(), orderType: 'prebooking', bookingId: orderId, bookingStatus: 'confirmed', releaseDate: activePreBooking.releaseDate || null
        };
        const bookingKey = await pushData('orders', bookingPayload);
        bookingPayload.id = bookingKey;
        await pushData('payments', { orderId, paymentId, amount: finalAmount, gateway: 'razorpay', status: 'success', createdAt: Date.now(), type: 'prebooking' });
        setIsProcessing(false); onOrderSuccess(bookingPayload); return;
      }

      // 1. Find unused key
      const unusedKeyObj = licenseKeys.find(
        k => k.productId === selectedProductId && k.durationId === selectedDurationId && !k.used
      );

      const assignedKey = unusedKeyObj ? unusedKeyObj.key : 'NO-KEY-AVAILABLE-CONTACT-ADMIN';

      // 2. Mark key as used in DB if found
      if (unusedKeyObj) {
        await updateData(`licenseKeys/${unusedKeyObj.id}`, {
          used: true,
          usedAt: Date.now(),
          orderId: orderId
        });
      }

      // 3. Create Order document
      const orderPayload: Order = {
        id: '',
        orderId,
        productId: selectedProductId,
        productName: selectedProduct.name,
        durationId: selectedDurationId,
        durationName: `${selectedDuration.name} (${selectedDuration.unit})`,
        originalPrice: currentPrice,
        discountAmount,
        finalAmount,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        licenseKey: assignedKey,
        paymentId: paymentId,
        status: 'paid',
        customerEmail: customerEmail.trim() || 'Guest Customer',
        ...(emailDeliveryEnabled ? { emailDeliveryStatus: 'pending' as const } : {}),
        createdAt: Date.now()
      };

      if (appliedCoupon) await incrementCouponUsage(appliedCoupon.id);
      const orderKey = await pushData('orders', orderPayload);
      orderPayload.id = orderKey;

      // 4. Save Payment Record
      await pushData('payments', {
        orderId,
        paymentId,
        amount: finalAmount,
        gateway: 'razorpay',
        status: 'success',
        createdAt: Date.now()
      });

      setIsProcessing(false);
      onOrderSuccess(orderPayload);
    } catch (err) {
      console.error('Order fulfillment error:', err);
      setIsProcessing(false);
      showCheckoutNotice('Order update issue', 'Your order could not be saved completely. Please contact support before trying again.');
    }
  };

  // Initiate Payment
  const handleInitiatePayment = () => {
    if (!selectedProductId || !selectedDurationId || finalAmount <= 0) return;

    if (emailDeliveryEnabled && !isPreBooking && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      showCheckoutNotice('Email address required', 'Please enter a valid email address to receive your license key.');
      return;
    }

    if (!isPreBooking && availableKeysCount <= 0) {
      showCheckoutNotice('Out of stock', 'Selected item is currently out of stock. Please select another duration or product.');
      return;
    }
    if (isPreBooking && !preBookingOpen) {
      showCheckoutNotice('Pre-booking unavailable', 'Pre-booking is currently closed or sold out.');
      return;
    }

    // Check if Razorpay script is loaded and Key ID is configured
    if (typeof window.Razorpay !== 'undefined' && razorpayKeyId && razorpayKeyId.startsWith('rzp_')) {
      const options = {
        key: razorpayKeyId,
        amount: finalAmount * 100, // Razorpay works in paise
        currency: 'INR',
        webview_intent: true,
        name: selectedProduct?.name || 'PeakLoader Shop',
        description: isPreBooking ? `${selectedProduct?.name} - Pre-Booking` : `${selectedProduct?.name} - ${selectedDuration?.name} Pass`,
        handler: function (response: any) {
          handleFulfillOrder(response.razorpay_payment_id || 'PAY_' + Date.now());
        },
        prefill: {
          email: customerEmail || 'customer@peakloader.shop'
        },
        theme: {
          color: '#10b981'
        }
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          showCheckoutNotice('Payment failed', response.error?.description || 'Transaction cancelled.');
        });
        rzp.open();
      } catch (e) {
        console.warn('Razorpay popup blocked or failed, opening test gateway option:', e);
        setShowDemoGatewayModal(true);
      }
    } else {
      // Show simulated instant checkout popup for testing / preview mode
      setShowDemoGatewayModal(true);
    }
  };

  return (
    <div className="relative py-8 sm:py-12 overflow-x-hidden">
      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-2/3 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Hero Tagline */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-3">
            <Zap className="w-3.5 h-3.5" />
            {heroEyebrow}
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            {heroTitle}
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            {heroSubtitle}
          </p>
        </div>

        {/* Free Trial Callout Banner */}
        {freeTrialEnabled && <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Want to test first? Get a Free Trial Key!</span>
                <span className="bg-emerald-500 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded">FREE</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Activate a free trial key for any product with instant APK loader access.</p>
            </div>
          </div>
          <button
            onClick={() => {
              setTrialSelectedProductId(selectedProductId || (enabledProducts[0]?.id || ''));
              setClaimedTrialResult(null);
              setShowTrialModal(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all shrink-0 flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Claim Free Trial</span>
          </button>
        </div>}

        {/* Store Purchase / Pre-Booking Card */}
        <div id="prebooking" className="relative scroll-mt-24 bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/20">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left Form Column */}
            <div className="md:col-span-7 space-y-6">

              {/* 1. Product Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
                  <span>1. Choose Product</span>
                  {selectedProduct && (
                    <span className="text-[10px] normal-case font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {selectedProduct.category || 'Software'}
                    </span>
                  )}
                </label>

                <DarkPicker
                    value={selectedProductId}
                    placeholder="Select Product"
                    options={enabledProducts.map(prod => ({ value: prod.id, label: prod.name }))}
                    icon={<ShoppingBag className="w-5 h-5" />}
                    onChange={setSelectedProductId}
                  />

                {selectedProduct && selectedProduct.description && (
                  <p className="mt-2 text-xs text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-emerald-400 inline mr-1.5" />
                    {selectedProduct.description}
                  </p>
                )}
              </div>

              {/* 2. Duration Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
                  <span>2. Select Access Duration</span>
                  {selectedDurationId && availableKeysCount > 0 && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      In Stock
                    </span>
                  )}
                </label>

                <DarkPicker
                    value={selectedDurationId}
                    placeholder={!selectedProductId ? 'Choose a product first' : 'Select Duration'}
                    disabled={!selectedProductId}
                    options={availableDurations.map(dur => {
                      const durPriceObj = prices.find(
                        p => p.productId === selectedProductId && p.durationId === dur.id
                      );
                      const unitStr = dur.unit ? dur.unit.charAt(0).toUpperCase() + dur.unit.slice(1) : '';
                      const priceLabel = durPriceObj ? ` — ₹${durPriceObj.price}` : '';
                      return { value: dur.id, label: `${dur.name} (${unitStr})${priceLabel}` };
                    })}
                    icon={<Clock className="w-5 h-5" />}
                    onChange={setSelectedDurationId}
                  />

                {/* Stock Warning Notice */}
                {selectedProductId && selectedDurationId && availableKeysCount === 0 && (
                  <div className="mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Out of stock for this duration. Please pick another option or contact support.</span>
                  </div>
                )}
              </div>

              {/* 3. Pre-Booking */}
              {activePreBooking && (
                <div className={`p-4 rounded-2xl border ${preBookingOpen ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-widest bg-amber-400 text-slate-950 px-2 py-1 rounded">{activePreBooking.badgeText || 'PRE-BOOKING'}</span>
                        <span className="text-xs font-bold text-white break-words">{activePreBooking.title || 'Reserve this product early'}</span>
                      </div>
                      <p className="text-[11px] leading-5 text-slate-400 mt-2">{activePreBooking.description || 'Pay the full amount now and reserve your release.'}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        {activePreBooking.endDate && <p className="text-[10px] text-amber-300 font-bold">Closes in {preBookingCountdownText}</p>}
                        {Number(activePreBooking.slots || 0) > 0 && <p className="text-[10px] text-slate-500 font-bold">{Number(activePreBooking.slots)-Number(activePreBooking.bookedCount||0)} slots remaining</p>}
                      </div>
                    </div>
                    <button type="button" disabled={!preBookingOpen} onClick={() => setIsPreBooking(v => !v)} className={`w-full sm:w-auto shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-[10px] font-extrabold transition-colors ${isPreBooking ? 'bg-amber-400 text-black hover:bg-amber-300' : 'bg-amber-400 text-black hover:bg-amber-300'} disabled:opacity-40 disabled:cursor-not-allowed`}>{isPreBooking ? 'Pre-Booking Selected' : 'Pre-Book Now'}</button>
                  </div>
                  {isPreBooking && activePreBooking.rules && <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] leading-5 text-slate-400 whitespace-pre-line">{activePreBooking.rules}</div>}
                </div>
              )}

              {/* 3. Coupon Code */}
              {couponEnabled && <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  3. Coupon Code (Optional)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="ENTER COUPON CODE"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono text-sm uppercase rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                    <Tag className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition-all active:scale-95"
                  >
                    Apply
                  </button>
                </div>

                {couponMessage && (
                  <div className={`mt-2 text-xs flex items-center gap-1.5 font-medium ${
                    couponMessage.type === 'success' ? 'text-emerald-400' :
                    couponMessage.type === 'warning' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {couponMessage.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                     couponMessage.type === 'warning' ? <AlertTriangle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {couponMessage.text}
                  </div>
                )}
              </div>}

              {/* 4. Customer Email Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {couponEnabled ? 4 : 3}. Email Address {emailDeliveryEnabled && !isPreBooking ? '(Required for License Key)' : '(Optional for Receipt)'}
                </label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required={emailDeliveryEnabled && !isPreBooking}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

            </div>

            {/* Right Summary Column */}
            <div className="md:col-span-5 flex flex-col justify-between bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4 pb-3 border-b border-slate-800 flex items-center justify-between">
                  <span>{isPreBooking ? 'Pre-Booking Summary' : 'Order Summary'}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </h3>

                <div className="space-y-3 text-xs mb-6">
                  <div className="flex justify-between text-slate-400">
                    <span>Product</span>
                    <span className="text-white font-semibold text-right">
                      {selectedProduct ? selectedProduct.name : 'Not selected'}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>Duration</span>
                    <span className="text-white font-semibold">
                      {selectedDuration ? `${selectedDuration.name} (${selectedDuration.unit})` : 'Not selected'}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>Base Price</span>
                    <span className="text-slate-200 font-mono font-medium">
                      ₹{currentPrice}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-medium pt-1 border-t border-slate-800/50">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span className="font-mono">-₹{discountAmount}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400 pt-1">
                    <span>Delivery Mode</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {isPreBooking ? 'Reserved on Release' : 'Instant Key'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Display Box */}
              <div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 mb-5 text-center">
                  <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Payable</span>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    {discountAmount > 0 && (
                      <span className="text-sm text-slate-500 line-through font-mono">
                        ₹{currentPrice}
                      </span>
                    )}
                    <span className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                      ₹{finalAmount}
                    </span>
                  </div>
                </div>

                {/* Purchase Button */}
                <button
                  type="button"
                  onClick={handleInitiatePayment}
                  disabled={!selectedProductId || !selectedDurationId || finalAmount <= 0 || (!isPreBooking && availableKeysCount <= 0) || (isPreBooking && !preBookingOpen) || isProcessing}
                  className="w-full group relative flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98]"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Generating License...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span>{isPreBooking ? 'Pay Full Amount & Pre-Book' : 'Complete Purchase'}</span>
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="mt-3 text-[11px] text-center text-slate-500 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Encrypted & Secured by Razorpay Gateway
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Instant Delivery</h4>
              <p className="text-[11px] text-slate-400">License key revealed in &lt; 2 seconds</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">100% Genuine</h4>
              <p className="text-[11px] text-slate-400">Verified & tested active key stock</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Invoice Included</h4>
              <p className="text-[11px] text-slate-400">Download printable receipt anytime</p>
            </div>
          </div>
        </div>

      </div>

      {/* Demo Checkout Gateway Modal (Fallback if Razorpay Popup or test mode) */}
      {showDemoGatewayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Razorpay Checkout Sandbox</h3>
              <p className="mt-1 text-xs text-slate-400">
                You are purchasing <strong className="text-white">{selectedProduct?.name}</strong> ({selectedDuration?.name}).
              </p>

              <div className="my-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Merchant:</span>
                  <span className="text-white font-medium">PeakLoader Shop</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Amount:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">₹{finalAmount}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Customer:</span>
                  <span className="text-slate-300 font-mono">{customerEmail || 'Guest'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDemoGatewayModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDemoGatewayModal(false);
                    handleFulfillOrder('PAY_DEMO_' + Date.now());
                  }}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20"
                >
                  Simulate Payment Success
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Free Trial Modal Popup */}
      {freeTrialEnabled && showTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden ${claimedTrialResult ? 'flex flex-col h-[min(760px,calc(100dvh-24px))] sm:h-[min(760px,calc(100dvh-40px))]' : 'p-6 sm:p-8'}`}>
            
            <button
              onClick={() => setShowTrialModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {!claimedTrialResult ? (
              /* ENTER TRIAL CODE FORM */
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Free Trial Key Activation</h3>
                    <p className="text-xs text-slate-400">Enter the Trial Code provided by the Admin</p>
                  </div>
                </div>

                {trialErrorMessage && (
                  <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                    {trialErrorMessage}
                  </div>
                )}

                <form onSubmit={handleRedeemTrialCode} className="space-y-4 my-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Enter Trial Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TRIAL-PEAK-8X92-A2K4"
                      value={trialInputCode}
                      onChange={(e) => setTrialInputCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500 uppercase tracking-wider font-bold"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Type or paste the trial code given to you by the Admin.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Your Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={trialUserEmail}
                      onChange={(e) => setTrialUserEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white font-medium text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Activate Trial Code</span>
                  </button>
                </form>
              </div>
            ) : (
              /* TRIAL SUCCESS CARD (ANIMATED WITH MOTION, LOGO & APK DOWNLOAD) */
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 18, stiffness: 220 }}
                className="flex flex-col min-h-0 flex-1"
              >
                <div className="shrink-0 px-6 sm:px-8 pt-6 sm:pt-8 pb-4 text-center">
                  {/* Animated Success Icon with Ripples */}
                  <div className="relative inline-block mb-3">
                    <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping opacity-75" />
                    <span className="absolute -inset-2 rounded-full bg-emerald-500/20 animate-pulse blur-md" />

                    <motion.div 
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
                      className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30"
                    >
                      <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-extrabold tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-sm mb-2">
                      <Zap className="w-3.5 h-3.5" />
                      Trial Activated Successfully
                    </span>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5">{claimedTrialResult.productName}</h3>
                    <p className="text-xs text-slate-400 mt-1">{claimedTrialResult.durationName} • Ref: <span className="font-mono text-emerald-300 font-bold">{claimedTrialResult.orderId}</span></p>
                  </motion.div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 sm:px-8 pb-4" style={{ scrollbarGutter: 'stable' }}>

                {/* Trial Key Container with Blur Toggle & Copy */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 mb-6 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <span>Your Trial License Key</span>
                    <button
                      type="button"
                      onClick={() => setShowTrialKeyText(!showTrialKeyText)}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] normal-case font-bold"
                    >
                      {showTrialKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showTrialKeyText ? 'Hide Key' : 'Reveal Key'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-sm">
                    <span className={`text-emerald-400 font-extrabold select-all tracking-wider ${!showTrialKeyText ? 'blur-sm select-none' : ''}`}>
                      {claimedTrialResult.key}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(claimedTrialResult.key);
                        setCopiedTrialKey(true);
                        setTimeout(() => setCopiedTrialKey(false), 2000);
                      }}
                      className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0"
                      title="Copy Trial Key"
                    >
                      {copiedTrialKey ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  {copiedTrialKey && (
                    <p className="text-[10px] text-emerald-400 text-right font-medium">Copied to clipboard!</p>
                  )}
                </motion.div>

                {/* Product APK Download Links */}
                {(() => {
                  const trialProduct = products.find(p => p.id === claimedTrialResult.productId);
                  const trialApkLinks = trialProduct?.apkLinks || [];
                  if (trialApkLinks.length === 0) return null;
                  return (
                    <>
                      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-teal-950/80 to-slate-950 border border-teal-500/30 text-left relative overflow-hidden">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start gap-3 min-w-0 w-full">
                            <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700/80 overflow-hidden shrink-0 p-0.5 shadow-md flex items-center justify-center">
                              <img src={productLogos?.[claimedTrialResult.productId] || websiteLogoUrl || '/logo.jpg'} alt={`${claimedTrialResult.productName} Logo`} className="w-full h-full object-cover rounded-xl" />
                            </div>
                            <div className="min-w-0 flex-1"><h4 className="text-sm font-bold text-white leading-tight">Download APK Files</h4><p className="text-xs text-slate-400 mt-1 leading-relaxed">Download the APK version you need for this product.</p></div>
                          </div>
                          <div className="space-y-2">
                            {trialApkLinks.map(link => (
                              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="w-full flex flex-col gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-900 transition-colors">
                                <div className="flex flex-col items-start gap-1"><span className="text-xs font-bold text-white break-words">{link.name}</span>{link.version && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">{link.version}</span>}</div><span className="w-full text-center px-3 py-2 rounded-lg bg-teal-400 text-slate-950 text-[10px] font-bold">Download APK</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </>
                  );
                })()}

                </div>
                <div className="shrink-0 border-t border-slate-800/70 px-6 sm:px-8 py-3 space-y-2">
                  {setupChannelUrl?.trim() && <a href={setupChannelUrl.trim()} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs border border-emerald-400 transition-all shadow-lg shadow-emerald-500/20">Setup Guide</a>}
                <button
                  onClick={() => setShowTrialModal(false)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all active:scale-[0.98]"
                >
                  Done & Close
                </button>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      )}

      <AnimatePresence>
        {checkoutNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="checkout-notice-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-amber-400/25 bg-slate-900 shadow-2xl shadow-black/60"
            >
              <div className="h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400" />
              <div className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 id="checkout-notice-title" className="text-lg font-black text-white">{checkoutNotice.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{checkoutNotice.message}</p>
                <button
                  type="button"
                  onClick={() => setCheckoutNotice(null)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-400 active:scale-[0.98]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
