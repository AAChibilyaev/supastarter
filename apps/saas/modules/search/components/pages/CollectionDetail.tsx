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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
	Activity,
	ChevronLeftIcon,
	Code2,
	Database,
	DownloadIcon,
	Key,
	Layers,
	PlusIcon,
	Settings,
	Trash2Icon,
	UploadIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

// Local mirror of SearchFieldInput from @repo/api/modules/search/types
type FieldType =
	| "string"
	| "int32"
	| "int64"
	| "float"
	| "bool"
	| "string[]"
	| "int32[]"
	| "int64[]"
	| "float[]"
	| "bool[]"
	| "object"
	| "object[]"
	| "auto";

interface SchemaField {
	name: string;
	type: FieldType;
	facet?: boolean;
	optional?: boolean;
	index?: boolean;
	sort?: boolean;
}

import { DocumentsTable } from "../tables/DocumentsTable";

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
	const router = useRouter();
	const queryClient = useQueryClient();
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

	// ── Delete mutation ────────────────────────────────────────────

	const deleteMutation = useMutation(
		orpc.search.deleteIndex.mutationOptions({
			onSuccess: async () => {
				toastSuccess(t("collection.deleted"));
				await queryClient.invalidateQueries({
					queryKey: orpc.search.listIndexes.key(),
				});
				router.push(`/${orgSlug}/search`);
			},
			onError: () => {
				toastError(t("collection.deleteError"));
			},
		}),
	);

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
							{index.enabled
								? t("collection.statusEnabled")
								: t("collection.statusDisabled")}
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

			{/* ── Tab: Schema ─────────────────────────────────────── */}

			{activeTab === "schema" && orgId && indexSlug && (
				<SchemaEditor
					organizationId={orgId}
					slug={indexSlug}
					schemaLoading={schemaLoading}
					schemaFields={schemaFields as SchemaField[]}
					defaultSortingField={defaultSortingField}
				/>
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
									{t("collection.noApiKeys")}
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
								value={
									index.enabled
										? t("collection.statusEnabled")
										: t("collection.statusDisabled")
								}
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
										disabled={deleteMutation.isPending}
										onClick={() => {
											setDeleteConfirmOpen(false);
											if (!orgId) return;
											deleteMutation.mutate({
												organizationId: orgId,
												slug: index.slug,
											});
										}}
									>
										{deleteMutation.isPending ? t("loading") : t("collection.delete")}
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
					{copied ? "✓" : "⧉"}
				</button>
			</div>
		</div>
	);
}

// ── SchemaEditor ──────────────────────────────────────────────────

const FIELD_TYPES: FieldType[] = [
	"string",
	"int32",
	"int64",
	"float",
	"bool",
	"string[]",
	"int32[]",
	"int64[]",
	"float[]",
	"bool[]",
	"object",
	"object[]",
	"auto",
];

function SchemaEditor({
	organizationId,
	slug,
	schemaLoading,
	schemaFields,
	defaultSortingField,
}: {
	organizationId: string;
	slug: string;
	schemaLoading: boolean;
	schemaFields: SchemaField[];
	defaultSortingField: string | null;
}) {
	const t = useTranslations("search.collection.schemaEditor");
	const tColl = useTranslations("search.collection");
	const queryClient = useQueryClient();

	const [draft, setDraft] = useState<SchemaField[]>([]);
	const [defaultSort, setDefaultSort] = useState<string>("");
	const [initialized, setInitialized] = useState(false);

	const [importOpen, setImportOpen] = useState(false);
	const [importJson, setImportJson] = useState("");
	const [diffOpen, setDiffOpen] = useState(false);

	if (!initialized && (schemaFields.length > 0 || !schemaLoading)) {
		setDraft(schemaFields.map((f) => ({ ...f })));
		setDefaultSort(defaultSortingField ?? "");
		setInitialized(true);
	}

	const mutation = useMutation(
		orpc.search.schema.update.mutationOptions({
			onSuccess: () => {
				toastSuccess(t("saved"));
				void queryClient.invalidateQueries({
					queryKey: orpc.search.schema.get.key(),
				});
			},
			onError: () => toastError(t("saveError")),
		}),
	);

	const handleAddField = () => {
		setDraft((prev) => [...prev, { name: "", type: "string" as FieldType }]);
	};

	const handleRemove = (idx: number) => {
		setDraft((prev) => prev.filter((_, i) => i !== idx));
	};

	const handleChange = (idx: number, patch: Partial<SchemaField>) => {
		setDraft((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
	};

	const handleSave = (triggerReindex: boolean) => {
		const validFields = draft.filter((f) => f.name.trim());
		mutation.mutate({
			organizationId,
			slug,
			fields: validFields,
			defaultSortingField: defaultSort || undefined,
			triggerReindex,
		});
	};

	const handleExport = async () => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
			toastSuccess(t("exported"));
		} catch {
			toastError(t("exportError"));
		}
	};

	const handleImport = () => {
		try {
			const parsed = JSON.parse(importJson) as unknown;
			if (!Array.isArray(parsed)) {
				toastError(t("importMustBeArray"));
				return;
			}
			setDraft(parsed as SchemaField[]);
			setImportOpen(false);
			setImportJson("");
		} catch {
			toastError(t("invalidJson"));
		}
	};

	const addedFields = draft.filter((d) => !schemaFields.some((f) => f.name === d.name));
	const removedFields = schemaFields.filter((f) => !draft.some((d) => d.name === f.name));
	const hasDiff = addedFields.length > 0 || removedFields.length > 0;

	if (schemaLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-4 w-48" />
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
				</CardContent>
			</Card>
		);
	}

	const sortableFields = draft.filter(
		(f) => f.name && (f.sort || f.type === "int32" || f.type === "int64" || f.type === "float"),
	);

	return (
		<>
			<Card>
				<CardHeader>
					<div className="gap-2 flex flex-wrap items-start justify-between">
						<div>
							<CardTitle className="text-base">{tColl("schemaFields")}</CardTitle>
							<CardDescription>
								{slug} &mdash; {draft.length} {tColl("fields")}
							</CardDescription>
						</div>
						<div className="gap-2 flex flex-wrap">
							<Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
								<UploadIcon className="size-3.5" />
								{t("importJson")}
							</Button>
							<Button variant="outline" size="sm" onClick={handleExport}>
								<DownloadIcon className="size-3.5" />
								{t("exportJson")}
							</Button>
							{hasDiff && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setDiffOpen(true)}
								>
									{t("previewDiff")}
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Default sort selector */}
					<div className="gap-3 flex flex-wrap items-center">
						<Label className="text-sm shrink-0 text-muted-foreground">
							{t("defaultSort")}
						</Label>
						<Select value={defaultSort} onValueChange={setDefaultSort}>
							<SelectTrigger className="w-48">
								<SelectValue placeholder={t("noDefaultSort")} />
							</SelectTrigger>
							<SelectContent>
								{sortableFields.map((f) => (
									<SelectItem key={f.name} value={f.name}>
										{f.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{draft.length === 0 ? (
						<div className="py-8 text-center">
							<p className="mb-3 text-sm text-muted-foreground">{t("empty")}</p>
							<Button variant="outline" size="sm" onClick={handleAddField}>
								<PlusIcon className="size-3.5" />
								{t("addFirstField")}
							</Button>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="text-sm w-full">
								<thead>
									<tr className="border-b text-left text-muted-foreground">
										<th className="pb-2 pr-3 font-medium min-w-[140px]">
											{tColl("fieldName")}
										</th>
										<th className="pb-2 pr-3 font-medium min-w-[120px]">
											{tColl("fieldType")}
										</th>
										<th className="pb-2 pr-2 font-medium text-center">
											{tColl("fieldFacet")}
										</th>
										<th className="pb-2 pr-2 font-medium text-center">
											{tColl("fieldSort")}
										</th>
										<th className="pb-2 pr-2 font-medium text-center">
											{tColl("fieldIndex")}
										</th>
										<th className="pb-2 pr-2 font-medium text-center">
											{tColl("fieldOptional")}
										</th>
										<th className="pb-2 font-medium" />
									</tr>
								</thead>
								<tbody>
									{draft.map((field, idx) => (
										<tr key={idx} className="border-b last:border-0">
											<td className="py-1.5 pr-3">
												<Input
													value={field.name}
													onChange={(e) =>
														handleChange(idx, { name: e.target.value })
													}
													className="h-7 font-mono text-xs"
													placeholder={t("unnamed")}
												/>
											</td>
											<td className="py-1.5 pr-3">
												<Select
													value={field.type}
													onValueChange={(v) =>
														handleChange(idx, { type: v as FieldType })
													}
												>
													<SelectTrigger className="h-7 text-xs w-full">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{FIELD_TYPES.map((ft) => (
															<SelectItem key={ft} value={ft}>
																{ft}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</td>
											<td className="py-1.5 pr-2 text-center">
												<Switch
													checked={field.facet ?? false}
													onCheckedChange={(v) =>
														handleChange(idx, { facet: v })
													}
													className="scale-75"
												/>
											</td>
											<td className="py-1.5 pr-2 text-center">
												<Switch
													checked={field.sort ?? false}
													onCheckedChange={(v) =>
														handleChange(idx, { sort: v })
													}
													className="scale-75"
												/>
											</td>
											<td className="py-1.5 pr-2 text-center">
												<Switch
													checked={field.index ?? true}
													onCheckedChange={(v) =>
														handleChange(idx, { index: v })
													}
													className="scale-75"
												/>
											</td>
											<td className="py-1.5 pr-2 text-center">
												<Switch
													checked={field.optional ?? false}
													onCheckedChange={(v) =>
														handleChange(idx, { optional: v })
													}
													className="scale-75"
												/>
											</td>
											<td className="py-1.5">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleRemove(idx)}
													className="size-7 p-0 text-muted-foreground hover:text-destructive"
												>
													<Trash2Icon className="size-3.5" />
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{/* Footer */}
					<div className="gap-2 pt-2 flex flex-wrap items-center justify-between border-t">
						<Button variant="outline" size="sm" onClick={handleAddField}>
							<PlusIcon className="size-3.5" />
							{t("addField")}
						</Button>
						<div className="gap-2 flex">
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleSave(false)}
								loading={mutation.isPending}
							>
								{t("saveOnly")}
							</Button>
							<Button
								size="sm"
								onClick={() => handleSave(true)}
								loading={mutation.isPending}
							>
								{t("saveReindex")}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Import JSON dialog */}
			<Dialog open={importOpen} onOpenChange={setImportOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("importDialogTitle")}</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">{t("importDialogDesc")}</p>
					<Textarea
						value={importJson}
						onChange={(e) => setImportJson(e.target.value)}
						rows={8}
						className="font-mono text-xs"
						placeholder='[{"name": "title", "type": "string", "facet": false}]'
					/>
					<div className="gap-2 flex justify-end">
						<Button variant="outline" onClick={() => setImportOpen(false)}>
							{t("cancel")}
						</Button>
						<Button onClick={handleImport}>{t("importAction")}</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Diff preview dialog */}
			<Dialog open={diffOpen} onOpenChange={setDiffOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("diffTitle")}</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">{t("diffDesc")}</p>
					{!hasDiff ? (
						<p className="text-sm">{t("noChanges")}</p>
					) : (
						<div className="space-y-3 text-sm">
							{addedFields.length > 0 && (
								<div>
									<p className="mb-1 font-medium text-success">
										+ Added ({addedFields.length})
									</p>
									{addedFields.map((f) => (
										<div
											key={f.name}
											className="rounded px-2 py-1 font-mono text-xs bg-success/10 text-success"
										>
											{f.name}: {f.type}
										</div>
									))}
								</div>
							)}
							{removedFields.length > 0 && (
								<div>
									<p className="mb-1 font-medium text-destructive">
										- Removed ({removedFields.length})
									</p>
									{removedFields.map((f) => (
										<div
											key={f.name}
											className="rounded px-2 py-1 font-mono text-xs bg-destructive/10 text-destructive"
										>
											{f.name}: {f.type}
										</div>
									))}
								</div>
							)}
						</div>
					)}
					<div className="gap-2 flex justify-end">
						<Button variant="outline" onClick={() => setDiffOpen(false)}>
							{t("cancel")}
						</Button>
						<Button
							onClick={() => {
								handleSave(false);
								setDiffOpen(false);
							}}
						>
							{t("saveOnly")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
