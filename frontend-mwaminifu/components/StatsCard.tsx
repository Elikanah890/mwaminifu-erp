'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { AnimatedNumber } from '@/components/motion';

export type StatTone = 'navy' | 'teal' | 'gold' | 'red' | 'gray' | 'green';

const TONES: Record<StatTone, string> = {
  navy: 'text-primary',
  teal: 'text-secondary',
  gold: 'text-[#9a7b1f] dark:text-[#E3C25A]',
  red: 'text-danger',
  green: 'text-success',
  gray: 'text-muted-foreground',
};

const ICON_TONES: Record<StatTone, string> = {
  navy: 'bg-primary/10 text-primary',
  teal: 'bg-secondary/10 text-secondary',
  gold: 'bg-accent/15 text-[#9a7b1f] dark:text-[#E3C25A]',
  red: 'bg-danger/10 text-danger',
  green: 'bg-success/10 text-success',
  gray: 'bg-muted-2 text-muted-foreground',
};

export default function StatsCard({
  title,
  value,
  tone = 'navy',
  sub,
  icon,
  trend,
  href,
  sparkline,
  featured = false,
}: {
  title: string;
  value: ReactNode;
  tone?: StatTone;
  sub?: string;
  icon?: ReactNode;
  trend?: { value: number; label?: string };
  href?: string;
  sparkline?: number[];
  featured?: boolean;
}) {
  const trendUp = trend != null && trend.value >= 0;
  const base = featured ? 'navy-panel group relative overflow-hidden p-5' : 'surface-card group relative overflow-hidden p-5';
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${featured ? 'text-white/60' : 'text-muted-foreground'}`}>{title}</p>
        {icon ? (
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${
              featured ? 'bg-white/10 text-[#5eead4]' : ICON_TONES[tone]
            }`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className={`mt-3 text-2xl font-semibold tabular-nums ${featured ? 'text-[#d4af37]' : TONES[tone]}`}>
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </p>
      {(sub || trend || sparkline) && (
        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            {trend != null && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendUp ? 'text-success' : 'text-danger'}`}>
                {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(trend.value)}%
              </span>
            )}
            {sub ? <p className={`text-xs ${featured ? 'text-white/50' : 'text-subtle-foreground'}`}>{sub}</p> : null}
            {trend?.label ? <p className={`text-xs ${featured ? 'text-white/50' : 'text-subtle-foreground'}`}>{trend.label}</p> : null}
          </div>
          {sparkline && sparkline.length > 1 ? <Sparkline data={sparkline} tone={tone} featured={featured} /> : null}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        <motion.div
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`${base} transition-shadow hover:shadow-lg`}
        >
          {inner}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className={`${base} transition-shadow hover:shadow-lg`}
    >
      {inner}
    </motion.div>
  );
}

function Sparkline({ data, tone, featured }: { data: number[]; tone: StatTone; featured: boolean }) {
  const width = 72;
  const height = 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  const stroke = featured
    ? '#4fd1c5'
    : tone === 'red'
      ? 'var(--danger)'
      : tone === 'gold'
        ? 'var(--accent)'
        : tone === 'navy'
          ? 'var(--primary)'
          : 'var(--secondary)';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 opacity-90">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
