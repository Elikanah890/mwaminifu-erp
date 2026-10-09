'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { StockValuation, Product } from '@/lib/types';
import { formatCurrency, formatNumber, errorMessage, formatStockWithUnits } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import ChartWrapper from '@/components/ChartWrapper';
import StatsCard from '@/components/StatsCard';
import BarcodeScanner from '@/components/BarcodeScanner';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Boxes, TrendingUp, AlertTriangle, PackageX, ScanBarcode } from 'lucide-react';

export default function StockPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [valuation, setValuation] = useState<StockValuation | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [outStock, setOutStock] = useState<Product[]>([]);
  const [fastMovers, setFastMovers] = useState<Array<{ productId: string; name: string; sku?: string | null; soldQuantity: number }>>([]);
  const [byCategory, setByCategory] = useState<Array<{ category: string; value: number; items: number; products: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!activeShopId) return;
    setLoading(true);
    Promise.all([
      apiClient.get<StockValuation>(`/shops/${activeShopId}/stock/valuation`),
      apiClient.get<{ lowStock: Product[]; outOfStock: Product[] }>(`/shops/${activeShopId}/stock/low-out`),
      apiClient.get<Array<{ productId: string; name: string; sku?: string | null; soldQuantity: number }>>(`/shops/${activeShopId}/stock/fast-movers`),
      apiClient.get<Array<{ category: string; value: number; items: number; products: number }>>(`/shops/${activeShopId}/stock/by-category`),
    ])
      .then(([v, lo, fm, bc]) => {
        setValuation(v.data ?? null);
        setLowStock(lo.data?.lowStock ?? []);
        setOutStock(lo.data?.outOfStock ?? []);
        setFastMovers(fm.data ?? []);
        setByCategory(bc.data ?? []);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [activeShopId]);

  if (shopLoading || loading)
    return (
      <PageWrapper title={t('stock')}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard rows={5} />
            <SkeletonCard rows={5} />
          </div>
        </div>
      </PageWrapper>
    );

  const handleScan = async (barcode: string) => {
    setScanOpen(false);
    if (!barcode) return;
    try {
      const res = await apiClient.get<Product>(`/shops/${activeShopId}/products/by-barcode/${encodeURIComponent(barcode)}`);
      setScannedProduct(res.data ?? null);
      if (!res.data) toast(t('noResults'), 'error');
    } catch (err) {
      setScannedProduct(null);
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <PageWrapper
      title={t('stock')}
      description={t('inventoryOverview')}
      breadcrumb={['Owner', t('inventory'), t('stock')]}
      actions={<button onClick={() => setScanOpen(true)} className="btn-teal inline-flex items-center gap-2"><ScanBarcode size={16} /> {t('scan')}</button>}
    >
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {scannedProduct && (
        <div className="surface-card border-secondary p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-subtle-foreground">{t('products')}</p>
            <p className="text-lg font-bold text-primary">{scannedProduct.name}</p>
            <p className="text-xs text-subtle-foreground">{scannedProduct.barcode} · {scannedProduct.sku ?? '-'}</p>
          </div>
          <div className="flex gap-6 text-center">
            <div><p className="text-xs text-subtle-foreground">{t('stock')}</p><p className="text-sm font-bold text-primary">{formatStockWithUnits(scannedProduct)}</p></div>
            <div><p className="text-xs text-subtle-foreground">{t('sellingPrice')}</p><p className="text-xl font-bold text-secondary">{formatCurrency(scannedProduct.sellingPrice)}</p></div>
            <div>
              <p className="text-xs text-subtle-foreground">{t('status')}</p>
              {scannedProduct.stockQuantity <= 0 ? <Pill tone="red">{t('outOfStock')}</Pill> : scannedProduct.stockQuantity <= scannedProduct.reorderLevel ? <Pill tone="amber">{t('lowStock')}</Pill> : <Pill tone="green">{t('inStock')}</Pill>}
            </div>
          </div>
        </div>
      )}

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('valuation')} value={formatCurrency(valuation?.totalCost ?? 0)} tone="navy" icon={<Boxes size={20} />} sub={t('costPrice')} /></StaggerItem>
        <StaggerItem><StatsCard title={t('valuation')} value={formatCurrency(valuation?.totalRetail ?? 0)} tone="teal" icon={<TrendingUp size={20} />} sub={t('sellingPrice')} /></StaggerItem>
        <StaggerItem><StatsCard title={t('profit')} value={formatCurrency(valuation?.potentialProfit ?? 0)} tone="gold" icon={<TrendingUp size={20} />} sub={t('potentialProfit')} /></StaggerItem>
        <StaggerItem><StatsCard title={t('items')} value={formatNumber(valuation?.totalItems ?? 0)} tone="navy" sub={`${valuation?.totalProducts ?? 0} ${t('products')}`} /></StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartWrapper title={t('lowStock')} subtitle={t('lowStockAlerts')}>
          {lowStock.length === 0 ? <EmptyState message={t('noData')} /> : (
            <ul className="divide-y divide-border max-h-72 overflow-y-auto">
              {lowStock.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-subtle-foreground">{t('reorderLevel')}: {p.reorderLevel}</p>
                  </div>
                  <Pill tone="amber"><AlertTriangle size={12} className="inline mr-1" />{formatStockWithUnits(p)}</Pill>
                </li>
              ))}
            </ul>
          )}
        </ChartWrapper>

        <ChartWrapper title={t('outOfStock')} subtitle={t('outOfStock')}>
          {outStock.length === 0 ? <EmptyState message={t('noData')} /> : (
            <ul className="divide-y divide-border max-h-72 overflow-y-auto">
              {outStock.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <Pill tone="red"><PackageX size={12} className="inline mr-1" />0</Pill>
                </li>
              ))}
            </ul>
          )}
        </ChartWrapper>
      </div>

      <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWrapper title={t('byProduct')} subtitle={t('byProduct')}>
          {fastMovers.length === 0 ? <EmptyState message={t('noData')} /> : (
            <ul className="divide-y divide-border">
              {fastMovers.map((p, i) => (
                <li key={p.productId} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatNumber(p.soldQuantity)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartWrapper>

        <ChartWrapper title={t('byCategory')} subtitle={t('valuation')}>
          {byCategory.length === 0 ? <EmptyState message={t('noData')} /> : (
            <ul className="divide-y divide-border">
              {byCategory.map((c) => (
                <li key={c.category} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.category}</p>
                    <p className="text-xs text-subtle-foreground">{c.products} {t('products')} · {formatNumber(c.items)} {t('items')}</p>
                  </div>
                  <span className="text-sm font-semibold text-secondary">{formatCurrency(c.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartWrapper>
      </Reveal>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleScan} />
    </PageWrapper>
  );
}
