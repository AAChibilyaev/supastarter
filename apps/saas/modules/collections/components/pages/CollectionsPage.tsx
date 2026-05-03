"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { EmptyState } from "@search/components/cards/EmptyState";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, Columns3Icon, PlusIcon, RefreshCwIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { CollectionCard, type CollectionData } from "../cards/CollectionCard";
import { ExportDialog } from "../export/ExportDialog";
import { ImportDialog } from "../import/ImportDialog";
import { SchemaEditorPanel } from "../schema/SchemaEditorPanel";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract field names from a collection schema (array of { name } objects) */
function extractSchemaFieldNames(schema: unknown): string[] {
	if (!Array.isArray(schema)) return [];
	return schema.map((field: Record<string, unknown>) => field.name as string).filter(Boolean);
}

// ─── Skeleton grid ──────────────────────────────────────────────────────────

function CollectionGridSkeleton() {
	return (
		<div className="gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grid grid-cols-1">
			{[...Array(8)].map((_, i) => (
				<Card key={i} className="p-4 space-y-3">
					<Skeleton className="h-5 w-32" />
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-3/4" />
					<Skeleton className="h-10 w-full" />
				</Card>
			))}
		</div>
	);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CollectionsPage() {
	const t = useTranslations("search");
	const tCommon = useTranslations("common");
	const { activeOrganization } = useActiveOrganization();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();

	const orgId = activeOrganization?.id;
	const orgSlug = activeOrganization?.slug;

	const [searchQuery, setSearchQuery] = useState("");
	const [importCollectionSlug, setImportCollectionSlug] = useState<string | null>(null);
	const [exportCollectionSlug, setExportCollectionSlug] = useState<string | null>(null);
	const [schemaCollectionSlug, setSchemaCollectionSlug] = useState<string | null>(null);

	// ── Fetch collections ──────────────────────────────────────

	const { data: collectionsData, isLoading, isError, refetch } = useQuery(
		orpc.collections.list.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
	);

	// ── Fetch collection schema for import dialog ─────────────────────────

	const { data: importCollection } = useQuery(
		orpc.collections.get.queryOptions({
			input: {
				organizationId: orgId ?? "",
				slug: importCollectionSlug ?? "",
			},
		}),
	);

	const importSchemaFields = useMemo(
		() => extractSchemaFieldNames(importCollection?.schema),
		[importCollection?.schema],
	);

	// ── Filter by search ──────────────────────────────────────────────────

	const collections: CollectionData[] = useMemo(() => {
		if (!collectionsData) return [];
		return collectionsData
			.filter((col) => {
				if (!searchQuery) return true;
				const name = col.name ?? col.slug ?? "";
				return name.toLowerCase().includes(searchQuery.toLowerCase());
			})
			.map((col) => ({
				id: col.id,
				slug: col.slug,
				displayName: col.name ?? col.slug,
				enabled: col.status === "active",
				numDocuments: col.documentCount ?? 0,
				sizeMb: col.size ?? 0,
				fieldsCount: Array.isArray(col.schema) ? col.schema.length : 0,
				lastActivityAt: col.updatedAt,
				createdAt: col.createdAt,
			}));
	}, [collectionsData, searchQuery]);

	// ── Delete mutation ───────────────────────────────────────────────────

	const deleteMutation = useMutation(
		orpc.collections.delete.mutationOptions({
			onSuccess: () => {
				toastSuccess(t("collection.deleted"));
				void queryClient.invalidateQueries({
					queryKey: orpc.collections.list.key(),
				});
			},
			onError: () => {
				toastError(t("collection.deleteError"));
			},
		}),
	);

	const handleDelete = (id: string) => {
		const collection = collections.find((c) => c.id === id);
		confirm({
			title: t("collection.deleteTitle"),
			message: t("collection.deleteMessage", {
				name: collection?.displayName ?? collection?.slug ?? "",
			}),
			destructive: true,
			onConfirm: () => {
				deleteMutation.mutate({
					organizationId: orgId ?? "",
					slug: collection?.slug ?? id,
				});
			},
		});
	};

	const handleDuplicate = (_id: string) => {
		toastSuccess(tCommon("comingSoon"));
	};

	const handleImport = (id: string) => {
		const collection = collections.find((c) => c.id === id);
		if (collection) {
			setImportCollectionSlug(collection.slug);
		}
	};

	const handleExport = (slug: string) => {
		setExportCollectionSlug(slug);
	};

	const handleSchema = (slug: string) => {
		setSchemaCollectionSlug(slug);
	};

	// ── Render ─────────────────────────────────────────────────────────────

	if (!orgSlug) {
		return (
			<EmptyState
				title={t("collection.selectOrg")}
				description={t("collection.selectOrgDescription")}
				icon={Columns3Icon}
			/>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="gap-4 sm:items-center sm:flex-row flex flex-col items-start justify-between">
				<div>
					<h1 className="font-bold text-2xl tracking-tight">{t("nav.collections")}</h1>
					<p className="text-sm text-muted-foreground">{t("collections.subtitle")}</p>
				</div>
				<div className="gap-2 flex items-center">
					<Button
						variant="outline"
						size="sm"
						onClick={() => void refetch()}
						disabled={isLoading}
					>
						<RefreshCwIcon className="size-4" />
						{tCommon("refresh")}
					</Button>
					<Button variant="primary" asChild>
						<a href={`/${orgSlug}/search?tab=create`}>
							<PlusIcon className="size-4" />
							{t("collection.new")}
						</a>
					</Button>
				</div>
			</div>

			{/* Search */}
			<div className="sm:max-w-md relative">
				<SearchIcon className="left-2.5 size-4 absolute top-1/2 -translate-y-1/2 text-foreground/40" />
				<Input
					placeholder={t("collections.searchPlaceholder")}
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-8"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => setSearchQuery("")}
						className="right-2 size-4 absolute top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
					>
						<XIcon className="size-4" />
					</button>
				)}
			</div>

			{/* Error state */}
			{isError && (
				<div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
					<AlertCircleIcon className="size-4 shrink-0" />
					<span>{t("collections.loadError")}</span>
					<Button
						variant="ghost"
						size="sm"
						className="ml-auto text-destructive hover:text-destructive"
						onClick={() => void refetch()}
					>
						{tCommon("refresh")}
					</Button>
				</div>
			)}

			{/* Content */}
			{isLoading ? (
				<CollectionGridSkeleton />
			) : collections.length === 0 ? (
				<EmptyState
					title={searchQuery ? t("collections.noResults") : t("collections.empty")}
					description={
						searchQuery
							? t("collections.noResultsDescription")
							: t("collections.emptyDescription")
					}
					icon={Columns3Icon}
					action={
						searchQuery
							? undefined
							: {
									label: t("collection.createFirst"),
									href: `/${orgSlug}/search?tab=create`,
								}
					}
				/>
			) : (
				<div className="gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grid grid-cols-1">
					{collections.map((collection) => (
						<CollectionCard
							key={collection.id}
							collection={collection}
							organizationSlug={orgSlug}
							onDelete={handleDelete}
							onDuplicate={handleDuplicate}
							onImport={handleImport}
							onExport={handleExport}
							onSchema={handleSchema}
						/>
					))}
				</div>
			)}

			<ImportDialog
				open={importCollectionSlug !== null}
				onOpenChange={(open) => {
					if (!open) setImportCollectionSlug(null);
				}}
				organizationId={orgId ?? ""}
				slug={importCollectionSlug ?? ""}
				schemaFields={importSchemaFields}
			/>
			<ExportDialog
				open={exportCollectionSlug !== null}
				onOpenChange={(open) => {
					if (!open) setExportCollectionSlug(null);
				}}
				organizationId={orgId ?? ""}
				slug={exportCollectionSlug ?? ""}
			/>

			{/* Schema Editor Dialog */}
			<Dialog
				open={schemaCollectionSlug !== null}
				onOpenChange={(open) => {
					if (!open) setSchemaCollectionSlug(null);
				}}
			>
				<DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{t("collection.schemaEditor.title")}</DialogTitle>
					</DialogHeader>
					{schemaCollectionSlug && (
						<SchemaEditorPanel
							organizationId={orgId ?? ""}
							slug={schemaCollectionSlug}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
