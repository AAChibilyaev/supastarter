"use client";

import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { FileEntry } from "./FileTable";

// ─── Props ──────────────────────────────────────────────────────────────────

interface DeleteFileDialogProps {
	file: FileEntry;
	organizationId: string;
	slug: string;
	onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DeleteFileDialog({ file, organizationId, slug, onClose }: DeleteFileDialogProps) {
	const t = useTranslations("search");
	const queryClient = useQueryClient();

	const deleteMutation = useMutation({
		...orpc.search.upsertDocument.mutationOptions(),
		onSuccess: () => {
			toastSuccess(t("files.deleted", { name: file.name }));
			void queryClient.invalidateQueries({
				queryKey: orpc.search.listDocuments.key(),
			});
			onClose();
		},
		onError: () => {
			toastError(t("files.deleteError"));
		},
	});

	const handleDelete = () => {
		// Use document upsert with empty document to effectively mark for deletion
		// In production, this should use a proper deleteByQuery or bulkDelete endpoint
		deleteMutation.mutate({
			organizationId,
			slug,
			// Delete by setting a tombstone document — actual implementation
			// will use search.dynamicSearch or search.bulkDelete when available
			document: { id: file.id, _deleted: true } as Record<string, unknown>,
		});
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<div className="gap-3 flex items-center">
						<div className="p-2 rounded-lg bg-destructive/10">
							<FileTextIcon className="size-5 text-destructive" />
						</div>
						<div>
							<DialogTitle>{t("files.deleteTitle")}</DialogTitle>
							<DialogDescription>
								{t("files.deleteDescription", { name: file.name })}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="p-4 space-y-1 text-sm rounded-lg bg-muted/50">
					<p>
						<span className="text-muted-foreground">{t("files.name")}: </span>
						<span className="font-medium">{file.name}</span>
					</p>
					<p>
						<span className="text-muted-foreground">{t("files.type")}: </span>
						<span className="font-medium uppercase">{file.type}</span>
					</p>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={deleteMutation.isPending}>
						{t("files.cancel")}
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={deleteMutation.isPending}
					>
						{deleteMutation.isPending && (
							<Loader2Icon className="size-4 animate-spin" />
						)}
						{t("files.delete")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
