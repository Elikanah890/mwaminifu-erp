'use client';

import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  Cloud,
  Coins,
  Receipt,
  TrendingUp,
  UserCog,
  WifiOff,
} from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="gradient-mesh relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-lg">
      {children}
    </div>
  );
}

export default function FeatureVisual({ kind }: { kind: string }) {
  if (kind === 'pos') {
    return (
      <Frame>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Receipt size={14} className="text-secondary" /> {('Receipt #1042')}
        </div>
        <div className="mt-3 space-y-2">
          {[
            ['Sugar 1kg', '2 × 3,000'],
            ['Cooking oil', '1 × 6,500'],
            ['Soap bar', '3 × 1,500'],
          ].map(([name, qty], i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
            >
              <span className="text-foreground">{name}</span>
              <span className="text-muted-foreground tabular-nums">{qty}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-lg font-semibold text-primary tabular-nums">TZS 18,500</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
          <span className="rounded-lg bg-secondary/10 py-2 text-secondary">Cash</span>
          <span className="rounded-lg bg-muted py-2 text-muted-foreground">M-Pesa</span>
          <span className="rounded-lg bg-warning/10 py-2 text-warning">Credit</span>
        </div>
      </Frame>
    );
  }

  if (kind === 'inventory') {
    return (
      <Frame>
        <div className="space-y-3">
          {[
            ['Maize flour', 78, 'bg-success'],
            ['Cooking oil', 22, 'bg-warning'],
            ['Sugar', 6, 'bg-danger'],
          ].map(([name, pct, color], i) => (
            <div key={name as string}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-foreground">{name}</span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted-2">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.6, ease: EASE }}
                  className={`h-full rounded-full ${color}`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Low stock on Sugar
        </div>
      </Frame>
    );
  }

  if (kind === 'customers') {
    return (
      <Frame>
        <div className="space-y-2">
          {[
            ['Amina Juma', 'TZS 12,000', 'Due in 5 days', 'text-warning'],
            ['Peter Mwamba', 'TZS 0', 'Paid', 'text-success'],
            ['Grace Mrema', 'TZS 45,000', 'Overdue', 'text-danger'],
          ].map(([name, bal, status, color], i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className={`text-[11px] ${color}`}>{status}</p>
              </div>
              <span className="text-sm font-semibold text-primary tabular-nums">{bal}</span>
            </motion.div>
          ))}
        </div>
      </Frame>
    );
  }

  if (kind === 'reports') {
    return (
      <Frame>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Monthly revenue</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
            <TrendingUp size={11} /> +18%
          </span>
        </div>
        <div className="flex h-32 items-end gap-2">
          {[45, 62, 38, 78, 55, 90, 70].map((h, i) => (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.5, ease: EASE }}
              style={{ height: `${h}%`, transformOrigin: 'bottom' }}
              className="flex-1 rounded-t-md bg-gradient-to-t from-secondary to-secondary/50"
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ['Revenue', '1.24M'],
            ['Profit', '410K'],
            ['Margin', '33%'],
          ].map(([l, v]) => (
            <div key={l} className="rounded-lg bg-muted p-2">
              <p className="text-[10px] text-subtle-foreground">{l}</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">{v}</p>
            </div>
          ))}
        </div>
      </Frame>
    );
  }

  if (kind === 'finance') {
    return (
      <Frame>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-success/10 p-3">
            <p className="text-[11px] text-success">Cash in</p>
            <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">420,000</p>
          </div>
          <div className="rounded-xl bg-danger/10 p-3">
            <p className="text-[11px] text-danger">Cash out</p>
            <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">180,000</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {[
            ['Rent', '80,000'],
            ['Utilities', '25,000'],
            ['Loan repayment', '50,000'],
          ].map(([label, amount], i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 text-foreground">
                <Coins size={13} className="text-secondary" /> {label}
              </span>
              <span className="text-muted-foreground tabular-nums">{amount}</span>
            </motion.div>
          ))}
        </div>
      </Frame>
    );
  }

  if (kind === 'employees') {
    return (
      <Frame>
        <div className="space-y-2">
          {[
            ['John Mwita', 'Owner', 'full'],
            ['Neema Paul', 'Cashier', 'POS'],
            ['David Kim', 'Store keeper', 'Stock'],
          ].map(([name, role, access], i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {name.slice(0, 1)}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className="text-[11px] text-muted-foreground">{role}</p>
              </div>
              <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-secondary">{access}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <UserCog size={13} className="text-secondary" /> Granular permissions
        </div>
      </Frame>
    );
  }

  if (kind === 'multishop') {
    return (
      <Frame>
        <div className="grid grid-cols-3 gap-2">
          {['Kariakoo', 'Mbezi', 'Kigamboni'].map((shop, i) => (
            <motion.div
              key={shop}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-xl border p-3 text-center ${i === 0 ? 'border-secondary bg-secondary/10' : 'border-border bg-muted'}`}
            >
              <Building2 size={18} className={`mx-auto mb-1 ${i === 0 ? 'text-secondary' : 'text-muted-foreground'}`} />
              <p className="text-xs font-semibold text-foreground">{shop}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-accent/15 px-3 py-2 text-xs font-semibold text-[#9a7b1f] dark:text-[#E3C25A]">
          <span>5 shops linked</span>
          <span>1 free</span>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="flex items-center gap-2">
        <WifiOff size={18} className="text-warning" />
        <span className="text-sm font-semibold text-foreground">Offline mode</span>
      </div>
      <div className="mt-3 space-y-2">
        {['New sale saved locally', 'Stock updated', 'Receipt printed'].map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
          >
            <CheckCircle2 size={14} className="text-success" /> {item}
          </motion.div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary/10 px-3 py-2 text-xs font-semibold text-secondary">
        <Cloud size={14} /> Syncing when online…
      </div>
    </Frame>
  );
}
