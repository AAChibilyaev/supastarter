"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, FileText, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type SortField = "createdAt" | "updatedAt";
type SortOrder = "asc" | "desc";

type FileRow = {
	id: string;
	title: string;
	mimeType: string;
	sourceType: string;
	externalId: string;
	language: string;
	chunkCount: number;
	version: number;
	createdAt: string;
	updatedAt: string;
	contentPreview: string;
};

interface FileTableProps {
	ownerType: "USER" | "ORGANIZATION";
	ownerId: string;
	spaceSlug: string;
	canManage: boolean;
}

function formatMimeType(mimeType: string): string {
	if (mimeType.includes("markdown") || mimeType.includes("md")) return "MD";
	if (mimeType.includes("pdf")) return "PDF";
	if (mimeType.includes("xml")) return "XML";
	if (mimeType.includes("text")) return "TXT";
	return mimeType.split("/").pop()?.toUpperCase() ?? mimeType;
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString();
	} catch {
		return "—";
	}
}

function SortButton({
	field,
	currentField,
	currentOrder,
	onClick,
	label,
}: {
	field: SortField;
	currentField: SortField;
	currentOrder: SortOrder;
	onClick: (field: SortField) => void;
	label: string;
}) {
	const isActive = currentField === field;
	return (
		<button
			type="button"
			onClick={() => onClick(field)}
			className="gap-1 inline-flex items-center transition-colors hover:text-foreground"
		>
			{label}
			{isActive ? (
				currentOrder === "asc" ? (
					<ArrowUp className="size-3" />
				) : (
					<ArrowDown className="size-3" />
				)
			) : (
				<ArrowUpDown className="size-3 opacity-40" />
			)}
		</button>
	);
}

export function FileTable({ ownerType, ownerId, spaceSlug, canManage }: FileTableProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();
	const [sortBy, setSortBy] = useState<SortField>("createdAt");
	const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
	const [previewFile, setPreviewFile] = useState<FileRow | null>(null);

	const { data: files, isLoading } = useQuery(
		orpc.knowledge.listFiles.queryOptions({
			input: { ownerType, ownerId, spaceSlug, sortBy, sortOrder },
			enabled: Boolean(spaceSlug),
		}),
	);

	const deleteMutation = useMutation({
		...orpc.knowledge.deleteFile.mutationOptions(),
		onSuccess: async () => {
			toastSuccess(t("search.knowledge.files.deleteSuccess"));
			await queryClient.invalidateQueries({
				queryKey: orpc.knowledge.listFiles.key(),
			});
			await queryClient.invalidateQueries({
				queryKey: orpc.knowledge.usageMetrics.key(),
			});
		},
		onError: () => {
			toastError(t("search.knowledge.files.deleteError"));
		},
	});

	const handleSort = (field: SortField) => {
		if (sortBy === field) {
			setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(field);
			setSortOrder("desc");
		}
	};

	const handleDelete = (file: FileRow) => {
		confirm({
			title: t("search.knowledge.files.delete"),
			message: t("search.knowledge.files.deleteConfirm"),
			confirmLabel: t("search.knowledge.files.delete"),
			destructive: true,
			onConfirm: () => {
				deleteMutation.mutate({ ownerType, ownerId, spaceSlug, fileId: file.id });
			},
		});
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("search.knowledge.files.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-3/4" />
				</CardContent>
			</Card>
		);
	}

	if (!files || files.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("search.knowledge.files.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="py-8 flex flex-col items-center justify-center text-center">
						<FileText className="size-10 mb-3 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">{t("search.knowledge.files.empty")}</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("search.knowledge.files.title")}</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("search.knowledge.files.colFilename")}</TableHead>
									<TableHead>{t("search.knowledge.files.colType")}</TableHead>
									<TableHead className="text-right">
										{t("search.knowledge.files.colChunks")}
									</TableHead>
									<TableHead>
										<SortButton
											field="createdAt"
											currentField={sortBy}
											currentOrder={sortOrder}
											onClick={handleSort}
											label={t("search.knowledge.files.colDate")}
										/>
									</TableHead>
									<TableHead className="w-[80px]">
										{t("search.knowledge.files.colActions")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{files.map((file) => (
									<TableRow key={file.id}>
										<TableCell className="max-w-[240px]">
											<button
												type="button"
												className="font-medium text-sm block w-full truncate text-left transition-colors hover:text-primary"
												onClick={() => setPreviewFile(file)}
												title={file.title}
											>
												{file.title}
											</button>
										</TableCell>
										<TableCell>
											<Badge status="info">{formatMimeType(file.mimeType)}</Badge>
										</TableCell>
										<TableCell className="text-sm text-right tabular-nums">
											{file.chunkCount}
										</TableCell>
										<TableCell className="text-sm whitespace-nowrap text-muted-foreground">
											{formatDate(file.createdAt)}
										</TableCell>
										<TableCell>
											<div className="gap-1 flex items-center">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setPreviewFile(file)}
													title={t("search.knowledge.files.preview")}
												>
													<Eye className="size-4" />
												</Button>
												{canManage && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleDelete(file)}
														disabled={deleteMutation.isPending}
														title={t("search.knowledge.files.delete")}
														className="text-destructive hover:text-destructive"
													>
														<Trash2 className="size-4" />
													</Button>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Preview Sheet */}
			<Sheet open={previewFile !== null} onOpenChange={(open) => !open && setPreviewFile(null)}>
				<SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
					{previewFile && (
						<>
							<SheetHeader className="mb-4">
								<SheetTitle className="pr-6 truncate">{previewFile.title}</SheetTitle>
								<SheetDescription>
									<Badge status="info">{formatMimeType(previewFile.mimeType)}</Badge>
									<span className="ml-2 text-muted-foreground">
										{previewFile.chunkCount} chunks · {previewFile.language} · v
										{previewFile.version}
									</span>
								</SheetDescription>
							</SheetHeader>

							<div className="space-y-4 text-sm">
								<div className="gap-2 text-xs grid grid-cols-2 text-muted-foreground">
									<div>
										<span className="font-medium block">Type</span>
										<span>{previewFile.sourceType}</span>
									</div>
									<div>
										<span className="font-medium block">External ID</span>
										<span className="font-mono block truncate">{previewFile.externalId}</span>
									</div>
									<div>
										<span className="font-medium block">Created</span>
										<span>{new Date(previewFile.createdAt).toLocaleString()}</span>
									</div>
									<div>
										<span className="font-medium block">Updated</span>
										<span>{new Date(previewFile.updatedAt).toLocaleString()}</span>
									</div>
								</div>

								<div>
									<p className="font-medium text-xs mb-2 text-muted-foreground">
										{t("search.knowledge.files.previewContent")}
									</p>
									{previewFile.contentPreview ? (
										<pre className="p-3 text-xs leading-relaxed rounded-lg bg-muted break-words whitespace-pre-wrap">
											{previewFile.contentPreview}
											{previewFile.contentPreview.length >= 500 && "…"}
										</pre>
									) : (
										<p className="text-xs text-muted-foreground">
											{t("search.knowledge.files.noContent")}
										</p>
									)}
								</div>

								{canManage && (
									<Button
										variant="destructive"
										size="sm"
										onClick={() => {
											setPreviewFile(null);
											handleDelete(previewFile);
										}}
										disabled={deleteMutation.isPending}
									>
										<Trash2 className="size-4" />
										{t("search.knowledge.files.delete")}
									</Button>
								)}
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>
		</>
	);
}
