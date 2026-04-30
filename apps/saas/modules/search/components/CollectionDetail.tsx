"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Activity, ChevronLeftIcon, Code2, Database, Key, Layers, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

// ── Lazy imports ─────────────────────────────────────────────────

const DocumentsTable = dynamic(() => import("./DocumentsTable").then((mod) => mod.DocumentsTable), {
	ssr: false,
});

// ── Types ───────────────────────────────────────────────────────

type TabId = "overview" | "schema" | "documents" | "api" | "settings";

interface TabConfig {
	id: TabId;
	label: string;
	icon: React.ReactNode;
}

// ── Activity icon helper ────────────────────────────────────────

function ActivityIcon({ kind }: { kind: string }) {
	switch (kind) {
		case "index_created":
			return <Database className="size-4 text-primary" />;
		case "api_key_created":
			return <Key className="size-4 text-primary" />;
		case "sync_job":
			return <Activity className="size-4 text-foreground/60" />;
		default:
			return <Activity className="size-4 text-muted-foreground" />;
	}
}

// ── Main Component ───────────────────────────────────────────────

export function CollectionDetail() {
	const t = useTranslations("search");
	const params = useParams<{ organizationSlug: string; indexSlug: string }>();
	const { activeOrganization } = useActiveOrganization();

	const orgSlug = params.organizationSlug;
	const indexSlug = params.indexSlug;
	const orgId = activeOrganization?.id;

	const [activeTab, setActiveTab] = useState<TabId>("overview");
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

	// ── Fetch indexes ──────────────────────────────────────────────

	const { data: indexes, isLoading: indexesLoading } = useQuery(
		orpc.search.listIndexes.queryOptions({
			input: { organizationId: orgId ?? "" },
			enabled: Boolean(orgId),
		}),
	);

	const index = indexes?.find((idx) => idx.slug === indexSlug);

	// ── Fetch schema (for doc count + fields) ──────────────────────

	const { data: schemaData, isLoading: schemaLoading } = useQuery(
		orpc.search.schema.get.queryOptions({
			input: { organizationId: orgId ?? "", slug: indexSlug ?? "" },
			enabled: Boolean(orgId) && Boolean(indexSlug),
		}),
	);

	const schemaFields = schemaData?.fields ?? [];
	const numDocuments = schemaData?.numDocuments ?? 0;
	const defaultSortingField = schemaData?.defaultSortingField ?? null;

	// ── Fetch recent activity ──────────────────────────────────────

	const { data: activityData } = useQuery(
		orpc.search.recentActivity.queryOptions({
			input: { organizationId: orgId ?? "", limit: 10 },
			enabled: Boolean(orgId),
		}),
	);

	const recentActivities =
		activityData?.activities?.filter((a) => a.indexSlug === indexSlug) ?? [];

	// ── Fetch API keys (for API tab) ───────────────────────────────

	const { data: apiKeys } = useQuery(
		orpc.search.listApiKeys.queryOptions({
			input: { organizationId: orgId ?? "", slug: indexSlug ?? "" },
			enabled: Boolean(orgId) && Boolean(indexSlug) && activeTab === "api",
		}),
	);

	const firstApiKey = apiKeys?.[0];
	const maskedKey = firstApiKey
		? `${firstApiKey.prefix}...${firstApiKey.name?.slice(0, 4) ?? "KEY"}`
		: "ss_sea...KEY";
	const saasUrl = process.env.NEXT_PUBLIC_SAAS_URL ?? "https://app.example.com";

	// ── Delete mutation (no backend endpoint yet) ──────────────────

	// const deleteMutation = useMutation({
	//   ...orpc.search.deleteIndex.mutationOptions(),
	//   onSuccess: () => {
	//     toastSuccess(t("collection.deleted"));
	//     void queryClient.invalidateQueries({
	//       queryKey: orpc.search.listIndexes.key(),
	//     });
	//   },
	// });

	// ── Early returns ──────────────────────────────────────────────

	if (!orgSlug || !indexSlug) return null;

	if (indexesLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-10 w-full" />
				<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid grid-cols-1">
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
				</div>
			</div>
		);
	}

	if (!index) {
		return (
			<div className="gap-4 py-20 flex flex-col items-center justify-center">
				<Database className="size-12 text-muted-foreground" />
				<h2 className="font-semibold text-lg">{t("collection.notFound")}</h2>
				<Link href={`/${orgSlug}/search`} className="text-sm text-primary hover:underline">
					{t("collection.backToIndexes")}
				</Link>
			</div>
		);
	}

	// ── Tab configuration ─────────────────────────────────────────

	const tabs: TabConfig[] = [
		{
			id: "overview",
			label: t("collection.tab.overview"),
			icon: <Database className="size-4" />,
		},
		{
			id: "schema",
			label: t("collection.tab.schema"),
			icon: <Layers className="size-4" />,
		},
		{
			id: "documents",
			label: t("collection.tab.documents"),
			icon: <Database className="size-4" />,
		},
		{
			id: "api",
			label: t("collection.tab.api"),
			icon: <Code2 className="size-4" />,
		},
		{
			id: "settings",
			label: t("collection.tab.settings"),
			icon: <Settings className="size-4" />,
		},
	];

	// ── Helper: code snippets ─────────────────────────────────────

	const curlExample = `curl -X POST "${saasUrl}/api/search/public" \\
  -H "Authorization: Bearer ${maskedKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "q": "query",
    "query_by": "title,description",
    "collection": "${index.slug}",
    "per_page": 20
  }'`;

	const jsExample = `const response = await fetch("${saasUrl}/api/search/public", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${maskedKey}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    q: "query",
    query_by: "title,description",
    collection: "${index.slug}",
    per_page: 20,
  }),
});
const data = await response.json();`;

	const pythonExample = `import requests

response = requests.post(
    "${saasUrl}/api/search/public",
    headers={
        "Authorization": "Bearer ${maskedKey}",
        "Content-Type": "application/json",
    },
    json={
        "q": "query",
        "query_by": "title,description",
        "collection": "${index.slug}",
        "per_page": 20,
    },
)
data = response.json()`;

	const phpExample = `$client = new \\GuzzleHttp\\Client();
$response = $client->post("${saasUrl}/api/search/public", [
    "headers" => [
        "Authorization" => "Bearer ${maskedKey}",
        "Content-Type" => "application/json",
    ],
    "json" => [
        "q" => "query",
        "query_by" => "title,description",
        "collection" => "${index.slug}",
        "per_page" => 20,
    ],
]);
$data = json_decode($response->getBody(), true);`;

	// ── Render ────────────────────────────────────────────────────

	return (
		<div className="space-y-6">
			{/* Back + header */}
			<div className="gap-4 flex items-start">
				<Link
					href={`/${orgSlug}/search`}
					className="mt-1 text-muted-foreground hover:text-foreground"
				>
					<ChevronLeftIcon className="size-5" />
				</Link>
				<div className="min-w-0 flex-1">
					<div className="gap-2 flex flex-wrap items-center">
						<h1 className="font-bold text-2xl tracking-tight truncate">
							{index.displayName ?? index.slug}
						</h1>
						<Badge status={index.enabled ? "success" : "warning"}>
							{index.enabled ? "Enabled" : "Disabled"}
						</Badge>
					</div>
					<p className="text-sm mt-1 text-muted-foreground">
						<span className="font-mono">{index.slug}</span>
						{" \u00B7 "}
						{t("collection.version")}: v{index.version}
					</p>
				</div>
			</div>

			{/* Tab navigation */}
			<div className="gap-1 flex flex-wrap border-b">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => setActiveTab(tab.id)}
						className={`gap-2 px-4 py-2.5 text-sm font-medium inline-flex items-center border-b-2 transition-colors ${
							activeTab === tab.id
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						{tab.icon}
						{tab.label}
					</button>
				))}
			</div>

			{/* ── Tab: Overview ─────────────────────────────────────── */}

			{activeTab === "overview" && (
				<div className="space-y-6">
					{/* Stats row */}
					<div className="gap-4 md:grid-cols-4 grid grid-cols-2">
						<StatCard
							label={t("collection.documentsTotal")}
							value={schemaLoading ? "\u2014" : numDocuments.toLocaleString()}
						/>
						<StatCard label={t("collection.version")} value={`v${index.version}`} />
						<StatCard
							label={t("collection.apiKeysCount")}
							value={String(index.apiKeysCount ?? 0)}
						/>
						<StatCard
							label={t("collection.created")}
							value={new Date(index.createdAt).toLocaleDateString()}
						/>
					</div>

					{/* Schema summary + Index meta */}
					<div className="gap-6 md:grid-cols-2 grid grid-cols-1">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("collection.schemaOverview")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								{schemaLoading ? (
									<div className="space-y-2">
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-3/4" />
										<Skeleton className="h-4 w-1/2" />
									</div>
								) : schemaFields.length === 0 ? (
									<p className="text-muted-foreground">
										{t("collection.noSchema")}
									</p>
								) : (
									<>
										<p className="text-muted-foreground">
											{schemaFields.length} {t("collection.fields")}
											{defaultSortingField
												? ` \u00B7 Default sort: ${defaultSortingField}`
												: ""}
										</p>
										<div className="space-y-1">
											{schemaFields.slice(0, 8).map((field) => (
												<div
													key={field.name}
													className="gap-2 flex items-center justify-between"
												>
													<span className="font-mono text-xs truncate">
														{field.name}
													</span>
													<div className="gap-1.5 flex shrink-0 items-center">
														<Badge status="info">{field.type}</Badge>
														{field.facet && (
															<span className="text-xs text-muted-foreground">
																facet
															</span>
														)}
														{field.sort && (
															<span className="text-xs text-muted-foreground">
																sort
															</span>
														)}
													</div>
												</div>
											))}
										</div>
										{schemaFields.length > 8 && (
											<button
												type="button"
												className="text-xs text-primary hover:underline"
												onClick={() => setActiveTab("schema")}
											>
												{t("collection.viewAllFields", {
													count: schemaFields.length,
												})}
											</button>
										)}
									</>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("collection.recentActivity")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4 text-sm">
								{recentActivities.length === 0 ? (
									<p className="text-muted-foreground">
										{t("collection.noActivity")}
									</p>
								) : (
									recentActivities.map((activity) => (
										<div key={activity.id} className="gap-3 flex items-start">
											<div className="mt-0.5">
												<ActivityIcon kind={activity.kind} />
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-sm truncate">
													{activity.description}
												</p>
												<p className="text-xs text-muted-foreground">
													{formatDistanceToNow(
														new Date(activity.createdAt),
														{ addSuffix: true },
													)}
												</p>
											</div>
										</div>
									))
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			)}

			{/* ── Tab: Schema ───────────────────────────────────────── */}

			{activeTab === "schema" && (
				<>
					{schemaLoading ? (
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-32" />
								<Skeleton className="h-4 w-48" />
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									<Skeleton className="h-8 w-full" />
									<Skeleton className="h-8 w-full" />
									<Skeleton className="h-8 w-full" />
								</div>
							</CardContent>
						</Card>
					) : (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("collection.schemaFields")}
								</CardTitle>
								<CardDescription>
									{index.slug} &mdash; {schemaFields.length}{" "}
									{t("collection.fields")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								{schemaFields.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										{t("collection.noSchema")}
									</p>
								) : (
									<div className="overflow-x-auto">
										<table className="text-sm w-full">
											<thead>
												<tr className="border-b text-left text-muted-foreground">
													<th className="pb-2 pr-4 font-medium">
														{t("collection.fieldName")}
													</th>
													<th className="pb-2 pr-4 font-medium">
														{t("collection.fieldType")}
													</th>
													<th className="pb-2 pr-4 font-medium">Facet</th>
													<th className="pb-2 pr-4 font-medium">Sort</th>
													<th className="pb-2 pr-4 font-medium">Index</th>
													<th className="pb-2 font-medium">Optional</th>
												</tr>
											</thead>
											<tbody>
												{schemaFields.map((field) => (
													<tr
														key={field.name}
														className="border-b last:border-0"
													>
														<td className="py-2 pr-4 font-mono text-xs">
															{field.name}
														</td>
														<td className="py-2 pr-4">
															<Badge status="info">
																{field.type}
															</Badge>
														</td>
														<td className="py-2 pr-4">
															{field.facet ? "\u2713" : "\u2014"}
														</td>
														<td className="py-2 pr-4">
															{field.sort ? "\u2713" : "\u2014"}
														</td>
														<td className="py-2 pr-4">
															{field.index ? "\u2713" : "\u2014"}
														</td>
														<td className="py-2">
															{field.optional ? "\u2713" : "\u2014"}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
								{/* Schema Editor feature placeholder */}
								<div className="mt-6 pt-6 border-t">
									<p className="text-sm font-medium text-muted-foreground">
										Schema Editor coming soon
									</p>
									<p className="text-xs mt-1 text-muted-foreground/60">
										A visual schema editor will allow you to add, remove, and
										reorder fields, configure faceting and sorting, and set
										default sort fields from an intuitive interface.
									</p>
								</div>
							</CardContent>
						</Card>
					)}
				</>
			)}

			{/* ── Tab: Documents ────────────────────────────────────── */}

			{activeTab === "documents" && (
				<div className="space-y-4">
					{orgId && indexSlug ? (
						<DocumentsTable
							organizationId={orgId}
							slug={indexSlug}
							fields={schemaFields}
						/>
					) : (
						<Card>
							<CardContent className="py-12 flex flex-col items-center justify-center">
								<Database className="size-10 mb-4 text-muted-foreground" />
								<p className="font-medium">{t("collection.noDocuments")}</p>
							</CardContent>
						</Card>
					)}
					{/* Fallback when DocumentsTable doesn't render */}
					{/* DocumentsTable is always available; if it were not it would show an empty Card */}
				</div>
			)}

			{/* ── Tab: API ──────────────────────────────────────────── */}

			{activeTab === "api" && (
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="gap-2 text-base flex items-center">
								<Code2 className="size-4" />
								{t("collection.apiExamples")}
							</CardTitle>
							<CardDescription>{t("collection.useApiKeys")}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{apiKeys?.length === 0 && (
								<p className="text-sm text-muted-foreground">
									No API keys found. Create one to use these examples.
								</p>
							)}
							<CodeBlock label="cURL" code={curlExample} />
							<CodeBlock label="JavaScript (fetch)" code={jsExample} />
							<CodeBlock label="Python" code={pythonExample} />
							<CodeBlock label="PHP" code={phpExample} />
						</CardContent>
					</Card>
				</div>
			)}

			{/* ── Tab: Settings ────────────────────────────────────── */}

			{activeTab === "settings" && (
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="gap-2 text-base flex items-center">
								<Settings className="size-4" />
								{t("collection.settings")}
							</CardTitle>
							<CardDescription>{t("collection.manageSettings")}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4 text-sm">
							<MetaRow
								label={t("collection.displayName")}
								value={index.displayName ?? index.slug}
							/>
							<MetaRow label={t("collection.slug")} value={index.slug} mono />
							<MetaRow label={t("collection.version")} value={`v${index.version}`} />
							<MetaRow
								label={t("collection.defaultSortingField")}
								value={defaultSortingField ?? "\u2014"}
								mono
							/>
							<MetaRow
								label={t("collection.enabled")}
								value={index.enabled ? "Yes" : "No"}
							/>
							<MetaRow
								label={t("collection.created")}
								value={new Date(index.createdAt).toLocaleString()}
							/>
							<MetaRow
								label={t("collection.updatedAt")}
								value={new Date(index.updatedAt).toLocaleString()}
							/>
						</CardContent>
					</Card>

					{/* Danger zone */}
					<Card className="border-destructive/50">
						<CardHeader>
							<CardTitle className="text-base text-destructive">
								{t("collection.dangerZone")}
							</CardTitle>
							<CardDescription>{t("collection.dangerZoneDesc")}</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm mb-4 text-muted-foreground">
								{t("collection.deleteWarning")}
							</p>
							<Button
								variant="destructive"
								onClick={() => setDeleteConfirmOpen(true)}
							>
								{t("collection.deleteCollection")}
							</Button>
						</CardContent>
					</Card>

					{/* Delete confirmation dialog */}
					{deleteConfirmOpen && (
						<div className="inset-0 backdrop-blur-sm fixed z-50 flex items-center justify-center bg-background/80">
							<Card className="mx-4 max-w-md w-full">
								<CardHeader>
									<CardTitle className="text-destructive">
										{t("collection.confirmDelete")}
									</CardTitle>
									<CardDescription>
										{t("collection.confirmDeleteDesc")}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<p className="text-sm">
										{t("collection.confirmDeleteMessage", {
											name: index.displayName ?? index.slug,
										})}
									</p>
								</CardContent>
								<CardFooter className="gap-2 justify-end">
									<Button
										variant="outline"
										onClick={() => setDeleteConfirmOpen(false)}
									>
										{t("collection.cancel")}
									</Button>
									<Button
										variant="destructive"
										onClick={() => {
											setDeleteConfirmOpen(false);
											// No backend endpoint yet — show a toast or navigate
											// toastSuccess(t("collection.deleted"));
										}}
									>
										{t("collection.delete")}
									</Button>
								</CardFooter>
							</Card>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<Card>
			<CardContent className="pt-6">
				<p className="text-sm text-muted-foreground">{label}</p>
				<p className="font-semibold text-2xl mt-1 tabular-nums">{value}</p>
			</CardContent>
		</Card>
	);
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
	return (
		<div className="gap-2 flex items-center justify-between">
			<span className="text-muted-foreground">{label}</span>
			<span className={`font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>
				{value}
			</span>
		</div>
	);
}

function CodeBlock({ label, code }: { label: string; code: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="space-y-2">
			<p className="font-medium text-xs text-muted-foreground">{label}</p>
			<div className="relative">
				<pre className="p-4 text-xs overflow-x-auto rounded-lg bg-muted">
					<code>{code}</code>
				</pre>
				<button
					type="button"
					onClick={handleCopy}
					className="top-2 right-2 px-2 py-1 text-xs absolute rounded-md bg-foreground/10 transition-colors hover:bg-foreground/20"
				>
					{copied ? "Copied!" : "Copy"}
				</button>
			</div>
		</div>
	);
}
