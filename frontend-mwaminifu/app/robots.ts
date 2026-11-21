import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mwaminifu.co.tz';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login'],
        disallow: [
          '/api/',
          '/system/',
          '/owner/',
          '/employee/',
          '/agent/',
          '/change-password',
          '/reset-password',
          '/forgot-password',
          '/offline',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
