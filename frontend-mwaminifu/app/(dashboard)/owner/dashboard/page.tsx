'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { ShopDashboard, Product, SaleListItem, InventoryReport, CreditReport } from '@/lib/types';
import { formatCurrency, formatNumber, formatDateTime, errorMessage } from '@/lib/format';
import StatsCard from '@/components/StatsCard';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';
import { ShoppingCart, Package, Users, Wallet, AlertTriangle, TrendingUp, Receipt, ArrowRightCircle } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

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

  useEffect(() => {
    if (!activeShopId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [dashRes, lowRes, recentRes, invRes, creditRes] = await Promise.all([
          apiClient.get<ShopDashboard>(`/shops/${activeShopId}/dashboard`),
          apiClient.get<Product[]>(`/shops/${activeShopId}/products/low-stock`),
          apiClient.get<SaleListItem[]>(`/shops/${activeShopId}/sales?limit=5`),
          apiClient.get<InventoryReport>(`/shops/${activeShopId}/reports/inventory`),
          apiClient.get<CreditReport>(`/shops/${activeShopId}/reports/credit`),
        ]);
        if (cancelled) return;
        if (dashRes.data) setDash(dashRes.data);
        if (lowRes.data) setLowStock(lowRes.data);
        if (recentRes.data) setRecent(recentRes.data);
        if (invRes.data) setInventory(invRes.data);
        if (creditRes.data) setCredit(creditRes.data);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activeShopId]);

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

  const trend = (dash?.salesTrend ?? []).map((p) => ({
    date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total: p.total,
  }));

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

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard featured title={t('todaysSales')} value={formatCurrency(dash?.todaySales ?? 0)} tone="teal" icon={<ShoppingCart size={20} />} sub={`${t('transactionsCount')}: ${formatNumber(dash?.transactionsToday ?? 0)}`} /></StaggerItem>
        <StaggerItem><StatsCard title={t('todaysProfit')} value={formatCurrency(dash?.todayGrossProfit ?? dash?.todayProfit ?? 0)} tone="navy" icon={<TrendingUp size={20} />} sub={t('grossProfit')} /></StaggerItem>
        <StaggerItem><StatsCard title={t('outstandingCredit')} value={formatCurrency(dash?.outstandingCredit ?? credit?.summary.totalOutstanding ?? 0)} tone="gold" icon={<Wallet size={20} />} sub={`${credit?.summary.customersWithDebt ?? 0} ${t('customers').toLowerCase()}`} /></StaggerItem>
        <StaggerItem><StatsCard title={t('todaysExpenses')} value={formatCurrency(dash?.todayExpenses ?? dash?.expensesToday ?? 0)} tone="red" icon={<Receipt size={20} />} /></StaggerItem>
      </Stagger>

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('stockValue')} value={formatCurrency(dash?.stockValue ?? inventory?.summary.totalValue ?? 0)} tone="navy" icon={<Package size={20} />} sub={`${formatNumber(dash?.stockItems ?? inventory?.summary.totalItems ?? 0)} ${t('items')}`} /></StaggerItem>
        <StaggerItem><StatsCard title={t('lowStock')} value={formatNumber(dash?.lowStockItems ?? lowStock.length)} tone="red" icon={<AlertTriangle size={20} />} href="/owner/stock" /></StaggerItem>
        <StaggerItem><StatsCard title={t('totalCustomers')} value={formatNumber(dash?.totalCustomers ?? 0)} tone="navy" icon={<Users size={20} />} href="/owner/customers" /></StaggerItem>
        <StaggerItem><StatsCard title={t('totalEmployees')} value={formatNumber(dash?.activeLoans ?? 0)} tone="teal" icon={<Users size={20} />} sub={t('loans')} /></StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ChartWrapper title={t('salesTrend')} subtitle={t('last7Days')} className="lg:col-span-2">
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
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
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
                  <Pill tone="red">{p.stockQuantity}</Pill>
                </li>
              ))}
            </ul>
          )}
        </ChartWrapper>
      </div>

      {(dash?.actionItems?.length ?? 0) > 0 && (
        <ChartWrapper title={t('actionRequired')} className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(dash?.actionItems ?? []).map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-warning/25 bg-warning/10">
                <ArrowRightCircle size={18} className="text-warning shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{formatNumber(a.count)}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.label}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartWrapper>
      )}

      <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWrapper title={t('recentSales')} subtitle={t('recentTransactions')}>
          {recent.length === 0 ? (
            <EmptyState message={t('noData')} />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.receiptNumber ?? t('sales')}</p>
                    <p className="text-xs text-subtle-foreground">{formatDateTime(s.saleDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-secondary">{formatCurrency(s.grandTotal)}</p>
                    <p className="text-xs text-subtle-foreground capitalize">{s.paymentMethod ?? '-'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ChartWrapper>

        <ChartWrapper title={t('topProducts')} subtitle={t('byProduct')}>
          {(dash?.topProducts ?? []).length === 0 ? (
            <EmptyState message={t('noData')} />
          ) : (
            <ul className="divide-y divide-border">
              {(dash?.topProducts ?? []).map((p, i) => (
                <li key={i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatNumber(p.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartWrapper>
      </Reveal>
    </PageWrapper>
  );
}
