import { useMemo, useState } from 'react';
import {
  ScrollText,
  Search,
  RefreshCw,
  FilePlus2,
  FileSearch,
  User as UserIcon,
  KeyRound,
  Calculator,
  FileDown,
  FileText,
  Printer,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import type { AuditEntry } from '@/types';

interface AuditLogScreenProps {
  entries: AuditEntry[];
  onRefresh: () => void;
}

function actionIcon(action: string): React.ElementType {
  if (action.startsWith('Export Excel')) return FileDown;
  if (action.startsWith('Export PDF')) return FileText;
  if (action.startsWith('Export')) return Printer;
  if (action.startsWith('Preference')) return SlidersHorizontal;
  if (action.includes('Import')) return FilePlus2;
  if (action.includes('Password')) return KeyRound;
  if (action.includes('Calculation')) return Calculator;
  if (action.includes('Deleted')) return Trash2;
  if (action.includes('User') || action.includes('Account')) return UserIcon;
  return FileSearch;
}

function actionColor(action: string): string {
  if (action.includes('Deleted')) return 'bg-red-50 text-[var(--color-error)] border-red-200';
  if (action.includes('Imported')) return 'bg-green-50 text-[var(--color-success)] border-green-200';
  if (action.includes('Password') || action.includes('Replaced')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-border-base)]';
}

export function AuditLogScreen({ entries, onRefresh }: AuditLogScreenProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.user.toLowerCase().includes(q) ||
        (a.remarks ?? '').toLowerCase().includes(q)
    );
  }, [entries, search]);

  return (
    <div className="animate-fadeIn space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <ScrollText size={22} className="text-[var(--color-primary)]" />
            Audit Log
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Complete activity history — {entries.length} entries.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[var(--color-border-base)] rounded-lg text-sm font-medium text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search action, user, or remarks..."
          className="w-full pl-9 pr-3 py-2 bg-white border border-[var(--color-border-base)] rounded-lg text-sm outline-none focus:border-[var(--color-primary)] transition"
        />
      </div>

      {search && filtered.length === 0 ? (
        <div className="bg-white border border-[var(--color-border-base)] rounded-xl shadow-[var(--shadow-card)] py-14 text-center text-sm text-[var(--color-text-secondary)]">
          No entries match "{search}".
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[var(--color-border-base)] rounded-xl shadow-[var(--shadow-card)] py-14 text-center text-sm text-[var(--color-text-secondary)]">
          No activity logged yet.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-[var(--color-border-base)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
            <div className="overflow-auto max-h-[65vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--color-primary)] text-white">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Date & Time</th>
                    <th className="text-left px-4 py-2.5 font-medium">Action</th>
                    <th className="text-left px-4 py-2.5 font-medium">User</th>
                    <th className="text-left px-4 py-2.5 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const Icon = actionIcon(a.action);
                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-[var(--color-primary-light)] transition border-b border-[var(--color-border-base)]"
                      >
                        <td className="px-4 py-2.5 text-[var(--color-text-secondary)] whitespace-nowrap">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${actionColor(a.action)}`}>
                            <Icon size={12} />
                            {a.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-medium">{a.user}</td>
                        <td className="px-4 py-2.5 text-[var(--color-text-secondary)] break-words min-w-[240px]">{a.remarks ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((a) => {
              const Icon = actionIcon(a.action);
              return (
                <div
                  key={a.id}
                  className="bg-white border border-[var(--color-border-base)] rounded-xl p-3 shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${actionColor(a.action)}`}>
                      <Icon size={12} />
                      {a.action}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)] whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-primary)] font-medium mb-0.5">By {a.user}</p>
                  {a.remarks && (
                    <p className="text-xs text-[var(--color-text-secondary)] break-words">{a.remarks}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
