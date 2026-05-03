"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Check, Clipboard, Code2, ExternalLink, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

// ── Types ───────────────────────────────────────────────────────

interface SdkCard {
	id: string;
	name: string;
	language: string;
	packageName: string;
	installCommand: string;
	docsUrl: string;
	repoUrl: string;
	status: "ready" | "coming_soon";
	version: string;
	color: string;
}

// ── Copy button ─────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 shrink-0">
			{copied ? <Check className="size-3.5 text-green-500" /> : <Clipboard className="size-3.5" />}
			{copied ? "Copied!" : "Copy"}
		</Button>
	);
}

// ── Main component ───────────────────────────────────────────────

export function SdksPage() {
	const t = useTranslations("sdks");

	const sdks: SdkCard[] = [
		{
			id: "typescript",
			name: "TypeScript / JavaScript",
			language: "TypeScript",
			packageName: "@aacsearch/client",
			installCommand: "npm install @aacsearch/client",
			docsUrl: "https://aacsearch.com/docs/sdks/node",
			repoUrl: "https://github.com/aacsearch/supastarter/tree/main/packages/search-client",
			status: "ready",
			version: "0.1.0",
			color: "bg-blue-500",
		},
		{
			id: "php",
			name: "PHP",
			language: "PHP",
			packageName: "aacsearch/aacsearch-php",
			installCommand: "composer require aacsearch/aacsearch-php",
			docsUrl: "https://aacsearch.com/docs/sdks/php",
			repoUrl: "https://github.com/aacsearch/supastarter/tree/main/packages/search-client-php",
			status: "ready",
			version: "0.1.0",
			color: "bg-indigo-500",
		},
		{
			id: "python",
			name: "Python",
			language: "Python",
			packageName: "aacsearch",
			installCommand: "pip install aacsearch",
			docsUrl: "https://aacsearch.com/docs/sdks/python",
			repoUrl: "https://github.com/aacsearch/supastarter/tree/main/packages/search-client-python",
			status: "ready",
			version: "0.1.0",
			color: "bg-yellow-500",
		},
		{
			id: "swift",
			name: "Swift (iOS / macOS)",
			language: "Swift",
			packageName: "aacsearch/aacsearch-swift",
			installCommand:
				'// Package.swift:\n.package(url: "https://github.com/aacsearch/aacsearch-swift", from: "0.1.0")',
			docsUrl: "https://aacsearch.com/docs/sdks/swift",
			repoUrl: "https://github.com/aacsearch/aacsearch-swift",
			status: "coming_soon",
			version: "\u2014",
			color: "bg-orange-500",
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-2xl tracking-tight">{t("title")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
			</div>

			<div className="gap-6 md:grid-cols-2 grid grid-cols-1">
				{sdks.map((sdk) => (
					<Card key={sdk.id} className={sdk.status === "coming_soon" ? "opacity-70" : ""}>
						<CardHeader className="pb-3">
							<div className="gap-3 flex items-start justify-between">
								<div className="gap-2 flex items-center">
									<div
										className={`size-10 flex items-center justify-center rounded-lg ${sdk.color} text-white`}
									>
										<Code2 className="size-5" />
									</div>
									<div>
										<CardTitle className="text-base">{sdk.name}</CardTitle>
										<CardDescription className="font-mono text-xs">
											{sdk.packageName}
										</CardDescription>
									</div>
								</div>
								<Badge status={sdk.status === "ready" ? "success" : "warning"}>
									{sdk.status === "ready" ? `v${sdk.version}` : t("comingSoon")}
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Install command */}
							<div className="space-y-1.5">
								<span className="text-xs font-medium text-muted-foreground">{t("install")}</span>
								<div className="gap-2 flex items-center">
									<code className="px-3 py-2 text-xs font-mono flex-1 overflow-x-auto rounded-md bg-muted whitespace-nowrap">
										{sdk.installCommand}
									</code>
									{sdk.status === "ready" && <CopyButton text={sdk.installCommand} />}
								</div>
							</div>

							{/* Action buttons */}
							<div className="gap-2 flex flex-wrap">
								<Button variant="outline" size="sm" className="gap-1.5" asChild>
									<a href={sdk.docsUrl} target="_blank" rel="noopener noreferrer">
										<ExternalLink className="size-3.5" />
										{t("viewDocs")}
									</a>
								</Button>
								<Button variant="ghost" size="sm" className="gap-1.5" asChild>
									<a href={sdk.repoUrl} target="_blank" rel="noopener noreferrer">
										<Package className="size-3.5" />
										{t("viewSource")}
									</a>
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Usage hint */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("usageTitle")}</CardTitle>
					<CardDescription>{t("usageDescription")}</CardDescription>
				</CardHeader>
				<CardContent>
					<code className="px-4 py-3 text-sm font-mono block rounded-md bg-muted whitespace-pre">
						{`// TypeScript: search your index\nimport { SearchClient } from "@aacsearch/client";\n\nconst client = new SearchClient({\n  baseUrl: "https://app.aacsearch.com",\n  apiKey: "ss_search_xxx",\n});\n\nconst results = await client.search("products", {\n  q: "query",\n  query_by: "title,description",\n});`}
					</code>
				</CardContent>
			</Card>
		</div>
	);
}
