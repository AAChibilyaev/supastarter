/**
 * Generate openapi.yaml from the OpenAPI spec functions (v1 + v2).
 *
 * Usage: pnpm --filter @repo/api generate:openapi
 * Output: packages/api/openapi.yaml (v1), packages/api/v2/openapi.yaml (v2)
 */

import { statSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

import { dump } from "js-yaml";

import { generateOpenApiSpec } from "../v1/openapi";
import { generateV2OpenApiSpec } from "../v2/openapi";

const __dirname = import.meta.dirname ?? new URL(".", import.meta.url).pathname;
const apiDir = resolve(__dirname, "..");

// ── v1 spec ────────────────────────────────────────────────────────────────
const v1Spec = generateOpenApiSpec();
const v1Yaml = dump(v1Spec, {
	indent: 2,
	lineWidth: 120,
	noRefs: true,
	sortKeys: false,
});
const v1OutputPath = resolve(apiDir, "openapi.yaml");
writeFileSync(v1OutputPath, v1Yaml, "utf-8");
console.log(`✅ v1 openapi.yaml written to ${v1OutputPath}`);
console.log(`   Size: ${(statSync(v1OutputPath).size / 1024).toFixed(1)} KB`);

// ── v2 spec ────────────────────────────────────────────────────────────────
const v2Spec = generateV2OpenApiSpec();
const v2Yaml = dump(v2Spec, {
	indent: 2,
	lineWidth: 120,
	noRefs: true,
	sortKeys: false,
});
const v2Dir = resolve(apiDir, "v2");
mkdirSync(v2Dir, { recursive: true });
const v2OutputPath = resolve(v2Dir, "openapi.yaml");
writeFileSync(v2OutputPath, v2Yaml, "utf-8");
console.log(`✅ v2 openapi.yaml written to ${v2OutputPath}`);
console.log(`   Size: ${(statSync(v2OutputPath).size / 1024).toFixed(1)} KB`);
