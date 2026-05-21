## Goal
On the Funds Directory page (`/funds`), remove the left sidebar filter column on desktop and instead surface filters via a "Filters" button next to the search bar that opens a popup — matching the mobile pattern. This frees the full width for results so the table/grid renders properly.

## Changes

**File:** `src/pages/FundsDirectoryPage.tsx`

1. **Remove the desktop `<aside>` sidebar** containing `<FilterPanel />` and drop the two-column `md:grid-cols-[240px_minmax(0,1fr)]` layout. Results section becomes full-width.

2. **Promote the Filters button to all breakpoints** (remove the `md:hidden` class). Place it inline in the toolbar next to the sort dropdown and view toggle, under the search bar.
   - On desktop, open in a wider popup. Options:
     - Keep using `Sheet` (slide-in from left/right) — consistent with mobile, no extra component.
     - Or switch to a `Dialog`/`Popover` for a centered modal feel.
   - Recommended: keep `Sheet` but widen to `w-[420px]` on desktop (`sm:max-w-md`) for comfortable two-column filter layout.

3. **Filter panel content stays identical** — Compliance (CMA toggle), Risk level, Quick filters (fast withdrawals, beginner friendly), Minimum investment, Category, Reset button. No logic changes.

4. **Active filter count badge** already exists on the button — keep it visible at all breakpoints so users can see what's applied without opening the popup.

5. **Toolbar layout polish:** ensure search input + sort + view toggle + filters button align cleanly on one row at desktop width; wrap gracefully on smaller widths.

## Out of scope
- No changes to filter logic, scoring, fund data, table columns, or card components.
- No changes to other pages.

## Technical notes
- The grid wrapper `grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-5` collapses to just rendering `<section>` directly.
- `Sheet` already imported; widen via `className="w-full sm:max-w-md overflow-y-auto"` on `SheetContent`.
- Remove the `hidden md:inline-flex` constraint isn't needed — only the `md:hidden` on the Filters button changes.
