'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Category } from '@/lib/types';
import { errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, MotionCard, Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Plus, Pencil, Trash2, Search, FolderTree } from 'lucide-react';

type CategoryWithChildren = Category & { children?: Array<Category & { _count?: { products: number } }> };

export default function CategoriesPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryWithChildren | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', parentId: '' });

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    apiClient.get<CategoryWithChildren[]>(`/shops/${activeShopId}/categories`)
      .then((res) => setCategories(res.data ?? []))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load();   }, [activeShopId]);

  const openCreate = (parentId = '') => {
    setEditing(null);
    setForm({ name: '', description: '', parentId });
    setModalOpen(true);
  };

  const openEdit = (c: CategoryWithChildren) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? '', parentId: c.parentId ?? '' });
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { name: form.name, description: form.description || undefined, parentId: form.parentId || null };
      if (editing) {
        await apiClient.put(`/categories/${editing.id}`, body);
        toast(t('update'), 'success');
      } else {
        await apiClient.post(`/shops/${activeShopId}/categories`, body);
        toast(t('addCategory'), 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (c: CategoryWithChildren) => {
    if (!window.confirm(`${t('archive')} ${c.name}?`)) return;
    try {
      await apiClient.del(`/categories/${c.id}`);
      toast(t('archive'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const rootCategories = categories.filter((c) => !c.parentId);
  const filtered = search
    ? rootCategories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : rootCategories;

  const parentOptions = categories.filter((c) => c.id !== editing?.id);

  return (
    <PageWrapper
      title={t('categories')}
      description={t('categories')}
      breadcrumb={['Owner', t('inventory'), t('categories')]}
      actions={<button onClick={() => openCreate()} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addCategory')}</button>}
    >
      <Reveal className="mb-6"><div className="surface-card p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t('search')}...`} className="input-field pl-9" />
        </div>
      </div></Reveal>

      {shopLoading || loading ? (
        <div className="space-y-4"><SkeletonCard /><SkeletonCard rows={2} /></div>
      ) : filtered.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Stagger className="space-y-4">
          {filtered.map((c) => (
            <StaggerItem key={c.id}>
              <MotionCard className="surface-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FolderTree size={18} className="text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-subtle-foreground">{c._count?.products ?? 0} {t('products')}{c.description ? ` · ${c.description}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openCreate(c.id)} className="text-xs font-medium text-secondary hover:underline">+ {t('subcategory')}</button>
                  <button onClick={() => openEdit(c)} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"><Pencil size={13} /> {t('edit')}</button>
                  <button onClick={() => remove(c)} className="text-xs font-medium text-danger hover:underline inline-flex items-center gap-1"><Trash2 size={13} /> {t('delete')}</button>
                </div>
              </div>

              {(c.children ?? []).length > 0 && (
                <div className="mt-3 ml-6 space-y-2 border-l-2 border-border pl-4">
                  {(c.children ?? []).map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{sub.name}</p>
                        <p className="text-xs text-subtle-foreground">{sub._count?.products ?? 0} {t('products')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(sub)} className="text-xs font-medium text-primary hover:underline"><Pencil size={12} /></button>
                        <button onClick={() => remove(sub)} className="text-xs font-medium text-danger hover:underline"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </MotionCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Modal open={modalOpen} title={editing ? t('edit') : t('addCategory')} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('name')}</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('description')}</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('parentCategory')}</label>
            <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="input-field">
              <option value="">—</option>
              {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>
    </PageWrapper>
  );
}
