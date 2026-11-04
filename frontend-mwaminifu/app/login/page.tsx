'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Lock, Mail } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { useAppConfig } from '@/lib/context/AppConfigContext';
import ThemeToggle from '@/components/theme-toggle';

const ROLE_HOME: Record<string, string> = {
  SYSTEM_OWNER: '/system/dashboard',
  AGENT: '/agent/dashboard',
  BUSINESS_OWNER: '/owner/dashboard',
  EMPLOYEE: '/employee/dashboard',
};

const EASE = [0.16, 1, 0.3, 1] as const;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appName } = useAppConfig();
  const { locale, setLocale } = useI18n();
  const sw = locale === 'sw';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const code = searchParams.get('error');
    if (!code) return;
    if (code === 'not_registered') {
      setError(sw ? 'Barua pepe hii haijasajiliwa. Wasiliana na Agent.' : 'Email not registered. Contact your Agent.');
    } else if (code === 'inactive') {
      setError(sw ? 'Akaunti imezimwa. Wasiliana na msaada.' : 'Account inactive. Contact support.');
    } else {
      setError(sw ? 'Imeshindikana kuingia. Jaribu tena.' : 'Sign-in failed. Please try again.');
    }
  }, [searchParams, sw]);

  const redirectTarget = (role?: string) => {
    const requested = searchParams.get('redirect');
    const fallback = role ? ROLE_HOME[role] ?? '/' : '/';
    return requested && requested.startsWith('/') && !requested.startsWith('//') ? requested : fallback;
  };

  const completeLogin = (role?: string) => {
    setSuccess(true);
    setTimeout(() => {
      router.replace(redirectTarget(role));
      router.refresh();
    }, 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const response = await apiClient.login(email, password);
      const data = response.data;
      if (!data?.user?.role) throw new Error(sw ? 'Taarifa si sahihi' : 'Invalid email or password');
      if (data.requiresPasswordChange) {
        router.replace('/change-password');
        return;
      }
      completeLogin(data.user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : sw ? 'Imeshindikana kuingia' : 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="gradient-mesh pointer-events-none absolute inset-0 opacity-50" />
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-16 top-24 h-64 w-64 rounded-full bg-secondary/20 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 24, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-16 bottom-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <Image src="/logo.jpeg" alt="Mwaminifu" width={42} height={42} className="rounded-xl ring-1 ring-white/20" />
          <div>
            <p className="font-semibold">{appName}</p>
            <p className="text-sm text-white/60">ERP for Tanzanian businesses</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          className="relative"
        >
          <p className="section-eyebrow mb-4 text-white/50">Trusted by shops across Tanzania</p>
          <h1 className="max-w-md text-5xl font-semibold leading-[1.08] tracking-tight">
            Sell, stock and track every shilling.
          </h1>
          <p className="mt-5 max-w-md text-white/70">
            One secure sign-in for owners, agents, managers and employees.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3 text-sm">
            {['Works Offline', 'Kiswahili + English', 'Mobile + Desktop'].map((item, i) => (
              <motion.span
                key={item}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur"
              >
                {item}
              </motion.span>
            ))}
          </div>
        </motion.div>

        <p className="relative text-xs text-white/40">© 2026 Mwaminifu. All rights reserved.</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-lg">
          <div className="mb-10 flex items-center justify-between">
            <span className="text-sm font-semibold text-secondary">{appName}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLocale(locale === 'sw' ? 'en' : 'sw')}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-brand"
              >
                {locale === 'sw' ? 'EN' : 'SW'}
              </button>
              <ThemeToggle />
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{sw ? 'Ingia' : 'Sign in'}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sw ? 'Tumia barua pepe na password yako.' : 'Use your email and password.'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                {sw ? 'Barua pepe' : 'Email'}
              </label>
              <div className="relative">
                <Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  {sw ? 'Password' : 'Password'}
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold text-secondary hover:underline">
                  {sw ? 'Umesahau password?' : 'Forgot password?'}
                </Link>
              </div>
              <div className="relative">
                <Lock size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                  className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-sm text-danger"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            {info && <p className="rounded-lg border border-secondary/25 bg-secondary/10 px-3 py-2.5 text-sm text-secondary">{info}</p>}

            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading || success}
              className="btn-teal flex w-full items-center justify-center gap-2 py-3"
            >
              <AnimatePresence mode="wait" initial={false}>
                {success ? (
                  <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2">
                    <Check size={17} /> {sw ? 'Karibu!' : 'Welcome!'}
                  </motion.span>
                ) : loading ? (
                  <motion.span key="loading" className="inline-flex items-center gap-2">
                    <Loader2 size={17} className="animate-spin" /> {sw ? 'Inaingia...' : 'Signing in...'}
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {sw ? 'Ingia' : 'Sign in'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-subtle-foreground">
              {sw ? 'au tumia email' : 'or use email'}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => setInfo(sw ? 'Kuingia na Google kunakuja hivi karibuni.' : 'Google Sign-In is coming soon.')}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border-strong bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border-strong text-xs font-bold">G</span>
            {sw ? 'Ingia na Google' : 'Continue with Google'}
          </button>

          <p className="mt-6 text-center text-xs text-subtle-foreground">
            {sw ? 'Huna akaunti? Wasiliana na Agent au mmiliki wa biashara.' : 'No account? Contact your Agent or business owner.'}
          </p>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}
