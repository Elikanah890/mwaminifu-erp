'use client';

import Link from 'next/link';
import { AtSign, Globe, MessageCircle, Send } from 'lucide-react';
import { useI18n } from '@/lib/context/I18nContext';
import { commonText, navText } from '@/lib/i18n/site';
import BrandMark from '@/components/marketing/BrandMark';

export default function MarketingFooter() {
  const { locale } = useI18n();
  const nav = navText[locale];
  const common = commonText[locale];

  return (
    <footer id="footer" className="border-t border-border py-12">
      <div className="brand-container grid gap-8 px-4 sm:px-6 md:grid-cols-4">
        <div>
          <div className="mb-4">
            <BrandMark />
          </div>
          <p className="text-sm text-muted-foreground">
            {locale === 'sw' ? 'Vifaa vya kuaminika kwa maduka yanayokua.' : 'Trustworthy tools for growing shops.'}
          </p>
          <div className="mt-5 flex gap-2">
            {[Globe, MessageCircle, AtSign, Send].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="social"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-secondary hover:text-secondary transition-brand"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-foreground">{locale === 'sw' ? 'Kuhusu' : 'About'}</h3>
          <Link href="/about" className="mb-2 block text-sm text-muted-foreground hover:text-foreground">
            {nav.about}
          </Link>
          <Link href="/how-it-works" className="mb-2 block text-sm text-muted-foreground hover:text-foreground">
            {nav.how}
          </Link>
          <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground">
            {nav.login}
          </Link>
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-foreground">{locale === 'sw' ? 'Vipengele' : 'Features'}</h3>
          <Link href="/features" className="mb-2 block text-sm text-muted-foreground hover:text-foreground">
            {nav.features}
          </Link>
          <Link href="/pricing" className="mb-2 block text-sm text-muted-foreground hover:text-foreground">
            {nav.pricing}
          </Link>
          <Link href="/how-it-works" className="block text-sm text-muted-foreground hover:text-foreground">
            {nav.how}
          </Link>
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-foreground">{locale === 'sw' ? 'Mawasiliano' : 'Contact'}</h3>
          <p className="mb-2 text-sm text-muted-foreground">+255 784 815 686</p>
          <p className="mb-2 text-sm text-muted-foreground">emmanuel@gmail.com</p>
          <p className="text-sm text-muted-foreground">WhatsApp: +255 784 815 686</p>
        </div>
      </div>

      <div className="brand-container mt-10 flex flex-col justify-between gap-3 border-t border-border px-4 pt-6 text-xs text-subtle-foreground sm:flex-row sm:px-6">
        <span>{common.allRights}</span>
        <span>{common.privacy}</span>
      </div>
    </footer>
  );
}
