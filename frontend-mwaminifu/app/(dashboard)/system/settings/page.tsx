'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonCard } from '@/components/Spinner';
import { Stagger, StaggerItem, motion } from '@/components/motion';
import { useToast } from '@/components/Toast';

interface SettingField {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'select';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface SettingSection {
  title: string;
  description: string;
  fields: SettingField[];
}

const SECTIONS: SettingSection[] = [
  {
    title: 'General Settings',
    description: 'Platform identity and defaults',
    fields: [
      { key: 'appName', label: 'App Name', description: 'Displayed across the platform', type: 'text', placeholder: 'Mwaminifu ERP' },
      {
        key: 'language',
        label: 'Default Language',
        description: 'Default interface language',
        type: 'select',
        options: [
          { value: 'sw', label: 'Swahili' },
          { value: 'en', label: 'English' },
        ],
      },
      {
        key: 'currency',
        label: 'Currency',
        description: 'Default currency code',
        type: 'select',
        options: [
          { value: 'TZS', label: 'TZS' },
          { value: 'KES', label: 'KES' },
          { value: 'UGX', label: 'UGX' },
          { value: 'USD', label: 'USD' },
        ],
      },
    ],
  },
  {
    title: 'Subscription Settings',
    description: 'Plan pricing and grace-period rules',
    fields: [
      { key: 'basicPrice', label: 'Basic Plan Price (TZS)', description: 'Monthly Basic plan price', type: 'number', placeholder: '5000' },
      { key: 'premiumPrice', label: 'Premium Plan Price (TZS)', description: 'Monthly Premium plan price', type: 'number', placeholder: '8000' },
      { key: 'gracePeriodDays', label: 'Grace Period (days)', description: 'Days before a lapsed subscription is deactivated', type: 'number', placeholder: '5' },
      { key: 'maxShopsPerOwner', label: 'Max Shops per Owner', description: 'Maximum shops a business owner can create', type: 'number', placeholder: '5' },
    ],
  },
  {
    title: 'Agent Settings',
    description: 'Agent network configuration',
    fields: [
      { key: 'maxAgents', label: 'Max Agents', description: 'Maximum number of agents', type: 'number', placeholder: '50' },
      { key: 'commissionRate', label: 'Commission Rate (%)', description: 'Agent commission as a percentage', type: 'number', placeholder: '5' },
      { key: 'agentCodePrefix', label: 'Agent Code Prefix', description: 'Prefix used for agent codes', type: 'text', placeholder: 'AGAC-' },
    ],
  },
  {
    title: 'Demo Accounts',
    description: 'Demo account configuration',
    fields: [
      { key: 'demoAccountsCount', label: 'Number of Demo Accounts', description: 'Active demo accounts', type: 'number', placeholder: '3' },
      {
        key: 'demoAutoResetFrequency',
        label: 'Auto-Reset Frequency',
        description: 'How often demo data is reset',
        type: 'select',
        options: [
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ],
      },
    ],
  },
  {
    title: 'Payment Settings',
    description: 'Payment aggregator integration',
    fields: [
      {
        key: 'paymentAggregator',
        label: 'Payment Aggregator',
        description: 'Provider used to collect subscription payments',
        type: 'select',
        options: [
          { value: 'clickpesa', label: 'ClickPesa' },
          { value: 'mpesa', label: 'Vodacom M-Pesa' },
          { value: 'tigopesa', label: 'Tigo Pesa' },
          { value: 'airtel', label: 'Airtel Money' },
        ],
      },
      { key: 'webhookUrl', label: 'Webhook URL', description: 'Payment callback endpoint', type: 'text', placeholder: 'https://api.agac.com/webhook' },
    ],
  },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<{ settings: Record<string, unknown> }>('/admin/settings');
      if (res.data?.settings) setValues(res.data.settings);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setValue = (key: string, v: unknown) => setValues((prev) => ({ ...prev, [key]: v }));

  const saveSection = async (e: React.FormEvent, section: SettingSection) => {
    e.preventDefault();
    setSavingSection(section.title);
    setError('');
    try {
      const body: Record<string, unknown> = {};
      for (const f of section.fields) {
        const raw = values[f.key];
        if (f.type === 'number') body[f.key] = raw === '' || raw === undefined || raw === null ? 0 : Number(raw) || 0;
        else body[f.key] = typeof raw === 'string' ? raw : String(raw ?? '');
      }
      await apiClient.put('/admin/settings', body);
      toast(`${section.title} saved`);
      await load();
    } catch (err) {
      toast(errorMessage(err), 'error');
      setError(errorMessage(err));
    } finally {
      setSavingSection(null);
    }
  };

  if (loading)
    return (
      <PageWrapper title="Settings">
        <div className="space-y-6 max-w-3xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} rows={3} />
          ))}
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper title="Settings" description="Platform-wide configuration. Changes are applied immediately and audited." breadcrumb={['System', 'Settings']}>
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <Stagger className="space-y-6 max-w-3xl">
        {SECTIONS.map((section) => {
          const isSaving = savingSection === section.title;
          return (
            <StaggerItem key={section.title}>
            <form onSubmit={(e) => saveSection(e, section)} className="surface-card">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-primary">{section.title}</h2>
                <p className="text-xs text-subtle-foreground">{section.description}</p>
              </div>
              <div className="divide-y divide-border">
                {section.fields.map((f) => (
                  <div key={f.key} className="px-6 py-4">
                    <label className="block text-sm font-semibold text-foreground mb-1">{f.label}</label>
                    <p className="text-xs text-subtle-foreground mb-2">{f.description}</p>
                    {f.type === 'select' ? (
                      <select className="input-field w-full" value={String(values[f.key] ?? '')} onChange={(e) => setValue(f.key, e.target.value)}>
                        <option value="">Select…</option>
                        {(f.options ?? []).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input-field w-full"
                        type={f.type}
                        placeholder={f.placeholder}
                        value={f.type === 'number' ? (values[f.key] == null ? '' : String(values[f.key])) : String(values[f.key] ?? '')}
                        onChange={(e) => setValue(f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end">
                <motion.button
                  type="submit"
                  disabled={isSaving}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="btn-navy inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {isSaving && <span className="inline-block w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />}
                  {isSaving ? 'Saving...' : `Save ${section.title}`}
                </motion.button>
              </div>
            </form>
            </StaggerItem>
          );
        })}
      </Stagger>
    </PageWrapper>
  );
}
