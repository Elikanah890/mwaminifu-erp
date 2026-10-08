'use client';

import { motion } from 'framer-motion';

export default function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <div key={step} className="flex items-center gap-3 sm:flex-1">
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05, duration: 0.25 }}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                done ? 'bg-success text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted-2 text-muted-foreground'
              }`}
            >
              {index + 1}
            </motion.span>
            <span className={`text-sm font-semibold ${active ? 'text-foreground' : done ? 'text-success' : 'text-subtle-foreground'}`}>
              {step}
            </span>
            {index < steps.length - 1 && <span className="hidden h-px flex-1 bg-border sm:block" />}
          </div>
        );
      })}
    </div>
  );
}
