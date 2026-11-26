'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Product, Category } from '@/lib/types';
import { formatCurrency, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Search, Lock, Plus, Package } from 'lucide-react';
import { usePermissions } from '@/lib/context/PermissionsContext';
import AccessDenied from '@/components/AccessDenied';

export default function EmployeeInventoryPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { can, loading: permsLoading } = usePermissions();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const requestSeq = useRef(0);
  const loadedShopRef = useRef<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    barcode: '',
    costPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    reorderLevel: '10',
    baseUnitName: 'piece',
  });

  const allowed = can('inventory:view') || can('products:view') || can('products:create');

  useEffect(() => {
    if (!activeShopId || !allowed) return;
    const seq = ++requestSeq.current;
    // Only show the skeleton on the first load for a shop. Searching or
    // refreshing after a product is added keeps the current list on screen.
    if (loadedShopRef.current !== activeShopId) setLoading(true);
    const timer = setTimeout(() => {
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      apiClient.get<Product[]>(`/shops/${activeShopId}/products?limit=200&compact=1${q}`)
        .then((res) => {
          if (seq !== requestSeq.current) return;
          setProducts(res.data ?? []);
          setError('');
        })
        .catch((err) => {
          if (seq === requestSeq.current) setError(errorMessage(err));
        })
        .finally(() => {
          if (seq !== requestSeq.current) return;
          loadedShopRef.current = activeShopId;
          setLoading(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [activeShopId, search, allowed, refreshKey]);

  useEffect(() => {
    if (!activeShopId || !allowed) return;
    apiClient
      .get<Category[]>(`/shops/${activeShopId}/categories`)
      .then((res) => setCategories(res.data ?? []))
      .catch(() => setCategories([]));
  }, [activeShopId, allowed]);

  if (permsLoading) {
    return <PageWrapper title={t('stockLookup')}><SkeletonTable rows={6} /></PageWrapper>;
  }
  if (!allowed) {
    return <PageWrapper title={t('stockLookup')}><AccessDenied /></PageWrapper>;
  }

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShopId) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post<Product>(`/shops/${activeShopId}/products`, {
        name: form.name.trim(),
        categoryId: form.categoryId || undefined,
        barcode: form.barcode.trim() || undefined,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        stockQuantity: Number(form.stockQuantity) || 0,
        reorderLevel: form.reorderLevel === '' ? undefined : Number(form.reorderLevel),
        baseUnitName: form.baseUnitName.trim() || 'piece',
      });
      const created = res.data;
      // Show the new product immediately instead of waiting for the full list
      // to reload; a background refresh then reconciles it with the server.
      if (created && !search) {
        const category = categories.find((c) => c.id === form.categoryId);
        setProducts((prev) => [
          { ...created, category: created.category ?? (category ? { id: category.id, name: category.name } : null) },
          ...prev.filter((p) => p.id !== created.id),
        ]);
      }
      toast(t('addProduct'), 'success');
      setAddOpen(false);
      setForm({
        name: '',
        categoryId: '',
        barcode: '',
        costPrice: '',
        sellingPrice: '',
        stockQuantity: '',
        reorderLevel: '10',
        baseUnitName: 'piece',
      });
      setRefreshKey((v) => v + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper
      title={t('stockLookup')}
      description={t('inventory')}
      breadcrumb={[t('employeePortal'), t('inventory')]}
      actions={can('products:create') ? <button onClick={() => setAddOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addProduct')}</button> : undefined}
    >
      <Reveal className="mb-4">
        <div className="surface-card p-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Lock size={16} className="text-secondary" />
            {t('inventory')} — {t('view')}
          </div>
        </div>
      </Reveal>

      <Reveal className="mb-6">
        <div className="surface-card p-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t('search')}...`} className="input-field pl-9" />
          </div>
        </div>
      </Reveal>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {shopLoading || loading ? (
        <SkeletonTable rows={6} />
      ) : products.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState
          icon={<Package size={22} />}
          title={t('noProductsYet')}
          description={t('noProductsDesc')}
          action={can('products:create') ? <button onClick={() => setAddOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addProduct')}</button> : undefined}
        /></div></Reveal>
      ) : (
        <Reveal>
          <div className="surface-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('products')}</th>
                  <th className="px-4 py-3 font-semibold">{t('category')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('sellingPrice')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('stock')}</th>
                  <th className="px-4 py-3 font-semibold">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-subtle-foreground">{p.sku ?? '-'} · {p.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(p.sellingPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{p.stockQuantity}</td>
                    <td className="px-4 py-3"><StatusBadge active={p.stockQuantity > p.reorderLevel} activeLabel={t('inStock')} inactiveLabel={t('lowStock')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
      <Modal open={addOpen} title={t('addProduct')} onClose={() => setAddOpen(false)}>
        <form onSubmit={submitProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('name')}</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('category')}</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input-field">
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('unit')}</label>
              <input value={form.baseUnitName} onChange={(e) => setForm({ ...form, baseUnitName: e.target.value })} className="input-field" placeholder={t('unitPlaceholder')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('costPrice')}</label>
              <input required type="number" min={0} value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('sellingPrice')}</label>
              <input required type="number" min={0} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('stock')}</label>
              <input type="number" min={0} value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('reorderLevel')}</label>
              <input type="number" min={0} value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('barcode')}</label>
            <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="input-field" placeholder="1234567890128" />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('saving') : t('addProduct')}</button>
        </form>
      </Modal>
    </PageWrapper>
  );
}
