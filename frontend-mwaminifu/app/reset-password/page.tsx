'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { useAppConfig } from '@/lib/context/AppConfigContext';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { locale } = useI18n();
  const { appName } = useAppConfig();
  const sw = locale === 'sw';
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError(sw ? 'Link hii si sahihi.' : 'This reset link is invalid.');
      return;
    }
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
      await apiClient.resetPassword(token, password);
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : sw ? 'Imeshindikana' : 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <span className="text-sm font-semibold text-secondary">{appName}</span>
        <h1 className="mt-8 text-2xl font-semibold text-foreground">{sw ? 'Weka password mpya' : 'Set a new password'}</h1>
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
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-secondary hover:underline">{sw ? 'Rudi kuingia' : 'Back to sign in'}</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetForm />
    </Suspense>
  );
}
