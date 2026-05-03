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

import type { MySearchFileEntry } from "./types";

// ─── Props ──────────────────────────────────────────────────────────────────

interface MySearchDeleteFileDialogProps {
	file: MySearchFileEntry;
	organizationId: string;
	indexId: string;
	onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MySearchDeleteFileDialog({
	file,
	organizationId,
	indexId,
	onClose,
}: MySearchDeleteFileDialogProps) {
	const t = useTranslations("mySearch");
	const queryClient = useQueryClient();

	const deleteMutation = useMutation({
		...orpc.mySearch.deleteFile.mutationOptions(),
		onSuccess: () => {
			toastSuccess(t("files.deleted", { name: file.originalFilename }));
			void queryClient.invalidateQueries({
				queryKey: orpc.mySearch.listFiles.queryKey({ input: { organizationId, indexId } }),
			});
			onClose();
		},
		onError: () => {
			toastError(t("files.deleteError"));
		},
	});

	const handleDelete = () => {
		deleteMutation.mutate({
			organizationId,
			indexId,
			fileId: file.id,
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
								{t("files.deleteDescription", { name: file.originalFilename })}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="p-4 space-y-1 text-sm rounded-lg bg-muted/50">
					<p>
						<span className="text-muted-foreground">{t("files.name")}: </span>
						<span className="font-medium">{file.originalFilename}</span>
					</p>
					<p>
						<span className="text-muted-foreground">{t("files.type")}: </span>
						<span className="font-medium uppercase">{file.fileType}</span>
					</p>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={deleteMutation.isPending}>
						{t("cancel")}
					</Button>
					<Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
						{deleteMutation.isPending && <Loader2Icon className="size-4 animate-spin" />}
						{t("files.delete")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
