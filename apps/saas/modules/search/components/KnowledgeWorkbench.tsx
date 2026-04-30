"use client";

import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type OwnerType = "USER" | "ORGANIZATION";
type SourceType =
	| "CMS_PRESTASHOP"
	| "CMS_BITRIX"
	| "FILE_MD"
	| "FILE_XML"
	| "FILE_PDF"
	| "HTTP_SITEMAP"
	| "RSS";

interface KnowledgeWorkbenchProps {
	ownerType: OwnerType;
	ownerId: string;
	title: string;
	subtitle: string;
	canManage: boolean;
}

const DEFAULT_SOURCE_TYPE: SourceType = "FILE_MD";

const SOURCE_TYPES: SourceType[] = [
	"CMS_PRESTASHOP",
	"CMS_BITRIX",
	"FILE_MD",
	"FILE_XML",
	"FILE_PDF",
	"HTTP_SITEMAP",
	"RSS",
];

/** Allowed file extensions for client-side validation */
const ALLOWED_EXTENSIONS = [".md", ".xml", ".pdf"];

function hasAllowedExtension(filename: string): boolean {
	const lower = filename.toLowerCase();
	return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function parseSourceConfig(raw: string): Record<string, unknown> {
	if (!raw.trim()) return {};
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			throw new Error("Config must be a JSON object");
		}
		return parsed as Record<string, unknown>;
	} catch {
		throw new Error("Config must be valid JSON object");
	}
}

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result !== "string") {
				reject(new Error("Failed to read file"));
				return;
			}
			const contentBase64 = result.split(",")[1];
			if (!contentBase64) {
				reject(new Error("Invalid file payload"));
				return;
			}
			resolve(contentBase64);
		};
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsDataURL(file);
	});
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function KnowledgeWorkbench({
	ownerType,
	ownerId,
	title,
	subtitle,
	canManage,
}: KnowledgeWorkbenchProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [spaceSlug, setSpaceSlug] = useState("");
	const [spaceName, setSpaceName] = useState("");
	const [selectedSpaceSlug, setSelectedSpaceSlug] = useState("");
	const [sourceName, setSourceName] = useState("");
	const [sourceType, setSourceType] = useState<SourceType>(DEFAULT_SOURCE_TYPE);
	const [sourceConfig, setSourceConfig] = useState("{}");
	const [question, setQuestion] = useState("");
	const [graphQuery, setGraphQuery] = useState("");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [answerResult, setAnswerResult] = useState<{
		answer: string;
		citations: Array<{ sourceIndex: number; documentTitle: string; snippet: string }>;
	} | null>(null);
	const [graphResult, setGraphResult] = useState<{
		seedNodes: Array<{ canonicalName: string; nodeType: string }>;
		edges: Array<{ relationType: string; fromNodeId: string; toNodeId: string }>;
	} | null>(null);

	const spacesQuery = useQuery(
		orpc.knowledge.listSpaces.queryOptions({
			input: { ownerType, ownerId },
		}),
	);

	useEffect(() => {
		if (!selectedSpaceSlug && spacesQuery.data && spacesQuery.data.length > 0) {
			setSelectedSpaceSlug(spacesQuery.data[0].slug);
		}
	}, [selectedSpaceSlug, spacesQuery.data]);

	const selectedSpace = useMemo(
		() => spacesQuery.data?.find((space) => space.slug === selectedSpaceSlug),
		[selectedSpaceSlug, spacesQuery.data],
	);

	const sourcesQuery = useQuery(
		orpc.knowledge.listSources.queryOptions({
			input: {
				ownerType,
				ownerId,
				spaceSlug: selectedSpaceSlug,
			},
			enabled: Boolean(selectedSpaceSlug),
		}),
	);

	const jobsQuery = useQuery(
		orpc.knowledge.listIngestionJobs.queryOptions({
			input: {
				ownerType,
				ownerId,
				spaceSlug: selectedSpaceSlug,
				limit: 15,
			},
			enabled: Boolean(selectedSpaceSlug),
			refetchInterval: 5000,
		}),
	);

	const usageQuery = useQuery(
		orpc.knowledge.usageMetrics.queryOptions({
			input: {
				ownerType,
				ownerId,
				spaceSlug: selectedSpaceSlug,
			},
			enabled: Boolean(selectedSpaceSlug),
			refetchInterval: 5000,
		}),
	);

	const createSpaceMutation = useMutation({
		...orpc.knowledge.createSpace.mutationOptions(),
		onSuccess: async (space) => {
			await queryClient.invalidateQueries({
				queryKey: orpc.knowledge.listSpaces.queryKey({
					input: { ownerType, ownerId },
				}),
			});
			setSelectedSpaceSlug(space.slug);
			setSpaceSlug("");
			setSpaceName("");
			toast.success(t("search.knowledge.createdSpace"));
		},
		onError: () => toast.error(t("search.knowledge.createSpaceError")),
	});

	const createSourceMutation = useMutation({
		...orpc.knowledge.createSource.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: orpc.knowledge.listSources.queryKey({
					input: {
						ownerType,
						ownerId,
						spaceSlug: selectedSpaceSlug,
					},
				}),
			});
			setSourceName("");
			setSourceConfig("{}");
			setSourceType(DEFAULT_SOURCE_TYPE);
			toast.success(t("search.knowledge.createdSource"));
		},
		onError: () => toast.error(t("search.knowledge.sourceCreateError")),
	});

	const ingestMutation = useMutation({
		...orpc.knowledge.ingestFile.mutationOptions(),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: orpc.knowledge.listIngestionJobs.queryKey({
						input: { ownerType, ownerId, spaceSlug: selectedSpaceSlug, limit: 15 },
					}),
				}),
				queryClient.invalidateQueries({
					queryKey: orpc.knowledge.usageMetrics.queryKey({
						input: { ownerType, ownerId, spaceSlug: selectedSpaceSlug },
					}),
				}),
			]);
			setSelectedFile(null);
			toast.success(t("search.knowledge.ingestionStarted"));
		},
		onError: () => toast.error(t("search.knowledge.ingestError")),
	});

	const askMutation = useMutation({
		...orpc.knowledge.ask.mutationOptions(),
		onSuccess: (result) => {
			setAnswerResult(result);
			toast.success(t("search.knowledge.answerGenerated"));
		},
		onError: () => toast.error(t("search.knowledge.answerError")),
	});

	const graphExplainMutation = useMutation({
		...orpc.knowledge.graphragExplain.mutationOptions(),
		onSuccess: (result) => {
			setGraphResult(result);
			toast.success(t("search.knowledge.graphExplained"));
		},
		onError: () => toast.error(t("search.knowledge.graphExplainError")),
	});

	const handleCreateSpace = () => {
		if (!canManage) {
			toast.error(t("search.knowledge.permissionDenied"));
			return;
		}
		if (!spaceSlug.trim() || !spaceName.trim()) {
			toast.error(t("search.knowledge.requiredFields"));
			return;
		}
		createSpaceMutation.mutate({
			ownerType,
			ownerId,
			slug: spaceSlug.trim(),
			name: spaceName.trim(),
		});
	};

	const handleCreateSource = () => {
		if (!canManage) {
			toast.error(t("search.knowledge.noPermissionSources"));
			return;
		}
		if (!selectedSpaceSlug || !sourceName.trim()) {
			toast.error(t("search.knowledge.selectSpaceAndSource"));
			return;
		}

		let config: Record<string, unknown>;
		try {
			config = parseSourceConfig(sourceConfig);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : t("search.knowledge.invalidSourceConfig"),
			);
			return;
		}

		createSourceMutation.mutate({
			ownerType,
			ownerId,
			spaceSlug: selectedSpaceSlug,
			sourceType,
			name: sourceName.trim(),
			config,
		});
	};

	const handleIngest = async () => {
		if (!canManage) {
			toast.error(t("search.knowledge.noPermissionIngest"));
			return;
		}
		if (!selectedSpaceSlug || !selectedFile) {
			toast.error(t("search.knowledge.selectSpaceAndFile"));
			return;
		}

		// Client-side file validation
		if (selectedFile.size > MAX_FILE_SIZE) {
			toast.error(t("search.knowledge.fileSizeLimit"));
			return;
		}
		if (!hasAllowedExtension(selectedFile.name)) {
			toast.error(t("search.knowledge.fileTypeInvalid"));
			return;
		}

		try {
			const contentBase64 = await fileToBase64(selectedFile);
			await ingestMutation.mutateAsync({
				ownerType,
				ownerId,
				spaceSlug: selectedSpaceSlug,
				fileName: selectedFile.name,
				mimeType: selectedFile.type || "application/octet-stream",
				contentBase64,
			});
		} catch {
			toast.error(t("search.knowledge.fileReadError"));
		}
	};

	const handleAsk = () => {
		if (!selectedSpaceSlug || !question.trim()) {
			toast.error(t("search.knowledge.noSpaceSelected"));
			return;
		}
		askMutation.mutate({
			ownerType,
			ownerId,
			spaceSlug: selectedSpaceSlug,
			query: question.trim(),
		});
	};

	const handleGraphExplain = () => {
		if (!selectedSpaceSlug || !graphQuery.trim()) {
			toast.error(t("search.knowledge.selectSpaceAndGraphQuery"));
			return;
		}
		graphExplainMutation.mutate({
			ownerType,
			ownerId,
			spaceSlug: selectedSpaceSlug,
			query: graphQuery.trim(),
		});
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">{title}</h1>
				<p className="text-muted-foreground">{subtitle}</p>
			</div>

			<div className="gap-6 lg:grid-cols-2 grid">
				<Card>
					<CardHeader>
						<CardTitle>{t("search.knowledge.spaces")}</CardTitle>
						<CardDescription>{t("search.knowledge.spacesDesc")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-space-select">
								{t("search.knowledge.activeSpace")}
							</Label>
							<Select
								value={selectedSpaceSlug}
								onValueChange={(value) => setSelectedSpaceSlug(value)}
							>
								<SelectTrigger id="knowledge-space-select" className="w-full">
									<SelectValue placeholder={t("search.knowledge.selectSpace")} />
								</SelectTrigger>
								<SelectContent>
									{spacesQuery.data?.map((space) => (
										<SelectItem key={space.id} value={space.slug}>
											{space.name} ({space.slug})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-space-slug">
								{t("search.knowledge.newSpaceSlug")}
							</Label>
							<Input
								id="knowledge-space-slug"
								value={spaceSlug}
								onChange={(event) => setSpaceSlug(event.target.value)}
								placeholder={t("search.knowledge.slugPlaceholder")}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-space-name">
								{t("search.knowledge.newSpaceName")}
							</Label>
							<Input
								id="knowledge-space-name"
								value={spaceName}
								onChange={(event) => setSpaceName(event.target.value)}
								placeholder={t("search.knowledge.namePlaceholder")}
							/>
						</div>
						<Button
							type="button"
							onClick={handleCreateSpace}
							disabled={createSpaceMutation.isPending || !canManage}
						>
							{t("search.knowledge.createSpace")}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("search.knowledge.sources")}</CardTitle>
						<CardDescription>{t("search.knowledge.sourcesDesc")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-source-name">
								{t("search.knowledge.sourceName")}
							</Label>
							<Input
								id="knowledge-source-name"
								value={sourceName}
								onChange={(event) => setSourceName(event.target.value)}
								placeholder={t("search.knowledge.sourceNamePlaceholder")}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-source-type">
								{t("search.knowledge.sourceType")}
							</Label>
							<Select
								value={sourceType}
								onValueChange={(value) => setSourceType(value as SourceType)}
							>
								<SelectTrigger id="knowledge-source-type" className="w-full">
									<SelectValue placeholder={t("search.knowledge.sourceType")} />
								</SelectTrigger>
								<SelectContent>
									{SOURCE_TYPES.map((type) => (
										<SelectItem key={type} value={type}>
											{type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-source-config">
								{t("search.knowledge.sourceConfig")}
							</Label>
							<Textarea
								id="knowledge-source-config"
								rows={4}
								value={sourceConfig}
								onChange={(event) => setSourceConfig(event.target.value)}
							/>
						</div>
						<Button
							type="button"
							onClick={handleCreateSource}
							disabled={
								createSourceMutation.isPending || !selectedSpaceSlug || !canManage
							}
						>
							{t("search.knowledge.addSource")}
						</Button>
						<div className="space-y-2">
							{sourcesQuery.data?.map((source) => (
								<div key={source.id} className="p-2 text-sm rounded-md border">
									<div className="font-medium">{source.name}</div>
									<div className="text-muted-foreground">{source.sourceType}</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="gap-6 lg:grid-cols-2 grid">
				<Card>
					<CardHeader>
						<CardTitle>{t("search.knowledge.fileIngestion")}</CardTitle>
						<CardDescription>{t("search.knowledge.fileIngestionDesc")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-file-input">
								{t("search.knowledge.fileInput")}
							</Label>
							<Input
								id="knowledge-file-input"
								type="file"
								accept=".md,.xml,.pdf,text/markdown,application/xml,application/pdf"
								onChange={(event) => {
									setSelectedFile(event.target.files?.[0] ?? null);
								}}
							/>
						</div>
						<Button
							type="button"
							onClick={handleIngest}
							disabled={ingestMutation.isPending || !selectedSpaceSlug || !canManage}
						>
							{t("search.knowledge.ingestFile")}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("search.knowledge.jobsAndMetrics")}</CardTitle>
						<CardDescription>
							{t("search.knowledge.jobsAndMetricsDesc")}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{usageQuery.data ? (
							<div className="text-sm gap-2 grid grid-cols-2">
								<div className="rounded p-2 border">
									<div className="text-muted-foreground">
										{t("search.knowledge.sourcesMetric")}
									</div>
									<div className="text-lg font-semibold">
										{usageQuery.data.sourceCount}
									</div>
								</div>
								<div className="rounded p-2 border">
									<div className="text-muted-foreground">
										{t("search.knowledge.documentsMetric")}
									</div>
									<div className="text-lg font-semibold">
										{usageQuery.data.documentCount}
									</div>
								</div>
								<div className="rounded p-2 border">
									<div className="text-muted-foreground">
										{t("search.knowledge.chunksMetric")}
									</div>
									<div className="text-lg font-semibold">
										{usageQuery.data.chunkCount}
									</div>
								</div>
								<div className="rounded p-2 border">
									<div className="text-muted-foreground">
										{t("search.knowledge.graphEdgesMetric")}
									</div>
									<div className="text-lg font-semibold">
										{usageQuery.data.graphEdgeCount}
									</div>
								</div>
							</div>
						) : null}
						<div className="space-y-2">
							{jobsQuery.data?.map((job) => (
								<div key={job.id} className="rounded p-2 text-sm border">
									<div className="font-medium">
										{job.mode} - {job.status}
									</div>
									<div className="text-muted-foreground">
										{job.processedItems}/{job.totalItems} processed
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="gap-6 lg:grid-cols-2 grid">
				<Card>
					<CardHeader>
						<CardTitle>{t("search.knowledge.ragAsk")}</CardTitle>
						<CardDescription>{t("search.knowledge.ragAskDesc")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-question">
								{t("search.knowledge.question")}
							</Label>
							<Textarea
								id="knowledge-question"
								rows={3}
								value={question}
								onChange={(event) => setQuestion(event.target.value)}
								placeholder={t("search.knowledge.questionPlaceholder")}
							/>
						</div>
						<Button
							type="button"
							onClick={handleAsk}
							disabled={askMutation.isPending || !selectedSpaceSlug}
						>
							{t("search.knowledge.askButton")}
						</Button>
						{answerResult ? (
							<div className="space-y-2">
								<div className="rounded p-3 text-sm border whitespace-pre-wrap">
									{answerResult.answer}
								</div>
								{answerResult.citations.map((citation) => (
									<div
										key={`${citation.sourceIndex}-${citation.documentTitle}`}
										className="rounded p-2 text-xs border"
									>
										<div className="gap-1.5 font-medium flex items-baseline">
											<span className="shrink-0 text-muted-foreground">
												[{citation.sourceIndex}]
											</span>
											<span>{t("search.knowledge.citedFrom")}:</span>
											<span className="font-bold">
												{citation.documentTitle}
											</span>
										</div>
										<div className="mt-1 text-muted-foreground">
											{citation.snippet}
										</div>
									</div>
								))}
							</div>
						) : null}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("search.knowledge.graphExplain")}</CardTitle>
						<CardDescription>{t("search.knowledge.graphExplainDesc")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-graph-query">
								{t("search.knowledge.graphQueryLabel")}
							</Label>
							<Input
								id="knowledge-graph-query"
								value={graphQuery}
								onChange={(event) => setGraphQuery(event.target.value)}
								placeholder={t("search.knowledge.graphQueryPlaceholder")}
							/>
						</div>
						<Button
							type="button"
							onClick={handleGraphExplain}
							disabled={graphExplainMutation.isPending || !selectedSpaceSlug}
						>
							{t("search.knowledge.explainGraph")}
						</Button>
						{graphResult ? (
							<div className="space-y-2">
								<div className="rounded p-2 text-xs border">
									<div className="font-medium mb-1">
										{t("search.knowledge.seedNodes")}
									</div>
									{graphResult.seedNodes.length === 0
										? t("search.knowledge.noSeedNodes")
										: graphResult.seedNodes
												.map(
													(node) =>
														`${node.canonicalName} (${node.nodeType})`,
												)
												.join(", ")}
								</div>
								<div className="rounded p-2 text-xs border">
									<div className="font-medium mb-1">
										{t("search.knowledge.edges")}
									</div>
									{graphResult.edges.length === 0
										? t("search.knowledge.noEdges")
										: graphResult.edges
												.slice(0, 12)
												.map(
													(edge) =>
														`${edge.relationType}: ${edge.fromNodeId} -> ${edge.toNodeId}`,
												)
												.join("\n")}
								</div>
							</div>
						) : null}
					</CardContent>
				</Card>
			</div>

			{spacesQuery.isLoading ? (
				<p className="text-sm text-muted-foreground">
					{t("search.knowledge.loadingSpaces")}
				</p>
			) : null}
			{selectedSpace ? (
				<p className="text-xs text-muted-foreground">
					{t("search.knowledge.activeSpaceLabel", {
						name: selectedSpace.name,
						slug: selectedSpace.slug,
					})}
				</p>
			) : null}
		</div>
	);
}
