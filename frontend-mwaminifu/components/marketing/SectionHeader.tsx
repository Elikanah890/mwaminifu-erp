'use client';

import { ReactNode } from 'react';
import { Reveal } from '@/components/motion';

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Reveal className={`${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className ?? ''}`}>
      <div className={align === 'center' && action ? 'flex flex-col items-center' : ''}>
        {eyebrow && <p className="section-eyebrow mb-3">{eyebrow}</p>}
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-4 text-muted-foreground">{subtitle}</p>}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </Reveal>
  );
}
