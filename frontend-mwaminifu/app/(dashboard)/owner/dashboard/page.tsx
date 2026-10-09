'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { ShopDashboard, Product, SaleListItem, InventoryReport, CreditReport } from '@/lib/types';
import { formatCurrency, formatNumber, formatDateTime, errorMessage, formatStockWithUnits } from '@/lib/format';
import StatsCard from '@/components/StatsCard';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal, MotionCard, motion } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';
import {
  ShoppingCart, Package, Wallet, AlertTriangle, TrendingUp, Receipt, ArrowRightCircle,
  Coins, Landmark, Building2, UserPlus, PackagePlus, Eye, Ban, RotateCcw, TrendingDown,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

type TrendRange = 'today' | '7d' | '30d' | '3m' | 'year' | 'custom';
type ValueMode = 'daily' | 'weekly' | 'monthly';

const RANGE_KEYS: Array<{ id: TrendRange; key: string }> = [
  { id: 'today', key: 'today' },
  { id: '7d', key: 'last7Days' },
  { id: '30d', key: 'last30Days' },
  { id: '3m', key: 'last3Months' },
  { id: 'year', key: 'yearly' },
  { id: 'custom', key: 'custom' },
];

const STATUS_TONE: Record<string, 'green' | 'amber' | 'gray' | 'red'> = {
  COMPLETED: 'green',
  SUSPENDED: 'amber',
  REFUNDED: 'gray',
  VOIDED: 'red',
};

function downsample<T>(data: T[], step: number): T[] {
  if (data.length <= step) return data;
  const out: T[] = [];
  for (let i = data.length - 1; i >= 0; i -= step) out.unshift(data[i]);
  return out;
}

function monthlyGroup(data: Array<{ date: string; total: number; iso?: string }>) {
  const groups = new Map<string, { date: string; total: number }>();
  for (const p of data) {
    const key = (p.iso || p.date).slice(0, 7);
    groups.set(key, { date: p.date, total: p.total });
  }
  return Array.from(groups.values());
}

export default function OwnerDashboardPage() {
  const { activeShop, activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const [dash, setDash] = useState<ShopDashboard | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [recent, setRecent] = useState<SaleListItem[]>([]);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [credit, setCredit] = useState<CreditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<TrendRange>('7d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [valMode, setValMode] = useState<ValueMode>('daily');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeShopId) return;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams({ range });
    if (range === 'custom' && from && to) {
      qs.set('from', from);
      qs.set('to', to);
    }
    try {
      const [dashRes, lowRes, recentRes, invRes, creditRes] = await Promise.all([
        apiClient.get<ShopDashboard>(`/shops/${activeShopId}/dashboard?${qs.toString()}`),
        apiClient.get<Product[]>(`/shops/${activeShopId}/products/low-stock`),
        apiClient.get<SaleListItem[]>(`/shops/${activeShopId}/sales?limit=6`),
        apiClient.get<InventoryReport>(`/shops/${activeShopId}/reports/inventory`),
        apiClient.get<CreditReport>(`/shops/${activeShopId}/reports/credit`),
      ]);
      if (dashRes.data) setDash(dashRes.data);
      if (lowRes.data) setLowStock(lowRes.data);
      if (recentRes.data) setRecent(recentRes.data);
      if (invRes.data) setInventory(invRes.data);
      if (creditRes.data) setCredit(creditRes.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [activeShopId, range, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleVoid = async (id: string) => {
    if (!window.confirm(t('voidSale') + '?')) return;
    setBusyId(id);
    try {
      await apiClient.put(`/sales/${id}/void`, { reason: 'Voided from dashboard' });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (shopLoading || loading)
    return (
      <PageWrapper title={t('dashboard')}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><SkeletonCard rows={6} /></div>
            <SkeletonCard rows={6} />
          </div>
        </div>
      </PageWrapper>
    );

  const trend = dash?.salesTrend ?? [];
  const cmp = dash?.comparisons;
  const valTrend = dash?.valuationTrend ?? [];
  const valData = valMode === 'daily' ? valTrend : valMode === 'weekly' ? downsample(valTrend, 7) : monthlyGroup(valTrend);
  const glance = dash?.monthGlance;

  const actionLabels: Record<string, string> = {
    low_stock: t('lowStock'),
    open_shifts: t('currentShift'),
    pending_expenses: t('expenses'),
    overdue_credit: t('outstandingCredit'),
    payables_due: t('payablesDue'),
    loans_due: t('loanRepaymentsDue'),
    subscription_expiring: t('subscriptionExpiring'),
  };

  return (
    <PageWrapper
      title={`${t('dashboard')} — ${activeShop?.name ?? ''}`}
      description={activeShop ? `${activeShop.name} — ${t('salesOverview')}` : t('dashboard')}
      breadcrumb={['Owner', t('dashboard')]}
      actions={
        <Link href="/owner/sales" className="btn-gold inline-flex items-center gap-2">
          <ShoppingCart size={16} /> {t('newSale')}
        </Link>
      }
    >
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Quick Actions */}
      <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { href: '/owner/sales', label: t('newSale'), icon: <ShoppingCart size={18} />, cls: 'btn-teal' },
          { href: '/owner/customers', label: t('addCustomer'), icon: <UserPlus size={18} />, cls: 'btn-navy' },
          { href: '/owner/inventory', label: t('addProduct'), icon: <PackagePlus size={18} />, cls: 'btn-navy' },
          { href: '/owner/expenses', label: t('addExpense'), icon: <Receipt size={18} />, cls: 'btn-navy' },
        ].map((a) => (
          <Link key={a.href} href={a.href} className={`${a.cls} inline-flex items-center justify-center gap-2 py-3 text-sm`}>
            {a.icon} {a.label}
          </Link>
        ))}
      </Reveal>

      {/* Business Valuation Hero */}
      <Reveal className="mb-6">
        <MotionCard hover={false} className="surface-card relative overflow-hidden p-6 ring-1 ring-secondary/20">
          <div className="pointer-events-none absolute inset-0 bg-secondary/5" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                <Building2 size={14} /> {t('businessValuation')}
              </p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-secondary">{formatCurrency(dash?.netBusinessValue ?? 0)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('netBusinessValue')} = Stock + Cash + Credit − Loans</p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4 lg:min-w-[430px]">
              <Metric label={t('stockValue')} value={formatCurrency(dash?.stockValue ?? inventory?.summary.totalValue ?? 0)} />
              <Metric label={t('cashBalance')} value={formatCurrency(dash?.cashBalance ?? 0)} />
              <Metric label={t('customerCreditReceivable')} value={formatCurrency(dash?.customerCreditReceivable ?? 0)} />
              <Metric label={t('businessLoansOutstanding')} value={formatCurrency(dash?.businessLoansOutstanding ?? 0)} negative />
            </div>
          </div>

          <div className="relative mt-5 flex items-center gap-1.5">
            {(['daily', 'weekly', 'monthly'] as ValueMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setValMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  valMode === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted-2'
                }`}
              >
                {t(m)}
              </button>
            ))}
          </div>
          <div className="relative mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={valData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), t('netBusinessValue')]} />
                <Area type="monotone" dataKey="total" stroke="var(--secondary)" strokeWidth={2} fill="url(#valGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </MotionCard>
      </Reveal>

      {/* KPIs */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard featured title={t('todaysSales')} value={formatCurrency(dash?.todaySales ?? 0)} tone="teal" icon={<ShoppingCart size={20} />} sub={`${t('transactionsCount')}: ${formatNumber(dash?.transactionsToday ?? 0)}`} trend={cmp ? { value: cmp.sales.yesterday, label: t('vsYesterday') } : undefined} href="/owner/sales/history" /></StaggerItem>
        <StaggerItem><StatsCard title={t('netProfit')} value={formatCurrency(dash?.todayProfit ?? 0)} tone="navy" icon={<TrendingUp size={20} />} sub={t('grossProfit')} trend={cmp ? { value: cmp.profit.yesterday, label: t('vsYesterday') } : undefined} href="/owner/reports/profit" /></StaggerItem>
        <StaggerItem><StatsCard title={t('remainingCashBalance')} value={formatCurrency(dash?.cashBalance ?? 0)} tone="green" icon={<Coins size={20} />} trend={cmp ? { value: cmp.cash.week, label: t('vsLastWeek') } : undefined} href="/owner/cash" /></StaggerItem>
        <StaggerItem><StatsCard title={t('businessLoansOutstanding')} value={formatCurrency(dash?.businessLoansOutstanding ?? 0)} tone="gold" icon={<Landmark size={20} />} sub={t('outstandingLoans')} trend={cmp ? { value: cmp.loans.week, label: t('vsLastWeek') } : undefined} href="/owner/loans" /></StaggerItem>
      </Stagger>

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('stockValue')} value={formatCurrency(dash?.stockValue ?? inventory?.summary.totalValue ?? 0)} tone="navy" icon={<Package size={20} />} sub={`${formatNumber(dash?.stockItems ?? inventory?.summary.totalItems ?? 0)} ${t('items')}`} href="/owner/reports/valuation" /></StaggerItem>
        <StaggerItem><StatsCard title={t('customerCreditReceivable')} value={formatCurrency(dash?.customerCreditReceivable ?? credit?.summary.totalOutstanding ?? 0)} tone="gold" icon={<Wallet size={20} />} sub={`${credit?.summary.customersWithDebt ?? 0} ${t('customers').toLowerCase()}`} trend={cmp ? { value: cmp.credit.week, label: t('vsLastWeek') } : undefined} href="/owner/credit" /></StaggerItem>
        <StaggerItem><StatsCard title={t('todaysExpenses')} value={formatCurrency(dash?.todayExpenses ?? 0)} tone="red" icon={<Receipt size={20} />} trend={cmp ? { value: cmp.expenses.yesterday, label: t('vsYesterday') } : undefined} href="/owner/expenses" /></StaggerItem>
        <StaggerItem><StatsCard title={t('lowStock')} value={formatNumber(dash?.lowStockItems ?? lowStock.length)} tone="red" icon={<AlertTriangle size={20} />} sub={`${formatNumber(dash?.totalCustomers ?? 0)} ${t('customers').toLowerCase()}`} href="/owner/stock" /></StaggerItem>
      </Stagger>

      {/* Sales Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ChartWrapper title={t('salesTrend')} subtitle={t('salesOverview')} className="lg:col-span-2">
          <div className="flex flex-wrap gap-1.5 bg-card border border-border rounded-lg p-1 mb-4 w-fit">
            {RANGE_KEYS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  range === r.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {t(r.key)}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="flex items-center gap-2 mb-4">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-field max-w-[160px]" />
              <span className="text-subtle-foreground">—</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-field max-w-[160px]" />
            </div>
          )}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ownerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), t('sales')]} />
                <Area type="monotone" dataKey="total" stroke="var(--secondary)" strokeWidth={2} fill="url(#ownerGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>

        <ChartWrapper title={t('lowStockAlerts')} subtitle={t('lowStock')}>
          {lowStock.length === 0 ? (
            <EmptyState message={t('noData')} />
          ) : (
            <ul className="divide-y divide-border max-h-72 overflow-y-auto">
              {lowStock.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-subtle-foreground">{t('reorderLevel')}: {p.reorderLevel}</p>
                  </div>
                  <Pill tone="red">{formatStockWithUnits(p)}</Pill>
                </li>
              ))}
            </ul>
          )}
        </ChartWrapper>
      </div>

      {/* Action Required */}
      {(dash?.actionItems?.length ?? 0) > 0 && (
        <ChartWrapper title={t('actionRequired')} className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(dash?.actionItems ?? []).map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-warning/25 bg-warning/10">
                <ArrowRightCircle size={18} className="text-warning shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{formatNumber(a.count)}</p>
                  <p className="text-xs text-muted-foreground truncate">{actionLabels[a.type] ?? a.label}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartWrapper>
      )}

      {/* Recent Sales + Top Products */}
      <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartWrapper title={t('recentSales')} subtitle={t('recentTransactions')}>
          {recent.length === 0 ? (
            <EmptyState message={t('noData')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-subtle-foreground border-b border-border">
                    <th className="py-2 pr-3">{t('receipt')}</th>
                    <th className="py-2 pr-3">{t('customer')}</th>
                    <th className="py-2 pr-3 text-right">{t('amount')}</th>
                    <th className="py-2 pr-3">{t('status')}</th>
                    <th className="py-2 text-right">{t('action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recent.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 pr-3">
                        <p className="font-medium text-foreground">{s.receiptNumber ?? t('sales')}</p>
                        <p className="text-xs text-subtle-foreground">{formatDateTime(s.saleDate)}</p>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{s.customer?.name ?? '—'}</td>
                      <td className="py-3 pr-3 text-right font-semibold text-secondary">{formatCurrency(s.grandTotal)}</td>
                      <td className="py-3 pr-3"><Pill tone={STATUS_TONE[s.status] ?? 'gray'}>{s.status}</Pill></td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href="/owner/sales/history" className="p-1.5 rounded-md text-muted-foreground hover:bg-muted" title={t('view')}><Eye size={15} /></Link>
                          {s.status === 'COMPLETED' && (
                            <button onClick={() => handleVoid(s.id)} disabled={busyId === s.id} className="p-1.5 rounded-md text-danger hover:bg-danger/10 disabled:opacity-50" title={t('voidSale')}><Ban size={15} /></button>
                          )}
                          {s.status === 'COMPLETED' && (
                            <Link href="/owner/sales/returns" className="p-1.5 rounded-md text-warning hover:bg-warning/10" title={t('refund')}><RotateCcw size={15} /></Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartWrapper>

        <ChartWrapper title={t('topProducts')} subtitle={t('byProduct')}>
          {(dash?.topProducts ?? []).length === 0 ? (
            <EmptyState message={t('noData')} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-subtle-foreground border-b border-border">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">{t('products')}</th>
                  <th className="py-2 pr-3 text-right">{t('revenue')}</th>
                  <th className="py-2 pr-3 text-right">{t('profit')}</th>
                  <th className="py-2 text-right">{t('trend')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(dash?.topProducts ?? []).map((p, i) => (
                  <tr key={p.productId ?? i}>
                    <td className="py-3 pr-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    </td>
                    <td className="py-3 pr-3 font-medium text-foreground">{p.name}</td>
                    <td className="py-3 pr-3 text-right text-muted-foreground">{formatCurrency(p.revenue)}</td>
                    <td className="py-3 pr-3 text-right text-secondary">{formatCurrency(p.profit)}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${p.trend >= 0 ? 'text-success' : 'text-danger'}`}>
                        {p.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(p.trend)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ChartWrapper>
      </Reveal>

      {/* This Month at a Glance */}
      <Reveal>
        <ChartWrapper title={t('thisMonthAtAGlance')} subtitle={t('thisMonth')}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlanceStat label={t('totalSalesThisMonth')} value={formatCurrency(glance?.sales ?? 0)} tone="text-secondary" />
            <GlanceStat label={t('totalProfitThisMonth')} value={formatCurrency(glance?.profit ?? 0)} tone="text-primary" />
            <GlanceStat label={t('topCustomer')} value={glance?.topCustomer ?? '—'} sub={glance?.topCustomer ? formatCurrency(glance.topCustomerAmount) : undefined} tone="text-foreground" />
            <GlanceStat label={t('bestSellingProduct')} value={glance?.bestProduct ?? '—'} sub={glance?.bestProduct ? `${formatNumber(glance.bestProductQuantity)} ${t('items')}` : undefined} tone="text-foreground" />
          </div>
        </ChartWrapper>
      </Reveal>
    </PageWrapper>
  );
}

function Metric({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div>
      <p className="text-xs text-subtle-foreground">{label}</p>
      <p className={`font-semibold tabular-nums ${negative ? 'text-danger' : 'text-foreground'}`}>{negative ? '−' : ''}{value}</p>
    </div>
  );
}

function GlanceStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-xl border border-border p-4">
      <p className="text-xs text-subtle-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-subtle-foreground">{sub}</p>}
    </motion.div>
  );
}
