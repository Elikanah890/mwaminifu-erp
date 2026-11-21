'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Shop } from '@/lib/types';
import { errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import { Store, Plus } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  businessCategory: '',
  region: '',
  district: '',
  ward: '',
  street: '',
  address: '',
};

export default function OwnerShopsPage() {
  const { shops, activeShopId, setActiveShopId, refreshShops, loading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const limitReached = shops.length >= 5;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitReached) {
      toast(t('shopLimitReached'), 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.post<Shop>('/shops', {
        name: form.name.trim(),
        businessCategory: form.businessCategory.trim() || undefined,
        region: form.region.trim() || undefined,
        district: form.district.trim() || undefined,
        ward: form.ward.trim() || undefined,
        street: form.street.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      await refreshShops();
      if (res.data?.id) setActiveShopId(res.data.id);
      toast(t('shopCreated'), 'success');
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper title={t('shops')}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard rows={4} />
          <SkeletonCard rows={4} />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={t('shops')} description={t('manageShops')} breadcrumb={[t('settings'), t('shops')]}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {shops.length}/5 {t('shops')}
        </p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          disabled={limitReached}
          className="btn-navy inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} /> {t('addShop')}
        </button>
      </div>

      {limitReached && (
        <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">{t('shopLimitReached')}</p>
      )}

      <Modal open={showForm && !limitReached} title={t('addShop')} onClose={() => setShowForm(false)} wide>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">{t('shopName')}</label>
            <input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t('shopCategory')}</label>
            <input value={form.businessCategory} onChange={(e) => setForm({ ...form, businessCategory: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t('region')}</label>
            <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t('district')}</label>
            <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t('ward')}</label>
            <input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t('street')}</label>
            <input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">{t('address')}</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-navy inline-flex items-center gap-2 disabled:opacity-50">
              <Plus size={16} /> {saving ? t('saving') : t('addShop')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline">{t('cancel')}</button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {shops.length === 0 ? (
          <EmptyState message={t('noData')} />
        ) : shops.map((shop) => (
          <div key={shop.id} onClick={() => shop.id !== activeShopId && setActiveShopId(shop.id)} className={shop.id !== activeShopId ? 'cursor-pointer' : ''}>
          <ChartWrapper title={shop.name} subtitle={shop.businessCategory || t('shops')}>
            <div className="space-y-2 text-sm text-muted-foreground">
              {[shop.region, shop.district, shop.ward, shop.street].filter(Boolean).length > 0 && (
                <p>{[shop.region, shop.district, shop.ward, shop.street].filter(Boolean).join(', ')}</p>
              )}
              {shop.address && <p>{shop.address}</p>}
              <p>{shop._count?.employees ?? 0} {t('employees')} · {shop._count?.products ?? 0} {t('products')}</p>
              {shop.id === activeShopId ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">{t('active')}</span>
              ) : (
                <button type="button" onClick={(e) => { e.stopPropagation(); setActiveShopId(shop.id); }} className="btn-outline inline-flex items-center gap-2">
                  <Store size={15} /> {t('switchShop')}
                </button>
              )}
            </div>
          </ChartWrapper>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
