'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Supplier } from '@/lib/types';
import { errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, MotionCard, Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Plus, Search, Trash2, Pencil, Phone, Download } from 'lucide-react';

export default function SuppliersPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    apiClient.get<Supplier[]>(`/shops/${activeShopId}/suppliers?limit=200${q}`)
      .then((res) => setSuppliers(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', phone: '', email: '', address: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', notes: s.notes ?? '' });
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { name: form.name, phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined, notes: form.notes || undefined };
      if (editing) {
        await apiClient.put(`/suppliers/${editing.id}`, body);
        toast(t('update'), 'success');
      } else {
        await apiClient.post(`/shops/${activeShopId}/suppliers`, body);
        toast(t('addSupplier'), 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (s: Supplier) => {
    if (!window.confirm(`${t('archive')} ${s.name}?`)) return;
    try {
      await apiClient.del(`/suppliers/${s.id}`);
      toast(t('archive'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <PageWrapper
      title={t('suppliers')}
      description={t('suppliers')}
      breadcrumb={['Owner', t('inventory'), t('suppliers')]}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => apiClient.download(`/shops/${activeShopId}/reports/suppliers/export?format=csv`, 'suppliers.csv')} className="btn-outline inline-flex items-center gap-2 text-sm"><Download size={16} /> {t('csvExport')}</button>
          <button onClick={openCreate} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addSupplier')}</button>
        </div>
      }
    >
      <Reveal className="mb-6"><div className="surface-card p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t('search')}...`} className="input-field pl-9" />
        </div>
      </div></Reveal>

      {shopLoading || loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : suppliers.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <StaggerItem key={s.id}>
              <MotionCard className="surface-card p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{s.name}</p>
                  {s.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone size={12} /> {s.phone}</p>}
                  {s.email && <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.email}</p>}
                  {s.address && <p className="text-xs text-subtle-foreground mt-0.5 truncate">{s.address}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <span className="bg-muted px-2 py-1 rounded">{s._count?.products ?? 0} {t('products')}</span>
                <span className="bg-muted px-2 py-1 rounded">{s._count?.purchases ?? 0} {t('purchases')}</span>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={() => openEdit(s)} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"><Pencil size={13} /> {t('edit')}</button>
                <button onClick={() => remove(s)} className="text-xs font-medium text-danger hover:underline inline-flex items-center gap-1"><Trash2 size={13} /> {t('delete')}</button>
              </div>
              </MotionCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Modal open={modalOpen} title={editing ? t('edit') : t('addSupplier')} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('name')}</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('phone')}</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('email')}</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('address')}</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('notes')}</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>
    </PageWrapper>
  );
}
