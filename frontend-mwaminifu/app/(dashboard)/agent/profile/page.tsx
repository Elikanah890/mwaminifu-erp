'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { formatDate, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonCard } from '@/components/Spinner';
import { Stagger, StaggerItem, motion } from '@/components/motion';

interface AgentProfile {
  id: string;
  username: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { onboardedUsers: number };
  stats?: { onboardedBusinesses: number; totalShops: number };
}

export default function AgentProfilePage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notify, setNotify] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<AgentProfile>('/agents/me');
      if (res.data) setProfile(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!notify) return;
    const t = setTimeout(() => setNotify(''), 4000);
    return () => clearTimeout(t);
  }, [notify]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotify('');
    if (!currentPassword) {
      setError(t('enterCurrentPassword'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('passwordMin6'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/agents/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotify(t('passwordChangedSuccess'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard rows={6} />
        <SkeletonCard rows={4} />
      </div>
    );

  const onboarded = profile?.stats?.onboardedBusinesses ?? profile?._count?.onboardedUsers ?? 0;

  return (
    <PageWrapper title={t('agentProfile')} description={t('profileDesc')} breadcrumb={[t('agentPortal'), t('profile')]}>

      {notify && <div className="bg-success/10 border border-success/25 text-secondary px-4 py-3 rounded-lg mb-4 text-sm">{notify}</div>}
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <Stagger className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StaggerItem className="surface-card p-6">
          <h2 className="text-lg font-semibold text-primary mb-4">{t('profileInformation')}</h2>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-muted-foreground text-sm">{t('name')}</dt>
              <dd className="font-medium text-foreground">{profile?.name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground text-sm">{t('agentCode')}</dt>
              <dd className="font-mono font-medium text-primary">AGAC-{profile?.username || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground text-sm">{t('phonePayoutWallet')}</dt>
              <dd className="font-medium text-foreground">{profile?.phone || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground text-sm">{t('email')}</dt>
              <dd className="font-medium text-foreground">{profile?.email || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground text-sm">{t('status')}</dt>
              <dd>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${profile?.isActive ? 'bg-success/10 text-success' : 'bg-muted-2 text-muted-foreground'}`}>
                  {profile?.isActive ? t('active') : t('inactive')}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground text-sm">{t('memberSince')}</dt>
              <dd className="font-medium text-foreground">{formatDate(profile?.createdAt)}</dd>
            </div>
          </dl>

          <Stagger className="grid grid-cols-2 gap-4 mt-6">
            <StaggerItem className="stat-card">
              <p className="text-xs text-muted-foreground">{t('businessesOnboarded')}</p>
              <p className="text-lg font-bold text-primary">{onboarded}</p>
            </StaggerItem>
            <StaggerItem className="stat-card">
              <p className="text-xs text-muted-foreground">{t('shops')}</p>
              <p className="text-lg font-bold text-primary">{profile?.stats?.totalShops ?? 0}</p>
            </StaggerItem>
          </Stagger>
        </StaggerItem>

        <StaggerItem className="surface-card p-6">
          <h2 className="text-lg font-semibold text-primary mb-4">{t('changePassword')}</h2>
          <form onSubmit={handlePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('currentPassword')}</label>
              <input
                type="password"
                className="input-field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('enterCurrentPassword')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('newPassword')}</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('minimum6Chars')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('confirmNewPassword')}</label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('reenterNewPassword')}
                required
              />
            </div>
            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="btn-teal w-full"
            >
              {saving ? 'Changing...' : 'Change Password'}
            </motion.button>
          </form>
        </StaggerItem>
      </Stagger>
    </PageWrapper>
  );
}
