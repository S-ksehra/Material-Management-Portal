import { useMemo, useState } from 'react';
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
} from '@/types';

import {
  calculateBom,
  getDistinctProducedItems,
} from '@/lib/bomEngine';

import {
  exportToExcel,
  exportToPdf,
  printResult,
} from '@/lib/exporters';

import { ExplosionTree } from './ExplosionTree';
import { TypeBadge } from './TypeBadge';

interface CalculateScreenProps {
  activeFile: BomFile;
  companyName: string;
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

  const [selectedItem, setSelectedItem] =
    useState('');

  const [qty, setQty] = useState('');

  const [result, setResult] =
    useState<CalculationResult | null>(null);

  const [calculating, setCalculating] =
    useState(false);

  const [dropdownOpen, setDropdownOpen] =
    useState(false);

  const [search, setSearch] =
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
          selectedItem
      );

    const consRow =
      activeFile.consumption_details.find(
        (c) =>
          c.produced_item ===
          selectedItem
      );

    return {
      bomName:
        consRow?.bom_name ??
        summaryRow?.bom_name ??
        '—',

      standardQty:
        summaryRow?.quantity ?? 0,

      unit:
        summaryRow?.unit ??
        consRow?.unit ??
        '—',
    };
  }, [
    selectedItem,
    activeFile,
  ]);

  // ---------- Filter Produced Items ----------

  const filteredItems = useMemo(() => {
    const q =
      search.toLowerCase();

    return distinctItems.filter(
      (item) =>
        item
          .toLowerCase()
          .includes(q)
    );
  }, [
    distinctItems,
    search,
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
            n
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
    <div className="animate-fadeIn space-y-6">

      {/* ---------- Page Heading ---------- */}

      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Calculate Bill Of Material Name
        </h1>

        <p className="text-sm text-[var(--color-text-secondary)]">
          Select a produced item and required quantity.
        </p>
      </div>

      {/* ---------- Input Card ---------- */}

      <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-6 shadow-[var(--shadow-card)]">

        <div className="grid md:grid-cols-2 gap-5">

          {/* Produced Item */}

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
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
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-[var(--color-border-base)] rounded-lg text-sm hover:border-[var(--color-primary)] transition text-left"
              >
                <span
                  className={
                    selectedItem
                      ? 'text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)]'
                  }
                >
                  {selectedItem ||
                    'Search and select item...'}
                </span>

                <ChevronDown
                  size={18}
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

                  <div className="absolute z-20 mt-1 w-full bg-white border border-[var(--color-border-base)] rounded-lg shadow-lg max-h-72 overflow-hidden flex flex-col">

                    <div className="p-2 border-b border-[var(--color-border-base)] flex items-center gap-2">

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
                        <p className="p-3 text-sm text-[var(--color-text-secondary)] text-center">
                          No items found.
                        </p>
                      ) : (
                        filteredItems
                          .slice(
                            0,
                            200
                          )
                          .map(
                            (item) => (
                              <button
                                key={
                                  item
                                }
                                onClick={() => {
                                  setSelectedItem(
                                    item
                                  );
                                  setDropdownOpen(
                                    false
                                  );
                                  setResult(
                                    null
                                  );
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-[var(--color-primary-light)] transition"
                              >
                                <span className="text-[var(--color-text-primary)]">
                                  {
                                    item
                                  }
                                </span>

                                {selectedItem ===
                                  item && (
                                  <Check
                                    size={
                                      16
                                    }
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
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
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
                className="w-full px-4 py-2.5 pr-16 bg-white border border-[var(--color-border-base)] rounded-lg text-sm hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none transition text-[var(--color-text-primary)]"
              />

              {autoFetch && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)] font-medium">
                  {
                    autoFetch.unit
                  }
                </span>
              )}

            </div>
          </div>

        </div>

        {/* ---------- Auto Fetch Details ---------- */}

        {autoFetch && (
          <div className="mt-5 bg-[var(--color-primary-light)] rounded-lg p-4 animate-fadeIn">

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Bill Of Material Name
                </p>

                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {
                    autoFetch.bomName
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Standard Qty
                </p>

                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {formatNum(
                    autoFetch.standardQty
                  )}{' '}
                  {
                    autoFetch.unit
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Produced Item
                </p>

                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {
                    selectedItem
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Requested Qty
                </p>

                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
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
          <div className="mt-4 text-sm text-[var(--color-error)] bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {/* ---------- Calculate Button ---------- */}

        <div className="mt-5 flex justify-end">

          <button
            onClick={
              handleCalculate
            }
            disabled={
              calculating
            }
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition shadow-sm"
          >
            {calculating ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Calculator
                size={18}
              />
            )}

            Calculate BOM
          </button>

        </div>

      </div>

      {/* ---------- Loading ---------- */}

      {calculating && (
        <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-12 text-center shadow-[var(--shadow-card)]">

          <Loader2
            className="animate-spin text-[var(--color-primary)] mx-auto mb-3"
            size={32}
          />

          <p className="text-sm text-[var(--color-text-secondary)]">
            Calculating material requirements...
          </p>

        </div>
      )}

      {/* ---------- Empty State ---------- */}

      {!result &&
        !calculating && (
          <div className="bg-white border border-[var(--color-border-base)] rounded-xl p-12 text-center shadow-[var(--shadow-card)]">

            <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mx-auto mb-4">

              <Calculator
                size={28}
                className="text-[var(--color-primary)]"
              />

            </div>

            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
              No calculation yet
            </h3>

            <p className="text-sm text-[var(--color-text-secondary)]">
              Select a produced item, enter the production quantity, and click Calculate BOM.
            </p>

          </div>
        )}

      {/* ---------- Results ---------- */}

      {result &&
        !calculating && (
          <div className="space-y-5">

            {/* ---------- Export Buttons ---------- */}

            <div className="flex flex-wrap gap-2 justify-end">

              <button
                onClick={
                  handleExportExcel
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-success)] hover:bg-green-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                <FileDown
                  size={16}
                />
                Excel
              </button>

              <button
                onClick={
                  handleExportPdf
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                <FileText
                  size={16}
                />
                PDF
              </button>

              <button
                onClick={
                  handlePrint
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg text-sm font-medium transition"
              >
                <Printer
                  size={16}
                />
                Print
              </button>

            </div>

            {/* ---------- Production Summary ---------- */}

            <div className="bg-white border border-[var(--color-border-base)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">

              <div className="bg-[var(--color-primary)] px-5 py-3">

                <h2 className="text-white font-semibold flex items-center gap-2">
                  <Package
                    size={18}
                  />
                  Production Summary
                </h2>

              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">

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

            <div className="grid lg:grid-cols-2 gap-5">

              {/* Material Hierarchy */}

              <div className="bg-white border border-[var(--color-border-base)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">

                <div className="bg-[var(--color-primary)] px-5 py-3">

                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <Layers
                      size={18}
                    />
                    Material Hierarchy
                  </h2>

                </div>

                <div className="p-4">
                  <ExplosionTree
                    tree={
                      result.tree
                    }
                  />
                </div>

              </div>

              {/* Raw Material Summary */}

              <div className="bg-white border border-[var(--color-border-base)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">

                <div className="bg-[#92400E] px-5 py-3">

                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <Boxes
                      size={18}
                    />
                    Raw Material Summary
                  </h2>

                </div>

                <div className="overflow-auto max-h-[500px]">

                  <table className="w-full text-sm">

                    <thead className="sticky top-0 bg-[#92400E] text-white">

                      <tr>

                        <th className="text-left px-4 py-2 font-medium">
                          Raw Material
                        </th>

                        <th className="text-left px-4 py-2 font-medium">
                          Parent BOM
                        </th>

                        <th className="text-right px-4 py-2 font-medium">
                          Total Qty
                        </th>

                        <th className="text-left px-4 py-2 font-medium">
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
                              4
                            }
                            className="text-center py-8 text-[var(--color-text-secondary)]"
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

                                <td className="px-4 py-2 text-[var(--color-text-primary)] font-medium">
                                  {
                                    r.item
                                  }
                                </td>

                                <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                                  {
                                    r.parent_bom
                                  }
                                </td>

                                <td className="px-4 py-2 text-right tabular-nums text-[var(--color-text-primary)]">
                                  {formatNum(
                                    r.total_qty
                                  )}
                                </td>

                                <td className="px-4 py-2 text-[var(--color-text-secondary)]">
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

              <div className="bg-[var(--color-primary)] px-5 py-3 flex items-center gap-2">

                <h2 className="text-white font-semibold flex items-center gap-2">
                  <Boxes
                    size={18}
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

              <div className="p-4 bg-[var(--color-primary-light)] border-b border-[var(--color-border-base)] flex flex-wrap items-center gap-3">

                <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
                  <Filter
                    size={14}
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
                  className="px-3 py-1.5 text-sm bg-white border border-[var(--color-border-base)] rounded-md w-32 outline-none focus:border-[var(--color-primary)]"
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
                  className="px-3 py-1.5 text-sm bg-white border border-[var(--color-border-base)] rounded-md outline-none focus:border-[var(--color-primary)]"
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
                  className="px-3 py-1.5 text-sm bg-white border border-[var(--color-border-base)] rounded-md outline-none focus:border-[var(--color-primary)]"
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
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
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
                    className="pl-8 pr-3 py-1.5 text-sm bg-white border border-[var(--color-border-base)] rounded-md w-44 outline-none focus:border-[var(--color-primary)]"
                  />

                </div>

              </div>

              {/* Requirement Table */}

              <div className="overflow-auto max-h-[600px]">

                <table className="w-full text-sm">

                  <thead className="sticky top-0 bg-[var(--color-primary)] text-white">

                    <tr>

                      <th className="text-left px-4 py-2 font-medium">
                        Level
                      </th>

                      <th className="text-left px-4 py-2 font-medium">
                        Type
                      </th>

                      <th className="text-left px-4 py-2 font-medium">
                        Parent BOM
                      </th>

                      <th className="text-left px-4 py-2 font-medium">
                        Item
                      </th>

                      <th className="text-right px-4 py-2 font-medium">
                        Required Qty
                      </th>

                      <th className="text-left px-4 py-2 font-medium">
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
                            6
                          }
                          className="text-center py-8 text-[var(--color-text-secondary)]"
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

                            <td className="px-4 py-2 text-[var(--color-text-secondary)] tabular-nums">
                              {
                                r.level
                              }
                            </td>

                            <td className="px-4 py-2">
                              <TypeBadge
                                type={
                                  r.type
                                }
                              />
                            </td>

                            <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                              {
                                r.parent_bom
                              }
                            </td>

                            <td className="px-4 py-2 text-[var(--color-text-primary)] font-medium">
                              {
                                r.item
                              }
                            </td>

                            <td className="px-4 py-2 text-right tabular-nums text-[var(--color-text-primary)] font-medium">
                              {formatNum(
                                r.required_qty
                              )}
                            </td>

                            <td className="px-4 py-2 text-[var(--color-text-secondary)]">
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

    </div>
  );
}