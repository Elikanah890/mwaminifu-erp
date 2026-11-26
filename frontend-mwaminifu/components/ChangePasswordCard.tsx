'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { errorMessage } from '@/lib/format';
import { useToast } from '@/components/Toast';
import { useI18n } from '@/lib/context/I18nContext';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

type Field = 'currentPassword' | 'newPassword' | 'confirm';

/** System Owner self-service password change. */
export default function ChangePasswordCard() {
  const { t } = useI18n();
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
      setError(t('newPasswordMinError'));
      return;
    }
    if (newPassword !== confirm) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    if (newPassword === currentPassword) {
      setError(t('newPasswordSame'));
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/admin/change-password', { currentPassword, newPassword });
      // Changing the password revokes every session, including this one, so
      // sign out cleanly and send the admin back to the login screen.
      await apiClient.logout();
      toast(t('passwordChangedSignIn'));
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
          aria-label={visible[field] ? t('hidePassword') : t('showPassword')}
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
        <h2 className="text-base font-semibold text-primary">{t('changePassword')}</h2>
        <p className="text-xs text-subtle-foreground">
          {t('changePasswordDesc')}
        </p>
      </div>
      <form onSubmit={submit} className="px-6 py-4 space-y-3">
        {error && (
          <div className="bg-danger/10 border border-danger/25 text-danger px-3 py-2 rounded-lg text-sm">{error}</div>
        )}
        {input('currentPassword', t('currentPassword'), currentPassword, setCurrentPassword, 'current-password')}
        {input('newPassword', t('newPasswordMin'), newPassword, setNewPassword, 'new-password')}
        {input('confirm', t('confirmNewPassword'), confirm, setConfirm, 'new-password')}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-navy inline-flex items-center gap-2 disabled:opacity-60">
            <KeyRound size={16} /> {saving ? t('saving') : t('changePassword')}
          </button>
        </div>
      </form>
    </div>
  );
}
