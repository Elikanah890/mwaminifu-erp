'use client';

import PageWrapper from '@/components/PageWrapper';
import { useI18n } from '@/lib/context/I18nContext';
import { Reveal } from '@/components/motion';

export default function SystemProfilePage() {
  const { t } = useI18n();
  return (
    <PageWrapper title={t('profile')} description={t('systemProfileDesc')} breadcrumb={[t('systemOwner'), t('profile')]}>
      <Reveal>
        <div className="surface-card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-muted-2 text-primary flex items-center justify-center mb-4 text-xl font-semibold">SO</div>
          <h2 className="text-lg font-semibold text-foreground">{t('systemOwnerProfile')}</h2>
          <p className="text-sm text-subtle-foreground mt-2">{t('comingSoon')}</p>
        </div>
      </Reveal>
    </PageWrapper>
  );
}
