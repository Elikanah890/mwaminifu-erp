'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/PageWrapper';
import { useI18n } from '@/lib/context/I18nContext';
import { apiClient, PublicUser } from '@/lib/api/client';
import { Stagger, StaggerItem, motion } from '@/components/motion';
import { Mail, ShieldCheck } from 'lucide-react';

export default function EmployeeProfilePage() {
  const { locale, setLocale, t } = useI18n();
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => setUser(apiClient.getUser()), []);

  return (
    <PageWrapper title={t('profile')} description={locale === 'sw' ? 'Taarifa zako na mapendeleo ya akaunti' : 'Your details and account preferences'} breadcrumb={['Employee', t('profile')]}>
      <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StaggerItem className="lg:col-span-2">
          <div className="surface-card h-full p-6">
            <h2 className="text-lg font-semibold mb-5">{t('profile')}</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck size={18} /></span>
                <div>
                  <p className="text-xs text-subtle-foreground">{t('name')}</p>
                  <p className="font-semibold">{user?.name ?? '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted-2 text-muted-foreground"><Mail size={18} /></span>
                <div>
                  <p className="text-xs text-subtle-foreground">{t('role')}</p>
                  <p className="font-semibold">{user?.role ?? '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-subtle-foreground">{t('language')}</p>
                <div className="mt-2 inline-flex rounded-xl border border-border p-1">
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setLocale('en')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${locale === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {t('english')}
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setLocale('sw')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${locale === 'sw' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {t('swahili')}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="surface-card h-full p-6">
            <h2 className="text-lg font-semibold mb-3">PIN</h2>
            <p className="text-sm text-muted-foreground">{locale === 'sw' ? 'Weka PIN mpya kutoka kwa mmiliki wako wa biashara ikiwa inahitajika.' : 'Reset your PIN from your business owner if needed.'}</p>
          </div>
        </StaggerItem>
      </Stagger>
    </PageWrapper>
  );
}
