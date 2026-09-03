import { useRef, useState } from 'react';
import { Upload, History, Trash2, RefreshCw, FileSpreadsheet, Package, Boxes, Layers, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { BomFile } from '@/types';
import { ConfirmDialog } from './ConfirmDialog';

interface DashboardProps {
  activeFile: BomFile | null;
  loading: boolean;
  allFiles: BomFile[];
  onImport: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  onRefresh: () => void;
  onOpenHistory: () => void;
  onGoToCalculate: () => void;
  importing: boolean;
  importProgress: number;
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
        <Icon size={20} className="text-[var(--color-primary)]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-text-secondary)] font-medium">{label}</p>
        <p className="text-lg font-semibold text-[var(--color-text-primary)] truncate">{value}</p>
        {sub && <p className="text-xs text-[var(--color-text-secondary)] truncate">{sub}</p>}
      </div>
    </div>
  );
}

export function Dashboard({
  activeFile, loading, onImport, onDelete, onRefresh, onOpenHistory, onGoToCalculate, importing, importProgress, allFiles,
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelected = (file: File) => {
    if (activeFile) {
      setPendingFile(file);
      setConfirmReplace(true);
    } else {
      void onImport(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  };

  const confirmReplaceYes = () => {
    setConfirmReplace(false);
    if (pendingFile) void onImport(pendingFile);
    setPendingFile(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Material Requirement Tool</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Upload size={16} /> Import Excel
          </button>
          <button
            onClick={onOpenHistory}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg text-sm font-medium transition"
          >
            <History size={16} /> History
          </button>
          {activeFile && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white rounded-lg text-sm font-medium transition"
            >
              <Trash2 size={16} /> Delete Active File
            </button>
          )}
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[var(--color-border-base)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-sm font-medium transition"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ''; }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard icon={CheckCircle2} label="Active BOM" value={activeFile ? 'Yes' : 'None'} sub={activeFile ? activeFile.file_name : 'No file active'} />
        <KpiCard icon={Calendar} label="Upload Date" value={activeFile ? new Date(activeFile.uploaded_at).toLocaleDateString() : '—'} sub={activeFile ? new Date(activeFile.uploaded_at).toLocaleTimeString() : ''} />
        <KpiCard icon={FileSpreadsheet} label="Total BOM" value={activeFile?.total_bom ?? 0} />
        <KpiCard icon={Package} label="Total Produced Items" value={activeFile?.total_produced_items ?? 0} />
        <KpiCard icon={Boxes} label="Total Consumption Items" value={activeFile?.total_consumption_items ?? 0} />
        <KpiCard icon={Layers} label="Version" value={activeFile ? `v${activeFile.version}` : '—'} />
      </div>

      {/* Drag & Drop / Empty state */}
      {!activeFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`bg-white border-2 border-dashed rounded-xl p-12 text-center transition ${dragOver ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border-base)]'}`}
        >
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mx-auto mb-4">
            <Upload size={28} className="text-[var(--color-primary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">No active BOM file</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">Drag & drop your .xlsx file here, or click Import Excel.</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Upload size={16} /> Choose File
          </button>
          <div className="mt-6 text-xs text-[var(--color-text-secondary)] flex items-center justify-center gap-2">
            <AlertCircle size={14} /> Required sheets: BOM Summary, Consumption details.
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Active file card */}
          <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-5 shadow-[var(--shadow-card)] lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                  <FileSpreadsheet size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{activeFile.file_name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-[var(--color-success)] font-medium">
                      <CheckCircle2 size={11} /> Active
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">Version {activeFile.version}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onGoToCalculate}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                <Layers size={16} /> Calculate BOM
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[var(--color-primary-light)] rounded-lg p-3">
                <p className="text-2xl font-bold text-[var(--color-primary)]">{activeFile.total_bom}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">BOMs</p>
              </div>
              <div className="bg-[var(--color-primary-light)] rounded-lg p-3">
                <p className="text-2xl font-bold text-[var(--color-primary)]">{activeFile.total_produced_items}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Produced Items</p>
              </div>
              <div className="bg-[var(--color-primary-light)] rounded-lg p-3">
                <p className="text-2xl font-bold text-[var(--color-primary)]">{activeFile.total_consumption_items}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Consumption Records</p>
              </div>
            </div>
          </div>

          {/* Import progress / quick import */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`bg-white border-2 border-dashed rounded-xl p-5 shadow-[var(--shadow-card)] flex flex-col items-center justify-center text-center transition ${dragOver ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border-base)]'}`}
          >
            {importing ? (
              <>
                <Loader2 className="animate-spin text-[var(--color-primary)] mb-3" size={28} />
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Importing & validating...</p>
                <div className="w-full bg-[var(--color-primary-light)] rounded-full h-2 mt-3 overflow-hidden">
                  <div className="bg-[var(--color-primary)] h-full transition-all" style={{ width: `${importProgress}%` }} />
                </div>
              </>
            ) : (
              <>
                <Upload size={28} className="text-[var(--color-primary)] mb-2" />
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Upload new BOM file</p>
                <p className="text-xs text-[var(--color-text-secondary)] mb-3">Drag & drop or click to browse</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg text-sm font-medium transition"
                >
                  Choose File
                </button>
                <p className="text-xs text-[var(--color-text-secondary)] mt-3">{allFiles.length} file(s) in history</p>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReplace}
        title="Replace Active BOM File"
        message="Existing BOM file will be replaced.\n\nDo you want to continue?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={confirmReplaceYes}
        onCancel={() => { setConfirmReplace(false); setPendingFile(null); }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete BOM File"
        message="Do you really want to delete current BOM file?"
        confirmLabel="Delete"
        danger
        onConfirm={async () => { setConfirmDelete(false); await onDelete(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
