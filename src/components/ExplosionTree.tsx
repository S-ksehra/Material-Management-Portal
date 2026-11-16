import { useState } from 'react';
import { ChevronRight, ChevronDown, Package, Boxes, CircleDot, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import type { TreeNode, MaterialType } from '@/types';

const TYPE_STYLES: Record<
  MaterialType,
  { badge: string; border: string; label: string; icon: typeof Package }
> = {
  'Finished Good': {
    badge: 'bg-[#14532D] text-white',
    border: 'border-l-[#14532D]',
    label: 'Finished Good',
    icon: Package,
  },
  'Semi Finished': {
    badge: 'bg-[#1E3A8A] text-white',
    border: 'border-l-[#1E3A8A]',
    label: 'Semi Finished',
    icon: CircleDot,
  },
  'Raw Material': {
    badge: 'bg-[#92400E] text-white',
    border: 'border-l-[#92400E]',
    label: 'Raw Material',
    icon: Boxes,
  },
};

function formatQty(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toFixed(4).replace(/\.?0+$/, '');
}

function countNodes(node: TreeNode): { total: number; byType: Record<MaterialType, number> } {
  const byType: Record<MaterialType, number> = {
    'Finished Good': 0,
    'Semi Finished': 0,
    'Raw Material': 0,
  };

  function walk(n: TreeNode): number {
    byType[n.type] += 1;
    return 1 + n.children.reduce((sum, c) => sum + walk(c), 0);
  }

  const total = walk(node);
  return { total, byType };
}

function TreeRow({
  node,
  depth,
  isLast,
  guides,
  initialOpen = true,
}: {
  node: TreeNode;
  depth: number;
  isLast: boolean;
  guides: boolean[];
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const hasChildren = node.children.length > 0;
  const style = TYPE_STYLES[node.type];
  const TypeIcon = style.icon;

  return (
    <div className="relative">
      {/* Vertical guide lines */}
      <div className="absolute top-0 bottom-0 left-0 flex pointer-events-none">
        {guides.map((draw, i) => (
          <div key={i} className="w-6 flex justify-center">
            {draw && <div className="w-px h-full bg-[var(--color-border-base)]" />}
          </div>
        ))}
      </div>

      {/* Horizontal connector */}
      {depth > 0 && (
        <div
          className="absolute top-1/2 h-px bg-[var(--color-border-base)] pointer-events-none"
          style={{ left: `${(depth - 1) * 24 + 12}px`, width: '14px' }}
        />
      )}

      {/* Row */}
      <div
        className={`
          relative flex items-center gap-2 py-1.5 pr-2 my-1 rounded-lg border-l-[3px]
          bg-white border border-[var(--color-border-base)] ${style.border}
          hover:shadow-sm hover:border-[var(--color-primary)] transition
        `}
        style={{ paddingLeft: `${depth * 24 + 8}px`, marginLeft: `${depth > 0 ? depth * 24 : 0}px` }}
      >
        {/* Toggle */}
        <button
          type="button"
          onClick={() => hasChildren && setOpen(!open)}
          className={`
            shrink-0 w-5 h-5 flex items-center justify-center rounded
            ${hasChildren ? 'text-[var(--color-text-secondary)] hover:bg-black/10 cursor-pointer' : 'invisible'}
          `}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {hasChildren && (open ? <ChevronDown size={15} /> : <ChevronRight size={15} />)}
        </button>

        {/* Type badge with icon */}
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${style.badge}`}
        >
          <TypeIcon size={10} />
          {style.label}
        </span>

        {/* Item name + code */}
        <span className="min-w-0 flex flex-col leading-tight">
          <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
            {node.item}
          </span>
          {node.item_code && (
            <span className="text-[10px] tabular-nums text-[var(--color-text-secondary)]">
              Code: {node.item_code}
            </span>
          )}
        </span>

        {/* Quantity */}
        <span className="ml-auto shrink-0 text-right leading-tight">
          <span className="block text-xs font-bold tabular-nums text-[var(--color-text-primary)]">
            {formatQty(node.quantity)}
          </span>
          <span className="block text-[10px] text-[var(--color-text-secondary)]">
            {node.unit || '—'}
          </span>
        </span>
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div>
          {node.children.map((child, i) => {
            const childIsLast = i === node.children.length - 1;
            return (
              <TreeRow
                key={`${child.item}-${i}`}
                node={child}
                depth={depth + 1}
                isLast={childIsLast}
                guides={[...guides, !isLast]}
                initialOpen={initialOpen}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ExplosionTree({ tree }: { tree: TreeNode }) {
  const [treeVersion, setTreeVersion] = useState(0);
  const [initialOpen, setInitialOpen] = useState(true);
  const { total, byType } = countNodes(tree);

  // Remount the whole tree with the chosen initial state; after that,
  // per-row toggles work normally until the next expand/collapse-all click.
  const setAll = (open: boolean): void => {
    setInitialOpen(open);
    setTreeVersion((v) => v + 1);
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      {/* Header with counts + expand/collapse controls */}
      <div className="px-4 py-2.5 border-b border-[var(--color-border-base)] flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mr-auto">
          Material Hierarchy
          <span className="ml-2 text-[10px] font-normal text-[var(--color-text-secondary)]">
            {total} items
          </span>
        </h3>

        <button
          onClick={() => setAll(true)}
          className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-[var(--color-border-base)] hover:bg-[var(--color-primary-light)] transition text-[var(--color-text-primary)]"
        >
          <ChevronsUpDown size={11} />
          Expand all
        </button>
        <button
          onClick={() => setAll(false)}
          className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-[var(--color-border-base)] hover:bg-[var(--color-primary-light)] transition text-[var(--color-text-primary)]"
        >
          <ChevronsDownUp size={11} />
          Collapse all
        </button>
      </div>

      {/* Legend */}
      <div className="px-4 py-1.5 border-b border-[var(--color-border-base)] bg-black/[0.02] flex flex-wrap gap-x-4 gap-y-1">
        {(['Finished Good', 'Semi Finished', 'Raw Material'] as MaterialType[]).map((t) => {
          const style = TYPE_STYLES[t];
          const TypeIcon = style.icon;
          return (
            <span key={t} className="inline-flex items-center gap-1.5 text-[10px] text-[var(--color-text-secondary)]">
              <span className={`w-2 h-2 rounded-sm ${style.badge}`} />
              <TypeIcon size={10} />
              {style.label}
              <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                ({byType[t]})
              </span>
            </span>
          );
        })}
      </div>

      {/* Tree */}
      <div className="p-2.5 max-h-[520px] overflow-auto bg-black/[0.015]">
        <TreeRow
          key={treeVersion}
          node={tree}
          depth={0}
          isLast={true}
          guides={[]}
          initialOpen={initialOpen}
        />
      </div>
    </div>
  );
}
