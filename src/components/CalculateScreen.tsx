import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Search, Calculator, FileDown, FileText, Printer,
  Loader2, ChevronDown, Check, Package, Boxes,
  Layers, CircleDot, X, ClipboardList,
} from 'lucide-react';
import type { BomFile, CalculationResult, MaterialType, ItemMasterEntry } from '@/types';
import { calculateBom, getDistinctProducedItems, getBomNamesForProducedItem, createItemCodeResolver } from '@/lib/bomEngine';
import { exportToExcel, exportToPdf, printResult, printStageWise, buildStagePages } from '@/lib/exporters';
import type { StagePageData } from '@/lib/exporters';
import { ExplosionTree } from './ExplosionTree';

interface CalculateScreenProps {
  activeFile: BomFile;
  companyName: string;
  itemMaster: ItemMasterEntry[];
  onCalculated: (item: string, qty: number) => void;
  onExport: (kind: 'Excel' | 'PDF') => void;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, '');
}

const TYPE_COLOR: Record<MaterialType, string> = {
  'Finished Good': '#14532D',
  'Semi Finished': '#1E3A8A',
  'Raw Material': '#92400E',
};

function SectionHeader({ color, icon: Icon, title, right }: {
  color: string; icon: React.ElementType; title: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: color }}>
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-white/80" />
        <span className="text-sm font-bold text-white tracking-wide">{title}</span>
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

export function CalculateScreen({ activeFile, companyName, itemMaster, onCalculated, onExport }: CalculateScreenProps) {
  const distinctItems = useMemo(() => getDistinctProducedItems(activeFile.consumption_details), [activeFile]);
  const resolveItemCode = useMemo(() => createItemCodeResolver(itemMaster), [itemMaster]);

  const [selectedItem, setSelectedItem] = useState('');
  const [selectedBom, setSelectedBom]   = useState('');
  const [qty, setQty]                   = useState('');
  const [result, setResult]             = useState<CalculationResult | null>(null);
  const [calculating, setCalculating]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch]             = useState('');
  const [bomOpen, setBomOpen]           = useState(false);
  const [bomSearch, setBomSearch]       = useState('');
  const [error, setError]               = useState('');
  const [filterType, setFilterType]     = useState<MaterialType | 'all'>('all');
  const [filterLevel, setFilterLevel]   = useState('all');
  const [filterUnit, setFilterUnit]     = useState('all');
  const [reqSearch, setReqSearch]       = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const selectedItemCode = useMemo(() => selectedItem ? resolveItemCode(selectedItem) : '', [selectedItem, resolveItemCode]);

  const bomNamesForItem = useMemo(
    () => selectedItem ? getBomNamesForProducedItem(activeFile.bom_summary, selectedItem) : [],
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
    const s = activeFile.bom_summary.find(b => b.produced_item === selectedItem && (!selectedBom || b.bom_name === selectedBom));
    const c = activeFile.consumption_details.find(r => r.produced_item === selectedItem && (!selectedBom || r.bom_name === selectedBom));
    return {
      bomName: selectedBom || (c?.bom_name ?? s?.bom_name ?? '—'),
      standardQty: s?.quantity ?? 0,
      unit: s?.unit ?? c?.unit ?? '—',
      itemCode: resolveItemCode(selectedItem),
    };
  }, [selectedItem, selectedBom, activeFile, resolveItemCode]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return distinctItems.filter(item => {
      if (item.toLowerCase().includes(q)) return true;
      const code = resolveItemCode(item);
      return code ? code.toLowerCase().includes(q) : false;
    });
  }, [distinctItems, search, resolveItemCode]);

  const filteredBomNames = useMemo(
    () => bomNamesForItem.filter(n => n.toLowerCase().includes(bomSearch.toLowerCase())),
    [bomNamesForItem, bomSearch]
  );

  const handleCalculate = async () => {
    setError('');
    if (!selectedItem) { setError('Please select a Produced Item.'); return; }
    if (bomNamesForItem.length > 1 && !selectedBom) { setError('Please select a BOM Name.'); return; }
    const n = parseFloat(qty);
    if (isNaN(n) || n <= 0) { setError('Production Quantity must be a positive number.'); return; }
    setCalculating(true);
    await new Promise(r => setTimeout(r, 280));
    try {
      const res = calculateBom(activeFile.bom_summary, activeFile.consumption_details, selectedItem, n, resolveItemCode, selectedBom || undefined);
      setResult(res);
      onCalculated(selectedItem, n);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calculation failed.');
    } finally {
      setCalculating(false);
    }
  };

  const handleExportExcel  = () => { if (!result) return; exportToExcel(result); onExport('Excel'); };
  const handleExportPdf    = () => { if (!result) return; exportToPdf(result, companyName, null); onExport('PDF'); };
  const handlePrint        = () => { if (!result) return; printResult(result); };
  const handleStageWisePrint = () => { if (!result) return; printStageWise(activeFile, result, companyName); };

  const stagePages = useMemo(() => result ? buildStagePages(activeFile, result) : [], [result, activeFile]);

  const availableLevels = useMemo(() => {
    if (!result) return [];
    return [...new Set(result.requirements.map(r => r.level))].sort((a, b) => a - b);
  }, [result]);

  const availableUnits = useMemo(() => {
    if (!result) return [];
    return [...new Set(result.requirements.map(r => r.unit).filter(Boolean))].sort();
  }, [result]);

  const filteredReqs = useMemo(() => {
    if (!result) return [];
    return result.requirements.filter(r => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterLevel !== 'all' && String(r.level) !== filterLevel) return false;
      if (filterUnit !== 'all' && r.unit !== filterUnit) return false;
      if (reqSearch) {
        const q = reqSearch.toLowerCase();
        return r.item.toLowerCase().includes(q) || r.parent_bom.toLowerCase().includes(q) || (r.item_code || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [result, filterType, filterLevel, filterUnit, reqSearch]);

  // Group requirements by parent_bom (stage), ordered by level
  const groupedReqs = useMemo(() => {
    if (!filteredReqs.length) return [];
    const groups = new Map<string, { level: number; rows: typeof filteredReqs }>();
    filteredReqs.forEach(r => {
      const key = r.parent_bom || '—';
      if (!groups.has(key)) groups.set(key, { level: r.level, rows: [] });
      groups.get(key)!.rows.push(r);
    });
    return [...groups.entries()].map(([bom, g]) => ({ bom, level: g.level, rows: g.rows }))
      .sort((a, b) => a.level - b.level);
  }, [filteredReqs]);

  /* ─────────────────────────────────────────────────── */
  return (
    <div className="animate-fadeIn flex flex-col gap-4">

      {/* ① SEARCH / INPUT CARD */}
      <div className="bg-white rounded-xl border border-[var(--color-border-base)] shadow-[var(--shadow-card)] overflow-visible">
        {/* accent stripe */}
        <div className="h-[3px] rounded-t-xl bg-gradient-to-r from-[var(--color-primary)] to-[#b8375a]" />

        <div className="p-4">
          <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
            <div>
              <h1 className="text-base font-bold text-[var(--color-text-primary)] leading-tight">Calculate Bill Of Material</h1>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Select item → BOM → quantity, then Calculate.</p>
            </div>
            {result && (
              <div className="flex flex-wrap gap-1.5">
                <button onClick={handleExportExcel} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition">
                  <FileDown size={12} /> Excel
                </button>
                <button onClick={handleExportPdf} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-[11px] font-semibold transition">
                  <FileText size={12} /> PDF
                </button>
                <button onClick={handlePrint} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-[var(--color-border-base)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-[11px] font-semibold transition">
                  <Printer size={12} /> Print
                </button>
                <button onClick={handleStageWisePrint} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#193754] hover:bg-[#122640] text-white rounded-lg text-[11px] font-semibold transition">
                  <ClipboardList size={12} /> Print Stage wise
                </button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {/* Produced Item */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide">Produced Item</label>
              <div className="relative">
                {/* Search-first: input always visible, results only after typing */}
                <div className="relative">
                  <div className={`flex items-center gap-2 px-3 py-2 bg-white border rounded-lg transition ${dropdownOpen ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/15' : 'border-[var(--color-border-base)] hover:border-[var(--color-primary)]'}`}>
                    <Search size={14} className="text-[var(--color-text-secondary)] shrink-0" />
                    <input
                      value={selectedItem && !dropdownOpen ? (selectedItemCode ? `${selectedItemCode} | ${selectedItem}` : selectedItem) : search}
                      onFocus={() => { setDropdownOpen(true); if (selectedItem) { setSelectedItem(''); setResult(null); } }}
                      onChange={e => { setDropdownOpen(true); setSearch(e.target.value); }}
                      onKeyDown={e => { if (e.key === 'Escape') { setDropdownOpen(false); setSearch(''); } if (e.key === 'Enter' && filteredItems.length === 1) { setSelectedItem(filteredItems[0]); setSelectedBom(''); setDropdownOpen(false); setResult(null); } }}
                      placeholder={selectedItem && !dropdownOpen ? (selectedItemCode ? `${selectedItemCode} | ${selectedItem}` : selectedItem) : 'Type to search item…'}
                      className="flex-1 min-w-0 text-sm outline-none bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
                    />
                    {selectedItem && !dropdownOpen
                      ? <X size={13} className="shrink-0 text-[var(--color-text-secondary)] hover:text-red-500" onClick={() => { setSelectedItem(''); setResult(null); }} />
                      : <ChevronDown size={14} className={`shrink-0 text-[var(--color-text-secondary)] transition ${dropdownOpen ? 'rotate-180' : ''}`} onClick={() => setDropdownOpen(!dropdownOpen)} />}
                  </div>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => { setDropdownOpen(false); setSearch(''); }} />
                      <div className="absolute z-20 mt-1 w-full min-w-[300px] bg-white border border-[var(--color-border-base)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="overflow-auto max-h-52">
                          {search.trim() === ''
                            ? <p className="px-3 py-6 text-xs text-center text-[var(--color-text-secondary)]">Start typing to search items…</p>
                            : filteredItems.length === 0
                              ? <p className="px-3 py-4 text-xs text-center text-[var(--color-text-secondary)]">No items found for "{search}"</p>
                              : <>
                                  {filteredItems.slice(0, 200).map(item => {
                                    const code = resolveItemCode(item);
                                    return (
                                      <button key={item} onClick={() => { setSelectedItem(item); setSelectedBom(''); setDropdownOpen(false); setSearch(''); setResult(null); }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--color-primary-light)] transition border-b border-[var(--color-border-base)]/40 last:border-0 ${selectedItem === item ? 'bg-[var(--color-primary-light)]' : ''}`}>
                                        {code && <span className="font-mono text-[var(--color-text-secondary)] shrink-0 text-[11px]">{code}</span>}
                                        <span className="text-[var(--color-text-primary)] truncate">{item}</span>
                                        {selectedItem === item && <Check size={11} className="ml-auto shrink-0 text-[var(--color-primary)]" />}
                                      </button>
                                    );
                                  })}
                                  <div className="px-3 py-1 bg-slate-50 border-t border-[var(--color-border-base)]">
                                    <span className="text-[10px] text-[var(--color-text-secondary)]">{filteredItems.length} / {distinctItems.length} items</span>
                                  </div>
                                </>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {autoFetch && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium">
                    Std Qty: {autoFetch.standardQty} {autoFetch.unit}
                  </span>
                  {autoFetch.itemCode && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">Code: {autoFetch.itemCode}</span>
                  )}
                </div>
              )}
            </div>

            {/* BOM Name */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide">BOM Name</label>
              {bomNamesForItem.length <= 1 ? (
                <div className={`flex items-center px-3 py-2 border rounded-lg text-sm bg-slate-50 border-[var(--color-border-base)] ${!selectedItem ? 'opacity-50' : ''}`}>
                  <span className="truncate text-[var(--color-text-primary)] font-medium flex-1 min-w-0">
                    {autoFetch?.bomName || (selectedItem ? 'Auto-selected' : 'Select item first')}
                  </span>
                  {bomNamesForItem.length === 1 && <Check size={13} className="ml-2 shrink-0 text-[var(--color-success)]" />}
                </div>
              ) : (
                <div className="relative">
                  <button disabled={!selectedItem} onClick={() => { setBomOpen(!bomOpen); setBomSearch(''); }}
                    className={`w-full flex items-center justify-between px-3 py-2 bg-white border rounded-lg text-sm transition text-left disabled:opacity-50 ${bomOpen ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/15' : 'border-[var(--color-border-base)] hover:border-[var(--color-primary)]'}`}>
                    <span className={`truncate ${selectedBom ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-secondary)]'}`}>
                      {selectedBom || 'Select BOM…'}
                    </span>
                    <ChevronDown size={14} className={`shrink-0 text-[var(--color-text-secondary)] transition ${bomOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {bomOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setBomOpen(false)} />
                      <div className="absolute z-20 mt-1 w-full min-w-[300px] bg-white border border-[var(--color-border-base)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-2.5 py-2 border-b border-[var(--color-border-base)] flex items-center gap-2 bg-[var(--color-primary-light)]">
                          <Search size={13} className="text-[var(--color-primary)] shrink-0" />
                          <input autoFocus value={bomSearch} onChange={e => setBomSearch(e.target.value)} placeholder="Search BOM name…"
                            className="flex-1 text-xs outline-none bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]" />
                        </div>
                        <div className="overflow-auto max-h-52">
                          {filteredBomNames.length === 0
                            ? <p className="px-3 py-4 text-xs text-center text-[var(--color-text-secondary)]">No BOMs found.</p>
                            : filteredBomNames.map(name => (
                                <button key={name} onClick={() => { setSelectedBom(name); setBomOpen(false); setResult(null); }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--color-primary-light)] transition border-b border-[var(--color-border-base)]/40 last:border-0 ${selectedBom === name ? 'bg-[var(--color-primary-light)]' : ''}`}>
                                  <span className="text-[var(--color-text-primary)] truncate">{name}</span>
                                  {selectedBom === name && <Check size={11} className="ml-auto shrink-0 text-[var(--color-primary)]" />}
                                </button>
                              ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              {bomNamesForItem.length > 1 && (
                <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">{bomNamesForItem.length} BOMs available</p>
              )}
            </div>

            {/* Quantity + Calculate */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide">Production Quantity</label>
              <div className="flex gap-2">
                <input type="number" min={0} value={qty} onChange={e => setQty(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCalculate()}
                  placeholder="Enter quantity…"
                  className="flex-1 min-w-0 px-3 py-2 border border-[var(--color-border-base)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 focus:border-[var(--color-primary)] transition" />
                <button onClick={handleCalculate} disabled={calculating}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition shadow-sm">
                  {calculating ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                  {calculating ? 'Calculating…' : 'Calculate'}
                </button>
              </div>
              {autoFetch && autoFetch.unit !== '—' && (
                <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">Unit: <strong>{autoFetch.unit}</strong></p>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <X size={12} className="shrink-0" /> {error}
            </div>
          )}
        </div>
      </div>

      {/* Calculating spinner */}
      {calculating && (
        <div className="flex items-center justify-center py-14">
          <div className="flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center">
              <Loader2 size={22} className="animate-spin text-[var(--color-primary)]" />
            </div>
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Calculating requirements…</span>
          </div>
        </div>
      )}

      {result && !calculating && (
        <div ref={resultsRef} className="flex flex-col gap-4 animate-fadeIn">

          {/* ② PRODUCTION SUMMARY */}
          <div className="bg-white rounded-xl border border-[var(--color-border-base)] shadow-[var(--shadow-card)] overflow-hidden">
            <SectionHeader color="var(--color-primary)" icon={Package} title="Production Summary" />
            <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {([
                { label: 'BOM Name',       value: result.summary.bom_name,                                        icon: FileText,  span: 2 },
                { label: 'Standard Qty',   value: `${fmt(result.summary.standard_qty)} ${result.summary.unit}`,   icon: Layers,    span: 1 },
                { label: 'Item Code',      value: result.summary.item_code || '—',                                icon: CircleDot, span: 1 },
                { label: 'Finished Good',  value: result.summary.finished_good,                                   icon: Package,   span: 2 },
                { label: 'Production Qty', value: `${fmt(result.summary.production_qty)} ${result.summary.unit}`, icon: Boxes,     span: 1 },
              ] as const).map((f) => (
                <div key={f.label} className={`flex flex-col gap-0.5 px-2.5 py-1.5 rounded-lg bg-[var(--color-primary-light)]/60 border border-[var(--color-primary-light)] ${f.span === 2 ? 'md:col-span-2' : ''}`}>
                  <div className="flex items-center gap-1">
                    <f.icon size={10} className="text-[var(--color-primary)] shrink-0" />
                    <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">{f.label}</span>
                  </div>
                  <span className="text-[13px] font-bold text-[var(--color-text-primary)] break-words leading-tight">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ③ MATERIAL HIERARCHY */}
          <div className="bg-white rounded-xl border border-[var(--color-border-base)] shadow-[var(--shadow-card)] overflow-hidden">
            <SectionHeader color="#1E3A8A" icon={Layers} title="Material Hierarchy" />
            <div className="p-3">
              <ExplosionTree tree={result.tree} />
            </div>
          </div>

          {/* ④ MATERIAL REQUIREMENT */}
          <div className="bg-white rounded-xl border border-[var(--color-border-base)] shadow-[var(--shadow-card)] overflow-hidden">
            <SectionHeader color="var(--color-primary)" icon={Boxes}
              title="Material Requirement"
              right={<span className="text-xs font-bold text-white/80 bg-white/20 px-2 py-0.5 rounded-full">{result.requirements.length}</span>}
            />

            {/* Filter bar */}
            <div className="px-3 py-2.5 border-b border-[var(--color-border-base)] bg-slate-50/70 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[var(--color-border-base)] rounded-lg flex-1 min-w-[140px]">
                <Search size={12} className="text-[var(--color-text-secondary)] shrink-0" />
                <input value={reqSearch} onChange={e => setReqSearch(e.target.value)} placeholder="Search item, code, BOM…"
                  className="flex-1 text-xs outline-none bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]" />
                {reqSearch && <button onClick={() => setReqSearch('')}><X size={11} /></button>}
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value as MaterialType | 'all')}
                className="text-xs border border-[var(--color-border-base)] rounded-lg px-2 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none cursor-pointer">
                <option value="all">All Types</option>
                <option value="Finished Good">Finished Good</option>
                <option value="Semi Finished">Semi Finished</option>
                <option value="Raw Material">Raw Material</option>
              </select>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                className="text-xs border border-[var(--color-border-base)] rounded-lg px-2 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none cursor-pointer">
                <option value="all">All Levels</option>
                {availableLevels.map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
              <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}
                className="text-xs border border-[var(--color-border-base)] rounded-lg px-2 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none cursor-pointer">
                <option value="all">All Units</option>
                {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              {(filterType !== 'all' || filterLevel !== 'all' || filterUnit !== 'all' || reqSearch) && (
                <button onClick={() => { setFilterType('all'); setFilterLevel('all'); setFilterUnit('all'); setReqSearch(''); }}
                  className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--color-error)] border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition">
                  <X size={10} /> Clear
                </button>
              )}
              <span className="ml-auto text-[10px] text-[var(--color-text-secondary)]">{filteredReqs.length} / {result.requirements.length}</span>
            </div>

            {/* Stage-wise grouped list */}
            <div className="overflow-auto max-h-[480px]">
              {groupedReqs.length === 0
                ? <p className="text-center py-10 text-[var(--color-text-secondary)] text-xs">No results match your filters.</p>
                : groupedReqs.map((grp, gi) => (
                    <div key={gi} className="border-b border-[var(--color-border-base)] last:border-0">
                      {/* Stage header */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/80 sticky top-0 z-[5]">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white bg-[var(--color-primary)]">{grp.level}</span>
                        <span className="text-xs font-bold text-[var(--color-text-primary)] truncate flex-1 min-w-0">{grp.bom}</span>
                        <span className="text-[10px] text-[var(--color-text-secondary)] shrink-0">{grp.rows.length} item{grp.rows.length > 1 ? 's' : ''}</span>
                      </div>
                      {/* Items under this stage */}
                      <table className="w-full text-xs border-collapse">
                        <tbody>
                          {grp.rows.map((r, ri) => (
                            <tr key={ri} className={`border-b border-[var(--color-border-base)]/50 hover:bg-[var(--color-primary-light)]/30 transition ${ri % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                              <td className="px-3 py-2 w-8">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">{r.level}</span>
                              </td>
                              <td className="px-2 py-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap" style={{ background: TYPE_COLOR[r.type] }}>
                                  {r.type === 'Finished Good' ? 'FG' : r.type === 'Semi Finished' ? 'SF' : 'RM'}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-[var(--color-text-secondary)] whitespace-nowrap text-[11px]">{r.item_code || '—'}</td>
                              <td className="px-3 py-2 font-medium text-[var(--color-text-primary)] break-words">{r.item}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-semibold text-[var(--color-text-primary)] whitespace-nowrap">{fmt(r.required_qty)}</td>
                              <td className="px-3 py-2 text-[var(--color-text-secondary)] whitespace-nowrap">{r.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
            </div>
          </div>

          {/* ⑤ RAW MATERIAL SUMMARY */}
          <div className="bg-white rounded-xl border border-[var(--color-border-base)] shadow-[var(--shadow-card)] overflow-hidden">
            <SectionHeader color="#92400E" icon={Boxes}
              title="Raw Material Summary"
              right={<span className="text-xs font-bold text-white/80 bg-white/20 px-2 py-0.5 rounded-full">{result.raw_material_summary.length}</span>}
            />
            <div className="overflow-auto max-h-[480px]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#92400E]">
                    {['Item Code', 'Raw Material', 'Parent BOM', 'Total Qty', 'Unit'].map((h, i) => (
                      <th key={h} className={`px-3 py-2 font-semibold text-white whitespace-nowrap text-left ${i === 3 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.raw_material_summary.length === 0
                    ? <tr><td colSpan={5} className="text-center py-10 text-[var(--color-text-secondary)]">No raw materials found.</td></tr>
                    : result.raw_material_summary.map((r, i) => (
                        <tr key={i} className={`border-b border-[var(--color-border-base)] hover:bg-amber-50/50 transition ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                          <td className="px-3 py-2 font-mono text-[var(--color-text-secondary)] whitespace-nowrap">{r.item_code || '—'}</td>
                          <td className="px-3 py-2 font-medium text-[var(--color-text-primary)] max-w-[260px] truncate" title={r.item}>{r.item}</td>
                          <td className="px-3 py-2 text-[var(--color-text-secondary)] max-w-[160px] truncate" title={r.parent_bom}>{r.parent_bom || '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-bold" style={{ color: '#92400E' }}>{fmt(r.total_qty)}</td>
                          <td className="px-3 py-2 text-[var(--color-text-secondary)]">{r.unit}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
