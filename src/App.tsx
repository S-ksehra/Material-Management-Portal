import { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard, Calculator, ScrollText, Boxes, Settings, X, LogOut, User as UserIcon } from 'lucide-react';
import type { BomFile, AuditEntry } from '@/types';
import { getActiveFile, getAllFiles, getAuditLog, insertBomFile, deactivateActiveFile, deleteActiveFile, getNextVersion, logAudit } from '@/lib/dataAccess';
import { parseBomExcel, validateBom } from '@/lib/bomEngine';
import { Dashboard } from '@/components/Dashboard';
import { CalculateScreen } from '@/components/CalculateScreen';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { LoginScreen } from '@/components/LoginScreen';
import { SettingsScreen } from '@/components/SettingsScreen';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { useAuth } from '@/lib/AuthContext';
import { logoutApi } from '@/lib/authApi';

type View = 'dashboard' | 'calculate' | 'audit' | 'settings';

const COMPANY_KEY = 'bom_company_name';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [activeFile, setActiveFile] = useState<BomFile | null>(null);
  const [allFiles, setAllFiles] = useState<BomFile[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; msg: string } | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [showChangePw, setShowChangePw] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COMPANY_KEY);
    if (saved) setCompanyName(saved);
  }, []);

  useEffect(() => {
    if (user?.must_change_password) {
      setShowChangePw(true);
    }
  }, [user]);

  const showToast = (type: 'success' | 'error' | 'warning', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [active, files, log] = await Promise.all([getActiveFile(), getAllFiles(), getAuditLog()]);
      setActiveFile(active);
      setAllFiles(files);
      setAuditLog(log);
    } catch {
      showToast('error', 'Failed to load data from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void refreshAll();
  }, [user, refreshAll]);

  const handleImport = async (file: File) => {
    if (!user) return;
    setImporting(true);
    setImportProgress(10);
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        showToast('error', 'Invalid file format. Only .xlsx files are supported.');
        return;
      }
      setImportProgress(25);
      const buf = await file.arrayBuffer();
      setImportProgress(45);
      const parsed = parseBomExcel(buf);
      setImportProgress(60);
      const validation = validateBom(parsed);
      if (!validation.valid) {
        showToast('error', `Validation failed:\n${validation.errors.slice(0, 8).join('\n')}${validation.errors.length > 8 ? `\n...and ${validation.errors.length - 8} more.` : ''}`);
        return;
      }
      setImportProgress(75);
      if (activeFile) {
        await deactivateActiveFile(file.name, user.username);
      }
      const version = await getNextVersion();
      const totalBom = new Set(parsed.bomSummary.map((b) => b.bom_name)).size;
      const totalProduced = new Set(parsed.consumptionDetails.map((c) => c.produced_item)).size;
      setImportProgress(85);
      await insertBomFile(
        file.name, version,
        parsed.bomSummary, parsed.consumptionDetails,
        totalBom, totalProduced, parsed.consumptionDetails.length,
        user.username,
      );
      setImportProgress(95);
      await logAudit('File Imported', `${file.name} (v${version}) — ${totalBom} BOMs, ${parsed.consumptionDetails.length} consumption records`, user?.username);
      if (activeFile) await logAudit('File Replaced', `${activeFile.file_name} replaced by ${file.name}`, user?.username);
      setImportProgress(100);
      await refreshAll();
      showToast('success', `File "${file.name}" imported and activated successfully.`);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setImporting(false);
      setTimeout(() => setImportProgress(0), 500);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteActiveFile(user.username);
      await logAudit('File Deleted', activeFile ? activeFile.file_name : '', user?.username);
      await refreshAll();
      setView('dashboard');
      showToast('success', 'Active BOM file deleted. History is preserved.');
    } catch {
      showToast('error', 'Failed to delete file.');
    }
  };

  const handleLogout = async () => {
    if (user) {
      await logoutApi(user.username);
    }
    signOut();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary-light)]">
        <Boxes size={32} className="text-[var(--color-primary)] animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const navItems: { id: View; label: string; icon: React.ElementType; disabled?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calculate', label: 'Calculate BOM', icon: Calculator, disabled: !activeFile },
    { id: 'audit', label: 'Audit Log', icon: ScrollText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-[var(--color-primary-light)]">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-[var(--color-border-base)] flex flex-col shrink-0 hidden md:flex">
        <div className="px-5 py-4 border-b border-[var(--color-border-base)]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <Boxes size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--color-primary)] leading-tight">Material Requirement</h1>
              <p className="text-xs text-[var(--color-text-secondary)]">Job Card Manage</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : item.disabled
                      ? 'text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed'
                      : 'text-[var(--color-text-primary)] hover:bg-[var(--color-primary-light)]'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[var(--color-border-base)]">
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
              <UserIcon size={16} className="text-[var(--color-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{user.username}</p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-red-50 hover:text-[var(--color-error)] transition"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden bg-white border-b border-[var(--color-border-base)] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <Boxes size={18} className="text-white" />
            </div>
            <span className="font-bold text-[var(--color-primary)] text-sm">Material Requirement</span>
          </div>
          <div className="flex items-center gap-2">
            <select value={view} onChange={(e) => setView(e.target.value as View)} className="text-sm border border-[var(--color-border-base)] rounded-md px-2 py-1">
              <option value="dashboard">Dashboard</option>
              <option value="calculate" disabled={!activeFile}>Calculate BOM</option>
              <option value="audit">Audit Log</option>
              <option value="settings">Settings</option>
            </select>
            <button onClick={handleLogout} className="text-[var(--color-text-secondary)] hover:text-[var(--color-error)]">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {view === 'dashboard' && (
            <Dashboard
              activeFile={activeFile}
              loading={loading}
              allFiles={allFiles}
              importing={importing}
              importProgress={importProgress}
              onImport={handleImport}
              onDelete={handleDelete}
              onRefresh={() => void refreshAll()}
              onOpenHistory={() => setHistoryOpen(true)}
              onGoToCalculate={() => setView('calculate')}
            />
          )}
          {view === 'calculate' && activeFile && (
            <CalculateScreen
              activeFile={activeFile}
              companyName={companyName}
              onCalculated={(item, qty) => logAudit('Calculation Executed', `Item: ${item}, Qty: ${qty}`, user.username)}
              onExport={(kind) => logAudit(`Export ${kind}`, `Item: ${activeFile.file_name}`, user.username)}
            />
          )}
          {view === 'calculate' && !activeFile && (
            <div className="text-center py-20 text-[var(--color-text-secondary)]">
              <Boxes size={40} className="mx-auto mb-3 opacity-40" />
              <p>Please import and activate a BOM file first.</p>
            </div>
          )}
          {view === 'audit' && (
            <div className="animate-fadeIn">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Audit Log</h1>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">Complete activity history.</p>
              <div className="bg-white border border-[var(--color-border-base)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
                <div className="overflow-auto max-h-[70vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[var(--color-primary)] text-white">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Date & Time</th>
                        <th className="text-left px-4 py-2 font-medium">Action</th>
                        <th className="text-left px-4 py-2 font-medium">User</th>
                        <th className="text-left px-4 py-2 font-medium">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLog.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-8 text-[var(--color-text-secondary)]">No activity logged yet.</td></tr>
                      ) : auditLog.map((a) => (
                        <tr key={a.id} className="hover:bg-[var(--color-primary-light)] transition border-b border-[var(--color-border-base)]">
                          <td className="px-4 py-2 text-[var(--color-text-secondary)] whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                          <td className="px-4 py-2 text-[var(--color-text-primary)] font-medium">{a.action}</td>
                          <td className="px-4 py-2 text-[var(--color-text-secondary)]">{a.user}</td>
                          <td className="px-4 py-2 text-[var(--color-text-secondary)]">{a.remarks ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {view === 'settings' && <SettingsScreen />}
        </main>
      </div>

      {/* History drawer */}
      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} files={allFiles} />

      {/* Change password modal for first login */}
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-fadeIn">
          <div className={`rounded-lg shadow-lg px-4 py-3 text-sm text-white whitespace-pre-line ${
            toast.type === 'success' ? 'bg-[var(--color-success)]' : toast.type === 'error' ? 'bg-[var(--color-error)]' : 'bg-[var(--color-warning)]'
          }`}>
            <div className="flex items-start gap-2">
              <span className="flex-1">{toast.msg}</span>
              <button onClick={() => setToast(null)} className="shrink-0"><X size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
