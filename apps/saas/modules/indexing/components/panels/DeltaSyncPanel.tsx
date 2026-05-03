"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormatter } from "next-intl";
import { useState } from "react";

import { DeltaSyncConfirm } from "./DeltaSyncConfirm";

interface DeltaSyncPanelProps {
	organizationId: string;
	indexId: string;
}

export function DeltaSyncPanel({ organizationId, indexId }: DeltaSyncPanelProps) {
	const t = useTranslations("indexing.delta");
	const format = useFormatter();
	const [showConfirm, setShowConfirm] = useState(false);
	const [lastResult, setLastResult] = useState<{
		processed: number;
		upserted: number;
		deleted: number;
		remaining: number;
	} | null>(null);

	// ── Trigger delta sync mutation (synchronous batch) ─────────────

	const deltaSyncMutation = useMutation(
		orpc.indexing.deltaSync.mutationOptions({
			onSuccess: (data) => {
				setLastResult(data);
				setShowConfirm(false);
				toastSuccess(t("jobCompleted") + ` — ${data.upserted} upserted, ${data.deleted} deleted`);
			},
			onError: (error) => {
				toastError(error.message || t("errorGeneric"));
				setShowConfirm(false);
			},
		}),
	);

	const isRunning = deltaSyncMutation.isPending;
	const hasResult = lastResult !== null;

	const handleSyncNow = () => {
		setShowConfirm(true);
	};

	const handleConfirm = () => {
		deltaSyncMutation.mutate({
			organizationId,
			indexId,
			limit: 500,
		});
	};

	const statusText = isRunning ? t("syncing") : hasResult ? t("jobCompleted") : t("noActiveJob");

	return (
		<>
			<DeltaSyncConfirm
				open={showConfirm}
				onOpenChange={setShowConfirm}
				onConfirm={handleConfirm}
				isLoading={isRunning}
			/>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>{t("title")}</span>
						{!isRunning && (
							<Button
								variant="primary"
								size="sm"
								onClick={handleSyncNow}
								loading={deltaSyncMutation.isPending}
							>
								<RefreshCwIcon className="mr-1.5 size-4" />
								{isRunning ? t("syncing") : t("syncNow")}
							</Button>
						)}
						{isRunning && <Badge status="info">{statusText}</Badge>}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Status */}
					{isRunning && <p className="text-sm text-muted-foreground">{t("syncing")}...</p>}

					{/* Last result */}
					{lastResult && (
						<div className="gap-4 sm:grid-cols-4 grid grid-cols-2">
							<Card>
								<CardContent className="pt-6 text-center">
									<p className="font-bold text-2xl">{format.number(lastResult.processed)}</p>
									<p className="text-xs text-muted-foreground">{t("processed")}</p>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="pt-6 text-center">
									<p className="font-bold text-2xl text-success">
										{format.number(lastResult.upserted)}
									</p>
									<p className="text-xs text-muted-foreground">{t("upserted")}</p>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="pt-6 text-center">
									<p className="font-bold text-2xl text-destructive">
										{format.number(lastResult.deleted)}
									</p>
									<p className="text-xs text-muted-foreground">{t("deleted")}</p>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="pt-6 text-center">
									<p className="font-bold text-2xl">{format.number(lastResult.remaining)}</p>
									<p className="text-xs text-muted-foreground">{t("remaining")}</p>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Error display */}
					{deltaSyncMutation.error && (
						<p className="text-sm text-destructive">
							{deltaSyncMutation.error.message || t("errorGeneric")}
						</p>
					)}
				</CardContent>
			</Card>
		</>
	);
}
