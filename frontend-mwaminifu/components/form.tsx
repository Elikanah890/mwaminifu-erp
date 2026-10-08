'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

type FieldBase = {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
};

function FieldShell({ label, required, error, hint, children }: FieldBase & { children: ReactNode }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className={error ? 'animate-shake' : undefined}>{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-subtle-foreground">{hint}</p>}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-1 text-xs text-danger"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

export function Input({
  label,
  required,
  error,
  hint,
  className,
  ...props
}: FieldBase & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint}>
      <input className={`input-field ${error ? 'border-danger focus:border-danger' : ''} ${className ?? ''}`} {...props} />
    </FieldShell>
  );
}

export function Textarea({
  label,
  required,
  error,
  hint,
  className,
  ...props
}: FieldBase & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint}>
      <textarea className={`input-field min-h-[90px] ${error ? 'border-danger' : ''} ${className ?? ''}`} {...props} />
    </FieldShell>
  );
}

export function Select({
  label,
  required,
  error,
  hint,
  children,
  className,
  ...props
}: FieldBase & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint}>
      <select className={`input-field ${error ? 'border-danger' : ''} ${className ?? ''}`} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function PhoneInput(props: FieldBase & React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} inputMode="tel" autoComplete="tel" placeholder={props.placeholder ?? '255XXXXXXXXX'} />;
}

export function DatePicker(props: FieldBase & React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} type="date" />;
}

export function SubmitButton({
  children,
  loading,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; className?: string }) {
  return (
    <button className={`btn-navy ${className ?? ''}`} disabled={loading || props.disabled} {...props}>
      {loading ? 'Saving...' : children}
    </button>
  );
}
