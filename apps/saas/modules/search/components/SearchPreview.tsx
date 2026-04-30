"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface SearchPreviewProps {
	organizationId: string;
	slug: string;
}

export function SearchPreview({ organizationId, slug }: SearchPreviewProps) {
	const t = useTranslations();
	const [query, setQuery] = useState("");
	const [result, setResult] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSearch = async () => {
		if (!query.trim()) return;
		setLoading(true);
		setError(null);
		setResult("");

		try {
			const url = new URL("/api/search/public", window.location.origin);
			url.searchParams.set("slug", slug);
			url.searchParams.set("q", query.trim());

			const res = await fetch(url.toString(), {
				headers: { "Content-Type": "application/json" },
			});

			if (!res.ok) {
				const text = await res.text();
				throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
			}

			const json = await res.json();
			setResult(JSON.stringify(json, null, 2));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Search failed");
		} finally {
			setLoading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearch();
		}
	};

	return (
		<Card className="p-6 space-y-4">
			<div>
				<h3 className="text-lg font-semibold">{t("search.preview.title")}</h3>
				<p className="text-sm text-foreground/60">{t("search.preview.description")}</p>
			</div>

			<div className="gap-2 flex">
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={t("search.preview.placeholder")}
					className="flex-1"
				/>
				<Button onClick={handleSearch} loading={loading} variant="primary">
					{t("search.preview.search")}
				</Button>
			</div>

			{error && (
				<div className="p-3 rounded text-sm bg-rose-500/10 text-rose-500 border-rose-500/20 border">
					{error}
				</div>
			)}

			{result && (
				<pre className="p-4 rounded text-xs font-mono max-h-96 overflow-auto border bg-muted break-all whitespace-pre-wrap">
					{result}
				</pre>
			)}

			{!result && !error && (
				<div className="text-sm text-foreground/60">{t("search.preview.noResults")}</div>
			)}
		</Card>
	);
}
