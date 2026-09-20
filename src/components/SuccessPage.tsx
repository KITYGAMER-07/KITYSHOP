import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Download, 
  ArrowLeft, 
  ShieldCheck, 
  Smartphone, 
  FileText,
  Key,
  ExternalLink,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { Order, ApkDownloadLink } from '../types';
import { downloadInvoiceTxt } from '../lib/invoice';

interface SuccessPageProps {
  order: Order;
  apkUrl?: string;
  apkAppName?: string;
  apkVersion?: string;
  apkLinks?: ApkDownloadLink[];
  setupChannelUrl?: string;
  productLogoUrl?: string;
  onReturnHome: () => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({
  order,
  apkUrl,
  apkAppName = 'PeakLoader Shop',
  apkVersion = 'v2.4.0',
  apkLinks = [],
  setupChannelUrl = '',
  productLogoUrl,
  onReturnHome
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(true);

  // Lock the background page while the purchase/pre-booking success card is open.
  // Only the inner success-card content area is allowed to scroll, matching the Trial Success modal.
  useEffect(() => {
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
  }, []);

  // Fire celebratory confetti cannons on mount!
  useEffect(() => {
    try {
      // Main Center Cannon
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#10b981', '#14b8a6', '#06b6d4', '#f59e0b', '#ec4899']
      });

      // Delayed side burst left
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#34d399', '#f59e0b']
        });
      }, 250);

      // Delayed side burst right
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#06b6d4', '#2dd4bf', '#10b981']
        });
      }, 400);

    } catch (e) {
      console.warn('Confetti effect optional error:', e);
    }
  }, []);

  const handleCopyKey = () => {
    if (!order.licenseKey) return;
    navigator.clipboard.writeText(order.licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
        className="flex flex-col w-full h-[min(760px,calc(100dvh-24px))] sm:h-[min(760px,calc(100dvh-40px))] bg-slate-900/90 backdrop-blur-2xl border border-emerald-500/30 rounded-3xl shadow-2xl shadow-emerald-950/40 text-center relative overflow-hidden"
      >
        
        {/* Glow Header Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/20 rounded-full blur-[90px] pointer-events-none" />

        {/* Animated Success Icon with Ripples */}
        <div className="shrink-0 px-6 sm:px-10 pt-6 sm:pt-8 pb-4">
        <div className="relative inline-block mb-6">
          {/* Pulsing Backlight Rings */}
          <span className="absolute inset-0 rounded-3xl bg-emerald-500/30 animate-ping opacity-75" />
          <span className="absolute -inset-2 rounded-full bg-emerald-500/20 animate-pulse blur-md" />

          <motion.div 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
            className="relative z-10 w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30"
          >
            <CheckCircle2 className="w-11 h-11 stroke-[2.5]" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-widest mb-3">
            <Zap className="w-3.5 h-3.5" />
            {order.orderType === 'prebooking' ? 'Pre-Booking Confirmed' : 'Payment Confirmed'}
          </span>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {order.orderType === 'prebooking' ? 'Your Pre-Booking Is Confirmed!' : 'License Key Issued!'}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {order.orderType === 'prebooking' ? 'Your full payment has been received. Your reservation is secured for the release date below.' : 'Thank you for your purchase. Your digital license key is active and ready below.'}
          </p>
        </motion.div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 sm:px-10 pb-5 text-center" style={{ scrollbarGutter: 'stable' }}>

        {order.orderType === 'prebooking' ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="my-8 bg-slate-950 border border-amber-500/20 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-amber-300">Booking ID</span><span className="font-mono font-extrabold text-white">{order.bookingId || order.orderId}</span></div>
            <div className="flex items-center justify-between"><span className="text-xs text-slate-400">Status</span><span className="text-xs font-bold text-emerald-400 uppercase">{order.bookingStatus || 'confirmed'}</span></div>
            <div className="flex items-center justify-between"><span className="text-xs text-slate-400">Release Date</span><span className="text-xs font-bold text-white">{order.releaseDate ? new Date(order.releaseDate).toLocaleString() : 'To be announced'}</span></div>
            <p className="text-[11px] text-slate-500">Keep your Booking ID safe. Use Track Order to check your pre-booking status anytime.</p>
          </motion.div>
        ) : (
                  <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="my-8 bg-slate-950 border border-slate-800/90 rounded-2xl p-5 relative group shadow-inner"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Key className="w-3.5 h-3.5" /> License Key
            </span>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showKey ? 'Hide' : 'Reveal'}
            </button>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-center justify-between gap-3 overflow-x-auto relative">
            <code className={`font-mono text-base sm:text-lg font-bold text-emerald-400 tracking-wide whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-300 ${
              showKey ? 'select-all' : 'blur-md select-none pointer-events-none opacity-60'
            }`}>
              {order.licenseKey}
            </code>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyKey}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </motion.button>
          </div>

          {/* Copy Floating Toast Notification */}
          <AnimatePresence>
            {copied && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-lg flex items-center gap-1"
              >
                <Check className="w-3 h-3 stroke-[3]" /> Copied to Clipboard!
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>


        )}

        {order.orderType !== 'prebooking' && order.emailDeliveryStatus && (
          <div className={`mb-5 rounded-xl border px-4 py-3 text-left text-xs ${
            order.emailDeliveryStatus === 'sent'
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
              : order.emailDeliveryStatus === 'failed'
                ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
                : 'border-cyan-500/25 bg-cyan-500/10 text-cyan-100'
          }`}>
            {order.emailDeliveryStatus === 'sent'
              ? `License key email sent to ${order.customerEmail}.`
              : order.emailDeliveryStatus === 'failed'
                ? 'License email could not be sent. Your key is still available above to copy.'
                : 'Sending your license key to email…'}
          </div>
        )}

        {/* Order Details Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800/80 text-left text-xs space-y-2.5 mb-8"
        >
          <div className="flex justify-between border-b border-slate-800/60 pb-2">
            <span className="text-slate-400">Order Reference:</span>
            <span className="text-white font-mono font-bold">{order.orderId}</span>
          </div>

          <div className="flex justify-between border-b border-slate-800/60 pb-2">
            <span className="text-slate-400">Payment ID:</span>
            <span className="text-slate-300 font-mono">{order.paymentId}</span>
          </div>

          <div className="flex justify-between border-b border-slate-800/60 pb-2">
            <span className="text-slate-400">Product:</span>
            <span className="text-white font-semibold">{order.productName}</span>
          </div>

          <div className="flex justify-between border-b border-slate-800/60 pb-2">
            <span className="text-slate-400">Duration:</span>
            <span className="text-white font-semibold">{order.durationName}</span>
          </div>

          {order.couponCode && <div className="flex justify-between border-b border-slate-800/60 pb-2"><span className="text-slate-400">Coupon:</span><span className="text-emerald-400 font-mono font-bold">{order.couponCode} (-₹{order.discountAmount})</span></div>}

          <div className="flex justify-between pt-1">
            <span className="text-slate-400">Amount Paid:</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">₹{order.finalAmount}</span>
          </div>
        </motion.div>

        {/* Product APK Download Links - hidden on pre-booking confirmation; released APKs are available via Track Order */}
        {order.orderType !== 'prebooking' && apkLinks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-teal-950/80 to-slate-950 border border-teal-500/30 text-left relative overflow-hidden"
          >
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700/80 overflow-hidden shrink-0 p-0.5 shadow-md flex items-center justify-center">
                  <img src={productLogoUrl || '/logo.jpg'} alt={`${order.productName} Logo`} className="w-full h-full object-cover rounded-xl" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">Download APK Files</h3>
                  <p className="text-xs text-slate-400 mt-1">Download the APK version you need for your purchased product.</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {apkLinks.map((link) => (
                <div key={link.id} className="flex flex-col gap-2.5 rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                  <div className="min-w-0">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-xs font-bold text-white break-words">{link.name}</span>
                      {link.version && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">{link.version}</span>}
                    </div>
                  </div>
                  <a href={link.url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all">
                    <Download className="w-4 h-4" /> Download APK
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {setupChannelUrl.trim() && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-8">
            <a href={setupChannelUrl.trim()} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs border border-emerald-400 transition-all shadow-lg shadow-emerald-500/20">
              <ExternalLink className="w-4 h-4" /> Setup Guide
            </a>
          </motion.div>
        )}

        </div>

        {/* Fixed Action Buttons */}
        <div className="shrink-0 border-t border-slate-800/70 px-6 sm:px-10 py-3">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <button
            onClick={() => downloadInvoiceTxt(order)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all active:scale-95"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Download Invoice TXT</span>
          </button>

          <button
            onClick={onReturnHome}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Buy Another Key</span>
          </button>
        </motion.div>
        </div>

      </motion.div>
    </div>
  );
};
