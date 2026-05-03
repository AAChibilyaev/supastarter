     1|"use client";
     2|
     3|import { Badge } from "@repo/ui/components/badge";
     4|import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
     5|import {
     6|	Select,
     7|	SelectContent,
     8|	SelectItem,
     9|	SelectTrigger,
    10|	SelectValue,
    11|} from "@repo/ui/components/select";
    12|import {
    13|	Table,
    14|	TableBody,
    15|	TableCell,
    16|	TableHead,
    17|	TableHeader,
    18|	TableRow,
    19|} from "@repo/ui/components/table";
    20|import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
    21|import { StatsTile } from "@shared/components/StatsTile";
    22|import { StatsTileChart } from "@shared/components/StatsTileChart";
    23|import { orpc } from "@shared/lib/orpc-query-utils";
    24|import { useQuery } from "@tanstack/react-query";
    25|import { BarChart3Icon, SearchIcon, InfoIcon } from "lucide-react";
    26|import { useTranslations } from "next-intl";
    27|import { useFormatter } from "next-intl";
    28|import { useSearchParams, useRouter, usePathname } from "next/navigation";
    29|import { useMemo, useState } from "react";
    30|
    31|import { ActivityLog } from "./ActivityLog";
    32|import { EmptyState } from "./EmptyState";
    33|import { FailedQueriesTable } from "./FailedQueriesTable";
    34|
    35|type PeriodKey = "24h" | "7d" | "30d";
    36|
    37|const PERIOD_DAYS: Record<PeriodKey, number> = {
    38|	"24h": 1,
    39|	"7d": 7,
    40|	"30d": 30,
    41|};
    42|
    43|const PERIOD_API: Record<PeriodKey, "last7" | "last30"> = {
    44|	"24h": "last7",
    45|	"7d": "last7",
    46|	"30d": "last30",
    47|};
    48|
    49|const FREE_RETENTION_DAYS = 7;
    50|
    51|type AnalyticsTab = "dashboard" | "failed" | "activity" | "top-queries";
    52|
    53|interface SearchAnalyticsCardsProps {
    54|	organizationId: string;
    55|	initialTab?: string;
    56|}
    57|
    58|export function SearchAnalyticsCards({ organizationId, initialTab }: SearchAnalyticsCardsProps) {
    59|	const t = useTranslations();
    60|	const format = useFormatter();
    61|	const searchParams = useSearchParams();
    62|	const router = useRouter();
    63|	const pathname = usePathname();
    64|	const [period, setPeriod] = useState<PeriodKey>("7d");
    65|	const [selectedIndexId, setSelectedIndexId] = useState<string>("");
    66|
    67|	// Sync active tab with URL search params so sidebar nav links work.
    68|	const urlTab = searchParams.get("tab") || initialTab || "dashboard";
    69|	const validTabs: AnalyticsTab[] = ["dashboard", "failed", "activity", "top-queries"];
    70|	const [activeTab, setActiveTabState] = useState<AnalyticsTab>(
    71|		validTabs.includes(urlTab as AnalyticsTab) ? (urlTab as AnalyticsTab) : "dashboard",
    72|	);
    73|
    74|	const setActiveTab = (tab: AnalyticsTab) => {
    75|		setActiveTabState(tab);
    76|		// Build new URL search params
    77|		const params = new URLSearchParams(searchParams.toString());
    78|		if (tab === "dashboard" || tab === "top-queries") {
    79|			params.delete("tab");
    80|		} else {
    81|			params.set("tab", tab);
    82|		}
    83|		const qs = params.toString();
    84|		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    85|	};
    86|
    87|	const days = PERIOD_DAYS[period];
    88|
    89|	// ── Data queries ──────────────────────────────────────────────────
    90|
    91|	// Fetch indexes for the filter dropdown
    92|	const { data: indexes = [] } = useQuery(
    93|		orpc.search.listIndexes.queryOptions({
    94|			input: { organizationId },
    95|			enabled: !!organizationId,
    96|		}),
    97|	);
    98|
    99|	// indexId filter: empty string = all indexes
   100|	const filterIndexId = selectedIndexId || undefined;
   101|
   102|	const { data: usageData, isLoading: usageLoading } = useQuery(
   103|		orpc.search.usageSummary.queryOptions({
   104|			input: { organizationId, period: PERIOD_API[period], indexId: filterIndexId },
   105|			enabled: !!organizationId,
   106|		}),
   107|	);
   108|
   109|	const { data: analyticsData, isLoading: analyticsLoading } = useQuery(
   110|		orpc.search.analytics.queryOptions({
   111|			input: { organizationId, period: PERIOD_API[period], indexId: filterIndexId },
   112|			enabled: !!organizationId,
   113|		}),
   114|	);
   115|
   116|	const { data: topQueriesData, isLoading: topQueriesLoading } = useQuery(
   117|		orpc.search.topQueries.queryOptions({
   118|			input: { organizationId, days, limit: 10, indexId: filterIndexId },
   119|			enabled: !!organizationId,
   120|		}),
   121|	);
   122|
   123|	const { data: pipelineData, isLoading: pipelineLoading } = useQuery(
   124|		orpc.search.pipelineStatus.queryOptions({
   125|			input: { organizationId },
   126|			enabled: !!organizationId,
   127|		}),
   128|	);
   129|
   130|	const { data: planInfo } = useQuery(
   131|		orpc.entitlements.plan.queryOptions({
   132|			input: { organizationId },
   133|			enabled: !!organizationId,
   134|		}),
   135|	);
   136|
   137|	const isLoading = usageLoading || analyticsLoading || topQueriesLoading || pipelineLoading;
   138|
   139|	const hasNoData = !usageData && !analyticsData && !topQueriesData;
   140|
   141|	// ── KPI derivation ────────────────────────────────────────────────
   142|
   143|	const totalSearches = usageData?.searchesUsed ?? analyticsData?.totalSearches ?? 0;
   144|
   145|	const documentsIndexed = usageData?.documentsIndexed ?? 0;
   146|
   147|	const failedSyncJobs = pipelineData?.failedCount ?? 0;
   148|
   149|	const zeroResultQueries = analyticsData?.zeroResultQueries ?? [];
   150|	const zeroResultCount = zeroResultQueries.length > 0 ? zeroResultQueries[0].count : 0;
   151|	const zeroResultRate = totalSearches > 0 ? zeroResultCount / totalSearches : 0;
   152|	const hasZeroResultData =
   153|		Array.isArray(analyticsData?.zeroResultQueries) &&
   154|		analyticsData!.zeroResultQueries.length > 0;
   155|
   156|	const latencyP50 = analyticsData?.latencyP50 ?? null;
   157|	const latencyP95 = analyticsData?.latencyP95 ?? null;
   158|	const latencyP99 = analyticsData?.latencyP99 ?? null;
   159|	const hasLatencyData = latencyP50 !== null || latencyP95 !== null || latencyP99 !== null;
   160|
   161|	// ── Chart data ────────────────────────────────────────────────────
   162|
   163|	const chartData = useMemo(() => {
   164|		if (!analyticsData?.searchesOverTime) return [];
   165|		return analyticsData.searchesOverTime.map((d: { date: string; count: number }) => ({
   166|			month: d.date,
   167|			searches: d.count,
   168|		}));
   169|	}, [analyticsData]);
   170|
   171|	// ── Trend: compare second half vs first half of the period ────────
   172|
   173|	const trend = useMemo(() => {
   174|		if (!analyticsData?.searchesOverTime || analyticsData.searchesOverTime.length < 4) {
   175|			return undefined;
   176|		}
   177|		const values = analyticsData.searchesOverTime.map((d: { count: number }) => d.count);
   178|		const mid = Math.floor(values.length / 2);
   179|		const firstHalf = values.slice(0, mid).reduce((a: number, b: number) => a + b, 0);
   180|		const secondHalf = values.slice(mid).reduce((a: number, b: number) => a + b, 0);
   181|		if (firstHalf === 0) return secondHalf > 0 ? 1 : undefined;
   182|		return (secondHalf - firstHalf) / firstHalf;
   183|	}, [analyticsData]);
   184|
   185|	// ── Top queries with % of total ───────────────────────────────────
   186|
   187|	const totalQueryCount = useMemo(() => {
   188|		if (!topQueriesData) return 0;
   189|		return topQueriesData.reduce(
   190|			(sum: number, q: { count: number | string }) => sum + Number(q.count),
   191|			0,
   192|		);
   193|	}, [topQueriesData]);
   194|
   195|	// ── Retention banner ──────────────────────────────────────────────
   196|
   197|	const planName = planInfo?.planName ?? t("search.analytics.freePlan");
   198|	const isFreePlan = planName.toLowerCase() === "free";
   199|	const planRetentionDays = isFreePlan ? FREE_RETENTION_DAYS : 30;
   200|	const showRetentionBanner = days > planRetentionDays;
   201|
   202|	// ── Loading state ─────────────────────────────────────────────────
   203|
   204|	if (isLoading) {
   205|		return <div className="py-8 text-center text-foreground/60">{t("search.loading")}</div>;
   206|	}
   207|
   208|	// ── Empty state ───────────────────────────────────────────────────
   209|
   210|	if (hasNoData) {
   211|		return (
   212|			<EmptyState
   213|				title={t("search.analytics.noData")}
   214|				description={t("search.analytics.noDataDescription")}
   215|				icon={BarChart3Icon}
   216|			/>
   217|		);
   218|	}
   219|
   220|	const renderDashboardTab = () => (
   221|		<div className="space-y-6">
   222|				{/* KPI row */}
   223|			<div className="gap-4 md:grid-cols-2 lg:grid-cols-5 grid">
   224|				<StatsTile
   225|					title={t("search.analytics.totalSearches")}
   226|					value={totalSearches}
   227|					valueFormat="number"
   228|					trend={trend}
   229|				/>
   230|
   231|				<StatsTile
   232|					title={t("search.analytics.impressions")}
   233|					value={analyticsData?.impressionsCount ?? 0}
   234|					valueFormat="number"
   235|				/>
   236|
   237|				<StatsTile
   238|					title={t("search.analytics.documentsIndexed")}
   239|					value={documentsIndexed}
   240|					valueFormat="number"
   241|				/>
   242|
   243|				<StatsTile
   244|					title={t("search.analytics.failedSyncJobs")}
   245|					value={failedSyncJobs}
   246|					valueFormat="number"
   247|				>
   248|					{failedSyncJobs > 0 && (
   249|						<Badge status="error" className="text-xs">
   250|							{failedSyncJobs} {t("search.analytics.failed")}
   251|						</Badge>
   252|					)}
   253|				</StatsTile>
   254|
   255|				<StatsTile
   256|					title={t("search.analytics.zeroResultRate")}
   257|					value={hasZeroResultData ? zeroResultRate : 0}
   258|					valueFormat={hasZeroResultData ? "percentage" : "number"}
   259|				>
   260|					{!hasZeroResultData && (
   261|						<Badge status="info" className="text-xs">
   262|							{t("search.analytics.comingSoon")}
   263|						</Badge>
   264|					)}
   265|				</StatsTile>
   266|			</div>
   267|
   268|			{/* Query Performance card */}
   269|			<Card>
   270|				<CardHeader>
   271|					<CardTitle>{t("search.analytics.queryPerformance")}</CardTitle>
   272|				</CardHeader>
   273|				<CardContent>
   274|					{hasLatencyData ? (
   275|						<div className="gap-4 grid grid-cols-3">
   276|							{[
   277|								{ label: t("search.analytics.latencyP50"), value: latencyP50 },
   278|								{ label: t("search.analytics.latencyP95"), value: latencyP95 },
   279|								{ label: t("search.analytics.latencyP99"), value: latencyP99 },
   280|							].map(({ label, value }) => (
   281|								<div key={label} className="gap-1 flex flex-col items-center">
   282|									<span className="text-xs text-muted-foreground">{label}</span>
   283|									<span className="text-2xl font-semibold tabular-nums">
   284|										{value !== null ? value : "—"}
   285|									</span>
   286|									<span className="text-xs text-muted-foreground">ms</span>
   287|								</div>
   288|							))}
   289|						</div>
   290|					) : (
   291|						<p className="text-sm text-muted-foreground">
   292|							{t("search.analytics.noLatencyData")}
   293|						</p>
   294|					)}
   295|				</CardContent>
   296|			</Card>
   297|
   298|			{/* Searches over time chart */}
   299|			{chartData.length > 0 && (
   300|				<Card>
   301|					<CardHeader>
   302|						<CardTitle>{t("search.analytics.searchesOverTime")}</CardTitle>
   303|					</CardHeader>
   304|					<CardContent>
   305|						<StatsTileChart
   306|							data={chartData}
   307|							dataKey="searches"
   308|							gradientId="searchGradient"
   309|							chartConfig={{
   310|								searches: {
   311|									label: t("search.analytics.totalSearches"),
   312|									color: "hsl(var(--chart-1))",
   313|								},
   314|							}}
   315|							tooltipFormatter={(value) => format.number(Number(value))}
   316|						/>
   317|					</CardContent>
   318|				</Card>
   319|			)}
   320|
   321|			{chartData.length === 0 && (
   322|				<Card>
   323|					<CardHeader>
   324|						<CardTitle>{t("search.analytics.searchesOverTime")}</CardTitle>
   325|					</CardHeader>
   326|					<CardContent>
   327|						<EmptyState
   328|							title={t("search.analytics.noData")}
   329|							description={t("search.analytics.noDataDescription")}
   330|							icon={BarChart3Icon}
   331|						/>
   332|					</CardContent>
   333|				</Card>
   334|			)}
   335|
   336|			{/* Top 10 queries table */}
   337|			<Card>
   338|				<CardHeader>
   339|					<CardTitle>{t("search.analytics.topQueries")}</CardTitle>
   340|				</CardHeader>
   341|				<CardContent>
   342|					{topQueriesData && topQueriesData.length > 0 ? (
   343|						<Table>
   344|							<TableHeader>
   345|								<TableRow>
   346|									<TableHead className="w-12">
   347|										{t("search.analytics.rankColumn")}
   348|									</TableHead>
   349|									<TableHead>{t("search.analytics.queryColumn")}</TableHead>
   350|									<TableHead className="text-right">
   351|										{t("search.analytics.countColumn")}
   352|									</TableHead>
   353|									<TableHead className="text-right">
   354|										{t("search.analytics.percentColumn")}
   355|									</TableHead>
   356|								</TableRow>
   357|							</TableHeader>
   358|							<TableBody>
   359|								{topQueriesData.map(
   360|									(
   361|										row: { query: string; count: number | string },
   362|										index: number,
   363|									) => {
   364|										const count = Number(row.count);
   365|										const percent =
   366|											totalQueryCount > 0
   367|												? ((count / totalQueryCount) * 100).toFixed(1)
   368|												: "0.0";
   369|										return (
   370|											<TableRow key={row.query}>
   371|												<TableCell className="text-xs text-muted-foreground">
   372|													{index + 1}
   373|												</TableCell>
   374|												<TableCell className="font-mono text-sm">
   375|													{row.query}
   376|												</TableCell>
   377|												<TableCell className="text-right tabular-nums">
   378|													{format.number(count)}
   379|												</TableCell>
   380|												<TableCell className="text-xs text-right text-muted-foreground tabular-nums">
   381|													{percent}%
   382|												</TableCell>
   383|											</TableRow>
   384|										);
   385|									},
   386|								)}
   387|							</TableBody>
   388|						</Table>
   389|					) : (
   390|						<EmptyState
   391|							title={t("search.analytics.noData")}
   392|							description={t("search.analytics.noDataDescription")}
   393|							icon={SearchIcon}
   394|						/>
   395|					)}
   396|				</CardContent>
   397|			</Card>
   398|
   399|			{/* Failed Queries table */}
   400|			<FailedQueriesTable
   401|				zeroResultQueries={zeroResultQueries}
   402|				totalSearches={totalSearches}
   403|			/>
   404|		</div>
   405|	);
   406|
   407|	const renderFailedTab = () => (
   408|		<div className="space-y-6">
   409|			<FailedQueriesTable
   410|				zeroResultQueries={zeroResultQueries}
   411|				totalSearches={totalSearches}
   412|			/>
   413|
   414|			{/* Summary stats for failed queries */}
   415|			<Card>
   416|				<CardHeader>
   417|					<CardTitle>{t("search.analytics.failedQueries")}</CardTitle>
   418|				</CardHeader>
   419|				<CardContent>
   420|					<div className="gap-4 md:grid-cols-3 grid">
   421|						<StatsTile
   422|							title={t("search.analytics.totalFailedQueries")}
   423|							value={
   424|								hasZeroResultData
   425|									? zeroResultQueries.reduce(
   426|											(sum: number, q: { count: number }) =>
   427|												sum + (q.count ?? 0),
   428|											0,
   429|										)
   430|									: 0
   431|							}
   432|							valueFormat="number"
   433|						/>
   434|						<StatsTile
   435|							title={t("search.analytics.zeroResultRate")}
   436|							value={hasZeroResultData ? zeroResultRate : 0}
   437|							valueFormat={hasZeroResultData ? "percentage" : "number"}
   438|						/>
   439|						<StatsTile
   440|							title={t("search.analytics.uniqueFailedQueries")}
   441|							value={zeroResultQueries.length}
   442|							valueFormat="number"
   443|						/>
   444|					</div>
   445|				</CardContent>
   446|			</Card>
   447|		</div>
   448|	);
   449|
   450|	const renderActivityTab = () => <ActivityLog organizationId={organizationId} limit={50} />;
   451|
   452|	return (
   453|		<div className="space-y-6">
   454|			{/* Controls row: tabs + index filter + period switch */}
   455|			<div className="flex items-center justify-between">
   456|				<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnalyticsTab)}>
   457|					<TabsList>
   458|						<TabsTrigger value="dashboard">
   459|							{t("search.analytics.tabDashboard")}
   460|						</TabsTrigger>
   461|						<TabsTrigger value="failed">{t("search.analytics.tabFailed")}</TabsTrigger>
   462|						<TabsTrigger value="activity">
   463|							{t("search.analytics.tabActivity")}
   464|						</TabsTrigger>
   465|					</TabsList>
   466|				</Tabs>
   467|
   468|				<div className="gap-2 flex items-center">
   469|					{/* Index filter dropdown */}
   470|					{indexes.length > 0 && (
   471|						<Select value={selectedIndexId} onValueChange={setSelectedIndexId}>
   472|							<SelectTrigger className="w-48">
   473|								<SelectValue placeholder={t("search.analytics.allIndexes")} />
   474|							</SelectTrigger>
   475|							<SelectContent>
   476|								<SelectItem value="">{t("search.analytics.allIndexes")}</SelectItem>
   477|								{indexes.map((idx) => (
   478|									<SelectItem key={idx.id} value={idx.id}>
   479|										{idx.displayName}
   480|									</SelectItem>
   481|								))}
   482|							</SelectContent>
   483|						</Select>
   484|					)}
   485|
   486|					<Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
   487|						<TabsList>
   488|							<TabsTrigger value="24h">{t("search.analytics.period24h")}</TabsTrigger>
   489|							<TabsTrigger value="7d">{t("search.analytics.period7d")}</TabsTrigger>
   490|							<TabsTrigger value="30d">{t("search.analytics.period30d")}</TabsTrigger>
   491|						</TabsList>
   492|					</Tabs>
   493|				</div>
   494|			</div>
   495|
   496|			{/* Retention banner */}
   497|			{showRetentionBanner && (
   498|				<Card className="border-l-4 border-l-foreground/20">
   499|					<CardContent className="gap-3 pt-6 flex items-center">
   500|						<InfoIcon className="size-5 shrink-0 text-foreground/60" />
   501|