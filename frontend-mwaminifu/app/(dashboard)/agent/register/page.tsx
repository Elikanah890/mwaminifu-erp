'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import PageWrapper from '@/components/PageWrapper';
import { Input, Select, SubmitButton } from '@/components/form';
import { Reveal, Stagger, StaggerItem, motion } from '@/components/motion';
import { useToast } from '@/components/Toast';

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

type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Owner Information' },
  { n: 2, label: 'Shop & Location' },
  { n: 3, label: 'Review & Confirm' },
];

export default function RegisterBusinessPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ name: string; shopName: string; location: string } | null>(null);

  const [owner, setOwner] = useState({ name: '', phone: '', email: '' });
  const [shop, setShop] = useState({ shopName: '', category: '', region: '', district: '', ward: '', street: '' });

  const ownerValid = owner.name.trim() && owner.phone.trim();
  const shopValid = shop.shopName.trim();

  const location = [shop.street, shop.ward, shop.district, shop.region].filter(Boolean).join(', ');

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        phone: owner.phone.trim(),
        name: owner.name.trim(),
        shopName: shop.shopName.trim(),
      };
      if (owner.email.trim()) payload.email = owner.email.trim();
      if (location) payload.shopAddress = location;
      if (shop.category) payload.businessCategory = shop.category;
      if (shop.region) payload.region = shop.region;
      if (shop.district) payload.district = shop.district;
      if (shop.ward) payload.ward = shop.ward;
      if (shop.street) payload.street = shop.street;

      await apiClient.post('/agents/onboard', payload);
      setDone({ name: owner.name.trim(), shopName: shop.shopName.trim(), location });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to register business', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <PageWrapper title="Register Business" breadcrumb={['Agent', 'Register Business']}>
        <Reveal className="max-w-xl mx-auto surface-card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary/10 text-secondary flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
          <h2 className="text-xl font-bold text-primary mb-2">Account Created Successfully!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            <strong>{done.name}</strong> — {done.shopName}
            {done.location ? ` · ${done.location}` : ''}
          </p>
          <div className="bg-muted rounded-lg p-4 text-left text-sm text-muted-foreground mb-6">
            The owner will receive an SMS on their phone. Guide them to download the app and complete activation.
          </div>
          <div className="flex gap-3">
            <Link href="/agent/dashboard" className="btn-navy flex-1">
              Go to Dashboard
            </Link>
            <button
              onClick={() => {
                setDone(null);
                setStep(1);
                setOwner({ name: '', phone: '', email: '' });
                setShop({ shopName: '', category: '', region: '', district: '', ward: '', street: '' });
              }}
              className="btn-outline flex-1"
            >
              Register Another
            </button>
          </div>
        </Reveal>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Register Business" description="Onboard a new business owner" breadcrumb={['Agent', 'Register Business']}>
      <Reveal className="max-w-2xl mx-auto">
        <Stagger className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <StaggerItem key={s.n} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === s.n ? 'bg-primary text-primary-foreground' : step > s.n ? 'bg-secondary text-white' : 'bg-muted-2 text-muted-foreground'
                }`}
              >
                {step > s.n ? '✓' : s.n}
              </div>
              <span className={`text-sm ${step === s.n ? 'font-semibold text-primary' : 'text-subtle-foreground'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="w-8 h-px bg-border" />}
            </StaggerItem>
          ))}
        </Stagger>

        <div className="surface-card p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-primary">Owner Information</h3>
              <Input label="Full Name" required value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} placeholder="Full name" />
              <Input label="Phone Number" required hint="The owner will receive an SMS on this number" value={owner.phone} onChange={(e) => setOwner({ ...owner, phone: e.target.value })} placeholder="255XXXXXXXXX" inputMode="tel" />
              <Input label="Email" type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} placeholder="email@example.com" />
              <div className="flex justify-end">
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-navy" disabled={!ownerValid} onClick={() => setStep(2)}>
                  Continue
                </motion.button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-primary">Shop & Location</h3>
              <Input label="Shop Name" required value={shop.shopName} onChange={(e) => setShop({ ...shop, shopName: e.target.value })} placeholder="Business name" />
              <Select label="Business Category" value={shop.category} onChange={(e) => setShop({ ...shop, category: e.target.value })}>
                <option value="">Select a category</option>
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Region" value={shop.region} onChange={(e) => setShop({ ...shop, region: e.target.value })}>
                  <option value="">Select region</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
                <Input label="District" value={shop.district} onChange={(e) => setShop({ ...shop, district: e.target.value })} placeholder="District" />
                <Input label="Ward" value={shop.ward} onChange={(e) => setShop({ ...shop, ward: e.target.value })} placeholder="Ward" />
                <Input label="Street" value={shop.street} onChange={(e) => setShop({ ...shop, street: e.target.value })} placeholder="Street" />
              </div>
              <div className="flex justify-between">
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-outline" onClick={() => setStep(1)}>
                  Back
                </motion.button>
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-navy" disabled={!shopValid} onClick={() => setStep(3)}>
                  Continue
                </motion.button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-primary">Review & Confirm</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border pb-2"><dt className="text-muted-foreground">Owner Name</dt><dd className="font-medium">{owner.name}</dd></div>
                <div className="flex justify-between border-b border-border pb-2"><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{owner.phone}</dd></div>
                <div className="flex justify-between border-b border-border pb-2"><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{owner.email || '-'}</dd></div>
                <div className="flex justify-between border-b border-border pb-2"><dt className="text-muted-foreground">Shop Name</dt><dd className="font-medium">{shop.shopName}</dd></div>
                <div className="flex justify-between border-b border-border pb-2"><dt className="text-muted-foreground">Category</dt><dd className="font-medium">{shop.category || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Location</dt><dd className="font-medium">{location || '-'}</dd></div>
              </dl>
              <div className="flex justify-between pt-2">
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-outline" onClick={() => setStep(2)}>
                  Back
                </motion.button>
                <SubmitButton loading={submitting} onClick={submit} type="button">
                  Confirm & Create
                </SubmitButton>
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </PageWrapper>
  );
}
