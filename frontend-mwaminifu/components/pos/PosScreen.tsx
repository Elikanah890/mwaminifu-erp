'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiClient, ApiErrorException } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { paymentMethodLabel } from '@/lib/i18n/labels';
import { usePermissions } from '@/lib/context/PermissionsContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Product, Customer } from '@/lib/types';
import { formatCurrency, formatDateTime, errorMessage, formatStockWithUnits } from '@/lib/format';
import Modal from '@/components/Modal';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useBarcodeWedge } from '@/lib/hooks/useBarcodeWedge';
import { useToast } from '@/components/Toast';
import { motion } from '@/components/motion';
import { Skeleton } from '@/components/Spinner';
import { Trash2, Minus, Plus, ReceiptText, ScanBarcode, UserPlus, Eye, X, PackagePlus } from 'lucide-react';

const PAYMENT_METHODS: Array<{ id: string; label?: string; labelKey?: string }> = [
  { id: 'cash', labelKey: 'cash' },
  { id: 'mpesa', label: 'M-Pesa' },
  { id: 'tigo', label: 'Tigo Pesa' },
  { id: 'airtel', label: 'Airtel Money' },
  { id: 'halopesa', label: 'Halopesa' },
  { id: 'mixx', label: 'Mixx by Yas' },
  { id: 'card', labelKey: 'card' },
  { id: 'bank', labelKey: 'bank' },
  { id: 'credit', labelKey: 'credit' },
];

type CartItem = {
  product: Product;
  quantity: number;
  unitPrice: number;
  unitName: string;
  baseUnits: number;
  unitConfigId?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
};

const lineKey = (i: CartItem) => `${i.product.id}:${i.unitConfigId ?? 'base'}`;

type Payment = { method: string; amount: number };

type ReceiptItem = {
  quantity: number;
  unitPrice?: number;
  total: number;
  unitName?: string | null;
  unit?: string | null;
  baseUnitsPerConfig?: number;
  product?: { name: string } | null;
};

type ReceiptData = Record<string, unknown> & {
  receiptNumber?: string;
  saleDate?: string;
  totalAmount?: number;
  discount?: number;
  grandTotal?: number;
  customerName?: string;
  items?: ReceiptItem[];
  paymentDetails?: Array<{ method: string; amount: number }>;
};

function ReceiptView({ shopName, receipt }: { shopName: string; receipt: ReceiptData }) {
  const { t } = useI18n();
  const items = receipt.items ?? [];
  const payments = receipt.paymentDetails ?? [];
  const subtotal = Number(receipt.totalAmount ?? receipt.grandTotal ?? 0);
  const discount = Number(receipt.discount ?? 0);
  const total = Number(receipt.grandTotal ?? 0);

  return (
    <div className="text-foreground">
      <div className="text-center">
        <p className="text-base font-bold">{shopName || 'Mwaminifu'}</p>
        <p className="mt-1 text-xs text-subtle-foreground">{t('receiptNo')} {receipt.receiptNumber ?? '-'}</p>
        {receipt.saleDate && (
          <p className="text-xs text-subtle-foreground">{formatDateTime(receipt.saleDate)}</p>
        )}
        {receipt.customerName && <p className="mt-1 text-xs">{t('customerLabel')} {receipt.customerName}</p>}
      </div>

      <div className="my-3 border-t border-dashed border-border" />

      <table className="w-full text-sm">
        <tbody>
          {items.map((i, idx) => (
            <tr key={idx}>
              <td className="py-1 pr-2 align-top">
                <span className="font-medium">{i.product?.name ?? '—'}</span>
                <span className="block text-xs text-subtle-foreground">
                  {i.unitName ?? i.unit ?? ''}
                  {(i.baseUnitsPerConfig ?? 1) > 1 ? ` (${i.baseUnitsPerConfig}×)` : ''} × {i.quantity}
                </span>
              </td>
              <td className="whitespace-nowrap py-1 text-right align-top">{formatCurrency(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-3 border-t border-dashed border-border" />

      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-subtle-foreground">
          <span>{t('subTotal')}</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-subtle-foreground">
            <span>{t('discount')}</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold">
          <span>{t('total')}</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {payments.length > 0 && (
        <>
          <div className="my-3 border-t border-dashed border-border" />
          <div className="space-y-1 text-xs text-subtle-foreground">
            {payments.map((p, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{paymentMethodLabel(t, p.method)}</span>
                <span>{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-4 text-center text-xs text-subtle-foreground">{t('thankYouBusiness')}</p>
    </div>
  );
}

export default function PosScreen({ shopId }: { shopId: string }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const { can } = usePermissions();
  const pathname = usePathname();
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [productsReload, setProductsReload] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [shopName, setShopName] = useState('');
  const [mounted, setMounted] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const searchRef = useRef<number | undefined>(undefined);

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '', creditLimit: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [quickView, setQuickView] = useState<Record<string, unknown> | null>(null);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [pickerUnitId, setPickerUnitId] = useState<string>('');

  useEffect(() => {
    if (!shopId) return;
    apiClient
      .get<Customer[]>(`/shops/${shopId}/customers?limit=100`)
      .then((res) => setCustomers(res.data ?? []))
      .catch(() => {});
  }, [shopId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!shopId) return;
    apiClient
      .get<Array<{ id: string; name: string }>>('/shops')
      .then((res) => setShopName((res.data ?? []).find((s) => s.id === shopId)?.name ?? ''))
      .catch(() => {});
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    window.clearTimeout(searchRef.current);
    searchRef.current = window.setTimeout(() => {
      setLoadingProducts(true);
      setProductsError('');
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      apiClient
        .get<Product[]>(`/shops/${shopId}/products?limit=100${q}`)
        .then((res) => setProducts(res.data ?? []))
        .catch(() => setProductsError(t('failedLoadProducts')))
        .finally(() => setLoadingProducts(false));
    }, 250);
    return () => window.clearTimeout(searchRef.current);
  }, [shopId, search, productsReload, t]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const total = Math.max(0, subtotal - discount);
    return { subtotal, total };
  }, [cart, discount]);

  const shopPriceFor = (product: Product, unitKey: string) =>
    product.shopPrices?.find((price) => price.unitKey === unitKey);

  const isDecimalUnit = (name: string) =>
    /^(kg|kgs|kilogram|kilograms|g|gram|grams|mg|l|ltr|litre|liter|litres|liters|ml|m|meter|metre|cm|mm)$/i.test(name.trim());

  const addLine = (
    product: Product,
    unit: { unitConfigId?: string; unitName: string; baseUnits: number; price: number; minPrice?: number | null; maxPrice?: number | null }
  ) => {
    setCart((prev) => {
      const key = `${product.id}:${unit.unitConfigId ?? 'base'}`;
      const existing = prev.find((i) => lineKey(i) === key);
      if (existing) {
        return prev.map((i) => (lineKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: unit.price,
          unitName: unit.unitName,
          baseUnits: unit.baseUnits,
          unitConfigId: unit.unitConfigId,
          minPrice: unit.minPrice ?? null,
          maxPrice: unit.maxPrice ?? null,
        },
      ];
    });
  };

  const addToCart = (product: Product) => {
    const configs = product.unitConfigs ?? [];
    // Single (or no) unit configuration → add directly using the default.
    if (configs.length <= 1) {
      const cfg = configs[0];
      addLine(
        product,
        cfg
          ? {
              unitConfigId: cfg.id,
              unitName: cfg.unitName,
              baseUnits: cfg.baseUnits,
              price: shopPriceFor(product, cfg.id)?.sellingPrice ?? cfg.sellingPrice,
              minPrice: shopPriceFor(product, cfg.id)?.minPrice ?? cfg.minPrice,
              maxPrice: shopPriceFor(product, cfg.id)?.maxPrice ?? cfg.maxPrice,
            }
          : {
              unitName: product.baseUnitName || product.unit || 'piece',
              baseUnits: 1,
              price: shopPriceFor(product, 'base')?.sellingPrice ?? product.sellingPrice,
              minPrice: shopPriceFor(product, 'base')?.minPrice ?? product.minPrice,
              maxPrice: shopPriceFor(product, 'base')?.maxPrice ?? product.maxPrice,
            }
      );
      return;
    }
    // Multiple configurations → let the seller choose the unit.
    setPickerUnitId(configs[0]?.id ?? 'base');
    setPickerProduct(product);
  };

  const confirmPicker = () => {
    if (!pickerProduct) return;
    const configs = pickerProduct.unitConfigs ?? [];
    const cfg = configs.find((c) => c.id === pickerUnitId);
    if (cfg) {
      addLine(pickerProduct, {
        unitConfigId: cfg.id,
        unitName: cfg.unitName,
        baseUnits: cfg.baseUnits,
        price: shopPriceFor(pickerProduct, cfg.id)?.sellingPrice ?? cfg.sellingPrice,
        minPrice: shopPriceFor(pickerProduct, cfg.id)?.minPrice ?? cfg.minPrice,
        maxPrice: shopPriceFor(pickerProduct, cfg.id)?.maxPrice ?? cfg.maxPrice,
      });
    } else {
      addLine(pickerProduct, {
        unitName: pickerProduct.baseUnitName || pickerProduct.unit || 'piece',
        baseUnits: 1,
        price: shopPriceFor(pickerProduct, 'base')?.sellingPrice ?? pickerProduct.sellingPrice,
        minPrice: shopPriceFor(pickerProduct, 'base')?.minPrice ?? pickerProduct.minPrice,
        maxPrice: shopPriceFor(pickerProduct, 'base')?.maxPrice ?? pickerProduct.maxPrice,
      });
    }
    setPickerProduct(null);
  };

  const handleScan = async (barcode: string) => {
    setScanOpen(false);
    if (!barcode) return;
    try {
      const res = await apiClient.get<Product>(`/shops/${shopId}/products/by-barcode/${encodeURIComponent(barcode)}`);
      if (res.data) {
        addToCart(res.data);
        setNotFoundBarcode(null);
        toast(`${res.data.name}`, 'success');
      }
    } catch (err) {
      if (err instanceof ApiErrorException && err.status === 404) {
        setNotFoundBarcode(barcode);
        toast(t('productNotFound'), 'error');
      } else {
        toast(errorMessage(err), 'error');
      }
    }
  };

  // Enables USB/hardware barcode scanners on desktop POS PCs: scan at any time
  // (when no input is focused) and the product is added to the cart instantly.
  useBarcodeWedge(handleScan);

  const setItemUnit = (key: string, unit: { unitName: string; baseUnits: number; price: number; unitConfigId?: string; minPrice?: number | null; maxPrice?: number | null }) => {
    setCart((prev) =>
      prev.map((i) =>
        lineKey(i) === key ? { ...i, ...unit } : i
      )
    );
  };

  const changeQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (lineKey(i) === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const setItemPrice = (key: string, price: number) => {
    setCart((prev) =>
      prev.map((i) => (lineKey(i) === key ? { ...i, unitPrice: Math.max(0, price) } : i))
    );
  };

  const priceRange = (item: CartItem) => {
    const min = item.minPrice ?? item.product.minPrice ?? 0;
    const max = item.maxPrice ?? item.product.maxPrice ?? Math.max(item.product.sellingPrice * 2, min);
    return { min, max, negotiable: max > min };
  };

  const saveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) return;
    setSavingCustomer(true);
    try {
      const res = await apiClient.post<Customer>(`/shops/${shopId}/customers`, {
        name: newCustomer.name,
        phone: newCustomer.phone || undefined,
        email: newCustomer.email || undefined,
        address: newCustomer.address || undefined,
        creditLimit: Number(newCustomer.creditLimit) || 0,
      });
      const created = res.data;
      if (created) {
        setCustomers((prev) => [...prev, created]);
        setCustomerId(created.id);
      }
      setAddCustomerOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '', creditLimit: '' });
      toast(t('customerAdded'), 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSavingCustomer(false);
    }
  };

  const openQuickView = async (customerIdValue: string) => {
    if (!customerIdValue) { setQuickView(null); return; }
    try {
      const res = await apiClient.get<Record<string, unknown>>(`/customers/${customerIdValue}/profile`);
      setQuickView(res.data ?? null);
    } catch {
      setQuickView(null);
    }
  };

  const removeItem = (key: string) => {
    setCart((prev) => prev.filter((i) => lineKey(i) !== key));
  };

  const [payments, setPayments] = useState<Payment[]>([]);
  const [payMethod, setPayMethod] = useState('cash');
  const [payAmount, setPayAmount] = useState<string>('');

  useEffect(() => {
    setPayAmount(String(totals.total));
  }, [totals.total]);

  const addPayment = () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    setPayments((prev) => [...prev, { method: payMethod, amount }]);
    setPayAmount('');
  };

  const removePayment = (idx: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  };

  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);

  const completeSale = async () => {
    if (cart.length === 0) {
      toast(t('addAtLeastOneItem'), 'error');
      return;
    }
    const typedAmount = Number(payAmount);
    const effectivePayments =
      payments.length > 0
        ? payments
        : [{ method: payMethod, amount: typedAmount > 0 ? typedAmount : totals.total }];

    const useCredit = effectivePayments.some((p) => p.method === 'credit');
    if (useCredit && !customerId) {
      toast(t('selectCustomerForCredit'), 'error');
      return;
    }
    if (effectivePayments.some((p) => !p.amount || p.amount <= 0)) {
      toast(t('enterValidPayment'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post<Record<string, unknown>>(`/shops/${shopId}/sales`, {
        customerId: customerId || undefined,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          unit: i.unitName,
          unitName: i.unitName,
          unitConfigId: i.unitConfigId,
          baseUnitsPerConfig: i.baseUnits,
        })),
        discount: discount || undefined,
        payments: effectivePayments,
      });
      const receiptData = (res.data ?? null) as Record<string, unknown> | null;
      const receiptItems = Array.isArray(receiptData?.items)
        ? (receiptData!.items as Array<Record<string, unknown>>)
        : [];
      const enrichedReceipt =
        receiptData && receiptItems.length > 0
          ? {
              ...receiptData,
              items: receiptItems.map((item) => {
                if (item.product) return item;
                const match = cart.find((c) => c.product.id === item.productId);
                return match ? { ...item, product: { name: match.product.name } } : item;
              }),
            }
          : receiptData;
      const soldCustomerName = customers.find((c) => c.id === customerId)?.name;
      setReceipt(
        enrichedReceipt
          ? { ...(enrichedReceipt as ReceiptData), customerName: soldCustomerName }
          : null
      );
      setCart([]);
      setPayments([]);
      setDiscount(0);
      setCustomerId('');
      setQuickView(null);
      toast(t('saleCompleted'), 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const shareWhatsApp = () => {
    if (!receipt) return;
    const number = (receipt.receiptNumber as string) || '-';
    const total = Number(receipt.grandTotal) || 0;
    const items = (receipt.items as Array<{ quantity: number; unitPrice: number; total: number; unitName?: string | null; unit?: string | null; baseUnitsPerConfig?: number; product?: { name: string } }>) || [];
    const lines = items.map((i) => `${i.product?.name ?? t('item')} (${i.unitName ?? i.unit ?? ''}${(i.baseUnitsPerConfig ?? 1) > 1 ? ` ${i.baseUnitsPerConfig}×` : ''}) x ${i.quantity} = ${formatCurrency(i.total)}`);
    const shopName = (receipt.shop as { name?: string } | undefined)?.name ?? 'Mwaminifu';
    const text = `*${shopName}*\n${lines.join('\n')}\n\n*${t('total')}: ${formatCurrency(total)}*\n\n${t('receiptNo')} ${number}\n${t('thankYou')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = () => {
    if (!receipt) return;
    const number = (receipt.receiptNumber as string) || '-';
    const total = Number(receipt.grandTotal) || 0;
    const items = (receipt.items as Array<{ quantity: number; unitPrice: number; total: number; unitName?: string | null; unit?: string | null; baseUnitsPerConfig?: number; product?: { name: string } }>) || [];
    const lines = items.map((i) => `${i.product?.name ?? t('item')} (${i.unitName ?? i.unit ?? ''}${(i.baseUnitsPerConfig ?? 1) > 1 ? ` ${i.baseUnitsPerConfig}×` : ''}) x ${i.quantity} = ${formatCurrency(i.total)}`);
    const subject = lines.length > 0 ? `${lines[0].split(' (')[0]} — ${formatCurrency(total)}` : `${t('receipt')} ${number}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${lines.join('\n')}\n\n${t('total')}: ${formatCurrency(total)}\n${t('receiptNo')} ${number}\n${t('thankYou')}`)}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products panel */}
      <div className="lg:col-span-2">
        <div className="surface-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <ScanBarcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`${t('search')} / ${t('barcode')}...`}
                className="input-field pl-9"
              />
            </div>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }} onClick={() => setScanOpen(true)} className="btn-teal inline-flex items-center gap-2 shrink-0" title={t('scan')}>
              <ScanBarcode size={16} /> <span className="hidden sm:inline">{t('scan')}</span>
            </motion.button>
          </div>
          {notFoundBarcode && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-sm text-warning">
              <span className="min-w-0 truncate">
                <span className="font-medium">{t('productNotFound')}</span> · <span className="font-mono">{notFoundBarcode}</span>
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {can('products:create') && pathname.startsWith('/owner') && (
                  <Link href="/owner/inventory" className="inline-flex items-center gap-1 font-medium text-secondary hover:underline">
                    <PackagePlus size={14} /> {t('addProduct')}
                  </Link>
                )}
                <button onClick={() => setNotFoundBarcode(null)} className="text-warning hover:text-foreground" aria-label={t('cancel')}><X size={14} /></button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
            {loadingProducts ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))
            ) : productsError ? (
              <div className="col-span-full flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm font-medium text-danger">{productsError}</p>
                <button type="button" onClick={() => setProductsReload((v) => v + 1)} className="btn-outline text-sm">
                  {t('retry')}
                </button>
              </div>
            ) : products.length === 0 ? (
              <p className="col-span-full text-sm text-subtle-foreground py-8 text-center">{t('noResults')}</p>
            ) : (
              products.map((p) => (
                <motion.button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="text-left border border-border rounded-lg p-3 hover:border-secondary hover:bg-muted transition-colors"
                >
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-subtle-foreground truncate">
                    {p.sku ?? p.baseUnitName ?? p.unit}
                    {(p.unitConfigs?.length ?? 0) > 1 ? ` · ${p.unitConfigs!.length} ${t('unitConfigurations').toLowerCase()}` : ''}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-secondary">
                      {formatCurrency(shopPriceFor(p, p.unitConfigs?.[0]?.id ?? 'base')?.sellingPrice ?? p.unitConfigs?.[0]?.sellingPrice ?? p.sellingPrice)}
                    </span>
                    <span className={`text-xs ${p.stockQuantity <= p.reorderLevel ? 'text-danger' : 'text-subtle-foreground'}`}>
                      {formatStockWithUnits(p)}
                    </span>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cart panel */}
      <div className="surface-card p-4 flex flex-col">
        <h2 className="text-lg font-semibold text-primary mb-3">{t('cart')}</h2>

        <div className="flex-1 overflow-y-auto max-h-[40vh] space-y-2 mb-4">
          {cart.length === 0 ? (
            <p className="text-sm text-subtle-foreground py-6 text-center">{t('emptyCart')}</p>
          ) : (
            cart.map((item) => {
              const key = lineKey(item);
              return (
                <div key={key} className="border-b border-border pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                      <p className="text-xs text-subtle-foreground">{item.unitName} × {item.quantity} · {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => changeQty(key, -1)} className="p-1 text-muted-foreground hover:text-primary"><Minus size={14} /></button>
                      <input
                        type="number"
                        min={isDecimalUnit(item.unitName) ? 0.01 : 1}
                        step={isDecimalUnit(item.unitName) ? 0.1 : 1}
                        value={item.quantity}
                        onChange={(e) => {
                          const raw = Number(e.target.value) || 0;
                          const quantity = isDecimalUnit(item.unitName) ? raw : Math.round(raw);
                          setCart((prev) => prev.map((line) => lineKey(line) === key ? { ...line, quantity } : line).filter((line) => line.quantity > 0));
                        }}
                        className="w-14 rounded border border-border-strong px-1 py-0.5 text-center text-sm"
                        aria-label={`Quantity ${item.unitName}`}
                      />
                      <button onClick={() => changeQty(key, 1)} className="p-1 text-muted-foreground hover:text-primary"><Plus size={14} /></button>
                      <button onClick={() => removeItem(key)} className="p-1 text-danger"><Trash2 size={14} /></button>
                    </div>
                    <span className="text-sm font-semibold text-foreground w-24 text-right">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {(item.product.unitConfigs?.length ?? 0) > 0 && (
                      <select
                        value={item.unitConfigId ?? 'base'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'base') {
                            setItemUnit(key, {
                              unitName: item.product.baseUnitName || item.product.unit,
                              baseUnits: 1,
                              price: shopPriceFor(item.product, 'base')?.sellingPrice ?? item.product.sellingPrice,
                              unitConfigId: undefined,
                              minPrice: shopPriceFor(item.product, 'base')?.minPrice ?? item.product.minPrice,
                              maxPrice: shopPriceFor(item.product, 'base')?.maxPrice ?? item.product.maxPrice,
                            });
                          } else {
                            const cfg = item.product.unitConfigs!.find((u) => u.id === val);
                            if (cfg) setItemUnit(key, {
                              unitName: cfg.unitName,
                              baseUnits: cfg.baseUnits,
                              price: shopPriceFor(item.product, cfg.id)?.sellingPrice ?? cfg.sellingPrice,
                              unitConfigId: cfg.id,
                              minPrice: shopPriceFor(item.product, cfg.id)?.minPrice ?? cfg.minPrice,
                              maxPrice: shopPriceFor(item.product, cfg.id)?.maxPrice ?? cfg.maxPrice,
                            });
                          }
                        }}
                        className="rounded-md border border-border-strong bg-card px-2 py-1 text-xs text-foreground"
                      >
                        {!(item.product.unitConfigs ?? []).some((c) => c.baseUnits === 1) && (
                          <option value="base">{item.product.baseUnitName ?? item.product.unit} (1×)</option>
                        )}
                        {item.product.unitConfigs!.map((u) => (
                          <option key={u.id} value={u.id}>{u.unitName} ({u.baseUnits}×)</option>
                        ))}
                      </select>
                    )}
                    {!can('products:update') ? (
                      <span className="text-sm text-muted-foreground">{formatCurrency(item.unitPrice)}</span>
                    ) : editingPriceId === key ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="range"
                          min={priceRange(item).min}
                          max={priceRange(item).max}
                          step="1"
                          value={item.unitPrice}
                          onChange={(e) => setItemPrice(key, Number(e.target.value))}
                          className="flex-1 accent-[#00897b]"
                          disabled={!priceRange(item).negotiable}
                        />
                        <input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) => setItemPrice(key, Number(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-border-strong rounded-md text-sm text-right"
                        />
                        <button onClick={() => setEditingPriceId(null)} className="btn-outline text-xs px-2 py-1">{t('done')}</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingPriceId(key)} className="text-xs font-medium text-secondary hover:underline">
                        {priceRange(item).negotiable ? t('adjustPrice') : t('editPrice')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">{t('customer')}</label>
            <div className="flex items-center gap-2">
              <select
                value={customerId}
                onChange={(e) => { setCustomerId(e.target.value); openQuickView(e.target.value); }}
                className="max-w-[160px] rounded-md border border-border-strong bg-card px-2 py-1.5 text-sm text-foreground"
              >
                <option value="">{t('walkInCustomer')}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {can('customers:create') && (
                <button type="button" onClick={() => setAddCustomerOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline shrink-0">
                  <UserPlus size={14} /> {t('addNewCustomer')}
                </button>
              )}
              {customerId && (
                <button type="button" onClick={() => openQuickView(customerId)} className="text-xs text-primary hover:underline shrink-0 inline-flex items-center gap-1">
                  <Eye size={14} /> {t('view')}
                </button>
              )}
            </div>
          </div>

          {quickView && (
            <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{quickView.name as string}</span>
                {quickView.phone ? <span className="text-xs text-muted-foreground">{quickView.phone as string}</span> : null}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('creditBalance')}</span>
                <span className="font-semibold text-danger">{formatCurrency((quickView.outstandingBalance as number) ?? 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('creditLimit')}</span>
                <span className="font-medium">{formatCurrency((quickView.creditLimit as number) ?? 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('totalPurchases')}</span>
                <span className="font-medium">{formatCurrency(((quickView.financialSummary as Record<string, number>)?.totalPurchases) ?? 0)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">{t('discount')}</label>
            <input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="max-w-[120px] px-2 py-1.5 border border-border-strong rounded-md text-sm text-right"
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium text-muted-foreground">{t('subtotal')}</span>
            <span className="text-sm font-semibold text-foreground">{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">{t('total')}</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(totals.total)}</span>
          </div>
        </div>

        {/* Payments */}
        <div className="border-t border-border pt-3 mb-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">{t('payment')}</p>
          <div className="flex gap-2 mb-2">
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="flex-1 rounded-md border border-border-strong bg-card px-2 py-2 text-sm text-foreground"
            >
              {PAYMENT_METHODS.filter((m) => m.id !== 'credit' || can('credit:create')).map((m) => (
                <option key={m.id} value={m.id}>{m.labelKey ? t(m.labelKey) : m.label}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-32 rounded-md border border-border-strong bg-card px-2 py-2 text-right text-sm text-foreground"
            />
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }} onClick={addPayment} className="btn-teal px-3">{t('add')}</motion.button>
          </div>
          {payments.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm py-1">
              <span className="text-muted-foreground">{paymentMethodLabel(t, p.method)}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{formatCurrency(p.amount)}</span>
                <button onClick={() => removePayment(idx)} className="text-danger text-xs">{t('remove')}</button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">{t('paid')}</span>
            <span className="font-semibold text-secondary">{formatCurrency(paidTotal)}</span>
          </div>
        </div>

        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }} onClick={completeSale} disabled={submitting} className="btn-navy w-full py-3">
          {submitting ? t('loading') : `${t('checkout')} (${formatCurrency(totals.total)})`}
        </motion.button>
      </div>

      {/* Receipt modal */}
      <Modal open={!!receipt} title={t('receipt')} onClose={() => setReceipt(null)}>
        {receipt && (
          <div>
            <ReceiptView shopName={shopName} receipt={receipt} />
            <div className="mt-6 flex gap-3">
              <button onClick={shareWhatsApp} className="flex-1 btn-teal">{t('shareWhatsApp')}</button>
              <button onClick={shareEmail} className="flex-1 btn-outline">{t('email')}</button>
              <button onClick={() => window.print()} className="flex-1 btn-outline">{t('print')}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Print-only receipt: portaled to <body> so print CSS can hide the app */}
      {mounted && receipt &&
        createPortal(
          <div className="receipt-print-root">
            <ReceiptView shopName={shopName} receipt={receipt} />
          </div>,
          document.body
        )}

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleScan} />

      {/* Unit picker — shown when a product has multiple unit configurations */}
      <Modal open={!!pickerProduct} title={`${t('chooseUnit')} — ${pickerProduct?.name ?? ''}`} onClose={() => setPickerProduct(null)}>
        {pickerProduct && (
          <div className="space-y-4">
            <div className="space-y-2">
              {(pickerProduct.unitConfigs ?? []).map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${pickerUnitId === c.id ? 'border-secondary bg-secondary/5' : 'border-border hover:bg-muted'}`}
                >
                  <span className="flex items-center gap-2">
                    <input type="radio" name="pos-unit" checked={pickerUnitId === c.id} onChange={() => setPickerUnitId(c.id)} />
                    <span className="text-sm font-medium text-foreground">{c.unitName}</span>
                    <span className="text-xs text-subtle-foreground">{c.baseUnits}×</span>
                  </span>
                  <span className="text-sm font-semibold text-secondary">{formatCurrency(c.sellingPrice)}</span>
                </label>
              ))}
              {!(pickerProduct.unitConfigs ?? []).some((c) => c.baseUnits === 1) && (
                <label className={`flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer ${pickerUnitId === 'base' ? 'border-secondary bg-secondary/5' : 'border-border hover:bg-muted'}`}>
                  <span className="flex items-center gap-2">
                    <input type="radio" name="pos-unit" checked={pickerUnitId === 'base'} onChange={() => setPickerUnitId('base')} />
                    <span className="text-sm font-medium text-foreground">{pickerProduct.baseUnitName ?? pickerProduct.unit}</span>
                    <span className="text-xs text-subtle-foreground">1×</span>
                  </span>
                  <span className="text-sm font-semibold text-secondary">{formatCurrency(pickerProduct.sellingPrice)}</span>
                </label>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={confirmPicker} className="btn-navy flex-1">{t('addToCart')}</button>
              <button onClick={() => setPickerProduct(null)} className="btn-outline flex-1">{t('cancel')}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={addCustomerOpen} title={t('addNewCustomer')} onClose={() => setAddCustomerOpen(false)}>
        <form onSubmit={saveCustomer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('name')}</label>
            <input required value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('phone')}</label>
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('email')}</label>
              <input value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('address')}</label>
            <input value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('creditLimit')}</label>
            <input type="number" min={0} value={newCustomer.creditLimit} onChange={(e) => setNewCustomer({ ...newCustomer, creditLimit: e.target.value })} className="input-field" />
          </div>
          <button type="submit" disabled={savingCustomer} className="btn-navy w-full">{savingCustomer ? t('loading') : t('save')}</button>
        </form>
      </Modal>
    </div>
  );
}
