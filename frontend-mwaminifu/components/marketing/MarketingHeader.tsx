'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useI18n } from '@/lib/context/I18nContext';
import { navText } from '@/lib/i18n/site';
import ThemeToggle from '@/components/theme-toggle';
import InstallButton from '@/components/pwa/InstallButton';
import BrandMark from '@/components/marketing/BrandMark';

const EASE = [0.16, 1, 0.3, 1] as const;

const LINKS = [
  { href: '/', key: 'home' as const },
  { href: '/features', key: 'features' as const },
  { href: '/pricing', key: 'pricing' as const },
  { href: '/how-it-works', key: 'how' as const },
  { href: '/about', key: 'about' as const },
];

export default function MarketingHeader() {
  const { locale, setLocale } = useI18n();
  const pathname = usePathname();
  const copy = navText[locale];
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-sidebar text-white">
      <div className="brand-container flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Home" title={copy.home}>
          <BrandMark onDark />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className="group relative py-1">
                <span className={active ? 'text-white' : 'text-white/70 transition-colors group-hover:text-white'}>{copy[link.key]}</span>
                {active ? (
                  <motion.span
                    layoutId="marketing-nav-active"
                    className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-[#d4af37]"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                ) : (
                  <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 rounded-full bg-[#d4af37]/70 transition-all duration-300 group-hover:w-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => setLocale(locale === 'sw' ? 'en' : 'sw')}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition-brand hover:bg-white/10 hover:text-white"
            aria-label="Toggle language"
          >
            {locale === 'sw' ? 'EN' : 'SW'}
          </button>
          <ThemeToggle onDark />
          <InstallButton onDark />
          <Link href="/login" className="btn-gold">
            {copy.login}
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle onDark />
          <button className="rounded-lg p-2 text-white" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden border-t border-white/10 bg-sidebar md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-4 text-sm font-medium">
              {LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-lg px-3 py-2 ${active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10'}`}
                  >
                    {copy[link.key]}
                  </Link>
                );
              })}
              <button
                onClick={() => setLocale(locale === 'sw' ? 'en' : 'sw')}
                className="rounded-lg px-3 py-2 text-left text-white/70 hover:bg-white/10"
              >
                {locale === 'sw' ? 'English' : 'Kiswahili'}
              </button>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="btn-gold mt-2 w-full">
                {copy.login}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
