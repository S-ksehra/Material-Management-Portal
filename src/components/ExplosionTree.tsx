import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { TreeNode } from '@/types';

function typePill(type: TreeNode['type']) {
  const styles: Record<TreeNode['type'], string> = {
    'Finished Good': 'bg-[#14532D] text-white',
    'Semi Finished': 'bg-[#1E3A8A] text-white',
    'Raw Material': 'bg-[#92400E] text-white',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${styles[type]}`}
    >
      {type}
    </span>
  );
}

function formatQty(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toFixed(4).replace(/\.?0+$/, '');
}

function TreeRow({
  node,
  depth,
  isLast,
  guides,
}: {
  node: TreeNode;
  depth: number;
  isLast: boolean;
  guides: boolean[];
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="relative">
      {/* Vertical lines */}
      <div className="absolute top-0 bottom-0 left-0 flex pointer-events-none">
        {guides.map((draw, i) => (
          <div key={i} className="w-5 flex justify-center">
            {draw && <div className="w-px h-full bg-gray-300 dark:bg-gray-600" />}
          </div>
        ))}
      </div>

      {/* Row */}
      <div
        className={`
          relative flex items-center gap-3 py-2 pr-3 rounded-lg
          hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors
          ${depth === 0 ? 'bg-black/[0.03] dark:bg-white/[0.03]' : ''}
        `}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Horizontal line */}
        {depth > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-px bg-gray-300 dark:bg-gray-600"
            style={{ left: `${(depth - 1) * 24 + 12}px`, width: '12px' }}
          />
        )}

        {/* Toggle */}
        <button
          type="button"
          onClick={() => hasChildren && setOpen(!open)}
          className={`
            shrink-0 w-5 h-5 flex items-center justify-center rounded
            ${hasChildren ? 'text-gray-500 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer' : 'invisible'}
          `}
        >
          {hasChildren && (open ? <ChevronDown size={15} /> : <ChevronRight size={15} />)}
        </button>

        {/* Type Pill - full name with colour (exactly like your image) */}
        {typePill(node.type)}

        {/* Item name */}
        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate min-w-0">
          {node.item}
        </span>

        {/* Quantity */}
        <span className="ml-auto shrink-0 text-xs tabular-nums text-[var(--color-text-secondary)] bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
          {formatQty(node.quantity)} {node.unit}
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
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ExplosionTree({ tree }: { tree: TreeNode }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Material Hierarchy
        </h3>
      </div>

      <div className="p-3 max-h-[520px] overflow-auto">
        <TreeRow
          node={tree}
          depth={0}
          isLast={true}
          guides={[]}
        />
      </div>
    </div>
  );
}