import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Search,
  Calculator,
  FileDown,
  FileText,
  Printer,
  Loader2,
  ChevronDown,
  Check,
  Package,
  Boxes,
  Layers,
  CircleDot,
  Filter,
  X,
  TrendingUp,
  BarChart3,
  ClipboardList,
} from 'lucide-react';

import type {
  BomFile,
  CalculationResult,
  MaterialType,
  ItemMasterEntry,
} from '@/types';

import {
  calculateBom,
  getDistinctProducedItems,
  getBomNamesForProducedItem,
  createItemCodeResolver,
} from '@/lib/bomEngine';

import {
  exportToExcel,
  exportToPdf,
  printResult,
  printStageWise,
  buildStagePages,
} from '@/lib/exporters';

import type { StagePageData } from '@/lib/exporters';

import { ExplosionTree } from './ExplosionTree';
import { TypeBadge } from './TypeBadge';

interface CalculateScreenProps {
  activeFile: BomFile;
  companyName: string;
  itemMaster: ItemMasterEntry[];
  onCalculated: (item: string, qty: number) => void;
  onExport: (kind: 'Excel' | 'PDF') => void;
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, '');
}

const TYPE_COLOR: Record<MaterialType, string> = {
  'Finished Good': '#14532D',
  'Semi Finished': '#1E3A8A',
  'Raw Material': '#92400E',
};

const TYPE_BG: Record<MaterialType, string> = {
  'Finished Good': '#f0fdf4',
  'Semi Finished': '#eff6ff',
  'Raw Material': '#fef3c7',
};

export function CalculateScreen({
  activeFile,
  companyName,
  itemMaster,
  onCalculated,
  onExport,
}: CalculateScreenProps) {
  const distinctItems = useMemo(
    () => getDistinctProducedItems(activeFile.consumption_details),
    [activeFile]
  );

  const resolveItemCode = useMemo(
    () => createItemCodeResolver(itemMaster),
    [itemMaster]
  );

  const [selectedItem, setSelectedItem] = useState('');
  const [selectedBom, setSelectedBom] = useState('');
  const [qty, setQty] = useState('');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [bomDropdownOpen, setBomDropdownOpen] = useState(false);
  const [bomSearch, setBomSearch] = useState('');
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<MaterialType | 'all'>('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'requirement' | 'rawsummary'>('hierarchy');
  const resultsRef = useRef<HTMLDivElement>(null);

  const selectedItemCode = useMemo(
    () => (selectedItem ? resolveItemCode(selectedItem) : ''),
    [selectedItem, resolveItemCode]
  );

  const bomNamesForItem = useMemo(
    () =>
      selectedItem
        ? getBomNamesForProducedItem(activeFile.bom_summary, selectedItem)
        : [],
    [selectedItem, activeFile]
  );

  useEffect(() => {
    if (selectedItem && bomNamesForItem.length === 1 && selectedBom !== bomNamesForItem[0]) {
      setSelectedBom(bomNamesForItem[0]);
    } else if (selectedItem && bomNamesForItem.length > 1 && selectedBom && !bomNamesForItem.includes(selectedBom)) {
      setSelectedBom('');
    } else if (!selectedItem && selectedBom) {
      setSelectedBom('');
    }
  }, [selectedItem, bomNamesForItem, selectedBom]);

  const autoFetch = useMemo(() => {
    if (!selectedItem) return null;
    const summaryRow = activeFile.bom_summary.find(
      (b) => b.produced_item === selectedItem && (!selectedBom || b.bom_name === selectedBom)
    );
    const consRow = activeFile.consumption_details.find(
      (c) => c.produced_item === selectedItem && (!selectedBom || c.bom_name === selectedBom)
    );
    return {
      bomName: selectedBom || (consRow?.bom_name ?? summaryRow?.bom_name ?? '—'),
      standardQty: summaryRow?.quantity ?? 0,
      unit: summaryRow?.unit ?? consRow?.unit ?? '—',
      itemCode: resolveItemCode(selectedItem),
    };
  }, [selectedItem, selectedBom, activeFile, resolveItemCode]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return distinctItems.filter((item) => {
      if (item.toLowerCase().includes(q)) return true;
      const code = resolveItemCode(item);
      return code ? code.toLowerCase().includes(q) : false;
    });
  }, [distinctItems, search, resolveItemCode]);

  const filteredBomNames = useMemo(() => {
    const q = bomSearch.toLowerCase();
    return bomNamesForItem.filter((name) => name.toLowerCase().includes(q));
  }, [bomNamesForItem, bomSearch]);

  const handleCalculate = async () => {
    setError('');
    if (!selectedItem) { setError('Please select a Produced Item.'); return; }
    if (bomNamesForItem.length > 1 && !selectedBom) { setError('Please select a Bill of Material Name.'); return; }
    const n = parseFloat(qty);
    if (isNaN(n) || n <= 0) { setError('Production Quantity must be a positive number.'); return; }
    setCalculating(true);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const res = calculateBom(
        activeFile.bom_summary,
        activeFile.consumption_details,
        selectedItem,
        n,
        resolveItemCode,
        selectedBom || undefined
      );
      setResult(res);
      onCalculated(selectedItem, n);
      setActiveTab('hierarchy');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calculation failed.');
    } finally {
      setCalculating(false);
    }
  };

  const handleExportExcel = () => { if (!result) return; exportToExcel(result); onExport('Excel'); };
  const handleExportPdf = () => { if (!result) return; exportToPdf(result, companyName, null); onExport('PDF'); };
  const handlePrint = () => { if (!result) return; printResult(result); };

  const stagePages = useMemo(
    () => (result ? buildStagePages(activeFile, result) : []),
    [result, activeFile]
  );

  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const toggleStage = (stage: string): void => {
    setSelectedStages((prev) => prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]);
  };
  const handleStageWisePrint = () => { if (!result) return; printStageWise(activeFile, result, companyName); };
  const handleSelectedStagePrint = () => {
    if (!result || selectedStages.length === 0) return;
    printStageWise(activeFile, result, companyName, selectedStages);
  };

  const filteredRequirements = useMemo(() => {
    if (!result) return [];
    return result.requirements.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterLevel !== 'all' && String(r.level) !== filterLevel) return false;
      if (filterUnit !== 'all' && r.unit !== filterUnit) return false;
      if (globalSearch) {
        const g = globalSearch.toLowerCase();
        return r.item.toLowerCase().includes(g) || r.type.toLowerCase().includes(g) || r.parent_bom.toLowerCase().includes(g) || r.unit.toLowerCase().includes(g);
      }
      return true;
    });
  }, [result, filterType, filterLevel, filterUnit, globalSearch]);

  const availableLevels = useMemo(() => {
    if (!result) return [];
    return [...new Set(result.requirements.map((r) => r.level))].sort((a, b) => a - b);
  }, [result]);

  const availableUnits = useMemo(() => {
    if (!result) return [];
    return [...new Set(result.requirements.map((r) => r.unit).filter(Boolean))].sort();
  }, [result]);

  const typeSummary = useMemo(() => {
    if (!result) return null;
    const counts: Record<MaterialType, number> = { 'Finished Good': 0, 'Semi Finished': 0, 'Raw Material': 0 };
    result.requirements.forEach((r) => counts[r.type]++);
    return counts;
  }, [result]);

  return (
    <div className="animate-fadeIn flex flex-col gap-5">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">
            Calculate Bill Of Material
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Select a produced item, BOM, and production quantity to generate requirements.
          </p>
        </div>
        {result && (
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportExcel} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm">
              <FileDown size={13} /> Excel
            </button>
            <button onClick={handleExportPdf} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-xs font-semibold transition shadow-sm">
              <FileText size={13} /> PDF
            </button>
            <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--color-border-base)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-xs font-semibold transition">
              <Printer size={13} /> Print
            </button>
            <button onClick={handleStageWisePrint} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#193754] hover:bg-[#122640] text-white rounded-lg text-xs font-semibold transition shadow-sm">
              <ClipboardList size={13} /> Print Stage wise
            </button>
          </div>
        )}
      </div>

      {/* ── Search / Input Panel ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[var(--color-border-base)] shadow-[var(--shadow-card)] overflow-visible">

        {/* Top accent bar */}
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-[var(--color-primary)] via-[#c0315a] to-[var(--color-primary-hover)]" />

        <div className="p-5 grid md:grid-cols-3 gap-4">

          {/* Produced Item */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
              Produced Item
            </label>
            <div className="relative">
              <button
                onClick={() => { setDropdownOpen(!dropdownOpen); setSearch(''); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 bg-white border rounded-xl text-sm transition text-left focus:outline-none ${dropdownOpen ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'border-[var(--color-border-base)] hover:border-[var(--color-primary)]'}`}
              >
                <span className={selectedItem ? 'text-[var(--color-text-primary)] font-medium truncate pr-2' : 'text-[var(--color-text-secondary)]'}>
                  {selectedItem
                    ? (selectedItemCode ? `${selectedItemCode} | ${selectedItem}` : selectedItem)
                    : 'Search and select item…'}
                </span>
                {selectedItem ? (
                  <X size={14} className="shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                    onClick={(e) => { e.stopPropagation(); setSelectedItem(''); setResult(null); }} />
                ) : (
                  <ChevronDown size={15} className={`shrink-0 text-[var(--color-text-secondary)] transition ${dropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute z-20 mt-1 w-full min-w-[320px] bg-white border border-[var(--color-border-base)] rounded-xl shadow-xl overflow-hidden flex flex-col">
                    <div className="px-3 py-2 border-b border-[var(--color-border-base)] flex items-center gap-2 bg-[var(--color-primary-light)]">
                      <Search size={14} className="text-[var(--color-primary)] shrink-0" />
                      <input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search item or code…"
                        className="flex-1 text-sm outline-none bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
                      />
                      {search && <button onClick={() => setSearch('')}><X size={13} className="text-[var(--color-text-secondary)]" /></button>}
                    </div>
                    <div className="overflow-auto max-h-56">
                      {filteredItems.length === 0 ? (
                        <p className="p-4 text-xs text-[var(--color-text-secondary)] text-center">No items found.</p>
                      ) : (
                        filteredItems.slice(0, 200).map((item) => {
                          const code = resolveItemCode(item);
                          return (
                            <button
                              key={item}
                              onClick={() => { setSelectedItem(item); setSelectedBom(''); setDropdownOpen(false); setResult(null); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--color-primary-light)] transition border-b border-[var(--color-border-base)]/50 last:border-0 ${selectedItem === item ? 'bg-[var(--color-primary-light)] font-semibold' : ''}`}
                            >
                              {code && <span className="text-[var(--color-text-secondary)] shrink-0 font-mono">{code}</span>}
                              <span className="text-[var(--color-text-primary)] truncate">{item}</span>
                              {selectedItem === item && <Check size={12} className="ml-auto shrink-0 text-[var(--color-primary)]" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="px-3 py-1.5 bg-[var(--color-primary-light)]/50 border-t border-[var(--color-border-base)]">
                      <span className="text-[10px] text-[var(--color-text-secondary)]">{filteredItems.length} of {distinctItems.length} items</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Auto-fetched info pill */}
            {autoFetch && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium">
                  Std Qty: {autoFetch.standardQty} {autoFetch.unit}
                </span>
                {autoFetch.itemCode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    Code: {autoFetch.itemCode}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* BOM Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
              BOM Name
            </label>
            {bomNamesForItem.length <= 1 ? (
              <div className={`flex items-center px-3 py-2.5 border rounded-xl text-sm ${!selectedItem ? 'opacity-50' : ''} bg-slate-50 border-[var(--color-border-base)]`}>
                <span className="truncate text-[var(--color-text-primary)] font-medium">
                  {autoFetch?.bomName || (selectedItem ? 'Auto-selected' : 'Select item first')}
                </span>
                {bomNamesForItem.length === 1 && <Check size={14} className="ml-auto shrink-0 text-[var(--color-success)]" />}
              </div>
            ) : (
              <div className="relative">
                <button
                  disabled={!selectedItem}
                  onClick={() => { setBomDropdownOpen(!bomDropdownOpen); setBomSearch(''); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 bg-white border rounded-xl text-sm transition text-left focus:outline-none disabled:opacity-50 ${bomDropdownOpen ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'border-[var(--color-border-base)] hover:border-[var(--color-primary)]'}`}
                >
                  <span className={selectedBom ? 'text-[var(--color-text-primary)] font-medium truncate pr-2' : 'text-[var(--color-text-secondary)]'}>
                    {selectedBom || 'Select BOM…'}
                  </span>
                  <ChevronDown size={15} className={`shrink-0 text-[var(--color-text-secondary)] transition ${bomDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {bomDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setBomDropdownOpen(false)} />
                    <div className="absolute z-20 mt-1 w-full min-w-[320px] bg-white border border-[var(--color-border-base)] rounded-xl shadow-xl overflow-hidden flex flex-col">
                      <div className="px-3 py-2 border-b border-[var(--color-border-base)] flex items-center gap-2 bg-[var(--color-primary-light)]">
                        <Search size={14} className="text-[var(--color-primary)] shrink-0" />
                        <input
                          autoFocus
                          value={bomSearch}
                          onChange={(e) => setBomSearch(e.target.value)}
                          placeholder="Search BOM name…"
                          className="flex-1 text-sm outline-none bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
                        />
                      </div>
                      <div className="overflow-auto max-h-56">
                        {filteredBomNames.length === 0 ? (
                          <p className="p-4 text-xs text-[var(--color-text-secondary)] text-center">No BOMs found.</p>
                        ) : (
                          filteredBomNames.map((name) => (
                            <button
                              key={name}
                              onClick={() => { setSelectedBom(name); setBomDropdownOpen(false); setResult(null); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--color-primary-light)] transition border-b border-[var(--color-border-base)]/50 last:border-0 ${selectedBom === name ? 'bg-[var(--color-primary-light)] font-semibold' : ''}`}
                            >
                              <span className="text-[var(--color-text-primary)] truncate">{name}</span>
                              {selectedBom === name && <Check size={12} className="ml-auto shrink-0 text-[var(--color-primary)]" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {bomNamesForItem.length > 1 && (
              <span className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">{bomNamesForItem.length} BOMs available for this item</span>
            )}
          </div>

          {/* Quantity + Calculate */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
              Production Quantity
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
                placeholder="Enter quantity…"
                className="flex-1 min-w-0 px-3 py-2.5 border border-[var(--color-border-base)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition"
              />
              <button
                onClick={handleCalculate}
                disabled={calculating}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition shadow-sm"
              >
                {calculating
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Calculator size={15} />}
                {calculating ? 'Calculating…' : 'Calculate'}
              </button>
            </div>
            {autoFetch && autoFetch.unit !== '—' && (
              <span className="text-[10px] text-[var(--color-text-secondary)]">Unit: <strong>{autoFetch.unit}</strong></span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-4 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <X size={13} className="shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* ── Calculating Overlay ───────────────────────────────────── */}
      {calculating && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" />
            </div>
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Calculating requirements…</span>
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────── */}
      {result && !calculating && (
        <div ref={resultsRef} className="flex flex-col gap-5 animate-fadeIn">

          {/* Production Summary ─────────────────────── */}
          <div className="bg-white rounded-2xl border border-[var(--color-border-base)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[#9e1a4a]">
              <TrendingUp size={15} className="text-white/80" />
              <h2 className="text-sm font-bold text-white tracking-wide">Production Summary</h2>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'BOM Name', value: result.summary.bom_name, icon: FileText, wide: true },
                { label: 'Standard Qty', value: `${formatNum(result.summary.standard_qty)} ${result.summary.unit}`, icon: Layers },
                { label: 'Item Code', value: result.summary.item_code || '—', icon: CircleDot },
                { label: 'Finished Good', value: result.summary.finished_good, icon: Package, wide: true },
                { label: 'Production Qty', value: `${formatNum(result.summary.production_qty)} ${result.summary.unit}`, icon: Boxes },
              ].map((f) => (
                <div key={f.label} className={`flex flex-col gap-1 p-3 rounded-xl bg-[var(--color-primary-light)]/60 border border-[var(--color-primary-light)] ${(f as { wide?: boolean }).wide ? 'lg:col-span-2' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <f.icon size={12} className="text-[var(--color-primary)] shrink-0" />
                    <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">{f.label}</span>
                  </div>
                  <span className="text-sm font-bold text-[var(--color-text-primary)] break-words leading-tight">{f.value}</span>
                </div>
              ))}
            </div>

            {/* Type count chips */}
            {typeSummary && (
              <div className="px-4 pb-4 flex flex-wrap gap-2">
                {(['Finished Good', 'Semi Finished', 'Raw Material'] as MaterialType[]).map((t) => (
                  <div key={t} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: TYPE_COLOR[t] }}>
                    <span className="tabular-nums">{typeSummary[t]}</span>
                    <span className="opacity-85">{t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tab Panel ──────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-[var(--color-border-base)] shadow-[var(--shadow-card)] overflow-hidden">

            {/* Tabs */}
            <div className="flex items-center gap-0 border-b border-[var(--color-border-base)] overflow-x-auto">
              {([
                { id: 'hierarchy' as const, label: 'Material Hierarchy', icon: Layers },
                { id: 'requirement' as const, label: 'Material Requirement', icon: BarChart3 },
                { id: 'rawsummary' as const, label: 'Raw Material Summary', icon: Boxes },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold whitespace-nowrap transition border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-light)]/40'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-slate-50'
                  }`}
                >
                  <tab.icon size={13} />
                  {tab.label}
                  {tab.id === 'requirement' && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      {result.requirements.length}
                    </span>
                  )}
                  {tab.id === 'rawsummary' && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#92400E]/10 text-[#92400E]">
                      {result.raw_material_summary.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab: Material Hierarchy ── */}
            {activeTab === 'hierarchy' && (
              <div className="p-4">
                <ExplosionTree tree={result.tree} />
              </div>
            )}

            {/* ── Tab: Material Requirement ── */}
            {activeTab === 'requirement' && (
              <div>
                {/* Filter bar */}
                <div className="px-4 py-3 border-b border-[var(--color-border-base)] bg-slate-50/60 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[var(--color-border-base)] rounded-lg flex-1 min-w-[160px]">
                    <Search size={13} className="text-[var(--color-text-secondary)] shrink-0" />
                    <input
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                      placeholder="Search materials…"
                      className="flex-1 text-xs outline-none bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
                    />
                    {globalSearch && <button onClick={() => setGlobalSearch('')}><X size={12} className="text-[var(--color-text-secondary)]" /></button>}
                  </div>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as MaterialType | 'all')}
                    className="text-xs border border-[var(--color-border-base)] rounded-lg px-2.5 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="Finished Good">Finished Good</option>
                    <option value="Semi Finished">Semi Finished</option>
                    <option value="Raw Material">Raw Material</option>
                  </select>

                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="text-xs border border-[var(--color-border-base)] rounded-lg px-2.5 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="all">All Levels</option>
                    {availableLevels.map((l) => <option key={l} value={l}>Level {l}</option>)}
                  </select>

                  <select
                    value={filterUnit}
                    onChange={(e) => setFilterUnit(e.target.value)}
                    className="text-xs border border-[var(--color-border-base)] rounded-lg px-2.5 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="all">All Units</option>
                    {availableUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>

                  {(filterType !== 'all' || filterLevel !== 'all' || filterUnit !== 'all' || globalSearch) && (
                    <button
                      onClick={() => { setFilterType('all'); setFilterLevel('all'); setFilterUnit('all'); setGlobalSearch(''); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[var(--color-error)] border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition"
                    >
                      <X size={11} /> Clear
                    </button>
                  )}

                  <span className="ml-auto text-[10px] text-[var(--color-text-secondary)]">
                    {filteredRequirements.length} of {result.requirements.length}
                  </span>
                </div>

                <div className="overflow-auto max-h-[480px]">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        {['Level', 'Type', 'Parent BOM', 'Item Code', 'Item', 'Required Qty', 'Unit'].map((h, i) => (
                          <th key={h} className={`px-3 py-2.5 font-semibold text-white bg-[var(--color-primary)] whitespace-nowrap ${i === 6 ? 'text-left' : i === 5 ? 'text-right' : 'text-left'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequirements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-[var(--color-text-secondary)]">No results match your filters.</td>
                        </tr>
                      ) : filteredRequirements.map((r, i) => (
                        <tr key={i} className={`border-b border-[var(--color-border-base)] hover:bg-[var(--color-primary-light)]/40 transition ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                          <td className="px-3 py-2 tabular-nums">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white" style={{ background: '#6B7280' }}>
                              {r.level}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap" style={{ background: TYPE_COLOR[r.type] }}>
                              {r.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[var(--color-text-secondary)] max-w-[160px] truncate" title={r.parent_bom}>{r.parent_bom}</td>
                          <td className="px-3 py-2 font-mono text-[var(--color-text-secondary)]">{r.item_code || '—'}</td>
                          <td className="px-3 py-2 font-medium text-[var(--color-text-primary)] max-w-[220px] truncate" title={r.item}>{r.item}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-[var(--color-text-primary)]">{formatNum(r.required_qty)}</td>
                          <td className="px-3 py-2 text-[var(--color-text-secondary)]">{r.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Tab: Raw Material Summary ── */}
            {activeTab === 'rawsummary' && (
              <div className="overflow-auto max-h-[480px]">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {['Item Code', 'Raw Material', 'Parent BOM', 'Total Qty', 'Unit'].map((h, i) => (
                        <th key={h} className={`px-3 py-2.5 font-semibold text-white bg-[#92400E] whitespace-nowrap ${i === 3 ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.raw_material_summary.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-[var(--color-text-secondary)]">No raw materials found.</td>
                      </tr>
                    ) : result.raw_material_summary.map((r, i) => (
                      <tr key={i} className={`border-b border-[var(--color-border-base)] hover:bg-amber-50/40 transition ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                        <td className="px-3 py-2 font-mono text-[var(--color-text-secondary)]">{r.item_code || '—'}</td>
                        <td className="px-3 py-2 font-medium text-[var(--color-text-primary)] max-w-[260px] truncate" title={r.item}>{r.item}</td>
                        <td className="px-3 py-2 text-[var(--color-text-secondary)] max-w-[160px] truncate" title={r.parent_bom}>{r.parent_bom}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[#92400E]">{formatNum(r.total_qty)}</td>
                        <td className="px-3 py-2 text-[var(--color-text-secondary)]">{r.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
