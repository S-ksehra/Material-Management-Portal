import { useState } from 'react';
import { ChevronRight, ChevronDown, Package, Boxes, CircleDot, ChevronsDownUp, ChevronsUpDown, Hash } from 'lucide-react';
import type { TreeNode, MaterialType } from '@/types';

const TYPE: Record<MaterialType, { bg: string; text: string; dot: string; icon: typeof Package; label: string }> = {
  'Finished Good': { bg: '#14532D', text: '#fff', dot: '#16a34a', icon: Package,   label: 'FG' },
  'Semi Finished': { bg: '#1E3A8A', text: '#fff', dot: '#3b82f6', icon: CircleDot, label: 'SF' },
  'Raw Material':  { bg: '#92400E', text: '#fff', dot: '#f59e0b', icon: Boxes,     label: 'RM' },
};

function fmtQty(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toFixed(4).replace(/\.?0+$/, '');
}

function TreeRow({ node, depth, parentLines, initialOpen }: {
  node: TreeNode; depth: number; parentLines: boolean[]; initialOpen: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const hasKids = node.children.length > 0;
  const cfg = TYPE[node.type];
  const Icon = cfg.icon;
  const indent = depth * 20;

  return (
    <div>
      <div className="relative flex items-stretch min-h-[40px]">
        {/* guide lines */}
        <div className="shrink-0 flex" style={{ width: indent }}>
          {parentLines.map((draw, li) => (
            <div key={li} className="flex justify-center" style={{ width: 20 }}>
              {draw && <div className="w-px h-full bg-slate-200" />}
            </div>
          ))}
        </div>
        {depth > 0 && (
          <div className="absolute top-5 h-px bg-slate-200" style={{ left: indent - 10, width: 14 }} />
        )}

        {/* card — full width, wrap text */}
        <div
          className={`flex-1 min-w-0 flex items-start gap-2 my-0.5 pl-2 pr-3 py-2 rounded-lg border transition-all w-full bg-white ${
            depth === 0 ? 'border-slate-200 shadow-sm' : 'border-slate-100 hover:border-slate-300 hover:shadow-sm'
          }`}
          style={{ borderLeft: `3px solid ${cfg.dot}` }}
        >
          {/* toggle */}
          <button
            type="button"
            onClick={() => hasKids && setOpen(o => !o)}
            className={`shrink-0 w-5 h-5 flex items-center justify-center rounded transition mt-0.5
              ${hasKids ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer' : 'invisible'}`}
          >
            {hasKids && (open ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
          </button>

          {/* badge */}
          <span
            className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold leading-none mt-0.5"
            style={{ background: cfg.bg, color: cfg.text }}
          >
            <Icon size={9} />{cfg.label}
          </span>

          {/* name + code — wraps naturally */}
          <div className="flex-1 min-w-0 flex flex-col leading-snug gap-0.5">
            <span className="text-[12px] font-semibold text-slate-800 break-words">{node.item}</span>
            {node.item_code && (
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                <Hash size={9} className="shrink-0" />{node.item_code}
              </span>
            )}
          </div>

          {/* qty */}
          <div className="shrink-0 flex flex-col items-end leading-tight mt-0.5">
            <span className="text-[12px] font-bold tabular-nums text-slate-800">{fmtQty(node.quantity)}</span>
            <span className="text-[10px] text-slate-400">{node.unit || '—'}</span>
          </div>
        </div>
      </div>

      {hasKids && open && (
        <div>
          {node.children.map((child, i) => (
            <TreeRow
              key={`${child.item}-${depth}-${i}`}
              node={child}
              depth={depth + 1}
              parentLines={[...parentLines, i !== node.children.length - 1]}
              initialOpen={initialOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ExplosionTree({ tree }: { tree: TreeNode }) {
  const [ver, setVer] = useState(0);
  const [initialOpen, setOpen] = useState(true);
  const setAll = (open: boolean) => { setOpen(open); setVer(v => v + 1); };

  return (
    <div className="w-full">
      {/* toolbar */}
      <div className="flex items-center justify-end gap-1.5 mb-2.5">
        <button onClick={() => setAll(true)}
          className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition font-medium">
          <ChevronsUpDown size={11} /> Expand all
        </button>
        <button onClick={() => setAll(false)}
          className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition font-medium">
          <ChevronsDownUp size={11} /> Collapse all
        </button>
      </div>

      {/* tree — full width, vertical scroll only */}
      <div className="w-full max-h-[520px] overflow-y-auto overflow-x-hidden rounded-lg border border-slate-100 bg-slate-50/40 p-2">
        <TreeRow key={ver} node={tree} depth={0} parentLines={[]} initialOpen={initialOpen} />
      </div>
    </div>
  );
}
