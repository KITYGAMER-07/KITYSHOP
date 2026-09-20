import React, { useState } from 'react';
import { Search, Key, FileText, ShieldAlert, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Order, Product } from '../types';
import { downloadInvoiceTxt } from '../lib/invoice';

interface OrderLookupProps {
  orders: Order[];
  apkUrl?: string;
  apkAppName?: string;
  apkVersion?: string;
  products?: Product[];
}

export const OrderLookup: React.FC<OrderLookupProps> = ({ 
  orders,
  apkUrl,
  apkAppName = 'PeakLoader Shop',
  apkVersion = 'v2.4.0',
  products = []
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [foundOrders, setFoundOrders] = useState<Order[] | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      setFoundOrders(null);
      setHasSearched(false);
      return;
    }

    const matches = orders.filter(
      o =>
        o.orderId.toLowerCase().includes(query) ||
        o.paymentId.toLowerCase().includes(query) ||
        (o.customerEmail && o.customerEmail.toLowerCase().includes(query))
    );

    setFoundOrders(matches);
    setHasSearched(true);
  };

  const toggleKeyVisibility = (orderId: string) => {
    setVisibleKeyIds(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  return (
    <div className="py-10 max-w-3xl mx-auto px-4">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-2">
          <Search className="w-3.5 h-3.5" /> License Key Recovery
        </span>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Track Your Order</h2>
        <p className="mt-1 text-sm text-slate-400">
          Enter your Order Reference ID, Razorpay Payment ID, or Email to retrieve your purchased keys.
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="e.g. ORD-123456 or pay_Pxxx or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white font-mono text-sm rounded-2xl pl-12 pr-32 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xl"
          />
          <Search className="w-5 h-5 text-slate-500 absolute left-4 pointer-events-none" />
          <button
            type="submit"
            className="absolute right-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            Lookup Key
          </button>
        </div>
      </form>

      {/* Search Results */}
      {hasSearched && foundOrders && (
        <div className="space-y-4">
          {foundOrders.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
              <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Orders Found</h3>
              <p className="text-xs">Double check your Order Reference or Payment ID and try searching again.</p>
            </div>
          ) : (
            foundOrders.map((ord) => {
              const keyId = ord.id || ord.orderId;
              const isPreBooking = ord.orderType === 'prebooking' || !!ord.bookingId;
              const isReleased = ord.bookingStatus === 'released';
              const canRevealPreBooking = !isPreBooking || isReleased;
              const isKeyShown = visibleKeyIds[keyId] ?? true;
              return (
                <div
                  key={keyId}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Order ID</span>
                      <span className="text-base font-bold font-mono text-white">{ord.orderId}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Date</span>
                      <span className="text-xs text-slate-300">
                        {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Product:</span>
                      <div className="text-white font-semibold">{ord.productName}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Duration:</span>
                      <div className="text-white font-semibold">{ord.durationName}</div>
                    </div>
                  </div>

                  {/* License Key Display: pre-booking keys stay hidden until admin release. */}
                  {canRevealPreBooking ? (
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                          <Key className="w-3 h-3 text-emerald-400" /> License Key
                        </div>
                        <code className={`font-mono text-sm font-bold text-emerald-400 whitespace-nowrap overflow-hidden text-ellipsis block transition-all duration-300 ${
                          isKeyShown ? 'select-all' : 'blur-md select-none pointer-events-none opacity-60'
                        }`}>
                          {ord.licenseKey || 'No license key assigned'}
                        </code>
                      </div>

                      {ord.licenseKey && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => toggleKeyVisibility(keyId)}
                            className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                            title="Toggle Key"
                          >
                            {isKeyShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => copyKey(ord.licenseKey, keyId)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 flex items-center gap-1"
                          >
                            {copiedKeyId === keyId ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
                      <div className="text-xs font-bold text-amber-300">Pre-Booking Waiting for Release</div>
                      <p className="text-[10px] text-slate-400 mt-1">Your Order ID is saved. The license key and APK downloads will appear here after the admin releases this pre-booking.</p>
                    </div>
                  )}

                  {/* APK Download Button inside order card if configured */}
                  {canRevealPreBooking && (() => {
                    const productLinks = products.find(p => p.id === ord.productId)?.apkLinks || [];
                    if (productLinks.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        {productLinks.map(link => (
                          <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 hover:bg-teal-500/10 transition-colors">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-bold text-white">{link.name}</span>{link.version && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">{link.version}</span>}</div>
                              <span className="text-[10px] text-slate-500">Product APK download</span>
                            </div>
                            <span className="shrink-0 px-3 py-1.5 rounded-lg bg-teal-400 text-slate-950 text-[10px] font-bold">Download APK</span>
                          </a>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400">
                      Paid: <strong className="text-emerald-400 font-mono">₹{ord.finalAmount}</strong>
                    </span>

                    <button
                      onClick={() => downloadInvoiceTxt(ord)}
                      className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" /> Download Invoice
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
