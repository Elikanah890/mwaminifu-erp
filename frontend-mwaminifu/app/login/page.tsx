'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eye, EyeOff, Loader2, Lock, Mail, Store, Users, WifiOff } from 'lucide-react';
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

const NAVY = '#1A2A3A';
const NAVY_DEEP = NAVY;
const TEAL = '#00897B';
const GOLD = '#FFD700';
const LIGHT = '#94A3B8';
const REMEMBER_KEY = 'mwaminifu_login_email';

const EASE = [0.16, 1, 0.3, 1] as const;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appName } = useAppConfig();
  const { locale, setLocale } = useI18n();
  const sw = locale === 'sw';

  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* storage may be unavailable */
    }
  }, []);

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

  const rememberEmail = () => {
    try {
      if (remember) window.localStorage.setItem(REMEMBER_KEY, email.trim().toLowerCase());
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* storage may be unavailable */
    }
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
      rememberEmail();
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

  const showGoogleSoon = () => {
    setInfo(sw ? 'Kuingia na Google kunakuja hivi karibuni.' : 'Google Sign-In is coming soon.');
  };

  const focusEmail = () => {
    emailRef.current?.focus();
  };

  return (
    <div className="flex min-h-screen flex-col text-white" style={{ backgroundColor: NAVY_DEEP }}>
      <div className="grid flex-1 lg:grid-cols-2">
        {/* Left visual panel */}
        <section
          className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between"
          style={{ backgroundColor: NAVY }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 18% 18%, rgba(0,137,123,0.28), transparent 42%), radial-gradient(circle at 82% 78%, rgba(255,215,0,0.14), transparent 40%), radial-gradient(circle at 55% 45%, rgba(255,255,255,0.05), transparent 55%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #FFFFFF 0, #FFFFFF 1px, transparent 1px, transparent 18px), repeating-linear-gradient(-45deg, #00897B 0, #00897B 1px, transparent 1px, transparent 26px)',
            }}
          />
          <motion.div
            animate={{ y: [0, -16, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full blur-3xl"
            style={{ backgroundColor: 'rgba(0,137,123,0.18)' }}
          />

          <div className="relative flex items-center gap-3">
            <Image src="/logo.jpeg" alt="Mwaminifu" width={48} height={48} className="rounded-xl ring-1 ring-white/20" />
            <div>
              <p className="text-lg font-semibold">{appName}</p>
              <p className="text-sm" style={{ color: LIGHT }}>ERP for Tanzanian businesses</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
            className="relative max-w-lg"
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              {sw ? 'Karibu Mwaminifu' : 'Welcome to Mwaminifu'}
            </p>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight">
              {sw ? 'Biashara Yako,' : 'Your Business,'}
              <br />
              <span style={{ color: GOLD }}>{sw ? 'Rahisi.' : 'Simplified.'}</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed" style={{ color: LIGHT }}>
              {sw
                ? 'Sehemu moja salama kwa wamiliki, mawakala na wafanyakazi. Mauzo, stoo, wateja na ripoti — pamoja.'
                : 'One secure workspace for owners, agents and staff. Sales, stock, customers and reports — together.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium">
              {[
                sw ? 'Inafanya kazi nje ya mtandao' : 'Works offline',
                sw ? 'Kiswahili + English' : 'Swahili + English',
                sw ? 'Simu + Kompyuta' : 'Mobile + Desktop',
              ].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border px-3 py-1.5 backdrop-blur"
                  style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', color: LIGHT }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </motion.div>

          <blockquote className="relative max-w-sm text-sm leading-relaxed" style={{ color: LIGHT }}>
            “{sw ? 'Mwaminifu hulinda kila shilingi ya biashara yako.' : 'Mwaminifu protects every shilling of your business.'}”
          </blockquote>
        </section>

        {/* Right login panel */}
        <section className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12" style={{ backgroundColor: NAVY_DEEP }}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 80% 10%, rgba(0,137,123,0.12), transparent 35%), radial-gradient(circle at 10% 90%, rgba(255,215,0,0.06), transparent 40%)',
            }}
          />
          <div className="relative w-full max-w-md">
            <div className="mb-4 flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setLocale(locale === 'sw' ? 'en' : 'sw')}
                className="rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/10"
                style={{ color: LIGHT }}
              >
                {locale === 'sw' ? 'EN' : 'SW'}
              </button>
              <ThemeToggle onDark />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="rounded-[28px] border p-6 shadow-[0_28px_90px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8"
              style={{ borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(26,42,58,0.92)' }}
            >
              <div className="mb-7 flex flex-col items-center text-center">
                <Image src="/logo.jpeg" alt="Mwaminifu" width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover ring-2" style={{ boxShadow: '0 0 0 4px rgba(0,137,123,0.22)' }} />
                <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">{sw ? 'Karibu Tena' : 'Welcome Back'}</h1>
                <p className="mt-1 text-sm" style={{ color: LIGHT }}>
                  {sw ? 'Ingia ili kuendelea' : 'Login to continue'}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white">
                    {sw ? 'Barua pepe' : 'Email or Username'}
                  </label>
                  <div className="relative">
                    <Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: LIGHT }} />
                    <input
                      ref={emailRef}
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#00897B] focus:ring-4 focus:ring-[#00897B]/15"
                      style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.18)' }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white">
                    {sw ? 'Nenosiri' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: LIGHT }} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border py-3 pl-10 pr-11 text-sm text-white outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#00897B] focus:ring-4 focus:ring-[#00897B]/15"
                      style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.18)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors hover:bg-white/10"
                      style={{ color: LIGHT }}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium" style={{ color: LIGHT }}>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#FFD700]"
                    />
                    {sw ? 'Nikumbuke' : 'Remember me'}
                  </label>
                  <Link href="/forgot-password" className="text-xs font-semibold hover:underline" style={{ color: TEAL }}>
                    {sw ? 'Umesahau Nenosiri?' : 'Forgot Password?'}
                  </Link>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role="alert"
                      className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
                {info && <p className="rounded-lg border border-[#00897B]/30 bg-[#00897B]/10 px-3 py-2.5 text-sm" style={{ color: GOLD }}>{info}</p>}

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={loading || success}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-80"
                  style={{ backgroundColor: GOLD, color: NAVY }}
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
                        {sw ? 'Ingia' : 'Login'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: LIGHT }}>
                  {sw ? 'AU' : 'OR'}
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={showGoogleSoon}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  style={{ borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30 text-xs font-bold">G</span>
                  {sw ? 'Endelea na Google' : 'Continue with Google'}
                </button>
                <button
                  type="button"
                  onClick={focusEmail}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  style={{ borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <Mail size={17} style={{ color: LIGHT }} />
                  {sw ? 'Endelea na Barua Pepe' : 'Continue with Email'}
                </button>
              </div>

              <p className="mt-6 text-center text-xs" style={{ color: LIGHT }}>
                {sw ? 'Huna akaunti?' : "Don't have an account?"}{' '}
                <a href="mailto:support@mwaminifu.co.tz" className="font-semibold hover:underline" style={{ color: TEAL }}>
                  {sw ? 'Wasiliana na Agent' : 'Contact Agent'}
                </a>
              </p>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Bottom feature strip */}
      <section className="border-t" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: NAVY }}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-8 sm:grid-cols-3 sm:gap-6">
          {[
            {
              icon: <Store size={20} />,
              title: sw ? 'Gundua Mwaminifu' : 'Discover Mwaminifu',
              body: sw ? 'Mfumo kamili wa usimamizi wa biashara yako.' : 'A complete ERP built for your business.',
            },
            {
              icon: <WifiOff size={20} />,
              title: sw ? 'Fanya Kazi Nje ya Mtandao' : 'Work Offline',
              body: sw ? 'Endelea kuuza hata bila mtandao.' : 'Keep selling even without internet.',
            },
            {
              icon: <Users size={20} />,
              title: sw ? 'Jiunge na Jumuiya' : 'Join the Community',
              body: sw ? 'Kua pamoja na biashara za Tanzania.' : 'Grow with Tanzanian businesses.',
            },
          ].map((feature) => (
            <div key={feature.title} className="flex items-start gap-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(0,137,123,0.18)', color: GOLD }}
              >
                {feature.icon}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: LIGHT }}>{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="pb-6 text-center text-[11px]" style={{ color: LIGHT }}>
          © 2026 Mwaminifu. {sw ? 'Haki zote zimehifadhiwa.' : 'All rights reserved.'}
        </p>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: NAVY_DEEP }} />}>
      <LoginForm />
    </Suspense>
  );
}
