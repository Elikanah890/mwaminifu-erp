'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { errorMessage } from '@/lib/format';
import { useToast } from '@/components/Toast';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

type Field = 'currentPassword' | 'newPassword' | 'confirm';

/** System Owner self-service password change. */
export default function ChangePasswordCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState<Record<Field, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (field: Field) => setVisible((prev) => ({ ...prev, [field]: !prev[field] }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/admin/change-password', { currentPassword, newPassword });
      // Changing the password revokes every session, including this one, so
      // sign out cleanly and send the admin back to the login screen.
      await apiClient.logout();
      toast('Password changed. Please sign in again.');
      router.replace('/login?changed=1');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const input = (
    field: Field,
    label: string,
    value: string,
    setValue: (v: string) => void,
    autoComplete: string
  ) => (
    <div className="space-y-1">
      <label htmlFor={`cp-${field}`} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={`cp-${field}`}
          className="input-field w-full pr-10"
          type={visible[field] ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={() => toggle(field)}
          aria-label={visible[field] ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {visible[field] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="surface-card">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-primary">Change Password</h2>
        <p className="text-xs text-subtle-foreground">
          Update your System Owner sign-in password. You will be asked to sign in again.
        </p>
      </div>
      <form onSubmit={submit} className="px-6 py-4 space-y-3">
        {error && (
          <div className="bg-danger/10 border border-danger/25 text-danger px-3 py-2 rounded-lg text-sm">{error}</div>
        )}
        {input('currentPassword', 'Current password', currentPassword, setCurrentPassword, 'current-password')}
        {input('newPassword', 'New password (min 8 characters)', newPassword, setNewPassword, 'new-password')}
        {input('confirm', 'Confirm new password', confirm, setConfirm, 'new-password')}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-navy inline-flex items-center gap-2 disabled:opacity-60">
            <KeyRound size={16} /> {saving ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
