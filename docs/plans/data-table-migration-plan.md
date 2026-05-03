# DataTable Migration Plan: Custom → supastarter DataTableProvider

## Executive Summary

The project has **two** data-table ecosystems and **zero** shared component consumption:

1. **Custom `DataTable` block** — `apps/saas/modules/search/components/blocks/DataTable.tsx` (150 lines). A minimal generic wrapper with sorting + client-side pagination. **ZERO consumers** — it's exported but never imported anywhere in the saas app.

2. **supastarter `DataTableProvider`** — `packages/ui/components/data-table/` (13+ files, ~800 lines). A rich context-based system with column ordering, filtering, visibility, row selection, column resize, toolbar, filter controls. **ZERO consumers** from app code — only used internally by its own sub-components.

3. **7 standalone TanStack Table implementations** that directly use `useReactTable` from `@tanstack/react-table` — each hand-rolls headers, body, pagination, sorting.

4. **Admin `DataTable` (separate ecosystem)** — `packages/ui/components/admin/data-table.tsx` — uses `ra-core` (react-admin core). This is a completely different pattern NOT related to the migration.

---

## 1. The Custom DataTable Block (Legacy)

### File

`apps/saas/modules/search/components/blocks/DataTable.tsx`

### Interface

```tsx
export interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	pageSize?: number; // default: 10
	emptyMessage?: string; // default: "No results."
	className?: string;
}
```

### What It Provides

- Client-side sorting (click header to sort asc/desc)
- Client-side pagination (prev/next buttons + "Page X of Y" display)
- Empty state with configurable message
- Card wrapper around the table
- **No** column filters, column visibility toggle, row selection, column reordering, server-side pagination, search, or toolbar

### Usage Count: **0 consumers** (dead code)

### Recommendation

✅ **Keep as-is or deprecate.** It has no consumers, so there's nothing to migrate. If needed later for trivial tables, it still works. No migration effort required.

---

## 2. The supastarter DataTableProvider (Target)

### Location

`packages/ui/components/data-table/` — exported from `@repo/ui` via `packages/ui/index.ts` → `packages/ui/components/data-table/index.ts`

### Available Exports

| Export                          | Purpose                                                               |
| ------------------------------- | --------------------------------------------------------------------- |
| `DataTableProvider`             | Context provider wrapping TanStack table instance                     |
| `useDataTable`                  | Hook to consume data table context                                    |
| `DataTableToolbar`              | Toolbar with search, actions, column visibility, filter drawer toggle |
| `DataTableViewOptions`          | Dropdown to toggle column visibility                                  |
| `DataTableFilterControls`       | Side panel with filter fields                                         |
| `DataTableFilterControlsDrawer` | Mobile drawer variant                                                 |
| `DataTableFilterInput`          | Debounced text filter input                                           |
| `DataTableFilterCheckbox`       | Checkbox filter with faceted values                                   |
| `DataTableFilterSlider`         | Range slider filter                                                   |
| `DataTableFilterTimerange`      | Date range filter                                                     |
| `DataTableResetButton`          | Reset all table state                                                 |
| `DataTableFilterResetButton`    | Reset only filters                                                    |

### `DataTableProvider` API

```tsx
interface DataTableProviderProps<TData, TValue> {
	children: React.ReactNode;
	table: Table<TData>; // Pre-configured TanStack Table instance
	filterFields: DataTableFilterField<TData>[]; // Filter field definitions
	columns: ColumnDef<TData, TValue>[]; // Column definitions
	isLoading?: boolean;
	totalRows?: number;
	filterRows?: number;
	getFacetedUniqueValues?: (table: Table<TData>, columnId: string) => Map<string, number>;
	getFacetedMinMaxValues?: (
		table: Table<TData>,
		columnId: string,
	) => [number, number] | undefined;
	// Optional state overrides:
	columnFilters?: ColumnFiltersState;
	sorting?: SortingState;
	rowSelection?: RowSelectionState;
	columnOrder?: string[];
	columnVisibility?: VisibilityState;
	pagination?: PaginationState;
	enableColumnOrdering?: boolean;
}
```

### Key Pattern

```tsx
// Parent creates the table instance
const table = useReactTable({ data, columns, ... });

// Wraps children in context
<DataTableProvider table={table} columns={columns} filterFields={[...]} ...>
  <DataTableToolbar renderActions={() => ...} />
  <Table>
    <TableHeader>{/* render header groups */}</TableHeader>
    <TableBody>{/* render rows */}</TableBody>
  </Table>
  {/* Pagination */}
</DataTableProvider>
```

---

## 3. Current TanStack Table Consumers (7 Total)

These are the 7 files that would benefit from migration. None use the custom `DataTable` block; all directly use `useReactTable`.

### Consumer 1: `UserList.tsx` (admin)

- **File**: `apps/saas/modules/admin/components/users/UserList.tsx` (~335 lines)
- **Table features**: Server-side pagination via nuqs `currentPage`, server-side search via debounced `query`, manual Table rendering without TableHeader/sorting, external `Pagination` component
- **State**: `currentPage`/`searchTerm` from URL query params, server-driven data
- **Pattern**: `useReactTable` with `manualPagination: true`, manual table body rendering (no header sort)
- **Dependencies**: `orpc`, `nuqs`, `useDebounce`, `Pagination` shared component
- **Migration complexity**: ⭐⭐ Medium
- **What changes**: Wrap in `DataTableProvider`, add filterFields, use `DataTableToolbar` for search, keep external Pagination

### Consumer 2: `OrganizationList.tsx` (admin)

- **File**: `apps/saas/modules/admin/components/organizations/OrganizationList.tsx` (~283 lines)
- **Table features**: Same pattern as UserList — server-side pagination + search via URL params
- **State**: `currentPage`/`searchTerm` from nuqs, server-driven data
- **Pattern**: Virtually identical to UserList
- **Migration complexity**: ⭐⭐ Medium
- **What changes**: Same as UserList

### Consumer 3: `OrganizationMembersList.tsx` (orgs)

- **File**: `apps/saas/modules/organizations/components/OrganizationMembersList.tsx` (~221 lines)
- **Table features**: Client-side sorting, client-side column filters, manual TableBody only (no TableHeader), no pagination
- **State**: `sorting`, `columnFilters` via `useState`, data from parent query
- **Pattern**: No pagination, no TableHeader rendered (only body), both sorting and filter state tracked
- **Migration complexity**: ⭐ Easy
- **What changes**: Add `DataTableProvider`, add filterFields, optionally add TableHeader render

### Consumer 4: `OrganizationInvitationsList.tsx` (orgs)

- **File**: `apps/saas/modules/organizations/components/OrganizationInvitationsList.tsx` (~195 lines)
- **Table features**: Client-side sorting, client-side text filter on email, client-side pagination
- **State**: No sorting/filtering state tracked (using defaults)
- **Pattern**: Uses `getSortedRowModel` and `getFilteredRowModel` with `getPaginationRowModel`
- **Migration complexity**: ⭐ Easy
- **What changes**: Wrap in `DataTableProvider`, add filterFields, render header

### Consumer 5: `MySearchFileTable.tsx` (my-search)

- **File**: `apps/saas/modules/my-search/components/files/MySearchFileTable.tsx` (~341 lines)
- **Table features**: Client-side sorting, column visibility toggle (custom DropdownMenu), manual header + body rendering with sorting indicators, custom skeleton loading, preview/delete dialogs
- **State**: `sorting`, `columnVisibility` via `useState`
- **Pattern**: Rich custom toolbar with columns dropdown and file count
- **Migration complexity**: ⭐⭐ Medium
- **What changes**: Could benefit from `DataTableToolbar` + `DataTableViewOptions` to replace custom columns dropdown

### Consumer 6: `FileTable.tsx` (search)

- **File**: `apps/saas/modules/search/components/files/FileTable.tsx` (~428 lines)
- **Table features**: Client-side sorting, column visibility toggle (custom DropdownMenu), manual header + body rendering, skeleton loading, preview/delete dialogs. Very similar to MySearchFileTable.
- **State**: `sorting`, `columnVisibility` via `useState`
- **Pattern**: Nearly identical to MySearchFileTable
- **Migration complexity**: ⭐⭐ Medium
- **What changes**: Same as MySearchFileTable

### Consumer 7: `DocumentsTable.tsx` (search) — **BIG ONE**

- **File**: `apps/saas/modules/search/components/tables/DocumentsTable.tsx` (~2045 lines)
- **Table features**: Drag-and-drop column reordering (dnd-kit), column visibility, client-side sorting, client-side pagination with custom UI, row selection with bulk actions (copy, delete, edit), sheet for editing, search input, filter controls
- **State**: `sorting`, `columnVisibility`, `columnFilters`, `rowSelection`, and drag state
- **Pattern**: The most complex table in the codebase — integrates `@dnd-kit` for column reorder, has multiple dialogs/sheets, complex column definitions with DnD sortable headers
- **Migration complexity**: ⭐⭐⭐⭐ High
- **What changes**: Partial migration possible — column ordering aligns with dnd-kit, but the complexity of this component makes a full rewrite risky. Consider refactoring into smaller pieces first.

---

## 4. API Mapping: Custom DataTable → DataTableProvider

Since the custom `DataTable` block has **zero consumers**, this mapping is hypothetical but illustrates the relationship:

| Custom DataTable        | DataTableProvider Equivalent                                                     |
| ----------------------- | -------------------------------------------------------------------------------- |
| `data: TData[]`         | → Already passed to `useReactTable({data})` setup                                |
| `columns: ColumnDef[]`  | → Passed to both `useReactTable({columns})` and `DataTableProvider columns` prop |
| `pageSize?: number`     | → Set via `initialState.pagination.pageSize` in `useReactTable`                  |
| `emptyMessage?: string` | → Custom render in empty state (DataTableProvider doesn't have this prop)        |
| `className?: string`    | → Apply to wrapper div                                                           |

The custom DataTable provides:

- Built-in **Card** wrapper → migrate to `<Card>` in consumer
- Built-in **pagination** UI (prev/next buttons + "Page X of Y") → DataTableProvider doesn't provide pagination UI; consumer renders it
- Built-in **sorting** (click-to-sort with chevron icons) → DataTableProvider doesn't render the table itself; consumer renders headers
- Built-in **empty state** → Consumer renders empty state

**Key insight**: DataTableProvider is NOT a replacement for DataTable as a drop-in component. It's a **context provider** that gives sub-components access to table state. The table rendering (headers, body, pagination) is still done by the consumer.

---

## 5. Migration Path

### Recommendation: One Consumer at a Time

A gradual migration is safest. Each consumer can be wrapped independently.

### Suggested Order (lowest risk first)

1. **OrganizationInvitationsList** (~195 lines, simplest) — ⭐ Easy
2. **OrganizationMembersList** (~221 lines, minimal) — ⭐ Easy
3. **MySearchFileTable** (~341 lines, reusable pattern) — ⭐⭐ Medium
4. **FileTable** (~428 lines, duplicate of #3) — ⭐⭐ Medium
5. **UserList** (~335 lines, common admin pattern) — ⭐⭐ Medium
6. **OrganizationList** (~283 lines, same as #5) — ⭐⭐ Medium
7. **DocumentsTable** (~2045 lines, most complex) — ⭐⭐⭐⭐ High

### Migration Pattern (per consumer)

**Before:**

```tsx
export function MyTable() {
	const [sorting, setSorting] = useState<SortingState>([]);
	const table = useReactTable({
		data,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="space-y-4">
			{/* Custom toolbar */}
			<div className="flex items-center justify-between">
				<p>{data.length} rows</p>
				<DropdownMenu>{/* column visibility */}</DropdownMenu>
			</div>
			<Card>
				<Table>
					<TableHeader>{/* header rendering */}</TableHeader>
					<TableBody>{/* body rendering */}</TableBody>
				</Table>
			</Card>
		</div>
	);
}
```

**After:**

```tsx
export function MyTable() {
	const [sorting, setSorting] = useState<SortingState>([]);
	const table = useReactTable({
		data,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<DataTableProvider
			table={table}
			columns={columns}
			filterFields={[]} // Define column filters
			totalRows={data.length}
		>
			<DataTableToolbar />
			<Card>
				<Table>
					<TableHeader>{/* header rendering */}</TableHeader>
					<TableBody>{/* body rendering */}</TableBody>
				</Table>
			</Card>
		</DataTableProvider>
	);
}
```

### Estimated Effort

| Consumer                    | Lines | Effort  | Key Changes                                                             |
| --------------------------- | ----- | ------- | ----------------------------------------------------------------------- |
| OrganizationInvitationsList | ~195  | 1-2 hrs | Wrap in provider, add filter fields                                     |
| OrganizationMembersList     | ~221  | 1-2 hrs | Wrap in provider, add filter fields                                     |
| MySearchFileTable           | ~341  | 2-3 hrs | Replace custom toolbar with `DataTableToolbar` + `DataTableViewOptions` |
| FileTable                   | ~428  | 2-3 hrs | Same as MySearchFileTable                                               |
| UserList                    | ~335  | 2-3 hrs | Add header rendering, wrap in provider                                  |
| OrganizationList            | ~283  | 2-3 hrs | Same as UserList                                                        |
| DocumentsTable              | ~2045 | 4-8 hrs | Complex — partial migration or phased approach                          |

**Total estimated effort**: 14-24 hours across all 7 consumers.

### Do NOT Migrate

The following tables use plain `<Table>` components without `useReactTable` — they're static displays not suited for DataTableProvider migration:

- `ImportPreview.tsx` — static CSV/import preview
- `ConnectorsPage.tsx` — simple API keys list table
- `JobsDashboardPage.tsx` — simple job list
- `StopwordsPanel.tsx` — simple word list
- `ShopifySyncHistory.tsx` — simple sync history
- `knowledge/components/FileTable.tsx` — simple file list (no TanStack)

---

## 6. Potential Issues

1. **Filter fields require column metadata**: `DataTableFilterField<TData>` requires defining filter type per column (input, checkbox, slider, timerange). Simple consumers (OrgInvitations, OrgMembers) may not need filters — can pass empty array `[]`.

2. **No built-in pagination UI**: The DataTableProvider ecosystem does NOT include a pagination component. Consumers using `getPaginationRowModel` will still need to render their own prev/next controls.

3. **`DataTableToolbar` shows column controls button**: This requires the `ControlsProvider` (auto-wrapped by `DataTableProvider`). Non-filterable tables will still show the toggle button. Can hide via CSS or skip using `DataTableToolbar`.

4. **Import path**: The DataTableProvider is exported from `@repo/ui` (`packages/ui/index.ts → components/data-table/index.ts`). Consumers should import from `@repo/ui`.

5. **Server-side consumers (UserList, OrganizationList)**: These use `manualPagination: true` with server-driven data. The `DataTableProvider` pagination state defaults are compatible, but the external `Pagination` component from `@shared/components/Pagination` must remain separate.

---

## 7. Scripting the Migration

For each consumer, the mechanical steps are:

1. Add imports: `import { DataTableProvider, DataTableToolbar, DataTableViewOptions, type DataTableFilterField } from "@repo/ui";`
2. Define `filterFields` array mapping columns to filter types (or `[]`)
3. Wrap table content in `<DataTableProvider table={table} columns={columns} filterFields={filterFields} totalRows={data.length}>`
4. Optionally replace custom toolbar with `<DataTableToolbar renderActions={...} />`
5. Optionally replace custom columns dropdown with `<DataTableViewOptions />`
6. Remove unused state variables that DataTableProvider manages internally

---

## 8. Conclusion

- **Custom `DataTable` block**: 0 consumers — no migration needed. Can be deprecated.
- **DataTableProvider**: 0 consumers — underutilized but rich. If 3+ consumers can be migrated, it's worth teaching the pattern.
- **7 actual TanStack consumers**: Good migration candidates, but the value proposition is modest for simpler tables (~200 lines) since DataTableProvider mainly adds filter toolbar infrastructure that simple tables don't need.
- **Best ROI consumers**: `MySearchFileTable` and `FileTable` (duplicate custom column visibility dropdowns → replaced by `DataTableViewOptions`), and `DocumentsTable` (complex but highest payoff).
- **Recommendation**: Migrate the 2 file tables first (prove the pattern), then the admin tables if the pattern delivers value, skip the org tables (too simple to benefit), and tackle DocumentsTable last.
