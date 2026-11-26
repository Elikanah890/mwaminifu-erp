'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { useToast } from '@/components/Toast';
import { errorMessage } from '@/lib/format';
import { ExpenseCategory } from '@/lib/types';
import { Plus, X } from 'lucide-react';

export function categoryLabel(category: ExpenseCategory, locale: string): string {
  return locale === 'sw'
    ? category.nameSw || category.nameEn
    : category.nameEn || category.nameSw;
}

export default function ExpenseCategorySelect({
  shopId,
  value,
  onChange,
  categories,
  onCreated,
  disabled,
}: {
  shopId: string;
  value: string;
  onChange: (value: string) => void;
  categories: ExpenseCategory[];
  onCreated: (category: ExpenseCategory) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameSw, setNameSw] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!shopId || !nameEn.trim() || !nameSw.trim()) return;
    setSaving(true);
    try {
      const res = await apiClient.post<ExpenseCategory>(
        `/shops/${shopId}/expense-categories`,
        { nameEn: nameEn.trim(), nameSw: nameSw.trim() }
      );
      const created = res.data;
      if (created) {
        onCreated(created);
        onChange(created.value);
      }
      toast(t('categoryCreated'), 'success');
      setOpen(false);
      setNameEn('');
      setNameSw('');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field flex-1"
          disabled={disabled}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.value}>
              {categoryLabel(category, locale)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled || !shopId}
          className="btn-outline inline-flex items-center justify-center gap-1.5 text-sm shrink-0"
        >
          {open ? <X size={14} /> : <Plus size={14} />} {t('addCategory')}
        </button>
      </div>

      {open && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{t('categoryNameEn')}</label>
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="input-field"
                placeholder="Internet"
                maxLength={80}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{t('categoryNameSw')}</label>
              <input
                value={nameSw}
                onChange={(e) => setNameSw(e.target.value)}
                className="input-field"
                placeholder="Intaneti"
                maxLength={80}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-outline text-sm">
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || !nameEn.trim() || !nameSw.trim()}
              className="btn-navy text-sm"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
