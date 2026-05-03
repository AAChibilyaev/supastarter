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
import { AlertTriangle } from "lucide-react";

interface CancelJobDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	jobId: string;
	jobLabel?: string;
}

export function CancelJobDialog({
	open,
	onOpenChange,
	organizationId,
	jobId,
	jobLabel,
}: CancelJobDialogProps) {
	const queryClient = useQueryClient();

	const cancelMutation = useMutation(
		orpc.indexing.cancelReindex.mutationOptions({
			onSuccess: async () => {
				toastSuccess("Job cancelled");
				onOpenChange(false);
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.indexing.reindexHistory.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.indexing.reindexStatus.key(),
					}),
				]);
			},
			onError: () => {
				toastError("Failed to cancel job");
			},
		}),
	);

	const handleCancel = () => {
		cancelMutation.mutate({ organizationId, jobId });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<div className="gap-2 mb-2 flex items-center">
						<div className="size-10 flex items-center justify-center rounded-full bg-destructive/10">
							<AlertTriangle className="size-5 text-destructive" />
						</div>
						<div>
							<DialogTitle>Cancel reindex job</DialogTitle>
							<DialogDescription>
								{jobLabel
									? `This will cancel "${jobLabel}". `
									: "This will cancel the running reindex job. "}
								The operation cannot be undone and the job will be marked as cancelled.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={cancelMutation.isPending}
					>
						Keep running
					</Button>
					<Button
						variant="destructive"
						onClick={handleCancel}
						disabled={cancelMutation.isPending}
					>
						{cancelMutation.isPending ? "Cancelling..." : "Yes, cancel job"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
