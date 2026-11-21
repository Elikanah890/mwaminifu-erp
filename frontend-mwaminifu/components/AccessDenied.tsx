'use client';

import { ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/context/I18nContext';
import { EmptyState } from '@/components/Spinner';

export default function AccessDenied() {
  const { t } = useI18n();
  return (
    <div className="surface-card">
      <EmptyState
        icon={<ShieldAlert size={22} />}
        title={t('accessDenied')}
        message={t('accessDeniedDesc')}
      />
    </div>
  );
}
