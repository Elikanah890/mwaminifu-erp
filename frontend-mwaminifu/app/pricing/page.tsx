'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Minus, Sparkles, Store } from 'lucide-react';
import { useI18n } from '@/lib/context/I18nContext';
import { pricingPageText, commonText } from '@/lib/i18n/site';
import { usePublicPlans } from '@/lib/hooks/usePublicPlans';
import { formatCurrency } from '@/lib/format';
import MarketingHeader from '@/components/marketing/MarketingHeader';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PageHero from '@/components/marketing/PageHero';
import SectionHeader from '@/components/marketing/SectionHeader';
import { Skeleton } from '@/components/Spinner';
import { Reveal, Stagger, StaggerItem, motion as fm } from '@/components/motion';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function PricingPage() {
  const { locale } = useI18n();
  const copy = pricingPageText[locale];
  const common = commonText[locale];
  const { plans, loading } = usePublicPlans();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const highlightId = useMemo(() => {
    if (!plans.length) return null;
    return [...plans].sort((a, b) => b.price - a.price)[0].id;
  }, [plans]);

  const allFeatures = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const plan of plans) {
      for (const f of plan.features ?? []) {
        if (!seen.has(f)) {
          seen.add(f);
          out.push(f);
        }
      }
    }
    return out;
  }, [plans]);

  const basePrice = useMemo(() => (plans.length ? Math.min(...plans.map((p) => p.price)) : 0), [plans]);

  const multiShop = useMemo(
    () =>
      [1, 2, 3, 4, 5].map((shops) => {
        const paid = shops >= 3 ? shops - 1 : shops;
        return { shops, price: paid * basePrice, note: shops >= 3 ? `${shops} shops — 1 free` : `${shops} shop${shops > 1 ? 's' : ''}`, highlight: shops === 3 };
      }),
    [basePrice],
  );

  const cycleLabel = (cycle: string) => copy.billing[cycle] ?? copy.billing.MONTHLY;

  return (
    <div className="bg-background text-foreground">
      <MarketingHeader />

      <PageHero eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} align="center" />

      <section className="brand-container px-4 py-16 sm:px-6">
        {loading ? (
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="surface-card space-y-4 p-8">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <Reveal className="mx-auto max-w-xl">
            <div className="surface-card p-10 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-[#9a7b1f] dark:text-[#E3C25A]">
                <Sparkles size={26} />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">{copy.emptyTitle}</h2>
              <p className="mt-3 text-muted-foreground">{copy.emptyBody}</p>
              <Link href="/login" className="btn-gold mt-8 inline-flex px-6 py-3">
                {copy.emptyCta} <ArrowRight size={18} />
              </Link>
            </div>
          </Reveal>
        ) : (
          <>
            <Stagger className="mx-auto grid max-w-5xl gap-5" stagger={0.08}>
              <div className={`grid gap-5 ${plans.length === 1 ? 'mx-auto max-w-md' : plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                {plans.map((plan) => {
                  const featured = plan.id === highlightId && plans.length > 1;
                  return (
                    <StaggerItem key={plan.id}>
                      <fm.div
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className={`surface-card relative flex h-full flex-col p-8 ${featured ? 'border-accent ring-1 ring-accent/40' : ''}`}
                      >
                        {featured && (
                          <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-accent px-4 py-1 text-xs font-bold text-accent-foreground">
                            <Sparkles size={12} /> {common.mostPopular}
                          </span>
                        )}
                        <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{plan.description || '—'}</p>
                        <p className="mt-5 text-4xl font-semibold text-primary tabular-nums">
                          {formatCurrency(plan.price)}
                          <span className="text-base font-medium text-muted-foreground">/{cycleLabel(plan.billingCycle)}</span>
                        </p>
                        <ul className="mt-6 flex-1 space-y-3">
                          {(plan.features ?? []).map((feature) => (
                            <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                              <Check size={17} className="shrink-0 text-secondary" /> {feature}
                            </li>
                          ))}
                          {(plan.features ?? []).length === 0 && <li className="text-sm text-subtle-foreground">—</li>}
                        </ul>
                        <Link href="/login" className={`${featured ? 'btn-gold' : 'btn-outline'} mt-8 w-full`}>
                          {common.choosePlan}
                        </Link>
                      </fm.div>
                    </StaggerItem>
                  );
                })}
              </div>
            </Stagger>

            {allFeatures.length > 0 && (
              <section className="mt-20">
                <SectionHeader title={copy.comparisonTitle} align="center" className="mb-10" />
                <Reveal className="surface-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/80 text-left text-xs uppercase tracking-wider text-subtle-foreground backdrop-blur">
                          <th className="px-5 py-4 font-semibold">{copy.featureCol}</th>
                          {plans.map((plan) => (
                            <th key={plan.id} className="px-5 py-4 text-center font-semibold">
                              {plan.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allFeatures.map((feature) => (
                          <tr key={feature} className="border-b border-border transition-colors last:border-0 hover:bg-muted">
                            <td className="px-5 py-3.5 text-foreground">{feature}</td>
                            {plans.map((plan) => {
                              const has = (plan.features ?? []).includes(feature);
                              return (
                                <td key={plan.id} className="px-5 py-3.5 text-center">
                                  {has ? (
                                    <Check size={17} className="mx-auto text-secondary" aria-label={copy.included} />
                                  ) : (
                                    <Minus size={17} className="mx-auto text-subtle-foreground" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Reveal>
              </section>
            )}

            {basePrice > 0 && (
              <section className="mt-20">
                <SectionHeader title={copy.multishopTitle} subtitle={copy.multishopSubtitle} align="center" className="mb-10" />
                <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {multiShop.map((example) => (
                    <StaggerItem key={example.shops}>
                      <div
                        className={`relative flex h-full flex-col items-center justify-center rounded-2xl border p-5 text-center transition-shadow hover:shadow-md ${
                          example.highlight ? 'border-accent bg-accent/10 ring-1 ring-accent/40' : 'border-border bg-card'
                        }`}
                      >
                        <div className="mb-3 flex gap-0.5">
                          {Array.from({ length: example.shops }).map((_, i) => (
                            <Store key={i} size={14} className={example.highlight ? 'text-[#9a7b1f] dark:text-[#E3C25A]' : 'text-secondary'} />
                          ))}
                        </div>
                        <p className="text-lg font-semibold text-foreground tabular-nums">{formatCurrency(example.price)}</p>
                        <p className={`mt-2 text-xs font-semibold ${example.highlight ? 'text-[#9a7b1f] dark:text-[#E3C25A]' : 'text-muted-foreground'}`}>
                          {example.note}
                        </p>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}
          </>
        )}
      </section>

      <section className="border-t border-border bg-muted/50 py-16 sm:py-24">
        <div className="brand-container max-w-3xl px-4 sm:px-6">
          <SectionHeader title={copy.faqTitle} align="center" className="mb-8" />
          <div className="space-y-3">
            {copy.faqs.map((faq, index) => (
              <div key={faq.q} className="surface-card overflow-hidden">
                <button
                  className="flex w-full items-center justify-between p-5 text-left font-semibold text-foreground"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  {faq.q}
                  <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <fm.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-muted-foreground">{faq.a}</p>
                    </fm.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="brand-container px-4 sm:px-6">
          <Reveal>
            <div className="navy-panel relative overflow-hidden rounded-3xl p-10 text-center sm:p-14">
              <div className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:linear-gradient(to_right,rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:40px_40px]" />
              <div className="relative">
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">{copy.contactTitle}</h2>
                <p className="mx-auto mt-4 max-w-xl text-white/70">{copy.contactSubtitle}</p>
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
