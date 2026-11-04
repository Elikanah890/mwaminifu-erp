'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { useAppConfig } from '@/lib/context/AppConfigContext';
import ThemeToggle from '@/components/theme-toggle';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { locale, setLocale } = useI18n();
  const { appName } = useAppConfig();
  const sw = locale === 'sw';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(sw ? 'Password lazima iwe herufi 8 au zaidi.' : 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError(sw ? 'Password hazifanani.' : 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.changePassword(password);
      await apiClient.logout();
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : sw ? 'Imeshindikana' : 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-sm font-semibold text-secondary">{appName}</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setLocale(locale === 'sw' ? 'en' : 'sw')} className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted">
              {locale === 'sw' ? 'EN' : 'SW'}
            </button>
            <ThemeToggle />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{sw ? 'Badilisha password' : 'Change password'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {sw ? 'Kwa usalama, weka password mpya kabla ya kuendelea.' : 'Set a new password before continuing.'}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{sw ? 'Password mpya' : 'New password'}</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" autoComplete="new-password" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{sw ? 'Rudia password' : 'Confirm password'}</label>
            <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input-field" autoComplete="new-password" />
          </div>
          {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-teal w-full py-3">
            {loading ? (sw ? 'Inahifadhi...' : 'Saving...') : sw ? 'Hifadhi password' : 'Save password'}
          </button>
        </form>
      </div>
    </div>
  );
}
