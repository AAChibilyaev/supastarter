/**
 * Build-time script that generates content/docs/en/changelog/index.mdx
 * from the root CHANGELOG.md, keeping it as the single source of truth.
 *
 * Run as a prebuild step before fumadocs-mdx.
 *
 * Usage: node --import tsx scripts/generate-changelog.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const CHANGELOG_PATH = path.join(REPO_ROOT, "CHANGELOG.md");
const OUTPUT_PATH = path.resolve(process.cwd(), "content/docs/en/changelog/index.mdx");

function main() {
	if (!fs.existsSync(CHANGELOG_PATH)) {
		console.error(`[generate-changelog] CHANGELOG.md not found at ${CHANGELOG_PATH}`);
		process.exit(1);
	}

	const raw = fs.readFileSync(CHANGELOG_PATH, "utf-8");
	const lines = raw.split("\n");

	// Strip the "# Changelog" header (line 1) — it becomes the page title in frontmatter
	let bodyLines: string[];
	if (lines[0]?.trim().startsWith("# ")) {
		bodyLines = lines.slice(1);
	} else {
		bodyLines = lines;
	}

	// Trim leading blank lines
	while (bodyLines.length > 0 && bodyLines[0].trim() === "") {
		bodyLines = bodyLines.slice(1);
	}

	const frontmatter = `---
title: Changelog
description: Release history and changelog for AACsearch.
---`;

	const mdxContent = [frontmatter, "", ...bodyLines].join("\n");

	// Ensure output directory exists
	fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

	fs.writeFileSync(OUTPUT_PATH, mdxContent, "utf-8");
	console.log(`[generate-changelog] Wrote ${bodyLines.length} lines to ${OUTPUT_PATH}`);
}

main();
