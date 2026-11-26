'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AtSign,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  LogIn,
  Mail,
  MessageCircle,
  Package,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Video,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { errorMessage } from '@/lib/format';
import { useI18n } from '@/lib/context/I18nContext';
import { useAppConfig } from '@/lib/context/AppConfigContext';
import ThemeToggle from '@/components/theme-toggle';

const ROLE_HOME: Record<string, string> = {
  SYSTEM_OWNER: '/system/dashboard',
  AGENT: '/agent/dashboard',
  BUSINESS_OWNER: '/owner/dashboard',
  EMPLOYEE: '/employee/dashboard',
};

const BRAND = '#0E7A3C';
const BRAND_DARK = '#0A5A2B';
const BRAND_DEEP = '#082F1B';
const BRAND_SOFT = '#EAF7EF';
const INK = '#0F172A';
const MUTED = '#64748B';
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
    if (code) {
      if (code === 'not_registered') {
        setError(sw ? 'Barua pepe hii haijasajiliwa. Wasiliana na Agent.' : 'Email not registered. Contact your Agent.');
      } else if (code === 'inactive') {
        setError(sw ? 'Akaunti imezimwa. Wasiliana na msaada.' : 'Account inactive. Contact support.');
      } else {
        setError(sw ? 'Imeshindikana kuingia. Jaribu tena.' : 'Sign-in failed. Please try again.');
      }
    }
    if (searchParams.get('changed') === '1') {
      setInfo(
        sw
          ? 'Nenosiri limebadilishwa. Tafadhali ingia tena kwa nenosiri jipya.'
          : 'Password changed successfully. Please sign in again with your new password.'
      );
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
    if (!email.trim() || !password) {
      setError(sw ? 'Barua pepe na nenosiri vinahitajika.' : 'Email and password are required.');
      return;
    }
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
      const code = (err as { code?: string })?.code;
      if (code === 'UNAUTHORIZED' || code === 'INVALID_CREDENTIALS') {
        setError(sw ? 'Barua pepe au nenosiri si sahihi.' : 'Invalid email or password.');
      } else {
        setError(errorMessage(err));
      }
      setLoading(false);
    }
  };

  const comingSoon = (provider: string) => {
    setInfo(sw ? `Kuingia na ${provider} kunakuja hivi karibuni.` : `${provider} sign-in is coming soon.`);
  };

  const signupInfo = () => {
    setInfo(
      sw
        ? 'Usajili umefungwa. Wasiliana na Agent au mmiliki wa biashara ili upate akaunti.'
        : 'Registration is closed. Contact your Agent or business owner for an account.'
    );
  };

  const features = [
    { icon: <ShoppingCart size={18} />, label: sw ? 'Fuatilia Mauzo' : 'Track Sales' },
    { icon: <Package size={18} />, label: sw ? 'Dhibiti Stock' : 'Manage Stock' },
    { icon: <Users size={18} />, label: sw ? 'Hudumia Wateja' : 'Serve Customers' },
    { icon: <ShieldCheck size={18} />, label: sw ? 'Fanya Kazi kwa Usalama' : 'Work Securely' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ color: INK }}>
      <div className="relative flex flex-1 flex-col lg:flex-row">
        {/* Left visual panel */}
        <section className="relative hidden overflow-hidden lg:flex lg:w-[60%] lg:flex-col lg:justify-between" style={{ backgroundColor: BRAND_DARK }}>
          <Image src="/hero/hero.jpg" alt="" fill priority sizes="60vw" className="object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(100deg, rgba(8,47,27,0.96) 0%, rgba(10,90,43,0.88) 45%, rgba(10,90,43,0.35) 100%)',
            }}
          />
          <div className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full border-[48px] opacity-30" style={{ borderColor: BRAND }} />
          <div className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: '#34D399' }} />

          <div className="relative z-10 p-10 xl:p-14">
            <div className="flex items-center gap-3">
              <Image src="/logo.jpeg" alt="Mwaminifu" width={54} height={54} className="rounded-2xl ring-1 ring-white/25" />
              <div>
                <p className="text-xl font-bold tracking-tight text-white">{appName}</p>
                <p className="text-xs font-medium text-white/70">{sw ? 'Mfumo wa Usimamizi wa Biashara' : 'Business Management System'}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 px-10 xl:px-14">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <TrendingUp size={14} /> {sw ? 'Biashara Mahiri. Ukuaji Mkubwa.' : 'Smart Business. Greater Growth.'}
              </span>
              <h1 className="mt-5 max-w-xl text-5xl font-extrabold leading-[1.02] tracking-tight text-white xl:text-6xl">
                {sw ? 'Biashara Yako,' : 'Your Business,'}
                <br />
                <span style={{ color: '#6EE7A8' }}>{sw ? 'Rahisi.' : 'Simplified.'}</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80">
                {sw
                  ? 'Simamia duka lako, fuatilia mauzo, dhibiti stock na pata ripoti kwa urahisi.'
                  : 'Run your shop, track sales, manage stock and get reports with ease.'}
              </p>

              <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
                {features.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-sm font-medium text-white">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur">
                      {item.icon}
                    </span>
                    {item.label}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="relative z-10 p-10 xl:p-14">
            <div className="grid max-w-xl grid-cols-3 divide-x divide-white/20 rounded-2xl border border-white/15 bg-white/10 px-2 py-4 backdrop-blur-md">
              {[
                { icon: <Trophy size={18} />, value: '10K+', label: sw ? 'Biashara' : 'Businesses' },
                { icon: <Users size={18} />, value: '100K+', label: sw ? 'Watumiaji' : 'Users' },
                { icon: <Star size={18} />, value: '4.9/5', label: sw ? 'Ukadiriaji' : 'Rating' },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center px-3 text-center text-white">
                  <span style={{ color: '#FACC15' }}>{stat.icon}</span>
                  <span className="mt-1 text-xl font-bold">{stat.value}</span>
                  <span className="text-xs text-white/70">{stat.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 max-w-md text-sm italic text-white/75">
              “{sw ? 'Mwaminifu hulinda kila shilingi ya biashara yako.' : 'Mwaminifu protects every shilling of your business.'}”
            </p>
          </div>
        </section>

        {/* Right login panel */}
        <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:w-[40%] lg:px-8" style={{ backgroundColor: BRAND_SOFT }}>
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-70" style={{ backgroundColor: '#BFE7CC' }} />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full opacity-50" style={{ backgroundColor: '#D7F1E1' }} />

          <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 sm:right-6 sm:top-6">
            <button
              type="button"
              onClick={() => setLocale(locale === 'sw' ? 'en' : 'sw')}
              className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold shadow-sm transition-colors hover:bg-[#F1F8F4]"
              style={{ color: INK }}
            >
              <Globe size={15} style={{ color: BRAND }} />
              {locale === 'sw' ? 'SW' : 'EN'}
              <ChevronDown size={13} style={{ color: MUTED }} />
            </button>
            <ThemeToggle />
          </div>

          <div className="relative z-10 w-full max-w-[420px]">
            {/* Mobile brand header */}
            <div className="mb-5 flex items-center gap-3 lg:hidden">
              <Image src="/logo.jpeg" alt="Mwaminifu" width={42} height={42} className="rounded-xl ring-1 ring-black/10" />
              <div>
                <p className="font-bold" style={{ color: INK }}>{appName}</p>
                <p className="text-[11px]" style={{ color: MUTED }}>{sw ? 'Mfumo wa Usimamizi wa Biashara' : 'Business Management System'}</p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="rounded-[22px] border border-black/5 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(8,47,27,0.35)] sm:p-8"
            >
              <div className="flex flex-col items-center text-center">
                <Image src="/logo.jpeg" alt="Mwaminifu" width={68} height={68} className="h-[68px] w-[68px] rounded-2xl object-cover ring-1 ring-black/5" />
                <p className="mt-3 text-2xl font-extrabold tracking-tight" style={{ color: INK }}>{appName}</p>
                <p className="text-xs font-medium" style={{ color: MUTED }}>{sw ? 'Mfumo wa Usimamizi wa Biashara' : 'Business Management System'}</p>
                <h1 className="mt-6 text-2xl font-bold tracking-tight" style={{ color: INK }}>{sw ? 'Karibu Tena' : 'Welcome Back'}</h1>
                <p className="mt-1 text-sm" style={{ color: MUTED }}>{sw ? 'Ingia ili kuendelea na mfumo' : 'Login to continue'}</p>
              </div>

              <form onSubmit={handleLogin} className="mt-6 space-y-3.5">
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                  <input
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={sw ? 'Barua pepe yako' : 'Your email'}
                    aria-label={sw ? 'Barua pepe' : 'Email'}
                    className="w-full rounded-xl border bg-[#F8FAFC] py-3.5 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#0E7A3C] focus:ring-4 focus:ring-[#0E7A3C]/10"
                    style={{ borderColor: '#E2E8F0', color: INK }}
                  />
                </div>

                <div className="relative">
                  <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={sw ? 'Nenosiri lako' : 'Your password'}
                    aria-label={sw ? 'Nenosiri' : 'Password'}
                    className="w-full rounded-xl border bg-[#F8FAFC] py-3.5 pl-10 pr-11 text-sm outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#0E7A3C] focus:ring-4 focus:ring-[#0E7A3C]/10"
                    style={{ borderColor: '#E2E8F0', color: INK }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors hover:bg-black/5"
                    style={{ color: MUTED }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <label className="flex items-center gap-2 text-xs font-medium" style={{ color: INK }}>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-[#0E7A3C]"
                    />
                    {sw ? 'Nikumbuke' : 'Remember me'}
                  </label>
                  <Link href="/forgot-password" className="text-xs font-semibold hover:underline" style={{ color: BRAND }}>
                    {sw ? 'Umesahau nenosiri?' : 'Forgot password?'}
                  </Link>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
                {info && (
                  <p className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: '#BFE7CC', backgroundColor: BRAND_SOFT, color: BRAND_DARK }}>
                    {info}
                  </p>
                )}

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={loading || success}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-80"
                  style={{ backgroundColor: BRAND }}
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
                      <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2">
                        <LogIn size={17} /> {sw ? 'Ingia' : 'Login'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-medium lowercase" style={{ color: MUTED }}>{sw ? 'au' : 'or'}</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => comingSoon('Google')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold transition-colors hover:bg-slate-50"
                  style={{ color: INK }}
                >
                  <span className="text-base font-bold" style={{ color: '#4285F4' }}>G</span>
                  {sw ? 'Ingia kwa Google' : 'Google'}
                </button>
                <button
                  type="button"
                  onClick={() => comingSoon('Microsoft')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold transition-colors hover:bg-slate-50"
                  style={{ color: INK }}
                >
                  <span className="grid h-4 w-4 grid-cols-2 gap-[2px]">
                    <span className="bg-[#F25022]" />
                    <span className="bg-[#7FBA00]" />
                    <span className="bg-[#00A4EF]" />
                    <span className="bg-[#FFB900]" />
                  </span>
                  {sw ? 'Ingia kwa Microsoft' : 'Microsoft'}
                </button>
              </div>

              <p className="mt-6 text-center text-xs" style={{ color: MUTED }}>
                {sw ? 'Huna akaunti?' : "Don't have an account?"}{' '}
                <button type="button" onClick={signupInfo} className="font-semibold hover:underline" style={{ color: BRAND }}>
                  {sw ? 'Jisajili hapa' : 'Sign up here'}
                </button>
              </p>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Bottom footer */}
      <footer style={{ backgroundColor: BRAND_DEEP }} className="text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-4 text-xs sm:flex-row sm:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-white/85">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={15} style={{ color: '#6EE7A8' }} /> {sw ? 'Salama' : 'Secure'}</span>
            <span className="hidden text-white/30 sm:inline">•</span>
            <span>{sw ? 'Anatumika kwa Uaminifu' : 'Built on Trust'}</span>
            <span className="hidden text-white/30 sm:inline">•</span>
            <span>{sw ? 'Imejengwa kwa Biashara za Tanzania' : 'Built for Tanzanian Businesses'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/70">© 2026 Mwaminifu. {sw ? 'Haki zote zimehifadhiwa.' : 'All rights reserved.'}</span>
            <div className="flex items-center gap-2">
              {[<AtSign key="at" size={14} />, <Video key="video" size={14} />, <Share2 key="share" size={14} />, <MessageCircle key="chat" size={14} />].map((icon, i) => (
                <span key={i} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/80">
                  {icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: BRAND_SOFT }} />}>
      <LoginForm />
    </Suspense>
  );
}
