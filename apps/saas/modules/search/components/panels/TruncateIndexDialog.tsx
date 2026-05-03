"use client";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface TruncateIndexDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	slug: string;
}

export function TruncateIndexDialog({
	open,
	onOpenChange,
	organizationId,
	slug,
}: TruncateIndexDialogProps) {
	const t = useTranslations("search");
	const queryClient = useQueryClient();
	const [confirmPhrase, setConfirmPhrase] = useState("");

	const truncateMutation = useMutation(
		orpc.search.truncateIndex.mutationOptions({
			onSuccess: async () => {
				toastSuccess(t("collection.truncated"));
				setConfirmPhrase("");
				onOpenChange(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.search.listIndexes.key(),
				});
			},
			onError: (error) => {
				toastError(
					error.message === "confirm_phrase_mismatch"
						? t("collection.truncateConfirmMismatch")
						: t("collection.truncateError"),
				);
			},
		}),
	);

	const handleConfirm = () => {
		if (!organizationId) return;
		truncateMutation.mutate({
			organizationId,
			slug,
			confirmPhrase,
		});
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setConfirmPhrase("");
		}
		onOpenChange(newOpen);
	};

	const phraseMatches = confirmPhrase === slug;

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{t("collection.confirmTruncate")}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{t("collection.confirmTruncateDesc")}
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">
						{t("collection.truncateTypeToConfirm", { slug })}
					</p>
					<Input
						value={confirmPhrase}
						onChange={(e) => setConfirmPhrase(e.target.value)}
						placeholder={slug}
						className="font-mono"
					/>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel>
						{t("collection.cancel")}
					</AlertDialogCancel>
					<Button
						variant="destructive"
						disabled={!phraseMatches || truncateMutation.isPending}
						loading={truncateMutation.isPending}
						onClick={handleConfirm}
					>
						{t("collection.truncateAction")}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
