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
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface WidgetPanelProps {
	slug: string;
	baseUrl: string;
}

export function WidgetPanel({ slug, baseUrl }: WidgetPanelProps) {
	const t = useTranslations();
	const [apiKeyPrefix, setApiKeyPrefix] = useState("ss_search_***");

	const snippet = `<script
  src="${baseUrl}/api/widget/widget.js"
  data-base-url="${baseUrl}"
  data-api-key="${apiKeyPrefix}"
  data-index-slug="${slug}"
  data-container="#aac-search"
  data-theme="auto"
></script>`;

	const copySnippet = () => {
		navigator.clipboard.writeText(snippet).then(
			() => toast.success(t("search.widget.copied")),
			() => toast.error(t("search.widget.copyFailed")),
		);
	};

	return (
		<Card>
			<CardHeader className="pb-4">
				<CardTitle>{t("search.widget.title")}</CardTitle>
				<CardDescription>{t("search.widget.description")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-2">
					<Label htmlFor="apiKey">{t("search.widget.apiKeyLabel")}</Label>
					<Input
						id="apiKey"
						value={apiKeyPrefix}
						onChange={(e) => setApiKeyPrefix(e.target.value)}
						placeholder="ss_search_***"
					/>
					<p className="text-xs text-foreground/60">{t("search.widget.apiKeyHint")}</p>
				</div>

				<div className="space-y-2">
					<Label>{t("search.widget.snippet")}</Label>
					<pre className="rounded p-4 text-sm max-h-48 overflow-x-auto bg-muted">
						<code>{snippet}</code>
					</pre>
				</div>

				<Button onClick={copySnippet}>{t("search.widget.copySnippet")}</Button>

				<div className="rounded p-4 border border-dashed">
					<p className="text-sm mb-2 text-foreground/60">
						{t("search.widget.installInstructions")}
					</p>
					<ol className="space-y-1 text-sm list-inside list-decimal text-foreground/60">
						<li>{t("search.widget.step1")}</li>
						<li>{t("search.widget.step2")}</li>
						<li>{t("search.widget.step3")}</li>
					</ol>
				</div>
			</CardContent>
		</Card>
	);
}
