"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import {
	CopyIcon,
	Loader2Icon,
	PlayIcon,
	TerminalIcon,
	ChevronDownIcon,
	ChevronRightIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
	hits: unknown[];
	found: number;
	page: number;
	perPage: number;
	facetCounts: Array<{
		fieldName: string;
		counts: Array<{ value: string; count: number }>;
	}>;
	searchTimeMs: number;
}

type ResultTab = "hits" | "facets" | "rawJson";

interface SearchPreviewProps {
	organizationId: string;
	slug: string;
	slugs?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 700;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCurl(
	slug: string,
	q: string,
	opts: {
		queryBy?: string;
		filterBy?: string;
		sortBy?: string;
		perPage?: number;
		page?: number;
		highlightFields?: string;
		facetBy?: string;
	},
) {
	const lines = [`curl -X POST "*/api/search/public/${slug}" \\\\`];
	lines.push(`  -H "Content-Type: application/json" \\\\`);
	lines.push(`  -H "x-api-key: ss_search_***" \\\\`);

	const body: Record<string, string | number> = { q: q || "*" };
	if (opts.queryBy) body.queryBy = opts.queryBy;
	if (opts.filterBy) body.filterBy = opts.filterBy;
	if (opts.sortBy) body.sortBy = opts.sortBy;
	if (opts.perPage && opts.perPage !== 20) body.perPage = opts.perPage;
	if (opts.page && opts.page !== 1) body.page = opts.page;
	if (opts.highlightFields) body.highlightFields = opts.highlightFields;
	if (opts.facetBy) body.facetBy = opts.facetBy;

	lines.push(`  -d '${JSON.stringify(body, null, 2)}'`);
	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// HitCard
// ---------------------------------------------------------------------------

function HitCard({ hit, index }: { hit: Record<string, unknown>; index: number }) {
	const highlight = hit.highlight as Record<string, { snippet: string }> | undefined;
	const fields = Object.entries(hit).filter(([k]) => k !== "highlight");

	return (
		<Card className="p-4 space-y-1">
			<div className="text-xs font-mono text-foreground/40">#{index + 1}</div>
			{fields.slice(0, 5).map(([key, value]) => {
				const snippet = highlight?.[key]?.snippet;
				return (
					<div key={key} className="text-sm">
						<span className="font-medium text-foreground/60">{key}: </span>
						{snippet ? (
							<span
								// biome-ignore lint/security/noDangerouslySetInnerHtml: highlight comes from server
								dangerouslySetInnerHTML={{ __html: snippet }}
								className="[&>mark]:bg-amber-300/40 [&>mark]:px-0.5 [&>mark]:rounded"
							/>
						) : (
							<StringValue value={value} />
						)}
					</div>
				);
			})}
			{fields.length > 5 && (
				<div className="text-xs text-foreground/40">+{fields.length - 5} more fields</div>
			)}
		</Card>
	);
}

function StringValue({ value }: { value: unknown }) {
	if (value === null || value === undefined) return <span className="text-foreground/40">—</span>;
	if (Array.isArray(value)) return <span>{value.join(", ")}</span>;
	if (typeof value === "object") return <span className="text-foreground/40">[object]</span>;
	return <span>{String(value)}</span>;
}

// ---------------------------------------------------------------------------
// SearchPreview
// ---------------------------------------------------------------------------

export function SearchPreview({
	organizationId: _organizationId,
	slug,
	slugs,
}: SearchPreviewProps) {
	const t = useTranslations();

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ---- State ----
	const [selectedSlug, setSelectedSlug] = useState(slug);
	const [query, setQuery] = useState("");
	const [queryBy, setQueryBy] = useState("");
	const [filterBy, setFilterBy] = useState("");
	const [sortBy, setSortBy] = useState("");
	const [perPage, setPerPage] = useState(20);
	const [page, setPage] = useState(1);
	const [highlightFields, setHighlightFields] = useState("");
	const [facetBy, setFacetBy] = useState("");
	const [advancedOpen, setAdvancedOpen] = useState(false);

	const [result, setResult] = useState<SearchResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [autoSearching, setAutoSearching] = useState(false);

	const [resultTab, setResultTab] = useState<ResultTab>("hits");

	// Sync selectedSlug when slug prop changes
	useEffect(() => {
		setSelectedSlug(slug);
	}, [slug]);

	// ---- Run search ----
	const runSearch = useCallback(
		async (auto = false) => {
			if (!selectedSlug) return;
			if (auto) setAutoSearching(true);
			setLoading(true);
			setError(null);

			try {
				const url = new URL(`/api/search/public/${selectedSlug}`, window.location.origin);
				const body: Record<string, unknown> = { q: query || "*" };
				if (queryBy) body.queryBy = queryBy;
				if (filterBy) body.filterBy = filterBy;
				if (sortBy) body.sortBy = sortBy;
				if (perPage !== 20) body.perPage = perPage;
				if (page !== 1) body.page = page;
				if (highlightFields) body.highlightFields = highlightFields;
				if (facetBy) body.facetBy = facetBy;

				const res = await fetch(url.toString(), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});

				if (!res.ok) {
					const text = await res.text();
					throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
				}

				const json = (await res.json()) as SearchResult;
				setResult(json);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Search failed");
				setResult(null);
			} finally {
				setLoading(false);
				setAutoSearching(false);
			}
		},
		[selectedSlug, query, queryBy, filterBy, sortBy, perPage, page, highlightFields, facetBy],
	);

	// ---- Debounced auto-search ----
	useEffect(() => {
		if (!selectedSlug || !query) return;
		debounceRef.current = setTimeout(() => {
			void runSearch(true);
		}, DEBOUNCE_MS);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [
		query,
		queryBy,
		filterBy,
		sortBy,
		perPage,
		page,
		highlightFields,
		facetBy,
		selectedSlug,
		runSearch,
	]);

	// ---- Keyboard handler ----
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			if (debounceRef.current) clearTimeout(debounceRef.current);
			void runSearch();
		}
	};

	// ---- Handlers ----
	const handleSlugChange = (newSlug: string) => {
		setSelectedSlug(newSlug);
		setResult(null);
		setError(null);
		setQuery("");
	};

	const handleCopyCurl = () => {
		const curl = buildCurl(selectedSlug, query, {
			queryBy,
			filterBy,
			sortBy,
			perPage,
			page,
			highlightFields,
			facetBy,
		});
		navigator.clipboard.writeText(curl).then(
			() => toast.success(t("search.playground.copied")),
			() => toast.error("Failed to copy"),
		);
	};

	const handleCopyJson = () => {
		if (!result) return;
		navigator.clipboard.writeText(JSON.stringify(result, null, 2)).then(
			() => toast.success(t("search.playground.copied")),
			() => toast.error("Failed to copy"),
		);
	};

	const handleManualRun = () => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		void runSearch();
	};

	// ---- Render ----
	const hasMultipleIndexes = slugs && slugs.length > 1;

	return (
		<div className="space-y-4">
			{/* Index selector + Query input row */}
			<div className="gap-4 sm:flex-row sm:items-start flex flex-col">
				{hasMultipleIndexes && (
					<div className="sm:w-48 w-full shrink-0">
						<Select value={selectedSlug} onValueChange={handleSlugChange}>
							<SelectTrigger>
								<SelectValue placeholder={t("search.selectIndex")} />
							</SelectTrigger>
							<SelectContent>
								{slugs!.map((s) => (
									<SelectItem key={s} value={s}>
										{s}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
				<div className="gap-2 flex flex-1 items-start">
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={t("search.preview.placeholder")}
						className="flex-1"
						autoFocus
					/>
					<Button onClick={handleManualRun} loading={loading} variant="primary">
						<PlayIcon className="size-4" />
						{t("search.playground.run")}
					</Button>
				</div>
			</div>

			{/* Hint */}
			<p className="text-xs text-foreground/40">{t("search.playground.cmdEnter")}</p>

			{/* Auto-search badge */}
			{autoSearching && (
				<div className="gap-1.5 text-xs flex items-center text-foreground/40">
					<Loader2Icon className="size-3 animate-spin" />
					{t("search.playground.debounceInfo")}
				</div>
			)}

			{/* Advanced options */}
			<div>
				<button
					type="button"
					onClick={() => setAdvancedOpen(!advancedOpen)}
					className="gap-1 text-sm font-medium flex items-center text-primary hover:underline"
				>
					{advancedOpen ? (
						<ChevronDownIcon className="size-3.5" />
					) : (
						<ChevronRightIcon className="size-3.5" />
					)}
					{advancedOpen
						? t("search.playground.advancedHide")
						: t("search.playground.advancedShow")}
				</button>

				{advancedOpen && (
					<div className="mt-3 gap-4 sm:grid-cols-2 lg:grid-cols-3 grid grid-cols-1">
						<div className="space-y-1">
							<Label className="text-xs">{t("search.playground.queryBy")}</Label>
							<Input
								value={queryBy}
								onChange={(e) => setQueryBy(e.target.value)}
								placeholder={t("search.playground.queryByPlaceholder")}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">{t("search.playground.filterBy")}</Label>
							<Input
								value={filterBy}
								onChange={(e) => setFilterBy(e.target.value)}
								placeholder={t("search.playground.filterByPlaceholder")}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">{t("search.playground.sortBy")}</Label>
							<Input
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
								placeholder={t("search.playground.sortByPlaceholder")}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">{t("search.preview.perPage")}</Label>
							<Input
								type="number"
								min={1}
								max={100}
								value={perPage}
								onChange={(e) => setPerPage(Number(e.target.value) || 20)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">{t("search.preview.page")}</Label>
							<Input
								type="number"
								min={1}
								value={page}
								onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">{t("search.preview.highlightFields")}</Label>
							<Input
								value={highlightFields}
								onChange={(e) => setHighlightFields(e.target.value)}
								placeholder={t("search.preview.highlightFieldsPlaceholder")}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">{t("search.preview.facetBy")}</Label>
							<Input
								value={facetBy}
								onChange={(e) => setFacetBy(e.target.value)}
								placeholder={t("search.preview.facetByPlaceholder")}
							/>
						</div>
					</div>
				)}
			</div>

			{/* Results area */}
			{error && (
				<div className="rounded border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-500 border">
					{error}
				</div>
			)}

			{result && (
				<div className="space-y-3">
					{/* Stats bar */}
					<div className="gap-4 text-sm flex items-center text-foreground/60">
						<span>
							{t("search.preview.stats", {
								found: result.found,
								time: result.searchTimeMs,
							})}
						</span>
					</div>

					{/* Result sub-tabs */}
					<Tabs value={resultTab} onValueChange={(v) => setResultTab(v as ResultTab)}>
						<TabsList>
							<TabsTrigger value="hits">
								{t("search.playground.hits")} ({result.hits.length})
							</TabsTrigger>
							<TabsTrigger value="facets" disabled={!result.facetCounts?.length}>
								{t("search.playground.facets")}
							</TabsTrigger>
							<TabsTrigger value="rawJson">
								{t("search.playground.rawJson")}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="hits">
							{result.hits.length === 0 ? (
								<div className="p-6 text-center text-foreground/60">
									{t("search.playground.noDocuments")}
								</div>
							) : (
								<div className="space-y-2 max-h-[500px] overflow-y-auto">
									{(result.hits as Record<string, unknown>[]).map((hit, i) => (
										<HitCard
											key={(hit.id as string) ?? i}
											hit={hit}
											index={i}
										/>
									))}
								</div>
							)}
						</TabsContent>

						<TabsContent value="facets">
							{result.facetCounts?.length ? (
								<div className="space-y-4 max-h-[500px] overflow-y-auto">
									{result.facetCounts.map((facet) => (
										<div key={facet.fieldName}>
											<h4 className="mb-2 text-sm font-semibold capitalize">
												{facet.fieldName}
											</h4>
											<div className="gap-1.5 flex flex-wrap">
												{facet.counts.map((c) => (
													<Badge key={c.value} status="info">
														{c.value} ({c.count})
													</Badge>
												))}
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="p-6 text-center text-foreground/60">
									{t("search.playground.noDocuments")}
								</div>
							)}
						</TabsContent>

						<TabsContent value="rawJson">
							<div className="space-y-2">
								<div className="flex justify-end">
									<Button variant="ghost" size="sm" onClick={handleCopyJson}>
										<CopyIcon className="size-3" />
										{t("search.playground.copy")}
									</Button>
								</div>
								<pre className="max-h-96 rounded p-4 font-mono text-xs overflow-auto border bg-muted break-all whitespace-pre-wrap">
									{JSON.stringify(result, null, 2)}
								</pre>
							</div>
						</TabsContent>
					</Tabs>

					{/* Curl snippet */}
					<Card className="space-y-2 p-4">
						<div className="gap-2 flex items-center">
							<TerminalIcon className="size-4 text-foreground/40" />
							<span className="text-sm font-medium">
								{t("search.playground.curlTitle")}
							</span>
						</div>
						<pre className="rounded p-3 font-mono text-xs overflow-x-auto bg-muted break-all whitespace-pre-wrap">
							{buildCurl(selectedSlug, query, {
								queryBy,
								filterBy,
								sortBy,
								perPage,
								page,
								highlightFields,
								facetBy,
							})}
						</pre>
						<div className="flex justify-end">
							<Button variant="ghost" size="sm" onClick={handleCopyCurl}>
								<CopyIcon className="size-3" />
								{t("search.playground.copy")}
							</Button>
						</div>
					</Card>
				</div>
			)}

			{!result && !error && !autoSearching && (
				<div className="rounded p-6 border border-dashed text-center text-foreground/60">
					{t("search.preview.noResults")}
				</div>
			)}
		</div>
	);
}
