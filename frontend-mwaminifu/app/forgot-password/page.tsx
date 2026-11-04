'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { useAppConfig } from '@/lib/context/AppConfigContext';

export default function ForgotPasswordPage() {
  const { locale } = useI18n();
  const { appName } = useAppConfig();
  const sw = locale === 'sw';
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await apiClient.forgotPassword(email);
      setMessage(res.data?.message || (sw ? 'Kama barua pepe ipo, tumetuma link ya kubadilisha password.' : 'If that email exists, a reset link has been sent.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : sw ? 'Imeshindikana' : 'Could not send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <span className="text-sm font-semibold text-secondary">{appName}</span>
        <h1 className="mt-8 text-2xl font-semibold text-foreground">{sw ? 'Umesahau password?' : 'Forgot password?'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {sw ? 'Weka barua pepe yako tutakutumia link ya kubadilisha password.' : 'Enter your email and we will send a reset link.'}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{sw ? 'Barua pepe' : 'Email'}</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" autoComplete="email" />
          </div>
          {message && <p className="rounded-lg border border-secondary/25 bg-secondary/10 px-3 py-2.5 text-sm text-secondary">{message}</p>}
          {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-teal w-full py-3">
            {loading ? (sw ? 'Inatuma...' : 'Sending...') : sw ? 'Tuma link' : 'Send reset link'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-secondary hover:underline">{sw ? 'Rudi kuingia' : 'Back to sign in'}</Link>
        </p>
      </div>
    </div>
  );
}
