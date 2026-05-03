"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useSession } from "@auth/hooks/use-session";
import { Button } from "@repo/ui/components/button";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { DropZone } from "./upload/DropZone";
import { FileList } from "./upload/FileList";
import { UrlInput } from "./upload/UrlInput";
import { UploadProgress } from "./upload/UploadProgress";
import { useDocumentUpload } from "../hooks/useDocumentUpload";

interface CreateIndexFormProps {
	onSuccess?: (indexId: string) => void;
	onCancel?: () => void;
}

export function CreateIndexForm({ onSuccess, onCancel }: CreateIndexFormProps) {
	const t = useTranslations("mySearch");
	const { user } = useSession();
	const queryClient = useQueryClient();

	const [displayName, setDisplayName] = useState("");
	const [slug, setSlug] = useState("");
	const [indexId, setIndexId] = useState<string | null>(null);

	const organizationId = user?.id ?? "";

	const {
		pendingFiles,
		pendingUrls,
		uploadJobs,
		addFiles,
		addUrl,
		removeFile,
		removeUrl,
		isUploading,
	} = useDocumentUpload({
		organizationId,
		indexId: indexId ?? "",
	});

	const createIndexMutation = useMutation(
		orpc.mySearch.createIndex.mutationOptions({
			onSuccess: (data) => {
				setIndexId(data.id);
				toast.success(t("indexCreated"));
				queryClient.invalidateQueries({
					queryKey: orpc.mySearch.listIndexes.queryKey({ input: { organizationId } }),
				});
			},
			onError: (err) => {
				toast.error(err.message || t("indexCreateError"));
			},
		}),
	);

	const handleCreateIndex = () => {
		if (!slug.trim() || !displayName.trim()) return;
		createIndexMutation.mutate({
			organizationId,
			slug: slug.trim(),
			displayName: displayName.trim(),
		});
	};

	const handleAutoSlug = (name: string) => {
		setDisplayName(name);
		if (!slug || slug === displayName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")) {
			setSlug(name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
		}
	};

	return (
		<div className="space-y-6">
			{/* Index Name */}
			<div className="space-y-2">
				<Label htmlFor="index-name">{t("indexName")}</Label>
				<Input
					id="index-name"
					placeholder={t("indexNamePlaceholder")}
					value={displayName}
					onChange={(e) => handleAutoSlug(e.target.value)}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="index-slug">{t("indexSlug")}</Label>
				<Input
					id="index-slug"
					placeholder={t("indexSlugPlaceholder")}
					value={slug}
					onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
				/>
			</div>

			{/* Drop Zone */}
			<DropZone onFilesSelected={addFiles} disabled={!indexId && !createIndexMutation.isPending} />

			{/* URL Input */}
			<UrlInput onUrlAdd={addUrl} disabled={!indexId && !createIndexMutation.isPending} />

			{/* File List */}
			<FileList files={pendingFiles} urls={pendingUrls} onRemoveFile={removeFile} onRemoveUrl={removeUrl} />

			{/* Upload Progress */}
			<UploadProgress jobs={uploadJobs} />

			{/* Actions */}
			<div className="flex items-center justify-end gap-3">
				{onCancel && (
					<Button variant="outline" onClick={onCancel}>
						{t("cancel")}
					</Button>
				)}
				<Button
					size="lg"
					onClick={handleCreateIndex}
					disabled={!slug.trim() || !displayName.trim() || createIndexMutation.isPending}
				>
					{createIndexMutation.isPending ? (
						<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<UploadIcon className="mr-2 h-4 w-4" />
					)}
					{createIndexMutation.isPending ? t("creating") : t("createIndex")}
				</Button>
			</div>
		</div>
	);
}
