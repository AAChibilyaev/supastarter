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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Textarea } from "@repo/ui/components/textarea";
import { useSearchIndexesQuery } from "@search/lib/api";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, ExternalLinkIcon, TerminalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface WidgetInstallPanelProps {
	organizationId: string;
}

function buildEmbedSnippet({
	baseUrl,
	indexSlug,
	apiKeyPrefix,
}: {
	baseUrl: string;
	indexSlug: string;
	apiKeyPrefix: string;
}) {
	const lines = [
		`<script`,
		`  src="${baseUrl}/api/widget/widget.js"`,
		`  data-base-url="${baseUrl}"`,
		`  data-api-key="${apiKeyPrefix}***"`,
		`  data-index-slug="${indexSlug}"`,
		`  data-container="#aac-search"`,
		`  data-theme="auto"`,
		`></script>`,
	];
	return lines.join("\n");
}

export function WidgetInstallPanel({ organizationId }: WidgetInstallPanelProps) {
	const t = useTranslations("search");
	const tConfig = useTranslations("search.configurator");
	const [installTab, setInstallTab] = useState<"script" | "npm" | "react">("script");
	const [copiedScript, setCopiedScript] = useState(false);
	const [copiedNpm, setCopiedNpm] = useState(false);
	const [copiedReact, setCopiedReact] = useState(false);

	const { data: indexes } = useSearchIndexesQuery(organizationId);
	const [selectedIndexSlug, setSelectedIndexSlug] = useState("");

	useMemo(() => {
		if (!selectedIndexSlug && indexes && indexes.length > 0) {
			setSelectedIndexSlug(indexes[0].slug);
		}
	}, [indexes, selectedIndexSlug]);

	const { data: widgetData } = useQuery(
		orpc.search.widgetConfig.queryOptions({
			input: { organizationId, indexSlug: selectedIndexSlug },
			enabled: !!organizationId && !!selectedIndexSlug,
		}),
	);

	const baseUrl = widgetData?.baseUrl ?? "";
	const apiKeyPrefix = widgetData?.apiKeyPrefix ?? "ss_search_";

	const scriptSnippet = useMemo(() => {
		if (!selectedIndexSlug) return "";
		return buildEmbedSnippet({ baseUrl, indexSlug: selectedIndexSlug, apiKeyPrefix });
	}, [baseUrl, selectedIndexSlug, apiKeyPrefix]);

	const reactSnippet = `import { SearchWidget } from "@aacsearch/widget/react";

function App() {
  return (
    <SearchWidget
      baseUrl="${baseUrl}"
      apiKey="${apiKeyPrefix}***"
      indexSlug="${selectedIndexSlug}"
      theme="auto"
    />
  );
}`;

	const handleCopy = async (text: string, setter: (v: boolean) => void) => {
		try {
			await navigator.clipboard.writeText(text);
			setter(true);
			toast.success(t("widget.snippetCopied") || "Copied!");
			setTimeout(() => setter(false), 2000);
		} catch {
			toast.error(t("widget.saveFailed"));
		}
	};

	return (
		<div className="space-y-6">
			{/* Index selector */}
			<div className="gap-3 flex items-center">
				<Label htmlFor="install-index-select" className="shrink-0">
					{t("widgetConfigurator.selectIndex")}
				</Label>
				<select
					id="install-index-select"
					value={selectedIndexSlug}
					onChange={(e) => setSelectedIndexSlug(e.target.value)}
					className="w-72 h-10 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<option value="" disabled>
						{t("widgetConfigurator.selectIndexPlaceholder")}
					</option>
					{(indexes ?? []).map((idx) => (
						<option key={idx.slug} value={idx.slug}>
							{idx.displayName ?? idx.slug}
						</option>
					))}
				</select>
			</div>

			{!selectedIndexSlug ? (
				<Card>
					<CardContent className="py-12 flex flex-col items-center text-center">
						<TerminalIcon className="size-10 text-muted-foreground/40" />
						<p className="mt-4 text-sm text-muted-foreground">
							{t("widgetConfigurator.noIndexSelected")}
						</p>
					</CardContent>
				</Card>
			) : (
				<Tabs value={installTab} onValueChange={(v) => setInstallTab(v as typeof installTab)}>
					<TabsList>
						<TabsTrigger value="script">{tConfig("embedCode")}</TabsTrigger>
						<TabsTrigger value="npm">NPM / Yarn</TabsTrigger>
						<TabsTrigger value="react">React</TabsTrigger>
					</TabsList>

					<TabsContent value="script" className="space-y-4 mt-6">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">
									{t("widget.installScriptTitle") || "Embed via Script Tag"}
								</CardTitle>
								<CardDescription>
									{t("widget.installScriptDesc") ||
										"Copy the snippet below and paste it into your website's HTML."}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label>{t("widget.snippet")}</Label>
									<Textarea
										readOnly
										value={scriptSnippet}
										rows={8}
										spellCheck={false}
										className="max-h-64 min-h-0 font-mono text-sm resize-y bg-muted"
									/>
								</div>
								<Button onClick={() => handleCopy(scriptSnippet, setCopiedScript)}>
									{copiedScript ? (
										<>
											<CheckIcon className="size-4 mr-2" />
											{t("widget.snippetCopied") || "Copied!"}
										</>
									) : (
										<>
											<CopyIcon className="size-4 mr-2" />
											{t("widget.copySnippet") || "Copy snippet"}
										</>
									)}
								</Button>

								<div className="p-4 rounded-lg border border-dashed bg-muted/30">
									<p className="text-sm font-medium mb-2">
										{t("widget.installSteps") || "Installation Steps"}
									</p>
									<ol className="space-y-2 text-sm list-inside list-decimal text-muted-foreground">
										<li>
											{t("widget.installStep1") ||
												"Paste the snippet before the closing <code>&lt;/body&gt;</code> tag."}
										</li>
										<li>
											{t("widget.installStep2") ||
												"Replace with a scoped search key for production."}
										</li>
										<li>
											{t("widget.installStep3") ||
												'The widget renders inside an element with <code>id="aac-search"</code>.'}
										</li>
										<li>
											{t("widget.installStep4") ||
												"Test by pressing <kbd>Ctrl+K</kbd> or <kbd>⌘K</kbd> on your site."}
										</li>
									</ol>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="npm" className="space-y-4 mt-6">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">
									{t("widget.installNpmTitle") || "Install via Package Manager"}
								</CardTitle>
								<CardDescription>
									{t("widget.installNpmDesc") ||
										"Install the AACsearch Widget package for programmatic usage."}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label>NPM</Label>
									<div className="gap-2 flex">
										<Input
											readOnly
											value="npm install @aacsearch/widget"
											className="font-mono text-sm bg-muted"
										/>
										<Button
											variant="outline"
											size="icon"
											onClick={() => handleCopy("npm install @aacsearch/widget", setCopiedNpm)}
										>
											{copiedNpm ? (
												<CheckIcon className="size-4" />
											) : (
												<CopyIcon className="size-4" />
											)}
										</Button>
									</div>
								</div>
								<div className="space-y-2">
									<Label>Yarn</Label>
									<Input
										readOnly
										value="yarn add @aacsearch/widget"
										className="font-mono text-sm bg-muted"
									/>
								</div>
								<div className="space-y-2">
									<Label>PNPM</Label>
									<Input
										readOnly
										value="pnpm add @aacsearch/widget"
										className="font-mono text-sm bg-muted"
									/>
								</div>
								<div className="p-4 rounded-lg border border-dashed bg-muted/30">
									<p className="text-sm text-muted-foreground">
										{t("widget.installNpmDocs") || "See the"}{" "}
										<a
											href="https://docs.aacsearch.com"
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center text-primary hover:underline"
										>
											{t("widget.installDocs") || "documentation"}
											<ExternalLinkIcon className="size-3 ml-1" />
										</a>{" "}
										{t("widget.installNpmDocsEnd") || "for framework-specific integration guides."}
									</p>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="react" className="space-y-4 mt-6">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">
									{t("widget.installReactTitle") || "React Integration"}
								</CardTitle>
								<CardDescription>
									{t("widget.installReactDesc") ||
										"Use the React component for seamless integration with your React app."}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label>{t("widget.snippet")}</Label>
									<Textarea
										readOnly
										value={reactSnippet}
										rows={14}
										spellCheck={false}
										className="max-h-80 min-h-0 font-mono text-sm resize-y bg-muted"
									/>
								</div>
								<Button onClick={() => handleCopy(reactSnippet, setCopiedReact)}>
									{copiedReact ? (
										<>
											<CheckIcon className="size-4 mr-2" />
											{t("widget.snippetCopied") || "Copied!"}
										</>
									) : (
										<>
											<CopyIcon className="size-4 mr-2" />
											{t("widget.copySnippet") || "Copy snippet"}
										</>
									)}
								</Button>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			)}
		</div>
	);
}
