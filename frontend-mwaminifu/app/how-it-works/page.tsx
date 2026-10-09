'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Phone,
  Rocket,
  Smartphone,
  UserCheck,
  Users,
} from 'lucide-react';
import { useI18n } from '@/lib/context/I18nContext';
import { howPageText, commonText } from '@/lib/i18n/site';
import MarketingHeader from '@/components/marketing/MarketingHeader';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PageHero from '@/components/marketing/PageHero';
import { Reveal } from '@/components/motion';

const STEP_ICONS = [UserCheck, Building2, Smartphone, Users, CreditCard, Rocket];
const EASE = [0.16, 1, 0.3, 1] as const;

function StepVisual({ index }: { index: number }) {
  if (index === 0)
    return (
      <div className="rounded-xl border border-border bg-muted p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <Phone size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">AGAC Agent</p>
            <p className="text-xs text-muted-foreground">+255 784 815 686</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-secondary/10 px-3 py-2 text-xs font-semibold text-secondary">
          {('Visit booked for tomorrow, 9:00am')}
        </div>
      </div>
    );
  if (index === 1)
    return (
      <div className="space-y-2 rounded-xl border border-border bg-muted p-4 text-sm">
        {[
          ['Shop name', 'Mama Asha Store'],
          ['Category', 'Grocery'],
          ['Location', 'Kariakoo, Dar'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-lg bg-card px-3 py-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs font-semibold text-foreground">{value}</span>
          </div>
        ))}
      </div>
    );
  if (index === 2)
    return (
      <div className="rounded-xl border border-border bg-muted p-4">
        <p className="mb-2 text-xs text-muted-foreground">Enter the 6-digit code</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((d) => (
            <span key={d} className="flex h-9 flex-1 items-center justify-center rounded-lg bg-card text-sm font-semibold text-foreground">
              •
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-success">
          <CheckCircle2 size={13} /> {('Phone verified')}
        </div>
      </div>
    );
  if (index === 3)
    return (
      <div className="space-y-2 rounded-xl border border-border bg-muted p-4">
        {['Cashier', 'Store keeper', 'Manager'].map((role, i) => (
          <div key={role} className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {role.slice(0, 1)}
            </span>
            <span className="text-xs font-medium text-foreground">{role}</span>
            <span className="ml-auto rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] text-secondary">
              {['POS', 'Stock', 'Full'][i]}
            </span>
          </div>
        ))}
      </div>
    );
  if (index === 4)
    return (
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted p-4">
        <div className="rounded-lg bg-card p-3">
          <p className="text-xs text-muted-foreground">Basic</p>
          <p className="text-sm font-semibold text-foreground">5,000</p>
        </div>
        <div className="rounded-lg border border-accent bg-accent/10 p-3">
          <p className="text-xs text-muted-foreground">Premium</p>
          <p className="text-sm font-semibold text-foreground">8,000</p>
        </div>
        <div className="col-span-2 rounded-lg bg-success/10 px-3 py-2 text-center text-xs font-semibold text-success">
          {('Payment received via M-Pesa')}
        </div>
      </div>
    );
  return (
    <div className="rounded-xl border border-border bg-muted p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Receipt #1042</span>
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-success">{('Paid')}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Total</span>
        <span className="text-lg font-semibold text-primary tabular-nums">TZS 18,500</span>
      </div>
      <div className="mt-3 rounded-lg bg-secondary/10 px-3 py-2 text-center text-xs font-semibold text-secondary">
        {('First sale recorded')}
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  const { locale } = useI18n();
  const copy = howPageText[locale];
  const common = commonText[locale];

  return (
    <div className="bg-background text-foreground">
      <MarketingHeader />

      <PageHero eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} align="center" />

      <section className="brand-container max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="relative">
          <div className="absolute bottom-0 left-[19px] top-2 w-px bg-border sm:left-[23px]" />
          <div className="space-y-8">
            {copy.steps.map((step, index) => {
              const Icon = STEP_ICONS[index];
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, ease: EASE, delay: index * 0.05 }}
                  className="relative flex gap-5 sm:gap-7"
                >
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground sm:h-12 sm:w-12">
                    {index + 1}
                  </div>
                  <div className="surface-card flex-1 p-6">
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                        <Icon size={22} />
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">{step.title}</h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <StepVisual index={index} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/50 py-16 sm:py-24">
        <div className="brand-container px-4 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-primary p-10 text-center text-primary-foreground sm:p-14">
              <div className="gradient-mesh pointer-events-none absolute inset-0 opacity-40" />
              <div className="relative">
                <h2 className="text-3xl font-semibold sm:text-4xl">{copy.ctaTitle}</h2>
                <p className="mx-auto mt-4 max-w-xl text-white/70">{copy.ctaSubtitle}</p>
                <Link href="/login" className="btn-gold mt-8 inline-flex px-6 py-3">
                  {common.findAgent} <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
