import { useState } from 'react';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { changePassword } from '@/lib/authApi';
import { useAuth } from '@/lib/AuthContext';

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { user, updateUserInSession } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <KeyRound size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Change Your Password</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">This is your first login. Please set a new password.</p>
          </div>
        </div>

        <ChangePasswordForm
          userId={user.id}
          onSuccess={() => {
            updateUserInSession({ must_change_password: false });
            onClose();
          }}
        />
      </div>
    </div>
  );
}

function ChangePasswordForm({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!currentPw || !newPw || !confirmPw) { setError('All fields are required.'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    if (newPw.length < 8) { setError('Password must be at least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character.'); return; }
    setLoading(true);
    try {
      await changePassword(userId, currentPw, newPw);
      setSuccess(true);
      setTimeout(onSuccess, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 size={40} className="mx-auto text-[var(--color-success)] mb-3" />
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Password changed successfully!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 text-sm text-[var(--color-error)] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Current Password</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={currentPw}
            onChange={(e) => { setCurrentPw(e.target.value); setError(''); }}
            placeholder="Enter current password..."
            className="w-full px-4 py-2.5 pr-10 bg-white border border-[var(--color-border-base)] rounded-lg text-sm focus:border-[var(--color-primary)] outline-none transition text-[var(--color-text-primary)]"
          />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">New Password</label>
        <input
          type={showPw ? 'text' : 'password'}
          value={newPw}
          onChange={(e) => { setNewPw(e.target.value); setError(''); }}
          placeholder="Enter new password..."
          className="w-full px-4 py-2.5 pr-10 bg-white border border-[var(--color-border-base)] rounded-lg text-sm focus:border-[var(--color-primary)] outline-none transition text-[var(--color-text-primary)]"
        />
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Confirm New Password</label>
        <input
          type={showPw ? 'text' : 'password'}
          value={confirmPw}
          onChange={(e) => { setConfirmPw(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmit()}
          placeholder="Confirm new password..."
          className="w-full px-4 py-2.5 bg-white border border-[var(--color-border-base)] rounded-lg text-sm focus:border-[var(--color-primary)] outline-none transition text-[var(--color-text-primary)]"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition shadow-sm"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Change Password'}
      </button>
    </div>
  );
}
