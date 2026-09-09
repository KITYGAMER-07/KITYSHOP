import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Zap, ShieldCheck, RefreshCw, CreditCard } from 'lucide-react';

export const FaqPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How do I receive my license key after payment?',
      a: 'Your license key is generated instantly in real time right after your payment is confirmed by Razorpay. It appears directly on your screen and can be copied with one click. You can also download a formal invoice TXT file or track your key using your Order Reference ID anytime.',
      icon: Zap
    },
    {
      q: 'What payment methods are supported on PeakLoader Shop?',
      a: 'We accept all major Indian payment channels via Razorpay including UPI (Google Pay, PhonePe, Paytm, BHIM), Credit & Debit Cards (Visa, Mastercard, RuPay), Net Banking, and Mobile Wallets.',
      icon: CreditCard
    },
    {
      q: 'How does stock management work?',
      a: 'Stock is synchronized live with our Firebase backend database. When an order is placed, an unused key is automatically retrieved from stock and marked as used for your unique order reference ID.',
      icon: RefreshCw
    },
    {
      q: 'What should I do if a key displays as invalid or expired?',
      a: 'All keys delivered by PeakLoader Shop are tested before being listed into inventory. In the rare event of activation difficulty, reach out to our support via Telegram or the Support contact form with your Order Reference ID for immediate assistance or replacement.',
      icon: ShieldCheck
    },
    {
      q: 'Can I download the APK or software loader?',
      a: 'Yes! If the admin has attached an APK download release link, you will see a prominent "Download APK Loader" button directly on the order success screen after completing your purchase.',
      icon: HelpCircle
    }
  ];

  return (
    <div className="py-10 max-w-3xl mx-auto px-4">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-2">
          <HelpCircle className="w-3.5 h-3.5" /> Support Center
        </span>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h2>
        <p className="mt-1.5 text-sm text-slate-400">Everything you need to know about purchasing and using license keys on PeakLoader Shop.</p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          const IconComp = faq.icon;
          return (
            <div
              key={idx}
              className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${
                    isOpen
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/50'
                  }`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-white leading-tight">{faq.q}</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/50">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
