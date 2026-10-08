'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Package,
  Receipt,
  ShoppingCart,
  Sparkles,
  Store,
  UserCog,
  Users,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { useI18n } from '@/lib/context/I18nContext';
import { homeText } from '@/lib/i18n/home';
import { pricingPageText, commonText } from '@/lib/i18n/site';
import { usePublicPlans } from '@/lib/hooks/usePublicPlans';
import { formatCurrency } from '@/lib/format';
import MarketingHeader from '@/components/marketing/MarketingHeader';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import SectionHeader from '@/components/marketing/SectionHeader';
import { Skeleton } from '@/components/Spinner';
import { AnimatedNumber, Reveal, Stagger, StaggerItem } from '@/components/motion';

const featureIcons = [ShoppingCart, Package, Users, BarChart3, Wallet, UserCog, Store, WifiOff];
const EASE = [0.16, 1, 0.3, 1] as const;

function TealSparkline() {
  return (
    <svg viewBox="0 0 300 90" className="h-24 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0fa7a7" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0fa7a7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: EASE, delay: 0.4 }}
        d="M0,72 C24,66 40,58 64,60 C88,62 104,44 128,42 C152,40 168,52 192,40 C216,28 232,16 260,20 C278,23 290,14 300,10"
        fill="none"
        stroke="#17b8b8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M0,72 C24,66 40,58 64,60 C88,62 104,44 128,42 C152,40 168,52 192,40 C216,28 232,16 260,20 C278,23 290,14 300,10 L300,90 L0,90 Z"
        fill="url(#heroSpark)"
      />
    </svg>
  );
}

export default function HomePage() {
  const { locale } = useI18n();
  const copy = homeText[locale];
  const common = commonText[locale];
  const { plans, loading: plansLoading } = usePublicPlans();
  const highlightPlanId = plans.length > 1 ? [...plans].sort((a, b) => b.price - a.price)[0].id : null;
  const cycleLabel = (cycle: string) => pricingPageText[locale].billing[cycle] ?? pricingPageText[locale].billing.MONTHLY;
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <main className="bg-background text-foreground">
      <MarketingHeader />

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        <motion.div style={{ y: parallaxY }} className="gradient-mesh pointer-events-none absolute inset-0" />
        <div className="brand-container relative grid items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <Stagger className="max-w-xl" stagger={0.12}>
            <StaggerItem>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-semibold text-secondary backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" /> Mwaminifu APP ERP
              </span>
            </StaggerItem>
            <StaggerItem>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">{copy.heroTitle}</h1>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">{copy.heroSubtitle}</p>
            </StaggerItem>
            <StaggerItem>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                  <Link href="/login" className="btn-gold px-6 py-3 shadow-lg shadow-[#d4af37]/20">
                    {copy.getStarted} <ArrowRight size={18} />
                  </Link>
                </motion.div>
                <motion.a whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }} href="#features" className="btn-outline px-6 py-3">
                  {copy.watchDemo}
                </motion.a>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="mt-8 flex flex-wrap gap-3">
                {[copy.badgeOffline, copy.badgeLang, copy.badgeDevices].map((badge) => (
                  <span key={badge} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 size={16} className="text-secondary" /> {badge}
                  </span>
                ))}
              </div>
            </StaggerItem>
          </Stagger>

          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.15 }} className="relative">
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }} className="navy-panel relative overflow-hidden rounded-3xl p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/60">{locale === 'sw' ? 'Mapato Leo' : 'Today’s Revenue'}</p>
                  <p className="mt-1 text-4xl font-bold tabular-nums text-[#d4af37]">
                    TZS <AnimatedNumber value={850000} decimals={0} />
                  </p>
                </div>
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-[#5eead4]">+12.5%</span>
              </div>
              <div className="mt-2">
                <TealSparkline />
              </div>
              <p className="mt-1 text-xs text-white/50">{locale === 'sw' ? 'Ikilinganishwa na jana' : 'Compared to yesterday'}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/5 p-3.5">
                  <p className="text-xs text-white/50">{locale === 'sw' ? 'Thamani ya Stoo' : 'Stock Value'}</p>
                  <p className="mt-1 font-semibold text-white tabular-nums">TZS 8.4M</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3.5">
                  <p className="text-xs text-white/50">{locale === 'sw' ? 'Deni la Wateja' : 'Customer Credit'}</p>
                  <p className="mt-1 font-semibold text-[#fca5a5] tabular-nums">TZS 620K</p>
                </div>
              </div>
            </motion.div>
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-secondary/10 blur-3xl" />
          </motion.div>
        </div>
      </section>

      {/* Trust band */}
      <section className="navy-panel border-y border-white/10">
        <div className="brand-container px-4 py-10 sm:px-6">
          <Reveal className="text-center">
            <p className="text-sm font-semibold text-white/60">{copy.trustedBy}</p>
          </Reveal>
          <Stagger className="mt-7 grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { value: 1240, suffix: '+', label: locale === 'sw' ? 'Biashara Hai' : 'Active Businesses', icon: Building2 },
              { value: 3860, suffix: '+', label: locale === 'sw' ? 'Maduka' : 'Total Shops', icon: Store },
              { value: 2.1, suffix: 'M+', decimals: 1, label: locale === 'sw' ? 'Miamala' : 'Transactions', icon: Receipt },
            ].map((stat) => (
              <StaggerItem key={stat.label} className="flex flex-col items-center gap-1 px-6 py-4">
                <stat.icon size={20} className="mb-1 text-[#5eead4]" />
                <p className="text-3xl font-bold text-[#d4af37] tabular-nums">
                  <AnimatedNumber value={stat.value} decimals={stat.decimals ?? 0} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-white/60">{stat.label}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Features menu grid */}
      <section id="features" className="py-16 sm:py-24">
        <div className="brand-container px-4 sm:px-6">
          <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeader eyebrow={copy.navFeatures} title={copy.featuresTitle} subtitle={copy.featuresSubtitle} />
            <Reveal>
              <Link href="/features" className="btn-outline shrink-0">
                {common.seeAllFeatures} <ArrowRight size={16} />
              </Link>
            </Reveal>
          </div>
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" stagger={0.05}>
            {copy.features.map((feature, index) => {
              const Icon = featureIcons[index];
              return (
                <StaggerItem key={feature.title}>
                  <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="tile flex h-full flex-col items-center gap-3 p-5 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                      <Icon size={22} />
                    </span>
                    <span className="text-sm font-semibold text-foreground">{feature.title}</span>
                    <span className="text-[11px] text-muted-foreground line-clamp-2">{feature.desc}</span>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* How it works preview */}
      <section id="how" className="bg-muted/50 py-16 sm:py-24">
        <div className="brand-container grid items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <p className="section-eyebrow mb-3">{copy.navHow}</p>
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{copy.howTitle}</h2>
            <p className="mt-4 text-muted-foreground">{copy.howSubtitle}</p>
            <Link href="/how-it-works" className="btn-teal mt-8 inline-flex">
              {common.learnMore} <ArrowRight size={16} />
            </Link>
          </Reveal>
          <Stagger className="space-y-4" stagger={0.1}>
            {copy.steps.map((step, index) => (
              <StaggerItem key={step.title}>
                <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }} className="surface-card flex gap-4 p-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">{index + 1}</span>
                  <div>
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="py-16 sm:py-24">
        <div className="brand-container px-4 sm:px-6">
          <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeader eyebrow={copy.navPricing} title={copy.pricingTitle} subtitle={copy.pricingSubtitle} />
            <Reveal>
              <Link href="/pricing" className="btn-outline shrink-0">
                {common.seeFullPricing} <ArrowRight size={16} />
              </Link>
            </Reveal>
          </div>

          {plansLoading ? (
            <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="surface-card space-y-4 p-8">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-10 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
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
                <h2 className="text-2xl font-semibold text-foreground">{pricingPageText[locale].emptyTitle}</h2>
                <p className="mt-3 text-muted-foreground">{pricingPageText[locale].emptyBody}</p>
                <Link href="/login" className="btn-gold mt-8 inline-flex px-6 py-3">
                  {pricingPageText[locale].emptyCta} <ArrowRight size={18} />
                </Link>
              </div>
            </Reveal>
          ) : (
            <div className={`mx-auto grid gap-5 ${plans.length === 1 ? 'max-w-md' : plans.length === 2 ? 'max-w-4xl md:grid-cols-2' : 'max-w-5xl md:grid-cols-2 lg:grid-cols-3'}`}>
              {plans.slice(0, 3).map((plan) => {
                const featured = plan.id === highlightPlanId;
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className={`surface-card relative flex flex-col p-8 ${featured ? 'border-accent ring-1 ring-accent/40' : ''}`}
                  >
                    {featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-bold text-accent-foreground">{common.mostPopular}</span>}
                    <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description || '—'}</p>
                    <p className="mt-4 text-4xl font-semibold text-primary tabular-nums">
                      {formatCurrency(plan.price)}
                      <span className="text-base font-medium text-muted-foreground">/{cycleLabel(plan.billingCycle)}</span>
                    </p>
                    <ul className="mt-6 flex-1 space-y-3">
                      {(plan.features ?? []).slice(0, 5).map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                          <CheckCircle2 size={17} className="text-secondary" /> {feature}
                        </li>
                      ))}
                    </ul>
                    <Link href="/login" className={`${featured ? 'btn-gold' : 'btn-outline'} mt-8 w-full`}>
                      {common.choosePlan}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/50 py-16 sm:py-24">
        <div className="brand-container px-4 sm:px-6">
          <SectionHeader eyebrow="Testimonials" title={copy.testimonialsTitle} subtitle={copy.testimonialsSubtitle} className="mb-12" />
          <Stagger className="grid gap-4 md:grid-cols-3" stagger={0.08}>
            {copy.testimonials.map((item) => (
              <StaggerItem key={item.name}>
                <motion.figure whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="surface-card h-full p-6">
                  <blockquote className="text-foreground">“{item.quote}”</blockquote>
                  <figcaption className="mt-5 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">{item.name}</span> · {item.meta}
                  </figcaption>
                </motion.figure>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24">
        <div className="brand-container px-4 sm:px-6">
          <Reveal>
            <div className="navy-panel relative overflow-hidden rounded-3xl p-10 sm:p-14">
              <div className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:linear-gradient(to_right,rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:40px_40px]" />
              <div className="relative">
                <h2 className="max-w-2xl text-3xl font-semibold text-white sm:text-4xl">{copy.finalTitle}</h2>
                <p className="mt-4 max-w-xl text-white/70">{copy.finalSubtitle}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                    <Link href="/login" className="btn-gold px-6 py-3">
                      {copy.findAgent}
                    </Link>
                  </motion.div>
                  <Link href="/about" className="rounded-[10px] border border-white/25 px-6 py-3 font-semibold text-white transition-brand hover:bg-white/10">
                    {copy.contactUs}
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
