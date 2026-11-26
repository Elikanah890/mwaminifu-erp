'use client';

import { useEffect } from 'react';
import { useI18n } from '@/lib/context/I18nContext';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">{t('somethingWentWrong')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t('sectionFailedLoad')}
      </p>
      <button onClick={() => reset()} className="btn-navy">
        {t('tryAgain')}
      </button>
    </div>
  );
}
