'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  Flag,
  Globe,
  HeartHandshake,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WifiOff,
} from 'lucide-react';
import { useI18n } from '@/lib/context/I18nContext';
import { aboutPageText, commonText } from '@/lib/i18n/site';
import MarketingHeader from '@/components/marketing/MarketingHeader';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import SectionHeader from '@/components/marketing/SectionHeader';
import PageHero from '@/components/marketing/PageHero';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';

const DIFFERENT_ICONS = [Flag, WifiOff, Globe, Sparkles];
const VALUE_ICONS = [ShieldCheck, Sparkles, TrendingUp, HeartHandshake];
const CONTACT_ICONS = [Phone, Mail, MessageCircle];
const EASE = [0.16, 1, 0.3, 1] as const;

export default function AboutPage() {
  const { locale } = useI18n();
  const copy = aboutPageText[locale];
  const common = commonText[locale];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="bg-background text-foreground">
      <MarketingHeader />

      <PageHero eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />

      <section className="brand-container px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="section-eyebrow mb-3">{copy.missionTitle}</p>
              <p className="text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">{copy.missionBody}</p>
            </div>
            <Stagger className="space-y-3 self-center" stagger={0.1}>
              {copy.missionPoints.map((point) => (
                <StaggerItem key={point}>
                  <div className="surface-card flex items-center gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                      <ShieldCheck size={18} />
                    </span>
                    <span className="text-sm font-medium text-foreground">{point}</span>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Reveal>
      </section>

      <section className="border-y border-border bg-muted/50 py-16 sm:py-24">
        <div className="brand-container px-4 sm:px-6">
          <SectionHeader title={copy.storyTitle} subtitle={copy.storySubtitle} className="mb-12" />
          <div className="relative">
            <div className="absolute bottom-2 left-[15px] top-2 w-px bg-border sm:left-[19px]" />
            <div className="space-y-8">
              {copy.milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.year}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, ease: EASE, delay: index * 0.06 }}
                  className="relative flex gap-5 sm:gap-7"
                >
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground sm:h-10 sm:w-10 sm:text-xs">
                    {milestone.year}
                  </span>
                  <div className="surface-card flex-1 p-5">
                    <h3 className="font-semibold text-foreground">{milestone.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{milestone.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="brand-container px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeader title={copy.differentTitle} subtitle={copy.differentSubtitle} className="mb-10" />
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.07}>
          {copy.different.map((item, index) => {
            const Icon = DIFFERENT_ICONS[index];
            return (
              <StaggerItem key={item.title}>
                <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.2 }} className="surface-card h-full p-6">
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                    <Icon size={22} />
                  </span>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      <section className="border-y border-border bg-muted/50 py-16 sm:py-24">
        <div className="brand-container px-4 sm:px-6">
          <SectionHeader title={copy.valuesTitle} subtitle={copy.valuesSubtitle} className="mb-10" />
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.07}>
            {copy.values.map((item, index) => {
              const Icon = VALUE_ICONS[index];
              return (
                <StaggerItem key={item.title}>
                  <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.2 }} className="surface-card h-full p-6">
                    <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-[#9a7b1f] dark:text-[#E3C25A]">
                      <Icon size={22} />
                    </span>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      <section className="brand-container px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeader title={copy.contactTitle} subtitle={copy.contactSubtitle} align="center" className="mb-10" />
        <Stagger className="grid gap-4 sm:grid-cols-3" stagger={0.08}>
          {copy.contact.map((item, index) => {
            const Icon = CONTACT_ICONS[index];
            return (
              <StaggerItem key={item.channel}>
                <a href="#" className="surface-card block h-full p-6 text-center transition-shadow hover:shadow-lg">
                  <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                    <Icon size={22} />
                  </span>
                  <p className="text-sm font-semibold text-muted-foreground">{item.channel}</p>
                  <p className="mt-1 font-semibold text-foreground">{item.value}</p>
                  <p className="mt-1 text-xs text-subtle-foreground">{item.note}</p>
                </a>
              </StaggerItem>
            );
          })}
        </Stagger>
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
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-muted-foreground">{faq.a}</p>
                    </motion.div>
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
            <div className="relative overflow-hidden rounded-3xl bg-primary p-10 text-center text-primary-foreground sm:p-14">
              <div className="gradient-mesh pointer-events-none absolute inset-0 opacity-40" />
              <div className="relative">
                <h2 className="text-3xl font-semibold sm:text-4xl">
                  {locale === 'sw' ? 'Tuanze na biashara yako' : 'Let us start with your business'}
                </h2>
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
