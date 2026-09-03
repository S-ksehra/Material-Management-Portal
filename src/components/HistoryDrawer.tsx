import { useEffect } from 'react';
import { X, Clock, Upload, FileText, Trash2, Replace } from 'lucide-react';
import type { BomFile } from '@/types';

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  files: BomFile[];
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-[var(--color-success)]',
  inactive: 'bg-gray-100 text-[var(--color-text-secondary)]',
  deleted: 'bg-red-100 text-[var(--color-error)]',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function HistoryDrawer({ open, onClose, files }: HistoryDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/40 animate-fadeIn" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg h-full bg-white shadow-2xl flex flex-col animate-slideIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-base)] bg-[var(--color-primary)]">
          <h2 className="text-white text-lg font-semibold flex items-center gap-2">
            <Clock size={20} /> File History
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {files.length === 0 ? (
            <p className="text-[var(--color-text-secondary)] text-sm text-center mt-8">No files imported yet.</p>
          ) : (
            <ol className="relative border-l-2 border-[var(--color-primary-light)] ml-3">
              {files.map((f, idx) => (
                <li key={f.id} className="mb-5 ml-6">
                  <span className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-primary)] ring-2 ring-white" />
                  <div className="bg-white border border-[var(--color-border-base)] rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} className="text-[var(--color-primary)] shrink-0" />
                        <span className="font-medium text-[var(--color-text-primary)] text-sm truncate">{f.file_name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[f.status] ?? ''}`}>
                        {f.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-[var(--color-text-secondary)]">
                      <span><Upload size={11} className="inline mr-1" />{f.uploaded_by}</span>
                      <span>v{f.version}</span>
                      <span className="col-span-2">Uploaded: {formatDate(f.uploaded_at)}</span>
                      {f.replaced_by && (
                        <span className="col-span-2 flex items-center gap-1 text-amber-600">
                          <Replace size={11} /> Replaced by: {f.replaced_by}
                        </span>
                      )}
                      {f.deleted_by && (
                        <span className="col-span-2 flex items-center gap-1 text-[var(--color-error)]">
                          <Trash2 size={11} /> Deleted by: {f.deleted_by} — {f.deleted_at ? formatDate(f.deleted_at) : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex gap-3 text-xs text-[var(--color-text-secondary)]">
                      <span>BOM: {f.total_bom}</span>
                      <span>Items: {f.total_produced_items}</span>
                      <span>Consumption: {f.total_consumption_items}</span>
                    </div>
                  </div>
                  {idx === 0 && files[0].status === 'active' && (
                    <span className="ml-1 text-xs text-[var(--color-primary)] font-medium">Current Active File</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
