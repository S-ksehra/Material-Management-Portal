# Project memory

## Product intent & audience

- BOM (Bill of Materials) calculation application for manufacturing/production planning.
- Primary page: "Calculate BOM" (component: `CalculateScreen`).
- Users interact with raw materials data, tables, filters, dropdowns, and preview sections to compute or review BOM data.
- Stage-wise PDF printing is a key feature: users can print all stages or select specific stages (one, multiple, or all) before generating the PDF.
- On-screen stage preview added so users can view stage details without downloading/printing.

## Brand personality & voice

- Professional, utilitarian tool UI — functionality-first.
- No marketing language; labels and data presentation are the focus.

## Visual design & UX direction

- Stack: Vite + React + Tailwind CSS (utility-class styling inline).
- Layout: card-based sections with headings, filter inputs, data tables, dropdowns, preview areas, and modal dialogs.
- Compact, space-efficient aesthetic preferred — reduce excessive whitespace/padding/font sizes while preserving readability.
- Compacting applied: smaller headings, tighter card padding, reduced label/table font sizes, tighter section spacing, compact dropdowns/inputs, reduced table row heights, tightened empty-state rows.
- Modal pattern used for stage viewer and stage selection panel.
- Responsive layout required across screen sizes.
- PDF output orientation: landscape.

## Decisions, constraints & rationale

- Optimization scope: visual spacing/sizing only — existing functionality must remain unchanged (prior pass).
- Rationale: page had excessive whitespace; compacting improves information density without breaking behavior.
- `exporters.ts` contains PDF/print logic; `printStageWise` function refactored to extract a reusable stage data builder.
- Stage selection is keyed by stage name (not stage ID/index) — selecting a name selects all stages sharing that name.
- Existing "Print Stage wise" button preserved (prints all stages); new "Stage Filter" button added alongside it for selective printing/preview.
- Stage data per page includes: customer, BOM reference, output product, target output, planned materials table.
- Build verification done after edits; JSX syntax errors from className merging were caught and fixed.
- No `.bolt/prompt` file exists; all context is inferred from interaction history.

## Open questions & assumptions

- Assumes Tailwind utility classes are the primary styling mechanism throughout the app.
- Design system / shared component library presence unknown — spacing changes may have been one-off per component.
- Color palette, typography stack, and specific spacing tokens not yet documented.
- Other screens/pages in the app are unexplored; may need similar compactness passes.
- Stage selection by name (not ID) may cause ambiguity if duplicate stage names exist — no deduplication or disambiguation UI added yet.
- Stage filtering requested for "other relevant sections" beyond Calculate BOM — not yet implemented; which sections need it is unspecified.