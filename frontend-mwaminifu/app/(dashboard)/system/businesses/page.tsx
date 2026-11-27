'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Business, Agent, Shop, PaginationMeta } from '@/lib/types';
import { formatDate, errorMessage } from '@/lib/format';
import Pagination from '@/components/Pagination';
import StatusBadge, { Pill } from '@/components/StatusBadge';
import { SkeletonTable, SkeletonCard, EmptyState } from '@/components/Spinner';
import Modal from '@/components/Modal';
import PageWrapper from '@/components/PageWrapper';
import { Reveal, motion } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { useI18n } from '@/lib/context/I18nContext';
import { statusLabel } from '@/lib/i18n/labels';
import { ChevronDown, ChevronRight, Plus, Store, CreditCard, KeyRound, Trash2 } from 'lucide-react';

const PER_PAGE = 10;

type Tab = 'owners' | 'shops';

const BUSINESS_CATEGORIES = [
  'Retail / General Shop',
  'Grocery',
  'Pharmacy',
  'Hardware',
  'Electronics',
  'Clothing & Fashion',
  'Restaurant / Food',
  'Agro-dealer',
  'Salon / Cosmetics',
  'Other',
];

const REGIONS = [
  'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma',
  'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza',
  'Njombe', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe',
  'Tabora', 'Tanga', 'Zanzibar',
];

interface BusinessShop {
  id: string;
  name: string;
  address?: string | null;
  isArchived: boolean;
  createdAt: string;
  _count?: { products: number; employees: number; customers: number };
}

interface BusinessDetail {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  agent?: { id: string; name: string; username: string } | null;
  shops: BusinessShop[];
}

interface ShopEmployee {
  id: string;
  role: string;
  user: { id: string; name: string; phone?: string | null };
}

interface ShopDetail {
  id: string;
  employees: ShopEmployee[];
  _count: { products: number; employees: number; customers: number };
  stats: {
    subscription?: { id: string; plan: string; status: string; isActive: boolean; startDate: string; endDate?: string | null } | null;
  };
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  shopName: '',
  category: '',
  region: '',
  district: '',
  ward: '',
  street: '',
  agentId: '',
};

export default function BusinessesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('owners');

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: PER_PAGE, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdOwner, setCreatedOwner] = useState<{ name: string; email: string; phone?: string; shopName: string; tempPassword?: string } | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [shopDetails, setShopDetails] = useState<Record<string, ShopDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'shops') setTab(t);
  }, []);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      const res = await apiClient.get<Business[]>(`/admin/businesses?${params.toString()}`);
      if (res.data) setBusinesses(res.data);
      if (res.pagination) setMeta(res.pagination);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    if (tab === 'owners') load(1);
  }, [tab, load]);

  useEffect(() => {
    if (tab !== 'shops') return;
    setShopsLoading(true);
    apiClient.get<Shop[]>('/admin/shops?limit=200')
      .then((res) => setShops(res.data ?? []))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setShopsLoading(false));
  }, [tab]);

  const loadAgents = useCallback(async () => {
    try {
      const res = await apiClient.get<Agent[]>('/admin/agents?limit=200');
      if (res.data) setAgents(res.data.filter((a) => a.isActive));
    } catch {
      // ignore — the dropdown will simply be empty
    }
  }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowAdd(true);
    loadAgents();
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('create') === '1') {
      setShowAdd(true);
    }
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const address = [form.street, form.ward, form.district, form.region].filter(Boolean).join(', ');
      const payload: Record<string, string> = {
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        shopName: form.shopName.trim(),
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (address) payload.shopAddress = address;
      if (form.agentId) payload.agentId = form.agentId;

      const res = await apiClient.post<{ tempPassword?: string }>('/admin/business-owners', payload);
      setShowAdd(false);
      setCreatedOwner({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        shopName: form.shopName.trim(),
        tempPassword: res.data?.tempPassword,
      });
      toast(t('businessAdded'));
      load(1);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (b: Business) => {
    if (expandedId === b.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(b.id);
    setDetail(null);
    setShopDetails({});
    setDetailLoading(true);
    setDetailError('');
    try {
      const res = await apiClient.get<BusinessDetail>(`/admin/businesses/${b.id}`);
      const d = res.data;
      if (!d) return;
      setDetail(d);
      const shopList = d.shops ?? [];
      if (shopList.length) {
        const shopRes = await Promise.all(
          shopList.map((s) => apiClient.get<ShopDetail>(`/admin/shops/${s.id}`))
        );
        const sd: Record<string, ShopDetail> = {};
        shopRes.forEach((r) => {
          if (r.data) sd[r.data.id] = r.data;
        });
        setShopDetails(sd);
      }
    } catch (err) {
      setDetailError(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const resetOwnerAccess = async (b: Business) => {
    if (!window.confirm(`Reset the password for ${b.name}? A temporary password will be emailed to them.`)) return;
    try {
      const res = await apiClient.post<{ tempPassword?: string; message?: string }>(`/admin/business-owners/${b.id}/reset-password`, {});
      toast(res.data?.tempPassword ? `Password reset. Temporary password: ${res.data.tempPassword}` : 'Password reset email sent');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const removeOwner = async (b: Business) => {
    if (!window.confirm(t('removeOwnerConfirm'))) return;
    try {
      await apiClient.del(`/admin/business-owners/${b.id}`);
      toast(t('businessRemoved'));
      load(1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const exportCsv = () => {
    const rows = businesses.map((b) => ({
      name: b.name,
      phone: b.phone || '',
      email: b.email || '',
      agent: b.agentName || '',
      shops: b.shopCount,
      status: b.isActive ? 'Active' : 'Inactive',
      createdAt: b.createdAt,
    }));
    void import('@/lib/csv').then(({ downloadCsv }) => downloadCsv(`businesses_${Date.now()}.csv`, rows));
  };

  return (
    <PageWrapper title={t('businesses')} description={t('businessesDesc')} breadcrumb={[t('systemOwner'), t('businesses')]}>
      <Reveal className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {(['owners', 'shops'] as Tab[]).map((tabKey) => (
            <motion.button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border capitalize ${
                tab === tabKey ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {tabKey === 'owners' ? t('businessOwners') : t('shops')}
            </motion.button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {tab === 'owners' && (
            <button onClick={exportCsv} className="btn-outline">{t('csvExport')}</button>
          )}
          <motion.button
            onClick={openAdd}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="btn-gold inline-flex items-center gap-2"
          >
            <Plus size={16} /> {t('addBusiness')}
          </motion.button>
        </div>
      </Reveal>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {tab === 'owners' && (
        <>
          <Reveal className="flex flex-wrap items-center gap-3 mb-4">
            <input
              className="input-field max-w-xs"
              placeholder={t('searchBusiness')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); load(1); }}
            />
            <select className="input-field max-w-[180px]" value={status} onChange={(e) => { setStatus(e.target.value); load(1); }}>
              <option value="">{t('allStatus')}</option>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </Reveal>

          {loading ? (
            <SkeletonTable rows={PER_PAGE} />
          ) : (
            <Reveal className="surface-card overflow-hidden">
              {businesses.length === 0 ? (
                <EmptyState message={t('noBusinesses')} />
              ) : (
                <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr className="border-b border-border">
                      <th className="w-10 py-4 px-4" />
                      <th className="py-3 px-4 font-semibold">{t('business')}</th>
                      <th className="hidden py-3 px-4 font-semibold sm:table-cell">{t('phone')}</th>
                      <th className="hidden py-3 px-4 font-semibold md:table-cell">{t('agentPortal')}</th>
                      <th className="py-3 px-4 font-semibold">{t('shops')}</th>
                      <th className="py-3 px-4 font-semibold">{t('status')}</th>
                      <th className="hidden py-3 px-4 font-semibold lg:table-cell">{t('createdLabel')}</th>
                      <th className="py-3 px-4 font-semibold text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {businesses.map((b) => {
                      const isOpen = expandedId === b.id;
                      return (
                        <Fragment key={b.id}>
                          <tr
                            className={`cursor-pointer transition-colors ${isOpen ? 'bg-muted' : 'hover:bg-muted'}`}
                            onClick={() => openDetail(b)}
                          >
                            <td className="py-3 px-4 text-muted-foreground">
                              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </td>
                            <td className="py-3 px-4 font-medium text-foreground">{b.name}</td>
                            <td className="hidden py-3 px-4 text-muted-foreground sm:table-cell">{b.phone || '-'}</td>
                            <td className="hidden py-3 px-4 text-muted-foreground md:table-cell">{b.agentName || '-'}</td>
                            <td className="py-3 px-4">{b.shopCount}</td>
                            <td className="py-3 px-4"><StatusBadge active={b.isActive} activeLabel={t('active')} inactiveLabel={t('inactive')} /></td>
                            <td className="hidden py-3 px-4 text-muted-foreground text-xs lg:table-cell">{formatDate(b.createdAt)}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => resetOwnerAccess(b)} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline" title={t('resetAccess')}>
                                  <KeyRound size={14} /> {t('reset')}
                                </button>
                                <button onClick={() => removeOwner(b)} className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline" title={t('removeOwner')}>
                                  <Trash2 size={14} /> {t('remove')}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-border">
                              <td colSpan={8} className="bg-muted px-6 py-5">
                                {detailLoading ? (
                                  <SkeletonCard rows={4} />
                                ) : detailError ? (
                                  <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm">{detailError}</div>
                                ) : detail ? (
                                  <div className="space-y-6">
                                    <div className="surface-card p-5">
                                      <h3 className="font-semibold text-primary mb-4">{t('basicInformation')}</h3>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                        <div><p className="text-xs text-subtle-foreground">{t('owner')}</p><p className="font-medium text-foreground">{detail.name}</p></div>
                                        <div><p className="text-xs text-subtle-foreground">{t('phone')}</p><p className="font-medium text-foreground">{detail.phone || '-'}</p></div>
                                        <div><p className="text-xs text-subtle-foreground">{t('email')}</p><p className="font-medium text-foreground">{detail.email || '-'}</p></div>
                                        <div><p className="text-xs text-subtle-foreground">{t('agentPortal')}</p><p className="font-medium text-foreground">{detail.agent ? `${detail.agent.name} (@${detail.agent.username})` : '-'}</p></div>
                                        <div><p className="text-xs text-subtle-foreground">{t('status')}</p><StatusBadge active={detail.isActive} activeLabel={t('active')} inactiveLabel={t('inactive')} /></div>
                                        <div><p className="text-xs text-subtle-foreground">{t('createdLabel')}</p><p className="font-medium text-foreground">{formatDate(detail.createdAt)}</p></div>
                                      </div>
                                    </div>

                                    <div className="surface-card p-5">
                                      <h3 className="font-semibold text-primary mb-4 flex items-center gap-2"><Store size={16} /> {t('shops')} ({detail.shops.length})</h3>
                                      {detail.shops.length === 0 ? (
                                        <EmptyState message={t('noShopsUnderOwner')} />
                                      ) : (
                                        <div className="space-y-4">
                                          {detail.shops.map((shop) => {
                                            const sd = shopDetails[shop.id];
                                            return (
                                              <div key={shop.id} className="border border-border rounded-lg p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                                  <div>
                                                    <p className="font-semibold text-foreground">{shop.name}</p>
                                                    <p className="text-xs text-subtle-foreground">{shop.address || t('noLocation')}</p>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Pill tone={shop.isArchived ? 'gray' : 'green'}>{shop.isArchived ? t('archived') : t('active')}</Pill>
                                                    {sd?.stats.subscription && (
                                                      <Pill tone={sd.stats.subscription.isActive ? 'navy' : 'amber'}>
                                                        {sd.stats.subscription.plan}
                                                      </Pill>
                                                    )}
                                                  </div>
                                                </div>

                                                {sd?.stats.subscription && (
                                                  <p className="text-xs text-muted-foreground">
                                                    <CreditCard size={13} className="inline mr-1.5" />
                                                    {t('subscription')}: <strong>{sd.stats.subscription.plan}</strong> — {statusLabel(t, sd.stats.subscription.status)}
                                                    {sd.stats.subscription.endDate ? ` (ends ${formatDate(sd.stats.subscription.endDate)})` : ''}
                                                  </p>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
              {businesses.length > 0 && (
                <div className="divide-y divide-border md:hidden">
                  {businesses.map((b) => (
                    <div key={`mobile-${b.id}`} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{b.name}</p>
                          <p className="text-xs text-muted-foreground">{b.phone || t('noPhone')}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{t('agentPortal')}: {b.agentName || '-'} · {b.shopCount} {t('agentShopCount')}</p>
                        </div>
                        <StatusBadge active={b.isActive} activeLabel={t('active')} inactiveLabel={t('inactive')} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium">
                        <button onClick={() => resetOwnerAccess(b)} className="inline-flex items-center gap-1 text-secondary hover:underline">
                          <KeyRound size={14} /> {t('resetPassword')}
                        </button>
                        <button onClick={() => removeOwner(b)} className="inline-flex items-center gap-1 text-danger hover:underline">
                          <Trash2 size={14} /> {t('removeOwner')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-6 py-3 border-t border-border">
                <Pagination page={meta.page} total={meta.total} limit={PER_PAGE} onPageChange={load} />
              </div>
            </Reveal>
          )}
        </>
      )}

      {tab === 'shops' && (shopsLoading ? (
        <SkeletonTable rows={8} />
      ) : shops.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noShopsFound')} /></div></Reveal>
      ) : (
        <Reveal className="surface-card overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr className="border-b border-border">
                <th className="py-3 px-6 font-semibold">{t('shop')}</th>
                <th className="py-3 px-6 font-semibold">{t('owner')}</th>
                <th className="py-3 px-6 font-semibold">{t('location')}</th>
                <th className="py-3 px-6 font-semibold">{t('status')}</th>
                <th className="py-3 px-6 font-semibold">{t('createdLabel')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shops.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-muted">
                  <td className="py-3 px-6 font-medium text-foreground">{s.name}</td>
                  <td className="py-3 px-6 text-muted-foreground">{s.owner?.name ?? '-'}</td>
                  <td className="py-3 px-6 text-muted-foreground">{s.address || '-'}</td>
                  <td className="py-3 px-6"><StatusBadge active={!s.isArchived} activeLabel={t('active')} inactiveLabel={t('archived')} /></td>
                  <td className="py-3 px-6 text-muted-foreground text-xs">{formatDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="divide-y divide-border md:hidden">
            {shops.map((s) => (
              <div key={`mobile-${s.id}`} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.owner?.name ?? t('noOwner')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.address || t('noLocation')}</p>
                  </div>
                  <StatusBadge active={!s.isArchived} activeLabel={t('active')} inactiveLabel={t('archived')} />
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      ))}

      <Modal open={showAdd} title={t('addBusiness')} onClose={() => setShowAdd(false)} wide>
        {formError && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-primary mb-2">{t('ownerDetails')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input className="input-field" placeholder={t('fullName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="input-field" type="email" placeholder={t('ownerEmailRequired')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input className="input-field" placeholder={t('phoneOptional')} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-primary mb-2">{t('shopLocation')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input className="input-field" placeholder={t('shopName')} value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
              <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">{t('businessCategory')}</option>
                {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="input-field" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                <option value="">{t('region')}</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input className="input-field" placeholder={t('district')} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              <input className="input-field" placeholder={t('ward')} value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
              <input className="input-field" placeholder={t('street')} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-primary mb-2">{t('assignment')}</p>
            <select className="input-field" value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}>
              <option value="">{t('noAgentUnassigned')}</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name} (@{a.username})</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 btn-outline">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 btn-gold">{saving ? t('creating') : t('createBusiness')}</button>
          </div>
        </form>
      </Modal>

      {/* Owner activation instructions */}
      <Modal open={!!createdOwner} title={t('businessOwnerCreated')} onClose={() => setCreatedOwner(null)}>
        {createdOwner && (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">{createdOwner.name}</strong> ({createdOwner.shopName}) {t('hasBeenCreatedWelcome')} <strong className="text-foreground">{createdOwner.email}</strong>.
            </p>
            <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-subtle-foreground">{t('loginEmail')}</span>
                <span className="font-mono font-semibold text-foreground">{createdOwner.email}</span>
              </div>
              {createdOwner.tempPassword && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-subtle-foreground">{t('tempPassword')}</span>
                  <span className="font-mono font-semibold text-secondary">{createdOwner.tempPassword}</span>
                </div>
              )}
            </div>
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-subtle-foreground">
              {t('ownerSignsInDesc')}
            </p>
            <button
              onClick={() => {
                const text = `Mwaminifu owner login\nEmail: ${createdOwner.email}${createdOwner.tempPassword ? `\nPassword: ${createdOwner.tempPassword}` : ''}`;
                if (navigator.clipboard) navigator.clipboard.writeText(text);
              }}
              className="btn-outline w-full"
            >
              {t('copyCredentials')}
            </button>
            <button onClick={() => setCreatedOwner(null)} className="btn-navy w-full">{t('done')}</button>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
