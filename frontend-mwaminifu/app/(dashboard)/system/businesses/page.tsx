'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Business, Agent, Shop, Employee, PaginationMeta } from '@/lib/types';
import { formatDate, formatNumber, errorMessage } from '@/lib/format';
import Pagination from '@/components/Pagination';
import StatusBadge, { Pill } from '@/components/StatusBadge';
import { SkeletonTable, SkeletonCard, EmptyState } from '@/components/Spinner';
import Modal from '@/components/Modal';
import PageWrapper from '@/components/PageWrapper';
import { Reveal, motion } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { ChevronDown, ChevronRight, Plus, Store, Users, CreditCard } from 'lucide-react';

const PER_PAGE = 10;

type Tab = 'owners' | 'shops' | 'employees';

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
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('owners');

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: PER_PAGE, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [shops, setShops] = useState<Shop[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [shopDetails, setShopDetails] = useState<Record<string, ShopDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'shops' || t === 'employees') setTab(t);
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

  useEffect(() => {
    if (tab !== 'employees') return;
    setEmployeesLoading(true);
    apiClient.get<Employee[]>('/admin/employees?limit=200')
      .then((res) => setEmployees(res.data ?? []))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setEmployeesLoading(false));
  }, [tab]);

  const loadAgents = useCallback(async () => {
    try {
      const res = await apiClient.get<Agent[]>('/admin/agents?limit=1000');
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const address = [form.street, form.ward, form.district, form.region].filter(Boolean).join(', ');
      const payload: Record<string, string> = {
        phone: form.phone.trim(),
        name: form.name.trim(),
        shopName: form.shopName.trim(),
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (address) payload.shopAddress = address;
      if (form.agentId) payload.agentId = form.agentId;

      await apiClient.post('/admin/business-owners', payload);
      setShowAdd(false);
      toast('Business added successfully');
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
    <PageWrapper title="Businesses" description="Business owners, shops and employees" breadcrumb={['System', 'Businesses']}>
      <Reveal className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {(['owners', 'shops', 'employees'] as Tab[]).map((t) => (
            <motion.button
              key={t}
              onClick={() => setTab(t)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border capitalize ${
                tab === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {t === 'owners' ? 'Business Owners' : t}
            </motion.button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {tab === 'owners' && (
            <button onClick={exportCsv} className="btn-outline">Export CSV</button>
          )}
          <motion.button
            onClick={openAdd}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="btn-gold inline-flex items-center gap-2"
          >
            <Plus size={16} /> Add Business
          </motion.button>
        </div>
      </Reveal>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {tab === 'owners' && (
        <>
          <Reveal className="flex flex-wrap items-center gap-3 mb-4">
            <input
              className="input-field max-w-xs"
              placeholder="Search business, phone, agent..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); load(1); }}
            />
            <select className="input-field max-w-[180px]" value={status} onChange={(e) => { setStatus(e.target.value); load(1); }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Reveal>

          {loading ? (
            <SkeletonTable rows={PER_PAGE} />
          ) : (
            <Reveal className="surface-card overflow-hidden">
              {businesses.length === 0 ? (
                <EmptyState message="No businesses found" />
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr className="border-b border-border">
                      <th className="w-10 py-4 px-4" />
                      <th className="py-3 px-4 font-semibold">Business</th>
                      <th className="py-3 px-4 font-semibold">Phone</th>
                      <th className="py-3 px-4 font-semibold">Agent</th>
                      <th className="py-3 px-4 font-semibold">Shops</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Created</th>
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
                            <td className="py-3 px-4 text-muted-foreground">{b.phone || '-'}</td>
                            <td className="py-3 px-4 text-muted-foreground">{b.agentName || '-'}</td>
                            <td className="py-3 px-4">{b.shopCount}</td>
                            <td className="py-3 px-4"><StatusBadge active={b.isActive} /></td>
                            <td className="py-3 px-4 text-muted-foreground text-xs">{formatDate(b.createdAt)}</td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-border">
                              <td colSpan={7} className="bg-muted px-6 py-5">
                                {detailLoading ? (
                                  <SkeletonCard rows={4} />
                                ) : detailError ? (
                                  <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm">{detailError}</div>
                                ) : detail ? (
                                  <div className="space-y-6">
                                    <div className="surface-card p-5">
                                      <h3 className="font-semibold text-primary mb-4">Basic Information</h3>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                        <div><p className="text-xs text-subtle-foreground">Owner</p><p className="font-medium text-foreground">{detail.name}</p></div>
                                        <div><p className="text-xs text-subtle-foreground">Phone</p><p className="font-medium text-foreground">{detail.phone || '-'}</p></div>
                                        <div><p className="text-xs text-subtle-foreground">Email</p><p className="font-medium text-foreground">{detail.email || '-'}</p></div>
                                        <div><p className="text-xs text-subtle-foreground">Agent</p><p className="font-medium text-foreground">{detail.agent ? `${detail.agent.name} (@${detail.agent.username})` : '-'}</p></div>
                                        <div><p className="text-xs text-subtle-foreground">Status</p><StatusBadge active={detail.isActive} /></div>
                                        <div><p className="text-xs text-subtle-foreground">Created</p><p className="font-medium text-foreground">{formatDate(detail.createdAt)}</p></div>
                                      </div>
                                    </div>

                                    <div className="surface-card p-5">
                                      <h3 className="font-semibold text-primary mb-4 flex items-center gap-2"><Store size={16} /> Shops ({detail.shops.length})</h3>
                                      {detail.shops.length === 0 ? (
                                        <EmptyState message="No shops under this owner" />
                                      ) : (
                                        <div className="space-y-4">
                                          {detail.shops.map((shop) => {
                                            const sd = shopDetails[shop.id];
                                            return (
                                              <div key={shop.id} className="border border-border rounded-lg p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                                  <div>
                                                    <p className="font-semibold text-foreground">{shop.name}</p>
                                                    <p className="text-xs text-subtle-foreground">{shop.address || 'No location'}</p>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Pill tone={shop.isArchived ? 'gray' : 'green'}>{shop.isArchived ? 'Archived' : 'Active'}</Pill>
                                                    {sd?.stats.subscription && (
                                                      <Pill tone={sd.stats.subscription.isActive ? 'navy' : 'amber'}>
                                                        {sd.stats.subscription.plan}
                                                      </Pill>
                                                    )}
                                                  </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-4">
                                                  <div className="bg-muted rounded-lg p-3"><p className="text-xs text-subtle-foreground">Products</p><p className="font-semibold">{formatNumber(shop._count?.products ?? 0)}</p></div>
                                                  <div className="bg-muted rounded-lg p-3"><p className="text-xs text-subtle-foreground">Employees</p><p className="font-semibold">{formatNumber(sd?.employees.length ?? shop._count?.employees ?? 0)}</p></div>
                                                  <div className="bg-muted rounded-lg p-3"><p className="text-xs text-subtle-foreground">Customers</p><p className="font-semibold">{formatNumber(shop._count?.customers ?? 0)}</p></div>
                                                </div>

                                                {sd && (
                                                  <>
                                                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><Users size={13} /> Employees</p>
                                                    {sd.employees.length === 0 ? (
                                                      <p className="text-xs text-subtle-foreground mb-4">No employees</p>
                                                    ) : (
                                                      <div className="flex flex-wrap gap-2 mb-4">
                                                        {sd.employees.map((emp) => (
                                                          <span key={emp.id} className="inline-flex items-center gap-1.5 text-xs bg-muted-2 text-foreground rounded-full px-3 py-1">
                                                            {emp.user.name} <span className="text-subtle-foreground">· {emp.role}</span>
                                                          </span>
                                                        ))}
                                                      </div>
                                                    )}

                                                    {sd.stats.subscription && (
                                                      <p className="text-xs text-muted-foreground">
                                                        <CreditCard size={13} className="inline mr-1.5" />
                                                        Subscription: <strong>{sd.stats.subscription.plan}</strong> — {sd.stats.subscription.status}
                                                        {sd.stats.subscription.endDate ? ` (ends ${formatDate(sd.stats.subscription.endDate)})` : ''}
                                                      </p>
                                                    )}
                                                  </>
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
        <Reveal><div className="surface-card"><EmptyState message="No shops found" /></div></Reveal>
      ) : (
        <Reveal className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr className="border-b border-border">
                <th className="py-3 px-6 font-semibold">Shop</th>
                <th className="py-3 px-6 font-semibold">Owner</th>
                <th className="py-3 px-6 font-semibold">Location</th>
                <th className="py-3 px-6 font-semibold">Products</th>
                <th className="py-3 px-6 font-semibold">Employees</th>
                <th className="py-3 px-6 font-semibold">Status</th>
                <th className="py-3 px-6 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shops.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-muted">
                  <td className="py-3 px-6 font-medium text-foreground">{s.name}</td>
                  <td className="py-3 px-6 text-muted-foreground">{s.owner?.name ?? '-'}</td>
                  <td className="py-3 px-6 text-muted-foreground">{s.address || '-'}</td>
                  <td className="py-3 px-6">{formatNumber(s._count?.products ?? 0)}</td>
                  <td className="py-3 px-6">{formatNumber(s._count?.employees ?? 0)}</td>
                  <td className="py-3 px-6"><StatusBadge active={!s.isArchived} activeLabel="Active" inactiveLabel="Archived" /></td>
                  <td className="py-3 px-6 text-muted-foreground text-xs">{formatDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Reveal>
      ))}

      {tab === 'employees' && (employeesLoading ? (
        <SkeletonTable rows={8} />
      ) : employees.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message="No employees found" /></div></Reveal>
      ) : (
        <Reveal className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr className="border-b border-border">
                <th className="py-3 px-6 font-semibold">Employee</th>
                <th className="py-3 px-6 font-semibold">Role</th>
                <th className="py-3 px-6 font-semibold">Shop</th>
                <th className="py-3 px-6 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-muted">
                  <td className="py-3 px-6 font-medium text-foreground">{e.user?.name ?? '-'}</td>
                  <td className="py-3 px-6 text-muted-foreground">{e.role}</td>
                  <td className="py-3 px-6 text-muted-foreground">{e.shop?.name ?? '-'}</td>
                  <td className="py-3 px-6"><StatusBadge active={e.isActive} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Reveal>
      ))}

      <Modal open={showAdd} title="Add Business" onClose={() => setShowAdd(false)} wide>
        {formError && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-primary mb-2">Owner Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input className="input-field" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="input-field" placeholder="Phone (255XXXXXXXXX)" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <input className="input-field sm:col-span-2" type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-primary mb-2">Shop & Location</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input className="input-field" placeholder="Shop Name" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
              <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Business category</option>
                {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="input-field" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                <option value="">Region</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input className="input-field" placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              <input className="input-field" placeholder="Ward" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
              <input className="input-field" placeholder="Street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-primary mb-2">Assignment</p>
            <select className="input-field" value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}>
              <option value="">No agent (unassigned)</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name} (@{a.username})</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-gold">{saving ? 'Creating...' : 'Create Business'}</button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
