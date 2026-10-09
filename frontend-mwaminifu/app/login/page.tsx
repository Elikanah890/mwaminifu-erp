'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BriefcaseBusiness, Check, Loader2, ShieldCheck, Store, UserRound } from 'lucide-react';
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

type RoleType = 'SYSTEM_OWNER' | 'AGENT' | 'BUSINESS_OWNER' | 'EMPLOYEE';

const ROLE_META: Record<RoleType, { label: string; icon: typeof ShieldCheck }> = {
  SYSTEM_OWNER: { label: 'System Owner', icon: ShieldCheck },
  AGENT: { label: 'Agent', icon: BriefcaseBusiness },
  BUSINESS_OWNER: { label: 'Business Owner', icon: Store },
  EMPLOYEE: { label: 'Employee', icon: UserRound },
};

const TEST_CREDENTIALS = {
  SYSTEM_OWNER: { username: 'admin', password: 'admin123' },
  AGENT: { username: 'agent1', password: 'agent123' },
  BUSINESS_OWNER: { phone: '0754000000', otp: '123456' },
  EMPLOYEE: { phone: '0754111111', pin: '1234' },
};

// Seeded demo credentials must never be pre-filled or shown in production.
const SHOW_TEST_LOGIN = process.env.NODE_ENV !== 'production';

const EASE = [0.16, 1, 0.3, 1] as const;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appName } = useAppConfig();
  const { locale, setLocale, t } = useI18n();
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleType | ''>('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');

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
    }, 550);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (selectedRole === 'SYSTEM_OWNER' || selectedRole === 'AGENT') {
        const response = await apiClient.login(username, password);
        const user = response.data?.user;
        if (!user?.role) throw new Error('Invalid credentials');
        completeLogin(user.role);
        return;
      }
      if (selectedRole === 'BUSINESS_OWNER') {
        const response = await apiClient.verifyOtp(phone, otp);
        const user = response.data?.user;
        if (!user?.role) throw new Error('Invalid or expired OTP');
        completeLogin(user.role);
        return;
      }
      if (selectedRole === 'EMPLOYEE') {
        const response = await apiClient.employeeLogin(phone, pin);
        const user = response.data?.user;
        if (!user?.role) throw new Error('Invalid employee credentials');
        completeLogin(user.role);
        return;
      }
      throw new Error('Please select a role');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setInfo('');
    if (!phone) {
      setError('Enter a phone number first');
      return;
    }
    setLoading(true);
    try {
      await apiClient.requestOtp(phone);
      setInfo('OTP sent. Check your messages.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const chooseRole = (role: RoleType) => {
    setSelectedRole(role);
    setError('');
    setInfo('');
    if (!SHOW_TEST_LOGIN) {
      setUsername('');
      setPassword('');
      setPhone('');
      setOtp('');
      setPin('');
      return;
    }
    const creds = TEST_CREDENTIALS[role];
    if ('username' in creds) {
      setUsername(creds.username);
      setPassword(creds.password);
      setPhone('');
      setOtp('');
      setPin('');
    } else if ('otp' in creds) {
      setPhone(creds.phone);
      setOtp(creds.otp);
      setUsername('');
      setPassword('');
      setPin('');
    } else {
      setPhone(creds.phone);
      setPin(creds.pin);
      setUsername('');
      setPassword('');
      setOtp('');
    }
  };

  const quickLogin = async (role: RoleType) => {
    chooseRole(role);
    setLoading(true);
    setError('');
    setInfo('');
    try {
      if (role === 'SYSTEM_OWNER' || role === 'AGENT') {
        const creds = TEST_CREDENTIALS[role];
        const response = await apiClient.login(creds.username, creds.password);
        completeLogin(response.data?.user?.role);
        return;
      }
      if (role === 'BUSINESS_OWNER') {
        const creds = TEST_CREDENTIALS.BUSINESS_OWNER;
        await apiClient.requestOtp(creds.phone);
        const response = await apiClient.verifyOtp(creds.phone, creds.otp);
        completeLogin(response.data?.user?.role);
        return;
      }
      const creds = TEST_CREDENTIALS.EMPLOYEE;
      const response = await apiClient.employeeLogin(creds.phone, creds.pin);
      completeLogin(response.data?.user?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick login failed');
      setLoading(false);
    }
  };

  const isUsernameRole = selectedRole === 'SYSTEM_OWNER' || selectedRole === 'AGENT';
  const isBusinessOwner = selectedRole === 'BUSINESS_OWNER';
  const isEmployee = selectedRole === 'EMPLOYEE';

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
            A production-ready workspace for owners, agents, managers and employees.
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
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-brand hover:gap-2.5">
              <ArrowLeft size={15} /> {t('backToHome')}
            </Link>
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

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }} className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('signIn')}</h1>
            <p className="mt-2 text-muted-foreground">Choose your role and continue to your dashboard.</p>
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key={error}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="animate-shake mb-4 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {error}
              </motion.div>
            )}
            {info && (
              <motion.div
                key={info}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm text-success"
              >
                {info}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('role')}</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(ROLE_META) as RoleType[]).map((role) => {
                  const Icon = ROLE_META[role].icon;
                  const active = selectedRole === role;
                  return (
                    <motion.button
                      type="button"
                      key={role}
                      onClick={() => chooseRole(role)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`relative rounded-xl border p-3 text-left transition-colors ${
                        active ? 'border-secondary bg-secondary/10' : 'border-border hover:border-secondary/50'
                      }`}
                    >
                      {active && (
                        <motion.span layoutId="login-role" className="absolute inset-0 rounded-xl ring-1 ring-secondary/40" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                      )}
                      <Icon size={18} className={active ? 'text-secondary' : 'text-muted-foreground'} />
                      <span className="mt-2 block text-xs font-semibold text-foreground">{ROLE_META[role].label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedRole}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {isUsernameRole && (
                  <>
                    <input className="input-field" placeholder={t('username')} value={username} onChange={(e) => setUsername(e.target.value)} />
                    <input className="input-field" type="password" placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </>
                )}
                {isBusinessOwner && (
                  <>
                    <input className="input-field" placeholder={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <div className="flex gap-2">
                      <input className="input-field" placeholder={t('otp')} value={otp} onChange={(e) => setOtp(e.target.value)} />
                      <button type="button" onClick={handleSendOtp} disabled={loading} className="btn-outline whitespace-nowrap">
                        {t('sendOtp')}
                      </button>
                    </div>
                  </>
                )}
                {isEmployee && (
                  <>
                    <input className="input-field" placeholder={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <input className="input-field" type="password" placeholder={t('pin')} value={pin} onChange={(e) => setPin(e.target.value)} />
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading || !selectedRole || success}
              className={`relative w-full overflow-hidden rounded-[10px] px-6 py-3 font-semibold transition-colors ${
                success ? 'bg-success text-white' : 'bg-primary text-primary-foreground hover:bg-primary-hover'
              } disabled:opacity-60`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {success ? (
                  <motion.span key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-2">
                    <Check size={18} /> {locale === 'sw' ? 'Imefanikiwa' : 'Success'}
                  </motion.span>
                ) : loading ? (
                  <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" /> {t('signingIn')}
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {t('signIn')}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          {SHOW_TEST_LOGIN && (
          <div className="mt-8 border-t border-border pt-6">
            <p className="mb-3 text-sm font-semibold text-muted-foreground">{t('quickTestLogin')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ROLE_META) as RoleType[]).map((role) => (
                <motion.button
                  key={role}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => quickLogin(role)}
                  disabled={loading}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  {ROLE_META[role].label}
                </motion.button>
              ))}
            </div>
          </div>
          )}
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
