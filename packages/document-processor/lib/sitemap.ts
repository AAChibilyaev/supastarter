/**
 * Sitemap XML parser supporting sitemap.xml and sitemap index files.
 *
 * Supports:
 * - Standard sitemap.xml (urlset with <url><loc> entries)
 * - Sitemap index files (<sitemapindex> with <sitemap><loc> entries)
 * - Gzipped sitemaps (.xml.gz)
 * - Robot-controlled discovery (sitemap directives in robots.txt)
 */

import { logger } from "@repo/logs";

const SITEMAP_URL_LIMIT = 50_000;

/**
 * Parse a sitemap URL and return all discovered page URLs.
 * Recursively resolves sitemap index files.
 */
export async function parseSitemap(
	sitemapUrl: string,
	options?: { userAgent?: string; timeoutMs?: number },
): Promise<string[]> {
	const userAgent = options?.userAgent ?? "Mozilla/5.0 (compatible; AACsearchBot/1.0)";
	const timeoutMs = options?.timeoutMs ?? 30_000;

	try {
		const urls = await fetchSitemapRecursive(sitemapUrl, userAgent, timeoutMs, new Set());
		logger.info(`[Sitemap] Parsed ${urls.length} URLs from ${sitemapUrl}`);
		return urls;
	} catch (error) {
		logger.error(`[Sitemap] Failed to parse ${sitemapUrl}: ${error}`);
		return [];
	}
}

/**
 * Discover sitemap URLs from a domain's robots.txt.
 * Returns the list of sitemap URLs found, or empty array.
 */
export async function discoverSitemapsFromRobotsTxt(
	domainUrl: string,
	options?: { userAgent?: string; timeoutMs?: number },
): Promise<string[]> {
	const userAgent = options?.userAgent ?? "Mozilla/5.0 (compatible; AACsearchBot/1.0)";
	const timeoutMs = options?.timeoutMs ?? 10_000;

	try {
		const baseUrl = new URL(domainUrl);
		const robotsUrl = `${baseUrl.origin}/robots.txt`;

		const { execSync } = await import("node:child_process");
		const content = execSync(
			`curl -sL --max-time ${Math.ceil(timeoutMs / 1000)} -A "${userAgent}" "${robotsUrl}" 2>/dev/null`,
			{ encoding: "utf-8", timeout: timeoutMs + 5000 },
		).trim();

		if (!content) return [];

		const sitemaps: string[] = [];
		for (const line of content.split("\n")) {
			const trimmed = line.trim().toLowerCase();
			if (trimmed.startsWith("sitemap:")) {
				const sitemapUrl = line.split(":")?.slice(1).join(":").trim();
				if (sitemapUrl) {
					sitemaps.push(sitemapUrl);
				}
			}
		}

		logger.info(`[Sitemap] Discovered ${sitemaps.length} sitemaps from ${robotsUrl}`);
		return sitemaps;
	} catch (error) {
		logger.warn(`[Sitemap] Could not fetch robots.txt from ${domainUrl}: ${error}`);
		return [];
	}
}

// ─── Internal ─────────────────────────────────────────────────

async function fetchAndParseXml(
	url: string,
	userAgent: string,
	timeoutMs: number,
): Promise<{ isIndex: boolean; entries: string[] }> {
	const isGzip = url.endsWith(".gz");
	const decompressFlag = isGzip ? " --compressed" : "";

	const { execSync } = await import("node:child_process");
	const raw = execSync(
		`curl -sL${decompressFlag} --max-time ${Math.ceil(timeoutMs / 1000)} -A "${userAgent}" "${url}" 2>/dev/null`,
		{ encoding: "utf-8", timeout: timeoutMs + 5000, maxBuffer: 10 * 1024 * 1024 },
	).trim();

	if (!raw) return { isIndex: false, entries: [] };

	// Detect sitemap index vs. standard sitemap
	const isIndex = /<sitemapindex[\s>]/i.test(raw);

	const entries: string[] = [];
	if (isIndex) {
		// Parse <sitemapindex> → <sitemap><loc>...</loc></sitemap>
		const locRegex = /<loc[^>]*>([^<]+)<\/loc>/gi;
		let match: RegExpExecArray | null;
		while ((match = locRegex.exec(raw)) !== null) {
			const loc = match[1]!.trim();
			if (loc) entries.push(loc);
		}
	} else {
		// Parse <urlset> → <url><loc>...</loc></url>
		const locRegex = /<loc[^>]*>([^<]+)<\/loc>/gi;
		let match: RegExpExecArray | null;
		while ((match = locRegex.exec(raw)) !== null) {
			const loc = match[1]!.trim();
			if (loc) entries.push(loc);
		}
	}

	return { isIndex, entries };
}

async function fetchSitemapRecursive(
	url: string,
	userAgent: string,
	timeoutMs: number,
	seen: Set<string>,
): Promise<string[]> {
	if (seen.has(url)) return [];
	seen.add(url);

	const { isIndex, entries } = await fetchAndParseXml(url, userAgent, timeoutMs);

	if (isIndex) {
		// Recursively resolve child sitemaps
		const allUrls: string[] = [];
		for (const childUrl of entries) {
			if (allUrls.length >= SITEMAP_URL_LIMIT) break;
			const childUrls = await fetchSitemapRecursive(childUrl, userAgent, timeoutMs, seen);
			allUrls.push(...childUrls);
		}
		return allUrls.slice(0, SITEMAP_URL_LIMIT);
	}

	return entries.slice(0, SITEMAP_URL_LIMIT);
}
