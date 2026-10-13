import React, { useMemo, useState } from 'react';
import { BarChart3, DollarSign, ShoppingBag, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { FreeTrialClaim, Order, Product } from '../types';

type AnalyticsRange = 7 | 30 | 90;

interface AdminAnalyticsProps {
  orders: Order[];
  products: Product[];
  freeTrialClaims: FreeTrialClaim[];
  freeTrialLimit?: number;
}

interface DailySale {
  start: number;
  label: string;
  revenue: number;
  sales: number;
}

const money = (value: number) => `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;

const dayStart = (value: number | Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const shortDate = (value: number) => new Date(value).toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short'
});

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  orders,
  products,
  freeTrialClaims,
  freeTrialLimit = 0
}) => {
  const [range, setRange] = useState<AnalyticsRange>(30);

  const analytics = useMemo(() => {
    const today = dayStart(Date.now());
    const firstDay = today - ((range - 1) * 24 * 60 * 60 * 1000);
    const daily: DailySale[] = Array.from({ length: range }, (_, index) => {
      const start = firstDay + (index * 24 * 60 * 60 * 1000);
      return { start, label: shortDate(start), revenue: 0, sales: 0 };
    });

    const paidOrders = orders.filter(order =>
      order.status === 'paid' && Number(order.createdAt || 0) >= firstDay
    );

    paidOrders.forEach(order => {
      const index = Math.floor((dayStart(Number(order.createdAt || 0)) - firstDay) / (24 * 60 * 60 * 1000));
      if (index >= 0 && index < daily.length) {
        daily[index].sales += 1;
        daily[index].revenue += Number(order.finalAmount || 0);
      }
    });

    const productSales = new Map<string, { name: string; revenue: number; sales: number }>();
    paidOrders.forEach(order => {
      const id = order.productId || 'unknown';
      const current = productSales.get(id) || {
        name: order.productName || products.find(product => product.id === id)?.name || 'Unknown Product',
        revenue: 0,
        sales: 0
      };
      current.revenue += Number(order.finalAmount || 0);
      current.sales += 1;
      productSales.set(id, current);
    });

    const periodOrders = orders.filter(order => Number(order.createdAt || 0) >= firstDay);
    const todaySales = daily[daily.length - 1];
    const yesterdaySales = daily[daily.length - 2] || { revenue: 0, sales: 0 };
    const growth = yesterdaySales.revenue > 0
      ? ((todaySales.revenue - yesterdaySales.revenue) / yesterdaySales.revenue) * 100
      : (todaySales.revenue > 0 ? 100 : 0);
    const successfulTrials = freeTrialClaims.filter(claim =>
      claim.status === 'success' && Number(claim.createdAt || 0) >= firstDay
    ).length;

    return {
      daily,
      paidOrders: [...paidOrders].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)),
      revenue: paidOrders.reduce((total, order) => total + Number(order.finalAmount || 0), 0),
      sales: paidOrders.length,
      average: paidOrders.length
        ? paidOrders.reduce((total, order) => total + Number(order.finalAmount || 0), 0) / paidOrders.length
        : 0,
      todaySales,
      growth,
      productSales: [...productSales.values()].sort((a, b) => b.revenue - a.revenue),
      failedPayments: periodOrders.filter(order => order.status === 'failed').length,
      pendingPayments: periodOrders.filter(order => order.status === 'pending').length,
      successfulTrials,
      allSuccessfulTrials: freeTrialClaims.filter(claim => claim.status === 'success').length
    };
  }, [freeTrialClaims, orders, products, range]);

  const maxRevenue = Math.max(...analytics.daily.map(day => day.revenue), 1);
  const maxProductRevenue = Math.max(...analytics.productSales.map(item => item.revenue), 1);
  const pointWidth = analytics.daily.length > 1 ? 544 / (analytics.daily.length - 1) : 0;
  const chartPoints = analytics.daily.map((day, index) => {
    const x = 28 + (index * pointWidth);
    const y = 218 - ((day.revenue / maxRevenue) * 168);
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `28,218 ${chartPoints} 572,218`;
  const labelStep = Math.max(1, Math.ceil(analytics.daily.length / 6));
  const isPositiveGrowth = analytics.growth >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
            <BarChart3 className="h-3.5 w-3.5" /> Live sales data
          </p>
          <h3 className="mt-3 text-xl font-black text-white">Sales Analytics</h3>
          <p className="mt-1 text-xs text-slate-400">Paid orders only. Figures update automatically when a new payment is confirmed.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5">
          {([7, 30, 90] as AnalyticsRange[]).map(days => (
            <button
              key={days}
              onClick={() => setRange(days)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${range === days
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Revenue</span><DollarSign className="h-4 w-4 text-emerald-400" /></div>
          <p className="mt-2 text-xl font-black text-white sm:text-2xl">{money(analytics.revenue)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Last {range} days</p>
        </div>
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Paid sales</span><ShoppingBag className="h-4 w-4 text-blue-400" /></div>
          <p className="mt-2 text-xl font-black text-white sm:text-2xl">{analytics.sales}</p>
          <p className="mt-1 text-[11px] text-slate-400">Average {money(analytics.average)}</p>
        </div>
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Today</span><BarChart3 className="h-4 w-4 text-cyan-400" /></div>
          <p className="mt-2 text-xl font-black text-white sm:text-2xl">{money(analytics.todaySales.revenue)}</p>
          <p className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold ${isPositiveGrowth ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositiveGrowth ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {analytics.growth === 0 ? 'No change from yesterday' : `${Math.abs(Math.round(analytics.growth))}% vs yesterday`}
          </p>
        </div>
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Free trials</span><Zap className="h-4 w-4 text-violet-400" /></div>
          <p className="mt-2 text-xl font-black text-white sm:text-2xl">{analytics.successfulTrials}</p>
          <p className="mt-1 text-[11px] text-slate-400">{freeTrialLimit > 0 ? `${Math.max(0, freeTrialLimit - analytics.allSuccessfulTrials)} quota remaining` : 'Claims in selected period'}</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h4 className="text-sm font-bold text-white">Daily revenue trend</h4><p className="mt-1 text-xs text-slate-400">Revenue for paid orders during the selected period.</p></div>
            <span className="rounded-lg bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-emerald-300">Peak {money(maxRevenue)}</span>
          </div>
          <div className="mt-5">
              <svg viewBox="0 0 600 240" preserveAspectRatio="none" className="h-52 w-full sm:h-56" role="img" aria-label="Daily revenue line chart">
                <defs>
                  <linearGradient id="analyticsArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[50, 92, 134, 176, 218].map(y => <line key={y} x1="28" x2="572" y1={y} y2={y} stroke="#1e293b" strokeWidth="1" />)}
                <path d={`M ${areaPoints}`} fill="url(#analyticsArea)" />
                <polyline points={chartPoints} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {analytics.daily.map((day, index) => {
                  const x = 28 + (index * pointWidth);
                  const y = 218 - ((day.revenue / maxRevenue) * 168);
                  return <g key={day.start}><title>{`${day.label}: ${money(day.revenue)} • ${day.sales} sales`}</title><circle cx={x} cy={y} r="3.5" fill="#0f172a" stroke="#6ee7b7" strokeWidth="2" /></g>;
                })}
              </svg>
              <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-medium text-slate-500">
                {analytics.daily.filter((_, index) => index % labelStep === 0 || index === analytics.daily.length - 1).map(day => <span key={day.start}>{day.label}</span>)}
              </div>
          </div>
          {analytics.sales === 0 && <p className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-3 text-center text-xs text-slate-500">No paid orders for this period yet. The graph will update automatically after payment.</p>}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-bold text-white">Top products</h4><p className="mt-1 text-xs text-slate-400">By revenue</p></div><span className="text-xs font-bold text-slate-500">{range} days</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {analytics.productSales.slice(0, 5).map((product, index) => (
              <div key={`${product.name}-${index}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 font-semibold text-slate-200"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-[10px] text-emerald-300">{index + 1}</span><span className="truncate" title={product.name}>{product.name}</span></span><span className="shrink-0 font-mono font-bold text-emerald-400">{money(product.revenue)}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${Math.max(6, (product.revenue / maxProductRevenue) * 100)}%` }} /></div>
                <p className="mt-1 text-[10px] text-slate-500">{product.sales} paid {product.sales === 1 ? 'order' : 'orders'}</p>
              </div>
            ))}
            {analytics.productSales.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">Product sales will appear here after a successful payment.</p>}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4"><div><h4 className="text-sm font-bold text-white">Recent paid sales</h4><p className="mt-1 text-xs text-slate-400">Latest successful orders.</p></div><span className="text-xs font-bold text-emerald-300">{analytics.sales} total</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-xs"><thead className="bg-slate-950/60 text-left uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Order</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Amount</th><th className="px-5 py-3 text-right">Time</th></tr></thead><tbody className="divide-y divide-slate-800/80">{analytics.paidOrders.slice(0, 6).map(order => <tr key={order.id} className="text-slate-300"><td className="px-5 py-3.5 font-mono font-bold text-white">{order.orderId}</td><td className="px-4 py-3.5"><p className="font-semibold text-slate-200">{order.productName || 'Product'}</p><p className="mt-0.5 text-[10px] text-slate-500">{order.durationName || 'License'}</p></td><td className="px-4 py-3.5 font-mono font-bold text-emerald-400">{money(order.finalAmount)}</td><td className="px-5 py-3.5 text-right text-slate-500">{new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td></tr>)}{analytics.paidOrders.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No paid sales in the selected period.</td></tr>}</tbody></table></div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <h4 className="text-sm font-bold text-white">Payment health</h4><p className="mt-1 text-xs text-slate-400">Selected period summary.</p>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3"><span className="text-xs font-semibold text-slate-300">Paid</span><span className="text-lg font-black text-emerald-400">{analytics.sales}</span></div>
            <div className="flex items-center justify-between rounded-2xl border border-amber-500/15 bg-amber-500/5 px-4 py-3"><span className="text-xs font-semibold text-slate-300">Pending</span><span className="text-lg font-black text-amber-400">{analytics.pendingPayments}</span></div>
            <div className="flex items-center justify-between rounded-2xl border border-rose-500/15 bg-rose-500/5 px-4 py-3"><span className="text-xs font-semibold text-slate-300">Failed</span><span className="text-lg font-black text-rose-400">{analytics.failedPayments}</span></div>
          </div>
        </section>
      </div>
    </div>
  );
};
