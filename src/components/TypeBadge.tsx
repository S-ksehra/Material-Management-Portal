import type { MaterialType } from '@/types';

const STYLES: Record<MaterialType, string> = {
  'Finished Good': 'bg-[#14532D] text-white',
  'Semi Finished': 'bg-[#1E3A8A] text-white',
  'Raw Material': 'bg-[#92400E] text-white',
};

export function TypeBadge({ type }: { type: MaterialType }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STYLES[type]}`}>
      {type}
    </span>
  );
}
