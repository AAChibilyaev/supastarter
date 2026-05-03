"use client";

import { Card, CardContent } from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import { CheckCircleIcon, FileTextIcon, GlobeIcon, XCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export interface UploadJob {
	id: string;
	name: string;
	type: "file" | "url";
	progress: number; // 0-100
	status: "pending" | "processing" | "done" | "error";
	error?: string;
}

interface UploadProgressProps {
	jobs: UploadJob[];
	onDismiss?: (id: string) => void;
}

export function UploadProgress({ jobs }: UploadProgressProps) {
	const t = useTranslations("mySearch");

	if (jobs.length === 0) {
		return null;
	}

	const completed = jobs.filter((j) => j.status === "done").length;
	const failed = jobs.filter((j) => j.status === "error").length;
	const estimatedTime = jobs.some((j) => j.status === "pending" || j.status === "processing");

	return (
		<Card>
			<CardContent className="space-y-3 p-4">
				<div className="flex items-center justify-between">
					<h4 className="text-sm font-medium">{t("uploadProgress")}</h4>
					{estimatedTime && (
						<span className="text-xs text-muted-foreground">{t("estimatedTime")}</span>
					)}
					{!estimatedTime && (
						<span className="text-xs text-muted-foreground">
							{completed}/{jobs.length}
							{failed > 0 && ` · ${failed} ${t("failed").toLowerCase()}`}
						</span>
					)}
				</div>

				<div className="space-y-2">
					{jobs.map((job) => (
						<div key={job.id} className="gap-3 flex items-center">
							{job.type === "file" ? (
								<FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
							) : (
								<GlobeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
							)}
							<div className="min-w-0 flex-1">
								<p className="text-sm truncate">{job.name}</p>
								{job.status === "pending" || job.status === "processing" ? (
									<Progress value={job.progress} className="mt-1 h-1.5" />
								) : job.status === "done" ? (
									<div className="mt-0.5 gap-1 flex items-center">
										<CheckCircleIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
										<span className="text-xs text-green-600 dark:text-green-400">
											{t("completed").toLowerCase()}
										</span>
									</div>
								) : (
									<div className="mt-0.5 gap-1 flex items-center">
										<XCircleIcon className="h-3.5 w-3.5 shrink-0 text-destructive" />
										<span
											className="text-xs truncate text-destructive"
											title={job.error}
										>
											{job.error ?? t("failed")}
										</span>
									</div>
								)}
							</div>
							{job.status === "processing" && (
								<span className="text-xs shrink-0 text-muted-foreground tabular-nums">
									{job.progress}%
								</span>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
