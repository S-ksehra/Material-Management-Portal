import { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { changePassword, updateUser } from '@/lib/authApi';
import { logAudit } from '@/lib/dataAccess';

export function SettingsScreen() {
  const { user, updateUserInSession } = useAuth();
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  if (!user) return null;

  const handleSaveProfile = async () => {
    setProfileMsg(null);
    if (!username.trim() || !email.trim()) {
      setProfileMsg({ type: 'error', msg: 'Username and Email cannot be empty.' });
      return;
    }
    setSavingProfile(true);
    try {
      const { user: updated } = await updateUser(user.id, {
        username: username.trim(),
        email: email.trim(),
        is_active: isActive,
      });
      updateUserInSession({
        username: updated.username,
        email: updated.email,
        is_active: updated.is_active,
      });
      await logAudit('User Updated', `Profile updated: ${updated.username}`, updated.username);
      setProfileMsg({ type: 'success', msg: 'Profile saved successfully.' });
    } catch (e) {
      setProfileMsg({ type: 'error', msg: e instanceof Error ? e.message : 'Failed to save profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleActive = async () => {
    setProfileMsg(null);
    const newActive = !isActive;
    setIsActive(newActive);
    setSavingProfile(true);
    try {
      const { user: updated } = await updateUser(user.id, { is_active: newActive });
      updateUserInSession({ is_active: updated.is_active });
      await logAudit('Account Status Changed', `${newActive ? 'Activated' : 'Deactivated'}: ${updated.username}`, updated.username);
      setProfileMsg({
        type: 'success',
        msg: newActive ? 'Account activated. You can now log in.' : 'Account deactivated. You will be logged out.',
      });
      if (!newActive) {
        setTimeout(() => {
          localStorage.removeItem('bom_auth_session');
          window.location.reload();
        }, 2000);
      }
    } catch (e) {
      setIsActive(!newActive);
      setProfileMsg({ type: 'error', msg: e instanceof Error ? e.message : 'Failed to update status.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!currentPw || !newPw || !confirmPw) {
      setPwMsg({ type: 'error', msg: 'All fields are required.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', msg: 'New password and confirm password do not match.' });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: 'error', msg: 'Password must be at least 8 characters with uppercase, lowercase, digit, and special character.' });
      return;
    }
    setSavingPw(true);
    try {
      await changePassword(user.id, currentPw, newPw);
      await logAudit('Password Changed', `User: ${user.username}`, user.username);
      updateUserInSession({ must_change_password: false });
      setPwMsg({ type: 'success', msg: 'Password changed successfully.' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (e) {
      setPwMsg({ type: 'error', msg: e instanceof Error ? e.message : 'Failed to change password.' });
    } finally {
      setSavingPw(false);
    }
  };

  const inputClass =
    'w-full pl-10 pr-4 py-2.5 bg-white border border-[var(--color-border-base)] rounded-lg text-sm ' +
    'hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] focus:ring-1 ' +
    'focus:ring-[var(--color-primary)]/20 outline-none transition text-[var(--color-text-primary)]';

  const labelClass = 'block text-sm font-medium text-[var(--color-text-primary)] mb-1.5';

  const btnClass =
    'inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] ' +
    'disabled:opacity-60 text-white rounded-lg text-sm font-medium transition shadow-sm';

  return (
    <div className="animate-fadeIn max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Manage your account details and password.</p>
      </div>

      {user.must_change_password && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fadeIn">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Password Change Required</p>
            <p className="text-sm text-amber-700">Please change your default password before continuing to use the panel.</p>
          </div>
        </div>
      )}

      {/* User Details */}
      <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <User size={18} className="text-[var(--color-primary)]" /> User Details
        </h2>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>User Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setProfileMsg(null); }}
                placeholder="Enter username..."
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Registered Email / User ID</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                value={email}
                onChange={(e) => { setEmail(e.target.value); setProfileMsg(null); }}
                placeholder="Enter email..."
                className={inputClass}
              />
            </div>
          </div>

          {/* Active/Inactive toggle */}
          <div className="flex items-center justify-between bg-[var(--color-primary-light)] rounded-lg p-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Account Status</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {isActive ? 'Active — you can log in with password or OTP.' : 'Inactive — login is disabled for this account.'}
              </p>
            </div>
            <button
              onClick={handleToggleActive}
              disabled={savingProfile}
              className="flex items-center gap-2 text-sm font-medium transition"
            >
              {isActive ? (
                <>
                  <ToggleRight size={36} className="text-[var(--color-success)]" />
                  <span className="text-[var(--color-success)]">Active</span>
                </>
              ) : (
                <>
                  <ToggleLeft size={36} className="text-[var(--color-text-secondary)]" />
                  <span className="text-[var(--color-text-secondary)]">Inactive</span>
                </>
              )}
            </button>
          </div>

          {profileMsg && (
            <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
              profileMsg.type === 'success'
                ? 'text-[var(--color-success)] bg-green-50 border border-green-200'
                : 'text-[var(--color-error)] bg-red-50 border border-red-200'
            }`}>
              {profileMsg.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
              <span>{profileMsg.msg}</span>
            </div>
          )}

          <button onClick={handleSaveProfile} disabled={savingProfile} className={btnClass}>
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Save Profile
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <KeyRound size={18} className="text-[var(--color-primary)]" /> Change Password
        </h2>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Current Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => { setCurrentPw(e.target.value); setPwMsg(null); }}
                placeholder="Enter current password..."
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>New Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setPwMsg(null); }}
                placeholder="Enter new password..."
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character.</p>
          </div>

          <div>
            <label className={labelClass}>Confirm New Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                type={showNewPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => { setConfirmPw(e.target.value); setPwMsg(null); }}
                onKeyDown={(e) => e.key === 'Enter' && !savingPw && handleChangePassword()}
                placeholder="Confirm new password..."
                className={`${inputClass} pr-10`}
              />
            </div>
          </div>

          {pwMsg && (
            <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
              pwMsg.type === 'success'
                ? 'text-[var(--color-success)] bg-green-50 border border-green-200'
                : 'text-[var(--color-error)] bg-red-50 border border-red-200'
            }`}>
              {pwMsg.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
              <span>{pwMsg.msg}</span>
            </div>
          )}

          <button onClick={handleChangePassword} disabled={savingPw} className={btnClass}>
            {savingPw ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
