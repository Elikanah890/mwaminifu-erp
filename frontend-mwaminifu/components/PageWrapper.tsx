'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function PageWrapper({
  title,
  description,
  actions,
  breadcrumb,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: string[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="brand-container px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-subtle-foreground" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="text-border-strong" />}
                <span className={i === breadcrumb.length - 1 ? 'font-semibold text-foreground' : ''}>{crumb}</span>
              </span>
            ))}
          </nav>
        )}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
        >
          <div>
            <p className="section-eyebrow mb-2">Mwaminifu</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
            {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06, ease: EASE }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

export function BreadcrumbLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="transition-colors hover:text-foreground">
      {children}
    </Link>
  );
}
