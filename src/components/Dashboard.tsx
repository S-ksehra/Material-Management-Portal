import { useRef, useState } from 'react';
import {
  Upload, History, Trash2, RefreshCw, FileSpreadsheet, Package, Boxes, Layers,
  Calendar, CheckCircle2, AlertCircle, Loader2, FileText, ArrowRight, Database,
} from 'lucide-react';
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
  itemMasterCount: number;
  onImportItemMaster: (file: File) => Promise<void>;
  importingItemMaster: boolean;
}

function KpiCard({
  icon: Icon, label, value, sub,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--color-primary)] transition-all duration-200">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
          <Icon size={16} className="text-[var(--color-primary)]" />
        </div>
        <p className="text-xs font-medium text-[var(--color-text-secondary)] leading-tight">{label}</p>
      </div>
      <p className="text-xl font-bold text-[var(--color-text-primary)] truncate">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">{sub}</p>}
    </div>
  );
}

export function Dashboard({
  activeFile, loading, onImport, onDelete, onRefresh, onOpenHistory, onGoToCalculate, importing, importProgress, allFiles, itemMasterCount, onImportItemMaster, importingItemMaster,
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemMasterInputRef = useRef<HTMLInputElement>(null);
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
    <div className="animate-fadeIn space-y-5">
      {/* ---------- Header ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {activeFile
              ? `Ready for calculation.`
              : 'Import a BOM file to get started.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Upload size={16} /> Import Excel
          </button>
          <button
            onClick={onOpenHistory}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg text-sm font-medium transition"
          >
            <History size={16} /> History
          </button>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[var(--color-border-base)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] rounded-lg text-sm font-medium transition"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          {activeFile && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white rounded-lg text-sm font-medium transition"
            >
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ''; }}
      />

      <input
        ref={itemMasterInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportItemMaster(f); e.target.value = ''; }}
      />

      {/* ---------- KPI Row ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          icon={CheckCircle2}
          label="Active BOM"
          value={activeFile ? 'Yes' : 'None'}
          sub={activeFile ? activeFile.file_name : 'No file active'}
        />
        <KpiCard
          icon={Calendar}
          label="Upload Date"
          value={activeFile ? new Date(activeFile.uploaded_at).toLocaleDateString() : '—'}
          sub={activeFile ? new Date(activeFile.uploaded_at).toLocaleTimeString() : ''}
        />
        <KpiCard icon={FileSpreadsheet} label="Total BOM" value={activeFile?.total_bom ?? 0} />
        <KpiCard icon={Package} label="Produced Items" value={activeFile?.total_produced_items ?? 0} />
        <KpiCard icon={Boxes} label="Consumption Items" value={activeFile?.total_consumption_items ?? 0} />
        <KpiCard icon={Layers} label="Version" value={activeFile ? `v${activeFile.version}` : '—'} />
      </div>

      {/* ---------- Item Master Card ---------- */}
      <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-4 shadow-[var(--shadow-card)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
            <Database size={18} className="text-[var(--color-primary)]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Item Master</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {itemMasterCount > 0
                ? `${itemMasterCount} items mapped — maps Item Codes to Produced Items`
                : 'No Item Master imported yet — maps Item Codes to Produced Items'}
            </p>
          </div>
        </div>
        <button
          onClick={() => itemMasterInputRef.current?.click()}
          disabled={importingItemMaster}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-60 rounded-lg text-sm font-medium transition"
        >
          {importingItemMaster ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {itemMasterCount > 0 ? 'Re-import Item Master' : 'Import Item Master'}
        </button>
      </div>

      {/* ---------- Main Content ---------- */}
      {!activeFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`bg-white rounded-xl p-12 text-center transition-all duration-200 ${
            dragOver
              ? 'border-2 border-[var(--color-primary)] shadow-[var(--shadow-card-hover)]'
              : 'border-2 border-dashed border-[var(--color-border-base)] shadow-[var(--shadow-card)]'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mx-auto mb-4">
            <Upload size={28} className="text-[var(--color-primary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">No active BOM file</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-5">Drag & drop your .xlsx file here, or click Import Excel.</p>
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
          <div className="lg:col-span-2 bg-white border border-[var(--color-border-base)] rounded-xl p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={22} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--color-text-primary)] break-all">{activeFile.file_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium">
                      <CheckCircle2 size={11} /> Active
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">Version {activeFile.version}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onGoToCalculate}
                className="group inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                <Layers size={16} /> Calculate BOM
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { value: activeFile.total_bom, label: 'BOMs' },
                { value: activeFile.total_produced_items, label: 'Produced Items' },
                { value: activeFile.total_consumption_items, label: 'Consumption Records' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[var(--color-primary-light)] rounded-lg p-4 text-center hover:bg-[var(--color-primary)] group transition"
                >
                  <p className="text-2xl font-bold text-[var(--color-primary)] group-hover:text-white transition">{stat.value}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] group-hover:text-white/80 transition mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Import progress / quick import */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-xl p-5 shadow-[var(--shadow-card)] flex flex-col items-center justify-center text-center transition-all duration-200 ${
              dragOver
                ? 'bg-white border-2 border-[var(--color-primary)] shadow-[var(--shadow-card-hover)]'
                : 'bg-white border-2 border-dashed border-[var(--color-border-base)]'
            }`}
          >
            {importing ? (
              <>
                <Loader2 className="animate-spin text-[var(--color-primary)] mb-3" size={30} />
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Importing & validating...</p>
                <div className="w-full bg-[var(--color-primary-light)] rounded-full h-2 mt-4 overflow-hidden">
                  <div
                    className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">{importProgress}%</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mb-3">
                  <Upload size={20} className="text-[var(--color-primary)]" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Upload new BOM file</p>
                <p className="text-xs text-[var(--color-text-secondary)] mb-4 mt-0.5">Drag & drop or click to browse</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg text-sm font-medium transition"
                >
                  Choose File
                </button>
                <p className="text-xs text-[var(--color-text-secondary)] mt-4">{allFiles.length} file(s) in history</p>
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
