"use client";

import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import type { UploadJob } from "../components/upload/UploadProgress";

function generateId(): string {
	return crypto.randomUUID();
}

interface UseDocumentUploadOptions {
	organizationId: string;
	indexId: string;
}

export function useDocumentUpload({ organizationId, indexId }: UseDocumentUploadOptions) {
	const queryClient = useQueryClient();
	const [pendingFiles, setPendingFiles] = useState<
		Array<{
			id: string;
			file: File;
			status: "pending" | "uploading" | "done" | "error";
			error?: string;
		}>
	>([]);
	const [pendingUrls, setPendingUrls] = useState<
		Array<{
			id: string;
			url: string;
			status: "pending" | "fetching" | "done" | "error";
			error?: string;
		}>
	>([]);
	const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);

	const uploadFileMutation = useMutation(
		orpc.mySearch.uploadFile.mutationOptions({
			onSuccess: (_data, variables) => {
				setPendingFiles((prev) =>
					prev.map((f) =>
						f.file.name === variables.filename ? { ...f, status: "done" as const } : f,
					),
				);
				setUploadJobs((prev) =>
					prev.map((j) =>
						j.name === variables.filename ? { ...j, status: "done" as const, progress: 100 } : j,
					),
				);
			},
			onError: (_error, variables) => {
				setPendingFiles((prev) =>
					prev.map((f) =>
						f.file.name === variables.filename
							? { ...f, status: "error" as const, error: _error.message }
							: f,
					),
				);
				setUploadJobs((prev) =>
					prev.map((j) =>
						j.name === variables.filename
							? { ...j, status: "error" as const, error: _error.message }
							: j,
					),
				);
			},
		}),
	);

	const addUrlMutation = useMutation(
		orpc.mySearch.addUrl.mutationOptions({
			onSuccess: (_data, variables) => {
				setPendingUrls((prev) =>
					prev.map((u) => (u.url === variables.url ? { ...u, status: "done" as const } : u)),
				);
				setUploadJobs((prev) =>
					prev.map((j) =>
						j.name === variables.url ? { ...j, status: "done" as const, progress: 100 } : j,
					),
				);
			},
			onError: (_error, variables) => {
				setPendingUrls((prev) =>
					prev.map((u) =>
						u.url === variables.url ? { ...u, status: "error" as const, error: _error.message } : u,
					),
				);
				setUploadJobs((prev) =>
					prev.map((j) =>
						j.name === variables.url
							? { ...j, status: "error" as const, error: _error.message }
							: j,
					),
				);
			},
		}),
	);

	const addFiles = useCallback(
		(files: File[]) => {
			const newFiles = files.map((file) => ({
				id: generateId(),
				file,
				status: "pending" as const,
			}));
			setPendingFiles((prev) => [...prev, ...newFiles]);

			// Start uploading each file
			for (const item of newFiles) {
				const reader = new FileReader();
				reader.onload = () => {
					const base64 = (reader.result as string).split(",")[1];
					setPendingFiles((prev) =>
						prev.map((f) => (f.id === item.id ? { ...f, status: "uploading" as const } : f)),
					);
					setUploadJobs((prev) => [
						...prev,
						{
							id: item.id,
							name: item.file.name,
							type: "file",
							progress: 0,
							status: "processing",
						},
					]);
					uploadFileMutation.mutate({
						organizationId,
						indexId,
						filename: item.file.name,
						content: base64,
						mimeType: item.file.type || undefined,
					});
				};
				reader.readAsDataURL(item.file);
			}
		},
		[organizationId, indexId, uploadFileMutation],
	);

	const addUrl = useCallback(
		(url: string) => {
			const id = generateId();
			setPendingUrls((prev) => [...prev, { id, url, status: "fetching" }]);
			setUploadJobs((prev) => [
				...prev,
				{
					id,
					name: url,
					type: "url",
					progress: 0,
					status: "processing",
				},
			]);
			addUrlMutation.mutate({ organizationId, indexId, url });
		},
		[organizationId, indexId, addUrlMutation],
	);

	const removeFile = useCallback((id: string) => {
		setPendingFiles((prev) => prev.filter((f) => f.id !== id));
	}, []);

	const removeUrl = useCallback((id: string) => {
		setPendingUrls((prev) => prev.filter((u) => u.id !== id));
	}, []);

	const invalidateQueries = useCallback(async () => {
		await queryClient.invalidateQueries({
			queryKey: orpc.mySearch.listFiles.queryKey({ input: { organizationId, indexId } }),
		});
	}, [queryClient, organizationId, indexId]);

	return {
		pendingFiles,
		pendingUrls,
		uploadJobs,
		addFiles,
		addUrl,
		removeFile,
		removeUrl,
		invalidateQueries,
		isUploading: uploadFileMutation.isPending || addUrlMutation.isPending,
	};
}
