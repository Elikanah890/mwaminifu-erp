'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { Product, Customer } from '@/lib/types';
import { formatCurrency, errorMessage } from '@/lib/format';
import Modal from '@/components/Modal';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useBarcodeWedge } from '@/lib/hooks/useBarcodeWedge';
import { useToast } from '@/components/Toast';
import { motion } from '@/components/motion';
import { Skeleton } from '@/components/Spinner';
import { Trash2, Minus, Plus, ReceiptText, ScanBarcode, UserPlus, Eye } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'mpesa', label: 'M-Pesa' },
  { id: 'tigo', label: 'Tigo Pesa' },
  { id: 'airtel', label: 'Airtel Money' },
  { id: 'halopesa', label: 'Halopesa' },
  { id: 'mixx', label: 'Mixx by Yas' },
  { id: 'card', label: 'Card' },
  { id: 'bank', label: 'Bank' },
  { id: 'credit', label: 'Credit' },
];

type CartItem = {
  product: Product;
  quantity: number;
  unitPrice: number;
  unitName: string;
  baseUnits: number;
};

type Payment = { method: string; amount: number };

export default function PosScreen({ shopId }: { shopId: string }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const searchRef = useRef<number | undefined>(undefined);

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '', creditLimit: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [quickView, setQuickView] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!shopId) return;
    apiClient
      .get<Customer[]>(`/shops/${shopId}/customers?limit=100`)
      .then((res) => setCustomers(res.data ?? []))
      .catch(() => {});
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    window.clearTimeout(searchRef.current);
    searchRef.current = window.setTimeout(() => {
      setLoadingProducts(true);
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      apiClient
        .get<Product[]>(`/shops/${shopId}/products?limit=100${q}`)
        .then((res) => setProducts(res.data ?? []))
        .catch(() => {})
        .finally(() => setLoadingProducts(false));
    }, 250);
    return () => window.clearTimeout(searchRef.current);
  }, [shopId, search]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const total = Math.max(0, subtotal - discount);
    return { subtotal, total };
  }, [cart, discount]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
          unitName: product.unit || 'piece',
          baseUnits: 1,
        },
      ];
    });
  };

  const handleScan = async (barcode: string) => {
    setScanOpen(false);
    if (!barcode) return;
    try {
      const res = await apiClient.get<Product>(`/shops/${shopId}/products/by-barcode/${encodeURIComponent(barcode)}`);
      if (res.data) {
        addToCart(res.data);
        toast(`${res.data.name}`, 'success');
      }
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  // Enables USB/hardware barcode scanners on desktop POS PCs: scan at any time
  // (when no input is focused) and the product is added to the cart instantly.
  useBarcodeWedge(handleScan);

  const setItemUnit = (id: string, unitName: string, baseUnits: number, price: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === id ? { ...i, unitName, baseUnits, unitPrice: price } : i
      )
    );
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const setItemPrice = (id: string, price: number) => {
    setCart((prev) =>
      prev.map((i) => (i.product.id === id ? { ...i, unitPrice: Math.max(0, price) } : i))
    );
  };

  const priceRange = (item: CartItem) => {
    const min = item.product.minPrice ?? 0;
    const max = item.product.maxPrice ?? Math.max(item.product.sellingPrice * 2, min);
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
      toast('Customer added', 'success');
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

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== id));
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
      toast('Add at least one item', 'error');
      return;
    }
    const useCredit = payments.some((p) => p.method === 'credit');
    if (useCredit && !customerId) {
      toast('Select a customer for credit sales', 'error');
      return;
    }
    if (payments.length === 0) {
      toast('Add at least one payment', 'error');
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
          baseUnits: i.baseUnits,
        })),
        discount: discount || undefined,
        payments,
      });
      setReceipt(res.data ?? null);
      setCart([]);
      setPayments([]);
      setDiscount(0);
      setCustomerId('');
      setQuickView(null);
      toast('Sale completed', 'success');
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
    const items = (receipt.items as Array<{ quantity: number; unitPrice: number; total: number; product?: { name: string } }>) || [];
    const lines = items.map((i) => `${i.quantity} x ${i.product?.name ?? 'Item'} = ${formatCurrency(i.total)}`);
    const text = `*Receipt ${number}*\n${lines.join('\n')}\n\n*Total: ${formatCurrency(total)}*\n\nThank you!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = () => {
    if (!receipt) return;
    const number = (receipt.receiptNumber as string) || '-';
    const total = Number(receipt.grandTotal) || 0;
    const items = (receipt.items as Array<{ quantity: number; unitPrice: number; total: number; product?: { name: string } }>) || [];
    const lines = items.map((i) => `${i.quantity} x ${i.product?.name ?? 'Item'} = ${formatCurrency(i.total)}`);
    window.location.href = `mailto:?subject=${encodeURIComponent(`Receipt ${number}`)}&body=${encodeURIComponent(`Receipt ${number}\n${lines.join('\n')}\n\nTotal: ${formatCurrency(total)}`)}`;
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
            {loadingProducts ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))
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
                  <p className="text-xs text-subtle-foreground truncate">{p.sku ?? p.unit}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-secondary">{formatCurrency(p.sellingPrice)}</span>
                    <span className={`text-xs ${p.stockQuantity <= p.reorderLevel ? 'text-danger' : 'text-subtle-foreground'}`}>
                      {p.stockQuantity} left
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
            cart.map((item) => (
              <div key={item.product.id} className="border-b border-border pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                    <p className="text-xs text-subtle-foreground">{formatCurrency(item.unitPrice)} each · {item.product.unit}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(item.product.id, -1)} className="p-1 text-muted-foreground hover:text-primary"><Minus size={14} /></button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => changeQty(item.product.id, 1)} className="p-1 text-muted-foreground hover:text-primary"><Plus size={14} /></button>
                    <button onClick={() => removeItem(item.product.id)} className="p-1 text-danger"><Trash2 size={14} /></button>
                  </div>
                  <span className="text-sm font-semibold text-foreground w-24 text-right">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {(item.product.unitConfigs?.length ?? 0) > 0 && (
                    <select
                      value={item.unitName}
                      onChange={(e) => {
                        const name = e.target.value;
                        if (name === item.product.unit) {
                          setItemUnit(item.product.id, item.product.unit, 1, item.product.sellingPrice);
                        } else {
                          const cfg = item.product.unitConfigs!.find((u) => u.unitName === name);
                          if (cfg) setItemUnit(item.product.id, cfg.unitName, cfg.baseUnits, cfg.sellingPrice);
                        }
                      }}
                      className="px-2 py-1 border border-border-strong rounded-md text-xs"
                    >
                      <option value={item.product.unit}>{item.product.unit}</option>
                      {item.product.unitConfigs!.map((u) => (
                        <option key={u.id} value={u.unitName}>{u.unitName} ({u.baseUnits}×)</option>
                      ))}
                    </select>
                  )}
                  {editingPriceId === item.product.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="range"
                        min={priceRange(item).min}
                        max={priceRange(item).max}
                        step="1"
                        value={item.unitPrice}
                        onChange={(e) => setItemPrice(item.product.id, Number(e.target.value))}
                        className="flex-1 accent-[#00897b]"
                        disabled={!priceRange(item).negotiable}
                      />
                      <input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => setItemPrice(item.product.id, Number(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-border-strong rounded-md text-sm text-right"
                      />
                      <button onClick={() => setEditingPriceId(null)} className="btn-outline text-xs px-2 py-1">Done</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingPriceId(item.product.id)} className="text-xs font-medium text-secondary hover:underline">
                      {priceRange(item).negotiable ? 'Adjust price' : 'Edit price'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">{t('customer')}</label>
            <div className="flex items-center gap-2">
              <select
                value={customerId}
                onChange={(e) => { setCustomerId(e.target.value); openQuickView(e.target.value); }}
                className="max-w-[160px] px-2 py-1.5 border border-border-strong rounded-md text-sm"
              >
                <option value="">{t('walkInCustomer')}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setAddCustomerOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline shrink-0">
                <UserPlus size={14} /> {t('addNewCustomer')}
              </button>
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
              className="flex-1 px-2 py-2 border border-border-strong rounded-md text-sm"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-32 px-2 py-2 border border-border-strong rounded-md text-sm text-right"
            />
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }} onClick={addPayment} className="btn-teal px-3">Add</motion.button>
          </div>
          {payments.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm py-1">
              <span className="capitalize text-muted-foreground">{PAYMENT_METHODS.find((m) => m.id === p.method)?.label ?? p.method}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{formatCurrency(p.amount)}</span>
                <button onClick={() => removePayment(idx)} className="text-danger text-xs">remove</button>
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
      <Modal open={!!receipt} title="Receipt" onClose={() => setReceipt(null)}>
        {receipt && (
          <div>
            <div className="text-center mb-4">
              <ReceiptText size={32} className="mx-auto text-secondary mb-2" />
              <p className="font-mono text-lg font-bold text-primary">{receipt.receiptNumber as string}</p>
            </div>
            <div className="border-t border-dashed border-border py-3 space-y-1">
              {(receipt.items as Array<{ quantity: number; unitPrice: number; total: number; product?: { name: string } }>).map((i, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{i.quantity} x {i.product?.name ?? 'Item'}</span>
                  <span className="font-medium">{formatCurrency(i.total)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-base font-bold pt-3">
              <span>Total</span>
              <span className="text-secondary">{formatCurrency(Number(receipt.grandTotal) || 0)}</span>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={shareWhatsApp} className="flex-1 btn-teal">Share via WhatsApp</button>
              <button onClick={shareEmail} className="flex-1 btn-outline">Email</button>
              <button onClick={() => window.print()} className="flex-1 btn-outline">Print</button>
            </div>
          </div>
        )}
      </Modal>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleScan} />

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
