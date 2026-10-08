'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-success/30 bg-card text-foreground',
  error: 'border-danger/30 bg-card text-foreground',
  warning: 'border-warning/30 bg-card text-foreground',
  info: 'border-border bg-card text-foreground',
};

const TONE_ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-success" />,
  error: <XCircle size={18} className="text-danger" />,
  warning: <TriangleAlert size={18} className="text-warning" />,
  info: <Info size={18} className="text-secondary" />,
};

const TONE_BAR: Record<ToastTone, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-secondary',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[200] w-full max-w-sm space-y-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto relative overflow-hidden rounded-xl border px-4 py-3 shadow-lg ${TONE_STYLES[t.tone]}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">{TONE_ICON[t.tone]}</span>
                <span className="flex-1 text-sm">{t.message}</span>
                <button onClick={() => dismiss(t.id)} className="text-subtle-foreground hover:text-foreground" aria-label="Dismiss">
                  <X size={16} />
                </button>
              </div>
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4.2, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-0.5 ${TONE_BAR[t.tone]}`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
