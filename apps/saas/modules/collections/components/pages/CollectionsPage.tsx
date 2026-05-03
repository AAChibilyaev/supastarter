"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { EmptyState } from "@search/components/cards/EmptyState";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Columns3Icon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { CollectionCard, type CollectionData } from "../cards/CollectionCard";
import { ExportDialog } from "../export/ExportDialog";
import { ImportDialog } from "../import/ImportDialog";

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
	const t = useTranslations();
	const { activeOrganization } = useActiveOrganization();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();

	const orgId = activeOrganization?.id;
	const orgSlug = activeOrganization?.slug;

	const [searchQuery, setSearchQuery] = useState("");
	const [importCollectionSlug, setImportCollectionSlug] = useState<string | null>(null);
	const [exportCollectionSlug, setExportCollectionSlug] = useState<string | null>(null);

	// ── Fetch indexes (collections = search indexes) ──────────────────────

	const { data: indexes, isLoading } = useQuery(
		orpc.search.listIndexes.queryOptions({
			input: { organizationId: orgId ?? "" },
			enabled: Boolean(orgId),
		}),
	);

	// ── Fetch collection schema for import dialog ─────────────────────────

	const { data: importCollection } = useQuery(
		orpc.collections.get.queryOptions({
			input: {
				organizationId: orgId ?? "",
				slug: importCollectionSlug ?? "",
			},
			enabled: Boolean(orgId) && Boolean(importCollectionSlug),
		}),
	);

	const importSchemaFields = useMemo(
		() => extractSchemaFieldNames(importCollection?.schema),
		[importCollection?.schema],
	);

	// ── Filter by search ──────────────────────────────────────────────────

	const collections: CollectionData[] = useMemo(() => {
		if (!indexes) return [];
		return (indexes as Array<Record<string, unknown>>)
			.filter((idx) => {
				if (!searchQuery) return true;
				const name = (idx.displayName as string) ?? (idx.slug as string) ?? "";
				return name.toLowerCase().includes(searchQuery.toLowerCase());
			})
			.map((idx) => ({
				id: idx.id as string,
				slug: idx.slug as string,
				displayName: (idx.displayName as string) ?? (idx.slug as string),
				enabled: (idx.enabled as boolean) ?? true,
				numDocuments: (idx.numDocuments as number) ?? 0,
				sizeMb: idx.sizeMb as number | undefined,
				fieldsCount: (idx.fieldsCount as number) ?? 0,
				lastActivityAt: idx.lastActivityAt as string | undefined,
				createdAt: (idx.createdAt as string) ?? new Date().toISOString(),
			}));
	}, [indexes, searchQuery]);

	// ── Delete mutation ───────────────────────────────────────────────────

	const deleteMutation = useMutation(
		orpc.search.deleteIndex.mutationOptions({
			onSuccess: () => {
				toastSuccess(t("search.collection.deleted"));
				void queryClient.invalidateQueries({
					queryKey: orpc.search.listIndexes.key(),
				});
			},
			onError: () => {
				toastError(t("search.collection.deleteError"));
			},
		}),
	);

	const handleDelete = (id: string) => {
		const collection = collections.find((c) => c.id === id);
		confirm({
			title: t("search.collection.deleteTitle"),
			message: t("search.collection.deleteMessage", {
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
		toastSuccess(t("common.comingSoon") || "Coming soon");
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

	// ── Render ─────────────────────────────────────────────────────────────

	if (!orgSlug) {
		return (
			<EmptyState
				title={t("search.collection.selectOrg")}
				description={t("search.collection.selectOrgDescription")}
				icon={Columns3Icon}
			/>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="gap-4 sm:items-center sm:flex-row flex flex-col items-start justify-between">
				<div>
					<h1 className="font-bold text-2xl tracking-tight">
						{t("search.nav.collections")}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t("search.collections.subtitle") ||
							"Manage your search indexes and documents"}
					</p>
				</div>
				<Button variant="primary" asChild>
					<a href={`/${orgSlug}/search?tab=create`}>
						<PlusIcon className="size-4" />
						{t("search.collection.new") || "New Collection"}
					</a>
				</Button>
			</div>

			{/* Search */}
			<div className="sm:max-w-md relative">
				<SearchIcon className="left-2.5 size-4 absolute top-1/2 -translate-y-1/2 text-foreground/40" />
				<Input
					placeholder={
						t("search.collections.searchPlaceholder") || "Search collections..."
					}
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

			{/* Content */}
			{isLoading ? (
				<CollectionGridSkeleton />
			) : collections.length === 0 ? (
				<EmptyState
					title={
						searchQuery
							? t("search.collections.noResults")
							: t("search.collections.empty")
					}
					description={
						searchQuery
							? t("search.collections.noResultsDescription")
							: t("search.collections.emptyDescription")
					}
					icon={Columns3Icon}
					action={
						searchQuery
							? undefined
							: {
									label: t("search.collection.createFirst"),
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
		</div>
	);
}
