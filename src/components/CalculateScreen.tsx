import { useMemo, useState, useEffect } from 'react';
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
  onCalculated: (
    item: string,
    qty: number
  ) => void;
  onExport: (
    kind: 'Excel' | 'PDF'
  ) => void;
}

function formatNum(n: number): string {
  return Number.isInteger(n)
    ? String(n)
    : n
        .toFixed(4)
        .replace(/\.?0+$/, '');
}

export function CalculateScreen({
  activeFile,
  companyName,
  itemMaster,
  onCalculated,
  onExport,
}: CalculateScreenProps) {
  const distinctItems = useMemo(
    () =>
      getDistinctProducedItems(
        activeFile.consumption_details
      ),
    [activeFile]
  );

  const resolveItemCode = useMemo(
    () => createItemCodeResolver(itemMaster),
    [itemMaster]
  );

  const [selectedItem, setSelectedItem] =
    useState('');

  const [selectedBom, setSelectedBom] =
    useState('');

  const [qty, setQty] = useState('');

  const selectedItemCode = useMemo(
    () => selectedItem ? resolveItemCode(selectedItem) : '',
    [selectedItem, resolveItemCode]
  );

  // ---------- BOM Names for selected produced item ----------

  const bomNamesForItem = useMemo(
    () =>
      selectedItem
        ? getBomNamesForProducedItem(
            activeFile.bom_summary,
            selectedItem
          )
        : [],
    [selectedItem, activeFile]
  );

  // Auto-select BOM when only one exists for the produced item.
  useEffect(() => {
    if (
      selectedItem &&
      bomNamesForItem.length === 1 &&
      selectedBom !== bomNamesForItem[0]
    ) {
      setSelectedBom(bomNamesForItem[0]);
    } else if (
      selectedItem &&
      bomNamesForItem.length > 1 &&
      selectedBom &&
      !bomNamesForItem.includes(selectedBom)
    ) {
      setSelectedBom('');
    } else if (!selectedItem && selectedBom) {
      setSelectedBom('');
    }
  }, [selectedItem, bomNamesForItem, selectedBom]);

  const [result, setResult] =
    useState<CalculationResult | null>(null);

  const [calculating, setCalculating] =
    useState(false);

  const [dropdownOpen, setDropdownOpen] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [bomDropdownOpen, setBomDropdownOpen] =
    useState(false);

  const [bomSearch, setBomSearch] =
    useState('');

  const [error, setError] =
    useState('');

  // ---------- Auto Fetch Details ----------

  const autoFetch = useMemo(() => {
    if (!selectedItem) return null;

    const summaryRow =
      activeFile.bom_summary.find(
        (b) =>
          b.produced_item ===
            selectedItem &&
          (!selectedBom ||
            b.bom_name ===
              selectedBom)
      );

    const consRow =
      activeFile.consumption_details.find(
        (c) =>
          c.produced_item ===
            selectedItem &&
          (!selectedBom ||
            c.bom_name ===
              selectedBom)
      );

    return {
      bomName:
        selectedBom ||
        (consRow?.bom_name ??
          summaryRow?.bom_name ??
          '—'),

      standardQty:
        summaryRow?.quantity ?? 0,

      unit:
        summaryRow?.unit ??
        consRow?.unit ??
        '—',

      itemCode:
        resolveItemCode(selectedItem),
    };
  }, [
    selectedItem,
    selectedBom,
    activeFile,
    resolveItemCode,
  ]);

  // ---------- Filter Produced Items ----------

  const filteredItems = useMemo(() => {
    const q =
      search.toLowerCase();

    return distinctItems.filter(
      (item) => {
        if (
          item
            .toLowerCase()
            .includes(q)
        ) {
          return true;
        }

        const code = resolveItemCode(item);
        if (
          code &&
          code
            .toLowerCase()
            .includes(q)
        ) {
          return true;
        }

        return false;
      }
    );
  }, [
    distinctItems,
    search,
    resolveItemCode,
  ]);

  // ---------- Filter BOM Names ----------

  const filteredBomNames = useMemo(() => {
    const q =
      bomSearch.toLowerCase();

    return bomNamesForItem.filter(
      (name) =>
        name
          .toLowerCase()
          .includes(q)
    );
  }, [
    bomNamesForItem,
    bomSearch,
  ]);

  // ---------- Calculate ----------

  const handleCalculate =
    async () => {
      setError('');

      if (!selectedItem) {
        setError(
          'Please select a Produced Item.'
        );
        return;
      }

      if (
        bomNamesForItem.length > 1 &&
        !selectedBom
      ) {
        setError(
          'Please select a Bill of Material Name.'
        );
        return;
      }

      const n =
        parseFloat(qty);

      if (
        isNaN(n) ||
        n <= 0
      ) {
        setError(
          'Production Quantity must be a positive number.'
        );
        return;
      }

      setCalculating(true);

      // Brief delay to show loading animation
      await new Promise(
        (r) =>
          setTimeout(r, 300)
      );

      try {
        const res =
          calculateBom(
            activeFile.bom_summary,
            activeFile.consumption_details,
            selectedItem,
            n,
            resolveItemCode,
            selectedBom || undefined
          );

        setResult(res);

        onCalculated(
          selectedItem,
          n
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Calculation failed.'
        );
      } finally {
        setCalculating(false);
      }
    };

  // ---------- Export ----------

  const handleExportExcel =
    () => {
      if (!result) return;

      exportToExcel(result);
      onExport('Excel');
    };

  const handleExportPdf =
    () => {
      if (!result) return;

      exportToPdf(
        result,
        companyName,
        null
      );

      onExport('PDF');
    };

  const handlePrint =
    () => {
      if (!result) return;

      printResult(result);
    };

  // ---------- Stage-wise PDF + Stage Viewer ----------

  const stagePages = useMemo(
    () => (result ? buildStagePages(activeFile, result) : []),
    [result, activeFile]
  );

  const [stageViewerOpen, setStageViewerOpen] = useState(false);

  const [selectedStages, setSelectedStages] = useState<string[]>([]);

  const toggleStage = (stage: string): void => {
    setSelectedStages((prev) =>
      prev.includes(stage)
        ? prev.filter((s) => s !== stage)
        : [...prev, stage]
    );
  };

  const handleStageWisePrint = () => {
    if (!result) return;

    printStageWise(activeFile, result, companyName);
  };

  const handleSelectedStagePrint = () => {
    if (!result || selectedStages.length === 0) return;

    printStageWise(activeFile, result, companyName, selectedStages);
  };

  // ---------- Filters ----------

  const [filterType, setFilterType] =
    useState<
      MaterialType | 'all'
    >('all');

  const [filterLevel, setFilterLevel] =
    useState('all');

  const [filterUnit, setFilterUnit] =
    useState('all');

  const [filterItem, setFilterItem] =
    useState('');

  const [globalSearch, setGlobalSearch] =
    useState('');

  const filteredRequirements =
    useMemo(() => {
      if (!result) return [];

      return result.requirements.filter(
        (r) => {
          if (
            filterType !==
              'all' &&
            r.type !== filterType
          ) {
            return false;
          }

          if (
            filterLevel !==
              'all' &&
            String(r.level) !==
              filterLevel
          ) {
            return false;
          }

          if (
            filterUnit !==
              'all' &&
            r.unit !== filterUnit
          ) {
            return false;
          }

          if (
            filterItem &&
            !r.item
              .toLowerCase()
              .includes(
                filterItem.toLowerCase()
              )
          ) {
            return false;
          }

          if (globalSearch) {
            const g =
              globalSearch.toLowerCase();

            if (
              !r.item
                .toLowerCase()
                .includes(g) &&
              !r.type
                .toLowerCase()
                .includes(g) &&
              !r.parent_bom
                .toLowerCase()
                .includes(g) &&
              !r.unit
                .toLowerCase()
                .includes(g)
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      result,
      filterType,
      filterLevel,
      filterUnit,
      filterItem,
      globalSearch,
    ]);

  const availableLevels =
    useMemo(() => {
      if (!result) return [];

      return [
        ...new Set(
          result.requirements.map(
            (r) => r.level
          )
        ),
      ].sort(
        (a, b) => a - b
      );
    }, [result]);

  const availableUnits =
    useMemo(() => {
      if (!result) return [];

      return [
        ...new Set(
          result.requirements
            .map(
              (r) => r.unit
            )
            .filter(Boolean)
        ),
      ].sort();
    }, [result]);

  return (
    <div className="animate-fadeIn space-y-4">

      {/* ---------- Page Heading ---------- */}

      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          Calculate Bill Of Material Name
        </h1>

        <p className="text-xs text-[var(--color-text-secondary)]">
          Select a produced item, BOM name, and required quantity.
        </p>
      </div>

      {/* ---------- Input Card ---------- */}

      <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-4 shadow-[var(--shadow-card)]">

        <div className="grid md:grid-cols-3 gap-4">

          {/* Produced Item */}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">
              Produced Item
            </label>

            <div className="relative">

              <button
                onClick={() => {
                  setDropdownOpen(
                    !dropdownOpen
                  );
                  setSearch('');
                }}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-[var(--color-border-base)] rounded-lg text-sm hover:border-[var(--color-primary)] transition text-left"
              >
                <span
                  className={
                    selectedItem
                      ? 'text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)]'
                  }
                >
                  {selectedItem
                    ? (selectedItemCode
                        ? `${selectedItemCode} | ${selectedItem}`
                        : selectedItem)
                    : 'Search and select item...'}
                </span>

                <ChevronDown
                  size={16}
                  className={`text-[var(--color-text-secondary)] transition ${
                    dropdownOpen
                      ? 'rotate-180'
                      : ''
                  }`}
                />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() =>
                      setDropdownOpen(
                        false
                      )
                    }
                  />

                  <div className="absolute z-20 mt-1 w-full bg-white border border-[var(--color-border-base)] rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">

                    <div className="p-1.5 border-b border-[var(--color-border-base)] flex items-center gap-2">

                      <Search
                        size={16}
                        className="text-[var(--color-text-secondary)]"
                      />

                      <input
                        autoFocus
                        value={search}
                        onChange={(e) =>
                          setSearch(
                            e.target.value
                          )
                        }
                        placeholder="Search..."
                        className="flex-1 text-sm outline-none text-[var(--color-text-primary)]"
                      />

                    </div>

                    <div className="overflow-auto">

                      {filteredItems.length ===
                      0 ? (
                        <p className="p-2.5 text-xs text-[var(--color-text-secondary)] text-center">
                          No items found.
                        </p>
                      ) : (
                        filteredItems
                          .slice(
                            0,
                            200
                          )
                          .map(
                            (item) => {
                              const code = resolveItemCode(item);
                              return (
                              <button
                                key={
                                  item
                                }
                                onClick={() => {
                                  setSelectedItem(
                                    item
                                  );
                                  setSelectedBom(
                                    ''
                                  );
                                  setDropdownOpen(
                                    false
                                  );
                                  setResult(
                                    null
                                  );
                                }}
                                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-left hover:bg-[var(--color-primary-light)] transition"
                              >
                                <span className="text-[var(--color-text-primary)]">
                                  {code
                                    ? `${code} | ${item}`
                                    : item}
                                </span>

                                {selectedItem ===
                                  item && (
                                  <Check
                                    size={
                                      14
                                    }
                                    className="text-[var(--color-primary)]"
                                  />
                                )}
                              </button>
                            );
                            }
                          )
                      )}

                    </div>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* Bill of Material Name */}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">
              Bill of Material Name
            </label>

            <div className="relative">

              <button
                onClick={() => {
                  if (!selectedItem) return;
                  setBomDropdownOpen(
                    !bomDropdownOpen
                  );
                  setBomSearch('');
                }}
                disabled={!selectedItem}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-[var(--color-border-base)] rounded-lg text-sm hover:border-[var(--color-primary)] transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span
                  className={
                    selectedBom
                      ? 'text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)]'
                  }
                >
                  {selectedBom
                    ? selectedBom
                    : bomNamesForItem.length === 0
                      ? '—'
                      : bomNamesForItem.length === 1
                        ? bomNamesForItem[0]
                        : 'Select BOM...'}
                </span>

                <ChevronDown
                  size={16}
                  className={`text-[var(--color-text-secondary)] transition ${
                    bomDropdownOpen
                      ? 'rotate-180'
                      : ''
                  }`}
                />
              </button>

              {bomDropdownOpen && selectedItem && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() =>
                      setBomDropdownOpen(
                        false
                      )
                    }
                  />

                  <div className="absolute z-20 mt-1 w-full bg-white border border-[var(--color-border-base)] rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">

                    <div className="p-1.5 border-b border-[var(--color-border-base)] flex items-center gap-2">

                      <Search
                        size={16}
                        className="text-[var(--color-text-secondary)]"
                      />

                      <input
                        autoFocus
                        value={bomSearch}
                        onChange={(e) =>
                          setBomSearch(
                            e.target.value
                          )
                        }
                        placeholder="Search BOM..."
                        className="flex-1 text-sm outline-none text-[var(--color-text-primary)]"
                      />

                    </div>

                    <div className="overflow-auto">

                      {filteredBomNames.length ===
                      0 ? (
                        <p className="p-2.5 text-xs text-[var(--color-text-secondary)] text-center">
                          No BOM found.
                        </p>
                      ) : (
                        filteredBomNames.map(
                          (name) => (
                            <button
                              key={name}
                              onClick={() => {
                                setSelectedBom(
                                  name
                                );
                                setBomDropdownOpen(
                                  false
                                );
                                setResult(
                                  null
                                );
                              }}
                              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-left hover:bg-[var(--color-primary-light)] transition"
                            >
                              <span className="text-[var(--color-text-primary)]">
                                {name}
                              </span>

                              {selectedBom ===
                                name && (
                                <Check
                                  size={14}
                                  className="text-[var(--color-primary)]"
                                />
                              )}
                            </button>
                          )
                        )
                      )}

                    </div>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* Production Quantity */}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">
              Production Quantity
            </label>

            <div className="relative">

              <input
                type="number"
                min="0"
                step="any"
                value={qty}
                onChange={(e) => {
                  setQty(
                    e.target.value
                  );
                  setResult(null);
                }}
                placeholder="Enter quantity..."
                className="w-full px-3 py-2 pr-14 bg-white border border-[var(--color-border-base)] rounded-lg text-sm hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none transition text-[var(--color-text-primary)]"
              />

              {autoFetch && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)] font-medium">
                  {
                    autoFetch.unit
                  }
                </span>
              )}

            </div>
          </div>

        </div>

        {/* ---------- Auto Fetch Details ---------- */}

        {autoFetch && selectedBom && (
          <div className="mt-3 bg-[var(--color-primary-light)] rounded-lg p-3 animate-fadeIn">

            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">

              <div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  BOM Name
                </p>

                <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                  {
                    autoFetch.bomName
                  }
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Standard Qty
                </p>

                <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {formatNum(
                    autoFetch.standardQty
                  )}{' '}
                  {
                    autoFetch.unit
                  }
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Item Code
                </p>

                <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {autoFetch.itemCode || '—'}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Produced Item
                </p>

                <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                  {
                    selectedItem
                  }
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Requested Qty
                </p>

                <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {qty &&
                  !isNaN(
                    parseFloat(
                      qty
                    )
                  )
                    ? formatNum(
                        parseFloat(
                          qty
                        )
                      )
                    : '-'}{' '}
                  {
                    autoFetch.unit
                  }
                </p>
              </div>

            </div>
          </div>
        )}

        {/* ---------- Error ---------- */}

        {error && (
          <div className="mt-3 text-xs text-[var(--color-error)] bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            {error}
          </div>
        )}

        {/* ---------- Calculate Button ---------- */}

        <div className="mt-3 flex justify-end">

          <button
            onClick={
              handleCalculate
            }
            disabled={
              calculating
            }
            className="inline-flex items-center gap-2 px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition shadow-sm"
          >
            {calculating ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Calculator
                size={16}
              />
            )}

            Calculate BOM
          </button>

        </div>

      </div>

      {/* ---------- Loading ---------- */}

      {calculating && (
        <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-8 text-center shadow-[var(--shadow-card)]">

          <Loader2
            className="animate-spin text-[var(--color-primary)] mx-auto mb-2"
            size={28}
          />

          <p className="text-xs text-[var(--color-text-secondary)]">
            Calculating material requirements...
          </p>

        </div>
      )}

      {/* ---------- Empty State ---------- */}

      {!result &&
        !calculating && (
          <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-8 text-center shadow-[var(--shadow-card)]">

            <div className="w-12 h-12 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mx-auto mb-3">

              <Calculator
                size={24}
                className="text-[var(--color-primary)]"
              />

            </div>

            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-0.5">
              No calculation yet
            </h3>

            <p className="text-xs text-[var(--color-text-secondary)]">
              Select a produced item, BOM name, enter quantity, and click Calculate BOM.
            </p>

          </div>
        )}

      {/* ---------- Results ---------- */}

      {result &&
        !calculating && (
          <div className="space-y-4">

            {/* ---------- Export Buttons ---------- */}

            <div className="flex flex-wrap gap-2 justify-end">

              <button
                onClick={
                  handleExportExcel
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-success)] hover:bg-green-700 text-white rounded-lg text-xs font-medium transition shadow-sm"
              >
                <FileDown
                  size={14}
                />
                Excel
              </button>

              <button
                onClick={
                  handleExportPdf
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-xs font-medium transition shadow-sm"
              >
                <FileText
                  size={14}
                />
                PDF
              </button>

              <button
                onClick={
                  handlePrint
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg text-xs font-medium transition"
              >
                <Printer
                  size={14}
                />
                Print
              </button>

              <button
                onClick={
                  handleStageWisePrint
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg text-xs font-medium transition"
              >
                <Printer
                  size={14}
                />
                Print Stage wise
              </button>

              <button
                onClick={() =>
                  setStageViewerOpen(true)
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg text-xs font-medium transition"
              >
                <Filter
                  size={14}
                />
                Stage Filter
              </button>

            </div>

            {/* ---------- Production Summary ---------- */}

            <div className="bg-white border border-[var(--color-border-base)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">

              <div className="bg-[var(--color-primary)] px-4 py-2">

                <h2 className="text-white font-semibold flex items-center gap-1.5 text-sm">
                  <Package
                    size={16}
                  />
                  Production Summary
                </h2>

              </div>

              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 p-3">

                {[
                  {
                    label:
                      'Bill Of Material Name',
                    value:
                      result.summary.bom_name,
                    icon: FileText,
                  },
                  {
                    label:
                      'Standard Qty',
                    value: `${formatNum(
                      result.summary.standard_qty
                    )} ${
                      result.summary.unit
                    }`,
                    icon: Layers,
                  },
                  {
                    label:
                      'Item Code',
                    value:
                      result.summary.item_code || '—',
                    icon: CircleDot,
                  },
                  {
                    label:
                      'Finished Good',
                    value:
                      result.summary.finished_good,
                    icon: Package,
                  },
                  {
                    label:
                      'Production Qty',
                    value: `${formatNum(
                      result.summary.production_qty
                    )} ${
                      result.summary.unit
                    }`,
                    icon: Boxes,
                  },
                ].map(
                  (f) => (
                    <div
                      key={
                        f.label
                      }
                    >
                      <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 mb-0.5">
                        <f.icon
                          size={12}
                        />
                        {
                          f.label
                        }
                      </p>

                      <p className="text-sm font-semibold text-[var(--color-text-primary)] break-words">
                        {
                          f.value
                        }
                      </p>
                    </div>
                  )
                )}

              </div>
            </div>

            {/* ---------- Tree + Raw Material Summary ---------- */}

            <div className="grid lg:grid-cols-2 gap-4">

              {/* Material Hierarchy */}

              <div className="bg-white border border-[var(--color-border-base)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">

                <div className="bg-[var(--color-primary)] px-4 py-2">

                  <h2 className="text-white font-semibold flex items-center gap-1.5 text-sm">
                    <Layers
                      size={16}
                    />
                    Material Hierarchy
                  </h2>

                </div>

                <div className="p-3">
                  <ExplosionTree
                    tree={
                      result.tree
                    }
                  />
                </div>

              </div>

              {/* Raw Material Summary */}

              <div className="bg-white border border-[var(--color-border-base)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">

                <div className="bg-[#92400E] px-4 py-2">

                  <h2 className="text-white font-semibold flex items-center gap-1.5 text-sm">
                    <Boxes
                      size={16}
                    />
                    Raw Material Summary
                  </h2>

                </div>

                <div className="overflow-auto max-h-[400px]">

                  <table className="w-full text-xs">

                    <thead className="sticky top-0 bg-[#92400E] text-white">

                      <tr>

                        <th className="text-left px-3 py-1.5 font-medium">
                          Item Code
                        </th>

                        <th className="text-left px-3 py-1.5 font-medium">
                          Raw Material
                        </th>

                        <th className="text-left px-3 py-1.5 font-medium">
                          Parent BOM
                        </th>

                        <th className="text-right px-3 py-1.5 font-medium">
                          Total Qty
                        </th>

                        <th className="text-left px-3 py-1.5 font-medium">
                          Unit
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {result
                        .raw_material_summary
                        .length === 0 ? (

                        <tr>

                          <td
                            colSpan={
                              5
                            }
                            className="text-center py-6 text-[var(--color-text-secondary)]"
                          >
                            No raw materials.
                          </td>

                        </tr>

                      ) : (

                        result
                          .raw_material_summary
                          .map(
                            (
                              r,
                              i
                            ) => (

                              <tr
                                key={
                                  i
                                }
                                className="hover:bg-[var(--color-primary-light)] transition border-b border-[var(--color-border-base)]"
                              >

                                <td className="px-3 py-1.5 text-[var(--color-text-secondary)] tabular-nums">
                                  {
                                    r.item_code || '—'
                                  }
                                </td>

                                <td className="px-3 py-1.5 text-[var(--color-text-primary)] font-medium">
                                  {
                                    r.item
                                  }
                                </td>

                                <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">
                                  {
                                    r.parent_bom
                                  }
                                </td>

                                <td className="px-3 py-1.5 text-right tabular-nums text-[var(--color-text-primary)]">
                                  {formatNum(
                                    r.total_qty
                                  )}
                                </td>

                                <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">
                                  {
                                    r.unit
                                  }
                                </td>

                              </tr>

                            )
                          )

                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

            {/* ---------- Material Requirement Table ---------- */}

            <div className="bg-white border border-[var(--color-border-base)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">

              <div className="bg-[var(--color-primary)] px-4 py-2 flex items-center gap-2">

                <h2 className="text-white font-semibold flex items-center gap-1.5 text-sm">
                  <Boxes
                    size={16}
                  />
                  Material Requirement
                </h2>

                <span className="ml-auto text-white/80 text-xs">
                  {
                    filteredRequirements.length
                  }{' '}
                  of{' '}
                  {
                    result.requirements.length
                  }{' '}
                  rows
                </span>

              </div>

              {/* Filters */}

              <div className="p-3 bg-[var(--color-primary-light)] border-b border-[var(--color-border-base)] flex flex-wrap items-center gap-2">

                <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                  <Filter
                    size={13}
                  />
                  Filters:
                </div>

                <input
                  value={
                    filterItem
                  }
                  onChange={(e) =>
                    setFilterItem(
                      e.target.value
                    )
                  }
                  placeholder="Item..."
                  className="px-2.5 py-1 text-xs bg-white border border-[var(--color-border-base)] rounded-md w-28 outline-none focus:border-[var(--color-primary)]"
                />

                <select
                  value={
                    filterType
                  }
                  onChange={(e) =>
                    setFilterType(
                      e.target
                        .value as
                        | MaterialType
                        | 'all'
                    )
                  }
                  className="px-2.5 py-1 text-xs bg-white border border-[var(--color-border-base)] rounded-md outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="all">
                    All Types
                  </option>

                  <option value="Finished Good">
                    Finished Good
                  </option>

                  <option value="Semi Finished">
                    Semi Finished
                  </option>

                  <option value="Raw Material">
                    Raw Material
                  </option>
                </select>

                {/* Level filter intentionally kept disabled */}

                <select
                  value={
                    filterUnit
                  }
                  onChange={(e) =>
                    setFilterUnit(
                      e.target.value
                    )
                  }
                  className="px-2.5 py-1 text-xs bg-white border border-[var(--color-border-base)] rounded-md outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="all">
                    All Units
                  </option>

                  {availableUnits.map(
                    (u) => (
                      <option
                        key={u}
                        value={u}
                      >
                        {u}
                      </option>
                    )
                  )}
                </select>

                <div className="relative ml-auto">

                  <Search
                    size={13}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                  />

                  <input
                    value={
                      globalSearch
                    }
                    onChange={(e) =>
                      setGlobalSearch(
                        e.target.value
                      )
                    }
                    placeholder="Global search..."
                    className="pl-7 pr-2.5 py-1 text-xs bg-white border border-[var(--color-border-base)] rounded-md w-36 outline-none focus:border-[var(--color-primary)]"
                  />

                </div>

              </div>

              {/* Requirement Table */}

              <div className="overflow-auto max-h-[480px]">

                <table className="w-full text-xs">

                  <thead className="sticky top-0 bg-[var(--color-primary)] text-white">

                    <tr>

                      <th className="text-left px-3 py-1.5 font-medium">
                        Level
                      </th>

                      <th className="text-left px-3 py-1.5 font-medium">
                        Type
                      </th>

                      <th className="text-left px-3 py-1.5 font-medium">
                        Parent BOM
                      </th>

                      <th className="text-left px-3 py-1.5 font-medium">
                        Item Code
                      </th>

                      <th className="text-left px-3 py-1.5 font-medium">
                        Item
                      </th>

                      <th className="text-right px-3 py-1.5 font-medium">
                        Required Qty
                      </th>

                      <th className="text-left px-3 py-1.5 font-medium">
                        Unit
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredRequirements.length ===
                    0 ? (

                      <tr>

                        <td
                          colSpan={
                            7
                          }
                          className="text-center py-6 text-[var(--color-text-secondary)]"
                        >
                          No rows match filters.
                        </td>

                      </tr>

                    ) : (

                      filteredRequirements.map(
                        (
                          r,
                          i
                        ) => (

                          <tr
                            key={
                              i
                            }
                            className={`hover:bg-[var(--color-primary-light)] transition border-b border-[var(--color-border-base)] ${
                              i % 2 ===
                              1
                                ? 'bg-[#F9F9F9]'
                                : ''
                            }`}
                          >

                            <td className="px-3 py-1.5 text-[var(--color-text-secondary)] tabular-nums">
                              {
                                r.level
                              }
                            </td>

                            <td className="px-3 py-1.5">
                              <TypeBadge
                                type={
                                  r.type
                                }
                              />
                            </td>

                            <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">
                              {
                                r.parent_bom
                              }
                            </td>

                            <td className="px-3 py-1.5 text-[var(--color-text-secondary)] tabular-nums">
                              {
                                r.item_code || '—'
                              }
                            </td>

                            <td className="px-3 py-1.5 text-[var(--color-text-primary)] font-medium">
                              {
                                r.item
                              }
                            </td>

                            <td className="px-3 py-1.5 text-right tabular-nums text-[var(--color-text-primary)] font-medium">
                              {formatNum(
                                r.required_qty
                              )}
                            </td>

                            <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">
                              {
                                r.unit
                              }
                            </td>

                          </tr>

                        )
                      )

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </div>
        )}

      {/* ---------- Stage Filter & Viewer Modal ---------- */}

      {stageViewerOpen && result && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-auto"
          onClick={() => setStageViewerOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[var(--color-primary)] px-4 py-2.5 rounded-t-xl flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <Filter size={16} />
                Stage Filter — view &amp; print selected stages
              </h2>
              <button
                onClick={() => setStageViewerOpen(false)}
                className="text-white/80 hover:text-white text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Stage checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-[var(--color-text-primary)]">
                    Select stages ({selectedStages.length} of {stagePages.length} selected)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedStages(stagePages.map((p) => p.stage))}
                      className="text-xs px-2 py-1 rounded border border-[var(--color-border-base)] hover:bg-[var(--color-primary-light)] transition"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => setSelectedStages([])}
                      className="text-xs px-2 py-1 rounded border border-[var(--color-border-base)] hover:bg-[var(--color-primary-light)] transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-1.5">
                  {stagePages.map((page) => (
                    <label
                      key={page.producedItem}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-[var(--color-border-base)] hover:bg-[var(--color-primary-light)] transition cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStages.includes(page.stage)}
                        onChange={() => toggleStage(page.stage)}
                        className="accent-[var(--color-primary)]"
                      />
                      <span className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                        {page.stage}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-secondary)] truncate ml-auto">
                        {page.producedItem}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* On-screen preview of selected stages */}
              <div className="space-y-3 max-h-[45vh] overflow-auto">
                {stagePages
                  .filter(
                    (page) =>
                      selectedStages.length === 0 ||
                      selectedStages.includes(page.stage)
                  )
                  .map((page) => (
                    <StagePreviewCard
                      key={page.producedItem}
                      page={page}
                      companyName={companyName}
                    />
                  ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 justify-end border-t border-[var(--color-border-base)] pt-3">
                <button
                  onClick={handleSelectedStagePrint}
                  disabled={selectedStages.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-xs font-medium transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer size={14} />
                  Print Selected ({selectedStages.length})
                </button>
                <button
                  onClick={() => setStageViewerOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border-base)] hover:bg-[var(--color-primary-light)] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function StagePreviewCard({
  page,
  companyName,
}: {
  page: StagePageData;
  companyName: string;
}) {
  return (
    <div className="border border-[var(--color-border-base)] rounded-lg overflow-hidden">
      <div className="bg-[#193754] px-3 py-1.5">
        <p className="text-white font-semibold text-xs">
          {companyName || 'SAKSHI LAMINATES'} | {page.stage} JOB CARD
        </p>
      </div>
      <div className="p-3 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <p><span className="text-[var(--color-text-secondary)]">Customer:</span> {getCustomerNameFor(page.bomName)}</p>
        <p><span className="text-[var(--color-text-secondary)]">BOM:</span> {page.bomName || '—'}</p>
        <p><span className="text-[var(--color-text-secondary)]">Output Product:</span> {page.producedItem}</p>
        <p><span className="text-[var(--color-text-secondary)]">Target Output:</span> {page.orderQty} {page.unit}</p>
      </div>
      <table className="w-full text-xs border-t border-[var(--color-border-base)]">
        <thead>
          <tr className="bg-[#DBE8ED] text-[#244C54]">
            <th className="text-left px-3 py-1 font-medium">Material</th>
            <th className="text-right px-3 py-1 font-medium">Quantity</th>
            <th className="text-left px-3 py-1 font-medium">Unit</th>
          </tr>
        </thead>
        <tbody>
          {page.materials.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center py-3 text-[var(--color-text-secondary)]">
                No planned materials.
              </td>
            </tr>
          ) : (
            page.materials.map((m, i) => (
              <tr key={i} className="border-t border-[var(--color-border-base)]">
                <td className="px-3 py-1 text-[var(--color-text-primary)]">{m.item}</td>
                <td className="px-3 py-1 text-right tabular-nums">{m.quantity}</td>
                <td className="px-3 py-1 text-[var(--color-text-secondary)]">{m.unit}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function getCustomerNameFor(bomName: string): string {
  return bomName.split(/[|\-]/)[0]?.trim() || '';
}