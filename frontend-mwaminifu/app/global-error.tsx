'use client';

import { translate, type Locale } from '@/lib/i18n/translations';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale: Locale =
    typeof window !== 'undefined' && window.localStorage.getItem('mwaminifu_lang') === 'en' ? 'en' : 'sw';
  return (
    <html lang={locale}>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{translate(locale, 'somethingWentWrong')}</h1>
          <p style={{ maxWidth: 420, color: '#666' }}>
            {translate(locale, 'appFailedLoad')}
          </p>
          <button onClick={() => reset()} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {translate(locale, 'tryAgain')}
          </button>
        </div>
      </body>
    </html>
  );
}
