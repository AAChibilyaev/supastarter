import { execSync } from "node:child_process";
import type { ParsedDocument } from "../types";

export async function parseUrl(
	url: string,
): Promise<ParsedDocument> {
	// Use curl to fetch the page, then extract text from HTML
	let html: string;
	try {
		html = execSync(
			`curl -sL --max-time 15 -A "Mozilla/5.0 (compatible; AACsearchBot/1.0)" "${url.replace(/"/g, '\\"')}" 2>/dev/null`,
			{ encoding: "utf-8", timeout: 20000, maxBuffer: 10 * 1024 * 1024 },
		);
	} catch {
		return {
			title: new URL(url).hostname,
			content: "",
			mimeType: "text/html",
			metadata: { error: "Failed to fetch URL", sourceUrl: url },
		};
	}

	// Extract title
	const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	const title = titleMatch?.[1]?.trim() ?? new URL(url).hostname;

	// Extract description
	const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"[^>]*\/?>/i) ??
		html.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"[^>]*\/?>/i);
	const description = descMatch?.[1] ?? "";

	// Remove unwanted tags and extract text
	const text = html
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
		.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
		.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
		.replace(/\s+/g, " ")
		.trim();

	return {
		title,
		content: text,
		mimeType: "text/html",
		metadata: {
			sourceUrl: url,
			description,
			wordCount: text.split(/\s+/).filter(Boolean).length,
		},
	};
}
