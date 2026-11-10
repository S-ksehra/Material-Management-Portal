# Project memory

## Product intent & audience

- BOM (Bill of Materials) calculation application, likely for manufacturing/production planning.
- Primary page worked on: "Calculate BOM" page (component: `CalculateScreen`).
- Users interact with raw materials data, tables, filters, dropdowns, and preview sections to compute or review BOM data.

## Brand personality & voice

- Professional, utilitarian tool UI — functionality-first.
- No marketing language; labels and data presentation are the focus.

## Visual design & UX direction

- Stack: Vite + React + Tailwind CSS (utility-class styling inline).
- Layout pattern: card-based sections with headings, filter inputs, data tables, dropdowns, and preview areas.
- Compact, space-efficient aesthetic preferred — reduce excessive whitespace, padding, and font sizes while preserving readability.
- Specific compacting applied: smaller page heading sizes, tighter card padding, reduced label/table-data font sizes, tighter section spacing, compact dropdowns and filter inputs, reduced table row heights.
- Responsive layout required across screen sizes.
- Empty-state rows (e.g., "No raw materials", "No rows match filters") also tightened (reduced `py-8` → `py-6` or similar).
- Readability must not be sacrificed for compactness.

## Decisions, constraints & rationale

- Optimization scope: visual spacing/sizing only — existing functionality must remain unchanged.
- Rationale: page had excessive whitespace and oversized elements; compacting improves information density without breaking behavior.
- Build verification done after edits; JSX syntax errors from className merging were caught and fixed before completion.
- No `.bolt/prompt` file exists; all context is inferred from interaction history.

## Open questions & assumptions

- Assumes Tailwind utility classes are the primary styling mechanism throughout the app.
- Design system / shared component library presence unknown — spacing changes may have been one-off per component.
- Color palette, typography stack, and specific spacing tokens not yet documented — to be captured if design system emerges.
- Other screens/pages in the app are unexplored; may need similar compactness passes.