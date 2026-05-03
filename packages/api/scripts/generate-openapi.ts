/**
 * Generate openapi.yaml from the OpenAPI spec function.
 *
 * Usage: pnpm --filter @repo/api generate:openapi
 * Output: packages/api/openapi.yaml
 */

import { generateOpenApiSpec } from "../v1/openapi";
import { dump } from "js-yaml";
import { resolve } from "node:path";
import { statSync, writeFileSync } from "node:fs";

const __dirname = import.meta.dirname ?? new URL(".", import.meta.url).pathname;

const spec = generateOpenApiSpec();
const yaml = dump(spec, {
	indent: 2,
	lineWidth: 120,
	noRefs: true,
	sortKeys: false,
});

const outputPath = resolve(__dirname, "../openapi.yaml");
writeFileSync(outputPath, yaml, "utf-8");
console.log(`✅ openapi.yaml written to ${outputPath}`);
console.log(`   Size: ${(statSync(outputPath).size / 1024).toFixed(1)} KB`);
