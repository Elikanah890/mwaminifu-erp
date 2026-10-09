'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { apiClient, ApiErrorException } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Product, Category } from '@/lib/types';
import { formatCurrency, errorMessage, formatStockWithUnits } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useToast } from '@/components/Toast';
import { PackageMinus, Plus, Search, Pencil, Trash2, Upload, X, Download, Percent, ScanBarcode, Wand2 } from 'lucide-react';

const UNITS = ['piece', 'pack', 'bottle', 'box', 'carton', 'kg', 'gram', 'litre', 'millilitre', 'metre', 'dozen', 'tray', 'loaf', 'tube', 'ream'];

// Bilingual labels (Swahili / English) so shop owners who don't read English
// can still understand every field. Kept local to this owner-only form.
const L = {
  name: 'Jina la Bidhaa / Product Name',
  category: 'Kategoria / Category',
  smallestUnit: 'Kipimo Kidogo / Smallest Unit',
  smallestUnitHelp: 'Kipimo unachohesabu bidhaa (mfano: piece, kg)',
  costPrice: 'Bei ya Kununua / Cost Price',
  costPriceHelp: 'Bei unayonunua kwa kipimo kidogo',
  sellingPrice: 'Bei ya Kuuza / Selling Price',
  stock: 'Idadi Iliyopo / Stock on hand',
  reorder: 'Kikomo cha Kuagiza / Reorder Level',
  reorderHelp: 'Tahadhari utakapofikia idadi hii',
  image: 'Picha / Image',
  otherUnits: 'Vipimo Vingine / Other Units',
  otherUnitsQ: 'Unauza kwa kipimo kingine? (Carton, Box)',
  unitName: 'Jina la Kipimo / Unit Name',
  contains: 'Kina vitengo / Contains units',
  containsHelp: 'Carton moja ina piece ngapi?',
  defaultLabel: 'Chaguo-msingi / Default',
  addUnit: 'Ongeza Kipimo / Add Unit',
  advanced: 'Chaguo Zaidi / Advanced',
  tax: 'Kodi / Tax',
  brand: 'Chapa / Brand',
  supplier: 'Msambazaji / Supplier',
  barcode: 'Msimbo wa Baa / Barcode',
  price: 'Bei / Price',
  pricingMode: 'Aina ya Bei / Pricing Mode',
  fixed: 'Isiyobadilika / Fixed',
  fluctuating: 'Inayobadilika / Fluctuating',
  minPrice: 'Chini / Min',
  maxPrice: 'Juu / Max',
  description: 'Maelezo / Description',
  scanCamera: 'Changanua kwa Kamera / Scan with camera',
  needOneUnit: 'Ongeza kipimo kimoja angalau (mfano: Carton)',
  duplicateUnit: 'Kipimo hiki kimejirudia — vitengo vya jina moja haviruhusiwi',
  unitSameAsBase: 'Jina la kipimo hiki ni sawa na kipimo kidogo',
  baseUnitsTooSmall: 'Idadi ya vitengo lazima iwe zaidi ya 1',
};

type UnitConfigForm = {
  unitName: string;
  baseUnits: string;
  sellingPrice: string;
  pricingMode: 'FIXED' | 'FLUCTUATING';
  minPrice: string;
  maxPrice: string;
  isDefault: boolean;
};

const emptyConfig = (): UnitConfigForm => ({
  unitName: '', baseUnits: '', sellingPrice: '', pricingMode: 'FIXED', minPrice: '', maxPrice: '', isDefault: false,
});

export default function OwnerInventoryPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', categoryId: '', brand: '', supplier: '',
    costPrice: '', sellingPrice: '', taxRate: '', baseStock: '', baseUnitName: 'piece', reorderLevel: '10', description: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [configs, setConfigs] = useState<UnitConfigForm[]>([]);
  const [hasOtherUnits, setHasOtherUnits] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [adjustForm, setAdjustForm] = useState({ quantityChange: '', reason: '', unitConfigId: '' });

  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [bulkForm, setBulkForm] = useState({ scope: 'all', categoryId: '', type: 'percentage', value: '', field: 'sellingPrice' });
  const [scanOpen, setScanOpen] = useState(false);

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    Promise.all([
      apiClient.get<Product[]>(`/shops/${activeShopId}/products?limit=200${q}`),
      apiClient.get<Category[]>(`/shops/${activeShopId}/categories`),
    ])
      .then(([p, c]) => { setProducts(p.data ?? []); setCategories(c.data ?? []); })
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
    setForm({ name: '', sku: '', barcode: '', categoryId: '', brand: '', supplier: '', costPrice: '', sellingPrice: '', taxRate: '', baseStock: '', baseUnitName: 'piece', reorderLevel: '10', description: '' });
    setImages([]);
    setConfigs([]);
    setHasOtherUnits(false);
    setShowAdvanced(false);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku ?? '', barcode: p.barcode ?? '', categoryId: p.categoryId ?? '', brand: p.brand ?? '', supplier: p.supplier ?? '',
      costPrice: String(p.costPrice), sellingPrice: String(p.sellingPrice), taxRate: String((p as unknown as { taxRate?: number }).taxRate ?? 0),
      baseStock: String(p.baseUnitStock ?? p.stockQuantity), baseUnitName: p.baseUnitName ?? p.unit ?? 'piece',
      reorderLevel: String(p.reorderLevel), description: (p as unknown as { description?: string }).description ?? '',
    });
    setImages((p as unknown as { images?: string[] }).images ?? []);
    const otherUnits = (p.unitConfigs ?? [])
      .filter((c) => c.baseUnits > 1)
      .map((c) => ({
        unitName: c.unitName,
        baseUnits: String(c.baseUnits),
        sellingPrice: String(c.sellingPrice),
        pricingMode: (c.pricingMode as 'FIXED' | 'FLUCTUATING') ?? 'FIXED',
        minPrice: c.minPrice != null ? String(c.minPrice) : '',
        maxPrice: c.maxPrice != null ? String(c.maxPrice) : '',
        isDefault: c.isDefault,
      }));
    setConfigs(otherUnits);
    setHasOtherUnits(otherUnits.length > 0);
    setShowAdvanced(Boolean(p.sku || p.brand || p.supplier || (p as unknown as { taxRate?: number }).taxRate));
    setModalOpen(true);
  };

  const addConfig = () =>
    setConfigs((prev) => [...prev, { ...emptyConfig(), isDefault: prev.length === 0 }]);
  const updateConfig = (i: number, patch: Partial<UnitConfigForm>) =>
    setConfigs((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeConfig = (i: number) =>
    setConfigs((prev) => prev.filter((_, idx) => idx !== i));
  // Only one unit can be the default per product.
  const setDefaultConfig = (i: number) =>
    setConfigs((prev) => prev.map((c, idx) => ({ ...c, isDefault: idx === i })));
  const toggleOtherUnits = (on: boolean) => {
    setHasOtherUnits(on);
    if (on && configs.length === 0) setConfigs([{ ...emptyConfig(), isDefault: true }]);
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    e.target.value = '';
    for (const file of Array.from(files).slice(0, 5)) {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const res = await apiClient.post<{ url: string }>(`/shops/${activeShopId}/upload-image`, { dataUrl });
          setImages((prev) => [...prev, res.data?.url ?? dataUrl]);
        } catch {
          setImages((prev) => [...prev, dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const baseName = form.baseUnitName.trim() || 'piece';

    // Additional ("other") units are optional. When enabled they must be
    // complete, unique, larger than the smallest unit, and have one default.
    let validConfigs: UnitConfigForm[] = [];
    if (hasOtherUnits) {
      const incomplete = configs.some((c) => c.unitName.trim() && Number(c.baseUnits) < 2);
      if (incomplete) { toast(L.baseUnitsTooSmall, 'error'); return; }
      validConfigs = configs.filter((c) => c.unitName.trim() && Number(c.baseUnits) >= 2);
      if (validConfigs.length === 0) { toast(L.needOneUnit, 'error'); return; }
      const names = validConfigs.map((c) => c.unitName.trim().toLowerCase());
      if (new Set(names).size !== names.length) { toast(L.duplicateUnit, 'error'); return; }
      if (names.includes(baseName.toLowerCase())) { toast(L.unitSameAsBase, 'error'); return; }
      // Guarantee exactly one default unit.
      const hasDefault = validConfigs.some((c) => c.isDefault);
      let seen = false;
      validConfigs = validConfigs.map((c, i) => {
        if (!hasDefault) return { ...c, isDefault: i === 0 };
        if (c.isDefault && !seen) { seen = true; return c; }
        return { ...c, isDefault: false };
      });
    }
    setSubmitting(true);
    // Spec 8.4.1 — selling price must be > cost. The Owner may explicitly
    // override after a confirmation step.
    const buildBody = (priceOverride: boolean) => ({
      name: form.name,
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      categoryId: form.categoryId || undefined,
      brand: form.brand || undefined,
      supplier: form.supplier || undefined,
      costPrice: Number(form.costPrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      taxRate: Number(form.taxRate) || 0,
      baseUnitName: form.baseUnitName || 'piece',
      baseUnitStock: Number(form.baseStock) || 0,
      reorderLevel: Number(form.reorderLevel) || 10,
      description: form.description || undefined,
      images,
      unitConfigs: validConfigs.map((c) => ({
        unitName: c.unitName.trim(),
        baseUnits: Number(c.baseUnits),
        // If no price is entered, derive it from the smallest-unit price.
        sellingPrice: c.sellingPrice !== '' ? Number(c.sellingPrice) : Number(c.baseUnits) * (Number(form.sellingPrice) || 0),
        pricingMode: c.pricingMode,
        ...(c.pricingMode === 'FLUCTUATING'
          ? { minPrice: Number(c.minPrice) || 0, maxPrice: Number(c.maxPrice) || 0 }
          : {}),
        isDefault: c.isDefault,
        ...(priceOverride ? { priceOverride: true } : {}),
      })),
      ...(priceOverride ? { priceOverride: true } : {}),
    });
    const save = async (priceOverride: boolean) => {
      if (editing) await apiClient.put(`/products/${editing.id}`, buildBody(priceOverride));
      else await apiClient.post(`/shops/${activeShopId}/products`, buildBody(priceOverride));
    };
    try {
      try {
        await save(false);
      } catch (err) {
        if (err instanceof ApiErrorException && err.code === 'PRICE_BELOW_COST') {
          const proceed = window.confirm(`${err.message}\n\nSave anyway? This is an owner override.`);
          if (!proceed) return;
          await save(true);
        } else {
          throw err;
        }
      }
      toast(editing ? t('update') : t('addProduct'), 'success');
      setModalOpen(false);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`${t('archive')} ${p.name}?`)) return;
    try {
      await apiClient.del(`/products/${p.id}`);
      toast(t('archive'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const submitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/products/${adjustTarget.id}/adjust-stock`, {
        quantityChange: Number(adjustForm.quantityChange),
        reason: adjustForm.reason,
        unitConfigId: adjustForm.unitConfigId || undefined,
      });
      toast(t('adjust'), 'success');
      setAdjustTarget(null);
      setAdjustForm({ quantityChange: '', reason: '', unitConfigId: '' });
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { toast(t('noData'), 'error'); return; }
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line) => {
      const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => { obj[h] = cells[i]; });
      return obj;
    });
    setSubmitting(true);
    try {
      const res = await apiClient.post<{ created: number; updated: number }>(`/shops/${activeShopId}/products/import`, { rows });
      toast(`${t('import')}: ${res.data?.created ?? 0} / ${res.data?.updated ?? 0}`, 'success');
      setImportOpen(false);
      setCsvText('');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post(`/shops/${activeShopId}/products/bulk-price`, {
        scope: bulkForm.scope,
        categoryId: bulkForm.scope === 'category' ? bulkForm.categoryId : undefined,
        type: bulkForm.type,
        value: Number(bulkForm.value),
        field: bulkForm.field,
      });
      toast(t('update'), 'success');
      setBulkOpen(false);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScan = (barcode: string) => {
    setScanOpen(false);
    if (barcode) setForm((prev) => ({ ...prev, barcode }));
  };

  const generateBarcode = async () => {
    try {
      const res = await apiClient.get<{ barcode: string }>(`/shops/${activeShopId}/products/generate-barcode`);
      const barcode = res.data?.barcode;
      if (barcode) setForm((prev) => ({ ...prev, barcode }));
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <PageWrapper
      title={t('products')}
      description={t('products')}
      breadcrumb={['Owner', t('inventory'), t('products')]}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => apiClient.download(`/shops/${activeShopId}/reports/products/export?format=csv`, 'products.csv')} className="btn-outline inline-flex items-center gap-2 text-sm"><Download size={16} /> {t('csvExport')}</button>
          <button onClick={() => setImportOpen(true)} className="btn-outline inline-flex items-center gap-2 text-sm"><Upload size={16} /> {t('import')}</button>
          <button onClick={() => setBulkOpen(true)} className="btn-outline inline-flex items-center gap-2 text-sm"><Percent size={16} /> {t('bulk')}</button>
          <button onClick={openCreate} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addProduct')}</button>
        </div>
      }
    >
      <Reveal className="mb-6"><div className="surface-card p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t('search')} / ${t('barcode')}...`} className="input-field pl-9" />
        </div>
      </div></Reveal>

      {shopLoading || loading ? (
        <SkeletonTable rows={8} />
      ) : products.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('products')}</th>
                <th className="px-4 py-3">{t('category')}</th>
                <th className="px-4 py-3 text-right">{t('costPrice')}</th>
                <th className="px-4 py-3 text-right">{t('sellingPrice')}</th>
                <th className="px-4 py-3 text-right">{t('stock')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => {
                const imgs = (p as unknown as { images?: string[] }).images ?? [];
                return (
                  <tr key={p.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {imgs[0] ? <Image src={imgs[0]} alt="" width={32} height={32} className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-muted-2" />}
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-subtle-foreground">{p.sku ?? '-'}{p.barcode ? ` · ${p.barcode}` : ''} · {p.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.costPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(p.sellingPrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold">{p.stockQuantity}</span>
                      <span className="block text-xs text-subtle-foreground">{formatStockWithUnits(p)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={p.stockQuantity > p.reorderLevel} activeLabel={t('inStock')} inactiveLabel={t('lowStock')} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => { setAdjustTarget(p); setAdjustForm({ quantityChange: '', reason: '', unitConfigId: '' }); }} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><PackageMinus size={14} /></button>
                        <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Pencil size={14} /></button>
                        <button onClick={() => remove(p)} className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div></Reveal>
      )}

      <Modal open={modalOpen} title={editing ? t('edit') : t('addProduct')} onClose={() => setModalOpen(false)} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{L.name}</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{L.category}</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input-field">
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{L.smallestUnit}</label>
                <input list="unit-names" value={form.baseUnitName} onChange={(e) => setForm({ ...form, baseUnitName: e.target.value })} className="input-field" placeholder="piece / kg" />
                <p className="mt-1 text-[11px] text-subtle-foreground">{L.smallestUnitHelp}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{L.costPrice}</label>
                <input required type="number" min={0} value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="input-field" />
                <p className="mt-1 text-[11px] text-subtle-foreground">{L.costPriceHelp}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{L.sellingPrice}</label>
                <input required type="number" min={0} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{L.stock}</label>
                <input type="number" min={0} value={form.baseStock} onChange={(e) => setForm({ ...form, baseStock: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{L.reorder}</label>
                <input type="number" min={0} value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="input-field" />
                <p className="mt-1 text-[11px] text-subtle-foreground">{L.reorderHelp}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{L.barcode}</label>
              <div className="flex gap-2">
                <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="input-field" placeholder="1234567890128" />
                <button type="button" onClick={() => setScanOpen(true)} className="btn-outline inline-flex items-center gap-1 shrink-0" title={L.scanCamera}><ScanBarcode size={16} /></button>
                <button type="button" onClick={generateBarcode} className="btn-outline inline-flex items-center gap-1 shrink-0" title={t('generate')}><Wand2 size={16} /></button>
              </div>
              <p className="mt-1 text-[11px] text-subtle-foreground">{L.scanCamera}</p>
            </div>

            <datalist id="unit-names">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>

            <div className="border-t border-border pt-3">
              <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="flex w-full items-center justify-between text-sm font-medium text-foreground">
                <span>{L.advanced}</span>
                <span className="text-subtle-foreground">{showAdvanced ? '−' : '+'}</span>
              </button>
              {showAdvanced && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t('sku')}</label>
                    <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{L.tax} (%)</label>
                    <input type="number" min={0} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{L.brand}</label>
                    <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{L.supplier}</label>
                    <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="input-field" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-3">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input type="checkbox" checked={hasOtherUnits} onChange={(e) => toggleOtherUnits(e.target.checked)} className="rounded" />
                {L.otherUnitsQ}
              </label>

              {hasOtherUnits && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{L.otherUnits}</span>
                    <button type="button" onClick={addConfig} className="btn-outline inline-flex items-center gap-1 text-xs"><Plus size={14} /> {L.addUnit}</button>
                  </div>

                  {configs.map((c, i) => (
                    <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[11px] text-subtle-foreground mb-0.5">{L.unitName}</label>
                          <input list="unit-names" value={c.unitName} onChange={(e) => updateConfig(i, { unitName: e.target.value })} className="input-field text-sm" placeholder="Carton" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[11px] text-subtle-foreground mb-0.5">{L.contains} (× {form.baseUnitName || 'piece'})</label>
                          <input type="number" min={2} value={c.baseUnits} onChange={(e) => updateConfig(i, { baseUnits: e.target.value })} className="input-field text-sm" placeholder="24" />
                          <p className="mt-1 text-[11px] text-subtle-foreground">{L.containsHelp}</p>
                        </div>
                        <div>
                          <label className="block text-[11px] text-subtle-foreground mb-0.5">{L.price}</label>
                          <input type="number" min={0} value={c.sellingPrice} onChange={(e) => updateConfig(i, { sellingPrice: e.target.value })} className="input-field text-sm" placeholder={String((Number(c.baseUnits) || 0) * (Number(form.sellingPrice) || 0))} />
                        </div>
                        <div>
                          <label className="block text-[11px] text-subtle-foreground mb-0.5">{L.pricingMode}</label>
                          <select value={c.pricingMode} onChange={(e) => updateConfig(i, { pricingMode: e.target.value as 'FIXED' | 'FLUCTUATING' })} className="input-field text-sm">
                            <option value="FIXED">{L.fixed}</option>
                            <option value="FLUCTUATING">{L.fluctuating}</option>
                          </select>
                        </div>
                        {c.pricingMode === 'FLUCTUATING' && (
                          <>
                            <div>
                              <label className="block text-[11px] text-subtle-foreground mb-0.5">{L.minPrice}</label>
                              <input type="number" min={0} value={c.minPrice} onChange={(e) => updateConfig(i, { minPrice: e.target.value })} className="input-field text-sm" />
                            </div>
                            <div>
                              <label className="block text-[11px] text-subtle-foreground mb-0.5">{L.maxPrice}</label>
                              <input type="number" min={0} value={c.maxPrice} onChange={(e) => updateConfig(i, { maxPrice: e.target.value })} className="input-field text-sm" />
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <input type="radio" name="unit-default" checked={c.isDefault} onChange={() => setDefaultConfig(i)} className="rounded-full" /> {L.defaultLabel}
                        </label>
                        <button type="button" disabled={configs.length <= 1} onClick={() => removeConfig(i)} className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline disabled:opacity-40" title={t('delete')}><Trash2 size={14} /> {t('delete')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">{t('description')}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('image')}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <Image src={img} alt="" width={64} height={64} className="w-16 h-16 rounded-lg object-cover border border-border" />
                  {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[9px] text-center rounded-b-lg py-0.5">{t('primary')}</span>}
                  {i !== 0 && (
                    <button type="button" onClick={() => setImages((prev) => [img, ...prev.filter((_, j) => j !== i)])} className="absolute top-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center rounded-t-lg py-0.5 hover:bg-secondary">
                      {t('primary')}
                    </button>
                  )}
                  <button type="button" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-0.5"><X size={12} /></button>
                </div>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-border-strong rounded-lg text-sm text-muted-foreground cursor-pointer hover:border-secondary">
              <Upload size={16} /> {t('upload')}
              <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
            </label>
          </div>

          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>

      <Modal open={!!adjustTarget} title={`${t('adjust')} — ${adjustTarget?.name ?? ''}`} onClose={() => setAdjustTarget(null)}>
        <form onSubmit={submitAdjustment} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('stock')}: <span className="font-semibold text-foreground">{adjustTarget ? formatStockWithUnits(adjustTarget) : ''}</span></p>
          {(adjustTarget?.unitConfigs?.length ?? 0) > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('chooseUnit')}</label>
              <select value={adjustForm.unitConfigId} onChange={(e) => setAdjustForm({ ...adjustForm, unitConfigId: e.target.value })} className="input-field">
                <option value="">{adjustTarget?.baseUnitName ?? adjustTarget?.unit} (1)</option>
                {(adjustTarget?.unitConfigs ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.unitName} ({c.baseUnits})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('quantity')} (+ / -)</label>
            <input required type="number" value={adjustForm.quantityChange} onChange={(e) => setAdjustForm({ ...adjustForm, quantityChange: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('reason')}</label>
            <select required value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} className="input-field">
              <option value="">—</option>
              <option value="Damaged">Damaged</option>
              <option value="Expired">Expired</option>
              <option value="Stock count correction">Stock count correction</option>
              <option value="Theft / loss">Theft / loss</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>

      <Modal open={importOpen} title={t('import')} onClose={() => setImportOpen(false)} wide>
        <form onSubmit={submitImport} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('import')} — name,sku,costPrice,sellingPrice,stockQuantity,unit</p>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} className="input-field" rows={8} placeholder={'name,sku,costPrice,sellingPrice,stockQuantity,unit\nSugar 1kg,SUG1,2000,2500,50,kg'} />
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('import')}</button>
        </form>
      </Modal>

      <Modal open={bulkOpen} title={t('bulk')} onClose={() => setBulkOpen(false)}>
        <form onSubmit={submitBulk} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('scope')}</label>
            <select value={bulkForm.scope} onChange={(e) => setBulkForm({ ...bulkForm, scope: e.target.value })} className="input-field">
              <option value="all">{t('all')}</option>
              <option value="category">{t('category')}</option>
            </select>
          </div>
          {bulkForm.scope === 'category' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('category')}</label>
              <select value={bulkForm.categoryId} onChange={(e) => setBulkForm({ ...bulkForm, categoryId: e.target.value })} className="input-field">
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('type')}</label>
              <select value={bulkForm.type} onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value })} className="input-field">
                <option value="percentage">%</option>
                <option value="fixed">{t('fixed')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('value')}</label>
              <input required type="number" value={bulkForm.value} onChange={(e) => setBulkForm({ ...bulkForm, value: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('type')}</label>
            <select value={bulkForm.field} onChange={(e) => setBulkForm({ ...bulkForm, field: e.target.value })} className="input-field">
              <option value="sellingPrice">{t('sellingPrice')}</option>
              <option value="costPrice">{t('costPrice')}</option>
            </select>
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleScan} />
    </PageWrapper>
  );
}
