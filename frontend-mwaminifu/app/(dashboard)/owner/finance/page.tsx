'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { FinanceOverview, ReportPeriod } from '@/lib/types';
import { formatCurrency, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonCard } from '@/components/Spinner';
import { Stagger, StaggerItem } from '@/components/motion';
import StatsCard from '@/components/StatsCard';
import PeriodSelector from '@/components/PeriodSelector';
import { useToast } from '@/components/Toast';
import { TrendingUp, Receipt, Wallet, CreditCard, HandCoins, Landmark, PiggyBank } from 'lucide-react';

export default function FinanceOverviewPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    setLoading(true);
    const q = new URLSearchParams({ period });
    if (period === 'custom' && from) q.set('from', from);
    if (period === 'custom' && to) q.set('to', to);
    apiClient.get<FinanceOverview>(`/shops/${activeShopId}/finance/overview?${q.toString()}`)
      .then((res) => setData(res.data ?? null))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, [activeShopId, period, from, to]);

  const s = data?.summary;

  return (
    <PageWrapper title={t('financeOverview')} description={t('finance')} breadcrumb={['Owner', t('finance'), t('financeOverview')]}>
      <PeriodSelector period={period} onChange={setPeriod} from={from} to={to} onFrom={setFrom} onTo={setTo} />

      {shopLoading || loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
          </div>
        </div>
      ) : (
        <>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StaggerItem><StatsCard title={t('revenue')} value={formatCurrency(s?.revenue ?? 0)} tone="teal" icon={<TrendingUp size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('expenses')} value={formatCurrency(s?.expenses ?? 0)} tone="red" icon={<Receipt size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('netProfitValue')} value={formatCurrency(s?.netProfit ?? 0)} tone={(s?.netProfit ?? 0) >= 0 ? 'navy' : 'red'} icon={<PiggyBank size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('cashBalance')} value={formatCurrency(s?.cashBalance ?? 0)} tone="teal" icon={<Wallet size={20} />} /></StaggerItem>
          </Stagger>

          <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StaggerItem><StatsCard title={t('receivables')} value={formatCurrency(s?.receivables ?? 0)} tone="navy" icon={<CreditCard size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('payables')} value={formatCurrency(s?.payables ?? 0)} tone="red" icon={<HandCoins size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('outstandingLoans')} value={formatCurrency(s?.outstandingLoans ?? 0)} tone="red" icon={<Landmark size={20} />} /></StaggerItem>
          </Stagger>
        </>
      )}
    </PageWrapper>
  );
}
