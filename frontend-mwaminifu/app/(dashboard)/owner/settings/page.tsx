'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Shop, ShopSettings } from '@/lib/types';
import { errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard } from '@/components/Spinner';
import { Reveal, motion } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { clearOfflineData } from '@/lib/offline/db';
import { Save, Trash2 } from 'lucide-react';

export default function OwnerSettingsPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { toast } = useToast();
  const { t, locale, setLocale } = useI18n();
  const [shop, setShop] = useState<Shop | null>(null);
  const [, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [profileForm, setProfileForm] = useState({ name: '', address: '' });
  const [receiptForm, setReceiptForm] = useState({ receiptHeader: '', receiptFooter: '' });
  const [language, setLanguage] = useState<string>(locale);

  useEffect(() => {
    if (!activeShopId) return;
    setLoading(true);
    Promise.all([
      apiClient.get<Shop>(`/shops/${activeShopId}`),
      apiClient.get<ShopSettings>(`/shops/${activeShopId}/settings`),
    ])
      .then(([s, st]) => {
        const shopData = s.data;
        if (shopData) {
          setShop(shopData);
          setProfileForm({ name: shopData.name, address: shopData.address ?? '' });
          setReceiptForm({ receiptHeader: shopData.receiptHeader ?? '', receiptFooter: shopData.receiptFooter ?? '' });
        }
        const stData = st.data;
        if (stData) {
          setSettings(stData);
          setLanguage(stData.language ?? locale);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeShopId]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/shops/${activeShopId}`, { name: profileForm.name, address: profileForm.address });
      toast(t('update'), 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveReceipt = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/shops/${activeShopId}/settings`, { receiptHeader: receiptForm.receiptHeader, receiptFooter: receiptForm.receiptFooter });
      toast(t('update'), 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearOffline = async () => {
    setClearing(true);
    try {
      await clearOfflineData();
      toast('Offline data cleared', 'success');
    } catch {
      toast('Could not clear offline data', 'error');
    } finally {
      setClearing(false);
    }
  };

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    setLocale(lang === 'sw' ? 'sw' : 'en');
  };

  const saveLanguage = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/shops/${activeShopId}/settings`, { language });
      toast(t('update'), 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (shopLoading || loading)
    return (
      <PageWrapper title={t('settings')}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard rows={4} />
          <SkeletonCard rows={4} />
          <SkeletonCard rows={3} />
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper title={t('settings')} description={t('settings')} breadcrumb={['Owner', t('settings')]}>
      <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWrapper title={t('shopProfile')} subtitle={t('shopProfile')}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('name')}</label>
              <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('address')}</label>
              <input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} className="input-field" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Currency</span>
              <span className="text-sm font-semibold text-foreground">{shop?.currency ?? 'TZS'}</span>
            </div>
            <button onClick={saveProfile} disabled={saving} className="btn-navy inline-flex items-center gap-2"><Save size={16} /> {t('save')}</button>
          </div>
        </ChartWrapper>

        <ChartWrapper title={t('receiptSettings')} subtitle={t('receiptSettings')}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('receipt')} {t('header')}</label>
              <input value={receiptForm.receiptHeader} onChange={(e) => setReceiptForm({ ...receiptForm, receiptHeader: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('receipt')} {t('footer')}</label>
              <input value={receiptForm.receiptFooter} onChange={(e) => setReceiptForm({ ...receiptForm, receiptFooter: e.target.value })} className="input-field" />
            </div>
            <button onClick={saveReceipt} disabled={saving} className="btn-navy inline-flex items-center gap-2"><Save size={16} /> {t('save')}</button>
          </div>
        </ChartWrapper>

        <ChartWrapper title={t('language')} subtitle={t('language')}>
          <div className="space-y-4">
            <div className="flex gap-3">
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }} onClick={() => changeLanguage('en')} className={`px-4 py-2 rounded-lg text-sm font-medium ${language === 'en' ? 'bg-primary text-primary-foreground' : 'bg-muted-2 text-muted-foreground'}`}>{t('english')}</motion.button>
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }} onClick={() => changeLanguage('sw')} className={`px-4 py-2 rounded-lg text-sm font-medium ${language === 'sw' ? 'bg-primary text-primary-foreground' : 'bg-muted-2 text-muted-foreground'}`}>{t('swahili')}</motion.button>
            </div>
            <p className="text-xs text-subtle-foreground">{t('language')}</p>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }} onClick={saveLanguage} disabled={saving} className="btn-navy inline-flex items-center gap-2"><Save size={16} /> {t('save')}</motion.button>
          </div>
        </ChartWrapper>

        <ChartWrapper title="Offline data" subtitle="On-device storage">
          <div className="space-y-3">
            <p className="text-xs text-subtle-foreground">
              Cached products, categories and any pending offline changes are stored on this device.
              Clear them if you are using a shared device.
            </p>
            <button onClick={handleClearOffline} disabled={clearing} className="btn-outline inline-flex items-center gap-2">
              <Trash2 size={16} /> {clearing ? 'Clearing…' : 'Clear offline data'}
            </button>
          </div>
        </ChartWrapper>
      </Reveal>
    </PageWrapper>
  );
}
