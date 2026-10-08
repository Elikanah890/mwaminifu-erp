'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';

export type TabItem = { key: string; label: string; count?: number };

export default function Tabs({ tabs, active, onChange }: { tabs: TabItem[]; active: string; onChange: (key: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`tabs-${id}`}
                className="absolute inset-0 rounded-lg bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">
              {tab.label}
              {typeof tab.count === 'number' ? <span className="ml-2 text-xs opacity-70">{tab.count}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
