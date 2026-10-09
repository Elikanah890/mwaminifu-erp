'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { errorMessage } from '@/lib/format';
import { useToast } from '@/components/Toast';
import { KeyRound } from 'lucide-react';

/** System Owner self-service password change. */
export default function ChangePasswordCard() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/admin/change-password', { currentPassword, newPassword });
      toast('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface-card">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-primary">Change Password</h2>
        <p className="text-xs text-subtle-foreground">Update your System Owner sign-in password.</p>
      </div>
      <form onSubmit={submit} className="px-6 py-4 space-y-3">
        {error && (
          <div className="bg-danger/10 border border-danger/25 text-danger px-3 py-2 rounded-lg text-sm">{error}</div>
        )}
        <input
          className="input-field w-full"
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <input
          className="input-field w-full"
          type="password"
          autoComplete="new-password"
          placeholder="New password (min 6 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <input
          className="input-field w-full"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-navy inline-flex items-center gap-2 disabled:opacity-60">
            <KeyRound size={16} /> {saving ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
