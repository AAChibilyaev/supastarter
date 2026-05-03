import { logger } from "@repo/logs";

import { parseUrl } from "./parsers/url";
import type { CrawlOptions, ParsedDocument, PipelineDocument } from "./types";
import { DEFAULT_CRAWL_OPTIONS } from "./types";

/**
 * Recursive web crawler (Stage 1 of the 5-stage pipeline).
 *
 * Crawls a starting URL and returns discovered documents.
 * Respects: maxDepth, sameDomain, robots.txt (basic), allowed/excluded patterns.
 */
export async function crawlUrl(
	url: string,
	options?: Partial<CrawlOptions>,
): Promise<PipelineDocument[]> {
	const opts = { ...DEFAULT_CRAWL_OPTIONS, ...options };
	const discovered = new Map<string, PipelineDocument>();
	const visited = new Set<string>();
	const queue: Array<{ url: string; depth: number }> = [{ url, depth: 0 }];

	let robotsDisallowed: Set<string> | null = null;
	if (opts.respectRobotsTxt) {
		robotsDisallowed = await fetchRobotsTxt(url, opts.userAgent);
	}

	const baseUrl = new URL(url);

	while (queue.length > 0 && discovered.size < opts.maxPages) {
		const item = queue.shift()!;

		if (visited.has(item.url)) continue;
		if (item.depth > opts.maxDepth) continue;

		// Check robots.txt if available
		if (robotsDisallowed && isDisallowedByRobots(item.url, robotsDisallowed)) {
			logger.debug(`[Crawler] Skipping ${item.url} (robots.txt)`);
			continue;
		}

		// Check exclusion patterns
		if (opts.excludedPatterns?.some((p) => p.test(item.url))) {
			logger.debug(`[Crawler] Skipping ${item.url} (excluded pattern)`);
			continue;
		}

		// Check allowed patterns
		if (opts.allowedPatterns && !opts.allowedPatterns.some((p) => p.test(item.url))) {
			logger.debug(`[Crawler] Skipping ${item.url} (not in allowed patterns)`);
			continue;
		}

		visited.add(item.url);

		try {
			const parsed = await parseUrl(item.url);

			const doc: PipelineDocument = {
				id: `url:${Buffer.from(item.url).toString("base64url").slice(0, 64)}`,
				sourceUri: item.url,
				title: parsed.title,
				rawContent: parsed.content,
				mimeType: "text/html",
				fileType: "md",
				metadata: {
					...parsed.metadata,
					crawlDepth: item.depth,
				},
			};

			discovered.set(item.url, doc);

			logger.info(
				`[Crawler] Fetched ${item.url} (depth ${item.depth}, ${parsed.content.length} chars)`,
			);

			// Extract links for further crawling
			if (item.depth < opts.maxDepth) {
				const links = extractLinks(parsed.content, item.url, baseUrl.origin);
				for (const link of links) {
					if (!visited.has(link) && !queue.some((q) => q.url === link)) {
						if (opts.sameDomain && !link.startsWith(baseUrl.origin)) continue;
						queue.push({ url: link, depth: item.depth + 1 });
					}
				}
			}
		} catch (error) {
			logger.warn(`[Crawler] Failed to fetch ${item.url}: ${error}`);
		}
	}

	logger.info(
		`[Crawler] Crawl complete: ${discovered.size} pages from ${url} (visited ${visited.size} URLs)`,
	);

	return Array.from(discovered.values());
}

/**
 * Fetch and parse robots.txt for disallowed paths.
 */
async function fetchRobotsTxt(url: string, userAgent: string): Promise<Set<string> | null> {
	try {
		const baseUrl = new URL(url);
		const robotsUrl = `${baseUrl.origin}/robots.txt`;

		const { execSync } = await import("node:child_process");
		const content = execSync(
			`curl -sL --max-time 5 -A "${userAgent}" "${robotsUrl}" 2>/dev/null`,
			{ encoding: "utf-8", timeout: 10000 },
		).trim();

		if (!content) return null;

		const disallowed = new Set<string>();
		const lines = content.split("\n");
		let relevantAgent = false;

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.toLowerCase().startsWith("user-agent:")) {
				const agent = trimmed.split(":")[1]?.trim().toLowerCase() ?? "";
				relevantAgent = agent === "*" || agent === userAgent.toLowerCase().split("/")[0];
			}
			if (relevantAgent && trimmed.toLowerCase().startsWith("disallow:")) {
				const path = trimmed.split(":")[1]?.trim() ?? "";
				if (path) disallowed.add(path);
			}
		}

		return disallowed;
	} catch {
		return null;
	}
}

function isDisallowedByRobots(url: string, disallowed: Set<string>): boolean {
	try {
		const parsed = new URL(url);
		for (const path of disallowed) {
			if (parsed.pathname.startsWith(path)) return true;
		}
	} catch {
		// ignore
	}
	return false;
}

/**
 * Extract links from HTML text content.
 */
function extractLinks(content: string, baseUrl: string, origin: string): string[] {
	const links: string[] = [];
	const hrefRegex = /<a[^>]+href="([^"]+)"[^>]*>/gi;
	let match: RegExpExecArray | null;

	while ((match = hrefRegex.exec(content)) !== null) {
		let href = match[1]!;

		// Skip anchors, javascript, mailto
		if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) {
			continue;
		}

		// Skip common non-content extensions
		if (/\.(pdf|zip|tar|gz|png|jpg|jpeg|gif|svg|css|js|ico|webp|mp4|mp3)$/i.test(href)) {
			continue;
		}

		try {
			// Resolve relative URLs
			const resolved = new URL(href, baseUrl).href;

			// Keep same protocol
			if (resolved.startsWith("http")) {
				// Remove fragment
				const cleanUrl = resolved.split("#")[0]!;
				links.push(cleanUrl);
			}
		} catch {
			// malformed URL
		}
	}

	// Deduplicate
	return [...new Set(links)];
}
