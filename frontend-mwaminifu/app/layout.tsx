import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import Script from 'next/script';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/Toast';
import { I18nProvider } from '@/lib/context/I18nContext';
import { AppConfigProvider } from '@/lib/context/AppConfigContext';
import { PwaProvider } from '@/lib/context/PwaContext';
import PwaPrompts from '@/components/pwa/PwaPrompts';
import './globals.css';

const APP_NAME = 'Mwaminifu ERP';
const APP_DESCRIPTION = 'Smart Business Management for Tanzania';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mwaminifu.co.tz';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Mwaminifu',
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512x512.png`,
      areaServed: 'TZ',
      description: APP_DESCRIPTION,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: APP_NAME,
      inLanguage: ['sw-TZ', 'en'],
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#app`,
      name: APP_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android, iOS',
      url: SITE_URL,
      description: APP_DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'TZS' },
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};

const SPLASHES = [
  { file: '1290x2796', w: 430, h: 932, r: 3 },
  { file: '1179x2556', w: 393, h: 852, r: 3 },
  { file: '1284x2778', w: 428, h: 926, r: 3 },
  { file: '1170x2532', w: 390, h: 844, r: 3 },
  { file: '1125x2436', w: 375, h: 812, r: 3 },
  { file: '1242x2688', w: 414, h: 896, r: 3 },
  { file: '828x1792', w: 414, h: 896, r: 2 },
  { file: '750x1334', w: 375, h: 667, r: 2 },
  { file: '640x1136', w: 320, h: 568, r: 2 },
  { file: '2048x2732', w: 1024, h: 1366, r: 2 },
  { file: '1668x2388', w: 834, h: 1194, r: 2 },
  { file: '1536x2048', w: 768, h: 1024, r: 2 },
  { file: '1620x2160', w: 810, h: 1080, r: 2 },
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: APP_NAME,
    template: `%s | Mwaminifu`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: '/manifest.json',
  alternates: { canonical: '/' },
  keywords: [
    'Mwaminifu',
    'ERP Tanzania',
    'POS Tanzania',
    'business management software',
    'duka management',
    'stock management',
    'mauzo POS',
    'madeni ya wateja',
    'bookkeeping Tanzania',
    'small business software',
  ],
  authors: [{ name: 'Mwaminifu', url: SITE_URL }],
  creator: 'Mwaminifu',
  publisher: 'Mwaminifu',
  category: 'business',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mwaminifu',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon-120x120.png', sizes: '120x120', type: 'image/png' },
      { url: '/icons/apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/apple-touch-icon-167x167.png', sizes: '167x167', type: 'image/png' },
      { url: '/icons/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: '/',
    locale: 'sw_TZ',
    alternateLocale: ['en_US'],
    images: [{ url: '/icons/og-image.png', width: 1200, height: 630, alt: 'Mwaminifu ERP' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ['/icons/og-image.png'],
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0D1B3D' },
    { media: '(prefers-color-scheme: dark)', color: '#070D1C' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get('mwaminifu_lang')?.value === 'en' ? 'en' : 'sw';
  return (
    <html lang={savedLocale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {SPLASHES.map((s) => (
          <link
            key={s.file}
            rel="apple-touch-startup-image"
            href={`/splash/splash-${s.file}.png`}
            media={`(device-width: ${s.w}px) and (device-height: ${s.h}px) and (-webkit-device-pixel-ratio: ${s.r}) and (orientation: portrait)`}
          />
        ))}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        {/* Apply the stored theme before first paint (no flash). */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light')t='light';var r=document.documentElement;r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;}catch(e){}})();",
          }}
        />
        {process.env.NODE_ENV !== 'production' && (
          <Script
            id="dev-sw-cleanup"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html:
                "(function(){try{if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})}).catch(function(){})}if(typeof caches!=='undefined'){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})}).catch(function(){})}}catch(e){}})();",
            }}
          />
        )}
        <ThemeProvider>
          <I18nProvider initialLocale={savedLocale}>
            <ToastProvider>
              <AppConfigProvider>
              <PwaProvider>
                {children}
                <PwaPrompts />
              </PwaProvider>
              </AppConfigProvider>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
