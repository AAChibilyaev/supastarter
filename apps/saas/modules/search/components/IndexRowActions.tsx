"use client";

import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { EllipsisVerticalIcon, EyeIcon, RotateCwIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface IndexRowActionsProps {
	indexName: string;
	indexSlug: string;
	schema: Record<string, unknown>;
	onReindex?: (slug: string) => Promise<void>;
	onDelete?: (slug: string) => Promise<void>;
}

export function IndexRowActions({
	indexName,
	indexSlug,
	schema,
	onReindex,
	onDelete,
}: IndexRowActionsProps) {
	const t = useTranslations();
	const { confirm } = useConfirmationAlert();
	const [schemaOpen, setSchemaOpen] = useState(false);

	const handleReindex = () => {
		confirm({
			title: t("search.indexActions.reindexConfirmTitle"),
			message: t("search.indexActions.reindexConfirmMessage", { name: indexName }),
			destructive: false,
			onConfirm: async () => {
				if (!onReindex) return;
				try {
					await onReindex(indexSlug);
					toastSuccess(t("search.indexActions.reindexed"));
				} catch (err) {
					toastError(err instanceof Error ? err.message : "Reindex failed");
				}
			},
		});
	};

	const handleDelete = () => {
		confirm({
			title: t("search.indexActions.deleteConfirmTitle"),
			message: t("search.indexActions.deleteConfirmMessage", { name: indexName }),
			destructive: true,
			onConfirm: async () => {
				if (!onDelete) return;
				try {
					await onDelete(indexSlug);
					toastSuccess(t("search.indexActions.deleted"));
				} catch (err) {
					toastError(err instanceof Error ? err.message : "Delete failed");
				}
			},
		});
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="size-8">
						<EllipsisVerticalIcon className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{onReindex && (
						<DropdownMenuItem onClick={handleReindex}>
							<RotateCwIcon className="mr-2 size-4" />
							{t("search.indexActions.reindex")}
						</DropdownMenuItem>
					)}
					<DropdownMenuItem onClick={() => setSchemaOpen(true)}>
						<EyeIcon className="mr-2 size-4" />
						{t("search.indexActions.viewSchema")}
					</DropdownMenuItem>
					{onDelete && (
						<DropdownMenuItem onClick={handleDelete} className="text-rose-500">
							<Trash2Icon className="mr-2 size-4" />
							{t("search.indexActions.delete")}
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={schemaOpen} onOpenChange={setSchemaOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{t("search.indexActions.schemaTitle", { name: indexName })}
						</DialogTitle>
						<DialogDescription>{indexSlug}</DialogDescription>
					</DialogHeader>
					<pre className="p-4 rounded text-xs font-mono max-h-80 overflow-auto border bg-muted break-all whitespace-pre-wrap">
						{JSON.stringify(schema, null, 2)}
					</pre>
				</DialogContent>
			</Dialog>
		</>
	);
}
