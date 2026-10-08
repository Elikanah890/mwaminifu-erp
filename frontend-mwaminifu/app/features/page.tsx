'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Package,
  ShoppingCart,
  UserCog,
  Users,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { useI18n } from '@/lib/context/I18nContext';
import { featuresPageText, commonText } from '@/lib/i18n/site';
import MarketingHeader from '@/components/marketing/MarketingHeader';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PageHero from '@/components/marketing/PageHero';
import FeatureVisual from '@/components/marketing/FeatureVisual';
import { Reveal } from '@/components/motion';

const ICONS: Record<string, typeof ShoppingCart> = {
  pos: ShoppingCart,
  inventory: Package,
  customers: Users,
  reports: BarChart3,
  finance: Wallet,
  employees: UserCog,
  multishop: Building2,
  offline: WifiOff,
};

export default function FeaturesPage() {
  const { locale } = useI18n();
  const copy = featuresPageText[locale];
  const common = commonText[locale];

  return (
    <div className="bg-background text-foreground">
      <MarketingHeader />

      <PageHero eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />

      <div className="brand-container space-y-20 px-4 py-16 sm:px-6 sm:py-24">
        {copy.items.map((item, index) => {
          const Icon = ICONS[item.key] ?? ShoppingCart;
          const reverse = index % 2 === 1;
          return (
            <section key={item.key} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal className={reverse ? 'lg:order-2' : ''}>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                  <Icon size={24} />
                </div>
                <p className="section-eyebrow mb-2">
                  {String(index + 1).padStart(2, '0')} / {String(copy.items.length).padStart(2, '0')}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{item.title}</h2>
                <p className="mt-3 text-muted-foreground">{item.desc}</p>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 size={15} className="shrink-0 text-secondary" /> {bullet}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-brand hover:gap-2.5">
                  {common.seeFullPricing} <ArrowRight size={15} />
                </Link>
              </Reveal>
              <Reveal delay={0.1} className={reverse ? 'lg:order-1' : ''}>
                <FeatureVisual kind={item.key} />
              </Reveal>
            </section>
          );
        })}
      </div>

      <section className="border-t border-border bg-muted/50 py-16 sm:py-24">
        <div className="brand-container px-4 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-primary p-10 text-primary-foreground sm:p-14">
              <div className="gradient-mesh pointer-events-none absolute inset-0 opacity-40" />
              <div className="relative max-w-2xl">
                <h2 className="text-3xl font-semibold sm:text-4xl">{copy.ctaTitle}</h2>
                <p className="mt-4 text-white/70">{copy.ctaSubtitle}</p>
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
