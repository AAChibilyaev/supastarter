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
import { Textarea } from "@repo/ui/components/textarea";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function KnowledgeWorkbench({
	ownerType,
	ownerId,
	title,
	subtitle,
	canManage,
}: KnowledgeWorkbenchProps) {
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
			toast.success("Knowledge space created");
		},
		onError: () => toast.error("Failed to create knowledge space"),
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
			toast.success("Data source created");
		},
		onError: () => toast.error("Failed to create data source"),
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
			toast.success("File ingestion started");
		},
		onError: () => toast.error("Failed to ingest file"),
	});

	const askMutation = useMutation({
		...orpc.knowledge.ask.mutationOptions(),
		onSuccess: (result) => {
			setAnswerResult(result);
			toast.success("Answer generated");
		},
		onError: () => toast.error("Failed to generate answer"),
	});

	const graphExplainMutation = useMutation({
		...orpc.knowledge.graphragExplain.mutationOptions(),
		onSuccess: (result) => {
			setGraphResult(result);
			toast.success("Graph explanation generated");
		},
		onError: () => toast.error("Failed to explain graph retrieval"),
	});

	const handleCreateSpace = () => {
		if (!canManage) {
			toast.error("You do not have permissions to create spaces");
			return;
		}
		if (!spaceSlug.trim() || !spaceName.trim()) {
			toast.error("Slug and name are required");
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
			toast.error("You do not have permissions to create sources");
			return;
		}
		if (!selectedSpaceSlug || !sourceName.trim()) {
			toast.error("Select space and provide source name");
			return;
		}

		let config: Record<string, unknown>;
		try {
			config = parseSourceConfig(sourceConfig);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Invalid source config");
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
			toast.error("You do not have permissions to ingest files");
			return;
		}
		if (!selectedSpaceSlug || !selectedFile) {
			toast.error("Select a space and file");
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
			toast.error("Failed to read file");
		}
	};

	const handleAsk = () => {
		if (!selectedSpaceSlug || !question.trim()) {
			toast.error("Select a space and enter a question");
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
			toast.error("Select a space and enter graph query");
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
						<CardTitle>Spaces</CardTitle>
						<CardDescription>
							Personal/organization knowledge workspaces
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-space-select">Active space</Label>
							<select
								id="knowledge-space-select"
								className="px-3 py-2 text-sm w-full rounded-md border bg-background"
								value={selectedSpaceSlug}
								onChange={(event) => setSelectedSpaceSlug(event.target.value)}
							>
								<option value="">Select space</option>
								{spacesQuery.data?.map((space) => (
									<option key={space.id} value={space.slug}>
										{space.name} ({space.slug})
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-space-slug">New space slug</Label>
							<Input
								id="knowledge-space-slug"
								value={spaceSlug}
								onChange={(event) => setSpaceSlug(event.target.value)}
								placeholder="catalog-knowledge"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-space-name">New space name</Label>
							<Input
								id="knowledge-space-name"
								value={spaceName}
								onChange={(event) => setSpaceName(event.target.value)}
								placeholder="Catalog knowledge"
							/>
						</div>
						<Button
							type="button"
							onClick={handleCreateSpace}
							disabled={createSpaceMutation.isPending || !canManage}
						>
							Create space
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Sources</CardTitle>
						<CardDescription>CMS and file sources for this space</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-source-name">Source name</Label>
							<Input
								id="knowledge-source-name"
								value={sourceName}
								onChange={(event) => setSourceName(event.target.value)}
								placeholder="Bitrix shop connector"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-source-type">Source type</Label>
							<select
								id="knowledge-source-type"
								className="px-3 py-2 text-sm w-full rounded-md border bg-background"
								value={sourceType}
								onChange={(event) =>
									setSourceType(event.target.value as SourceType)
								}
							>
								{SOURCE_TYPES.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-source-config">Source config (JSON)</Label>
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
							Add source
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
						<CardTitle>File ingestion</CardTitle>
						<CardDescription>Upload md/xml/pdf into selected space</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-file-input">File</Label>
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
							Ingest file
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Jobs & metrics</CardTitle>
						<CardDescription>
							Operational visibility for ingestion and graph builds
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{usageQuery.data ? (
							<div className="text-sm gap-2 grid grid-cols-2">
								<div className="rounded p-2 border">
									<div className="text-muted-foreground">Sources</div>
									<div className="text-lg font-semibold">
										{usageQuery.data.sourceCount}
									</div>
								</div>
								<div className="rounded p-2 border">
									<div className="text-muted-foreground">Documents</div>
									<div className="text-lg font-semibold">
										{usageQuery.data.documentCount}
									</div>
								</div>
								<div className="rounded p-2 border">
									<div className="text-muted-foreground">Chunks</div>
									<div className="text-lg font-semibold">
										{usageQuery.data.chunkCount}
									</div>
								</div>
								<div className="rounded p-2 border">
									<div className="text-muted-foreground">Graph edges</div>
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
						<CardTitle>RAG ask</CardTitle>
						<CardDescription>
							Hybrid retrieval with citations from your space
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-question">Question</Label>
							<Textarea
								id="knowledge-question"
								rows={3}
								value={question}
								onChange={(event) => setQuestion(event.target.value)}
								placeholder="What products mention API key rotation?"
							/>
						</div>
						<Button
							type="button"
							onClick={handleAsk}
							disabled={askMutation.isPending || !selectedSpaceSlug}
						>
							Ask
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
										<div className="font-medium">
											[{citation.sourceIndex}] {citation.documentTitle}
										</div>
										<div className="text-muted-foreground">
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
						<CardTitle>GraphRAG explain</CardTitle>
						<CardDescription>Inspect graph neighborhood for your query</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="knowledge-graph-query">Graph query</Label>
							<Input
								id="knowledge-graph-query"
								value={graphQuery}
								onChange={(event) => setGraphQuery(event.target.value)}
								placeholder="connector diagnostics failures"
							/>
						</div>
						<Button
							type="button"
							onClick={handleGraphExplain}
							disabled={graphExplainMutation.isPending || !selectedSpaceSlug}
						>
							Explain graph
						</Button>
						{graphResult ? (
							<div className="space-y-2">
								<div className="rounded p-2 text-xs border">
									<div className="font-medium mb-1">Seed nodes</div>
									{graphResult.seedNodes.length === 0
										? "No seed nodes matched."
										: graphResult.seedNodes
												.map(
													(node) =>
														`${node.canonicalName} (${node.nodeType})`,
												)
												.join(", ")}
								</div>
								<div className="rounded p-2 text-xs border">
									<div className="font-medium mb-1">Edges</div>
									{graphResult.edges.length === 0
										? "No edges found."
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
				<p className="text-sm text-muted-foreground">Loading spaces...</p>
			) : null}
			{selectedSpace ? (
				<p className="text-xs text-muted-foreground">
					Active space: {selectedSpace.name} ({selectedSpace.slug})
				</p>
			) : null}
		</div>
	);
}
