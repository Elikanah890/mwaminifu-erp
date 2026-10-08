'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  children?: ReactNode;
}) {
  return (
    <section className="navy-panel relative overflow-hidden border-b border-white/10">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:44px_44px]" />
      <motion.div
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#0fa7a7]/20 blur-3xl"
      />
      <div className={`brand-container relative px-4 py-16 sm:px-6 sm:py-24 ${align === 'center' ? 'text-center' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className={align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-3xl'}
        >
          {eyebrow && <p className="section-eyebrow mb-4">{eyebrow}</p>}
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
          {subtitle && <p className={`mt-5 text-lg text-white/70 ${align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>{subtitle}</p>}
          {children && <div className="mt-8">{children}</div>}
        </motion.div>
      </div>
    </section>
  );
}
